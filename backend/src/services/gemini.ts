import { GoogleGenerativeAI as GoogleGenAI } from '@google/generative-ai';
import { env } from '../config/env.js';

let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (genAIInstance) return genAIInstance;
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ [GEMINI AI] GEMINI_API_KEY environment variable is missing.');
    return null;
  }
  genAIInstance = new GoogleGenAI(apiKey);
  return genAIInstance;
}

export async function generateAutoReply(
  instructions: string,
  history: { role: 'user' | 'model'; text: string }[],
  propertiesContext: string
): Promise<string> {
  const genAI = getGenAI();
  if (!genAI) {
    return `Thank you for reaching out! One of our agents will get back to you shortly. (Gemini API key is not configured. Please set GEMINI_API_KEY in your env).`;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.5,
      },
      systemInstruction: `${instructions}\n\nHere are our active property listings. Recommend matching listings from this list ONLY. Do not invent properties:\n${propertiesContext}`
    });

    const contents = history.map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }],
    }));

    const result = await model.generateContent({
      contents
    });

    const responseText = result.response.text();
    if (!responseText) {
      throw new Error('Empty response from Gemini');
    }

    return responseText.trim();
  } catch (err: any) {
    console.error('❌ Error calling Gemini model:', err);
    return `Thank you for your message. We have received it and will get back to you shortly.`;
  }
}
