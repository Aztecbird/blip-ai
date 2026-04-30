/**
 * @file OriginalityLayer.js
 * @category Logic
 * @description The "Secret Sauce" logic. 
 * This adds the final personality and continuity to a raw action.
 */

import { stateEngine, BLIP_STATES } from '../core/StateEngine.js';
import { memoryManager } from '../core/MemoryManager.js';

export const OriginalityPolicies = {
  /**
   * Continuity: 
   * The mood should flow naturally from the previous interaction.
   */
  getContinuityState(prevMood, currentMood) {
    // If the user was emotional/sad, we don't jump straight 
    // to "excited" unless it's a celebration.
    if (prevMood === 'sad' && currentMood === 'happy') {
      return BLIP_STATES.CALM; // Transition via "calm"
    }
    return currentMood;
  },

  /**
   * Pacing:
   * "If I made the same mistake twice, slow down and be humble."
   */
  calculateResponsePacing(session) {
    const errorCount = session.history.filter(h => h.key === 'error').length;
    if (errorCount > 1) return 1.5; // Slow down significantly
    return 1.0;
  },

  /**
   * Household Context:
   * "If it's late at night (projector mode usually), be quieter."
   */
  getModeAdjustment(isProjectorActive = false) {
    if (isProjectorActive) {
      return { 
        volume: 0.6, 
        tone: 'whispery', 
        ui: 'minimalist' 
      };
    }
    return { volume: 1.0, tone: 'normal', ui: 'standard' };
  }
};

class BlipOriginalityLayer {
  
  applyPolicies(action, sessionState) {
    // 1. Check for rhythm memory (how fast did we talk last time?)
    const rhythmModifier = OriginalityPolicies.calculateResponsePacing(sessionState);
    
    // 2. Household Awareness (Night time / Projector Mode)
    const modeAdjustment = OriginalityPolicies.getModeAdjustment(sessionState.isProjectorMode);

    // 3. Signature Confirmations
    if (action.confirmation_needed) {
      action.signature_behavior = "Gentle Confirmation: 'I'll do that now.'";
    }

    return {
      ...action,
      rhythmModifier,
      modeAdjustment,
      continuity: OriginalityPolicies.getContinuityState(
        sessionState.lastMood, 
        action.state_effect
      )
    };
  }
}

export const originalityLayer = new BlipOriginalityLayer();
