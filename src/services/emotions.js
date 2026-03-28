/**
 * Blip emotion system.
 * Keeps the existing face design intact while adding motion, timing, and
 * better emotion normalization for the rest of the app.
 */

const BLIP_EMOTIONS = [
  "idle",
  "happy",
  "sad",
  "angry",
  "curious",
  "surprised",
  "thinking",
  "sleepy",
  "excited",
  "serious",
  "playful",
  "confident",
  "celebrate",
  "despair",
  "affectionate",
  "focused",
  "listening",
];

const EMOTION_ALIASES = {
  cheerful: "happy",
  calm: "serious",
  concerned: "serious",
  gentle: "serious",
  mood: "serious",
  warning: "serious",
  advice: "serious",
  study: "focused",
  focused: "thinking",
  listening: "surprised",
  curious: "curious",
  fascinated: "curious",
  affectionate: "affectionate",
  loving: "affectionate",
  excited: "excited",
  celebrate: "celebrate",
  celebration: "celebrate",
  confident: "confident",
  playful: "playful",
  serious: "serious",
  sleepy: "sleepy",
  tired: "sleepy",
  exhausted: "sleepy",
  sad: "sad",
  despair: "despair",
  upset: "sad",
  angry: "angry",
  mad: "angry",
  confused: "curious",
  surprised: "surprised",
  wow: "surprised",
  happy: "happy",
  idle: "idle",
  thinking: "thinking",
};

const EMOTION_PRESETS = {
  idle: {
    eyeOpen: 0.92,
    browTilt: 0,
    headTilt: 0,
    mouthCurve: 0.04,
    blinkRate: 2800,
    moveAmount: 0.14,
    intensity: 0.32,
    pauseBeforeSpeech: 180,
  },
  happy: {
    eyeOpen: 0.96,
    browTilt: 4,
    headTilt: 6,
    mouthCurve: 0.68,
    blinkRate: 2200,
    moveAmount: 0.32,
    intensity: 0.8,
    pauseBeforeSpeech: 120,
  },
  sad: {
    eyeOpen: 0.85,
    browTilt: -6,
    headTilt: -5,
    mouthCurve: -0.18,
    blinkRate: 2400,
    moveAmount: 0.16,
    intensity: 0.55,
    pauseBeforeSpeech: 220,
  },
  angry: {
    eyeOpen: 0.88,
    browTilt: 10,
    headTilt: -2,
    mouthCurve: -0.22,
    blinkRate: 1700,
    moveAmount: 0.22,
    intensity: 0.74,
    pauseBeforeSpeech: 140,
  },
  curious: {
    eyeOpen: 1,
    browTilt: 10,
    headTilt: 10,
    mouthCurve: 0.14,
    blinkRate: 3200,
    moveAmount: 0.28,
    intensity: 0.72,
    pauseBeforeSpeech: 220,
  },
  surprised: {
    eyeOpen: 1,
    browTilt: 0,
    headTilt: 0,
    mouthCurve: 0.08,
    blinkRate: 1500,
    moveAmount: 0.38,
    intensity: 0.85,
    pauseBeforeSpeech: 90,
  },
  thinking: {
    eyeOpen: 0.9,
    browTilt: -4,
    headTilt: -5,
    mouthCurve: 0,
    blinkRate: 3800,
    moveAmount: 0.12,
    intensity: 0.58,
    pauseBeforeSpeech: 260,
  },
  sleepy: {
    eyeOpen: 0.55,
    browTilt: -2,
    headTilt: -4,
    mouthCurve: 0,
    blinkRate: 1200,
    moveAmount: 0.06,
    intensity: 0.2,
    pauseBeforeSpeech: 320,
  },
  excited: {
    eyeOpen: 1,
    browTilt: 7,
    headTilt: 5,
    mouthCurve: 0.42,
    blinkRate: 1800,
    moveAmount: 0.4,
    intensity: 0.9,
    pauseBeforeSpeech: 100,
  },
  serious: {
    eyeOpen: 0.9,
    browTilt: 0,
    headTilt: 0,
    mouthCurve: 0,
    blinkRate: 4200,
    moveAmount: 0.08,
    intensity: 0.5,
    pauseBeforeSpeech: 220,
  },
  playful: {
    eyeOpen: 0.98,
    browTilt: 6,
    headTilt: 4,
    mouthCurve: 0.34,
    blinkRate: 2500,
    moveAmount: 0.26,
    intensity: 0.78,
    pauseBeforeSpeech: 110,
  },
  confident: {
    eyeOpen: 0.92,
    browTilt: 3,
    headTilt: 2,
    mouthCurve: 0.18,
    blinkRate: 3600,
    moveAmount: 0.1,
    intensity: 0.6,
    pauseBeforeSpeech: 180,
  },
  celebrate: {
    eyeOpen: 1,
    browTilt: 8,
    headTilt: 6,
    mouthCurve: 0.72,
    blinkRate: 1800,
    moveAmount: 0.42,
    intensity: 1,
    pauseBeforeSpeech: 80,
  },
  despair: {
    eyeOpen: 0.72,
    browTilt: -8,
    headTilt: -6,
    mouthCurve: -0.28,
    blinkRate: 1300,
    moveAmount: 0.05,
    intensity: 0.14,
    pauseBeforeSpeech: 360,
  },
  affectionate: {
    eyeOpen: 0.86,
    browTilt: 3,
    headTilt: 5,
    mouthCurve: 0.4,
    blinkRate: 2400,
    moveAmount: 0.14,
    intensity: 0.7,
    pauseBeforeSpeech: 160,
  },
  focused: {
    eyeOpen: 0.89,
    browTilt: 0,
    headTilt: 0,
    mouthCurve: 0,
    blinkRate: 4400,
    moveAmount: 0.06,
    intensity: 0.46,
    pauseBeforeSpeech: 280,
  },
  listening: {
    eyeOpen: 1,
    browTilt: 4,
    headTilt: 4,
    mouthCurve: 0.05,
    blinkRate: 3400,
    moveAmount: 0.1,
    intensity: 0.64,
    pauseBeforeSpeech: 100,
  },
};

