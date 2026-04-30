/**
 * @file StateEngine.js
 * @category Core
 * @description Manages Blip's internal state (mood, focus, activity). 
 * This is the "heartbeat" of Blip's presence.
 */

import { setBlipEmotion, getBlipEmotionState } from '../../services/emotions.js';

export const BLIP_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  PLAYFUL: 'playful',
  FOCUSED: 'focused',
  SLEEPY: 'sleepy',
  PROTECTIVE: 'protective',
  UNCERTAIN: 'uncertain',
  HAPPY: 'happy',
  CALM: 'calm',
};

class BlipStateEngine {
  constructor() {
    this.currentState = BLIP_STATES.IDLE;
    this.context = {
      isHurry: false,
      isUserEmotional: false,
      interactionCount: 0,
      lastInteractionTime: Date.now(),
    };
  }

  /**
   * Transition to a new state and notify the UI (via emotions.js).
   * @param {string} newState - One of BLIP_STATES.
   * @param {Object} contextModifiers - Temporary changes to Blip's behavior.
   */
  setState(newState, contextModifiers = {}) {
    if (typeof newState !== 'string' || !Object.values(BLIP_STATES).includes(newState.toLowerCase())) {
      console.warn(`Attempted invalid state transition: ${newState}`);
      return;
    }

    this.currentState = newState.toLowerCase();
    this.context = { 
      ...this.context, 
      ...contextModifiers, 
      lastInteractionTime: Date.now() 
    };
    this.context.interactionCount++;

    // Sync with visual system (emotions.js)
    if (typeof setBlipEmotion === 'function') {
      setBlipEmotion(this.currentState);
    }

    console.log(`Blip State: [${this.currentState.toUpperCase()}]`, this.context);
    return this.getStateSummary();
  }

  getStateSummary() {
    const emotionState = typeof getBlipEmotionState === 'function' ? getBlipEmotionState(this.currentState) : { pauseBeforeSpeech: 200 };
    return {
      state: this.currentState,
      pacing: this.calculatePacing(emotionState),
      style: this.calculateToneStyle(),
      isHurry: this.context.isHurry,
    };
  }

  /**
   * Determines how fast Blip should speak/act based on state and user tone.
   */
  calculatePacing(emotionState) {
    let basePause = emotionState.pauseBeforeSpeech || 200;
    if (this.context.isHurry) return basePause * 0.5; // Fast response in hurry mode
    if (this.context.isUserEmotional) return basePause * 1.5; // Slower, softer if user is emotional
    return basePause;
  }

  /**
   * Logic for UI behavior (e.g., shorter replies in 'focused' mode).
   */
  calculateToneStyle() {
    if (this.currentState === BLIP_STATES.SLEEPY) return 'soft_slow';
    if (this.currentState === BLIP_STATES.FOCUSED) return 'concise_direct';
    if (this.currentState === BLIP_STATES.PLAYFUL) return 'expressive_enthusiastic';
    if (this.context.isHurry) return 'concise';
    return 'natural';
  }
}

export const stateEngine = new BlipStateEngine();
