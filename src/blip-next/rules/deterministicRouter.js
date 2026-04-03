function extractDuration(text = '') {
  const minuteMatch = text.match(/\b(\d{1,3})\s*(minutes?|mins?)\b/i);
  if (minuteMatch) return { value: Number(minuteMatch[1]), unit: 'minutes' };

  const secondMatch = text.match(/\b(\d{1,4})\s*(seconds?|secs?)\b/i);
  if (secondMatch) return { value: Number(secondMatch[1]), unit: 'seconds' };

  return null;
}

function timerEnvelope(duration) {
  return {
    intent_type: 'timer.set',
    conversation_frame: 'direct_command',
    tool_targets: ['timer'],
    confidence: duration ? 0.99 : 0.42,
    extracted_entities: duration ? { duration } : {},
    shared_objects_in: [],
    shared_objects_out: duration
      ? [{ id: 'timer-duration', type: 'duration', label: `${duration.value} ${duration.unit}`, value: duration }]
      : [],
    requires_confirmation: false,
    risk_level: 'low',
    repairable_fields: ['duration', 'label'],
    execution_plan: null,
    follow_up_needed: !duration,
    clarification_question: duration ? null : 'For how long should I set the timer?',
    response_style: duration ? 'brief' : 'clarifying',
    turn_policy: duration ? 'respond_and_act' : 'respond_and_ask',
    parser_source: 'deterministic',
  };
}

export function runDeterministicPass(utterance = '') {
  const text = String(utterance || '').trim();
  const lower = text.toLowerCase();

  if (!text) return null;

  if (/^(open|show)\s+gmail\b/.test(lower)) {
    return {
      intent_type: 'gmail.open',
      conversation_frame: 'direct_command',
      tool_targets: ['gmail'],
      confidence: 0.99,
      extracted_entities: {},
      shared_objects_in: [],
      shared_objects_out: [],
      requires_confirmation: false,
      risk_level: 'low',
      repairable_fields: [],
      execution_plan: null,
      follow_up_needed: false,
      clarification_question: null,
      response_style: 'brief',
      turn_policy: 'respond_and_act',
      parser_source: 'deterministic',
    };
  }

  if (/^(open|show)\s+telegram\b/.test(lower)) {
    return {
      intent_type: 'telegram.open',
      conversation_frame: 'direct_command',
      tool_targets: ['telegram'],
      confidence: 0.99,
      extracted_entities: {},
      shared_objects_in: [],
      shared_objects_out: [],
      requires_confirmation: false,
      risk_level: 'low',
      repairable_fields: [],
      execution_plan: null,
      follow_up_needed: false,
      clarification_question: null,
      response_style: 'brief',
      turn_policy: 'respond_and_act',
      parser_source: 'deterministic',
    };
  }

  if (/^(set\s+)?timer\b/.test(lower) || /^set a timer\b/.test(lower)) {
    return timerEnvelope(extractDuration(text));
  }

  if (/^cancel timer\b/.test(lower)) {
    return {
      intent_type: 'timer.cancel',
      conversation_frame: 'direct_command',
      tool_targets: ['timer'],
      confidence: 0.99,
      extracted_entities: {},
      shared_objects_in: [],
      shared_objects_out: [],
      requires_confirmation: false,
      risk_level: 'low',
      repairable_fields: [],
      execution_plan: null,
      follow_up_needed: false,
      clarification_question: null,
      response_style: 'brief',
      turn_policy: 'respond_and_act',
      parser_source: 'deterministic',
    };
  }

  if (/^what time is it\b/.test(lower)) {
    return {
      intent_type: 'system.time_lookup',
      conversation_frame: 'informational_query',
      tool_targets: [],
      confidence: 0.99,
      extracted_entities: {},
      shared_objects_in: [],
      shared_objects_out: [],
      requires_confirmation: false,
      risk_level: 'none',
      repairable_fields: [],
      execution_plan: null,
      follow_up_needed: false,
      clarification_question: null,
      response_style: 'brief',
      turn_policy: 'respond_only',
      parser_source: 'deterministic',
    };
  }

  if (/^weather in\b/.test(lower)) {
    const location = text.replace(/^weather in\s+/i, '').trim();
    return {
      intent_type: 'weather.lookup',
      conversation_frame: 'informational_query',
      tool_targets: ['weather'],
      confidence: location ? 0.98 : 0.51,
      extracted_entities: location ? { location } : {},
      shared_objects_in: [],
      shared_objects_out: location ? [{ id: 'weather-location', type: 'location', label: location, value: location }] : [],
      requires_confirmation: false,
      risk_level: 'none',
      repairable_fields: ['location'],
      execution_plan: null,
      follow_up_needed: !location,
      clarification_question: location ? null : 'Which location should I check?',
      response_style: location ? 'brief' : 'clarifying',
      turn_policy: location ? 'respond_and_act' : 'respond_and_ask',
      parser_source: 'deterministic',
    };
  }

  if (/^(stop alert|go to sleep|wake up|go back|scroll down|close this|close everything)\b/.test(lower)) {
    return {
      intent_type: 'system.command',
      conversation_frame: 'direct_command',
      tool_targets: ['system'],
      confidence: 0.97,
      extracted_entities: { command: lower },
      shared_objects_in: [],
      shared_objects_out: [],
      requires_confirmation: false,
      risk_level: 'low',
      repairable_fields: [],
      execution_plan: null,
      follow_up_needed: false,
      clarification_question: null,
      response_style: 'brief',
      turn_policy: 'respond_and_act',
      parser_source: 'deterministic',
    };
  }

  return null;
}
