/**
 * @file BehaviorLayer.js
 * @category Logic
 * @description This is Blip's "Originality" logic. It defines how Blip reacts 
 * to messy user commands and high-stress/low-confidence situations.
 */

import { stateEngine, BLIP_STATES } from '../core/StateEngine.js';

export const BlipBehaviors = {
  /**
   * Signature Confirmation Style:
   * Instead of "Are you sure?", Blip says "I'll do that now. I'm telling Natasha about your delay, ok?"
   */
  getConfirmationPhrase(intent, recipient) {
    const { type, entities } = intent;
    if (recipient) {
      return `Ok! I'll tell ${recipient} the message. That sounds right to you?`;
    }
    return `Just making sure before I go ahead... should I ${intent.type.split('.').pop()}?`;
  },

  /**
   * Adaptive Response Logic:
   * When user is in a hurry, stay concise. When user is emotional, slow down.
   */
  getBehavioralPolish(result, state) {
    let text = result.text || "";
    
    // Rule: Elder-care / Child-friendly Mode
    if (state.isElderCareMode) {
      text = text.replace(/re-routing|executing/g, 'let me find that for you');
    }

    // Rule: Emotional Continuity
    // If the user was emotional, add a soft touch at the end.
    if (state.isUserEmotional) {
      text += " I'm right here with you.";
    }

    return text;
  },

  /**
   * Transition Styling:
   * Blip doesn't just open a tool; it explains the move.
   */
  getTransitionEffect(toolName) {
    const transitions = {
      calendar: "Let's see what tomorrow looks like.",
      youtube: "Found the perfect video. Lighting it up!",
      gmail: "Bringing up your letters.",
      telegram: "Opening your chats."
    };
    return transitions[toolName] || "Opening this for you.";
  }
};
