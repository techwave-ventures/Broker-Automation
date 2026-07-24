import { getVertexAI } from './gemini.js';

export interface IntentResult {
  intent: 'GREETING' | 'BUY_OR_RENT' | 'PROPERTY_DETAILS' | 'SITE_VISIT' | 'NEGOTIATION' | 'LOAN_QUERY' | 'CHANGE_PREFERENCES' | 'HUMAN_TAKEOVER' | 'UNKNOWN';
  slots: {
    transaction_type?: 'Sell' | 'Rent' | null;
    locality?: string | null;
    city?: string | null;
    budget?: string | null;
    beds?: number | null;
    property_type?: string | null;
    furnishing?: string | null;
    parking?: string | null;
    move_in_date?: string | null;
    purpose?: string | null;
  };
}

export function detectIntentDeterministically(text: string): IntentResult | null {
  const normalized = text.trim().toLowerCase();

  // 1. Human Takeover / Stop bot
  const humanRegex = /\b(agent|human|person|operator|support|representative|stop bot|stop|unsubscribe|takeover|help)\b/i;
  if (humanRegex.test(normalized)) {
    return {
      intent: 'HUMAN_TAKEOVER',
      slots: {}
    };
  }

  // 2. Greeting
  const greetingRegex = /\b(hi|hello|hey|greetings|good\s+(morning|afternoon|evening|day)|yo|sup|hello\s+there)\b/i;
  // If the string is very short and matches greeting, classify as greeting.
  if (greetingRegex.test(normalized) && normalized.split(/\s+/).length <= 4) {
    return {
      intent: 'GREETING',
      slots: {}
    };
  }

  // 3. Site Visit Scheduling
  const visitRegex = /\b(site\s*visit|schedule\s*visit|visit\s*property|book\s*visit|want\s*to\s*see|view\s*property|schedule\s*viewing|book\s*viewing|visit\s*tomorrow|visit\s*today|site\s*viewing)\b/i;
  if (visitRegex.test(normalized)) {
    return {
      intent: 'SITE_VISIT',
      slots: {}
    };
  }

  // 4. Price negotiation
  const negotiationRegex = /\b(negotiate|discount|cheaper|price\s*drop|reduce\s*price|negotiable|less\s*price|budget\s*negotiation|price\s*reduction)\b/i;
  if (negotiationRegex.test(normalized)) {
    return {
      intent: 'NEGOTIATION',
      slots: {}
    };
  }

  // 5. Loan queries
  const loanRegex = /\b(loan|loans|mortgage|financing|interest\s*rate|emi|home\s*loan|bank\s*loan)\b/i;
  if (loanRegex.test(normalized)) {
    return {
      intent: 'LOAN_QUERY',
      slots: {}
    };
  }

  return null;
}

export async function detectIntentAI(text: string, currentStage: string): Promise<IntentResult> {
  const ai = getVertexAI();
  if (!ai) {
    console.warn('⚠️ [VERTEX AI] Vertex AI is not initialized. Defaulting to UNKNOWN intent.');
    return { intent: 'UNKNOWN', slots: {} };
  }

  const prompt = `
You are a real estate intent and entity extraction engine.
Analyze the user's message and the current conversational stage to classify the intent and extract preference details.

User Message: "${text}"
Current Stage: "${currentStage}"

Available Intents:
- GREETING: Customer greeting (e.g. "hi", "good morning").
- BUY_OR_RENT: Customer expressing a desire to buy or rent a property, or specifying requirements.
- PROPERTY_DETAILS: Customer asking specific questions about a property (e.g. "where is listing #5?", "send images of the villa").
- SITE_VISIT: Customer asking to schedule a visit, see the site, or book a viewing.
- NEGOTIATION: Customer asking to negotiate the price, asking for a discount, or asking if the price is negotiable.
- LOAN_QUERY: Customer asking about loans, financing, or interest rates.
- CHANGE_PREFERENCES: Customer updating/changing their previous requirements (e.g. "actually, search in Indiranagar instead", "change my budget to 50k").
- HUMAN_TAKEOVER: Customer explicitly requesting to talk to a human or stop the bot.
- UNKNOWN: General chitchat or question not fitting any category.

Extract any of the following preference slots if mentioned:
- transaction_type: "Sell" (if buying) or "Rent" (if renting).
- locality: Specific neighborhood or area (e.g. "Whitefield", "Indiranagar").
- city: City name.
- budget: Budget limit or range (e.g. "40k", "1.5 Cr").
- beds: Number of bedrooms as an integer (e.g. 2, 3).
- property_type: Type of property (e.g. "Apartment", "Villa", "Commercial").
- furnishing: Furnishing status ("Furnished", "Semi-Furnished", "Unfurnished").
- parking: Parking details.
- move_in_date: Estimated move-in date or timeframe.
- purpose: Purpose of transaction ("investment" or "self-use").

You MUST return a JSON object matching this schema:
{
  "intent": "INTENT_NAME",
  "slots": {
    "transaction_type": "Sell" | "Rent" | null,
    "locality": string | null,
    "city": string | null,
    "budget": string | null,
    "beds": number | null,
    "property_type": string | null,
    "furnishing": string | null,
    "parking": string | null,
    "move_in_date": string | null,
    "purpose": string | null
  }
}
`;

  try {
    const model = ai.preview.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0,
      },
    });

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const responseText = response.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('Empty response from Vertex AI Gemini');
    }

    const data = JSON.parse(responseText.trim()) as IntentResult;
    return {
      intent: data.intent || 'UNKNOWN',
      slots: data.slots || {}
    };
  } catch (err) {
    console.error('❌ Failed to detect intent via Gemini Vertex AI:', err);
    return { intent: 'UNKNOWN', slots: {} };
  }
}

export async function detectIntent(text: string, currentStage: string): Promise<IntentResult> {
  // 1. Try deterministic match
  const deterministicResult = detectIntentDeterministically(text);
  if (deterministicResult) {
    console.log(`⚡ [INTENT] Deterministic match: ${deterministicResult.intent}`);
    return deterministicResult;
  }

  // 2. Fallback to Gemini AI
  console.log(`🤖 [INTENT] Running Gemini AI intent classifier...`);
  return detectIntentAI(text, currentStage);
}
