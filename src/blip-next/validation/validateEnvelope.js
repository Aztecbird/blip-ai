import { getToolCapability } from '../tools/capabilities.js';

export function validateEnvelope(envelope, state = {}) {
  const errors = [];
  const toolTargets = Array.isArray(envelope.tool_targets) ? envelope.tool_targets : [];

  for (const tool of toolTargets) {
    if (tool !== 'system' && !getToolCapability(tool)) {
      errors.push(`Tool ${tool} is not available.`);
    }
  }

  if (envelope.requires_confirmation && !['ask_before_acting', 'respond_and_ask'].includes(envelope.turn_policy)) {
    errors.push('Confirmation-required action is missing the correct turn policy.');
  }

  if (toolTargets.length > 1 && envelope.confidence < 0.55) {
    errors.push('Ambiguous multi-tool interpretation.');
  }

  if (
    state.state === 'waiting_confirmation'
    && state.working_memory?.pending_confirmation
    && !['confirmation', 'correction'].includes(envelope.conversation_frame)
  ) {
    errors.push('A pending confirmation exists and should be resolved first.');
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
