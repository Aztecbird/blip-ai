import { ROUTE_DECISION } from '../types.js';

export function createConfidenceRouter(options = {}) {
  const minAutoActConfidence = Number(options.minAutoActConfidence || 0.78);
  const minReasoningConfidence = Number(options.minReasoningConfidence || 0.5);
  const protectedIntents = new Set(options.protectedIntents || ['message_send', 'gmail_send']);

  function route(interpretedIntent = {}, context = {}) {
    const confidence = Number(interpretedIntent.confidence || 0);
    const ambiguous = Boolean(interpretedIntent.ambiguous);
    const unsafe = Boolean(context.unsafe);
    const protectedAction = protectedIntents.has(interpretedIntent.intent);

    if (unsafe) {
      return {
        decision: ROUTE_DECISION.BLOCK,
        reason: 'unsafe_or_restricted',
        confirmationNeeded: false,
      };
    }

    if (ambiguous || confidence < minReasoningConfidence) {
      return {
        decision: ROUTE_DECISION.CLARIFY,
        reason: 'low_confidence_or_ambiguous',
        confirmationNeeded: true,
      };
    }

    if (confidence < minAutoActConfidence) {
      return {
        decision: ROUTE_DECISION.REASONING,
        reason: 'mid_confidence_needs_reasoning',
        confirmationNeeded: protectedAction,
      };
    }

    return {
      decision: protectedAction ? ROUTE_DECISION.RULES : ROUTE_DECISION.ACT_NOW,
      reason: protectedAction ? 'protected_action_requires_confirm' : 'high_confidence',
      confirmationNeeded: protectedAction,
    };
  }

  return { route };
}