const EMOTION_MOTION_CLASS = {
  idle: null,
  happy: "face-anim-bounce",
  sad: "face-anim-float",
  angry: "face-anim-shake",
  curious: "face-anim-sway",
  surprised: "face-anim-blink",
  thinking: "face-anim-nod",
  sleepy: "face-anim-float",
  excited: "face-anim-pulse",
  serious: "face-anim-glow",
  playful: "face-anim-wiggle",
  confident: "face-anim-pulse",
  celebrate: "face-anim-bounce",
  despair: "face-anim-float",
  affectionate: "face-anim-glow",
  focused: "face-anim-glow",
  listening: "face-anim-pulse",
};

const DEFAULT_STATE = {
  emotion: "idle",
  intensity: 0.5,
  eyeOpen: 1,
  browTilt: 0,
  headTilt: 0,
  mouthCurve: 0,
  blinkRate: 2500,
  moveAmount: 0.2,
  pauseBeforeSpeech: 200,
};

let autoResetTimer = null;

function normalizeEmotionName(emotion = "idle") {
  const raw = String(emotion || "idle").trim().toLowerCase();
  if (!raw) return "idle";
  return EMOTION_ALIASES[raw] || (BLIP_EMOTIONS.includes(raw) ? raw : "idle");
}

function getEmotionPreset(emotion = "idle") {
  const safeEmotion = normalizeEmotionName(emotion);
  return EMOTION_PRESETS[safeEmotion] || EMOTION_PRESETS.idle;
}

function getEmotionMotionClass(emotion = "idle") {
  const safeEmotion = normalizeEmotionName(emotion);
  return EMOTION_MOTION_CLASS[safeEmotion] || null;
}

function getEmotionTargets() {
  const face = document.getElementById("blip-face");
  const mini = document.getElementById("blip-face-mini");
  const faceContainer = document.getElementById("face-container");
  const miniContainer = mini?.closest?.("#face-container") || mini?.parentElement || null;
  const stage = document.getElementById("blip-stage");
  return { face, mini, faceContainer, miniContainer, stage };
}

function applyEmotionClassList(el, emotion) {
  if (!el) return;
  BLIP_EMOTIONS.forEach((name) => el.classList.remove(`emotion-${name}`));
  el.classList.add(`emotion-${emotion}`);
}

