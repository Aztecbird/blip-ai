import { BLIP_STATES } from '../types.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createBlipStateEngine(options = {}) {
  const state = {
    mode: BLIP_STATES.IDLE,
    emotionalEnergy: 0.45,
    trustMomentum: 0.6,
    paceScore: 0.5,
    lastUserTone: 'neutral',
    interactionRhythm: [],
    projectorMode: Boolean(options.projectorMode),
    safeMode: 'standard', // standard | elder | child
  };

  function applyEvent(event = {}) {
    const name = String(event.name || '').trim();
    const userTone = String(event.userTone || '').trim().toLowerCase();

    if (name === 'wake') state.mode = BLIP_STATES.LISTENING;
    if (name === 'thinking') state.mode = BLIP_STATES.THINKING;
    if (name === 'speak') state.mode = BLIP_STATES.SPEAKING;
    if (name === 'idle') state.mode = BLIP_STATES.IDLE;
    if (name === 'uncertain') state.mode = BLIP_STATES.UNCERTAIN;

    if (userTone) {
      state.lastUserTone = userTone;
      if (userTone === 'stressed' || userTone === 'sad') {
        state.mode = BLIP_STATES.CALM;
        state.paceScore = clamp(state.paceScore - 0.15, 0, 1);
      } else if (userTone === 'urgent') {
        state.mode = BLIP_STATES.FOCUSED;
        state.paceScore = clamp(state.paceScore + 0.2, 0, 1);
      } else if (userTone === 'playful') {
        state.mode = BLIP_STATES.PLAYFUL;
      }
    }

    const confidence = Number(event.confidence);
    if (Number.isFinite(confidence)) {
      if (confidence < 0.45) state.mode = BLIP_STATES.UNCERTAIN;
      if (confidence >= 0.75) {
        state.trustMomentum = clamp(state.trustMomentum + 0.03, 0, 1);
      } else {
        state.trustMomentum = clamp(state.trustMomentum - 0.02, 0, 1);
      }
    }

    state.interactionRhythm.push({
      atMs: Date.now(),
      mode: state.mode,
      confidence: Number.isFinite(confidence) ? confidence : null,
      userTone: state.lastUserTone,
    });
    if (state.interactionRhythm.length > 30) state.interactionRhythm.shift();
    return getUIPolicy();
  }

  function getUIPolicy() {
    const shortReply = state.mode === BLIP_STATES.FOCUSED || state.lastUserTone === 'urgent';
    const askClarificationSoftly = state.mode === BLIP_STATES.UNCERTAIN || state.safeMode !== 'standard';
    return {
      state: state.mode,
      responseDelayMs: Math.round((1 - state.paceScore) * 500),
      faceAnimationMode: state.mode,
      toneStyle: askClarificationSoftly ? 'gentle' : state.mode === BLIP_STATES.PLAYFUL ? 'bright' : 'calm',
      shortReply,
      askClarificationSoftly,
      projectorMode: state.projectorMode,
      safeMode: state.safeMode,
    };
  }

  function setSafeMode(mode = 'standard') {
    const next = String(mode).toLowerCase();
    if (next === 'elder' || next === 'child' || next === 'standard') {
      state.safeMode = next;
      if (next !== 'standard') state.mode = BLIP_STATES.PROTECTIVE;
    }
  }

  function setProjectorMode(enabled) {
    state.projectorMode = Boolean(enabled);
  }

  function snapshot() {
    return { ...state };
  }

  return {
    applyEvent,
    getUIPolicy,
    setSafeMode,
    setProjectorMode,
    snapshot,
  };
}
