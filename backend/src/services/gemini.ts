import { VertexAI } from '@google-cloud/vertexai';
import { env } from '../config/env.js';

let vertexAIInstance: any = null;

export function getVertexAI() {
  if (vertexAIInstance) return vertexAIInstance;
  
  const projectId = env.GCP_PROJECT_ID;
  const location = env.GCP_LOCATION || 'us-central1';

  if (!projectId) {
    console.warn('⚠️ [VERTEX AI] GCP_PROJECT_ID environment variable is missing. Vertex AI is not initialized.');
    return null;
  }

  const serviceAccountJson = env.GCP_SERVICE_ACCOUNT_JSON || process.env.GCP_SERVICE_ACCOUNT_JSON;
  let googleAuthOptions: any = undefined;

  if (serviceAccountJson) {
    try {
      // Clean raw newlines/carriage returns inside string literals (common copy-paste issue in private keys)
      let cleaned = serviceAccountJson.trim();
      cleaned = cleaned.replace(/"([^"\\]|\\.)*"/g, (match) => {
        return match.replace(/[\n\r]/g, '\\n');
      });
      googleAuthOptions = {
        credentials: JSON.parse(cleaned)
      };
      console.log('🔑 [VERTEX AI] Loaded GCP service account credentials directly from environment variable.');
    } catch (err) {
      console.error('❌ [VERTEX AI] Failed to parse GCP service account credentials string:', err);
    }
  }

  try {
    // VertexAI SDK will automatically pick up standard credentials from googleAuthOptions or local ADC
    vertexAIInstance = new VertexAI({ project: projectId, location, googleAuthOptions });
    return vertexAIInstance;
  } catch (err) {
    console.error('❌ Failed to initialize Vertex AI client:', err);
    return null;
  }
}

import { buildSystemInstruction } from './promptBuilder.js';
import { getBrokerInventoryProfile } from './propertyMatcher.js';
import { ConversationAIState } from '../models/conversationModel.js';
import { checkAndConsumeTokens, estimateTokenCount } from '../lib/rateLimiter.js';

