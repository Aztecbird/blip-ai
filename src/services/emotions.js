/**
 * Supported face emotions. Add new names here and in CSS (.emotion-{name}) to expand.
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
];

export { BLIP_EMOTIONS };

/**
 * Set Blip's face emotion by applying the .emotion-{name} class.
 * Use after AI response or when updating persona. Unknown values fall back to "idle".
 * @param {string} [emotion="idle"] - One of BLIP_EMOTIONS
 */
export function setBlipEmotion(emotion = "idle") {
  const face = document.getElementById("blip-face");
  if (!face) return;

  BLIP_EMOTIONS.forEach((name) => {
    face.classList.remove(`emotion-${name}`);
  });

  const safeEmotion = BLIP_EMOTIONS.includes(emotion) ? emotion : "idle";
  face.classList.add(`emotion-${safeEmotion}`);

  // Sync mini Blip beside big video (if present)
  const mini = document.getElementById("blip-face-mini");
  if (mini) {
    BLIP_EMOTIONS.forEach((name) => mini.classList.remove(`emotion-${name}`));
    mini.classList.add(`emotion-${safeEmotion}`);
  }
}

/**
 * Prepend a random emotion-based prefix to Blip's reply for extra personality.
 * @param {string} text - The reply text
 * @param {string} [emotion] - Current emotion (happy, curious, surprised, thinking, serious, etc.)
 * @returns {string} text with optional prefix
 */
export function addBlipFlavor(text, emotion) {
  const prefixes = {
    happy: ["Nice!", "Oh that's great.", "Love that."],
    curious: ["Hmm…", "Interesting.", "Let me see."],
    surprised: ["Whoa!", "Wait a second!", "Oh wow."],
    thinking: ["Hold on…", "Let me think.", "Okay…"],
    serious: [""],
  };

  const options = prefixes[emotion] || [""];
  const prefix = options[Math.floor(Math.random() * options.length)];

  return prefix ? `${prefix} ${text}` : text;
}

/* Example manual testing */
if (typeof window !== "undefined") {
  window.setBlipEmotion = setBlipEmotion;
  window.demoBlipEmotions = demoBlipEmotions;
}

/* Demo cycle, remove if not needed */
export function demoBlipEmotions() {
  const cycle = [
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
  ];

  let i = 0;
  return setInterval(() => {
    setBlipEmotion(cycle[i]);
    i = (i + 1) % cycle.length;
  }, 1800);
}
