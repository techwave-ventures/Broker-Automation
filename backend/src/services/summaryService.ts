import { getVertexAI } from './gemini.js';

export async function updateRollingSummary(
  currentSummary: string,
  newMessages: { role: string; text: string }[]
): Promise<string> {
  const ai = getVertexAI();
  if (!ai) {
    console.warn('⚠️ [VERTEX AI] Vertex AI is not initialized. Skipping summary update.');
    return currentSummary;
  }

  const newTurnsText = newMessages
    .map(msg => `${msg.role === 'user' ? 'Customer' : 'Bot'}: "${msg.text}"`)
    .join('\n');

  const prompt = `
You are a concise real estate assistant maintaining a rolling summary of a customer conversation on WhatsApp.
Your task is to merge the previous summary and the latest exchange into an updated concise summary.

Previous Summary: "${currentSummary || 'None'}"
Latest exchange:
${newTurnsText}

Instructions:
1. Write a consolidated, updated summary of the user's requirements (budget, configuration, location preferences) and status.
2. Keep the summary extremely short and crisp (maximum 2 sentences).
3. Do not mention greetings or chitchat. Focus on transactional property constraints.
4. Output only the plain text summary. Do not output JSON or wrap in markdown blocks.
`;

  try {
    const model = ai.preview.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3,
      },
    });

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const responseText = response.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('Empty summary returned from Vertex AI');
    }

    return responseText.trim();
  } catch (err) {
    console.error('❌ Failed to update rolling summary via Vertex AI:', err);
    return currentSummary; // Fallback to current summary on failure
  }
}
