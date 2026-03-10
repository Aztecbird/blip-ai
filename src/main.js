import './style.css'
import { askOllama, checkOllamaStatus, warmUpModel, cancelCurrentRequest } from './services/ollama'
import { askGemini, generateSpeech } from './services/gemini'
import { speech } from './services/speech'
import { web } from './services/web'
import { interpretIntent, reasoningLoop } from './services/reasoning'
import * as contextAgent from './services/contextAgent.js'
/* Blip face emotions: setBlipEmotion(emotion) applies .emotion-{name} to #blip-face; used in setPersona and after synthesis. */
import { setBlipEmotion, addBlipFlavor } from './services/emotions.js'

// ── DOM ELEMENTS ─────────────────────────────────────────────────────────────
const face = document.getElementById('blip-face');
const faceContainer = document.getElementById('face-container');
const faceFrame = document.querySelector('.face-frame');
const mouth = document.querySelector('#blip-face .mouth');
const talkBtn = document.getElementById('talkBtn');
const transcriptText = document.getElementById('transcript');
const meterLevel = document.getElementById('meter-level');
const meterBox = document.querySelector('.mic-meter');
const chatBtn = document.getElementById('chatBtn');
const chatEntry = document.getElementById('chat-entry');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');

// Hidden Compatibility Elements (V4.3.2 Fix)
const voiceSelect = document.getElementById('voiceSelect');
const kokoroVoiceSelect = document.getElementById('kokoroVoiceSelect');
const geminiVoiceSelect = document.getElementById('geminiVoiceSelect');
const kokoroStatusDot = document.getElementById('kokoro-status');

// Vision Elements
const cameraBtn = document.getElementById('cameraBtn');
const watchBtn = document.getElementById('watchBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const visionPreviewContainer = document.getElementById('vision-preview-container');
const visionPreview = document.getElementById('vision-preview');
const liveIndicator = document.getElementById('live-indicator');
const clearImageBtn = document.getElementById('clear-image-btn');
const webcamVideo = document.getElementById('webcam-video');
const captureCanvas = document.getElementById('capture-canvas');
const cameraControls = document.getElementById('camera-controls');
const snapBtn = document.getElementById('snapBtn');
const stopCameraBtn = document.getElementById('stopCameraBtn');

// Hub Elements
const hubBtn = document.getElementById('hubBtn');
const hubContainer = document.getElementById('hub-container');
const hubMessages = document.getElementById('hub-messages');
const closeHubBtn = document.getElementById('closeHubBtn');
const projectorBtn = document.getElementById('projectorBtn');
const hubInput = document.getElementById('hubInput');
const sendHubBtn = document.getElementById('sendHubBtn');
const saveToHubBtn = document.getElementById('save-to-hub-btn');

const mapContainer = document.getElementById('map-container');
const closeMapBtn = document.getElementById('closeMapBtn');
const mapFrame = document.getElementById('map-frame');

// Chart Elements
const chartContainer = document.getElementById('chart-container');
const closeChartBtn = document.getElementById('closeChartBtn');
const currencyChartCanvas = document.getElementById('currencyChart');
const downloadChartBtn = document.getElementById('downloadChartBtn');

// Settings (Unified)
const gearBtn = document.getElementById('gearBtn');
const underTheHood = document.getElementById('under-the-hood');
const closePanelBtn = document.getElementById('closePanelBtn');
const geminiKeyInput = document.getElementById('geminiKeyInput');
const youtubeKeyInput = document.getElementById('youtubeKeyInput');
const voiceEngineSelect = document.getElementById('voiceEngineSelect');
const browserVoiceSelect = document.getElementById('browserVoiceSelect');
const browserVoiceGroup = document.getElementById('browser-voice-group');
const kokoroHintGroup = document.getElementById('kokoro-hint-group');
const speechVolumeInput = document.getElementById('speechVolumeInput');
const speechVolumeValue = document.getElementById('speechVolumeValue');
const modelSelect = document.getElementById('modelSelect');

// ── APP STATE ────────────────────────────────────────────────────────────────
const isGitHub = window.location.hostname.includes('github.io');

/** Single source of truth for app version — update here (and package.json) when releasing. */
const BLIP_VERSION = '4.3.15';

/** Diamond-style values: guide reasoning (Conclusion + Explanation). Use 1–3 when building prompts. */
const BLIP_VALUES = ['Critical Thinking', 'Compassion', 'Joyful Learning', 'Emotional Intelligence', 'Ethics & Responsibility'];

const EXTRA_SCENERY_OBJECTS = [
    { id: 'flying-ufo', emoji: '🛸', size: '1.4rem', duration: 13, direction: 'reverse' },
    { id: 'little-rocket', emoji: '🚀', size: '1.4rem', duration: 9, direction: 'normal' },
    { id: 'butterfly', emoji: '🦋', size: '1.2rem', duration: 11, direction: 'normal' },
    { id: 'robot-pal', emoji: '🤖', size: '1.2rem', duration: 17, direction: 'reverse' },
    { id: 'satellite', emoji: '🛰️', size: '1.2rem', duration: 24, direction: 'normal' },
    { id: 'comet', emoji: '☄️', size: '1.5rem', duration: 7, direction: 'normal' },
    { id: 'spark-star', emoji: '✨', size: '1.1rem', duration: 6, direction: 'normal' }
];

const SCENERY_BASE_DURATION_MS = 14000;
const SCENERY_EXTRA_PROBABILITY = 0.28;

const FULL_BROWSER_LAYOUT_CSS = `
body {
  align-items: stretch !important;
  min-height: 100dvh !important;
  overflow: hidden !important;
  padding: 0 !important;
}
#app {
  min-height: 100dvh !important;
  padding: 0 !important;
}
.container {
  width: 100vw !important;
  max-width: none !important;
  min-height: 100dvh !important;
  height: 100dvh !important;
  display: grid !important;
  grid-template-rows: auto 1fr auto !important;
  border-radius: 0 !important;
  padding: clamp(0.8rem, 2vw, 2rem) !important;
  justify-content: initial !important;
  gap: clamp(0.5rem, 1.2vh, 1rem) !important;
  box-shadow: 0 20px 60px -20px rgba(0, 0, 0, 0.7), inset 0 0 40px rgba(255, 255, 255, 0.02) !important;
}
#face-area {
  width: min(96vw, 1280px) !important;
  flex: 1 !important;
  justify-content: center !important;
  gap: clamp(0.6rem, 1.5vh, 1.2rem) !important;
  align-self: center !important;
  margin: 0 auto !important;
}
#transcript-area {
  width: min(92vw, 980px) !important;
  margin: 0 auto !important;
}
#interaction-area {
  width: min(94vw, 1040px) !important;
  gap: 0.9rem !important;
  margin: 0 auto 0.3rem !important;
  padding: 0.75rem 0.9rem 0.95rem !important;
  border-radius: 18px !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  background: rgba(2, 6, 23, 0.58) !important;
  backdrop-filter: blur(16px) saturate(150%) !important;
  -webkit-backdrop-filter: blur(16px) saturate(150%) !important;
}
#chat-entry {
  width: 100% !important;
  max-width: 100% !important;
}
.mini-actions {
  opacity: 0.88 !important;
}
.face-frame {
  width: min(92vw, 1160px) !important;
  height: min(62vh, 680px) !important;
  border-radius: 2.2rem !important;
}
#blip-stage {
  min-height: min(64vh, 760px) !important;
}
#blip-face.blip-face {
  width: clamp(280px, 28vw, 430px) !important;
  height: clamp(280px, 28vw, 430px) !important;
}
@media (max-width: 900px) {
  .container {
    grid-template-rows: auto 1fr auto !important;
    padding: 0.6rem 0.5rem 0.7rem !important;
  }
  #face-area {
    width: 100% !important;
  }
  #transcript-area {
    width: 98vw !important;
  }
  .face-frame {
    width: 96vw !important;
    height: min(46vh, 360px) !important;
    border-radius: 1.4rem !important;
  }
  #blip-stage {
    min-height: min(48vh, 460px) !important;
  }
  #blip-face.blip-face {
    width: clamp(220px, 48vw, 320px) !important;
    height: clamp(220px, 48vw, 320px) !important;
  }
  #interaction-area {
    width: 98vw !important;
    gap: 0.7rem !important;
    border-radius: 14px !important;
    padding: 0.55rem 0.5rem 0.7rem !important;
  }
  .mini-actions {
    gap: 1rem !important;
  }
}
`;

const SCENERY_SUPPRESSION_CSS = `
body.scenery-suppressed .scenery-object,
body.scenery-suppressed .cloud {
  opacity: 0 !important;
  animation: none !important;
}
`;

let activeChart = null; // Chart.js instance
let sidePanelChart = null; // Chart.js instance for side panel
/** YouTube IFrame API player instance for the side panel; used to unmute when user says "Blip, unmute". */
let blipYtPlayer = null;

const HISTORY_STORAGE_KEY = 'blip_history';
const HISTORY_MAX = 30;
const HISTORY_PERSIST_MAX = 20;

const state = {
    isActive: false,
    isThinking: false,
    sensitivity: 20,
    selectedVoice: null,
    currentEmotion: 'serious',
    history: [], // Loaded from localStorage in init
    timers: [],
    pendingImage: null, // Base64 string
    cameraStream: null,
    geminiKey: localStorage.getItem('blip_gemini_key') || '',
    youtubeApiKey: localStorage.getItem('blip_youtube_key') || '', // optional: for in-panel video playback (YouTube Data API v3)
    selectedModel: 'gemini-2.5-flash', // Corrected stable model
    voiceEngine: 'gemini',             // Standardized for V3.1.0
    selectedGeminiVoice: 'Kore',       // Standardized for V3.1.0
    speechVolume: Math.min(1, Math.max(0.2, (parseFloat(localStorage.getItem('blip_speech_volume')) || 1))),
    hubItems: JSON.parse(localStorage.getItem('blip_hub')) || [],
    idleBehavior: null, // 'dreamer', 'observer', 'squinter'
    isProjectorMode: false,
    isLiveWatch: false,
    isListening: false,
    liveInterval: null,
    liveFrames: [], // Queue of last 5 frames [{data, mimeType}]
    videoBigMode: false, // When true, side panel is large with mini Blip beside video
    videoCompanionSize: localStorage.getItem('blip_video_companion_size') === 'mini' ? 'mini' : 'big',
    // Working memory: what we just did (so "another graph", "there", "that" make sense)
    lastContext: {
        lastUserQuery: '',
        lastChartTitle: '',
        lastChartData: null, // { labels, data, title, type } for re-showing graph
        lastYoutubeUrl: null,
        lastYoutubeEmbedUrl: null,
        lastYoutubeVideoId: null,
        lastYoutubeSearchResults: null, // [{videoId, title}, ...] for next/skip
        lastYoutubeQuery: null,
        lastYoutubeSearchIndex: 0,
        lastLocation: '',
        lastSearchTopic: '',
        lastIntentActions: []
    }
};
// V4.3.4 - The Deep UI & Animation Restoration

// ── PERSONA CONFIGURATION (V3.4.0) ───────────────────────────────────────────
/** Reusable face animation states: add one to #face-container to run. Nose is included where appropriate. */
const FACE_ANIMATIONS = [
    'face-anim-wiggle', 'face-anim-bounce', 'face-anim-pulse', 'face-anim-blink',
    'face-anim-nod', 'face-anim-shake', 'face-anim-float', 'face-anim-glow',
    'face-anim-sniff', 'face-anim-sway'
];

const PERSONAS = {
    idle: { emoji: "✨", label: "BLIP", color: "#818cf8", emotion: "serious" },
    listening: { emoji: "👂", label: "LISTENING", color: "#f43f5e", emotion: "surprised" },
    thinking: { emoji: "🧠", label: "THINKING", color: "#8b5cf6", emotion: "thinking" },
    happy: { emoji: "😊", label: "HAPPY", color: "#10b981", emotion: "happy" },
    sad: { emoji: "😢", label: "SAD", color: "#64748b", emotion: "sad" },
    despair: { emoji: "😰", label: "DESPAIR", color: "#475569", emotion: "despair" },
    warning: { emoji: "⚠️", label: "ALERT", color: "#f59e0b", emotion: "surprised" },
    sleepy: { emoji: "💤", label: "SLEEPY", color: "#334155", emotion: "sleepy" },
    cooking: { emoji: "👨‍🍳", label: "CHEF MODE", color: "#fb923c", emotion: "gentle" },
    study: { emoji: "📚", label: "STUDY MODE", color: "#3b82f6", emotion: "serious" },
    media: { emoji: "🎬", label: "MEDIA", color: "#ef4444", emotion: "excited" },
    advice: { emoji: "💡", label: "ADVISOR", color: "#eab308", emotion: "gentle" }
};

function injectAppStyle(id, cssText) {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = cssText;
    document.head.appendChild(style);
}

// ── INITIALIZATION ───────────────────────────────────────────────────────────
async function init() {
    try {
        console.log(`🚀 Blip V${BLIP_VERSION} initializing...`);

        // Fill the browser real estate by default.
        injectAppStyle('blip-full-browser-layout', FULL_BROWSER_LAYOUT_CSS);
        injectAppStyle('blip-scenery-suppression', SCENERY_SUPPRESSION_CSS);
        syncScenerySuppression();

        // Version only in upper-right corner; label above face stays "BLIP" (no version)
        const versionTagEl = document.getElementById('version-tag');
        const personaLabelEl = document.getElementById('persona-label');
        if (versionTagEl) versionTagEl.textContent = `V${BLIP_VERSION}`;
        if (personaLabelEl) personaLabelEl.textContent = "BLIP";
        if (PERSONAS.idle) PERSONAS.idle.label = "BLIP";

        // Restore conversation history from last session (better context)
        try {
            const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    state.history = parsed.length > HISTORY_MAX ? parsed.slice(-HISTORY_MAX) : parsed;
                }
            }
        } catch (e) { state.history = []; }

        // Load voices and prefer a nicer-sounding browser voice when using Browser Default
        const voices = await speech.init();
        if (voiceSelect && voices.length) {
            const enVoices = voices.filter((v) => v.lang && v.lang.startsWith('en'));
            voiceSelect.innerHTML = enVoices
                .map((v, i) => `<option value="${i}">${v.name}</option>`)
                .join('');
            state.selectedVoice = speech.getPreferredVoice?.() || enVoices[0] || voices[0];
            const idx = enVoices.indexOf(state.selectedVoice);
            if (idx >= 0 && voiceSelect.options[idx]) voiceSelect.selectedIndex = idx;
            voiceSelect.onchange = (e) => {
                state.selectedVoice = enVoices[parseInt(e.target.value, 10)];
            };
        }
        // Browser voice dropdown in Settings (when Voice = Browser Default)
        if (browserVoiceSelect && speech.voices.length) {
            const enVoicesList = speech.voices.filter((v) => v.lang && v.lang.startsWith('en'));
            browserVoiceSelect.innerHTML = enVoicesList
                .map((v, i) => `<option value="${i}">${v.name}</option>`)
                .join('');
            const preferredIdx = enVoicesList.indexOf(state.selectedVoice || speech.getPreferredVoice?.());
            if (preferredIdx >= 0) browserVoiceSelect.selectedIndex = preferredIdx;
            browserVoiceSelect.onchange = () => {
                state.selectedVoice = enVoicesList[parseInt(browserVoiceSelect.value, 10)];
            };
        }
        if (browserVoiceGroup && voiceEngineSelect) {
            if (voiceEngineSelect.value) state.voiceEngine = voiceEngineSelect.value;
            const updateBrowserVoiceVisibility = () => {
                const engine = voiceEngineSelect.value;
                browserVoiceGroup.style.display = engine === 'web' ? 'block' : 'none';
                if (kokoroHintGroup) kokoroHintGroup.style.display = engine === 'kokoro' ? 'block' : 'none';
            };
            updateBrowserVoiceVisibility();
            voiceEngineSelect.addEventListener('change', () => {
                state.voiceEngine = voiceEngineSelect.value;
                updateBrowserVoiceVisibility();
            });
        }

        // Kokoro voice selector
        if (kokoroVoiceSelect) {
            kokoroVoiceSelect.onchange = (e) => {
                speech.setKokoroVoice(e.target.value);
            };
        }

        // Initialize UI
        geminiKeyInput.value = state.geminiKey;
        if (youtubeKeyInput) youtubeKeyInput.value = state.youtubeApiKey;

        const saveKey = (e) => {
            state.geminiKey = e.target.value.trim();
            localStorage.setItem('blip_gemini_key', state.geminiKey);
            console.log('🔐 Access Key updated');
        };
        const saveYoutubeKey = (e) => {
            if (!youtubeKeyInput) return;
            state.youtubeApiKey = e.target.value.trim();
            localStorage.setItem('blip_youtube_key', state.youtubeApiKey);
            console.log('🔐 YouTube API key updated');
        };

        // Persistence Fix: Listen to multiple events to ensure it saves on mobile
        geminiKeyInput.oninput = saveKey;
        geminiKeyInput.onchange = saveKey;
        geminiKeyInput.onblur = saveKey;
        if (youtubeKeyInput) {
            youtubeKeyInput.oninput = saveYoutubeKey;
            youtubeKeyInput.onchange = saveYoutubeKey;
            youtubeKeyInput.onblur = saveYoutubeKey;
        }

        // Blip volume (20% steps)
        if (speechVolumeInput && speechVolumeValue) {
            const pct = Math.round(state.speechVolume * 100);
            const step = Math.min(100, Math.max(20, Math.round(pct / 5) * 5));
            state.speechVolume = step / 100;
            speechVolumeInput.value = step;
            speechVolumeValue.textContent = step + '%';
            const saveVolume = () => {
                const val = parseInt(speechVolumeInput.value, 10);
                state.speechVolume = val / 100;
                localStorage.setItem('blip_speech_volume', state.speechVolume);
                speechVolumeValue.textContent = val + '%';
            };
            speechVolumeInput.oninput = saveVolume;
            speechVolumeInput.onchange = saveVolume;
        }

        // Standardized Voice Engine Toggles (simplified)
        updateVoiceToggles();

        function updateVoiceToggles() {
            // We now standardize on Gemini, but keep these for internal state consistency
            const kItem = document.getElementById('kokoro-voice-item');
            const gItem = document.getElementById('gemini-voice-item');
            if (kItem) kItem.style.display = 'none';
            if (gItem) gItem.style.display = 'block';
        }

        // Check Kokoro status and update its dot
        updateKokoroStatus();                          // immediate check (async, non-blocking)
        setInterval(updateKokoroStatus, 15000);        // re-check every 15s

        // Randomized Idle Personality (V3.1.0)
        setInterval(() => {
            if (!state.isActive || state.isThinking || speech.isSpeaking) return;

            // Randomly trigger eye scanning
            const eyes = document.querySelectorAll('.eye');
            if (Math.random() > 0.7) {
                eyes.forEach(e => e.classList.add('scanning'));
                setTimeout(() => eyes.forEach(e => e.classList.remove('scanning')), 4000);
            }

            triggerRandomIdle();
        }, 12000);

        // Face blinking
        setInterval(() => {
            if (state.currentEmotion === 'surprised') return;
            const eyes = document.querySelectorAll('.eye');
            eyes.forEach(e => e.style.height = '2px');
            setTimeout(() => {
                eyes.forEach(e => e.style.height = '14px');
            }, 150);
        }, 4000);

        // Add extra orbiting artifacts dynamically so we can expand scenery without touching static markup.
        registerExtraSceneryObjects();

        // Start Living Scenery Systems
        startSceneryTracking();
        startSceneryDirector();

        // Floating Symbols
        setInterval(() => {
            if (!state.isActive) return;

            if (state.isThinking) {
                // Spawn ??? or !!! when thinking
                if (Math.random() > 0.4) spawnSymbol(Math.random() > 0.5 ? 'question' : 'exclamation');
            } else if (!speech.isSpeaking && !state.cameraStream) {
                // Spawn music notes when idle/listening
                if (Math.random() > 0.8) spawnSymbol('music');
            }
        }, 600);

        // Close panels on Esc
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') setMode('core');
        });

        // Initial Mode
        setMode('core');

        talkBtn.onclick = toggleApp;

        // Appliance UI Toggles
        gearBtn.onclick = () => setMode('settings');
        closePanelBtn.onclick = () => setMode('core');

        // Chart Toggles
        if (closeChartBtn) closeChartBtn.onclick = () => setMode('core');
        if (downloadChartBtn) downloadChartBtn.onclick = downloadChart;

        // Scenery Orbit (V4.3.1)

        chatBtn.onclick = () => {
            chatEntry.classList.toggle('hidden');
            if (!chatEntry.classList.contains('hidden')) chatInput.focus();
        };

        sendChatBtn.onclick = postChat;
        chatInput.onkeydown = (e) => { if (e.key === 'Enter') postChat(); };

        renderHub();
    } catch (err) {
        console.error('❌ Critical Initialization Error:', err);
        if (typeof transcriptText !== 'undefined' && transcriptText) {
            transcriptText.innerHTML = `<span style="color:#f43f5e">⚠️ System Error: ${err.message}. Please refresh.</span>`;
        }
    }
}

