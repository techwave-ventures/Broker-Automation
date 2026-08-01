import { pool } from '../lib/db.js';
import { ConversationAIState } from '../models/conversationModel.js';

export function parseBudgetString(budgetStr: string): number | null {
  if (!budgetStr) return null;
  const clean = budgetStr.replace(/[^0-9.]/g, '').trim();
  const numeric = parseFloat(clean);
  return isNaN(numeric) ? null : numeric;
}

export async function findMatchingProperties(
  userId: string,
  state: ConversationAIState
): Promise<{ properties: any[]; contextString: string }> {
  // Base query: fetch available properties
  let query = `
    SELECT key, title, description, transaction_type, expected_price, monthly_rent, category, type, city, locality, full_address, beds, baths, status, slug, short_code, image 
    FROM properties 
    WHERE user_id = $1 AND status = 'Available'
  `;
  const params: any[] = [userId];

  // 1. Exclude already recommended properties
  const excludedIds = Array.isArray(state.recommended_property_ids) ? state.recommended_property_ids : [];
  if (excludedIds.length > 0) {
    query += ` AND key != ALL($${params.length + 1})`;
    params.push(excludedIds);
  }

  // 2. Filter transaction type (Sell / Rent)
  if (state.transaction_type) {
    query += ` AND transaction_type = $${params.length + 1}`;
    params.push(state.transaction_type);
  }

  // 3. Filter beds (BHK)
  if (state.beds) {
    query += ` AND beds = $${params.length + 1}`;
    params.push(state.beds);
  }

  // 4. Filter city (case-insensitive ILIKE match)
  if (state.city) {
    query += ` AND city ILIKE $${params.length + 1}`;
    params.push(state.city);
  }

  // Task 1: Explicit SQL Category and Type Constraints
  if ((state as any).category) {
    query += ` AND category = $${params.length + 1}`;
    params.push((state as any).category);
  }

  if (state.property_type) {
    query += ` AND type = $${params.length + 1}`;
    params.push(state.property_type);
  }

  const res = await pool.query(query, params);
  let matchedRows = res.rows;
  let filtersRelaxed = false;

  const targetBudget = state.transaction_type === 'Rent' ? state.rent_budget : state.buy_budget;

  // Task 2: Implement Query Relaxation (Fallback Search)
  if (matchedRows.length === 0 && (targetBudget || state.locality)) {
    let fallbackQuery = `
      SELECT key, title, description, transaction_type, expected_price, monthly_rent, category, type, city, locality, full_address, beds, baths, status, slug, short_code, image 
      FROM properties 
      WHERE user_id = $1 AND status = 'Available'
    `;
    const fallbackParams: any[] = [userId];

    if (excludedIds.length > 0) {
      fallbackQuery += ` AND key != ALL($${fallbackParams.length + 1})`;
      fallbackParams.push(excludedIds);
    }
    if (state.transaction_type) {
      fallbackQuery += ` AND transaction_type = $${fallbackParams.length + 1}`;
      fallbackParams.push(state.transaction_type);
    }
    if (state.beds) {
      fallbackQuery += ` AND beds = $${fallbackParams.length + 1}`;
      fallbackParams.push(state.beds);
    }
    if (state.city) {
      fallbackQuery += ` AND city ILIKE $${fallbackParams.length + 1}`;
      fallbackParams.push(state.city);
    }
    if ((state as any).category) {
      fallbackQuery += ` AND category = $${fallbackParams.length + 1}`;
      fallbackParams.push((state as any).category);
    }
    if (state.property_type) {
      fallbackQuery += ` AND type = $${fallbackParams.length + 1}`;
      fallbackParams.push(state.property_type);
    }

    const fallbackRes = await pool.query(fallbackQuery, fallbackParams);
    if (fallbackRes.rows.length > 0) {
      matchedRows = fallbackRes.rows;
      filtersRelaxed = true;
    }
  }

  // 5. Filter by budget (up to 30% upside tolerance) and handle fallback
  const parsedBudget = targetBudget ? parseBudgetString(targetBudget) : null;
  let filteredRows = matchedRows;

  if (parsedBudget && !filtersRelaxed) {
    filteredRows = matchedRows.filter(p => {
      const price = p.transaction_type === 'Sell' ? parseFloat(p.expected_price) : parseFloat(p.monthly_rent);
      return !isNaN(price) && price <= parsedBudget * 1.30;
    });
  }

  if (filteredRows.length === 0 && (targetBudget || state.locality) && !filtersRelaxed) {
    filteredRows = matchedRows;
    filtersRelaxed = true;
  }

  // 6. Ranking and scoring (by Locality proximity & Budget alignment)
  const ranked = filteredRows.map(p => {
    let score = 0;

    // Locality scoring (sub-string alignment check)
    if (state.locality && p.locality) {
      const locState = state.locality.toLowerCase();
      const locProp = p.locality.toLowerCase();
      if (locProp.includes(locState) || locState.includes(locProp)) {
        score += 10;
      }
    }

    // Budget alignment scoring
    if (parsedBudget) {
      const price = p.transaction_type === 'Sell' ? parseFloat(p.expected_price) : parseFloat(p.monthly_rent);
      if (!isNaN(price)) {
        if (price <= parsedBudget) {
          score += 5; // Under budget is great
        } else if (price <= parsedBudget * 1.15) {
          score += 2; // Slightly over budget (15% buffer) is okay
        } else if (price <= parsedBudget * 1.30) {
          score += 0; // Within 30% is acceptable
        } else {
          score -= 5;
        }
      }
    }

    return { property: p, score };
  });

  // Sort ranked properties by score descending
  ranked.sort((a, b) => b.score - a.score);

  // Take top 3 ranked matches
  const topListings = ranked.slice(0, 3).map(r => r.property);

  // Format context string to feed to Prompt Builder
  let contextString = topListings.map((p: any, index: number) => {
    const priceText = p.transaction_type === 'Sell' ? `Price: ₹${p.expected_price}` : `Rent: ₹${p.monthly_rent}/mo`;
    return `${index + 1}. [ID: ${p.key}] ${p.title} (${p.type} for ${p.transaction_type})
  - Location: ${p.locality}, ${p.city} (${p.full_address})
  - ${priceText}
  - Details: ${p.beds ? p.beds + ' BHK, ' : ''}${p.baths ? p.baths + ' baths, ' : ''}${p.description || ''}`;
  }).join('\n\n');

  if (filtersRelaxed && topListings.length > 0) {
    contextString = `Note: No exact matches found for the requested budget/locality. Showing broader results in the city.\n\n` + contextString;
  }

  return {
    properties: topListings,
    contextString: contextString || 'No matching active property listings are currently available.'
  };
}
