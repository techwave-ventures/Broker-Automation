import { pool } from '../lib/db.js';
import { ConversationAIState } from '../models/conversationModel.js';

export function parseBudgetString(budgetStr: string): number | null {
  if (!budgetStr) return null;
  const clean = budgetStr.toLowerCase().replace(/[^0-9.kcrlah\s]/g, '').trim();
  
  // check for Cr
  if (clean.includes('cr')) {
    const val = parseFloat(clean.replace('cr', '').trim());
    return isNaN(val) ? null : val * 10000000;
  }
  
  // check for lakh / lac / l
  if (clean.includes('lakh') || clean.includes('lac') || clean.endsWith('l')) {
    const val = parseFloat(clean.replace(/(lakh|lac|l)/g, '').trim());
    return isNaN(val) ? null : val * 100000;
  }

  // check for k
  if (clean.endsWith('k')) {
    const val = parseFloat(clean.slice(0, -1).trim());
    return isNaN(val) ? null : val * 1000;
  }

  const numeric = parseFloat(clean);
  return isNaN(numeric) ? null : numeric;
}

export async function findMatchingProperties(
  userId: string,
  state: ConversationAIState
): Promise<{ properties: any[]; contextString: string }> {
  // Base query: fetch available properties
  let query = `
    SELECT key, title, description, transaction_type, expected_price, monthly_rent, category, type, city, locality, full_address, beds, baths, status 
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

  const res = await pool.query(query, params);
  let matchedRows = res.rows;

  // 5. Ranking and scoring (by Locality proximity & Budget alignment)
  const parsedBudget = state.budget ? parseBudgetString(state.budget) : null;
  
  const ranked = matchedRows.map(p => {
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
        } else {
          score -= 5; // Heavily penalize properties way over budget
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
  const contextString = topListings.map((p: any, index: number) => {
    const priceText = p.transaction_type === 'Sell' ? `Price: ₹${p.expected_price}` : `Rent: ₹${p.monthly_rent}/mo`;
    return `${index + 1}. [ID: ${p.key}] ${p.title} (${p.type} for ${p.transaction_type})
  - Location: ${p.locality}, ${p.city} (${p.full_address})
  - ${priceText}
  - Details: ${p.beds ? p.beds + ' BHK, ' : ''}${p.baths ? p.baths + ' baths, ' : ''}${p.description || ''}`;
  }).join('\n\n');

  return {
    properties: topListings,
    contextString: contextString || 'No matching active property listings are currently available.'
  };
}
