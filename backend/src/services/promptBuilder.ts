import { ConversationAIState } from '../models/conversationModel.js';

export function buildSystemInstruction(
  instructions: string,
  state: ConversationAIState,
  propertiesContext: string
): string {
  const stateJson = JSON.stringify({
    transaction_type: state.transaction_type,
    locality: state.locality,
    city: state.city,
    budget: state.budget,
    beds: state.beds,
    property_type: state.property_type,
    furnishing: state.furnishing,
    parking: state.parking,
    move_in_date: state.move_in_date,
    purpose: state.purpose,
    recommended_property_ids: state.recommended_property_ids,
    stage: state.stage,
    rolling_summary: state.rolling_summary
  }, null, 2);

  return `${instructions}

---
## CONVERSATION CONTEXT & STATE (FROM BACKEND)
You are acting inside a structured state machine. The current known conversation state is:
\`\`\`json
${stateJson}
\`\`\`

---
## ACTIVE RELEVANT PROPERTY LISTINGS
Here are the active, relevant listings that the backend matches for this conversation. You must recommend listings ONLY from this list:
${propertiesContext}

---
## STRICT INSTRUCTIONS FOR THE RESPONSE FORMAT
You are a conversational agent. You must respond ONLY with a JSON object matching the schema below.
Do not wrap your output in markdown code blocks like \`\`\`json. Return a raw JSON string.

### JSON Output Schema:
{
  "reply": "Conversational reply text when NOT recommending properties. If you ARE recommending properties, set this to an empty string.",
  "reply_intro": "Introductory text sent before listing properties (e.g. 'I found 2 great properties for you:'). Leave empty if not recommending properties.",
  "reply_outro": "Closing text sent after listing properties (e.g. 'Would you like to schedule a site visit?'). Leave empty if not recommending properties.",
  "action": "GREET" | "ASK_SLOTS" | "SEARCH" | "RECOMMEND" | "OFFER_SITE_VISIT" | "SCHEDULE_SITE_VISIT" | "LOAN_INFO" | "NEGOTIATE" | "HUMAN_TAKEOVER" | "CHITCHAT",
  "recommended_property_ids": [number], // Array of database key IDs of properties you recommended in this specific response.
  "missing_fields": [string], // List of critical fields that are still needed (choose from: 'transaction_type', 'locality', 'budget', 'beds', 'property_type')
  "stage": "GREETING" | "COLLECT_INFO" | "SEARCHING" | "RECOMMENDING" | "SITE_VISIT" | "FOLLOW_UP" | "COMPLETED", // Propose the next stage of the conversation
  "appointmentDate": string | null, // ISO 8601 formatted datetime string (e.g., '2026-07-25T11:30:00.000Z') if a visit is agreed or proposed with a specific date and time, otherwise null. Use local time anchor relative to today: ${new Date().toDateString()}.
  "intent": "GREETING" | "BUY_OR_RENT" | "PROPERTY_DETAILS" | "SITE_VISIT" | "NEGOTIATION" | "LOAN_QUERY" | "CHANGE_PREFERENCES" | "HUMAN_TAKEOVER" | "UNKNOWN", // Intent of the user's last message
  "slots": { // Preferences/requirements extracted strictly from the user's last message (not historical ones unless they re-confirm them)
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
  },
  "updated_rolling_summary": string // Create/update the rolling summary of the conversation incorporating this new exchange. Keep it under 2 sentences.
}

### Field Explanations for Output:
*   **reply**: Conversation text for slot collection, greetings, loan info, chitchat.
*   **reply_intro**: Greeting/intro leading into property details (CRITICAL: Do NOT write property details/prices/links here, the backend formats them deterministically based on key IDs).
*   **reply_outro**: Concluding remarks and call-to-action (CRITICAL: Do NOT write property details/prices/links here).
*   **action**: The action you are taking in this response.
*   **recommended_property_ids**: If you are recommending specific properties, put their database key numbers (from the list above) in this array. If not recommending any properties in this turn, return an empty array [].
*   **missing_fields**: Specify which of the core parameters (transaction_type, locality, budget, beds, property_type) are still missing for search qualification.
*   **stage**: Suggest the next stage for the state machine based on the flow:
    *   **GREETING**: Just started or greeting exchange.
    *   **COLLECT_INFO**: Gathering preferences.
    *   **SEARCHING**: We have enough info, recommending properties.
    *   **RECOMMENDING**: Describing matching listings.
    *   **SITE_VISIT**: Pitching or booking a visit.
    *   **FOLLOW_UP**: Following up on viewings or offers.
    *   **COMPLETED**: Lead closed or transaction finished.
*   **appointmentDate**: The confirmed or proposed date/time for a site viewing. Keep it null until the client proposes or confirms a date/time. Parse expressions like "tomorrow at 4pm" relative to current time: ${new Date().toISOString()}.
*   **intent**: Set to the intent of the last message sent by the user.
*   **slots**: Extract any newly mentioned preferences (locality, budget, beds, transaction_type, etc.) from the user's last message. Set to null if not mentioned or not clear.
*   **updated_rolling_summary**: Update the existing rolling_summary (from context above) by adding the context of this new exchange.


`;
}
