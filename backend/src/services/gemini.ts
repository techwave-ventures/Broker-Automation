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
      googleAuthOptions = {
        credentials: JSON.parse(serviceAccountJson.trim())
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
import { ConversationAIState } from '../models/conversationModel.js';

export interface GeminiStructuredResponse {
  reply: string;
  action: 'GREET' | 'ASK_SLOTS' | 'SEARCH' | 'RECOMMEND' | 'OFFER_SITE_VISIT' | 'SCHEDULE_SITE_VISIT' | 'LOAN_INFO' | 'NEGOTIATE' | 'HUMAN_TAKEOVER' | 'CHITCHAT';
  recommended_property_ids: number[];
  missing_fields: string[];
  stage: 'GREETING' | 'COLLECT_INFO' | 'SEARCHING' | 'RECOMMENDING' | 'SITE_VISIT' | 'FOLLOW_UP' | 'COMPLETED';
}

export async function generateAutoReply(
  instructions: string,
  history: { role: 'user' | 'model'; text: string }[],
  aiState: ConversationAIState,
  propertiesContext: string
): Promise<GeminiStructuredResponse> {
  const ai = getVertexAI();
  const fallbackResponse: GeminiStructuredResponse = {
    reply: `Thank you for reaching out! One of our agents will get back to you shortly.`,
    action: 'CHITCHAT',
    recommended_property_ids: [],
    missing_fields: [],
    stage: aiState.stage || 'GREETING'
  };

  if (!ai) {
    fallbackResponse.reply += ' (GCP Vertex AI is not configured. Please set GCP_PROJECT_ID in your env).';
    return fallbackResponse;
  }

  const systemInstructionText = buildSystemInstruction(instructions, aiState, propertiesContext);

  // 1. Filter out empty messages
  const rawContents = history
    .filter(h => h.text && h.text.trim() !== '')
    .map(h => ({
      role: (h.role === 'model' ? 'model' : 'user') as 'user' | 'model',
      text: h.text,
    }));

  // 2. Merge consecutive turns with the same role
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

  // 3. Ensure the list starts with a 'user' turn (required by Vertex AI)
  while (contents.length > 0 && contents[0].role !== 'user') {
    contents.shift();
  }

  // 4. Fallback if contents is empty
  if (contents.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: 'Hello' }],
    });
  }

  const maxRetries = 3;
  let delay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const model = ai.preview.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: {
          parts: [{ text: systemInstructionText }]
        },
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.5,
        },
      });

      const response = await model.generateContent({
        contents,
      });

      const responseText = response.response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        console.warn('⚠️ [VERTEX AI] Empty response object received:', JSON.stringify(response));
        throw new Error('Empty response from Vertex AI');
      }

      try {
        const parsed = JSON.parse(responseText.trim()) as GeminiStructuredResponse;
        return {
          reply: parsed.reply || '',
          action: parsed.action || 'CHITCHAT',
          recommended_property_ids: parsed.recommended_property_ids || [],
          missing_fields: parsed.missing_fields || [],
          stage: parsed.stage || aiState.stage || 'GREETING'
        };
      } catch (jsonErr) {
        console.error('❌ Failed to parse Gemini JSON output:', jsonErr, 'Raw text:', responseText);
        return {
          reply: responseText.trim(),
          action: 'CHITCHAT',
          recommended_property_ids: [],
          missing_fields: [],
          stage: aiState.stage || 'GREETING'
        };
      }
    } catch (err: any) {
      const isRateLimit =
        err.status === 429 ||
        err.code === 429 ||
        err.message?.includes('429') ||
        err.message?.includes('Resource exhausted') ||
        err.message?.toLowerCase().includes('too many requests');

      if (isRateLimit && attempt < maxRetries) {
        console.warn(`⚠️ [VERTEX AI] Rate limited (429) on attempt ${attempt}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }

      console.error(`❌ Error calling Vertex AI Gemini model (Attempt ${attempt}/${maxRetries}):`, err);
      if (attempt === maxRetries) {
        return fallbackResponse;
      }
    }
  }

  return fallbackResponse;
}
