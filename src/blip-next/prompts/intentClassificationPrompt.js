export const intentClassificationPrompt = `
Classify the user's turn into one conversation frame:
direct_command, informational_query, free_conversation, follow_up, correction, confirmation, emotional_moment, urgent_or_safety, unsupported_request.

Use active workflow context, pending confirmations, current draft state, and recent references.
Treat short replies like "yes", "no", "send it", "the second one", and "tomorrow instead" as likely follow-ups to the active state.
Return strict JSON with:
{
  "conversation_frame": string,
  "confidence": number,
  "reason": string,
  "response_style": "chatty" | "brief" | "confirming" | "clarifying" | "urgent"
}
`.trim();