function syncMotionClass(container, emotion) {
  if (!container) return;
  const previous = container.dataset.blipAutoMotionClass || "";
  if (previous) container.classList.remove(previous);

  const nextClass = getEmotionMotionClass(emotion);
  if (nextClass) {
    container.classList.add(nextClass);
    container.dataset.blipAutoMotionClass = nextClass;
  } else {
    delete container.dataset.blipAutoMotionClass;
  }
}

function applyEmotionState(targets, emotion, preset) {
  const normalized = normalizeEmotionName(emotion);
  const { face, mini, faceContainer, miniContainer, stage } = targets;
  const showcaseActive = Boolean(
    (stage && stage.dataset.emotionShowcase) ||
    (faceContainer && faceContainer.dataset.emotionShowcase) ||
    (miniContainer && miniContainer.dataset.emotionShowcase)
  );

  applyEmotionClassList(face, normalized);
  applyEmotionClassList(mini, normalized);

  if (stage) {
    stage.dataset.emotion = normalized;
  }

  if (faceContainer) {
    faceContainer.dataset.emotion = normalized;
  }

  if (miniContainer && miniContainer !== faceContainer) {
    miniContainer.dataset.emotion = normalized;
  }

  // Keep these values available for future polish without changing the current face design.
  const eyeOpen = Number.isFinite(preset.eyeOpen) ? preset.eyeOpen : DEFAULT_STATE.eyeOpen;
  const browTilt = Number.isFinite(preset.browTilt) ? preset.browTilt : DEFAULT_STATE.browTilt;
  const headTilt = Number.isFinite(preset.headTilt) ? preset.headTilt : DEFAULT_STATE.headTilt;
  const mouthCurve = Number.isFinite(preset.mouthCurve) ? preset.mouthCurve : DEFAULT_STATE.mouthCurve;
  const blinkRate = Number.isFinite(preset.blinkRate) ? preset.blinkRate : DEFAULT_STATE.blinkRate;
  const moveAmount = Number.isFinite(preset.moveAmount) ? preset.moveAmount : DEFAULT_STATE.moveAmount;
  const intensity = Number.isFinite(preset.intensity) ? preset.intensity : DEFAULT_STATE.intensity;
  const pauseBeforeSpeech = Number.isFinite(preset.pauseBeforeSpeech) ? preset.pauseBeforeSpeech : DEFAULT_STATE.pauseBeforeSpeech;

  if (face) {
    face.style.setProperty("--blip-eye-open", String(eyeOpen));
    face.style.setProperty("--blip-brow-tilt", `${browTilt}deg`);
    face.style.setProperty("--blip-head-tilt", `${headTilt}deg`);
    face.style.setProperty("--blip-mouth-curve", String(mouthCurve));
    face.style.setProperty("--blip-blink-rate", `${blinkRate}ms`);
    face.style.setProperty("--blip-move-amount", String(moveAmount));
    face.style.setProperty("--blip-emotion-intensity", String(intensity));
    face.style.setProperty("--blip-pause-before-speech", `${pauseBeforeSpeech}ms`);
  }

  if (mini && mini !== face) {
    mini.style.setProperty("--blip-eye-open", String(eyeOpen));
    mini.style.setProperty("--blip-brow-tilt", `${browTilt}deg`);
    mini.style.setProperty("--blip-head-tilt", `${headTilt}deg`);
    mini.style.setProperty("--blip-mouth-curve", String(mouthCurve));
    mini.style.setProperty("--blip-blink-rate", `${blinkRate}ms`);
    mini.style.setProperty("--blip-move-amount", String(moveAmount));
    mini.style.setProperty("--blip-emotion-intensity", String(intensity));
    mini.style.setProperty("--blip-pause-before-speech", `${pauseBeforeSpeech}ms`);
  }

  if (!showcaseActive) {
    syncMotionClass(faceContainer, normalized);
    if (miniContainer && miniContainer !== faceContainer) {
      syncMotionClass(miniContainer, normalized);
    }
  }

  return {
    emotion: normalized,
    ...DEFAULT_STATE,
    ...preset,
    emotion: normalized,
  };
}

export function getBlipEmotionState(emotion = "idle") {
  const normalized = normalizeEmotionName(emotion);
  const preset = getEmotionPreset(normalized);
  return {
    ...DEFAULT_STATE,
    ...preset,
    emotion: normalized,
  };
}