// ── MODE CONTROLLER (V4.3.0) ─────────────────────────────────────────────────
function setMode(mode) {
    console.log(`🎭 Switching to mode: ${mode}`);
    state.currentMode = mode;

    // Hide all panels first
    const panels = [hubContainer, chartContainer, mapContainer, underTheHood, cameraControls];
    panels.forEach(p => { if (p) p.classList.remove('active'); });

    // Show specific panel based on mode
    switch (mode) {
        case 'hub': hubContainer.classList.add('active'); break;
        case 'chart': chartContainer.classList.add('active'); break;
        case 'map': mapContainer.classList.add('active'); break;
        case 'settings': underTheHood.classList.add('active'); break;
        case 'vision': cameraControls.style.display = 'flex'; break;
        default:
            // Core mode
            if (cameraControls) cameraControls.style.display = 'none';
            stopCamera();
            break;
    }

    // Toggle body class for layout adjustments
    document.body.setAttribute('data-mode', mode);
}

/**
 * Apply BlipContextAgent decision: update face, mode, and response style.
 * Kept lightweight; only applies mode/emotion and reduce_motion.
 */
function applyContextDecision(decision) {
    if (!decision) return;
    const { mode, emotion, action, payload } = decision;
    if (mode && PERSONAS[mode]) setPersona(mode);
    else if (emotion && contextAgent.TONE_TO_PERSONA[emotion]) setPersona(contextAgent.TONE_TO_PERSONA[emotion]);
    if (action === 'reduce_motion' && payload?.reduce) {
        document.body.classList.add('reduce-motion');
    } else if (action !== 'reduce_motion') {
        document.body.classList.remove('reduce-motion');
    }
    if (action === 'switch_mode' && payload?.mode && PERSONAS[payload.mode]) {
        setPersona(payload.mode);
    }
}

/**
 * 📝 Text Communication Handler
 */
async function postChat() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Fix: Initialize audio context on user gesture so cloud voice can play
    if (speech.initAudio) speech.initAudio();

    chatInput.value = '';
    // chatEntry.classList.add('hidden'); // Removed auto-hide so it stays visible while awake

    // Switch to thinking state
    setPersona('thinking');
    transcriptText.innerHTML = `<i style="opacity: 0.7;">💬 ${text}</i>`;

    handleCommand(text);
}

// ── VISION LOGIC ─────────────────────────────────────────────────────────────
async function startCamera() {
    try {
        setEmotion('curious');
        transcriptText.innerText = "Opening my eyes...";

        // Pause listening while camera is open
        speech.stopListening();

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        state.cameraStream = stream;
        webcamVideo.srcObject = stream;
        webcamVideo.style.display = 'block';
        cameraControls.style.display = 'flex';
        cameraBtn.style.display = 'none'; // Hide camera icon while open

        transcriptText.innerText = "I'm looking! Click SNAP when you're ready.";
    } catch (err) {
        console.error("Camera error:", err);
        transcriptText.innerText = "I couldn't open my eyes. Check camera permissions!";
        setEmotion('sad');
        if (state.isActive) startListeningLoop(); // Resume if failed
    }
}

function stopCamera() {
    if (state.cameraStream) {
        state.cameraStream.getTracks().forEach(track => track.stop());
        state.cameraStream = null;
    }
    webcamVideo.style.display = 'none';
    cameraControls.style.display = 'none';
    cameraBtn.style.display = 'block';
    setEmotion('serious');
    transcriptText.innerText = "Camera closed.";

    // Resume listening if Blip is still active
    if (state.isActive && !state.isThinking) startListeningLoop();
}

function capturePhoto() {
    if (!state.cameraStream) return;

    const ctx = captureCanvas.getContext('2d');
    captureCanvas.width = webcamVideo.videoWidth;
    captureCanvas.height = webcamVideo.videoHeight;
    ctx.drawImage(webcamVideo, 0, 0);

    const base64 = captureCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    setPendingImage(base64);

    stopCamera(); // This will also resume listening
    setEmotion('happy');
    transcriptText.innerText = "I got it! Now, what would you like to know about this?";
}

/** Video Brain V3.0.0 */
function toggleLiveWatch() {
    state.isLiveWatch = !state.isLiveWatch;
    watchBtn.classList.toggle('active', state.isLiveWatch);
    liveIndicator.style.display = state.isLiveWatch ? 'block' : 'none';
    visionPreviewContainer.style.display = state.isLiveWatch ? 'block' : (state.pendingImage ? 'block' : 'none');

    if (state.isLiveWatch) {
        setEmotion('curious');
        transcriptText.innerText = "Live Watch ACTIVE. I'm observing everything...";
        // If camera not yet on, start it
        if (!state.cameraStream) startCamera();

        state.liveInterval = setInterval(captureLiveFrame, 1500);
    } else {
        clearInterval(state.liveInterval);
        state.liveFrames = [];
        transcriptText.innerText = "Live Watch stopped.";
        if (state.isActive) startListeningLoop();
    }
}

function captureLiveFrame() {
    if (!state.cameraStream) return;

    const ctx = captureCanvas.getContext('2d');
    captureCanvas.width = 160; // Tiny for performance
    captureCanvas.height = 120;
    ctx.drawImage(webcamVideo, 0, 0, 160, 120);

    const base64 = captureCanvas.toDataURL('image/jpeg', 0.5).split(',')[1];
    state.liveFrames.push({ data: base64, mimeType: 'image/jpeg' });

    if (state.liveFrames.length > 5) state.liveFrames.shift(); // Keep last 5 frames

    // Update preview bubble with latest
    visionPreview.src = `data:image/jpeg;base64,${base64}`;
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const base64 = event.target.result.split(',')[1];
        const mimeType = file.type;

        if (mimeType.startsWith('video/')) {
            state.pendingImage = { data: base64, mimeType };
            // For video preview, we just show a placeholder or first frame if we could, 
            // but for simplicity we'll use a generic icon or keep previous
            visionPreview.src = 'https://cdn-icons-png.flaticon.com/512/1179/1179069.png';
            transcriptText.innerText = "Video clip loaded! Analyzing the movement...";
        } else {
            setPendingImage(base64);
            transcriptText.innerText = "Got the photo! Ask me anything about it.";
        }

        visionPreviewContainer.style.display = 'block';
        setEmotion('happy');
    };
    reader.readAsDataURL(file);
}

function setPendingImage(base64) {
    state.pendingImage = base64;
    visionPreview.src = `data:image/jpeg;base64,${base64}`;
    visionPreviewContainer.style.display = 'block';
}

function clearPendingImage() {
    state.pendingImage = null;
    visionPreviewContainer.style.display = 'none';
    visionPreview.src = '';
    fileInput.value = '';
    transcriptText.innerText = "Image cleared.";
}

// ── CORE LOGIC ───────────────────────────────────────────────────────────────
async function toggleApp() {
    if (state.isThinking) {
        cancelInteraction();
        return;
    }

    state.isActive = !state.isActive;

    if (state.isActive) {
        try {
            // 🎙️ VITAL: Initialize AudioContext on the user gesture
            speech.initAudio();

            setPersona('happy');
            transcriptText.innerText = "Waking up...";

            await speak("Hello! My name is Blip. How can I help you today?");

            setPersona('listening');
            talkBtn.classList.add('active');
            chatEntry.classList.remove('hidden'); // Show chat entry automatically on wake
            startListeningLoop();
        } catch (err) {
            console.error("Wake up error:", err);
            state.isActive = false;
            talkBtn.classList.remove('active');
            chatEntry.classList.add('hidden');
            setPersona('sad');
            transcriptText.innerHTML = `<span style="color:#ef4444">⚠️ ${err.message}. Try again!</span>`;
        }
    } else {
        stopApp();
    }
}

function cancelInteraction() {
    console.log('🛑 Cancelling interaction...');
    cancelCurrentRequest();
    state.isThinking = false;
    state.isActive = true;
    window.speechSynthesis.cancel();
    speech.stopListening();

    talkBtn.classList.add('active');
    setPersona('idle');
    document.body.classList.remove('projecting-visual');
    transcriptText.innerHTML = '<span style="color:#f88">🛑 Interrupted.</span>';
    startListeningLoop();
}

function stopApp() {
    state.isActive = false;
    state.history = [];
    state.lastContext = { lastUserQuery: '', lastChartTitle: '', lastChartData: null, lastYoutubeUrl: null, lastYoutubeEmbedUrl: null, lastYoutubeVideoId: null, lastYoutubeSearchResults: null, lastYoutubeQuery: null, lastYoutubeSearchIndex: 0, lastLocation: '', lastSearchTopic: '', lastIntentActions: [] };
    contextAgent.reset();
    document.body.classList.remove('reduce-motion');
    try { localStorage.removeItem(HISTORY_STORAGE_KEY); } catch (e) { }
    clearPendingImage();
    stopCamera();
    speech.stopListening();
    window.speechSynthesis.cancel();

    talkBtn.classList.remove('active');
    chatEntry.classList.add('hidden'); // Hide chat entry on sleep
    setPersona('idle');
    document.body.classList.remove('projecting-visual');
    transcriptText.innerText = 'Blip is resting.';
}

