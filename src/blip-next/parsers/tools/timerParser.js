export function createTimerParser() {
  function parse({ utterance = '', entities = {}, frame = 'direct_command' }) {
    const lower = String(utterance || '').toLowerCase();
    if (!/\btimer\b/.test(lower) && !entities.duration) return null;

    const action = /\bcancel\b/.test(lower) ? 'cancel' : 'set';
    const duration = entities.duration || null;

    return {
      tool: 'timer',
      intent_type: `timer.${action}`,
      conversation_frame: frame,
      confidence: action === 'cancel' ? 0.95 : duration ? 0.96 : 0.54,
      extracted_entities: { duration },
      shared_objects_out: duration ? [{ id: 'timer-duration', type: 'duration', label: `${duration.value} ${duration.unit}`, value: duration }] : [],
      repairable_fields: ['duration', 'label'],
      follow_up_needed: action === 'set' && !duration,
      clarification_question: action === 'set' && !duration ? 'How long should I set the timer for?' : null,
      action,
    };
  }

  return { parse };
}
