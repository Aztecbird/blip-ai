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