function startListeningLoop() {
    if (!state.isActive || state.isThinking) return;

    setPersona('listening');
    face.classList.remove('thinking');
    face.classList.add('listening');
    faceFrame?.classList.add('listening-glow');
    talkBtn.classList.remove('thinking');
    talkBtn.classList.add('active', 'listening');
    talkBtn.innerText = 'Ask Blip';

    speech.startListening(
        // On Result
        (result) => {
            if (speech.isSpeaking) {
                stopListening();
                return;
            }
            transcriptText.innerHTML = `<i style="opacity: 0.7;">🎤 ${result.text}</i>`;
            if (result.isFinal) {
                setPersona('thinking');
                handleCommand(result.text);
            }
        },
        // On End
        () => {
            state.isListening = false;
            if (state.isActive && !state.isThinking && !speech.isSpeaking) {
                setTimeout(startListeningLoop, 300);
            }
        },
        // On Error
        (err) => {
            state.isListening = false;
            console.warn('Recognition error:', err);
            if (err.error === 'not-allowed') {
                stopApp();
                transcriptText.innerText = '⚠️ Microphone blocked.';
            }
        }
    );
}

function stopListening() {
    state.isListening = false;
    speech.stopListening();
}

// ── ACTION HANDLERS ──────────────────────────────────────────────────────────
const actionHandlers = {
    weather: async (res, state) => {
        if (!res.tool_params?.location) return { text: res.text };
        const weather = await web.getWeather(res.tool_params.location);
        addToHub('ai', `🌤️ Weather for ${res.tool_params.location}: ${weather.text}`);
        state.history.push({ user: `(System: Weather in ${res.tool_params.location})`, blip: weather.text });
        return { text: `${res.text} ${weather.text}` };
    },

    currency: async (res, state) => {
        if (!res.tool_params?.from) return { text: res.text };
        const exchange = await web.getExchangeRate(res.tool_params.from, res.tool_params.to);
        state.history.push({ user: `(System: Exchange ${res.tool_params.from} to ${res.tool_params.to})`, blip: exchange.text });

        let extraHtml = '';
        const history = await web.getCurrencyHistory(res.tool_params.from, res.tool_params.to);
        if (history && history.labels.length > 0) {
            renderChart(history.labels, history.rates, `${res.tool_params.from} to ${res.tool_params.to}`, 'line');
            extraHtml = `<br><button onclick="document.body.classList.add('projecting-visual'); document.getElementById('chart-container').style.display='block'" class="action-link purple">📈 VIEW GRAPH</button>`;
        }
        return { text: `${res.text} ${exchange.text}`, extraHtml };
    },

    map: async (res, state) => {
        if (!res.tool_params?.query || !res.tool_params?.location) return { text: res.text };
        const query = encodeURIComponent(`${res.tool_params.query} in ${res.tool_params.location}`);
        mapFrame.src = `https://maps.google.com/maps?q=${query}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
        mapContainer.style.display = 'block';
        document.body.classList.add('projecting-visual');

        const searchSummary = await web.getPlaceInfo(res.tool_params.query, res.tool_params.location);

        let extraHtml = `<br>${searchSummary.html || ''}`;
        const mapsUrl = `https://www.google.com/maps/search/${query}`;
        extraHtml += `<br><a href="${mapsUrl}" target="_blank" class="action-link green">🌍 SEARCH ENTIRE AREA IN GOOGLE MAPS</a>`;

        const finalReply = `${res.text} ${searchSummary.text || searchSummary}`;

        addToHub('link', `🌍 Map: ${res.tool_params.query} in ${res.tool_params.location}`, { url: mapsUrl });

        state.history.push({ user: `(System: Map search for ${res.tool_params.query} in ${res.tool_params.location})`, blip: finalReply });
        return { text: finalReply, extraHtml };
    },

    reviews: async (res, state) => {
        if (!res.tool_params?.query || !res.tool_params?.location) return { text: res.text };
        const reviewResult = await web.getPlaceReviews(res.tool_params.query, res.tool_params.location);
        const reviewText = typeof reviewResult === 'string' ? reviewResult : (reviewResult?.text || "I couldn't find reviews right now.");
        const reviewHtml = (reviewResult && typeof reviewResult === 'object' && reviewResult.html) ? `<br>${reviewResult.html}` : '';
        addToHub('ai', `⭐ Reviews for ${res.tool_params.query}: ${reviewText.substring(0, 100)}...`);
        state.history.push({ user: `(System: Fetched reviews for ${res.tool_params.query})`, blip: reviewText });
        document.body.classList.add('projecting-visual');
        return { text: `${res.text} ${reviewText}`.trim(), extraHtml: reviewHtml };
    },

    movies: async (res, state) => {
        if (!res.tool_params?.location) return { text: res.text };
        const moviesText = await web.getMovies(res.tool_params.location);
        addToHub('ai', `🎬 Movies in ${res.tool_params.location}: ${moviesText.substring(0, 100)}...`);
        state.history.push({ user: `(System: Fetched movies for ${res.tool_params.location})`, blip: moviesText });
        document.body.classList.add('projecting-visual');
        return { text: `${res.text} ${moviesText}` };
    },

    products: async (res, state) => {
        if (!res.tool_params?.query) return { text: res.text };
        const recommendations = res.tool_params.recommendations || [];
        const result = await web.getProducts(res.tool_params.query, recommendations);

        if (result.links && result.links.length > 0) {
            result.links.forEach(l => addToHub('link', `🛒 Product: ${l.name}`, { url: l.url }));
        }

        state.history.push({ user: `(System: Products for ${res.tool_params.query})`, blip: result.text });
        document.body.classList.add('projecting-visual');
        return { text: result.text, extraHtml: result.html };
    },

    time: async (res) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return { text: `${res.text} It is currently ${timeStr}.` };
    },

    calendar: async (res) => {
        if (!res.event_details) return { text: res.text };
        const details = res.event_details || {};
        if (!details.start || !details.end) {
            return {
                text: (typeof res.text === 'string' && res.text.trim())
                    ? res.text
                    : "I need a start and end time before I can create a calendar event."
            };
        }
        const url = createGoogleCalendarUrl(details);
        const eventTitle = details.title || details.summary || 'Event';
        addToHub('link', `📅 Calendar Event: ${eventTitle}`, { url });
        return {
            text: (typeof res.text === 'string' && res.text.trim())
                ? res.text
                : `I created a calendar event link for ${eventTitle}.`,
            extraHtml: `<br><a href="${url}" target="_blank" class="action-link blue">📅 ADD TO GOOGLE CALENDAR</a>`
        };
    },

    youtube: async (res) => {
        if (!res.tool_params?.query) return { text: res.text };
        const result = await web.searchYouTube(res.tool_params.query, state.youtubeApiKey);
        state.lastContext.lastYoutubeUrl = result.watchUrl || result.url;
        state.lastContext.lastYoutubeEmbedUrl = result.embedUrl || null;
        state.lastContext.lastYoutubeVideoId = result.videoId || null;
        state.lastContext.lastYoutubeSearchResults = result.searchResults || null;
        state.lastContext.lastYoutubeQuery = res.tool_params.query;
        state.lastContext.lastYoutubeSearchIndex = 0;
        addToHub('link', `🎬 YouTube: ${res.tool_params.query}`, { url: result.watchUrl || result.url });
        document.body.classList.add('projecting-visual');
        return { text: `${res.text} ${result.text}`, extraHtml: `<br>${result.html}` };
    },

    search: async (res) => {
        if (!res.tool_params?.query) return { text: res.text };
        const result = await web.search(res.tool_params.query);
        addToHub('link', `🔍 Search: ${res.tool_params.query}`, { url: `https://www.google.com/search?q=${encodeURIComponent(res.tool_params.query)}` });
        document.body.classList.add('projecting-visual');
        return { text: `${res.text} ${result.text}`, extraHtml: `<br>${result.html}` };
    },

    chart: async (res) => {
        if (!res.tool_params?.labels || !res.tool_params?.data) return { text: res.text };
        const title = res.tool_params.title || 'Data Graph';
        const type = res.tool_params.type || 'bar';

        renderChart(res.tool_params.labels, res.tool_params.data, title, type);

        // Show panel
        chartContainer.style.display = 'block';
        document.body.classList.add('projecting-visual');

        const extraHtml = `<br><button onclick="document.body.classList.add('projecting-visual'); document.getElementById('chart-container').style.display='block'" class="action-link purple">📈 VIEW GRAPH</button>`;
        return { text: res.text, extraHtml };
    },

    timer: async (res) => {
        const ms = Number(res.tool_params?.ms ?? res.value_ms ?? 0);
        const label = String(res.tool_params?.label || 'Timer');
        if (!Number.isFinite(ms) || ms <= 0) return { text: "I can't set a timer for 0 seconds!" };

        setBlipTimer(label, ms);

        const durationText = ms >= 60000
            ? `${Math.round(ms / 60000)} minute${Math.round(ms / 60000) === 1 ? '' : 's'}`
            : `${Math.max(1, Math.round(ms / 1000))} second${Math.max(1, Math.round(ms / 1000)) === 1 ? '' : 's'}`;
        const reply = (typeof res.text === 'string' && res.text.trim())
            ? res.text.trim()
            : `OK! I've set a timer for ${label} for ${durationText}.`;
        return { text: reply };
    },

    list: async (res) => {
        const type = res.tool_params?.type || 'todo';
        const action = res.tool_params?.action || 'view';
        const item = res.tool_params?.item;

        const key = `blip_list_${type}`;
        let list = [];
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || '[]');
            list = Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            list = [];
        }

        if (action === 'add' && item) {
            list.push(item);
            localStorage.setItem(key, JSON.stringify(list));
            return { text: `Added ${item} to your ${type} list.` };
        } else if (action === 'remove' && item) {
            list = list.filter(i => i.toLowerCase() !== item.toLowerCase());
            localStorage.setItem(key, JSON.stringify(list));
            return { text: `Removed ${item} from your ${type} list.` };
        }

        // Default: View
        if (list.length === 0) return { text: `Your ${type} list is currently empty.` };
        const listHtml = list.map(i => `• ${i}`).join('<br>');
        return {
            text: `Here is your ${type} list: ${list.join(', ')}`,
            extraHtml: `<div class="widget-panel" style="margin-top:1rem"><b>📝 ${type.toUpperCase()} LIST</b><br>${listHtml}</div>`
        };
    },

    nutrition: async (res) => {
        const query = res.tool_params?.query || 'food nutrition';
        const result = await web.search(query + " calories macros nutrition facts");
        return { text: result.text };
    }
};

// ── BLIP HUB LOGIC (WHATSAPP STYLE) ─────────────────────────────────────────
function toggleHub() {
    const isVisible = hubContainer.style.display === 'flex';
    hubContainer.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) renderHub();
}

function toggleProjectorMode() {
    state.isProjectorMode = !state.isProjectorMode;
    document.body.classList.toggle('projector-mode', state.isProjectorMode);
    projectorBtn.innerText = state.isProjectorMode ? '📱' : '📽️';
    console.log(`📽️ Projector Mode: ${state.isProjectorMode}`);
}

