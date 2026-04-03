const DEFAULT_WORKING_MEMORY = Object.freeze({
  active_tool: null,
  active_workflow: null,
  pending_confirmation: null,
  last_open_panel: null,
  current_draft: null,
  current_recipient: null,
  current_subject: null,
  last_search_results: [],
  unresolved_pronouns: [],
  last_person_reference: null,
  last_item_reference: null,
  last_location_reference: null,
  repair_context: null,
});

export function createConversationState(seed = {}) {
  return {
    state: seed.state || 'idle',
    frame: seed.frame || 'free_conversation',
    turn_policy: seed.turn_policy || 'respond_only',
    tone: seed.tone || 'calm',
    working_memory: {
      ...DEFAULT_WORKING_MEMORY,
      ...(seed.working_memory || {}),
    },
  };
}

export function deriveStateFromEnvelope(envelope, currentState) {
  if (!envelope) return currentState;

  if (envelope.conversation_frame === 'confirmation') {
    return { ...currentState, state: 'waiting_confirmation', frame: 'confirmation', turn_policy: envelope.turn_policy };
  }

  if (envelope.turn_policy === 'repair_existing_state') {
    return { ...currentState, state: 'repairing', frame: envelope.conversation_frame, turn_policy: envelope.turn_policy };
  }

  if (envelope.turn_policy === 'ask_before_acting') {
    return { ...currentState, state: 'waiting_confirmation', frame: envelope.conversation_frame, turn_policy: envelope.turn_policy };
  }

  if (envelope.turn_policy === 'respond_and_act') {
    return { ...currentState, state: 'executing', frame: envelope.conversation_frame, turn_policy: envelope.turn_policy };
  }

  if (envelope.turn_policy === 'respond_and_ask') {
    return { ...currentState, state: 'clarifying', frame: envelope.conversation_frame, turn_policy: envelope.turn_policy };
  }

  return { ...currentState, state: 'chatting', frame: envelope.conversation_frame, turn_policy: envelope.turn_policy };
}

export function applyMemoryPatch(state, patch = {}) {
  return {
    ...state,
    working_memory: {
      ...state.working_memory,
      ...patch,
    },
  };
}