export class RateLimitError extends Error {
  status = 429;
  retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export const activeRequestsRegistry = new Map<number, AbortController>();

export interface GeminiStructuredResponse {
  reply: string;
  reply_intro?: string;
  reply_outro?: string;
  action: 'GREET' | 'ASK_SLOTS' | 'SEARCH' | 'RECOMMEND' | 'OFFER_SITE_VISIT' | 'SCHEDULE_SITE_VISIT' | 'LOAN_INFO' | 'NEGOTIATE' | 'HUMAN_TAKEOVER' | 'CHITCHAT' | 'REACTION_THUMBS_UP';
  recommended_property_ids: number[];
  interested_property_ids?: number[];
  missing_fields: string[];
  stage: 'GREETING' | 'COLLECT_INFO' | 'SEARCHING' | 'RECOMMENDING' | 'SITE_VISIT' | 'FOLLOW_UP' | 'COMPLETED';
  /** ISO 8601 datetime string for the agreed site-visit appointment, or null if not yet scheduled. */
  appointmentDate: string | null;
  intent?: 'GREETING' | 'BUY_OR_RENT' | 'PROPERTY_DETAILS' | 'SITE_VISIT' | 'NEGOTIATION' | 'LOAN_QUERY' | 'CHANGE_PREFERENCES' | 'HUMAN_TAKEOVER' | 'UNKNOWN';
  slots?: {
    transaction_type?: 'Sell' | 'Rent' | null;
    locality?: string | null;
    city?: string | null;
    rent_budget?: string | null;
    buy_budget?: string | null;
    category?: 'Residential' | 'Commercial' | 'Land' | null;
    beds?: number | null;
    baths?: number | null;
    property_type?: string | null;
    furnishing?: string | null;
    parking?: string | null;
    move_in_date?: string | null;
    purpose?: string | null;
  };
  updated_rolling_summary?: string;
}

import { pool } from '../lib/db.js';

export async function generateAutoReply(
  instructions: string,
  history: { role: 'user' | 'model'; text: string }[],
  aiState: ConversationAIState,
  propertiesContext: string,
  conversationId?: number
): Promise<GeminiStructuredResponse> {
  const ai = getVertexAI();
  const fallbackResponse: GeminiStructuredResponse = {
    reply: `Thank you for reaching out! One of our agents will get back to you shortly.`,
    action: 'CHITCHAT',
    recommended_property_ids: [],
    interested_property_ids: [],
    missing_fields: [],
    stage: aiState.stage || 'GREETING',
    appointmentDate: null,
    intent: 'UNKNOWN',
    slots: {},
    updated_rolling_summary: aiState.rolling_summary || '',
  };

  if (conversationId) {
    const userRes = await pool.query(
      `SELECT u.credits_balance 
       FROM users u 
       JOIN conversations c ON c.user_id = u.user_id 
       WHERE c.id = $1 LIMIT 1`,
      [conversationId]
    );
    if (userRes.rows.length > 0) {
      const credits = userRes.rows[0].credits_balance ?? 0;
      if (credits <= 0) {
        console.warn(`⚠️ [CREDIT CHECK] Conversation ID ${conversationId} blocked due to insufficient credits (Balance: ${credits})`);
        throw new Error('Insufficient credits to generate responses with Gemini.');
      }
    }
  }

  if (!ai) {
    fallbackResponse.reply += ' (GCP Vertex AI is not configured. Please set GCP_PROJECT_ID in your env).';
    return fallbackResponse;
  }

  let propertiesUser = 'local-dev';
  if (conversationId) {
    const emailRes = await pool.query(
      `SELECT u.email FROM users u JOIN conversations c ON c.user_id = u.user_id WHERE c.id = $1 LIMIT 1`,
      [conversationId]
    );
    if (emailRes.rows[0]?.email) {
      propertiesUser = emailRes.rows[0].email;
    }
  }
  const inventoryProfile = await getBrokerInventoryProfile(propertiesUser);

  const systemInstructionText = buildSystemInstruction(instructions, aiState, propertiesContext, inventoryProfile);

  // 1. Calculate prompt size and check rate limiter
  const totalPromptText = systemInstructionText + 
    history.map(h => h.text).join(' ') + 
    propertiesContext;
  const estimatedTokens = estimateTokenCount(totalPromptText);

  const rateLimitCheck = await checkAndConsumeTokens('gemini-global-limit', estimatedTokens);
  if (!rateLimitCheck.allowed) {
    console.warn(`⚠️ [RATE LIMIT] Vertex AI Global Limit reached. Retry after ${rateLimitCheck.retryAfterMs}ms.`);
    throw new RateLimitError(`Rate Limit Exceeded: Vertex AI Global Limit reached`, rateLimitCheck.retryAfterMs);
  }

  // 2. Abort active request for this conversation if one exists
  let abortController: AbortController | undefined;
  if (conversationId) {
    const existing = activeRequestsRegistry.get(conversationId);
    if (existing) {
      console.log(`[ABORT] Cancelling pending Gemini request for conversation ${conversationId}`);
      existing.abort();
    }
    abortController = new AbortController();
    activeRequestsRegistry.set(conversationId, abortController);
  }

  // 3. Filter out empty messages
  const rawContents = history
    .filter(h => h.text && h.text.trim() !== '')
    .map(h => ({
      role: (h.role === 'model' ? 'model' : 'user') as 'user' | 'model',
      text: h.text,
    }));

  // 4. Merge consecutive turns with the same role
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const item of rawContents) {
    if (contents.length > 0 && contents[contents.length - 1].role === item.role) {
      const prevParts = contents[contents.length - 1].parts;
      prevParts[0].text = prevParts[0].text + '\n' + item.text;
    } else {
      contents.push({
        role: item.role,
        parts: [{ text: item.text }]
      });
    }
  }

  // 5. Ensure the list starts with a 'user' turn (required by Vertex AI)
  while (contents.length > 0 && contents[0].role !== 'user') {
    contents.shift();
  }

