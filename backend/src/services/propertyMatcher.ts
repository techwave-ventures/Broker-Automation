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
      `SELECT DISTINCT category, transaction_type FROM properties WHERE user_id = $1 AND status = 'Available'`,
      [userId]
    );
    if (res.rows.length === 0) {
      return "This broker currently has no active listings in inventory.";
    }

    const categories = ['Residential', 'Commercial', 'Land'];
    const groups: { [cat: string]: string[] } = {
      Residential: [],
      Commercial: [],
      Land: [],
    };

    for (const row of res.rows) {
      if (row.category && groups[row.category]) {
        groups[row.category].push(row.transaction_type);
      }
    }

    const summaryParts: string[] = [];
    for (const cat of categories) {
      const txs = groups[cat];
      const uniqueTxs = Array.from(new Set(txs));
      if (uniqueTxs.length > 0) {
        summaryParts.push(`${cat} (${uniqueTxs.join(', ')})`);
      } else {
        summaryParts.push(`NO ${cat} listings`);
      }
    }

    return `This broker currently has: ${summaryParts.join(', ')}.`;
  } catch (err) {
    console.error('Error fetching broker inventory profile:', err);
    return "This broker currently has some active listings in inventory.";
  }
}

export async function findMatchingProperties(
  userId: string,
  state: ConversationAIState
): Promise<{ properties: any[]; contextString: string }> {
  // Base query: strictly filter ONLY by user_id, status = 'Available', city (if known), and transaction_type (if known)
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

  const res = await pool.query(query, params);
  const matchedRows = res.rows;

  const targetBudget = state.transaction_type === 'Rent' ? state.rent_budget : state.buy_budget;
  const parsedBudget = targetBudget ? parseBudgetString(targetBudget) : null;
  const excludedIds = Array.isArray(state.recommended_property_ids) ? state.recommended_property_ids : [];

  // Score and rank properties in memory
  const scoredProperties = matchedRows
    .map(p => {
      let score = 0;

      // 1. Category match (+35 points)
      if (state.category && p.category && state.category.toLowerCase() === p.category.toLowerCase()) {
        score += 35;
      }

      // 2. Locality match (+30 points)
      if (state.locality && p.locality) {
        const locState = state.locality.toLowerCase().trim();
        const locProp = p.locality.toLowerCase().trim();
        if (locProp.includes(locState) || locState.includes(locProp)) {
          score += 30;
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
      if (parsedBudget) {
        const price = p.transaction_type === 'Sell' ? parseFloat(p.expected_price) : parseFloat(p.monthly_rent);
        if (!isNaN(price) && parsedBudget > 0) {
          if (price > parsedBudget) {
            const pctOverage = ((price - parsedBudget) / parsedBudget) * 100;
            if (pctOverage > 40) {
              return null; // Skip if it exceeds 40% overage
            }
            score -= Math.round(pctOverage);
          }
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

  // Take top 5 ranked matches
  const topListings = scoredProperties.slice(0, 5).map(r => r.property);

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
