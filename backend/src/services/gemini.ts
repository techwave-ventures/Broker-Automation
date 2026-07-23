import { VertexAI } from '@google-cloud/vertexai';
import { env } from '../config/env.js';
import fs from 'fs';
import path from 'path';

let vertexAIInstance: any = null;

function getVertexAI() {
  if (vertexAIInstance) return vertexAIInstance;
  
  const projectId = env.GCP_PROJECT_ID;
  const location = env.GCP_LOCATION || 'us-central1';

  if (!projectId) {
    console.warn('⚠️ [VERTEX AI] GCP_PROJECT_ID environment variable is missing. Vertex AI is not initialized.');
    return null;
  }

  // Handle Render / AWS deployment environment variables (written as multiline strings)
  const serviceAccountJson = env.GCP_SERVICE_ACCOUNT_JSON || process.env.GCP_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const tempKeyPath = path.join(process.cwd(), 'temp-gcp-key.json');
      fs.writeFileSync(tempKeyPath, serviceAccountJson.trim());
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tempKeyPath;
      console.log('🔑 [VERTEX AI] Successfully wrote service account credentials file from environment variable string.');
    } catch (err) {
      console.error('❌ [VERTEX AI] Failed to write GCP service account credentials string:', err);
    }
  }

  try {
    // VertexAI SDK will automatically pick up standard credentials from local ADC or GOOGLE_APPLICATION_CREDENTIALS path
    vertexAIInstance = new VertexAI({ project: projectId, location });
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

  try {
    const systemInstructionText = `${instructions}\n\nHere are our active property listings. Recommend matching listings from this list ONLY. Do not invent properties:\n${propertiesContext}`;

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

    const contents = history.map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }],
    }));

    const response = await model.generateContent({
      contents,
    });

    const responseText = response.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('Empty response from Vertex AI');
    }

    return responseText.trim();
  } catch (err: any) {
    console.error('❌ Error calling Vertex AI Gemini model:', err);
    return `Thank you for your message. We have received it and will get back to you shortly.`;
  }
}
