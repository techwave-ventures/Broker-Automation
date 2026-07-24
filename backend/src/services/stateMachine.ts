import { ConversationAIState } from '../models/conversationModel.js';
import { GeminiStructuredResponse } from './gemini.js';
import { IntentResult } from './intentDetector.js';

export function resolveNextState(
  currentState: ConversationAIState,
  intentResult: IntentResult,
  geminiResponse: GeminiStructuredResponse
): Partial<ConversationAIState> {
  let nextStage = geminiResponse.stage || currentState.stage;

  // 1. Check for critical search preferences slots:
  // transaction_type, locality, budget, beds, property_type
  const criticalFields = ['transaction_type', 'locality', 'budget', 'beds', 'property_type'] as const;
  
  // We check the currentState (which contains any new slots merged before Gemini is invoked)
  const missing = criticalFields.filter(
    field => currentState[field] === null || currentState[field] === undefined
  );

  // 2. Enforce Slot-Filling Lock:
  // If critical fields are missing, force stage to COLLECT_INFO (unless we are still in GREETING)
  if (missing.length > 0) {
    if (currentState.stage !== 'GREETING' || nextStage !== 'GREETING') {
      nextStage = 'COLLECT_INFO';
    }
  } else {
    // If all slots are collected and we were collecting, transition to SEARCHING or RECOMMEND
    if (currentState.stage === 'GREETING' || currentState.stage === 'COLLECT_INFO') {
      if (nextStage === 'GREETING' || nextStage === 'COLLECT_INFO') {
        nextStage = 'SEARCHING';
      }
    }
  }

  // 3. Intent Overrides:
  if (intentResult.intent === 'GREETING' && currentState.stage === 'GREETING') {
    nextStage = 'GREETING';
  } else if (intentResult.intent === 'SITE_VISIT') {
    nextStage = 'SITE_VISIT';
  } else if (intentResult.intent === 'NEGOTIATION') {
    // Hold in recommending stage for negotiations
    nextStage = 'RECOMMENDING';
  }

  // 4. Recommended Property IDs tracking:
  // Ensure we accumulate recommended IDs across history
  const recommendedIds = Array.isArray(currentState.recommended_property_ids)
    ? [...currentState.recommended_property_ids]
    : [];

  if (geminiResponse.recommended_property_ids && Array.isArray(geminiResponse.recommended_property_ids)) {
    for (const id of geminiResponse.recommended_property_ids) {
      const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (!isNaN(numericId) && !recommendedIds.includes(numericId)) {
        recommendedIds.push(numericId);
      }
    }
  }

  return {
    stage: nextStage,
    recommended_property_ids: recommendedIds
  };
}