  // 6. Fallback if contents is empty
  if (contents.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: 'Hello' }],
    });
  }

  const maxRetries = 3;
  let delay = 1000;

  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (abortController?.signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        console.log('📡 [GEMINI DEBUG] Checking Vertex AI Instance:', {
          hasAi: !!ai,
          aiKeys: ai ? Object.keys(ai) : []
        });

        const model = ai.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction: {
            parts: [{ text: systemInstructionText }]
          },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.5,
          },
        });

        console.log('📡 [GEMINI DEBUG] Generative Model resolved:', {
          hasModel: !!model,
          modelType: typeof model,
          modelKeys: model ? Object.keys(model) : []
        });

        console.log(`📡 [GEMINI API] Attempting call to model gemini-2.5-flash (Attempt ${attempt}/${maxRetries}) for conversation ${conversationId}...`);
        const response = await model.generateContent({
          contents,
        }, {
          signal: abortController?.signal
        });

        console.log(`📡 [GEMINI API] Received response from model for conversation ${conversationId}.`);
        const responseText = response.response?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
          console.warn('⚠️ [VERTEX AI] Empty response object received:', JSON.stringify(response));
          throw new Error('Empty response from Vertex AI');
        }

        try {
          let cleanText = responseText.trim();
          const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
          const match = jsonBlockRegex.exec(cleanText);
          if (match) {
            cleanText = match[1].trim();
          } else {
            const startIdx = cleanText.indexOf('{');
            const endIdx = cleanText.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
              cleanText = cleanText.substring(startIdx, endIdx + 1).trim();
            }
          }
          const parsed = JSON.parse(cleanText) as GeminiStructuredResponse;
          return {
            reply: parsed.reply || '',
            reply_intro: parsed.reply_intro || '',
            reply_outro: parsed.reply_outro || '',
            action: parsed.action || 'CHITCHAT',
            recommended_property_ids: parsed.recommended_property_ids || [],
            interested_property_ids: parsed.interested_property_ids || [],
            missing_fields: parsed.missing_fields || [],
            stage: parsed.stage || aiState.stage || 'GREETING',
            appointmentDate: parsed.appointmentDate || null,
            intent: parsed.intent || 'UNKNOWN',
            slots: parsed.slots || {},
            updated_rolling_summary: parsed.updated_rolling_summary || aiState.rolling_summary || '',
          };
        } catch (jsonErr) {
          console.error('❌ Failed to parse Gemini JSON output:', jsonErr, 'Raw text:', responseText);
          return {
            reply: responseText.trim(),
            action: 'CHITCHAT',
            recommended_property_ids: [],
            interested_property_ids: [],
            missing_fields: [],
            stage: aiState.stage || 'GREETING',
            appointmentDate: null,
            intent: 'UNKNOWN',
            slots: {},
            updated_rolling_summary: aiState.rolling_summary || '',
          };
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || abortController?.signal.aborted) {
          console.log(`ℹ️ [VERTEX AI] Generation aborted for conversation ${conversationId}.`);
          throw err;
        }

        const isRateLimit =
          err.status === 429 ||
          err.code === 429 ||
          err.message?.includes('429') ||
          err.message?.includes('Resource exhausted') ||
          err.message?.toLowerCase().includes('too many requests');

        if (isRateLimit) {
          // Instead of blocking worker threads with local sleeps, bubble it up to BullMQ
          throw new RateLimitError('Vertex AI rate limit encountered during generation', 30000);
        }

        if (attempt === maxRetries) {
          console.error(`❌ Error calling Vertex AI Gemini model (Attempt ${attempt}/${maxRetries}):`, err);
          return fallbackResponse;
        }

        console.warn(`⚠️ [VERTEX AI] Error on attempt ${attempt}. Retrying in ${delay}ms...`, err.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  } finally {
    if (conversationId && activeRequestsRegistry.get(conversationId) === abortController) {
      activeRequestsRegistry.delete(conversationId);
    }
  }

  return fallbackResponse;
}
