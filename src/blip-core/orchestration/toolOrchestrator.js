import { BLIP_TOOLS } from '../types.js';

function normalizeActionShape(raw = {}) {
  return {
    type: raw.type || 'tool_action',
    tool: raw.tool || BLIP_TOOLS.CHAT,
    intent: raw.intent || 'chat',
    confidence: Number(raw.confidence || 0),
    entities: raw.entities || {},
    state_effect: raw.state_effect || {},
    ui_effect: raw.ui_effect || {},
    confirmation_needed: Boolean(raw.confirmation_needed),
    execution_plan: Array.isArray(raw.execution_plan) ? raw.execution_plan : [],
    response: raw.response || '',
  };
}

export function createToolOrchestrator(options = {}) {
  const handlers = options.handlers || {};

  async function execute(actionPlan = {}, context = {}) {
    const action = normalizeActionShape(actionPlan);
    const handler = handlers[action.tool];

    if (!handler) {
      return {
        ok: false,
        ...action,
        response: action.response || `I can not use ${action.tool} yet.`,
      };
    }

    if (action.confirmation_needed && !context.confirmed) {
      return {
        ok: true,
        ...action,
        response: action.response || 'Before I do that, do you want me to continue?',
        awaitingConfirmation: true,
      };
    }

    const result = await handler(action, context);
    return {
      ok: result?.ok !== false,
      ...action,
      ...result,
    };
  }

  return { execute, normalizeActionShape };
}
