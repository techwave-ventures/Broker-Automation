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
  // If critical fields are missing, force stage to COLLECT_INFO (unless we are still in GREETING or transitioning to viewing/visit stages)
  if (missing.length > 0) {
    if (nextStage !== 'SITE_VISIT' && nextStage !== 'RECOMMENDING' && nextStage !== 'FOLLOW_UP') {
      if (currentState.stage !== 'GREETING' || nextStage !== 'GREETING') {
        nextStage = 'COLLECT_INFO';
      }
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

  // 5. Interested Property IDs tracking:
  // Ensure we accumulate interested IDs across history
  const interestedIds = Array.isArray(currentState.interested_property_ids)
    ? [...currentState.interested_property_ids]
    : [];

  if (geminiResponse.interested_property_ids && Array.isArray(geminiResponse.interested_property_ids)) {
    for (const id of geminiResponse.interested_property_ids) {
      const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (!isNaN(numericId) && !interestedIds.includes(numericId)) {
        interestedIds.push(numericId);
      }
    }
  }

  return {
    stage: nextStage,
    recommended_property_ids: recommendedIds,
    interested_property_ids: interestedIds
  };
}
