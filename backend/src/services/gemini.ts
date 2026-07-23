import { VertexAI } from '@google-cloud/vertexai';
import { env } from '../config/env.js';

let vertexAIInstance: any = null;

function getVertexAI() {
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

export async function generateAutoReply(
  instructions: string,
  history: { role: 'user' | 'model'; text: string }[],
  propertiesContext: string
): Promise<string> {
  const ai = getVertexAI();
  if (!ai) {
    return `Thank you for reaching out! One of our agents will get back to you shortly. (GCP Vertex AI is not configured. Please set GCP_PROJECT_ID in your env).`;
  }

  const systemInstructionText = `${instructions}\n\nHere are our active property listings. Recommend matching listings from this list ONLY. Do not invent properties:\n${propertiesContext}`;

  const contents = history
    .filter(h => h.text && h.text.trim() !== '')
    .map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }],
    }));

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
          maxOutputTokens: 800,
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

      return responseText.trim();
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
        return `Thank you for your message. We have received it and will get back to you shortly.`;
      }
    }
  }

  return `Thank you for your message. We have received it and will get back to you shortly.`;
}
