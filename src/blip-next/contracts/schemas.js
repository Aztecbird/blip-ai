export const conversationStateSchema = {
  type: 'object',
  required: ['state', 'frame', 'turn_policy', 'tone', 'working_memory'],
  properties: {
    state: {
      enum: [
        'idle',
        'listening',
        'understanding',
        'chatting',
        'clarifying',
        'drafting',
        'waiting_confirmation',
        'executing',
        'reporting_result',
        'repairing',
        'alert_mode',
      ],
    },
    frame: {
      enum: [
        'direct_command',
        'informational_query',
        'free_conversation',
        'follow_up',
        'correction',
        'confirmation',
        'emotional_moment',
        'urgent_or_safety',
        'unsupported_request',
      ],
    },
    turn_policy: {
      enum: [
        'respond_only',
        'respond_and_ask',
        'respond_and_act',
        'ask_before_acting',
        'repair_existing_state',
        'route_to_fallback',
      ],
    },
    tone: { enum: ['calm', 'warm', 'steady', 'urgent'] },
    working_memory: { type: 'object' },
  },
};

export const parserEnvelopeSchema = {
  type: 'object',
  required: [
    'intent_type',
    'conversation_frame',
    'tool_targets',
    'confidence',
    'extracted_entities',
    'shared_objects_in',
    'shared_objects_out',
    'requires_confirmation',
    'risk_level',
    'repairable_fields',
    'execution_plan',
    'follow_up_needed',
    'clarification_question',
    'response_style',
    'turn_policy',
  ],
  properties: {
    intent_type: { type: 'string' },
    conversation_frame: { type: 'string' },
    tool_targets: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'number' },
    extracted_entities: { type: 'object' },
    shared_objects_in: { type: 'array', items: { type: 'object' } },
    shared_objects_out: { type: 'array', items: { type: 'object' } },
    requires_confirmation: { type: 'boolean' },
    risk_level: { enum: ['none', 'low', 'medium', 'high', 'critical'] },
    repairable_fields: { type: 'array', items: { type: 'string' } },
    execution_plan: { anyOf: [{ type: 'object' }, { type: 'null' }] },
    follow_up_needed: { type: 'boolean' },
    clarification_question: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    response_style: { enum: ['chatty', 'brief', 'confirming', 'clarifying', 'urgent'] },
    turn_policy: { type: 'string' },
    validation_errors: { type: 'array', items: { type: 'string' } },
  },
};

export const toolCapabilitySchema = {
  type: 'object',
  required: [
    'name',
    'consumes',
    'produces',
    'actions',
    'risk_level',
    'requires_confirmation',
    'ui_surface',
    'repairable_fields',
  ],
  properties: {
    name: { type: 'string' },
    consumes: { type: 'array', items: { type: 'string' } },
    produces: { type: 'array', items: { type: 'string' } },
    actions: { type: 'array', items: { type: 'string' } },
    risk_level: { enum: ['none', 'low', 'medium', 'high', 'critical'] },
    requires_confirmation: { type: 'boolean' },
    ui_surface: { enum: ['panel', 'voice', 'background', 'mixed'] },
    repairable_fields: { type: 'array', items: { type: 'string' } },
  },
};

export const workflowPlanSchema = {
  type: 'object',
  required: ['id', 'summary', 'steps', 'shared_objects', 'next_step_id'],
  properties: {
    id: { type: 'string' },
    summary: { type: 'string' },
    steps: { type: 'array', items: { type: 'object' } },
    shared_objects: { type: 'array', items: { type: 'object' } },
    next_step_id: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
};

export const confirmationPolicySchema = {
  type: 'object',
  required: ['required', 'reason', 'risk_level'],
  properties: {
    required: { type: 'boolean' },
    reason: { type: 'string' },
    risk_level: { enum: ['none', 'low', 'medium', 'high', 'critical'] },
    confirm_message: { type: 'string' },
  },
};

export const repairContextSchema = {
  type: 'object',
  required: ['target', 'tool', 'fields', 'reason'],
  properties: {
    target: { enum: ['draft', 'workflow', 'confirmation', 'tool_state', 'none'] },
    tool: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    fields: { type: 'array', items: { type: 'string' } },
    reason: { type: 'string' },
    original_utterance: { type: 'string' },
  },
};
