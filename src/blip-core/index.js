import { createIntentInterpreter } from './intents/intentInterpreter.js';
import { createBlipStateEngine } from './state/blipStateEngine.js';
import { createSignatureBehaviorLayer } from './behavior/signatureBehaviorLayer.js';
import { createSharedMemory } from './memory/sharedMemory.js';
import { createConfidenceRouter } from './routing/confidenceRouter.js';
import { createToolOrchestrator } from './orchestration/toolOrchestrator.js';
import { createOriginalityLayer } from './originality/originalityLayer.js';

function buildExecutionPlan(intent = {}, route = {}, behavior = {}) {
  const plan = [];

  if (route.decision === 'clarify') {
    plan.push({ step: 'ask_clarification', prompt: 'Can you tell me exactly what you want me to do?' });
  } else {
    plan.push({ step: 'run_tool', tool: intent.tool, intent: intent.intent });
  }

  if (behavior.summaryBeforeAction) {
    plan.unshift({ step: 'summarize_before_action' });
  }

  return plan;
}

export function createBlipSecretSauceEngine(options = {}) {
  const memory = createSharedMemory(options.memory);
  const stateEngine = createBlipStateEngine(options.state);
  const intentInterpreter = createIntentInterpreter(options.intent);
  const confidenceRouter = createConfidenceRouter(options.router);
  const behaviorLayer = createSignatureBehaviorLayer(options.behavior);
  const originalityLayer = createOriginalityLayer();
  const orchestrator = createToolOrchestrator(options.orchestrator);

  async function processVoiceInput(input = {}) {
    const utterance = String(input.utterance || '').trim();
    if (!utterance) {
      return {
        ok: false,
        response: 'I did not catch that. Please try again.',
      };
    }

    const followUpContext = {
      currentRecipient: memory.get('currentRecipient'),
      currentDraft: memory.get('currentDraft'),
      activePanel: memory.get('activePanel'),
      lastOpenedTool: memory.get('lastOpenedTool'),
      recentSearchTopic: memory.get('recentSearchTopic'),
    };

    stateEngine.applyEvent({ name: 'wake' });
    const interpretedIntent = await intentInterpreter.interpret(utterance, {
      followUp: followUpContext,
      ...input.context,
    });

    const route = confidenceRouter.route(interpretedIntent, input.context || {});
    const uiPolicy = stateEngine.applyEvent({
      name: route.decision === 'clarify' ? 'uncertain' : 'thinking',
      userTone: interpretedIntent.userTone,
      confidence: interpretedIntent.confidence,
    });

    const behaviorContext = behaviorLayer.apply({
      interpretedIntent,
      route,
      confirmationNeeded: route.confirmationNeeded,
      responseLength: uiPolicy.shortReply ? 'short' : 'normal',
    });

    const actionPlan = originalityLayer.decoratePlan(
      {
        type: 'tool_action',
        tool: interpretedIntent.tool,
        intent: interpretedIntent.intent,
        confidence: interpretedIntent.confidence,
        entities: interpretedIntent.entities || {},
        state_effect: { state: uiPolicy.state, toneStyle: uiPolicy.toneStyle },
        ui_effect: {
          faceAnimationMode: uiPolicy.faceAnimationMode,
          responseDelayMs: uiPolicy.responseDelayMs,
          shortReply: uiPolicy.shortReply,
        },
        confirmation_needed: behaviorContext.confirmationNeeded,
        execution_plan: buildExecutionPlan(interpretedIntent, route, behaviorContext),
        response: behaviorContext.signatureLine || '',
      },
      {
        state: stateEngine.snapshot(),
        ui: uiPolicy,
      }
    );

    const result = await orchestrator.execute(actionPlan, {
      confirmed: Boolean(input.confirmed),
      memory,
      state: stateEngine.snapshot(),
      ui: uiPolicy,
      interpretedIntent,
      route,
    });

    if (result.ok) {
      memory.set('lastOpenedTool', interpretedIntent.tool);
      if (interpretedIntent.entities?.recipient) {
        memory.set('currentRecipient', interpretedIntent.entities.recipient);
      }
      if (interpretedIntent.entities?.topic) {
        memory.set('recentSearchTopic', interpretedIntent.entities.topic);
      }
      if (interpretedIntent.intent === 'close_all') {
        memory.reset();
      }
    }

    originalityLayer.observeResult(interpretedIntent, result);
    stateEngine.applyEvent({ name: 'speak', userTone: interpretedIntent.userTone, confidence: interpretedIntent.confidence });

    return {
      ok: result.ok,
      interpretedIntent,
      route,
      actionPlan,
      uiPolicy,
      memory: memory.snapshot(),
      result,
    };
  }

  return {
    processVoiceInput,
    memory,
    stateEngine,
    intentInterpreter,
    confidenceRouter,
    behaviorLayer,
    originalityLayer,
    orchestrator,
  };
}