function addToHub(type, content, data = {}) {
    const item = {
        id: Date.now(),
        type, // 'ai', 'link', 'image', 'user'
        content,
        data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    state.hubItems.unshift(item); // Newest at top
    if (state.hubItems.length > 50) state.hubItems.pop();
    localStorage.setItem('blip_hub', JSON.stringify(state.hubItems));
    renderHub();
}

/** Manual Storage V3.0.0 */
function postManualHub() {
    const text = hubInput.value.trim();
    if (!text) return;

    // Detect if it's a link
    const isLink = text.startsWith('http') || text.startsWith('www');
    const type = isLink ? 'link' : 'user';
    const data = isLink ? { url: text.startsWith('www') ? `https://${text}` : text } : {};

    addToHub(type, text, data);
    hubInput.value = '';
    console.log('✅ Manual item added to Hub');
}

function saveCurrentVisionToHub() {
    if (!state.pendingImage && !state.currentImage) {
        console.warn('No image to save');
        return;
    }
    const img = state.pendingImage || state.currentImage;
    addToHub('image', 'Saved Photo', { url: img });

    // Feedback
    const originalText = saveToHubBtn.innerText;
    saveToHubBtn.innerText = '✅ Saved!';
    setTimeout(() => {
        saveToHubBtn.innerText = originalText;
    }, 2000);
}

function renderHub() {
    if (state.hubItems.length === 0) {
        hubMessages.innerHTML = '<div class="hub-empty">Hub is empty. Save photos or notes here!</div>';
        return;
    }

    hubMessages.innerHTML = state.hubItems.map(item => {
        let body = '';
        if (item.type === 'link') {
            const label = item.content.length > 40 ? '🔗 Open Link' : item.content;
            body = `<a href="${item.data.url}" target="_blank">${label}</a>`;
        } else if (item.type === 'image') {
            body = `<img src="${item.data.url}" alt="Hub Image" onclick="window.open('${item.data.url}')">`;
        } else {
            body = item.content;
        }

        const cls = (item.type === 'user' || item.type === 'link') ? 'user' : 'ai';
        const finalCls = item.type === 'image' ? 'image' : cls;

        return `
            <div class="hub-message ${finalCls}">
                ${body}
                <span class="hub-time">${item.timestamp}</span>
            </div>
        `;
    }).join('');
}

async function handleCommand(text) {
    if (!text.toLowerCase().includes('hey blip') && text.length < 3) return;

    const cmd = text.toLowerCase().includes('hey blip')
        ? text.toLowerCase().split('hey blip')[1].trim()
        : text;

    if (!cmd) return;

    if (isPraise(cmd)) triggerBlipParty();

    state.isThinking = true;
    speech.stopListening();


    talkBtn.innerText = '⏳ THINKING...';
    talkBtn.classList.remove('listening');
    talkBtn.classList.add('thinking');
    faceFrame?.classList.remove('listening-glow');
    document.body.classList.add('thinking-mode');
    setEmotion('curious');
    transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><i>Blip is thinking...</i>`;

    // Visual state: Start Thinking
    face.classList.remove('listening');
    face.classList.add('thinking');

    try {
        const images = state.pendingImage ? [state.pendingImage] : [];
        if (state.isLiveWatch && state.liveFrames.length > 0) images.push(...state.liveFrames);

        // Voice shortcuts: camera controls (open/close/snap) should not depend on model interpretation.
        const cameraCmd = getCameraVoiceCommand(cmd);
        if (cameraCmd) {
            face.classList.remove('thinking');
            let msg = '';
            if (cameraCmd === 'open') {
                if (state.cameraStream) {
                    msg = "Camera is already open.";
                } else {
                    await startCamera();
                    msg = state.cameraStream ? "Camera open. I'm looking now." : "I couldn't open the camera. Check permissions.";
                }
            } else if (cameraCmd === 'close') {
                if (state.cameraStream) {
                    stopCamera();
                    msg = "Camera closed.";
                } else {
                    msg = "Camera is already closed.";
                }
            } else if (cameraCmd === 'snap') {
                if (!state.cameraStream) {
                    msg = "Camera is closed. Say open camera first.";
                } else {
                    capturePhoto();
                    msg = "Photo captured.";
                }
            }
            if (msg) {
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
                state.history.push({ user: cmd, blip: msg });
                if (state.history.length > HISTORY_MAX) state.history.shift();
                try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
                setBlipEmotion('happy');
                setPersona('happy');
                talkBtn.innerText = '🔊 SPEAKING...';
                await speak(msg, 'happy');
                return;
            }
        }

        // Voice shortcuts: YouTube panel controls (unmute, mute, close, pause, play, rewind, next, new video)
        const ytCmd = getYouTubeVoiceCommand(cmd);
        if (ytCmd) {
            face.classList.remove('thinking');
            let msg = '';
            if (ytCmd === 'unmute' && blipYtPlayer) {
                unmuteYouTubePlayer();
                msg = 'Sound on!';
            } else if (ytCmd === 'mute' && blipYtPlayer) {
                muteYouTubePlayer();
                msg = 'Muted.';
            } else if (ytCmd === 'close' || ytCmd === 'new') {
                closeYouTubePanel();
                if (ytCmd === 'new') {
                    state.lastContext.lastYoutubeQuery = null;
                    state.lastContext.lastYoutubeSearchResults = null;
                    state.lastContext.lastYoutubeSearchIndex = 0;
                }
                msg = ytCmd === 'close' ? 'Video closed.' : "Closed. Ask me for a new video whenever you're ready.";
            } else if (ytCmd === 'pause' && blipYtPlayer) {
                pauseYouTubePlayer();
                msg = 'Paused.';
            } else if (ytCmd === 'play' && blipYtPlayer) {
                playYouTubePlayer();
                msg = 'Playing.';
            } else if (ytCmd === 'rewind' && blipYtPlayer) {
                rewindYouTubePlayer();
                msg = 'Rewound 30 seconds.';
            } else if (ytCmd === 'restart' && blipYtPlayer) {
                restartYouTubePlayer();
                msg = 'From the beginning.';
            } else if ((ytCmd === 'blipBig' || ytCmd === 'blipSmall') && document.getElementById('blip-side-panel')?.style.display !== 'none') {
                state.videoCompanionSize = ytCmd === 'blipBig' ? 'big' : 'mini';
                try { localStorage.setItem('blip_video_companion_size', state.videoCompanionSize); } catch (e) { }
                if (ytCmd === 'blipBig' && !state.videoBigMode) setVideoBigMode(true);
                applyVideoCompanionSizing();
                msg = ytCmd === 'blipBig' ? 'Big Blip mode on.' : 'Mini Blip mode on.';
            } else if ((ytCmd === 'videoBig' || ytCmd === 'videoSmall') && document.getElementById('blip-side-panel')?.style.display !== 'none') {
                setVideoBigMode(ytCmd === 'videoBig');
                msg = ytCmd === 'videoBig' ? 'Full view on. Blip moved to the side.' : 'Back to normal view.';
            } else if (ytCmd === 'next' && blipYtPlayer) {
                const ok = nextYouTubeVideo();
                msg = ok ? 'Next video.' : "No other videos in this search. Ask for a new topic.";
            }
            if (msg) {
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
                state.history.push({ user: cmd, blip: msg });
                if (state.history.length > HISTORY_MAX) state.history.shift();
                try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
                setBlipEmotion('happy');
                setPersona('happy');
                talkBtn.innerText = '🔊 SPEAKING...';
                await speak(msg, 'happy');
                return;
            }
        }

        // Voice shortcut: volume control.
        // Priority: active YouTube player volume, then Blip speech volume.
        const volCmd = getVolumeVoiceCommand(cmd);
        if (volCmd) {
            face.classList.remove('thinking');
            let msg = '';
            const lowerCmdForVolume = cmd.toLowerCase();
            const wantsVideoVolume = /\b(video|youtube|yt|sound)\b/.test(lowerCmdForVolume) || state.videoBigMode || !!blipYtPlayer;

            const ytDelta = volCmd === 'down' ? -15 : 10;
            const ytVolume = isSidePanelVisible() ? adjustYouTubeVolume(ytDelta) : null;
            if (ytVolume != null) {
                msg = `YouTube volume ${ytVolume}%.`;
            } else if (wantsVideoVolume) {
                msg = "I couldn't change YouTube volume right now. Make sure the video is playing in Blip's panel.";
            } else {
                if (volCmd === 'down') state.speechVolume = Math.max(0.2, state.speechVolume - 0.25);
                else state.speechVolume = Math.min(1, state.speechVolume + 0.05);
                state.speechVolume = Math.round(state.speechVolume * 100) / 100;
                if (speechVolumeInput) speechVolumeInput.value = Math.round(state.speechVolume * 100);
                if (speechVolumeValue) speechVolumeValue.textContent = Math.round(state.speechVolume * 100) + '%';
                try { localStorage.setItem('blip_speech_volume', String(state.speechVolume)); } catch (e) { }
                msg = `Volume ${Math.round(state.speechVolume * 100)}%.`;
            }

            transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
            state.history.push({ user: cmd, blip: msg });
            if (state.history.length > HISTORY_MAX) state.history.shift();
            try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
            setBlipEmotion('happy');
            setPersona('happy');
            talkBtn.innerText = '🔊 SPEAKING...';
            await speak(msg, 'happy');
            return;
        }

        // Voice shortcut: "show me the video" / "play the video" → open last YouTube without clicking
        if (wantsToSeeLastVideo(cmd) && state.lastContext.lastYoutubeUrl) {
            face.classList.remove('thinking');
            window.open(state.lastContext.lastYoutubeUrl, '_blank');
            const msg = "Opening the video for you again!";
            transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
            state.history.push({ user: cmd, blip: msg });
            if (state.history.length > HISTORY_MAX) state.history.shift();
            try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
            setBlipEmotion('happy');
            setPersona('happy');
            talkBtn.innerText = '🔊 SPEAKING...';
            await speak(msg, 'happy');
            return;
        }

        // Optional: keyword-based reasoning loop for audience/demographic/behavior/market questions
        const lowerInput = (cmd || "").toLowerCase();
        const useReasoningLoop =
            lowerInput.includes("audience") ||
            lowerInput.includes("demographic") ||
            lowerInput.includes("behavior") ||
            lowerInput.includes("market") ||
            lowerInput.includes("customer") ||
            lowerInput.includes("who buys") ||
            lowerInput.includes("who listens") ||
            lowerInput.includes("profile");

        if (useReasoningLoop) {
            try {
                setPersona("thinking");
                face.classList.add("thinking");

                const answer = await reasoningLoop(cmd, state.geminiKey);

                face.classList.remove("thinking");
                setPersona("happy");

                const displayText = typeof answer === "string" ? answer : (answer?.text || JSON.stringify(answer, null, 2));
                const extraHtml = `<br><a href="https://www.google.com/search?q=${encodeURIComponent(cmd)}" target="_blank" class="action-link blue">🔍 SEARCH ON GOOGLE</a>`;
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${displayText}${extraHtml}`;
                state.lastContext.lastUserQuery = cmd;
                state.lastContext.lastSearchTopic = cmd;
                state.history.push({ user: cmd, blip: displayText });
                if (state.history.length > HISTORY_MAX) state.history.shift();
                try {
                    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX)));
                } catch (e) { /* quota or private */ }

                spawnSymbol("brain");
                if (state.pendingImage) clearPendingImage();

                talkBtn.innerText = "🔊 SPEAKING...";
                await speak(displayText, "happy");
                return;
            } catch (err) {
                console.error("Reasoning loop failed:", err);
                face.classList.remove("thinking");
                setPersona("sad");
                const errorMsg = "I hit a snag during the reasoning loop.";
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><span style="color:#ef4444">⚠️ ${errorMsg}</span>`;
                talkBtn.innerText = "🔊 SPEAKING...";
                await speak(errorMsg, "sad");
                return;
            }
        }

        // --- STEP 1: INTERPRET INTENT (Context Aware) ---
        console.log("🧠 Step 1: Interpret Intent");
        const contextBlock = getContextBlock();
        const intentPrompt = `${contextBlock}You are the Intent Interpreter.
Analyze the user's latest request: "${cmd}".
Use the context above and conversation history so that "another graph", "that place", "same" etc. refer to the last topic (e.g. same city, same chart subject).

Return a simple JSON object: {
  "actions": ["search", "youtube", "map", "chart", "chat", "none"],
  "query": "optimized search query — if user said 'another graph' or 'same' use the last search topic; if they said 'there' use last location (leave empty for casual chat)",
  "entities": ["entity1", "entity2"]
}`;

        const intentResponse = await askGemini(intentPrompt, state.history, [], state.geminiKey, state.selectedModel);
        let intent = extractJSON(intentResponse.rawResponse) || { actions: [intentResponse.action || 'chat'], query: cmd, entities: [] };
        const fallbackIntentAction = intent.action || intentResponse.action || 'chat';
        if (Array.isArray(intent.actions)) {
            intent.actions = intent.actions;
        } else if (typeof intent.actions === 'string') {
            intent.actions = [intent.actions];
        } else {
            intent.actions = [fallbackIntentAction];
        }
        intent.actions = intent.actions
            .map((a) => String(a || '').toLowerCase().trim())
            .filter(Boolean);
        intent.actions = [...new Set(intent.actions)];
        if (intent.actions.length === 0) intent.actions = ['chat'];
        if (typeof intent.query !== 'string' || !intent.query.trim()) intent.query = cmd;
        if (!Array.isArray(intent.entities)) intent.entities = [];
        intent.entities = intent.entities
            .map((e) => String(e || '').trim())
            .filter(Boolean);

        const lowerCmd = cmd.toLowerCase();
        const isLookForIt = /\b(look for it|search for it|find it|get it|look it up|go find|go look|just search|then search)\b/i.test(cmd);
        if (isLookForIt && state.lastContext.lastSearchTopic) {
            intent.query = state.lastContext.lastSearchTopic;
            intent.entities = state.lastContext.lastSearchTopic.split(/\s+/).filter(w => w.length > 2).slice(0, 3);
            if (!intent.actions.includes('search')) intent.actions = ['search', ...intent.actions];
        }

        // --- STEP 2: DEEP RESEARCH ---
        console.log("📡 Step 2: Researching", intent);
        let evidence = "";
        let extraHtml = '';

        // Optimization: Skip research for pure chat/none or extremely short inputs (unless "look for it")
        const isPureChat = !isLookForIt && intent.actions.every(a => a === 'chat' || a === 'none' || a === 'time');
        const wantsChart = intent.actions.includes('chart') || lowerCmd.includes('graph') || lowerCmd.includes('chart');
        const wantsPopulation = lowerCmd.includes('population') || lowerCmd.includes('demographic') || lowerCmd.includes('men') || lowerCmd.includes('women') || lowerCmd.includes('male') || lowerCmd.includes('female');
        const hasNumbers = /\d/.test(cmd);
        const isLocalNumericChart = wantsChart && hasNumbers && !wantsPopulation;

        if (!isPureChat && cmd.length > 2 && !isLocalNumericChart) {
            for (const action of intent.actions) {
                console.log(`🔍 Executing Action: ${action}`);

                // 1. Demographic / population / chart-with-numbers: always run research (or when "look for it" and last topic was population)
                const lastTopic = state.lastContext.lastSearchTopic || '';
                const lastTopicWantsData = /population|demographic|men|women|stat|graph|chart/i.test(lastTopic);
                const runDataResearch = wantsPopulation || (wantsChart && (lowerCmd.includes('population') || lowerCmd.includes('men') || lowerCmd.includes('women') || lowerCmd.includes('demographic') || lowerCmd.includes('stat') || lowerCmd.includes('data'))) || (isLookForIt && lastTopicWantsData);
                if (runDataResearch) {
                    const research = await web.deepDemographicSearch(intent.query || cmd, intent.entities || [], state.geminiKey);
                    evidence += (research?.text != null ? String(research.text) : '') + "\n";
                    const searchQuery = (intent.query || cmd).replace(/\b(graph|chart|make me a)\b/gi, '').trim() || intent.query || cmd;
                    const standardResult = await actionHandlers.search({ tool_params: { query: searchQuery } }, state);
                    evidence += (standardResult?.text || '') + "\n";
                    if (standardResult?.extraHtml && !extraHtml.includes(standardResult.extraHtml)) extraHtml += standardResult.extraHtml;
                }
                // 2. Action Handlers (skip chart handler here; synthesis will produce chart from evidence)
                else if (actionHandlers[action] && action !== 'chart') {
                    const result = await actionHandlers[action]({ tool_params: { ...intent, query: intent.query || cmd } }, state);
                    if (result) {
                        evidence += (result.text || "") + "\n";
                        if (result.extraHtml && !extraHtml.includes(result.extraHtml)) {
                            extraHtml += result.extraHtml;
                        }
                    }
                }
                // 3. Fallback: Search / Research (e.g. chart without demographic keywords still gets search)
                else if (action === 'search' || action === 'chart') {
                    const research = await web.search(intent.query || cmd, intent.entities || []);
                    evidence += (research?.text != null ? String(research.text) : '') + "\n";
                    if (research.html && !extraHtml.includes(research.html)) {
                        extraHtml += research.html;
                    }
                }
            }
        }

        // For local numeric charts (e.g. "10 apples and 30 pears"), let the evidence just be the user's request.
        if (!evidence && isLocalNumericChart) {
            evidence = cmd;
        } else if (!evidence && !isPureChat) {
            evidence = "No special data found.";
        }

        // --- STEP 3: SYNTHESIZE ANSWER ---
        console.log("✍️ Step 3: Synthesizing Final Answer");
        const synthesisContextBlock = getContextBlock();
        const valuesLine = BLIP_VALUES.slice(0, 3).join(', ');
        const synthesisPrompt = `${synthesisContextBlock}You are Blip.
User Request: "${cmd}"

Research Evidence (this is what you found — bring it into your answer):
"""
${evidence.substring(0, 4000)}
"""

Guide your reply by these values when relevant: ${valuesLine}. Be clear and kind.

TASK: Reply with a short CONCLUSION (main answer with the key facts) and optionally an EXPLANATION (1–2 sentences). Bring the information into the main answer. When the app shows a link below (map, search, etc.), you may say so (e.g. "I've put a link below") — never say you cannot give links; the app does show links.

Return JSON: { "conclusion": "Short main answer with facts/numbers.", "explanation": "Optional 1–2 sentences.", "chart": { ... } only if user asked for a graph and you have numbers. }

RULES:
1. "conclusion" must contain the concrete information (numbers, names, facts) from the evidence. Example: "Valencia has about 800,000 people; roughly 52% women and 48% men."
2. "explanation" can add context or source in one line (optional).
3. CHARTS: If user asked for a graph and evidence has numbers, add "chart": { "title": "...", "labels": ["Women","Men"], "data": [52, 48], "type": "bar" or "pie" }.
4. If evidence is unrelated, reply naturally — and for simple factual questions (e.g. "capital of X", "when did Y", basic geography or history), you may answer from general knowledge; do not say you don't have that information.
5. NEVER say you don't have the information when the Research Evidence above contains relevant data. If the user said "look for it" or "find it", the system has already run a search — use the evidence. PERSONA: Punchy, expressive, digital.`;

        const synthesisResponse = await askGemini(synthesisPrompt, state.history, images, state.geminiKey, state.selectedModel);
        setBlipEmotion(synthesisResponse.emotion);
        const synthData = extractJSON(synthesisResponse.rawResponse);
        const conclusion = synthData?.conclusion || synthData?.text;
        const conclusionWithFlavor = addBlipFlavor(conclusion || '', synthesisResponse.emotion);
        const explanation = synthData?.explanation || '';
        let finalReply = conclusionWithFlavor || synthesisResponse.text;
        const finalReplyPlain = finalReply + (explanation && typeof explanation === 'string' && explanation.trim() ? ' ' + explanation.trim() : '');
        if (explanation && typeof explanation === 'string' && explanation.trim()) {
            finalReply = finalReply + '\n<span class="blip-explanation">' + escapeHtml(explanation.trim()) + '</span>';
        }

        // Auto-Chart Rendering: from model or fallback from evidence (V4.3.12)
        let chartData = synthData?.chart || extractJSON(synthesisResponse.text);
        if (!chartData && wantsChart && evidence && !evidence.includes('No special data found')) {
            chartData = tryBuildChartFromEvidence(evidence, cmd);
            if (chartData) console.log("📈 Fallback chart from evidence:", chartData.title);
        }
        // Re-show last graph when user says they don't see it / show it again
        if (!chartData && state.lastContext.lastChartData && wantsToSeeLastGraph(cmd)) {
            chartData = state.lastContext.lastChartData;
            console.log("📈 Re-showing last chart in side panel:", chartData.title);
        }
        if (chartData && chartData.labels && chartData.data) {
            console.log("📈 Auto-Rendering Chart:", chartData.title);
            setPersona('despair');
            face.classList.add('despair');
            document.body.classList.add('projecting-visual');
            setMode('chart');
            chartContainer.classList.add('reveal');
            renderChart(chartData.labels, chartData.data, chartData.title || 'Data Graph', chartData.type || 'bar');
            if (!extraHtml.includes("VIEW GRAPH")) {
                extraHtml += `<br><button onclick="setMode('chart')" class="action-link purple">📈 VIEW GRAPH</button>`;
            }
            setTimeout(() => {
                setPersona('happy');
                face.classList.remove('despair');
            }, 600);
            setTimeout(() => chartContainer.classList.remove('reveal'), 700);
        }

        // Specialized Map Rendering
        let mapQueryUsed = null;
        if (intent.actions.includes('map') && intent.query) {
            setMode('map');
            mapQueryUsed = intent.query && intent.location ? `${intent.query} in ${intent.location}` : intent.query;
            mapFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(mapQueryUsed)}&output=embed`;
            document.body.classList.add('projecting-visual');
            extraHtml += `<br><button onclick="setMode('map')" class="action-link blue">📍 VIEW MAP</button>`;
        }

        // Update working memory so next turn has context (another graph, that place, etc.)
        state.lastContext.lastUserQuery = cmd;
        state.lastContext.lastChartTitle = (chartData && chartData.title) ? chartData.title : (state.lastContext.lastChartTitle || '');
        if (chartData && chartData.labels && chartData.data) {
            state.lastContext.lastChartData = { labels: chartData.labels, data: chartData.data, title: chartData.title || '', type: chartData.type || 'bar' };
        }
        state.lastContext.lastLocation = mapQueryUsed || state.lastContext.lastLocation || '';
        state.lastContext.lastSearchTopic = intent.query || cmd;
        state.lastContext.lastIntentActions = intent.actions || [];

        // Bring findings into main UI: show a short snippet of what was found (not only the link)
        const hasRealEvidence = evidence && evidence.trim() && !evidence.includes('No special data found');
        const findingsSnippet = hasRealEvidence
            ? evidence.replace(/\s+/g, ' ').trim().slice(0, 420).replace(/\s+\S*$/, '') + (evidence.length > 420 ? '…' : '')
            : '';
        const safeSnippet = (findingsSnippet && findingsSnippet !== 'undefined' && !/^undefined\s*$/i.test(findingsSnippet.trim())) ? findingsSnippet : '';
        const findingsBlock = safeSnippet
            ? `<div class="blip-findings" aria-label="What I found">📋 <strong>What I found:</strong> ${escapeHtml(safeSnippet)}</div>`
            : '';

        // Render transcript (answer + findings in main UI + link as extra)
        transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${finalReply}${findingsBlock}${extraHtml}`;

        // Side panel: show chart, youtube, or calendar when relevant
        if (chartData && chartData.labels && chartData.data) {
            renderActionInSidePanel({ action: 'chart', tool_params: chartData, text: finalReplyPlain });
        } else if (intent.actions && intent.actions.includes('youtube')) {
            const ytUrl = state.lastContext.lastYoutubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(intent.query || cmd)}`;
            const embedUrl = state.lastContext.lastYoutubeEmbedUrl || null;
            const videoId = state.lastContext.lastYoutubeVideoId || null;
            const searchResults = state.lastContext.lastYoutubeSearchResults || null;
            try { window.open(ytUrl, '_blank'); } catch (e) { /* popup blocked */ }
            renderActionInSidePanel({ action: 'youtube', tool_params: { query: intent.query || cmd, url: ytUrl, embedUrl, videoId, searchResults }, text: finalReplyPlain });
        } else if (intent.actions && intent.actions.includes('calendar')) {
            renderActionInSidePanel({ action: 'calendar', tool_params: { title: intent.query || 'Event', time: 'now' }, text: finalReplyPlain });
        }

        // Add to history and persist for next session (plain text for history/TTS)
        state.history.push({ user: cmd, blip: finalReplyPlain });
        if (state.history.length > HISTORY_MAX) state.history.shift();
        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX)));
        } catch (e) { /* quota or private */ }

        // BlipContextAgent: observe real signals, decide mode/tone/action, apply
        contextAgent.observe({
            voiceTranscript: cmd,
            lastBlipReply: finalReplyPlain,
            hasCameraImage: !!state.pendingImage,
            isLiveWatch: state.isLiveWatch,
            timers: state.timers,
            screenMode: state.currentMode,
            recentQuestions: state.history
        });
        const decision = contextAgent.decide();
        applyContextDecision(decision);

        // Ensure face is visible and shows response emotion after answering (avoid stuck despair/thinking)
        face.classList.remove('thinking', 'despair');
        setBlipEmotion(synthesisResponse.emotion);
        setEmotion(synthesisResponse.emotion);

        // Visual Reactions
        spawnSymbol('brain');

        // Clear image
        if (state.pendingImage) clearPendingImage();

        // Fix: Auto-open results if the user asks to "show results" or "open google"
        if (cmd.toLowerCase().includes('show results') || cmd.toLowerCase().includes('open google') || cmd.toLowerCase().includes('search on google')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = extraHtml;
            const firstLink = tempDiv.querySelector('a')?.href;
            if (firstLink) {
                console.log('🚀 Auto-opening search result:', firstLink);
                window.open(firstLink, '_blank');
            }
        }

        talkBtn.innerText = '🔊 SPEAKING...';
        await speak(finalReplyPlain, 'serious');
    } catch (error) {
        face.classList.remove('thinking');
        console.error('AI Error:', error);
        let errorMsg = "I'm sorry, I'm having trouble connecting to my brain.";

        // Handle specific "model not found" errors
        if (state.selectedModel.startsWith('gemini')) {
            errorMsg = `Gemini Brain Error: ${error.message}`;
        } else if (error.message.includes('not found') || error.message.includes('pull') || error.message.includes('llava')) {
            errorMsg = "I can't see yet because my vision model is still downloading! Please wait a moment.";
        } else if (error.message.includes('timed out')) {
            errorMsg = "Ollama is taking too long to think. Please try again.";
        } else if (error.message.includes('Failed to fetch')) {
            errorMsg = "I can't reach Ollama. Check if it's running with CORS.";
        }

        transcriptText.innerHTML = `<span style="color:#ef4444">⚠️ ${error.message}</span>`;
        await speak(errorMsg, "sad");
    } finally {
        state.isThinking = false;
        document.body.classList.remove('thinking-mode');
        if (state.isActive) startListeningLoop();
    }
}

// ── UTILITIES ───────────────────────────────────────────────────────────────
function escapeHtml(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Try to build chart { labels, data, title, type } from evidence text when the model didn't return a chart.
 * Looks for percentages (e.g. 51% women, 49% men), "X Million (Y%)", or two numbers near "women"/"men".
 */
function tryBuildChartFromEvidence(evidence, userQuery = '') {
    if (!evidence || typeof evidence !== 'string') return null;
    const text = evidence.replace(/\s+/g, ' ');
    const lower = text.toLowerCase();
    const title = userQuery.slice(0, 50) || 'From research';

    // Percentages: e.g. "51% women" / "49% men" or "women 51%" / "men 49%"
    const pctWomen = text.match(/(?:women|female|femenin[oa])\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*%\s*(?:women|female)/i);
    const pctMen = text.match(/(?:men|male|masculin[oa])\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*%\s*(?:men|male)/i);
    const n1 = pctWomen ? parseFloat(pctWomen[1] || pctWomen[2]) : null;
    const n2 = pctMen ? parseFloat(pctMen[1] || pctMen[2]) : null;
    if (n1 != null && n2 != null && n1 + n2 >= 95 && n1 + n2 <= 105) {
        return { labels: ['Women', 'Men'], data: [n1, n2], title, type: 'pie' };
    }
    if (n1 != null && n2 != null) {
        return { labels: ['Women', 'Men'], data: [n1, n2], title, type: 'bar' };
    }

    // Two numbers in "X Million (Y%)" or "X.Y Million" pattern
    const millions = text.match(/(\d+(?:\.\d+)?)\s*[Mm]illion\s*\(?\s*(\d+(?:\.\d+)?)\s*%?\)?/g);
    if (millions && millions.length >= 2) {
        const nums = millions.slice(0, 2).map(s => {
            const m = s.match(/(\d+(?:\.\d+)?)/);
            return m ? parseFloat(m[1]) : 0;
        });
        if (nums[0] > 0 && nums[1] > 0) {
            return { labels: ['Women', 'Men'], data: nums, title, type: 'bar' };
        }
    }

    // Any two numbers that look like a split (e.g. 51 and 49, 24.9 and 23.9)
    const pairs = text.match(/(\d+(?:\.\d+)?)\s*(?:%|million|M)/gi);
    if (pairs && pairs.length >= 2) {
        const a = parseFloat(pairs[0]);
        const b = parseFloat(pairs[1]);
        if (!isNaN(a) && !isNaN(b) && a > 0 && b > 0 && (lower.includes('women') || lower.includes('men') || lower.includes('female') || lower.includes('male'))) {
            return { labels: ['Category A', 'Category B'], data: [a, b], title, type: 'bar' };
        }
    }
    return null;
}

/** True when the user wants to unmute the YouTube panel video (e.g. "unmute", "Blip unmute", "turn on sound"). */
function wantsUnmuteVideo(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = cmd.toLowerCase().trim();
    return /\bunmute\b/.test(lower) ||
        /\bturn\s+on\s+(the\s+)?sound\b/.test(lower) ||
        /\b(enable|turn\s+on)\s+audio\b/.test(lower) ||
        /\b(with\s+)?sound\s+on\b/.test(lower) ||
        /^(ok|yes|play)\s*$/.test(lower);
}

/** Unmute the current YouTube panel player via IFrame API. */
function unmuteYouTubePlayer() {
    if (!blipYtPlayer || typeof blipYtPlayer.unMute !== 'function') return;
    try {
        blipYtPlayer.unMute();
        blipYtPlayer.setVolume(100);
    } catch (e) {
        console.warn('YouTube unmute failed:', e.message);
    }
}

/** Mute the current YouTube panel player. */
function muteYouTubePlayer() {
    if (!blipYtPlayer || typeof blipYtPlayer.mute !== 'function') return;
    try { blipYtPlayer.mute(); } catch (e) { console.warn('YouTube mute failed:', e.message); }
}

/** Close the YouTube side panel and destroy the player. */
function closeYouTubePanel() {
    const sidePanel = document.getElementById('blip-side-panel');
    if (sidePanel) sidePanel.style.display = 'none';
    if (blipYtPlayer && typeof blipYtPlayer.destroy === 'function') {
        try { blipYtPlayer.destroy(); } catch (e) {}
        blipYtPlayer = null;
    }
    state.videoBigMode = false;
    syncScenerySuppression();
}

/** YT.PlayerState: unstarted=-1, ended=0, playing=1, paused=2, buffering=3, cued=5 */
function getYouTubePlayerState() {
    if (!blipYtPlayer || typeof blipYtPlayer.getPlayerState !== 'function') return -1;
    try { return blipYtPlayer.getPlayerState(); } catch (e) { return -1; }
}

/** Pause the current YouTube panel player (only when actually playing to avoid glitches). */
function pauseYouTubePlayer() {
    if (!blipYtPlayer || typeof blipYtPlayer.pauseVideo !== 'function') return;
    if (getYouTubePlayerState() !== 1) return; // 1 = playing
    try { blipYtPlayer.pauseVideo(); } catch (e) { console.warn('YouTube pause failed:', e.message); }
}

/** Play the current YouTube panel player (after pause). */
function playYouTubePlayer() {
    if (!blipYtPlayer || typeof blipYtPlayer.playVideo !== 'function') return;
    try { blipYtPlayer.playVideo(); } catch (e) { console.warn('YouTube play failed:', e.message); }
}

/** Rewind the current video (back 30 seconds). */
function rewindYouTubePlayer() {
    if (!blipYtPlayer || typeof blipYtPlayer.getCurrentTime !== 'function') return;
    try {
        const t = blipYtPlayer.getCurrentTime();
        blipYtPlayer.seekTo(Math.max(0, t - 30), true);
    } catch (e) { console.warn('YouTube rewind failed:', e.message); }
}

/** Restart the current video from the beginning (seek to 0 then play to avoid stuck-pause glitch). */
function restartYouTubePlayer() {
    if (!blipYtPlayer || typeof blipYtPlayer.seekTo !== 'function') return;
    try {
        blipYtPlayer.seekTo(0, true);
        setTimeout(() => {
            if (blipYtPlayer && typeof blipYtPlayer.playVideo === 'function') blipYtPlayer.playVideo();
        }, 80);
    } catch (e) { console.warn('YouTube restart failed:', e.message); }
}

/** True when side panel is visible and can host YouTube controls. */
function isSidePanelVisible() {
    const sidePanel = document.getElementById('blip-side-panel');
    return !!sidePanel && sidePanel.style.display !== 'none';
}

/** Adjust YouTube player volume by delta points (0-100). Returns updated value, or null if unavailable. */
function adjustYouTubeVolume(delta) {
    if (!blipYtPlayer || typeof blipYtPlayer.getVolume !== 'function' || typeof blipYtPlayer.setVolume !== 'function') return null;
    try {
        const current = Number(blipYtPlayer.getVolume());
        const safeCurrent = Number.isFinite(current) ? current : 100;
        const next = Math.max(0, Math.min(100, safeCurrent + delta));
        blipYtPlayer.setVolume(next);
        if (typeof blipYtPlayer.unMute === 'function') blipYtPlayer.unMute();
        return Math.round(next);
    } catch (e) {
        console.warn('YouTube volume change failed:', e.message);
        return null;
    }
}

/** Toggle or set big-video mode: video expands and a small Blip appears beside it. */
function setVideoBigMode(big) {
    const sidePanel = document.getElementById('blip-side-panel');
    const miniWrap = sidePanel?.querySelector('.blip-mini-wrap');
    const ytLayout = sidePanel?.querySelector('.blip-yt-layout');
    const ytVideo = sidePanel?.querySelector('.blip-yt-video');
    const ytHint = sidePanel?.querySelector('.blip-yt-video p');
    const ytTitle = sidePanel?.querySelector('.blip-yt-video h3');
    const ytPlayer = sidePanel?.querySelector('#blip-yt-player');
    if (!sidePanel || !miniWrap) return;

    state.videoBigMode = !!big;
    syncScenerySuppression();
    const btn = document.getElementById('blip-video-big-btn');
    if (btn) btn.textContent = state.videoBigMode ? '◱ Normal' : '⛶ Full';

    if (state.videoBigMode) {
        sidePanel.classList.add('blip-video-big');
        sidePanel.style.width = 'min(96vw, 1280px)';
        sidePanel.style.height = 'min(90vh, 820px)';
        sidePanel.style.maxHeight = 'none';
        sidePanel.style.top = '50%';
        sidePanel.style.left = '50%';
        sidePanel.style.right = 'auto';
        sidePanel.style.transform = 'translate(-50%, -50%)';
        sidePanel.style.padding = '14px 14px 10px';
        if (ytLayout) {
            ytLayout.style.flexDirection = 'row';
            ytLayout.style.gap = '12px';
        }
        if (ytVideo) ytVideo.style.minWidth = '0';
        if (ytHint) ytHint.style.display = 'none';
        if (ytTitle) ytTitle.style.marginBottom = '6px';
        if (ytPlayer) {
            ytPlayer.style.height = '100%';
            ytPlayer.style.minHeight = '0';
        }
        if (!miniWrap.querySelector('#blip-face-mini') && faceContainer) {
            const clone = faceContainer.cloneNode(true);
            clone.classList.remove('blip-party');
            const faceEl = clone.querySelector('#blip-face');
            if (faceEl) {
                faceEl.id = 'blip-face-mini';
                faceEl.classList.add('blip-face-mini');
                styleMiniBlipFace(faceEl, state.videoCompanionSize);
            }
            miniWrap.innerHTML = '';
            miniWrap.appendChild(clone);
            syncMiniBlipEmotion();
        }
        applyVideoCompanionSizing();
    } else {
        sidePanel.classList.remove('blip-video-big');
        sidePanel.style.width = '280px';
        sidePanel.style.height = '340px';
        sidePanel.style.maxHeight = '';
        sidePanel.style.top = '120px';
        sidePanel.style.left = '';
        sidePanel.style.right = '32px';
        sidePanel.style.transform = '';
        sidePanel.style.padding = '12px';
        if (ytLayout) {
            ytLayout.style.flexDirection = '';
            ytLayout.style.gap = '';
        }
        if (ytVideo) ytVideo.style.minWidth = '';
        miniWrap.style.width = '';
        miniWrap.style.minWidth = '';
        if (ytHint) ytHint.style.display = '';
        if (ytTitle) ytTitle.style.marginBottom = '';
        if (ytPlayer) {
            ytPlayer.style.height = '200px';
            ytPlayer.style.minHeight = '';
        }
        miniWrap.innerHTML = '';
    }
}

/** Apply companion Blip size inside full YouTube view. Supports "big" and "mini" modes. */
function applyVideoCompanionSizing() {
    const sidePanel = document.getElementById('blip-side-panel');
    if (!sidePanel || !state.videoBigMode) return;
    const miniWrap = sidePanel.querySelector('.blip-mini-wrap');
    if (!miniWrap) return;
    const sizeBtn = document.getElementById('blip-video-blip-btn');

    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    const isBig = state.videoCompanionSize !== 'mini';
    syncScenerySuppression();
    const wrapWidth = isMobile ? (isBig ? 116 : 80) : (isBig ? 200 : 108);
    if (sizeBtn) sizeBtn.textContent = isBig ? '👤 Blip−' : '👤 Blip+';

    miniWrap.style.width = `${wrapWidth}px`;
    miniWrap.style.minWidth = `${wrapWidth}px`;

    const miniFace = document.getElementById('blip-face-mini');
    if (miniFace) styleMiniBlipFace(miniFace, isBig ? 'big' : 'mini');
}

/** Suppress orbiting scenery when big Blip companion is active in full video mode. */
function syncScenerySuppression() {
    const shouldSuppress = !!(state.videoBigMode && state.videoCompanionSize === 'big');
    document.body.classList.toggle('scenery-suppressed', shouldSuppress);
    if (shouldSuppress) {
        document.querySelectorAll('.scenery-object.active').forEach((obj) => obj.classList.remove('active'));
    }
}

/** Copy current emotion from main face to mini face (used when big video mode is on). */
function syncMiniBlipEmotion() {
    const mini = document.getElementById('blip-face-mini');
    if (!face || !mini) return;
    const emotionClass = Array.from(face.classList).find(c => c.startsWith('emotion-'));
    if (emotionClass) {
        mini.classList.remove(...Array.from(mini.classList).filter(c => c.startsWith('emotion-')));
        mini.classList.add(emotionClass);
    }
}

/** Apply explicit companion-face styling so side Blip remains visible and can switch between mini and big. */
function styleMiniBlipFace(faceEl, sizeMode = 'mini') {
    if (!faceEl) return;
    const isBig = sizeMode === 'big';
    const s = isBig
        ? {
            face: 176, core: 144, eyeTop: 52, eye: 22, eyeOffset: 36, pupil: 8,
            browTop: 34, browW: 28, browH: 3, browOffset: 30,
            noseTop: 72, nose: 9, mouthTop: 98, mouthW: 42, mouthH: 14, mouthBorder: 3
        }
        : {
            face: 94, core: 78, eyeTop: 28, eye: 14, eyeOffset: 20, pupil: 5,
            browTop: 18, browW: 16, browH: 2, browOffset: 18,
            noseTop: 38, nose: 6, mouthTop: 52, mouthW: 20, mouthH: 8, mouthBorder: 2
        };

    faceEl.style.position = 'relative';
    faceEl.style.width = `${s.face}px`;
    faceEl.style.height = `${s.face}px`;
    faceEl.style.display = 'flex';
    faceEl.style.alignItems = 'center';
    faceEl.style.justifyContent = 'center';
    faceEl.style.filter = 'drop-shadow(0 0 10px rgba(34, 211, 238, 0.28))';
    faceEl.style.transform = 'none';
    faceEl.style.transformOrigin = 'center';

    const core = faceEl.querySelector('.face-core');
    if (core) {
        core.style.position = 'relative';
        core.style.width = `${s.core}px`;
        core.style.height = `${s.core}px`;
        core.style.borderRadius = '50%';
        core.style.background = 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.12), rgba(255,255,255,0.04))';
        core.style.boxShadow = '0 0 12px rgba(34, 211, 238, 0.24), 0 0 24px rgba(124, 58, 237, 0.18), inset 0 0 12px rgba(255,255,255,0.05)';
        core.style.overflow = 'hidden';
    }

    const eyes = faceEl.querySelectorAll('.eye');
    eyes.forEach((el) => {
        el.style.position = 'absolute';
        el.style.top = `${s.eyeTop}px`;
        el.style.width = `${s.eye}px`;
        el.style.height = `${s.eye}px`;
        el.style.borderRadius = '50%';
        el.style.background = '#ffffff';
        el.style.boxShadow = '0 0 7px rgba(255,255,255,0.55)';
        el.style.overflow = 'hidden';
    });
    const leftEye = faceEl.querySelector('.eye-left');
    const rightEye = faceEl.querySelector('.eye-right');
    if (leftEye) leftEye.style.left = `${s.eyeOffset}px`;
    if (rightEye) rightEye.style.right = `${s.eyeOffset}px`;

    const pupils = faceEl.querySelectorAll('.pupil');
    pupils.forEach((el) => {
        el.style.position = 'absolute';
        el.style.width = `${s.pupil}px`;
        el.style.height = `${s.pupil}px`;
        el.style.borderRadius = '50%';
        el.style.background = '#0a0a0a';
        el.style.top = '50%';
        el.style.left = '50%';
        el.style.transform = 'translate(-50%, -50%)';
    });

    const brows = faceEl.querySelectorAll('.brow');
    brows.forEach((el) => {
        el.style.position = 'absolute';
        el.style.top = `${s.browTop}px`;
        el.style.width = `${s.browW}px`;
        el.style.height = `${s.browH}px`;
        el.style.borderRadius = '999px';
        el.style.background = 'rgba(255,255,255,0.9)';
    });
    const leftBrow = faceEl.querySelector('.brow-left');
    const rightBrow = faceEl.querySelector('.brow-right');
    if (leftBrow) leftBrow.style.left = `${s.browOffset}px`;
    if (rightBrow) rightBrow.style.right = `${s.browOffset}px`;

    const nose = faceEl.querySelector('.nose');
    if (nose) {
        nose.style.position = 'absolute';
        nose.style.top = `${s.noseTop}px`;
        nose.style.left = '50%';
        nose.style.width = `${s.nose}px`;
        nose.style.height = `${s.nose}px`;
        nose.style.borderRadius = '50%';
        nose.style.transform = 'translateX(-50%)';
        nose.style.background = 'rgba(255,255,255,0.75)';
        nose.style.boxShadow = '0 0 5px rgba(255,255,255,0.35)';
    }

    const mouth = faceEl.querySelector('.mouth');
    if (mouth) {
        mouth.style.position = 'absolute';
        mouth.style.top = `${s.mouthTop}px`;
        mouth.style.left = '50%';
        mouth.style.width = `${s.mouthW}px`;
        mouth.style.height = `${s.mouthH}px`;
        mouth.style.transform = 'translateX(-50%)';
        mouth.style.borderBottom = `${s.mouthBorder}px solid rgba(255,255,255,0.95)`;
        mouth.style.borderRadius = '0 0 18px 18px';
        mouth.style.background = 'transparent';
    }
}

/** Skip to next video from last search results (cycles through up to 5). */
function nextYouTubeVideo() {
    const results = state.lastContext.lastYoutubeSearchResults;
    if (!results || results.length === 0 || !blipYtPlayer || typeof blipYtPlayer.loadVideoById !== 'function') return false;
    const idx = (state.lastContext.lastYoutubeSearchIndex + 1) % results.length;
    state.lastContext.lastYoutubeSearchIndex = idx;
    const next = results[idx];
    if (!next || !next.videoId) return false;
    try {
        blipYtPlayer.loadVideoById(next.videoId);
        state.lastContext.lastYoutubeVideoId = next.videoId;
        state.lastContext.lastYoutubeUrl = `https://www.youtube.com/watch?v=${next.videoId}`;
    } catch (e) {
        console.warn('YouTube next failed:', e.message);
        return false;
    }
    return true;
}

