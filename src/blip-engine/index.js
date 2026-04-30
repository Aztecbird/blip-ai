/**
 * @file index.js
 * @category EntryPoint
 * @description The "Blip Secret Sauce Engine". 
 * Main entry point for the core intelligence layer.
 */

import { stateEngine, BLIP_STATES } from './core/StateEngine.js';
import { memoryManager } from './core/MemoryManager.js';
import { intentInterpreter, INTENT_TYPES } from './core/IntentInterpreter.js';
import { confidenceRouter, DECISION_PATH } from './core/ConfidenceRouter.js';
import { toolOrchestrator } from './core/Orchestrator.js';
import { originalityLayer } from './logic/OriginalityLayer.js';
import { BlipBehaviors } from './logic/BehaviorLayer.js';

/**
 * The Blip Processor: 
 * Handles the full pipeline from raw voice input to behavioral action.
 */
class BlipEngine {
  constructor(options = {}) {
    this.state = stateEngine;
    this.memory = memoryManager;
    this.interpreter = intentInterpreter;
    this.router = confidenceRouter;
    this.orchestrator = toolOrchestrator;
    this.originality = originalityLayer;

    if (options.appHandlers) {
      Object.entries(options.appHandlers).forEach(([name, handler]) => {
        this.orchestrator.register(name, handler);
      });
    }
  }

  /**
   * Main interaction loop.
   * @param {string} input - The voice command text.
   * @param {Object} context - Optional environment context (UI, projector mode, etc.)
   */
  async process(input, context = {}) {
    console.log("--- BLIP PROCESS START ---", input);

    // 1. Ingest & Interpret
    const intent = await this.interpreter.interpret(input);
    this.memory.update('lastIntent', intent.type);
    
    // 2. Decide Path (Confidence check)
    const plan = await this.router.route(intent, this.state.getStateSummary());
    
    // 3. Behavioral Polishing (The Sauce)
    let processedAction = await this.orchestrator.execute(plan);
    
    // 4. Apply Originality Policies
    const resultWithSauce = this.originality.applyPolicies(
      processedAction.action || { intent, confidence: intent.confidence }, 
      this.memory.getSession()
    );

    // 5. Final Behavioral Polish & Output preparation
    const replyText = this.prepareReply(intent, plan, resultWithSauce, context);

    console.log("--- BLIP PROCESS END ---", replyText);

    return {
      ok: processedAction.success,
      result: processedAction.result,
      text: replyText,
      confidence: intent.confidence,
      plan: plan,
      action: resultWithSauce,
      state: this.state.getStateSummary()
    };
  }

  async processVoiceInput(input, context = {}) {
    const text = typeof input === 'string' ? input : (input.utterance || '');
    return this.process(text, context);
  }

  prepareReply(intent, plan, action, context) {
    if (plan.needsFeedback) {
      return plan.explanation;
    }
    
    // If it's a direct send, we might add a signature summary.
    if (intent.type === INTENT_TYPES.MESSAGE_SEND) {
      return `Sending to ${intent.entities.recipient}. I'll tell them: "${intent.entities.content}".`;
    }

    if (intent.type === INTENT_TYPES.UI_CLOSE) {
       return "Closing that for you. Anything else?";
    }

    return "Got it! Working on that.";
  }
}

export const blipEngine = new BlipEngine();
export const createBlipEngine = (options) => new BlipEngine(options);

export { BLIP_STATES, INTENT_TYPES, DECISION_PATH };