/**
 * Set Blip's face emotion by applying the .emotion-{name} class and matching
 * the existing face-container motion classes.
 */
export function setBlipEmotion(emotion = "idle", autoResetMs = null) {
  const targets = getEmotionTargets();
  const safeEmotion = normalizeEmotionName(emotion);
  const preset = getEmotionPreset(safeEmotion);
  const state = applyEmotionState(targets, safeEmotion, preset);

  if (autoResetTimer) {
    clearTimeout(autoResetTimer);
    autoResetTimer = null;
  }

  if (Number.isFinite(Number(autoResetMs)) && Number(autoResetMs) > 0) {
    autoResetTimer = setTimeout(() => {
      autoResetTimer = null;
      setBlipEmotion("idle");
    }, Number(autoResetMs));
  }

  return state;
}

/**
 * Lightweight text heuristic for Blip's visual mood.
 * Returns the applied emotion state so callers can reuse it in speech or persona logic.
 */
export function reactToText(text = "") {
  const t = String(text || "").toLowerCase();

  if (/(love|thank|thanks|amazing|awesome|wonderful|great|beautiful|appreciate)/.test(t)) {
    return setBlipEmotion("affectionate", 2000);
  }
  if (/(wow|whoa|surprise|incredible|unbelievable|really\?|!{2,})/.test(t)) {
    return setBlipEmotion("surprised", 1500);
  }
  if (/(why|how|what if|interesting|explain|tell me more|curious|wonder)/.test(t)) {
    return setBlipEmotion("curious", 2500);
  }
  if (/(confused|don't understand|do not understand|unclear|not sure|lost me|huh\??)/.test(t)) {
    return setBlipEmotion("curious", 2200);
  }
  if (/(tired|sleepy|exhausted|need a break|rest|bed|night night)/.test(t)) {
    return setBlipEmotion("sleepy", 3000);
  }
  if (/(angry|annoying|frustrating|furious|upset|mad|hate this)/.test(t)) {
    return setBlipEmotion("angry", 1800);
  }
  if (/(joke|funny|playful|game|let's play|tease|silly)/.test(t)) {
    return setBlipEmotion("playful", 2200);
  }
  if (/(celebrate|congrats|congratulations|yay|win|success|awesome job)/.test(t)) {
    return setBlipEmotion("celebrate", 2200);
  }
  if (/(important|urgent|warning|careful|need to|must|remember to|fix|error|problem|issue)/.test(t)) {
    return setBlipEmotion("serious", 1800);
  }
  if (/(think|consider|maybe|let me think|hmm|analyze|focus|focused)/.test(t)) {
    return setBlipEmotion("thinking", 2400);
  }

  return setBlipEmotion("focused", 1200);
}

export function addBlipFlavor(text, emotion) {
  const normalized = normalizeEmotionName(emotion);
  const prefixes = {
    happy: ["Nice!", "Oh that's great.", "Love that."],
    curious: ["Hmm…", "Interesting.", "Let me see."],
    surprised: ["Whoa!", "Wait a second!", "Oh wow."],
    thinking: ["Hold on…", "Let me think.", "Okay…"],
    serious: [""],
    affectionate: ["Aww.", "That's sweet."],
    playful: ["Hehe.", "Fun."],
  };

  const options = prefixes[normalized] || [""];
  const prefix = options[Math.floor(Math.random() * options.length)];

  return prefix ? `${prefix} ${text}` : text;
}

/* Example manual testing */
if (typeof window !== "undefined") {
  window.setBlipEmotion = setBlipEmotion;
  window.reactToBlipText = reactToText;
  window.demoBlipEmotions = demoBlipEmotions;
}

/* Demo cycle, remove if not needed */
export function demoBlipEmotions() {
  const cycle = [
    "idle",
    "happy",
    "curious",
    "thinking",
    "listening",
    "surprised",
    "sleepy",
    "excited",
    "serious",
    "playful",
    "confident",
    "celebrate",
  ];

  let i = 0;
  return setInterval(() => {
    setBlipEmotion(cycle[i]);
    i = (i + 1) % cycle.length;
  }, 1800);
}