/** Voice command parser for camera controls. */
function getCameraVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = cmd.toLowerCase().trim().replace(/\s+/g, ' ');
    if (/\b(open|start|enable|show|turn on)\s+(the\s+)?(camera|camara|vision|eyes?)\b/.test(lower) ||
        /^camera\s+on$/.test(lower) ||
        /\bopen\s+(my\s+)?eyes\b/.test(lower)) return 'open';
    if (/\b(close|stop|disable|hide|turn off)\s+(the\s+)?(camera|camara|vision|eyes?)\b/.test(lower) ||
        /^camera\s+off$/.test(lower) ||
        /\bclose\s+(my\s+)?eyes\b/.test(lower)) return 'close';
    if (/\b(snap|capture|take)\s+(a\s+)?(photo|picture|image|shot)\b/.test(lower) ||
        /^snap$/.test(lower) ||
        /\btake\s+photo\b/.test(lower)) return 'snap';
    return null;
}

/** True if the user is giving a YouTube panel control command (mute, close, pause, etc.). */
function getYouTubeVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = cmd.toLowerCase().trim();
    if (/\bunmute\b/.test(lower) || /\bturn\s+on\s+(the\s+)?sound\b/.test(lower) || /\b(with\s+)?sound\s+on\b/.test(lower) || /^(ok|yes|play)\s*$/.test(lower)) return 'unmute';
    if (/\bmute\b/.test(lower) || /\bturn\s+off\s+(the\s+)?sound\b/.test(lower) || /\bsound\s+off\b/.test(lower)) return 'mute';
    if (/\bclose\s+(the\s+)?(video|panel)\b/.test(lower) || /\bstop\s+(the\s+)?video\b/.test(lower) || /\b(exit|done)\s+(with\s+)?(the\s+)?video\b/.test(lower)) return 'close';
    if (/\bskip\b/.test(lower) || /\bnext\s+(video|one)\b/.test(lower) || /\b(another|different)\s+video\b/.test(lower)) return 'next';
    if (/\bnew\s+video\b/.test(lower) || /\bchange\s+(subject|video|topic)\b/.test(lower)) return 'new';
    if (/\bpause\s+(the\s+)?video\b/.test(lower) || /\bpause\b/.test(lower) && (lower.includes('video') || lower.length < 10)) return 'pause';
    if (/\bplay\s+(the\s+)?video\b/.test(lower) || /^play\s*$/.test(lower)) return 'play';
    if (/\b(start\s+over|from\s+the\s+beginning|restart)\b/.test(lower)) return 'restart';
    if (/\b(big(ger)?|large)\s+blip\b/.test(lower) ||
        /\bmake\s+blip\s+(bigger|larger|big)\b/.test(lower) ||
        /\benlarge\s+blip\b/.test(lower)) return 'blipBig';
    if (/\b(small(er)?|mini)\s+blip\b/.test(lower) ||
        /\bmake\s+blip\s+(smaller|small|mini)\b/.test(lower) ||
        /\bshrink\s+blip\b/.test(lower)) return 'blipSmall';
    if (/\b(make\s+)?(the\s+)?video\s+bigger\b/.test(lower) ||
        /\bbigger\s+video\b/.test(lower) ||
        /\bexpand\s+(the\s+)?video\b/.test(lower) ||
        /\blarge\s+video\b/.test(lower) ||
        /\bfull\s*screen\b/.test(lower) ||
        /\bfullscreen\b/.test(lower) ||
        /\bfull\s+view\b/.test(lower) ||
        /\bmaximize\s+(the\s+)?video\b/.test(lower) ||
        /\bcinema\s+mode\b/.test(lower)) return 'videoBig';
    if (/\b(make\s+)?(the\s+)?video\s+smaller\b/.test(lower) ||
        /\bsmall(er)?\s+video\b/.test(lower) ||
        /\bexit\s+(full\s*screen|fullscreen|full\s+view)\b/.test(lower) ||
        /\bnormal\s+view\b/.test(lower) ||
        /\bdefault\s+view\b/.test(lower)) return 'videoSmall';
    if (/\brewind\b/.test(lower) || /\bgo\s+back\b/.test(lower) || /\breplay\b/.test(lower)) return 'rewind';
    return null;
}

