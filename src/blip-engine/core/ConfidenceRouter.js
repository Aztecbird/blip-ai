/**
 * @file ConfidenceRouter.js
 * @category Core
 * @description The decision processor. Decides if Blip should act, 
 * ask for clarification, or use AI reasoning for a messy command.
 */

import { stateEngine, BLIP_STATES } from './StateEngine.js';

export const DECISION_PATH = {
  DIRECT_EXECUTE: 'direct',
  CONFIRM_THEN_EXECUTE: 'confirm',
  CLARIFY_FOLLOW_UP: 'clarify',
  AI_REASONING: 'reasoning',
  BLOCK_UNSAFE: 'block'
};

class BlipConfidenceRouter {
  constructor() {
    this.highConfidenceThreshold = 0.95;
    this.lowConfidenceThreshold = 0.4;
  }

  /**
   * Route an intent to an execution plan.
   * @param {Object} intent - The interpreted intent object.
   * @param {Object} state - Current Blip State.
   * @returns {Object} plan - { action, confidence, path }
   */
  async route(intent, state = stateEngine.getStateSummary()) {
    const { type, confidence, entities, meta } = intent;

    // 1. If confidence is extremely high and state is "focused" or "hurry", act directly.
    if (confidence >= this.highConfidenceThreshold || (confidence >= 0.8 && state.isHurry)) {
      return this.createPlan(DECISION_PATH.DIRECT_EXECUTE, intent, "Acting directly.");
    }

    // 2. If confidence is high but user is emotional or task is critical (like sending a message), 
    // Blip's "Signature Behavior" is to confirm.
    if (confidence >= 0.8) {
      if (type.startsWith('communication') || state.isUserEmotional) {
        return this.createPlan(DECISION_PATH.CONFIRM_THEN_EXECUTE, intent, 
          "Let me quickly double-check that with you before I do it.");
      }
      return this.createPlan(DECISION_PATH.DIRECT_EXECUTE, intent);
    }

    // 3. If ambiguity detected or confidence is low, ask for clarification.
    if (meta.isAmbiguous || (confidence < 0.8 && confidence >= this.lowConfidenceThreshold)) {
      stateEngine.setState(BLIP_STATES.UNCERTAIN);
      return this.createPlan(DECISION_PATH.CLARIFY_FOLLOW_UP, intent, 
        "I'm not quite sure. Did you want to " + this.getIntentDescription(type) + "?");
    }

    // 4. Default to AI reasoning for anything else.
    stateEngine.setState(BLIP_STATES.THINKING);
    return this.createPlan(DECISION_PATH.AI_REASONING, intent, 
      "That sounds a bit complex. Let me think for a second.");
  }

  createPlan(path, intent, explanation = '') {
    return {
      path,
      intent,
      explanation,
      needsFeedback: [DECISION_PATH.CONFIRM_THEN_EXECUTE, DECISION_PATH.CLARIFY_FOLLOW_UP].includes(path),
      executionReady: [DECISION_PATH.DIRECT_EXECUTE].includes(path)
    };
  }

  getIntentDescription(type) {
    const map = {
      'communication.send': 'send a message',
      'calendar.view': 'open your calendar',
      'notes.create': 'take a new note',
      'timer.create': 'set a timer',
      'fallback.reasoning': 'something special'
    };
    return map[type] || 'something unknown';
  }
}

export const confidenceRouter = new BlipConfidenceRouter();
