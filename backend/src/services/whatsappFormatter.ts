import { env } from '../config/env.js';
import { GeminiStructuredResponse } from './gemini.js';

export interface OutboundMessage {
  text: string;
  imageUrl?: string; // If set, send this image before the text card
}

export function generatePropertyCard(p: any): OutboundMessage {
  const priceText = p.transaction_type === 'Sell'
    ? `💰 *Price*: ₹${p.expected_price}`
    : `💰 *Rent*: ₹${p.monthly_rent}/mo`;

  const detailsText = `${p.beds ? p.beds + ' BHK, ' : ''}${p.baths ? p.baths + ' baths' : ''}`;
  const slugLink = `${env.FRONTEND_BASE_URL}/p/${p.slug}`;

  const text = `🏠 *${p.title}* (${p.type} for ${p.transaction_type})
📍 *Locality*: ${p.locality}, ${p.city}
${priceText}
🛏️ *Details*: ${detailsText}
🔗 *Link*: ${slugLink}

📝 *Description*: ${p.description || 'No description available.'}`;

  return {
    text,
    imageUrl: p.image || undefined,
  };
}

export function formatOutboundMessages(
  structuredRes: GeminiStructuredResponse,
  propertiesList: any[]
): OutboundMessage[] {
  const messages: OutboundMessage[] = [];

  // Check if Gemini recommended specific properties
  const recommendedIds = Array.isArray(structuredRes.recommended_property_ids)
    ? structuredRes.recommended_property_ids.map(id => typeof id === 'string' ? parseInt(id, 10) : id)
    : [];

  if (recommendedIds.length === 0) {
    // Fallback: send the standard single reply
    if (structuredRes.reply && structuredRes.reply.trim() !== '') {
      messages.push({ text: structuredRes.reply.trim() });
    }
    return messages;
  }

  // 1. Add introductory text if present
  if (structuredRes.reply_intro && structuredRes.reply_intro.trim() !== '') {
    messages.push({ text: structuredRes.reply_intro.trim() });
  } else if (structuredRes.reply && structuredRes.reply.trim() !== '') {
    // If reply_intro is missing but reply is populated, use reply as intro
    messages.push({ text: structuredRes.reply.trim() });
  }

  // 2. Add each recommended property card (with image if available)
  for (const id of recommendedIds) {
    const prop = propertiesList.find(p => parseInt(p.key, 10) === id);
    if (prop) {
      messages.push(generatePropertyCard(prop));
    }
  }

  // 3. Add concluding text if present
  if (structuredRes.reply_outro && structuredRes.reply_outro.trim() !== '') {
    messages.push({ text: structuredRes.reply_outro.trim() });
  }

  return messages;
}