/** Blip speech volume voice command: 'volume down' (25% down) or 'volume up' (5% up). */
function getVolumeVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = cmd.toLowerCase().trim().replace(/\s+/g, ' ');
    if (/\b(volume\s+down|vol\.?\s*down|turn\s+down\s+(the\s+)?volume|quieter|lower\s+(the\s+)?volume)\b/.test(lower)) return 'down';
    if (/\b(volume\s+up|vol\.?\s*up|turn\s+up\s+(the\s+)?volume|louder|higher\s+(the\s+)?volume)\b/.test(lower)) return 'up';
    if (/\b(download|down\s*load|decrease|reduce)\s+(the\s+)?volume\b/.test(lower)) return 'down';
    if (/\b(upload|up\s*load|increase|raise)\s+(the\s+)?volume\b/.test(lower)) return 'up';
    if (/^volumedown\s*$/.test(lower) || /^vol\s*down\s*$/i.test(lower)) return 'down';
    if (/^volumeup\s*$/.test(lower) || /^vol\s*up\s*$/i.test(lower)) return 'up';
    // Natural short forms users say while watching a video.
    if (/^(please\s+)?(lower|lower it|turn it down|quieter|softer)(\s+please)?$/.test(lower)) return 'down';
    if (/^(please\s+)?(louder|higher|raise it|turn it up)(\s+please)?$/.test(lower)) return 'up';
    return null;
}

