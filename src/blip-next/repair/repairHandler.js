export function createRepairHandler() {
  function parseRepair(utterance = '', context = {}) {
    const lower = String(utterance || '').trim().toLowerCase();
    const memory = context.working_memory || {};

    if (/^change the subject\b/.test(lower)) {
      return {
        handled: true,
        repair_context: {
          target: 'draft',
          tool: memory.active_tool || 'gmail',
          fields: ['subject'],
          reason: 'user_requested_subject_change',
          original_utterance: utterance,
        },
        patch: {},
      };
    }

    if (/^tomorrow instead\b/.test(lower) || /\btomorrow instead\b/.test(lower)) {
      return {
        handled: true,
        repair_context: {
          target: 'workflow',
          tool: memory.active_tool,
          fields: ['date_time'],
          reason: 'user_changed_schedule',
          original_utterance: utterance,
        },
        patch: { date_reference: 'tomorrow' },
      };
    }

    if (/^not\s+/.test(lower)) {
      const replacement = utterance.replace(/^not\s+/i, '').trim();
      return {
        handled: true,
        repair_context: {
          target: 'draft',
          tool: memory.active_tool,
          fields: ['recipient'],
          reason: 'user_corrected_recipient',
          original_utterance: utterance,
        },
        patch: { recipient: replacement },
      };
    }

    if (/\bemail instead\b/.test(lower) || /\btelegram instead\b/.test(lower)) {
      return {
        handled: true,
        repair_context: {
          target: 'workflow',
          tool: memory.active_tool,
          fields: ['channel'],
          reason: 'user_changed_tool',
          original_utterance: utterance,
        },
        patch: { channel_switch: lower.includes('email instead') ? 'gmail' : 'telegram' },
      };
    }

    if (/^(cancel it|stop that|never mind)\b/.test(lower)) {
      return {
        handled: true,
        repair_context: {
          target: 'workflow',
          tool: memory.active_tool,
          fields: ['status'],
          reason: 'user_cancelled_flow',
          original_utterance: utterance,
        },
        patch: { cancel_flow: true },
      };
    }

    return { handled: false, repair_context: null, patch: {} };
  }

  return { parseRepair };
}
