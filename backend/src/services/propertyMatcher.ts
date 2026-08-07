import { pool } from '../lib/db.js';
import { ConversationAIState } from '../models/conversationModel.js';

export function parseBudgetString(budgetStr: string): number | null {
  if (!budgetStr) return null;
  const clean = budgetStr.replace(/[^0-9.]/g, '').trim();
  const numeric = parseFloat(clean);
  return isNaN(numeric) ? null : numeric;
}

export async function getBrokerInventoryProfile(userId: string): Promise<string> {
  try {
    const res = await pool.query(
      `SELECT category, transaction_type, type, locality, COUNT(*) as count 
       FROM properties 
       WHERE user_id = $1 AND status = 'Available'
       GROUP BY category, transaction_type, type, locality
       ORDER BY category, transaction_type`,
      [userId]
    );
    if (res.rows.length === 0) {
      return "This broker currently has no active listings in inventory.";
    }

    const categoriesMap: { [cat: string]: string[] } = {};

    for (const row of res.rows) {
      const cat = row.category || 'Other';
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = [];
      }
      const itemStr = `${row.type} for ${row.transaction_type} in ${row.locality} (Qty: ${row.count})`;
      categoriesMap[cat].push(itemStr);
    }

    const summaryParts = Object.entries(categoriesMap).map(([cat, items]) => {
      return `${cat}: ${items.join(', ')}`;
    });

    return `The broker has the following active listings in inventory:\n` + summaryParts.map(line => `- ${line}`).join('\n');
  } catch (err) {
    console.error('Error fetching broker inventory profile:', err);
    return "This broker currently has some active listings in inventory.";
  }
}

export async function findMatchingProperties(
  userId: string,
  state: ConversationAIState
): Promise<{ properties: any[]; contextString: string }> {
  // Base query: filter strictly by user_id, status = 'Available', and city / transaction_type / category if known
  let query = `
    SELECT key, title, description, transaction_type, expected_price, monthly_rent, category, type, city, locality, full_address, beds, baths, status, slug, short_code, image 
    FROM properties 
    WHERE user_id = $1 AND status = 'Available'
  `;
  const params: any[] = [userId];

  if (state.city) {
    query += ` AND city ILIKE $${params.length + 1}`;
    params.push(state.city);
  }

  if (state.transaction_type) {
    query += ` AND transaction_type = $${params.length + 1}`;
    params.push(state.transaction_type);
  }

  if (state.category) {
    query += ` AND category ILIKE $${params.length + 1}`;
    params.push(state.category);
  }

  const res = await pool.query(query, params);
  const matchedRows = res.rows;

  const targetBudget = state.transaction_type === 'Rent' ? state.rent_budget : state.buy_budget;
  const parsedBudget = targetBudget ? parseBudgetString(targetBudget) : null;
  const excludedIds = Array.isArray(state.recommended_property_ids) ? state.recommended_property_ids : [];

  // Score and rank properties in memory
  const scoredProperties = matchedRows
    .map(p => {
      let score = 0;

      // 1. Category match (+35 points) - already filtered in query if known, but good for scoring fallback
      if (state.category && p.category && state.category.toLowerCase() === p.category.toLowerCase()) {
        score += 35;
      }

      // 2. Locality match (+50 points for matching locality)
      if (state.locality && p.locality) {
        const locState = state.locality.toLowerCase().trim();
        const locProp = p.locality.toLowerCase().trim();
        if (locProp.includes(locState) || locState.includes(locProp)) {
          score += 50;
        }
      }

      // 3. Category-specific match criteria
      const propCategory = (p.category || '').toLowerCase();
      if (propCategory === 'residential') {
        // Beds match (+20 points)
        if (state.beds && p.beds && Number(state.beds) === Number(p.beds)) {
          score += 20;
        }
        // Property type match (+15 points)
        if (state.property_type && p.type && state.property_type.toLowerCase() === p.type.toLowerCase()) {
          score += 15;
        }
      } else if (propCategory === 'commercial') {
        // Property type match (+20 points)
        if (state.property_type && p.type && state.property_type.toLowerCase() === p.type.toLowerCase()) {
          score += 20;
        }
        // Furnishing match (+15 points)
        if (state.furnishing && p.furnishing && state.furnishing.toLowerCase() === p.furnishing.toLowerCase()) {
          score += 15;
        }
      } else if (propCategory === 'land') {
        // Property type match (+35 points)
        if (state.property_type && p.type && state.property_type.toLowerCase() === p.type.toLowerCase()) {
          score += 35;
        }
      }

      // 4. Budget penalty (-1 point per 1% over budget, up to 40%)
      const propTxType = p.transaction_type;
      const budgetStr = propTxType === 'Rent' ? state.rent_budget : state.buy_budget;
      const budgetVal = budgetStr ? parseBudgetString(budgetStr) : null;

      const price = propTxType === 'Sell' ? parseFloat(p.expected_price) : parseFloat(p.monthly_rent);
      if (isNaN(price)) {
        return null; // Skip if price is missing or malformed
      }

      if (budgetVal && budgetVal > 0) {
        if (price > budgetVal) {
          const pctOverage = ((price - budgetVal) / budgetVal) * 100;
          if (pctOverage > 40) {
            return null; // Skip if it exceeds 40% overage
          }
          score -= Math.round(pctOverage);
        }
      }

      // 5. Exclusion penalty (penalize previously recommended properties so new ones are ranked higher)
      if (excludedIds.includes(Number(p.key))) {
        score -= 100;
      }

      return { property: p, score };
    })
    .filter((item): item is { property: any; score: number } => item !== null);

  // Sort ranked properties by score descending
  scoredProperties.sort((a, b) => b.score - a.score);

  // Take top 15 ranked matches
  const topListings = scoredProperties.slice(0, 15).map(r => r.property);

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