/** Call callback when YouTube IFrame API is ready. Uses script already loaded from index.html. */
function ensureYouTubeAPI(callback) {
    if (typeof window.YT !== 'undefined' && window.YT.Player) {
        callback();
        return;
    }
    window.blipYtReadyCallbacks = window.blipYtReadyCallbacks || [];
    window.blipYtReadyCallbacks.push(callback);
    if (window.blipYtReadyCallbacks.length > 1) return;
    window.onYouTubeIframeAPIReady = function () {
        (window.blipYtReadyCallbacks || []).forEach(cb => cb());
        window.blipYtReadyCallbacks = [];
    };
}

/** True when the user is asking to see the last video again (e.g. "show me the video", "play the video"). */
function wantsToSeeLastVideo(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = cmd.toLowerCase().trim();
    return /\b(show|play|open)\s+(me\s+)?(the\s+)?video\b/.test(lower) ||
        /\b(show|play)\s+it\s+again\b/.test(lower) ||
        /\b(show|play)\s+(the\s+)?video\s+again\b/.test(lower) ||
        /\bwhere'?s?\s+(the\s+)?video\b/.test(lower) ||
        /\bopen\s+(the\s+)?video\b/.test(lower);
}

/** True when the user is asking to see the graph again (e.g. "I don't see the graph", "show it again"). */
function wantsToSeeLastGraph(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = cmd.toLowerCase().trim();
    return /\b(don't|do not|can't|cannot)\s+see\s+(the\s+)?graph\b/.test(lower) ||
        /\b(show|send)\s+(me\s+)?(the\s+)?graph\s+again\b/.test(lower) ||
        /\b(show|send)\s+it\s+again\b/.test(lower) ||
        /\bwhere'?s?\s+(the\s+)?graph\b/.test(lower) ||
        /\bwhere\s+is\s+(the\s+)?graph\b/.test(lower) ||
        /\b(graph|it)\s+didn't\s+show\b/.test(lower) ||
        /\b(graph|it)\s+did\s+not\s+show\b/.test(lower) ||
        /\b(graph\s+is\s+)?(missing|not\s+there)\b/.test(lower);
}

/** Build a short "memory" block from lastContext + recent history for better continuity. */
function getContextBlock() {
    const c = state.lastContext;
    const parts = [];
    if (c.lastUserQuery) parts.push(`Last user question: "${c.lastUserQuery}"`);
    if (c.lastChartTitle) parts.push(`Last chart shown: ${c.lastChartTitle}`);
    if (c.lastLocation) parts.push(`Last location/map: ${c.lastLocation}`);
    if (c.lastSearchTopic) parts.push(`Last search topic: ${c.lastSearchTopic}`);
    if (state.history.length > 0) {
        const recent = state.history.slice(-3).map(h => `User: ${h.user.slice(0, 60)}${h.user.length > 60 ? '…' : ''} → Blip replied.`).join(' | ');
        parts.push(`Recent turns: ${recent}`);
    }
    if (parts.length === 0) return '';
    return `[Context from this session — use it when the user says "that", "another graph", "there", "same place", etc.]\n${parts.join('\n')}\n\n`;
}

function extractJSON(text) {
    if (!text) return null;
    try {
        // Try direct parse first
        return JSON.parse(text);
    } catch (e) {
        // Find first { and last }
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            const jsonStr = text.substring(start, end + 1);
            try {
                return JSON.parse(jsonStr);
            } catch (e2) {
                console.warn("Regex JSON parse failed:", e2.message);
                return null;
            }
        }
    }
    return null;
}

async function speak(text, emotion = 'serious') {
    if (state.isListening) stopListening();
    setEmotion(emotion);
    const cfg = {
        happy: { pitch: 1.1, rate: 1.05 },
        sad: { pitch: 0.85, rate: 0.9 },
        angry: { pitch: 1, rate: 1.1 },
        curious: { pitch: 1.05, rate: 1 },
        surprised: { pitch: 1.1, rate: 1.05 },
        serious: { pitch: 1, rate: 1 }
    }[emotion] || { pitch: 1, rate: 1 };

    if (state.voiceEngine === 'gemini') {
        if (!state.geminiKey || !state.geminiKey.trim()) {
            if (!isGitHub) {
                console.warn('Gemini key missing for cloud voice, falling back to browser');
                transcriptText.innerHTML += `<br><small style="color:#f59e0b">⚠️ Use the <strong>Gemini API Key</strong> (first field in Settings) for voice — not the YouTube key.</small>`;
            }
            return speech.speak(text, { ...cfg, onBoundary: animateMouth, volume: state.speechVolume });
        }
        try {
            console.log('☁️ Using Gemini Cloud Voice (Kore)');
            const voiceName = 'Kore';
            const audioData = await generateSpeech(text, state.geminiKey, voiceName);
            return speech.playBase64Audio(audioData, { onBoundary: animateMouth, volume: state.speechVolume });
        } catch (e) {
            console.warn('Gemini voice failed, falling back:', e.message);
            const fallbackVoice = state.selectedVoice || speech.getPreferredVoice?.();
            return speech.speak(text, { ...cfg, voice: fallbackVoice, onBoundary: animateMouth, volume: state.speechVolume });
        }
    }

    const voice = state.selectedVoice || speech.getPreferredVoice?.();
    return speech.speak(text, {
        voice,
        ...cfg,
        onBoundary: (level) => animateMouth(level),
        volume: state.speechVolume
    });
}

/**
 * 🎨 Universal Persona System
 * Updates emoji, label, color, and face in one call.
 */
function setPersona(key) {
    const p = PERSONAS[key] || PERSONAS.idle;
    state.currentPersona = key;
    state.currentEmotion = p.emotion;

    // Update UI Elements
    const emojiEl = document.getElementById('persona-emoji');
    const labelEl = document.getElementById('persona-label');

    if (emojiEl) {
        emojiEl.innerText = p.emoji;
        emojiEl.style.filter = `drop-shadow(0 0 10px ${p.color})`;
    }
    if (labelEl) {
        labelEl.innerText = p.label;
        labelEl.style.color = p.color;
    }

    // Update Global Accent Color for CSS
    document.documentElement.style.setProperty('--accent', p.color);
    document.documentElement.style.setProperty('--face-glow', `${p.color}44`); // 44 is ~25% alpha

    // Sync Face (ensure we never leave face with a missing/invisible state)
    if (state.idleBehavior) {
        face.classList.remove(state.idleBehavior);
        state.idleBehavior = null;
    }
    setBlipEmotion(p.emotion || 'serious');
    face.classList.add('blip-face');
    if (state.idleBehavior) face.classList.add(state.idleBehavior);
    face.style.visibility = 'visible';
    face.style.opacity = '';
}

/**
 * Apply one of the 10 face-container animations, or clear it.
 * @param {string|null} name - One of FACE_ANIMATIONS (e.g. 'face-anim-wiggle'), or null to clear.
 */
function setFaceAnimation(name) {
    if (!faceContainer) return;
    FACE_ANIMATIONS.forEach(c => faceContainer.classList.remove(c));
    if (name && FACE_ANIMATIONS.includes(name)) faceContainer.classList.add(name);
}

// Deprecated: Alias for backward compatibility
function setEmotion(e) {
    // Find a persona that matches this emotion or fallback to idle
    const found = Object.keys(PERSONAS).find(k => PERSONAS[k].emotion === e);
    setPersona(found || 'idle');
}

function triggerRandomIdle() {
    // Only idle if app is active but NOT thinking, NOT speaking, and NOT already emotional
    if (!state.isActive || state.isThinking || speech.isSpeaking || state.currentEmotion !== 'serious') return;

    const behaviors = ['dreamer', 'observer', 'squinter', 'bouncer', 'pulsar'];
    const pick = behaviors[Math.floor(Math.random() * behaviors.length)];

    state.idleBehavior = pick;
    face.classList.add(pick);

    // Spawn a matching symbol for the mood
    const moodSymbols = {
        'dreamer': '💤',
        'observer': '👁️',
        'squinter': '🤨',
        'bouncer': '✨',
        'pulsar': '💗'
    };
    if (Math.random() > 0.5) spawnSymbol(moodSymbols[pick]);

    console.log(`🎭 Blip is now: ${pick}`);

    // Revert to normal after 4-6 seconds
    setTimeout(() => {
        if (state.idleBehavior === pick) {
            face.classList.remove(pick);
            state.idleBehavior = null;
        }
    }, 5000);
}

/**
 * 🚲 Living Scenery: Multi-Object Eye Tracking Logic
 * Makes Blip's pupils follow the closest 'scenery-object' across the frame.
 */
function registerExtraSceneryObjects() {
    const layer = document.querySelector('.scenery-layer');
    if (!layer) return;

    EXTRA_SCENERY_OBJECTS.forEach((item) => {
        if (document.getElementById(item.id)) return;

        const obj = document.createElement('div');
        obj.id = item.id;
        obj.className = 'scenery-object';
        obj.textContent = item.emoji;
        obj.style.bottom = '5px';
        obj.style.left = '245px';
        obj.style.transformOrigin = 'center';
        obj.dataset.orbitDuration = String(item.duration);
        obj.dataset.orbitDirection = item.direction;
        obj.dataset.orbitSize = item.size;
        obj.dataset.isExtra = '1';
        layer.appendChild(obj);
    });
}

function startSceneryTracking() {
    const faceFrame = document.querySelector('.face-frame');
    if (!faceFrame) return;

    function update() {
        if (document.body.classList.contains('scenery-suppressed')) {
            document.documentElement.style.setProperty('--pupil-x', '0px');
            document.documentElement.style.setProperty('--pupil-y', '0px');
            requestAnimationFrame(update);
            return;
        }

        // Only track if Blip is not busy talking or thinking
        if (state.isThinking || speech.isSpeaking || state.currentEmotion !== 'serious') {
            document.documentElement.style.setProperty('--pupil-x', '0px');
            document.documentElement.style.setProperty('--pupil-y', '0px');
            requestAnimationFrame(update);
            return;
        }

        const objects = document.querySelectorAll('.scenery-object');
        const frameRect = faceFrame.getBoundingClientRect();
        const frameCenterX = frameRect.left + frameRect.width / 2;
        const frameCenterY = frameRect.top + frameRect.height / 2;

        let closestObj = null;
        let minDistance = Infinity;

        objects.forEach(obj => {
            const rect = obj.getBoundingClientRect();
            // Ignore objects far outside the frame to prevent erratic eye jumps
            if (rect.right < frameRect.left - 50 || rect.left > frameRect.right + 50) return;

            const objX = rect.left + rect.width / 2;
            const objY = rect.top + rect.height / 2;

            const dist = Math.sqrt(Math.pow(objX - frameCenterX, 2) + Math.pow(objY - frameCenterY, 2));
            if (dist < minDistance) {
                minDistance = dist;
                closestObj = { x: objX, y: objY };
            }
        });

        if (closestObj) {
            const dx = closestObj.x - frameCenterX;
            const dy = closestObj.y - frameCenterY;
            const totalDist = Math.sqrt(dx * dx + dy * dy) || 1;

            const maxDist = 5;
            const moveX = (dx / totalDist) * Math.min(totalDist / 12, maxDist);
            const moveY = (dy / totalDist) * Math.min(totalDist / 12, maxDist);

            document.documentElement.style.setProperty('--pupil-x', `${moveX}px`);
            document.documentElement.style.setProperty('--pupil-y', `${moveY}px`);
        } else {
            // Revert to center if no objects are visible
            document.documentElement.style.setProperty('--pupil-x', '0px');
            document.documentElement.style.setProperty('--pupil-y', '0px');
        }

        requestAnimationFrame(update);
    }
    update();
}

function spawnSymbol(typeOrEmoji) {
    const container = document.getElementById('floating-symbols');
    if (!container) return;

    const symbol = document.createElement('div');
    symbol.classList.add('symbol');

    // Add type as class if it's potentially a word (for specific CSS)
    if (typeOrEmoji.length > 3) symbol.classList.add(typeOrEmoji);

    const randomX = Math.floor(Math.random() * 80) + 10;
    symbol.style.left = `${randomX}%`;
    symbol.style.bottom = '10%';

    // Mapping for named types
    const mapping = {
        'question': '???',
        'exclamation': '!!!',
        'music': '♪',
        'timer': '⏰',
        'calendar': '📅',
        'weather': '🌤️',
        'currency': '💰',
        'map': '🌍',
        'reviews': '⭐',
        'movies': '🎬',
        'products': '🛒',
        // AI Symbols from prompt mapping
        'greeting': '👋',
        'confirm': '👍',
        'reject': '👎',
        'thanks': '🙏',
        'chat': '💬',
        'idea': '💡',
        'action': '⚡'
    };

    symbol.innerText = mapping[typeOrEmoji] || typeOrEmoji;

    container.appendChild(symbol);
    setTimeout(() => symbol.remove(), 2000);
}

