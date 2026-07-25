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



export async function detectIntent(text: string, currentStage: string): Promise<IntentResult> {
  // Try deterministic match
  const deterministicResult = detectIntentDeterministically(text);
  if (deterministicResult) {
    console.log(`⚡ [INTENT] Deterministic match: ${deterministicResult.intent}`);
    return deterministicResult;
  }

  // Fallback to UNKNOWN, meaning intent will be resolved in the main consolidated Gemini call
  return { intent: 'UNKNOWN', slots: {} };
}