/** True if the user message is praise (e.g. "good job", "well done", "thanks"). */
function isPraise(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = cmd.toLowerCase().trim();
    return /\b(good\s+job|great\s+job|nice\s+job|well\s+done|good\s+work|nice\s+work)\b/.test(lower) ||
        /\b(thanks|thank\s+you|thx)\b/.test(lower) ||
        /\b(awesome|amazing|excellent|fantastic|brilliant)\b/.test(lower) ||
        /\b(you('re|\s+are)\s+the\s+best|love\s+you\s+blip)\b/.test(lower) ||
        /^(good|great|nice|yes!?|perfect)\s*!?\s*$/.test(lower);
}

/** Short party animation when user praises Blip: face wiggle + confetti dots. */
function triggerBlipParty() {
    if (!faceContainer) return;
    faceContainer.classList.add('blip-party');
    setTimeout(() => faceContainer.classList.remove('blip-party'), 1000);

    const container = document.getElementById('floating-symbols');
    if (!container) return;
    const colors = ['#f43f5e', '#8b5cf6', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];
    for (let i = 0; i < 12; i++) {
        const dot = document.createElement('div');
        dot.className = 'blip-confetti';
        dot.style.left = Math.random() * 100 + '%';
        dot.style.top = (10 + Math.random() * 30) + '%';
        dot.style.background = colors[i % colors.length];
        container.appendChild(dot);
        setTimeout(() => dot.remove(), 1200);
    }
}

function animateMouth(level) {
    if (state.currentEmotion === 'surprised') return;
    mouth.style.height = `${6 + (level * 35)}px`;
}

function updateOllamaStatus(isOnline) {
    ossStatus.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
    ossText.innerText = `Ollama: ${isOnline ? 'Ready' : 'Not reachable'}`;
}

async function updateKokoroStatus() {
    const online = await speech.checkKokoroStatus();
    if (kokoroStatusDot) {
        kokoroStatusDot.className = `status-dot ${online ? 'online' : 'offline'}`;
        kokoroStatusDot.title = `Kokoro TTS: ${online ? 'Online ✅' : 'Offline — using browser voice'}`;
    }
}

function setBlipTimer(text, ms) {
    console.log(`⏰ Timer set for ${ms}ms: ${text}`);
    const timerId = setTimeout(async () => {
        // Wake up Blip if he's resting
        if (!state.isActive) {
            state.isActive = true;
            meterBox.style.display = 'block';
        }

        const alertText = `Excuse me Pablo! I have a reminder for you: ${text}`;
        await speak(alertText, 'surprised');

        // Cleanup
        state.timers = state.timers.filter(t => t.id !== timerId);
        if (state.isActive) startListeningLoop();
    }, ms);

    state.timers.push({ id: timerId, text, time: Date.now() + ms });
}

function createGoogleCalendarUrl(details) {
    // Google TEMPLATE expects YYYYMMDDTHHMMSSZ; normalize robustly from ISO-like inputs.
    const toGoogleDateTime = (value) => {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) {
            return String(value || '').replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        }
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    };
    const start = toGoogleDateTime(details.start);
    const end = toGoogleDateTime(details.end);
    const title = encodeURIComponent(details.title || details.summary || 'Event');
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}`;
}

function renderChart(labels, data, title, type = 'line') {
    if (activeChart) activeChart.destroy();

    // Default chart.js settings for dark mode
    Chart.defaults.color = '#a0a0b8';
    Chart.defaults.font.family = 'Inter';

    activeChart = new Chart(currencyChartCanvas, {
        type: type, // 'line' or 'bar' etc.
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                borderColor: '#6366f1',
                backgroundColor: type === 'line' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.6)',
                borderWidth: type === 'line' ? 3 : 1,
                tension: 0.4,
                fill: type === 'line',
                pointBackgroundColor: '#fff',
                pointRadius: type === 'line' ? 4 : 0,
                borderRadius: type === 'bar' ? 4 : 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: type !== 'line' }, // Only show legend if it's not the simple currency line
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 10,
                    cornerRadius: 8
                }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function downloadChart() {
    if (!activeChart) return;
    const link = document.createElement('a');
    link.download = `blip-chart-${Date.now()}.png`;
    link.href = activeChart.toBase64Image();
    link.click();
}

/**
 * Render action result in the side panel (chart, youtube, calendar, etc.).
 * Call after parsing/synthesis when we have action + tool_params + text.
 * @param {{ action: string, tool_params?: object, text?: string }} parsedResponse
 */
function renderActionInSidePanel(parsedResponse) {
    const { action, tool_params = {}, text = '' } = parsedResponse;
    if (action === 'none' || !action) return;

    let sidePanel = document.getElementById('blip-side-panel');
    if (!sidePanel) {
        sidePanel = document.createElement('div');
        sidePanel.id = 'blip-side-panel';
        sidePanel.style.position = 'fixed';
        sidePanel.style.right = '32px';
        sidePanel.style.top = '120px'; // keep clear of Blip's face/header
        sidePanel.style.width = '280px';
        sidePanel.style.height = '340px';
        sidePanel.style.background = 'rgba(10, 10, 30, 0.96)';
        sidePanel.style.border = '1px solid rgba(99, 102, 241, 0.4)';
        sidePanel.style.borderRadius = '12px';
        sidePanel.style.padding = '12px';
        sidePanel.style.overflow = 'auto';
        sidePanel.style.zIndex = '1000';
        sidePanel.style.color = '#e4e4e7';
        sidePanel.style.fontFamily = 'Inter, sans-serif';
        sidePanel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        document.body.appendChild(sidePanel);
    }

    const title = (action && action.length) ? action.charAt(0).toUpperCase() + action.slice(1) : 'Panel';
    sidePanel.innerHTML = `<button type="button" aria-label="Close panel" style="position:absolute;top:8px;right:8px;background:transparent;border:none;color:#a0a0b8;cursor:pointer;font-size:1.2rem;line-height:1;">×</button><h3 style="margin:0 0 8px 0; font-size:1rem;">${title} Panel</h3><p style="margin:0 0 10px 0; font-size:0.875rem; color:#a0a0b8;">${escapeHtml(String(text).slice(0, 200))}${String(text).length > 200 ? '…' : ''}</p>`;

    sidePanel.querySelector('button')?.addEventListener('click', () => {
        sidePanel.style.display = 'none';
        if (sidePanelChart) {
            sidePanelChart.destroy();
            sidePanelChart = null;
        }
    });

    if (sidePanelChart) {
        sidePanelChart.destroy();
        sidePanelChart = null;
    }

    switch (action) {
        case 'chart':
            if (tool_params.labels && tool_params.data) {
                const canvas = document.createElement('canvas');
                canvas.style.width = '100%';
                canvas.style.height = '220px';
                sidePanel.appendChild(canvas);
                Chart.defaults.color = '#a0a0b8';
                Chart.defaults.font.family = 'Inter';
                sidePanelChart = new Chart(canvas, {
                    type: tool_params.type || 'bar',
                    data: {
                        labels: tool_params.labels,
                        datasets: [{ data: tool_params.data, label: tool_params.title || 'Data', borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.6)', borderRadius: 4 }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: true } },
                        scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
                    }
                });
            }
            break;
        // YouTube: Muted autoplay is the only zero-click option (browser policy). Sound via "Blip, unmute" (one verbal confirmation → JS unmute). Full sound autoplay without gesture is blocked.
        case 'youtube': {
            let videoId = tool_params.videoId || null;
            if (!videoId && tool_params.embedUrl) {
                const m = tool_params.embedUrl.match(/\/embed\/([^?&]+)/);
                if (m) videoId = m[1];
            }
            const queryLabel = escapeHtml(String(tool_params.query || 'video'));
            const searchUrl = tool_params.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(tool_params.query || '')}`;
            if (blipYtPlayer && blipYtPlayer.destroy) {
                try { blipYtPlayer.destroy(); } catch (e) {}
                blipYtPlayer = null;
            }
            if (videoId) {
                state.videoBigMode = false;
                sidePanel.classList.remove('blip-video-big');
                syncScenerySuppression();
                sidePanel.innerHTML = `
                    <button type="button" aria-label="Close panel" style="position:absolute;top:8px;right:8px;background:transparent;border:none;color:#a0a0b8;cursor:pointer;font-size:1.2rem;line-height:1;">×</button>
                    <button type="button" aria-label="Full video" id="blip-video-big-btn" style="position:absolute;top:8px;right:36px;background:rgba(255,255,255,0.1);border:none;color:#a0a0b8;cursor:pointer;font-size:0.9rem;padding:4px 8px;border-radius:6px;">⛶ Full</button>
                    <button type="button" aria-label="Blip size" id="blip-video-blip-btn" style="position:absolute;top:8px;right:110px;background:rgba(255,255,255,0.1);border:none;color:#a0a0b8;cursor:pointer;font-size:0.8rem;padding:4px 8px;border-radius:6px;">${state.videoCompanionSize === 'big' ? '👤 Blip−' : '👤 Blip+'}</button>
                    <div class="blip-yt-layout">
                        <div class="blip-yt-video">
                            <h3 style="margin:0 0 8px 0; font-size:1rem;">Playing: ${queryLabel}</h3>
                            <p style="margin:0 0 10px 0; font-size:0.875rem; color:#a0a0b8;">Video starts muted. Say "unmute" or tap for sound.</p>
                            <div id="blip-yt-player" style="width:100%;height:200px;margin-top:8px;"></div>
                        </div>
                        <div class="blip-mini-wrap" aria-hidden="true"></div>
                    </div>
                `;
                sidePanel.querySelector('button[aria-label="Close panel"]')?.addEventListener('click', () => {
                    sidePanel.style.display = 'none';
                    setVideoBigMode(false);
                });
                document.getElementById('blip-video-big-btn')?.addEventListener('click', () => {
                    setVideoBigMode(!state.videoBigMode);
                });
                document.getElementById('blip-video-blip-btn')?.addEventListener('click', () => {
                    state.videoCompanionSize = state.videoCompanionSize === 'big' ? 'mini' : 'big';
                    try { localStorage.setItem('blip_video_companion_size', state.videoCompanionSize); } catch (e) { }
                    const btn = document.getElementById('blip-video-blip-btn');
                    if (btn) btn.textContent = state.videoCompanionSize === 'big' ? '👤 Blip−' : '👤 Blip+';
                    if (!state.videoBigMode) setVideoBigMode(true);
                    applyVideoCompanionSizing();
                });
                ensureYouTubeAPI(() => {
                    try {
                        blipYtPlayer = new window.YT.Player('blip-yt-player', {
                            videoId: videoId,
                            playerVars: { autoplay: 1, mute: 1, enablejsapi: 1, rel: 0, modestbranding: 1 },
                            events: { onReady: (e) => e.target.playVideo() }
                        });
                    } catch (e) {
                        console.warn('YT.Player failed, using fallback iframe:', e.message);
                        const fallback = document.getElementById('blip-yt-player');
                        if (fallback) {
                            fallback.innerHTML = '<iframe src="https://www.youtube.com/embed/' + videoId + '?autoplay=1&mute=1" width="100%" height="200" allow="autoplay; encrypted-media" style="border:none;"></iframe>';
                        }
                    }
                });
                try { window.open('https://www.youtube.com/watch?v=' + videoId, '_blank'); } catch (e) {}
            } else {
                sidePanel.innerHTML = `
                    <button type="button" aria-label="Close panel" style="position:absolute;top:8px;right:8px;background:transparent;border:none;color:#a0a0b8;cursor:pointer;font-size:1.2rem;line-height:1;">×</button>
                    <h3 style="margin:0 0 8px 0; font-size:1rem;">YouTube: ${queryLabel}</h3>
                    <p style="margin:0 0 10px 0; font-size:0.875rem; color:#a0a0b8;">I've opened the search in a new tab. Add a <strong>YouTube API key</strong> in Settings to play the right video here.</p>
                    <a href="${searchUrl}" target="_blank" rel="noopener" id="blip-yt-link" style="display:inline-block;margin-top:8px;padding:8px 12px;background:rgba(239,68,68,0.2);color:#f87171;border-radius:8px;text-decoration:none;font-size:0.875rem;">🎬 Open YouTube search</a>
                `;
                sidePanel.querySelector('button')?.addEventListener('click', () => {
                    sidePanel.style.display = 'none';
                });
                try { window.open(searchUrl, '_blank'); } catch (e) {}
                const linkEl = sidePanel.querySelector('#blip-yt-link');
                if (linkEl) setTimeout(() => { try { linkEl.click(); } catch (e) {} }, 150);
            }
            break;
        }
        case 'calendar':
            sidePanel.innerHTML += `<p style="margin:8px 0 0 0;">Event: ${escapeHtml(tool_params.title || 'Untitled')} at ${escapeHtml(tool_params.time || 'now')}</p>`;
            break;
        default:
            sidePanel.innerHTML += '<p style="margin:8px 0 0 0; color:#a0a0b8;">Handling action...</p>';
    }

    sidePanel.style.display = 'block';
}

// Start Audio Visualizer (Minimal)
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyzer = ctx.createAnalyser();
    source.connect(analyzer);
    const data = new Uint8Array(analyzer.frequencyBinCount);

    function update() {
        analyzer.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b) / data.length;
        const level = Math.min(100, avg * 2);
        if (state.isActive && !state.isThinking && !speech.isSpeaking) {
            meterLevel.style.width = `${level}%`;
            if (level > state.sensitivity) animateMouth(level / 100);
        }
        requestAnimationFrame(update);
    }
    update();
}).catch(() => { });

// Init on load
window.addEventListener('DOMContentLoaded', init);

/**
 * 🎬 Scenery Director: Sequential Character Spawning
 * Manages the sequence of character appearances (Cat, Bike, Traveler)
 * to ensure the frame stays organized and dynamic.
 */
function startSceneryDirector() {
    const objects = Array.from(document.querySelectorAll('.scenery-object'));
    if (objects.length === 0) return;
    const extraObjects = objects.filter((o) => o.dataset.isExtra === '1');
    const baseObjects = objects.filter((o) => o.dataset.isExtra !== '1');

    function spawnNext() {
        if (document.body.classList.contains('scenery-suppressed')) {
            setTimeout(spawnNext, 1500);
            return;
        }

        const useExtra = extraObjects.length > 0 && Math.random() < SCENERY_EXTRA_PROBABILITY;
        const pool = useExtra ? extraObjects : (baseObjects.length ? baseObjects : objects);
        const obj = pool[Math.floor(Math.random() * pool.length)];
        if (!obj) {
            setTimeout(spawnNext, 2000);
            return;
        }

        // Show and animate
        const customDuration = Number(obj.dataset.orbitDuration || '');
        if (Number.isFinite(customDuration) && customDuration > 0) {
            const direction = obj.dataset.orbitDirection === 'reverse' ? 'reverse' : 'normal';
            const customSize = obj.dataset.orbitSize;
            if (customSize) obj.style.fontSize = customSize;
            obj.style.animation = `walk-around-edge ${customDuration}s linear infinite ${direction}`;
        }
        if (obj.dataset.isExtra === '1') {
            obj.style.opacity = '0.42';
        } else {
            obj.style.opacity = '';
        }
        obj.classList.add('active');

        // Keep each object on screen for one controlled cycle to avoid visual noise.
        const duration = (Number.isFinite(customDuration) && customDuration > 0)
            ? Math.round(customDuration * 1000)
            : SCENERY_BASE_DURATION_MS;

        setTimeout(() => {
            obj.classList.remove('active');
            if (obj.dataset.orbitDuration) obj.style.animation = '';
            obj.style.opacity = '';

            // Wait for next character (slightly calmer cadence for wall projection).
            const waitTime = 6500 + Math.random() * 5500;
            setTimeout(spawnNext, waitTime);
        }, duration);
    }

    // Initial start after a few seconds
    setTimeout(spawnNext, 3000);
}
