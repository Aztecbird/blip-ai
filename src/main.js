import './style.css'
import { askOllama, checkOllamaStatus, warmUpModel, cancelCurrentRequest } from './services/ollama'
import { askGemini, generateWithPrompt } from './services/geminiText'
import { generateSpeech } from './services/geminiTts'
import { generateImage } from './services/imageProvider'
import { explainWithImage } from './services/orchestrator'
import { speech } from './services/speech'
import { web } from './services/web'
import {
    classifyReasoningMode,
    reasoningLoop,
    runDeepReasoning,
    runFastReasoning
} from './services/reasoning'
import * as contextAgent from './services/contextAgent.js'
import {
    connectGoogleCalendar,
    createGoogleCalendarEvent,
    deleteGoogleCalendarEvent,
    disconnectGoogleCalendar,
    getGoogleCalendarAuthState,
    initGoogleCalendar,
    listGoogleCalendarEvents,
    onGoogleCalendarAuthStateChange,
    setGoogleCalendarClientId,
    updateGoogleCalendarEvent
} from './services/googleCalendar.js'
import {
    connectGoogleGmail,
    disconnectGoogleGmail,
    getGoogleGmailAuthState,
    getGoogleGmailMessage,
    getGoogleGmailProfile,
    initGoogleGmail,
    listGoogleGmailMessages,
    onGoogleGmailAuthStateChange,
    sendGoogleGmailMessage
} from './services/googleGmail.js'
import { getGmailVoiceCommand } from './services/gmailVoice.js'
import {
    getTelegramAuthState,
    initTelegram,
    onTelegramAuthStateChange,
    sendTelegramMessage,
    sendTelegramPhoto,
    sendTelegramTest
} from './services/telegram.js'
import { getTelegramVoiceCommand } from './services/telegramVoice.js'
import { parseNaturalMessageFlow } from './services/messageFlow.js'
import { getVoiceRoutingContext } from './services/voiceDialog/context.js'
/* Blip face emotions: setBlipEmotion(emotion) applies .emotion-{name} to #blip-face; used in setPersona and after synthesis. */
import { setBlipEmotion } from './services/emotions.js'
import * as notesStore from './services/notesStore.js'
import { executeTimerFire } from './services/timerFireEffect.js'
import { buildTimerPanelBodyHtml } from './services/panelTimerBody.js'
import {
    classifyYouTubeContentType,
    DEFAULT_VIDEO_PLAYLIST,
    extractYouTubeLibraryDeleteTargetFromVoice,
    extractYouTubeLibraryPlayTargetFromVoice,
    extractYouTubeLibraryTransferRequestFromVoice,
    normalizeVideoPlaylistName,
    normalizeYouTubeTitleForMatch,
    resolveAutoPlaylistForYouTube,
    resolveYouTubeLibraryViewFromVoice,
    resolveVideoPlaylistFromVoice,
    SUGGESTED_VIDEO_CATEGORIES,
    WATCH_LATER_PLAYLIST
} from './services/youtubeLibrary.js'
import { createEmailFeature } from './features/email/emailFeature.js'
import { createTelegramFeature } from './features/telegram/telegramFeature.js'

// ── UI: DOM ELEMENTS ─────────────────────────────────────────────────────────
const face = document.getElementById('blip-face');
const faceContainer = document.getElementById('face-container');
const faceFrame = document.querySelector('.face-frame');
const blipStage = document.getElementById('blip-stage');
const weatherLayer = document.getElementById('weather-layer');
const dreamThoughts = document.getElementById('dream-thoughts');
const mouth = document.querySelector('#blip-face .mouth');
const talkBtn = document.getElementById('talkBtn');
const sleepBtn = document.getElementById('sleepBtn');
const transcriptText = document.getElementById('transcript');
const meterLevel = document.getElementById('meter-level');
const meterBox = document.querySelector('.mic-meter');
const meterLabel = document.getElementById('meter-label');
const chatBtn = document.getElementById('chatBtn');
const notesBtn = document.getElementById('notesBtn');
const emailBtn = document.getElementById('emailBtn');
const telegramBtn = document.getElementById('telegramBtn');
const calendarBtn = document.getElementById('calendarBtn');
const chatEntry = document.getElementById('chat-entry');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const timerCorner = document.getElementById('timer-corner');
const timerCornerTime = document.getElementById('timer-corner-time');

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
const recordBtn = document.getElementById('recordBtn');
const stopCameraBtn = document.getElementById('stopCameraBtn');

// Hub Elements
const mediaBtn = document.getElementById('mediaBtn');
const creationsBtn = document.getElementById('creationsBtn');
const mediaStrip = document.getElementById('media-strip');
const mediaStripTitle = document.getElementById('media-strip-title');
const mediaStripCount = document.getElementById('media-strip-count');
const mediaStripTabs = document.getElementById('media-strip-tabs');
const mediaStripHint = document.getElementById('media-strip-hint');
const mediaStripCommands = document.getElementById('media-strip-commands');
const closeMediaStripBtn = document.getElementById('closeMediaStripBtn');
const mediaStripShotsGroup = document.getElementById('media-strip-shots-group');
const mediaStripShotsCount = document.getElementById('media-strip-shots-count');
const mediaStripList = document.getElementById('media-strip-list');
const mediaStripCreatedGroup = document.getElementById('media-strip-created-group');
const createdStripCount = document.getElementById('created-strip-count');
const createdStripList = document.getElementById('created-strip-list');
const mediaStripMusicGroup = document.getElementById('media-strip-music-group');
const mediaStripMusicCount = document.getElementById('media-strip-music-count');
const mediaStripMusicList = document.getElementById('media-strip-music-list');
const mediaStripVideosGroup = document.getElementById('media-strip-videos-group');
const mediaStripVideosCount = document.getElementById('media-strip-videos-count');
const mediaStripVideosList = document.getElementById('media-strip-videos-list');
const mediaContainer = document.getElementById('media-container');
const mediaGrid = document.getElementById('media-grid');
const closeMediaBtn = document.getElementById('closeMediaBtn');
const mediaLightbox = document.getElementById('media-lightbox');
const mediaLightboxImage = document.getElementById('media-lightbox-image');
const mediaLightboxVideo = document.getElementById('media-lightbox-video');
const shareMediaLightboxBtn = document.getElementById('shareMediaLightboxBtn');
const downloadMediaLightboxBtn = document.getElementById('downloadMediaLightboxBtn');
const wallpaperMediaLightboxBtn = document.getElementById('wallpaperMediaLightboxBtn');
const closeMediaLightboxBtn = document.getElementById('closeMediaLightboxBtn');
const gamesBtn = document.getElementById('gamesBtn');
const cartBtn = document.getElementById('cartBtn');
const hubBtn = document.getElementById('hubBtn');
const hubContainer = document.getElementById('hub-container');
const hubMessages = document.getElementById('hub-messages');
const closeHubBtn = document.getElementById('closeHubBtn');
const gamesContainer = document.getElementById('games-container');
const closeGamesBtn = document.getElementById('closeGamesBtn');
const mathIntro = document.getElementById('math-intro');
const mathQuestion = document.getElementById('math-question');
const mathOptions = document.getElementById('math-options');
const mathFeedback = document.getElementById('math-feedback');
const mathStartBtn = document.getElementById('math-start-btn');
const mathNextBtn = document.getElementById('math-next-btn');
const mathScore = document.getElementById('math-score');
const cartContainer = document.getElementById('cart-container');
const cartItemsEl = document.getElementById('cart-items');
const closeCartBtn = document.getElementById('closeCartBtn');
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
const saveChartBtn = document.getElementById('saveChartBtn');

// Settings (Unified)
const gearBtn = document.getElementById('gearBtn');
const underTheHood = document.getElementById('under-the-hood');
const closePanelBtn = document.getElementById('closePanelBtn');
const geminiKeyInput = document.getElementById('geminiKeyInput');
const youtubeKeyInput = document.getElementById('youtubeKeyInput');
const weatherKeyInput = document.getElementById('weatherKeyInput');
const googleCalendarClientIdInput = document.getElementById('googleCalendarClientIdInput');
const connectCalendarBtn = document.getElementById('connectCalendarBtn');
const disconnectCalendarBtn = document.getElementById('disconnectCalendarBtn');
const calendarAuthStatus = document.getElementById('calendarAuthStatus');
const connectGmailBtn = document.getElementById('connectGmailBtn');
const openGmailInboxBtn = document.getElementById('openGmailInboxBtn');
const disconnectGmailBtn = document.getElementById('disconnectGmailBtn');
const gmailAuthStatus = document.getElementById('gmailAuthStatus');
const openTelegramBtn = document.getElementById('openTelegramBtn');
const sendTelegramTestBtn = document.getElementById('sendTelegramTestBtn');
const telegramAuthStatus = document.getElementById('telegramAuthStatus');
const voiceEngineSelect = document.getElementById('voiceEngineSelect');
const voiceEngineStatus = document.getElementById('voiceEngineStatus');
const browserVoiceSelect = document.getElementById('browserVoiceSelect');
const browserVoiceGroup = document.getElementById('browser-voice-group');
const kokoroHintGroup = document.getElementById('kokoro-hint-group');
const speechVolumeInput = document.getElementById('speechVolumeInput');
const speechVolumeValue = document.getElementById('speechVolumeValue');
const modelSelect = document.getElementById('modelSelect');
const usageTierSelect = document.getElementById('usageTierSelect');
const imageModelSelect = document.getElementById('imageModelSelect');
const imageEngineSelect = document.getElementById('imageEngineSelect');
const comfyuiBaseUrlInput = document.getElementById('comfyuiBaseUrlInput');
const comfyuiCheckpointInput = document.getElementById('comfyuiCheckpointInput');
const comfyuiUrlGroup = document.getElementById('comfyuiUrlGroup');
const displayLumaSelect = document.getElementById('displayLumaSelect');
const idleWeatherLocationInput = document.getElementById('idleWeatherLocationInput');
const idleMusicToggle = document.getElementById('idleMusicToggle');
const idleFxToggle = document.getElementById('idleFxToggle');
const passiveWakeToggle = document.getElementById('passiveWakeToggle');
const idleSoundVolumeInput = document.getElementById('idleSoundVolumeInput');
const idleSoundVolumeValue = document.getElementById('idleSoundVolumeValue');
const weatherDisplay = document.getElementById('weather-display');
const countdownDisplay = document.getElementById('countdown-display');

// ── APP STATE ────────────────────────────────────────────────────────────────
const isGitHub = window.location.hostname.includes('github.io');

/** Single source of truth for app version — update here (and package.json) when releasing. */
const BLIP_VERSION = '5.1';
const WAKE_GREETING_ENABLED = true;

/** Diamond-style values: guide reasoning (Conclusion + Explanation). Use 1–3 when building prompts. */
const BLIP_VALUES = ['Critical Thinking', 'Compassion', 'Joyful Learning', 'Emotional Intelligence', 'Ethics & Responsibility'];

const CAPABILITY_SCENERY_OBJECTS = [
    { id: 'capability-chat', emoji: '💬', label: 'chat', size: '1.15rem', orbitOffset: 0, duration: 20, direction: 'normal', delay: '-3s' },
    { id: 'capability-search', emoji: '🔎', label: 'search', size: '1.1rem', orbitOffset: 10, duration: 27, direction: 'reverse', delay: '-11s' },
    { id: 'capability-map', emoji: '📍', label: 'maps', size: '1.1rem', orbitOffset: 20, duration: 31, direction: 'normal', delay: '-8s' },
    { id: 'capability-chart', emoji: '📈', label: 'charts', size: '1.1rem', orbitOffset: 30, duration: 24, direction: 'reverse', delay: '-14s' },
    { id: 'capability-vision', emoji: '👁️', label: 'vision', size: '1.15rem', orbitOffset: 14, duration: 29, direction: 'normal', delay: '-17s' },
    { id: 'capability-video', emoji: '🎬', label: 'video', size: '1.1rem', orbitOffset: 36, duration: 33, direction: 'reverse', delay: '-20s' },
    { id: 'capability-voice', emoji: '🔊', label: 'voice', size: '1.1rem', orbitOffset: 6, duration: 22, direction: 'normal', delay: '-6s' },
    { id: 'capability-reminder', emoji: '⏰', label: 'reminders', size: '1.1rem', orbitOffset: 24, duration: 30, direction: 'normal', delay: '-24s' }
];
const DECORATIVE_SCENERY_OBJECTS = [
    { id: 'orbit-moon', emoji: '', label: '', size: '2.15rem', radiusBoost: 72, duration: 84, direction: 'normal', delay: '-18s', phase: 304, decorType: 'moon' }
];
const CAPABILITY_MIN_ORBIT_RADIUS_PX = 148;
const CAPABILITY_ORBIT_SLOWDOWN = 1.5;
const CAPABILITY_MIN_RING_GAP_PX = 16;
const CAPABILITY_ORBIT_PADDING_PX = 14;
const CAPABILITY_BASE_ORBIT_DURATION_SEC = 26;
const BLIP_REPLY_MAX_WORDS = 16;
const CAMERA_RECORDING_MAX_MS = 5 * 60 * 1000;
const RECIPE_QUERY_RE = /\b(recipe|meal|cook|cooking|ingredient|diabetic|diabetes|low[\s-]?sugar)\b/i;
const DESIGN_QUERY_RE = /\b(draw|drawing|design|sketch|illustration|logo|poster|icon|art|flower|turtle|turle|horse|sun)\b/i;
const SLEEP_DREAM_QUOTES = [
    'I am happy.',
    'I am creating.',
    'I am joyful.',
    'I am living the moment.',
    'I have a lot of friends.',
    'I am learning every day.',
    'I am full of good ideas.',
    'I am kind and grateful.',
    'I am growing every day.'
];

// Backward compatibility: older runtime paths may still reference this name.
const EXTRA_SCENERY_OBJECTS = CAPABILITY_SCENERY_OBJECTS;

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
  gap: clamp(0.45rem, 1.2vh, 0.95rem) !important;
  align-self: center !important;
  margin: 0 auto !important;
}
#transcript-area {
  width: min(80vw, 860px) !important;
  margin: 0 auto !important;
}
#interaction-area {
  width: min(92vw, 980px) !important;
  gap: 0.8rem !important;
  margin: 0 auto 0.15rem !important;
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
  width: min(90vw, 1040px) !important;
  height: min(56vh, 600px) !important;
  border-radius: 2.2rem !important;
}
#blip-stage {
  min-height: min(58vh, 660px) !important;
}
#blip-face.blip-face {
  width: clamp(262px, 25.5vw, 386px) !important;
  height: clamp(262px, 25.5vw, 386px) !important;
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
    height: min(40vh, 320px) !important;
    border-radius: 1.4rem !important;
  }
  #blip-stage {
    min-height: min(42vh, 400px) !important;
  }
  #blip-face.blip-face {
    width: clamp(190px, 40vw, 280px) !important;
    height: clamp(190px, 40vw, 280px) !important;
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

/* Gmail / Telegram: panel fixed on BODY (sibling of #app). Reserve space + stop 100vw children ignoring #app padding. */
body.blip-gmail-panel-open #app,
body.blip-telegram-panel-open #app {
  padding-right: calc(min(240px, 48vw) + 12px) !important;
  padding-left: 0 !important;
  box-sizing: border-box !important;
}

body.blip-gmail-panel-open #blip-face.blip-face,
body.blip-telegram-panel-open #blip-face.blip-face {
  width: clamp(150px, 28vw, 240px) !important;
  height: clamp(150px, 28vw, 240px) !important;
}

body.blip-gmail-panel-open .container,
body.blip-telegram-panel-open .container {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  padding-left: 0.5rem !important;
  padding-right: 0.5rem !important;
}
body.blip-gmail-panel-open #face-area,
body.blip-telegram-panel-open #face-area {
  width: 100% !important;
  max-width: 100% !important;
  position: relative;
  z-index: 1100;
}
body.blip-gmail-panel-open .face-frame,
body.blip-telegram-panel-open .face-frame {
  width: 100% !important;
  max-width: 100% !important;
}
body.blip-gmail-panel-open #transcript-area,
body.blip-telegram-panel-open #transcript-area {
  width: 100% !important;
  max-width: 100% !important;
}
@media (max-width: 520px) {
  body.blip-gmail-panel-open #app,
  body.blip-telegram-panel-open #app {
    padding-right: calc(min(200px, 48vw) + 8px) !important;
  }
  body.blip-gmail-panel-open #blip-face.blip-face,
  body.blip-telegram-panel-open #blip-face.blip-face {
    width: clamp(130px, 42vw, 180px) !important;
    height: clamp(130px, 42vw, 180px) !important;
  }
}
/* Bottom-right dock: keeps center column (face) clear; below face z-index so overlap shows Blip on top */
body.blip-gmail-panel-open #blip-side-panel.blip-gmail-dock,
body.blip-telegram-panel-open #blip-side-panel.blip-telegram-dock {
  position: fixed !important;
  z-index: 900 !important;
  left: auto !important;
  right: max(10px, env(safe-area-inset-right, 0px)) !important;
  top: auto !important;
  bottom: max(10px, env(safe-area-inset-bottom, 0px)) !important;
  transform: none !important;
  width: min(240px, 48vw) !important;
  max-width: min(240px, 48vw) !important;
  height: min(32vh, 400px) !important;
  max-height: min(32vh, 400px) !important;
  box-sizing: border-box !important;
  background: rgba(4, 10, 26, 0.72) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
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
const TIMER_STORAGE_KEY = 'blip_timers_v1';
const MEDIA_STORAGE_KEY = 'blip_media_gallery';
const CALENDAR_CACHE_STORAGE_KEY = 'blip_calendar_cache_v1';
const CALENDAR_PENDING_STORAGE_KEY = 'blip_calendar_pending_v1';
const CALENDAR_PENDING_DELETE_STORAGE_KEY = 'blip_calendar_pending_deletes_v1';
const USER_PROFILE_STORAGE_KEY = 'blip_user_profile_v1';
const VIDEO_PLAYLISTS_STORAGE_KEY = 'blip_video_playlists_v1';
const EMAIL_CONTACTS_STORAGE_KEY = 'blip_email_contacts_v1';
const MEDIA_MAX = 80;
const MEDIA_BUCKET_SHOTS = 'shots';
const MEDIA_BUCKET_CREATED = 'created';
const MEDIA_ACTIONS_BACKEND_URL = '/api/media-actions';
const CREATIONS_TOOL_ENABLED = false;
const CREATIONS_DISABLED_MESSAGE = 'Creations is turned off for now.';
const ENABLE_BLIP_PERSONALIZATION = false; // Standby mode: keep code, disable runtime behavior.
const BLIP_PERSONALIZATION_STORAGE_KEY = 'blip_personalization_v1';
const BLIP_DEFAULT_PERSONALIZATION = Object.freeze({
    hat: 'none',       // none | cap | beanie | crown
    glasses: 'none',   // none | round | visor
    eyeColor: 'white', // white | blue | green | amber | purple | pink | cyan
    auraColor: 'default' // default | blue | green | gold | pink | purple | cyan
});
const BLIP_EYE_COLOR_MAP = Object.freeze({
    white: '#ffffff',
    blue: '#93c5fd',
    green: '#86efac',
    amber: '#fcd34d',
    purple: '#c4b5fd',
    pink: '#f9a8d4',
    cyan: '#67e8f9'
});
const BLIP_AURA_COLOR_MAP = Object.freeze({
    default: { core: 'rgba(0, 255, 255, 0.4)', mid: 'rgba(124, 58, 237, 0.2)' },
    blue: { core: 'rgba(59, 130, 246, 0.45)', mid: 'rgba(59, 130, 246, 0.2)' },
    green: { core: 'rgba(16, 185, 129, 0.45)', mid: 'rgba(5, 150, 105, 0.22)' },
    gold: { core: 'rgba(251, 191, 36, 0.45)', mid: 'rgba(245, 158, 11, 0.22)' },
    pink: { core: 'rgba(244, 114, 182, 0.45)', mid: 'rgba(236, 72, 153, 0.22)' },
    purple: { core: 'rgba(167, 139, 250, 0.45)', mid: 'rgba(124, 58, 237, 0.25)' },
    cyan: { core: 'rgba(34, 211, 238, 0.45)', mid: 'rgba(6, 182, 212, 0.22)' }
});

const BLIP_USAGE_TIER_PRESETS = Object.freeze({
    cheap: {
        selectedModel: 'gemini-2.5-flash',
        voiceEngine: 'kokoro',
        imageModel: 'gemini-3.1-flash-image-preview'
    },
    balanced: {
        selectedModel: 'gemini-2.5-flash',
        voiceEngine: 'gemini',
        imageModel: 'gemini-3.1-flash-image-preview'
    },
    premium: {
        selectedModel: 'gemini-2.5-pro',
        voiceEngine: 'gemini',
        imageModel: 'gemini-3.1-flash-image-preview'
    }
});

const BLIP_DEFAULT_USER_PROFILE = Object.freeze({
    name: '',
    preferredName: '',
    preferredStore: '',
    shoppingHabits: '',
    onboardingComplete: false
});

function normalizeComfyuiCheckpointName(value = '') {
    const raw = String(value || '').trim();
    if (!raw) return '';
    // Common mismatch: user downloads `...emaonly.fp16.safetensors` but types `...emaonly-fp16.safetensors`.
    if (/-fp16\.safetensors$/i.test(raw) && !/\.fp16\.safetensors$/i.test(raw)) {
        return raw.replace(/-fp16\.safetensors$/i, '.fp16.safetensors');
    }
    return raw;
}

function normalizeUsageTier(value) {
    return Object.prototype.hasOwnProperty.call(BLIP_USAGE_TIER_PRESETS, value) ? value : 'cheap';
}

function normalizeUserProfile(profile = {}) {
    const safe = profile && typeof profile === 'object' ? profile : {};
    const name = String(safe.name || '').trim();
    const preferredName = String(safe.preferredName || '').trim();
    const preferredStore = String(safe.preferredStore || '').trim();
    const shoppingHabits = String(safe.shoppingHabits || '').trim();
    return {
        ...BLIP_DEFAULT_USER_PROFILE,
        name: name.slice(0, 48),
        preferredName: preferredName.slice(0, 48),
        preferredStore: preferredStore.slice(0, 64),
        shoppingHabits: shoppingHabits.slice(0, 160),
        onboardingComplete: Boolean(safe.onboardingComplete) || Boolean(name || preferredName)
    };
}

function stripTrailingYouTubeControlPhrases(text = '') {
    return String(text || '')
        .replace(/\b(?:and|then)\s+(?:un\s*-?\s*mute|sound\s+on|audio\s+on)\b[\s\S]*$/i, '')
        .replace(/\b(?:with\s+)?sound\s+on\b[\s\S]*$/i, '')
        .replace(/\b(?:with\s+)?audio\s+on\b[\s\S]*$/i, '')
        .trim();
}

function parseExplicitPercentFromText(lower = '') {
    const s = String(lower || '');
    // Examples: "30", "30%", "30 percent", "30 pct"
    const m = s.match(/\b(\d{1,3})\s*(?:%|percent|pct)?\b/);
    if (!m) return null;
    const n = Number(m[1]);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(100, Math.round(n)));
}

function parseStandaloneDurationMs(text = '') {
    const lower = normalizeVoiceTokens(String(text || '')).replace(/\bcounter\b/g, 'countdown');
    const match = lower.match(/\b(\d{1,4})(?:\s*)(seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h)\b/);
    if (!match) return null;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const unit = String(match[2] || '').toLowerCase();
    const msPerUnit = /^(?:seconds?|secs?|sec|s)$/.test(unit)
        ? 1000
        : /^(?:minutes?|mins?|min|m)$/.test(unit)
            ? 60000
            : 3600000;
    const prettyUnit = msPerUnit === 1000
        ? (amount === 1 ? 'second' : 'seconds')
        : msPerUnit === 60000
            ? (amount === 1 ? 'minute' : 'minutes')
            : (amount === 1 ? 'hour' : 'hours');
    return { ms: amount * msPerUnit, amount, prettyUnit, label: 'Timer' };
}

function clearPendingNaturalConversation() {
    state.pendingNaturalConversation = null;
}

function beginPendingNaturalConversation(kind = '', meta = {}) {
    state.pendingNaturalConversation = {
        kind: String(kind || '').trim(),
        meta: meta && typeof meta === 'object' ? { ...meta } : {},
        createdAt: Date.now()
    };
}

function getNaturalPlayQuery(cmd = '') {
    const lower = normalizeVoiceTokens(String(cmd || ''));
    const match = lower.match(/^(?:please\s+)?(?:play|watch|open|show)\s+(.+)$/);
    if (!match?.[1]) return '';
    const query = sanitizeVoiceQuery(match[1])
        .replace(/\s+(?:please|now)\s*$/, '')
        .trim();
    if (!query) return '';
    if (/^(?:it|this|that|the video|video|music|youtube|yt|gmail|email|telegram|calendar|map|chart|settings|chat|games|camera|cart|notes|hub)$/.test(query)) return '';
    if (/\b(?:email|gmail|telegram|calendar|map|chart|settings|chat|games|camera|cart|notes|hub)\b/.test(query)) return '';
    if (/^(?:the\s+)?(?:video|music)\s+(?:big|bigger|small|smaller|full(?:\s+screen)?)$/.test(query)) return '';
    return query;
}

function resolveNaturalOpenIntent(cmd = '') {
    const lower = normalizeVoiceTokens(String(cmd || ''));
    if (!/^(?:please\s+)?(?:open|show|view|play)\s+(?:it|this|that)(?:\s+again)?(?:\s+please)?$/.test(lower)) return null;
    if (state.lastContext?.lastYoutubeUrl) return { type: 'youtube' };
    if (state.lastContext?.lastChartData) return { type: 'chart' };
    if (state.lastContext?.lastLocation) return { type: 'map' };
    if (state.mediaItems?.length) {
        return {
            type: 'media',
            bucket: state.activeMediaBucket === MEDIA_BUCKET_CREATED ? MEDIA_BUCKET_CREATED : MEDIA_BUCKET_SHOTS
        };
    }
    return null;
}

/** Return explicit target YouTube volume (0-100) or null. */
function getYouTubeVolumeSetCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    if (!/\b(video|youtube|yt|player)\b/.test(lower)) return null;
    if (!/\b(volume|vol|sound)\b/.test(lower)) return null;
    if (!/\b(set|put|make|to|at|volume)\b/.test(lower)) return null;
    return parseExplicitPercentFromText(lower);
}

function setYouTubeVolume(value) {
    if (!blipYtPlayer || typeof blipYtPlayer.setVolume !== 'function') return null;
    try {
        const next = Math.max(0, Math.min(100, Math.round(Number(value))));
        blipYtPlayer.setVolume(next);
        if (typeof blipYtPlayer.unMute === 'function') blipYtPlayer.unMute();
        return next;
    } catch (e) {
        console.warn('YouTube setVolume failed:', e.message);
        return null;
    }
}

function normalizeSavedVideoEntry(entry = {}) {
    const safe = entry && typeof entry === 'object' ? entry : {};
    const url = String(safe.url || '').trim();
    const videoId = String(safe.videoId || extractYouTubeVideoId(url || safe.embedUrl || '') || '').trim();
    const embedUrl = String(safe.embedUrl || (videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : '')).trim();
    if (!url && !videoId) return null;
    return {
        id: String(safe.id || Date.now()),
        title: String(safe.title || safe.query || 'YouTube video').trim().slice(0, 140) || 'YouTube video',
        query: String(safe.query || '').trim().slice(0, 140),
        url: url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : ''),
        embedUrl,
        videoId,
        savedAt: Number.isFinite(Number(safe.savedAt)) ? Number(safe.savedAt) : Date.now()
    };
}

function normalizeVideoPlaylists(raw = {}) {
    const safe = raw && typeof raw === 'object' ? raw : {};
    const normalized = {};
    Object.entries(safe).forEach(([name, items]) => {
        const playlistName = normalizeVideoPlaylistName(name);
        if (!Array.isArray(items)) return;
        const nextItems = items
            .map((item) => normalizeSavedVideoEntry(item))
            .filter(Boolean)
            .slice(0, 80);
        if (nextItems.length) normalized[playlistName] = nextItems;
    });
    return normalized;
}

function getUsageTierPreset(value) {
    return BLIP_USAGE_TIER_PRESETS[normalizeUsageTier(value)];
}

const initialUsageTier = normalizeUsageTier(localStorage.getItem('blip_usage_tier') || 'cheap');
const initialTierPreset = getUsageTierPreset(initialUsageTier);
const storedVoiceEngine = localStorage.getItem('blip_voice_engine');
const storedVoiceEngineOverridden = localStorage.getItem('blip_voice_engine_overridden');
const storedVoiceEngineOverrideSource = localStorage.getItem('blip_voice_engine_override_source');
const DISPLAY_LUMA_OPTIONS = Object.freeze(['low', 'medium', 'high']);
const IDLE_WEATHER_REFRESH_MS = 15 * 60 * 1000;
const WEATHER_DISPLAY_TICK_MS = 15 * 1000;
const BLIP_HOME_LOCATION = 'Valencia, Spain';

function normalizeIdleWeatherLocation(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return BLIP_HOME_LOCATION;
    if (/^paris(?:,\s*france)?$/i.test(trimmed)) return BLIP_HOME_LOCATION;
    return trimmed;
}

function clampIdleAmbientVolume(value) {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed)) return 0.35;
    return Math.min(1, Math.max(0.1, parsed));
}

const state = {
    isActive: false,
    isThinking: false,
    sensitivity: 20,
    selectedVoice: null,
    currentEmotion: 'serious',
    history: [], // Loaded from localStorage in init
    timers: [],
    activeAlert: null,
    alarmAudioCtx: null,
    alarmLoopTimer: null,
    timerCornerTicker: null,
    timerPanelTicker: null,
    weatherDisplayTicker: null,
    alertDisplay: null,
    alertDisplayClearTimer: null,
    lastScheduledReminder: null,
    pendingImage: null, // Base64 string
    cameraStream: null,
    geminiKey: localStorage.getItem('blip_gemini_key') || '',
    youtubeApiKey: localStorage.getItem('blip_youtube_key') || '', // optional: for in-panel video playback (YouTube Data API v3)
    weatherApiKey: localStorage.getItem('blip_weather_key') || '',
    googleCalendarClientId: localStorage.getItem('blip_google_calendar_client_id') || '',
    usageTier: initialUsageTier,
    displayLuma: DISPLAY_LUMA_OPTIONS.includes(localStorage.getItem('blip_display_luma')) ? localStorage.getItem('blip_display_luma') : 'medium',
    idleWeatherLocation: normalizeIdleWeatherLocation(localStorage.getItem('blip_idle_weather_location')),
    selectedModel: localStorage.getItem('blip_selected_model') || initialTierPreset.selectedModel,
    voiceEngine: storedVoiceEngine || initialTierPreset.voiceEngine,
    voiceEngineOverridden: storedVoiceEngineOverridden === '1' || (!!storedVoiceEngine && storedVoiceEngine !== initialTierPreset.voiceEngine),
    voiceEngineOverrideSource: storedVoiceEngineOverrideSource || ((storedVoiceEngineOverridden === '1' || (!!storedVoiceEngine && storedVoiceEngine !== initialTierPreset.voiceEngine)) ? 'manual' : 'tier'),
    imageModel: localStorage.getItem('blip_image_model') || initialTierPreset.imageModel,
    imageEngine: localStorage.getItem('blip_image_engine') || 'gemini',
    comfyuiBaseUrl: (localStorage.getItem('blip_comfyui_base_url') || 'http://127.0.0.1:8188').trim(),
    comfyuiCheckpoint: normalizeComfyuiCheckpointName(localStorage.getItem('blip_comfyui_checkpoint') || ''),
    selectedGeminiVoice: 'Kore',       // Standardized for V3.1.0
    lastSpeechStartedAt: 0,
    lastSpokenText: '',
    lastSpokenFinishedAt: 0,
    speechVolume: Math.min(1, Math.max(0.2, (parseFloat(localStorage.getItem('blip_speech_volume')) || 1))),
    idleAmbientEnabled: localStorage.getItem('blip_idle_ambient_enabled') === '1',
    idleAmbientFxEnabled: localStorage.getItem('blip_idle_ambient_fx_enabled') !== '0',
    idleAmbientVolume: clampIdleAmbientVolume(localStorage.getItem('blip_idle_ambient_volume') || 0.35),
    passiveWakeEnabled: localStorage.getItem('blip_passive_wake_enabled') !== '0',
    passiveWakePrimed: localStorage.getItem('blip_passive_wake_primed') === '1',
    passiveWakeListening: false,
    passiveWakeLoopTimer: null,
    autoScrollTimer: null,
    autoScrollDirection: '',
    idleAudioCtx: null,
    idleAmbientMasterGain: null,
    idleAmbientPadGain: null,
    idleAmbientFilter: null,
    idleAmbientLfo: null,
    idleAmbientLfoGain: null,
    idleAmbientVoices: [],
    idleAmbientFxTimer: null,
    idleAmbientRunning: false,
    calendarCache: (() => {
        try {
            const parsed = JSON.parse(localStorage.getItem(CALENDAR_CACHE_STORAGE_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    })(),
    pendingCalendarEvents: (() => {
        try {
            const parsed = JSON.parse(localStorage.getItem(CALENDAR_PENDING_STORAGE_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    })(),
    pendingCalendarDeletes: (() => {
        try {
            const parsed = JSON.parse(localStorage.getItem(CALENDAR_PENDING_DELETE_STORAGE_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    })(),
    gmailProfile: null,
    gmailMailbox: 'inbox',
    gmailMessages: [],
    gmailSelectedMessageId: '',
    gmailSelectedMessage: null,
    gmailComposeDraft: { to: '', subject: '', text: '', attachments: [] },
    lastGmailDraft: null,
    lastGmailSendResult: null,
    telegramDraft: { chatId: '', text: '' },
    lastTelegramSendResult: null,
    pendingTelegramReview: false,
    emailContacts: (() => {
        try {
            const parsed = JSON.parse(localStorage.getItem(EMAIL_CONTACTS_STORAGE_KEY) || '{}');
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch (_) {
            return {};
        }
    })(),
    pendingEmailReview: null,
    gmailVoiceMergeBuffer: '',
    gmailVoiceMergeTimer: null,
    gmailVoiceMergeWindowUntil: 0,
    gmailDraftUndoStack: [],
    pendingNaturalConversation: null,
    pendingCalendarDraft: null,
    pendingNotesDraft: null,
    pendingProfileDraft: null,
    activeCalendarViewRequest: null,
    calendarDisplayMode: normalizeCalendarDisplayMode(localStorage.getItem('blip_calendar_display_mode') || 'month'),
    calendarAnchorDate: normalizeCalendarAnchorDate(localStorage.getItem('blip_calendar_anchor_date') || '').toISOString(),
    hubItems: JSON.parse(localStorage.getItem('blip_hub')) || [],
    cartItems: JSON.parse(localStorage.getItem('blip_cart') || '[]'),
    // Per-session overrides for media display (not persisted).
    // Prevents edits like "darken photo" from sticking forever unless explicitly baked into a data URL.
    mediaBrightnessOverrides: {},
    userProfile: (() => {
        try {
            return normalizeUserProfile(JSON.parse(localStorage.getItem(USER_PROFILE_STORAGE_KEY) || '{}'));
        } catch (_) {
            return normalizeUserProfile({});
        }
    })(),
    videoPlaylists: (() => {
        try {
            return normalizeVideoPlaylists(JSON.parse(localStorage.getItem(VIDEO_PLAYLISTS_STORAGE_KEY) || '{}'));
        } catch (_) {
            return {};
        }
    })(),
    youtubeLibraryView: localStorage.getItem('blip_youtube_library_view') || 'Music',
    youtubeLibraryBrowseIndex: 0,
    cartBrowseIndex: 0,
    mathGame: {
        score: 0,
        currentAnswer: null,
        currentQuestion: '',
        started: false,
        answered: false
    },
    currentSidePanelAction: '',
    currentSidePanelVisualUrl: '',
    designPanelZoomed: false,
    lastJokeIndex: -1,
    mediaItems: (() => {
        try {
            const parsed = JSON.parse(localStorage.getItem(MEDIA_STORAGE_KEY) || '[]');
            if (!Array.isArray(parsed)) return [];
            return parsed
                .filter((item) => item && typeof item === 'object' && typeof item.url === 'string')
                .map((item) => ({
                    ...item,
                    kind: item.kind === 'video' ? 'video' : 'image',
                    bucket: item.bucket === MEDIA_BUCKET_CREATED ? MEDIA_BUCKET_CREATED : MEDIA_BUCKET_SHOTS,
                    title: normalizeMediaItemTitle(item),
                    voiceLabel: item.bucket === MEDIA_BUCKET_CREATED
                        ? normalizeCreationVoiceLabel(item.voiceLabel || item.title || item.source || '')
                        : buildPhotoVoiceLabel({ ...item, title: normalizeMediaItemTitle(item) }),
                    createdAt: normalizeMediaCreatedAt(item.createdAt, item.id),
                    rotation: normalizeMediaRotation(item.rotation),
                    brightness: normalizeMediaBrightness(item.brightness),
                    originalUrl: typeof item.originalUrl === 'string' && item.originalUrl ? item.originalUrl : item.url,
                    lastEdit: normalizeMediaEditSnapshot(item.lastEdit)
                }));
        } catch (_) {
            return [];
        }
    })(),
    lastMediaUndo: null,
    mediaRecorder: null,
    recordingStream: null,
    recordingAudioStream: null,
    recordingChunks: [],
    isVideoRecording: false,
    recordingTimer: null,
    recordingAutoStopTimer: null,
    recordingStartedAt: 0,
    recordingStopReason: null,
    sleepDreamInterval: null,
    isMediaStripOpen: false,
    mediaStripLane: 'shots', // 'shots' | 'created' | 'all'
    activeMediaIndex: -1, // 0-based index of currently expanded media item
    activeMediaBucket: MEDIA_BUCKET_SHOTS,
    idleBehavior: null, // 'dreamer', 'observer', 'squinter'
    isProjectorMode: false,
    isLiveWatch: false,
    isListening: false,
    emotionShowcaseActive: false,
    chatEngaged: false,
    softSleepMode: false,
    currentWeatherScene: 'clear',
    currentWeatherSceneIntensity: 'active',
    weatherSceneShowcaseTimer: null,
    weatherSceneShowcaseIndex: -1,
    idleWeatherRefreshTimer: null,
    lastIdleWeatherFetchAt: 0,
    currentVoiceCommandText: '',
    pendingYouTubeAction: null,
    faceScale: Math.min(1.45, Math.max(0.72, parseFloat(localStorage.getItem('blip_face_scale') || '1') || 1)),
    liveInterval: null,
    liveFrames: [], // Queue of last 5 frames [{data, mimeType}]
    videoBigMode: false, // When true, side panel is large with mini Blip beside video
    videoCompanionSize: localStorage.getItem('blip_video_companion_size') === 'mini' ? 'mini' : 'big',
    lastMediaPersistStatus: 'ok',
    personalization: (() => {
        try {
            const parsed = JSON.parse(localStorage.getItem(BLIP_PERSONALIZATION_STORAGE_KEY) || '{}');
            return {
                ...BLIP_DEFAULT_PERSONALIZATION,
                ...(parsed && typeof parsed === 'object' ? parsed : {})
            };
        } catch (_) {
            return { ...BLIP_DEFAULT_PERSONALIZATION };
        }
    })(),
    // Working memory: what we just did (so "another graph", "there", "that" make sense)
    lastContext: {
        lastUserQuery: '',
        lastChartTitle: '',
        lastChartData: null, // { labels, data, title, type } for re-showing graph
        lastOpenableUrl: '',
        lastYoutubeUrl: null,
        lastYoutubeEmbedUrl: null,
        lastYoutubeVideoId: null,
        lastYoutubeSearchResults: null, // [{videoId, title}, ...] for next/skip
        lastYoutubeQuery: null,
        lastYoutubeSearchIndex: 0,
        lastLocation: '',
        lastSearchTopic: '',
        lastIntentActions: [],
        lastProductLinks: [],
        lastProductPreviewDataUrl: '',
        lastProductRetailer: '',
        lastRecipeQuery: '',
        lastRecipeText: '',
        lastDesignDataUrl: '',
        lastWeather: null,
        lastWeatherLocation: ''
    }
};

// ── Features: Email (Gmail) ──────────────────────────────────────────────────
const emailFeature = createEmailFeature({
    state,
    transcriptText,
    elements: {
        connectGmailBtn,
        openGmailInboxBtn,
        disconnectGmailBtn,
        gmailAuthStatus
    },
    services: {
        connectGoogleGmail,
        disconnectGoogleGmail,
        getGoogleGmailAuthState,
        getGoogleGmailMessage,
        getGoogleGmailProfile,
        initGoogleGmail,
        listGoogleGmailMessages,
        onGoogleGmailAuthStateChange,
        sendGoogleGmailMessage
    },
    helpers: {
        escapeHtml,
        renderActionInSidePanel,
        isSidePanelActuallyVisible,
        closeSidePanel,
        quickReply: (...args) => featureQuickReply(...args),
        getNoteItems,
        getEmailPhotoAttachmentPayload,
        isMediaLightboxActuallyVisible,
        normalizeMediaLane,
        getSelectedCalendarDate,
        formatCalendarDateKey,
        formatCalendarEventDate,
        formatCalendarEventTimeRange,
        getCurrentYouTubeTitle,
        /** Short “sent” swoosh after Gmail API accepts the message (non-blocking). */
        playEmailSendConfirm: (options) => triggerEmailSendConfirm(options),
        persistEmailContacts
    }
});

const telegramFeature = createTelegramFeature({
    state,
    transcriptText,
    elements: {
        openTelegramBtn,
        sendTelegramTestBtn,
        telegramAuthStatus
    },
    services: {
        getTelegramAuthState,
        initTelegram,
        onTelegramAuthStateChange,
        sendTelegramMessage,
        sendTelegramPhoto,
        sendTelegramTest
    },
    helpers: {
        escapeHtml,
        renderActionInSidePanel,
        isSidePanelActuallyVisible,
        closeSidePanel,
        quickReply: (...args) => featureQuickReply(...args),
        getEmailPhotoAttachmentPayload,
    }
});

function triggerEmailSendConfirm(options = {}) {
    const baseDelay = Number.isFinite(Number(options?.delayMs)) ? Number(options.delayMs) : 0;
    const delays = [baseDelay, baseDelay + 180, baseDelay + 420]
        .filter((delay, index, list) => delay >= 0 && list.indexOf(delay) === index);
    let played = false;
    delays.forEach((delay) => {
        setTimeout(() => {
            if (played) return;
            try {
                played = !!playEmailSentSwish();
            } catch (_) { }
        }, delay);
    });
}

async function featureQuickReply(message, emotion = 'happy', extraHtml = '', resumeListening = true, commandText = '') {
    const heard = String(commandText || state.currentVoiceCommandText || '').trim();
    const cleanMessage = sanitizeBlipReplyText(message);
    const shouldPlayEmailSendConfirm = /^(?:email sent to|gmail accepted the email for)\b/i.test(String(cleanMessage || '').trim());
    transcriptText.innerHTML = `${heard ? `<b>You:</b> ${heard}<br>` : ''}<b>Blip:</b> ${cleanMessage}${extraHtml}`;
    if (heard && cleanMessage) {
        state.history.push({ user: heard, blip: cleanMessage });
        if (state.history.length > HISTORY_MAX) state.history.shift();
        try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
    }
    setBlipEmotion(emotion);
    setPersona(getReplyPersonaKey(emotion));
    talkBtn.innerText = '🔊 SPEAKING...';
    await speakWithGuard(cleanMessage, emotion);
    if (shouldPlayEmailSendConfirm) {
        try {
            triggerEmailSendConfirm({ delayMs: 90 });
        } catch (_) { }
    }
    if (resumeListening && state.isActive && !state.isThinking && !speech.isSpeaking && !state.softSleepMode) {
        startListeningLoop();
    }
}

function persistUsageTierState() {
    try { localStorage.setItem('blip_usage_tier', state.usageTier); } catch (e) { }
    try { localStorage.setItem('blip_selected_model', state.selectedModel); } catch (e) { }
    try { localStorage.setItem('blip_voice_engine', state.voiceEngine); } catch (e) { }
    try { localStorage.setItem('blip_voice_engine_overridden', state.voiceEngineOverridden ? '1' : '0'); } catch (e) { }
    try { localStorage.setItem('blip_voice_engine_override_source', state.voiceEngineOverrideSource || 'tier'); } catch (e) { }
    try { localStorage.setItem('blip_image_model', state.imageModel); } catch (e) { }
    try { localStorage.setItem('blip_image_engine', state.imageEngine); } catch (e) { }
    try { localStorage.setItem('blip_comfyui_base_url', state.comfyuiBaseUrl || ''); } catch (e) { }
    try { localStorage.setItem('blip_comfyui_checkpoint', state.comfyuiCheckpoint || ''); } catch (e) { }
}

function getVoiceEngineLabel(engine = '') {
    if (engine === 'kokoro') return 'Kokoro';
    if (engine === 'gemini') return 'Gemini';
    if (engine === 'web') return 'Browser';
    return 'Unknown';
}

function getVoiceEngineSourceLabel() {
    if (state.voiceEngineOverrideSource === 'manual') return 'manual selection';
    if (state.voiceEngineOverrideSource === 'auto-quota') return 'automatic fallback after Gemini quota';
    if (state.voiceEngineOverrideSource === 'auto-error') return 'automatic fallback after Gemini voice error';
    return `usage tier ${normalizeUsageTier(state.usageTier)}`;
}

function updateVoiceEngineStatus() {
    if (!voiceEngineStatus) return;
    const engine = state.voiceEngine;
    const source = getVoiceEngineSourceLabel();
    if (engine === 'kokoro') {
        voiceEngineStatus.textContent = speech.kokoroOnline
            ? `Active now: Kokoro. Source: ${source}.`
            : `Active now: Kokoro, but Kokoro is offline, so speech will fall back to browser voice. Source: ${source}.`;
        return;
    }
    if (engine === 'gemini') {
        voiceEngineStatus.textContent = `Active now: Gemini voice. Source: ${source}.`;
        return;
    }
    voiceEngineStatus.textContent = `Active now: Browser voice. Source: ${source}.`;
}

function syncVoiceEngineUi() {
    const engine = state.voiceEngine;
    if (voiceEngineSelect) voiceEngineSelect.value = engine;
    if (browserVoiceGroup) browserVoiceGroup.style.display = engine === 'web' ? 'block' : 'none';
    if (kokoroHintGroup) kokoroHintGroup.style.display = engine === 'kokoro' ? 'block' : 'none';
    updateVoiceEngineStatus();
}

function isGeminiQuotaError(error) {
    const message = String(error?.message || error || '').toLowerCase();
    return message.includes('quota exceeded') ||
        message.includes('resource exhausted') ||
        message.includes('rate limit') ||
        message.includes('too many requests') ||
        message.includes('429');
}

function switchAwayFromGeminiVoice(reason = 'auto-error') {
    if (state.voiceEngine !== 'gemini') return;
    const nextEngine = speech.kokoroOnline ? 'kokoro' : 'web';
    state.voiceEngine = nextEngine;
    state.voiceEngineOverridden = true;
    state.voiceEngineOverrideSource = reason;
    persistUsageTierState();
    syncVoiceEngineUi();
    console.warn(`Voice engine auto-switched from Gemini to ${getVoiceEngineLabel(nextEngine)}.`);
}

function normalizeDisplayLuma(value) {
    return DISPLAY_LUMA_OPTIONS.includes(value) ? value : 'medium';
}

function normalizeCalendarDisplayMode(value) {
    return ['day', 'week', 'month'].includes(value) ? 'month' : 'month';
}

function normalizeCalendarAnchorDate(value) {
    const parsed = new Date(value || Date.now());
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function persistDisplayLuma() {
    try { localStorage.setItem('blip_display_luma', state.displayLuma); } catch (e) { }
}

function persistIdleWeatherLocation() {
    state.idleWeatherLocation = normalizeIdleWeatherLocation(state.idleWeatherLocation);
    try { localStorage.setItem('blip_idle_weather_location', state.idleWeatherLocation || ''); } catch (e) { }
}

function persistIdleAudioPreferences() {
    try { localStorage.setItem('blip_idle_ambient_enabled', state.idleAmbientEnabled ? '1' : '0'); } catch (e) { }
    try { localStorage.setItem('blip_idle_ambient_fx_enabled', state.idleAmbientFxEnabled ? '1' : '0'); } catch (e) { }
    try { localStorage.setItem('blip_idle_ambient_volume', String(state.idleAmbientVolume)); } catch (e) { }
}

function persistUserProfile() {
    try { localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(normalizeUserProfile(state.userProfile))); } catch (e) { }
}

function persistEmailContacts() {
    try { localStorage.setItem(EMAIL_CONTACTS_STORAGE_KEY, JSON.stringify(state.emailContacts || {})); } catch (e) { }
}

function persistVideoPlaylists() {
    try { localStorage.setItem(VIDEO_PLAYLISTS_STORAGE_KEY, JSON.stringify(normalizeVideoPlaylists(state.videoPlaylists))); } catch (e) { }
}

function normalizeYouTubeLibraryView(view = 'Music') {
    return view === 'Videos' ? 'Videos' : 'Music';
}

function setYouTubeLibraryView(view = 'Music') {
    state.youtubeLibraryView = normalizeYouTubeLibraryView(view);
    state.youtubeLibraryBrowseIndex = 0;
    try { localStorage.setItem('blip_youtube_library_view', state.youtubeLibraryView); } catch (_) { }
    return state.youtubeLibraryView;
}

function openSavedMediaLane(view = state.youtubeLibraryView) {
    const activeView = setYouTubeLibraryView(view);
    const lane = activeView === 'Videos' ? 'videos' : 'music';
    toggleMediaGallery(true, lane);
    if (!isMediaStripActuallyVisible()) {
        logUiOpenVisibilityFailure('open-saved-media-lane', 'media-strip', {
            lane,
            view: activeView
        });
    }
    return activeView;
}

function resolveRequestedYouTubeLibraryView(...candidates) {
    for (const candidate of candidates) {
        if (typeof candidate !== 'string' || !candidate.trim()) continue;
        const resolved = resolveYouTubeLibraryViewFromVoice(candidate);
        if (resolved) return normalizeYouTubeLibraryView(resolved);
    }
    return null;
}

function getSimilarYouTubeQueryFromContext() {
    const last = state.lastContext || {};
    const base = String(getCurrentYouTubeTitle?.() || last.lastYoutubeQuery || '').trim();
    if (!base) return '';
    const currentEntry = Array.isArray(last.lastYoutubeSearchResults)
        ? (last.lastYoutubeSearchResults[Math.max(0, Number(last.lastYoutubeSearchIndex) || 0)] || last.lastYoutubeSearchResults[0] || null)
        : null;
    const kind = classifyYouTubeContentType(base, currentEntry);
    const normalizedBase = base.replace(/\b(?:and|then)\s+(?:un\s*-?\s*mute|sound\s+on|audio\s+on)\b[\s\S]*$/i, '').trim();
    if (!normalizedBase) return '';
    if (kind === 'music') {
        // "mix" usually yields close-style results on YouTube for music.
        return /\bmix\b/i.test(normalizedBase) ? normalizedBase : `${normalizedBase} mix`;
    }
    return `${normalizedBase} similar`;
}

function getYouTubeSimilarVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    if (!/\b(?:another|more|different|new)\b/.test(lower) && !/\b(?:similar|same)\b/.test(lower)) return null;
    if (!/\b(?:video|youtube|yt|one)\b/.test(lower)) return null;
    if (!/\b(?:same\s+style|same\s+vibe|same\s+kind|similar|like\s+this|like\s+that)\b/.test(lower)) return null;
    const query = getSimilarYouTubeQueryFromContext();
    return query ? { query } : null;
}

function listVideoPlaylistsByLibrary(view = 'Music') {
    const v = normalizeVideoPlaylistName(view);
    const playlists = state.videoPlaylists && typeof state.videoPlaylists === 'object' ? state.videoPlaylists : {};
    const names = Object.keys(playlists);
    if (v === 'Music') {
        const preferred = names.includes('Music') ? ['Music'] : [];
        const others = names.filter((n) => n !== 'Music' && !['Videos', 'Watch Later', 'Favorites'].includes(n));
        return [...preferred, ...others].slice(0, 24);
    }
    if (v === 'Videos') {
        const preferred = names.includes('Videos') ? ['Videos'] : [];
        const others = names.filter((n) => n !== 'Videos' && !['Music', 'Watch Later', 'Favorites'].includes(n));
        return [...preferred, ...others].slice(0, 24);
    }
    return names.slice(0, 24);
}

function getYouTubeLibraryItems(view = state.youtubeLibraryView) {
    const focusName = view === 'Videos' ? 'Videos' : 'Music';
    const rawItems = Array.isArray(state.videoPlaylists?.[focusName]) ? state.videoPlaylists[focusName] : [];
    return rawItems
        .filter((item) => item && typeof item === 'object' && typeof item.videoId === 'string' && item.videoId.trim())
        .slice(0, 80);
}

function getRawSavedYouTubeItems(view = state.youtubeLibraryView) {
    const focusName = view === 'Videos' ? 'Videos' : 'Music';
    return Array.isArray(state.videoPlaylists?.[focusName]) ? state.videoPlaylists[focusName] : [];
}

function findRawSavedYouTubeItemIndex(view = state.youtubeLibraryView, item = null, visibleIndex = -1) {
    const rawItems = getRawSavedYouTubeItems(view);
    if (!rawItems.length) return -1;

    const preferredVisibleIndex = Number(visibleIndex);
    if (Number.isFinite(preferredVisibleIndex) && preferredVisibleIndex >= 0) {
        let currentVisibleIndex = -1;
        for (let rawIndex = 0; rawIndex < rawItems.length; rawIndex += 1) {
            const currentItem = rawItems[rawIndex];
            if (!currentItem || typeof currentItem !== 'object') continue;
            const currentVideoId = String(currentItem.videoId || '').trim();
            if (!currentVideoId) continue;
            currentVisibleIndex += 1;
            if (currentVisibleIndex === preferredVisibleIndex) return rawIndex;
        }
    }

    if (!item || typeof item !== 'object') return -1;

    const directIndex = rawItems.indexOf(item);
    if (directIndex >= 0) return directIndex;

    const targetVideoId = String(item.videoId || '').trim();
    if (targetVideoId) {
        const byVideoId = rawItems.findIndex((entry) => String(entry?.videoId || '').trim() === targetVideoId);
        if (byVideoId >= 0) return byVideoId;
    }

    const targetUrl = String(item.url || '').trim();
    if (targetUrl) {
        const byUrl = rawItems.findIndex((entry) => String(entry?.url || '').trim() === targetUrl);
        if (byUrl >= 0) return byUrl;
    }

    const targetTitle = normalizeVoiceTokens(String(item.title || item.query || ''));
    if (targetTitle) {
        return rawItems.findIndex((entry) => normalizeVoiceTokens(String(entry?.title || entry?.query || '')) === targetTitle);
    }

    return -1;
}

function getActiveSavedYouTubeViewForVoice() {
    const lane = normalizeMediaLane(state.mediaStripLane);
    if (lane === 'videos') return 'Videos';
    if (lane === 'music') return 'Music';
    return state.youtubeLibraryView === 'Videos' ? 'Videos' : 'Music';
}

function getSavedYouTubeItemsByView(view = 'Music') {
    return getYouTubeLibraryItems(view === 'Videos' ? 'Videos' : 'Music');
}

function getSavedYouTubeItemMatch(view = state.youtubeLibraryView, title = '') {
    const requested = normalizeYouTubeTitleForMatch(title);
    const focusName = view === 'Videos' ? 'Videos' : 'Music';
    const currentItems = getSavedYouTubeItemsByView(focusName);
    if (!requested || requested.length < 2 || !currentItems.length) {
        return { item: null, index: -1, score: -1, view: focusName, requested };
    }

    let bestIndex = -1;
    let bestScore = -1;
    currentItems.forEach((item, index) => {
        const rawTitle = normalizeVoiceTokens(String(item?.title || item?.query || ''));
        const cleanTitle = normalizeYouTubeTitleForMatch(String(item?.title || item?.query || ''));
        let score = -1;
        if (rawTitle === requested || cleanTitle === requested) score = 100;
        else if (rawTitle.includes(requested) || cleanTitle.includes(requested)) score = 80;
        else if (requested.includes(rawTitle) || requested.includes(cleanTitle)) score = 70;
        else {
            const requestedWords = requested.split(' ').filter(Boolean);
            const cleanWords = cleanTitle.split(' ').filter(Boolean);
            const overlap = requestedWords.filter((word) => cleanWords.includes(word)).length;
            if (overlap >= Math.max(2, Math.min(requestedWords.length, cleanWords.length))) score = 50 + overlap;
        }
        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    });

    return {
        item: bestIndex >= 0 ? currentItems[bestIndex] : null,
        index: bestIndex,
        score: bestScore,
        view: focusName,
        requested
    };
}

function openSavedYouTubePlayback(item, view = state.youtubeLibraryView, index = 0, options = {}) {
    const focusName = view === 'Videos' ? 'Videos' : 'Music';
    const videoId = String(item?.videoId || '').trim();
    if (!videoId) return { ok: false, message: `No ${focusName.toLowerCase()} item ready.` };
    const title = String(item?.title || item?.query || 'Saved video').trim() || 'Saved video';
    const safeIndex = Number.isFinite(Number(index)) ? Math.max(0, Math.floor(Number(index))) : 0;
    setYouTubeLibraryView(focusName);
    state.youtubeLibraryBrowseIndex = safeIndex;
    syncYouTubeLibraryBrowseSelection({ scrollIntoView: true });
    renderActionInSidePanel({
        action: 'youtube',
        tool_params: {
            videoId,
            query: title,
            focusedPlayer: options.focusedPlayer !== false,
            mediaView: focusName
        },
        text: `Playing ${title}.`
    });
    const visible = isYouTubePanelActuallyVisible();
    if (!visible) {
        logUiOpenVisibilityFailure('saved-youtube-playback', 'youtube-panel', {
            title,
            view: focusName,
            index: safeIndex
        });
    }
    return {
        ok: visible,
        message: visible ? `Playing ${title}.` : 'I tried to open it, but the window did not appear.',
        title,
        view: focusName,
        index: safeIndex
    };
}

function playSavedYouTubeItemByNumber(number, view = getActiveSavedYouTubeViewForVoice()) {
    const items = getSavedYouTubeItemsByView(view);
    const oneBased = Number(number);
    if (!Number.isFinite(oneBased) || oneBased < 1) return { ok: false, message: `No ${view.toLowerCase()} item ${number}.` };
    const safeIndex = Math.floor(oneBased) - 1;
    const item = items[safeIndex];
    if (!item) return { ok: false, message: `No ${view.toLowerCase()} item ${number}.` };
    const result = openSavedYouTubePlayback(item, view, safeIndex, { focusedPlayer: true });
    return result.ok
        ? { ...result, message: `Opening ${view.toLowerCase()} ${oneBased}.` }
        : { ok: false, message: `No ${view.toLowerCase()} item ${number}.` };
}

function playCurrentSavedYouTubeItem(view = getActiveSavedYouTubeViewForVoice()) {
    const items = getSavedYouTubeItemsByView(view);
    if (!items.length) return { ok: false, message: `No ${view.toLowerCase()} yet.` };
    const safeIndex = normalizeYouTubeLibraryBrowseIndex(state.youtubeLibraryBrowseIndex, items);
    const item = items[safeIndex];
    return openSavedYouTubePlayback(item, view, safeIndex, { focusedPlayer: true });
}

function playSavedYouTubeItemByTitle(title = '', options = {}) {
    const preferredViews = Array.isArray(options.preferredViews) && options.preferredViews.length
        ? options.preferredViews.map((view) => view === 'Videos' ? 'Videos' : 'Music')
        : [getActiveSavedYouTubeViewForVoice(), getActiveSavedYouTubeViewForVoice() === 'Videos' ? 'Music' : 'Videos'];
    const uniqueViews = [...new Set(preferredViews)];
    let best = null;

    uniqueViews.forEach((view) => {
        const match = getSavedYouTubeItemMatch(view, title);
        if (match.score > (best?.score ?? -1)) best = match;
    });

    if (!best?.item || best.score < 50) {
        const label = uniqueViews.length === 1
            ? uniqueViews[0]
            : 'saved music or videos';
        return {
            ok: false,
            message: uniqueViews.length === 1
                ? `I could not find "${title}" in ${label}.`
                : `I could not find "${title}" in ${label}.`
        };
    }

    return openSavedYouTubePlayback(best.item, best.view, best.index, { focusedPlayer: true });
}

function clearSavedYouTubeItems(view = getActiveSavedYouTubeViewForVoice()) {
    const focusName = view === 'Videos' ? 'Videos' : 'Music';
    const currentItems = Array.isArray(state.videoPlaylists?.[focusName]) ? state.videoPlaylists[focusName] : [];
    if (!currentItems.length) {
        return { ok: false, message: `No ${focusName.toLowerCase()} to clear.` };
    }
    rememberMediaUndo({
        type: 'youtube-bulk',
        view: focusName,
        items: currentItems.map((item, index) => ({ item, index }))
    });
    const nextPlaylists = { ...(state.videoPlaylists || {}) };
    delete nextPlaylists[focusName];
    state.videoPlaylists = nextPlaylists;
    state.youtubeLibraryBrowseIndex = -1;
    persistVideoPlaylists();
    renderMediaGallery();
    return {
        ok: true,
        message: `Cleared ${focusName.toLowerCase()}. Removed ${currentItems.length} item${currentItems.length === 1 ? '' : 's'}.`
    };
}

function removeSavedYouTubeItemByNumber(number, view = getActiveSavedYouTubeViewForVoice()) {
    const items = getSavedYouTubeItemsByView(view);
    const oneBased = Number(number);
    if (!Number.isFinite(oneBased) || oneBased < 1) return { ok: false, message: `No ${view.toLowerCase()} item ${number}.` };
    const safeIndex = Math.floor(oneBased) - 1;
    const item = items[safeIndex];
    if (!item) return { ok: false, message: `No ${view.toLowerCase()} item ${number}.` };
    const playlistName = view === 'Videos' ? 'Videos' : 'Music';
    const currentItems = getRawSavedYouTubeItems(playlistName);
    const rawIndex = findRawSavedYouTubeItemIndex(playlistName, item, safeIndex);
    if (rawIndex < 0) return { ok: false, message: `Could not remove ${view.toLowerCase()} ${oneBased}.` };
    rememberMediaUndo({
        type: 'youtube-single',
        view: playlistName,
        items: [{ item, index: rawIndex }]
    });
    const nextItems = currentItems.filter((_, index) => index !== rawIndex);
    const nextPlaylists = { ...(state.videoPlaylists || {}) };
    if (nextItems.length) nextPlaylists[playlistName] = nextItems;
    else delete nextPlaylists[playlistName];
    state.videoPlaylists = nextPlaylists;
    state.youtubeLibraryBrowseIndex = normalizeYouTubeLibraryBrowseIndex(state.youtubeLibraryBrowseIndex, getSavedYouTubeItemsByView(playlistName));
    persistVideoPlaylists();
    renderMediaGallery();
    return { ok: true, message: `Removed ${view.toLowerCase()} ${oneBased}.` };
}

function removeSavedYouTubeItemsByNumbers(numbers = [], view = getActiveSavedYouTubeViewForVoice()) {
    const playlistName = view === 'Videos' ? 'Videos' : 'Music';
    const visibleItems = getSavedYouTubeItemsByView(playlistName);
    const requested = Array.isArray(numbers)
        ? [...new Set(numbers.map((value) => Math.floor(Number(value))).filter((value) => Number.isFinite(value) && value > 0))]
        : [];
    if (!requested.length) return { ok: false, message: `No ${playlistName.toLowerCase()} items selected.` };

    const removals = requested
        .map((oneBased) => {
            const visibleIndex = oneBased - 1;
            const item = visibleItems[visibleIndex];
            if (!item) return null;
            const rawIndex = findRawSavedYouTubeItemIndex(playlistName, item, visibleIndex);
            if (rawIndex < 0) return null;
            return { oneBased, rawIndex, item };
        })
        .filter(Boolean)
        .sort((a, b) => b.rawIndex - a.rawIndex);

    if (!removals.length) {
        return { ok: false, message: `No matching ${playlistName.toLowerCase()} items.` };
    }

    const rawItems = getRawSavedYouTubeItems(playlistName);
    const removedEntries = removals.map(({ rawIndex, item }) => ({ item, index: rawIndex }));
    const rawIndexes = new Set(removals.map(({ rawIndex }) => rawIndex));
    rememberMediaUndo({
        type: 'youtube-bulk',
        view: playlistName,
        items: removedEntries
    });
    const nextItems = rawItems.filter((_, index) => !rawIndexes.has(index));
    const nextPlaylists = { ...(state.videoPlaylists || {}) };
    if (nextItems.length) nextPlaylists[playlistName] = nextItems;
    else delete nextPlaylists[playlistName];
    state.videoPlaylists = nextPlaylists;
    state.youtubeLibraryBrowseIndex = normalizeYouTubeLibraryBrowseIndex(state.youtubeLibraryBrowseIndex, getSavedYouTubeItemsByView(playlistName));
    persistVideoPlaylists();
    renderMediaGallery();

    const labels = removals
        .map(({ oneBased }) => `#${oneBased}`)
        .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
        .join(', ');
    return {
        ok: true,
        message: `Removed ${playlistName.toLowerCase()} ${labels}.`
    };
}

function normalizeYouTubeLibraryBrowseIndex(index, items = getYouTubeLibraryItems()) {
    if (!Array.isArray(items) || !items.length) return -1;
    const numeric = Number(index);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(items.length - 1, Math.round(numeric)));
}

function isYouTubeLibraryOnlyPanelOpen() {
    const sidePanel = document.getElementById('blip-side-panel');
    return !!sidePanel &&
        sidePanel.style.display !== 'none' &&
        state.currentSidePanelAction === 'youtube' &&
        sidePanel.dataset.youtubeLibraryOnly === '1';
}

function isYouTubeLibraryVoiceContextOpen() {
    const sidePanel = document.getElementById('blip-side-panel');
    const panelHasLibrary = !!sidePanel &&
        sidePanel.style.display !== 'none' &&
        state.currentSidePanelAction === 'youtube' &&
        !!sidePanel.querySelector('[data-yt-play-video][data-yt-index]');
    const mediaLane = normalizeMediaLane(state.mediaStripLane);
    const mediaHasLibrary = state.isMediaStripOpen && ['music', 'videos', 'all'].includes(mediaLane);
    return panelHasLibrary || mediaHasLibrary;
}

function syncYouTubeLibraryBrowseSelection(options = {}) {
    const { scrollIntoView = false } = options;
    const view = getActiveSavedYouTubeViewForVoice();
    const sidePanel = document.getElementById('blip-side-panel');
    const sidePanelButtons = sidePanel
        ? Array.from(sidePanel.querySelectorAll('[data-yt-play-video][data-yt-index]'))
        : [];
    const mediaStripButtons = Array.from(document.querySelectorAll(`.media-strip [data-yt-media-play="${view}"][data-yt-index]`));
    const buttons = sidePanelButtons.length ? sidePanelButtons : mediaStripButtons;
    if (!buttons.length) return false;
    const items = getYouTubeLibraryItems(view);
    const nextIndex = normalizeYouTubeLibraryBrowseIndex(state.youtubeLibraryBrowseIndex, items);
    state.youtubeLibraryBrowseIndex = nextIndex;
    buttons.forEach((button, index) => {
        const active = index === nextIndex;
        button.classList.toggle('active', active);
        button.setAttribute('aria-current', active ? 'true' : 'false');
    });
    const activeButton = buttons[nextIndex];
    if (scrollIntoView && activeButton?.scrollIntoView) {
        activeButton.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
            behavior: 'smooth'
        });
    }
    return !!activeButton;
}

function browseYouTubeLibrary(delta = 1) {
    if (!isYouTubeLibraryVoiceContextOpen()) return { ok: false, message: 'No YouTube list open.' };
    const view = getActiveSavedYouTubeViewForVoice();
    const items = getYouTubeLibraryItems(view);
    if (!items.length) return { ok: false, message: 'That list is empty.' };
    const current = normalizeYouTubeLibraryBrowseIndex(state.youtubeLibraryBrowseIndex, items);
    const nextIndex = (current + delta + items.length) % items.length;
    state.youtubeLibraryBrowseIndex = nextIndex;
    syncYouTubeLibraryBrowseSelection({ scrollIntoView: true });
    const item = items[nextIndex];
    const title = String(item?.title || item?.query || 'Saved video').trim() || 'Saved video';
    return {
        ok: true,
        index: nextIndex,
        total: items.length,
        title,
        message: `${nextIndex + 1} of ${items.length}. ${title}`
    };
}

function deleteSavedYouTubeItemByTitle(title = '', view = state.youtubeLibraryView) {
    const focusName = view === 'Videos' ? 'Videos' : 'Music';
    const currentItems = getRawSavedYouTubeItems(focusName);
    const match = getSavedYouTubeItemMatch(focusName, title);
    if (!match.requested || match.requested.length < 2) return { ok: false, message: 'Say the YouTube title you want to delete.' };
    if (!currentItems.length) return { ok: false, message: `${focusName} is empty.` };
    if (!match.item || match.score < 50) {
        return { ok: false, message: `Could not find "${title}" in ${focusName}.` };
    }

    const rawIndex = findRawSavedYouTubeItemIndex(focusName, match.item, match.index);
    if (rawIndex < 0) return { ok: false, message: `Could not remove "${title}" from ${focusName}.` };
    const removedItem = currentItems[rawIndex];
    rememberMediaUndo({
        type: 'youtube-single',
        view: focusName,
        items: [{ item: removedItem, index: rawIndex }]
    });
    const nextList = currentItems.filter((_, index) => index !== rawIndex);
    const nextPlaylists = { ...(state.videoPlaylists || {}) };
    if (nextList.length) nextPlaylists[focusName] = nextList;
    else delete nextPlaylists[focusName];
    state.videoPlaylists = nextPlaylists;
    state.youtubeLibraryBrowseIndex = normalizeYouTubeLibraryBrowseIndex(state.youtubeLibraryBrowseIndex, getSavedYouTubeItemsByView(focusName));
    persistVideoPlaylists();
    renderMediaGallery();

    const removedTitle = String(removedItem?.title || removedItem?.query || title).trim() || title;
    return { ok: true, message: `Deleted ${removedTitle} from ${focusName}.`, removedTitle };
}

function moveSavedYouTubeItemToPlaylist(request = {}) {
    const targetView = normalizeVideoPlaylistName(request?.targetView || '');
    if (!targetView) return { ok: false, message: 'Tell me where to move it, like Music or Videos.' };

    const candidateViews = [];
    const requestedSource = request?.sourceView ? normalizeVideoPlaylistName(request.sourceView) : '';
    if (requestedSource) candidateViews.push(requestedSource);
    candidateViews.push(getActiveSavedYouTubeViewForVoice());
    ['Music', 'Videos', DEFAULT_VIDEO_PLAYLIST, WATCH_LATER_PLAYLIST].forEach((view) => candidateViews.push(view));
    const uniqueViews = [...new Set(candidateViews.filter(Boolean))];

    let sourceView = '';
    let rawIndex = -1;
    let movedItem = null;
    let matchedTitle = '';

    if (request?.mode === 'number') {
        const index = Math.floor(Number(request.index));
        if (!Number.isFinite(index) || index < 1) return { ok: false, message: 'Say the saved number you want to move.' };
        const preferredView = requestedSource || getActiveSavedYouTubeViewForVoice();
        const visibleItems = getSavedYouTubeItemsByView(preferredView);
        const item = visibleItems[index - 1];
        if (!item) return { ok: false, message: `No ${preferredView.toLowerCase()} item ${index}.` };
        sourceView = preferredView;
        rawIndex = findRawSavedYouTubeItemIndex(sourceView, item, index - 1);
        movedItem = rawIndex >= 0 ? getRawSavedYouTubeItems(sourceView)[rawIndex] : null;
        matchedTitle = String(item?.title || item?.query || '').trim();
    } else {
        const requestedTitle = String(request?.title || '').trim();
        if (!requestedTitle) return { ok: false, message: 'Say the saved title you want to move.' };
        let best = null;
        uniqueViews.forEach((view) => {
            const match = getSavedYouTubeItemMatch(view, requestedTitle);
            if (match?.item && match.score > (best?.score ?? -1)) best = match;
        });
        if (!best?.item || best.score < 50) {
            return { ok: false, message: `I could not find "${requestedTitle}" in your saved music or videos.` };
        }
        sourceView = best.view;
        rawIndex = findRawSavedYouTubeItemIndex(sourceView, best.item, best.index);
        movedItem = rawIndex >= 0 ? getRawSavedYouTubeItems(sourceView)[rawIndex] : null;
        matchedTitle = String(best.item?.title || best.item?.query || requestedTitle).trim();
    }

    if (!sourceView || rawIndex < 0 || !movedItem) {
        return { ok: false, message: 'I could not move that saved item yet.' };
    }

    if (sourceView === targetView) {
        return { ok: true, message: `${matchedTitle || 'That saved item'} is already in ${targetView}.` };
    }

    const sourceItems = getRawSavedYouTubeItems(sourceView);
    const targetItems = getRawSavedYouTubeItems(targetView);
    const duplicateInTarget = targetItems.find((item) => {
        const sameId = movedItem?.videoId && item?.videoId && movedItem.videoId === item.videoId;
        const sameUrl = movedItem?.url && item?.url && movedItem.url === item.url;
        return sameId || sameUrl;
    });

    const nextSourceItems = sourceItems.filter((_, index) => index !== rawIndex);
    const normalizedItem = normalizeSavedVideoEntry(movedItem);
    const nextTargetItems = duplicateInTarget
        ? targetItems
        : [normalizedItem, ...targetItems].slice(0, 80);
    const nextPlaylists = { ...(state.videoPlaylists || {}) };
    if (nextSourceItems.length) nextPlaylists[sourceView] = nextSourceItems;
    else delete nextPlaylists[sourceView];
    if (nextTargetItems.length) nextPlaylists[targetView] = nextTargetItems;
    else delete nextPlaylists[targetView];
    state.videoPlaylists = nextPlaylists;

    if (targetView === 'Music' || targetView === 'Videos') {
        setYouTubeLibraryView(targetView);
        state.youtubeLibraryBrowseIndex = 0;
    } else {
        state.youtubeLibraryBrowseIndex = normalizeYouTubeLibraryBrowseIndex(state.youtubeLibraryBrowseIndex, getSavedYouTubeItemsByView(getActiveSavedYouTubeViewForVoice()));
    }

    persistVideoPlaylists();
    renderMediaGallery();

    const finalTitle = matchedTitle || String(movedItem?.title || movedItem?.query || 'Saved video').trim() || 'Saved video';
    return {
        ok: true,
        message: duplicateInTarget
            ? `${finalTitle} is already in ${targetView}, so I removed it from ${sourceView}.`
            : `Moved ${finalTitle} from ${sourceView} to ${targetView}.`,
        sourceView,
        targetView,
        title: finalTitle
    };
}

function buildYouTubeLibraryHtml(options = {}) {
    const { simple = false, compact = false } = options;
    const useSimpleList = simple || compact;
    const view = state.youtubeLibraryView === 'Videos' ? 'Videos' : 'Music';
    const focusName = view === 'Music' ? 'Music' : 'Videos';
    const focusItems = getYouTubeLibraryItems(view);
    state.youtubeLibraryBrowseIndex = normalizeYouTubeLibraryBrowseIndex(state.youtubeLibraryBrowseIndex, focusItems);
    const focusList = focusItems.length
        ? `
            <div class="blip-yt-recent-label">Saved in ${escapeHtml(focusName)}</div>
            <div class="blip-yt-library-note">${useSimpleList ? 'Say "play music 1", "play video 1", or tap one.' : 'Say "next", "previous", or "scroll down".'}</div>
            <div class="blip-yt-recent-list blip-panel-scroll${useSimpleList ? ' blip-yt-simple-list' : ''}">
              ${focusItems.map((it, index) => {
                  const vid = escapeHtml(String(it?.videoId || ''));
                  const title = escapeHtml(String(it?.title || it?.query || 'Saved video').slice(0, 120));
                  const activeClass = index === state.youtubeLibraryBrowseIndex ? ' active' : '';
                  return `
                      <button
                          type="button"
                          class="${useSimpleList ? 'blip-yt-simple-item' : 'action-link outline blip-yt-video-item'}${activeClass}"
                          data-yt-play-video="${vid}"
                          data-yt-index="${index}"
                          aria-current="${index === state.youtubeLibraryBrowseIndex ? 'true' : 'false'}"
                      >
                          <span class="blip-yt-video-item-index">${index + 1}</span>
                          <span class="blip-yt-video-item-title">${title}</span>
                      </button>
                  `;
              }).join('')}
            </div>
          `
        : `<div class="blip-yt-library-note">No saved ${escapeHtml(focusName.toLowerCase())} yet.</div>`;
    return `
        <div class="blip-yt-library${useSimpleList ? ' blip-yt-library-simple' : ''}${compact ? ' blip-yt-library-compact' : ''}">
            <div class="blip-yt-library-switches${useSimpleList ? ' blip-yt-library-switches-simple' : ''}">
                <button type="button" class="action-link ${view === 'Music' ? 'blue' : 'outline'}" data-yt-library="Music">🎵 Music</button>
                <button type="button" class="action-link ${view === 'Videos' ? 'blue' : 'outline'}" data-yt-library="Videos">🎬 Videos</button>
            </div>
            ${focusList}
        </div>
    `;
}

function downloadTextFile(filename, content, mime = 'application/json') {
    try {
        const blob = new Blob([String(content || '')], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 500);
        return true;
    } catch (_) {
        return false;
    }
}

function getActiveMediaLightboxImageUrl() {
    if (!mediaLightbox?.classList.contains('active')) return '';
    if (mediaLightboxVideo?.style.display !== 'none') return '';
    return String(mediaLightboxImage?.getAttribute('src') || mediaLightboxImage?.src || '').trim();
}

function getActiveMediaLightboxImageItem() {
    if (!mediaLightbox?.classList.contains('active')) return null;
    if (mediaLightboxVideo?.style.display !== 'none') return null;
    if (Number.isFinite(state.activeMediaIndex) && state.activeMediaIndex >= 0) {
        const item = state.mediaItems?.[state.activeMediaIndex] || null;
        if (item?.kind !== 'video') return item;
    }
    return null;
}

function getActiveMediaLightboxFilename() {
    const item = getActiveMediaLightboxImageItem();
    const title = normalizeMediaItemTitle(item || {});
    const base = String(title || 'blip-photo')
        .toLowerCase()
        .replace(/[^\w.-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 64) || 'blip-photo';
    return `${base}.png`;
}

async function getActiveMediaLightboxImageBlob() {
    const imageUrl = getActiveMediaLightboxImageUrl();
    if (!imageUrl) throw new Error('Open a photo first.');
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Could not read that photo.');
    return response.blob();
}

function downloadBlobFile(filename, blob) {
    const safeName = String(filename || 'blip-photo.png').trim() || 'blip-photo.png';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 800);
}

async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            const base64 = result.includes(',') ? result.split(',').pop() : '';
            if (!base64) {
                reject(new Error('Could not encode file.'));
                return;
            }
            resolve(base64);
        };
        reader.onerror = () => reject(new Error('Could not read file.'));
        reader.readAsDataURL(blob);
    });
}

async function getEmailPhotoAttachmentPayload() {
    let item = getActiveMediaLightboxImageItem();
    let blob = null;
    if (item) {
        blob = await getActiveMediaLightboxImageBlob();
    } else {
        item = getLatestImageItemByBucket(MEDIA_BUCKET_SHOTS);
        if (!item?.url) throw new Error('Open a photo first or save one in Media.');
        const response = await fetch(item.url);
        if (!response.ok) throw new Error('Could not read that photo.');
        blob = await response.blob();
    }
    return {
        kind: 'photo',
        subject: normalizeMediaItemTitle(item || {}) || 'Blip photo',
        text: `Photo from Blip: ${normalizeMediaItemTitle(item || {}) || 'Photo'}`,
        attachments: [{
            filename: getActiveMediaLightboxImageItem() ? getActiveMediaLightboxFilename() : `${String(normalizeMediaItemTitle(item || {}) || 'blip-photo').toLowerCase().replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'blip-photo'}.png`,
            mimeType: blob.type || 'image/png',
            contentBase64: await blobToBase64(blob)
        }]
    };
}

async function downloadActiveMediaImage() {
    try {
        const blob = await getActiveMediaLightboxImageBlob();
        downloadBlobFile(getActiveMediaLightboxFilename(), blob);
        return { ok: true, message: 'Photo downloaded.' };
    } catch (error) {
        return { ok: false, message: error?.message || 'Could not download that photo.' };
    }
}

async function shareActiveMediaImage() {
    try {
        const blob = await getActiveMediaLightboxImageBlob();
        const filename = getActiveMediaLightboxFilename();
        const mime = blob.type || 'image/png';
        const file = new File([blob], filename, { type: mime });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({
                title: filename.replace(/\.[^.]+$/, ''),
                files: [file]
            });
            return { ok: true, message: 'Photo shared.' };
        }
        if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
            await navigator.clipboard.write([new ClipboardItem({ [mime]: blob })]);
            return { ok: true, message: 'Photo copied. You can paste it now.' };
        }
        downloadBlobFile(filename, blob);
        return { ok: true, message: 'Share is not available here, so I downloaded the photo instead.' };
    } catch (error) {
        if (String(error?.name || '').toLowerCase() === 'aborterror') {
            return { ok: false, message: 'Share canceled.' };
        }
        return { ok: false, message: error?.message || 'Could not share that photo.' };
    }
}

async function setActiveMediaImageAsWallpaper() {
    try {
        const blob = await getActiveMediaLightboxImageBlob();
        const response = await fetch(`${MEDIA_ACTIONS_BACKEND_URL}/wallpaper`, {
            method: 'POST',
            headers: {
                'Content-Type': blob.type || 'image/png',
                'X-File-Name': getActiveMediaLightboxFilename()
            },
            body: blob
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
            return {
                ok: false,
                message: payload?.message || 'Could not set wallpaper. Start `npm run dev:media-backend` first.'
            };
        }
        return { ok: true, message: payload?.message || 'Wallpaper set.' };
    } catch (error) {
        return {
            ok: false,
            message: 'Could not set wallpaper. Start `npm run dev:media-backend` first.'
        };
    }
}

function exportYouTubePlaylists() {
    const payload = normalizeVideoPlaylists(state.videoPlaylists || {});
    const filename = `blip-youtube-playlists-${new Date().toISOString().slice(0, 10)}.json`;
    return downloadTextFile(filename, JSON.stringify(payload, null, 2));
}

async function importYouTubePlaylistsFromFile(file) {
    if (!file) return { ok: false, message: 'No file selected.' };
    const text = await file.text().catch(() => '');
    if (!text) return { ok: false, message: 'Could not read that file.' };
    try {
        const parsed = JSON.parse(text);
        const next = normalizeVideoPlaylists(parsed);
        state.videoPlaylists = next;
        persistVideoPlaylists();
        return { ok: true, message: 'Playlists imported.' };
    } catch (e) {
        return { ok: false, message: 'Invalid JSON playlist file.' };
    }
}

function deleteYouTubePlaylistByName(name = '') {
    const playlistName = normalizeVideoPlaylistName(name);
    const playlists = state.videoPlaylists && typeof state.videoPlaylists === 'object' ? state.videoPlaylists : {};
    if (!playlists[playlistName]) return { ok: false, message: `No playlist called ${playlistName}.` };
    const next = { ...playlists };
    delete next[playlistName];
    state.videoPlaylists = next;
    persistVideoPlaylists();
    return { ok: true, message: `Deleted ${playlistName}.` };
}

function renameYouTubePlaylist(oldName = '', newName = '') {
    const from = normalizeVideoPlaylistName(oldName);
    const to = normalizeVideoPlaylistName(newName);
    if (!from || !to) return { ok: false, message: 'Missing playlist name.' };
    const playlists = state.videoPlaylists && typeof state.videoPlaylists === 'object' ? state.videoPlaylists : {};
    if (!playlists[from]) return { ok: false, message: `No playlist called ${from}.` };
    const existing = Array.isArray(playlists[to]) ? playlists[to] : [];
    const moved = Array.isArray(playlists[from]) ? playlists[from] : [];
    const next = { ...playlists };
    next[to] = [...moved, ...existing].slice(0, 80);
    delete next[from];
    state.videoPlaylists = next;
    persistVideoPlaylists();
    return { ok: true, message: `Renamed ${from} to ${to}.` };
}

function persistPassiveWakePreference() {
    try { localStorage.setItem('blip_passive_wake_enabled', state.passiveWakeEnabled ? '1' : '0'); } catch (e) { }
}

const SLEEP_BUTTON_LABEL = 'Wake Blip';
const WAKE_PHRASE_HINT = 'Hey Blip / Wake Up Blip / Blip';
const SLEEP_PROMPT_TEXT = "Say 'Hey Blip', 'Wake Up Blip', or 'Blip' to wake me.";
const EXACT_WAKE_ONLY_RE = /^(?:hey\s+blip|wake\s+up\s+blip|wake\s+blip|blip|hi\s+blip|ok(?:ay)?\s+blip|blip\s+wake(?:\s+up)?)$/;
const WAKE_PREFIX_RE = /^(?:hey\s+blip|wake\s+up\s+blip|wake\s+blip|blip|hi\s+blip|ok(?:ay)?\s+blip)\b/;

async function syncPassiveWakePermission() {
    try {
        const status = await navigator?.permissions?.query?.({ name: 'microphone' });
        if (status?.state === 'granted') {
            markPassiveWakePrimed();
            return true;
        }
    } catch (_) {
        return false;
    }
    return false;
}

function markPassiveWakePrimed() {
    if (state.passiveWakePrimed) return;
    state.passiveWakePrimed = true;
    try { localStorage.setItem('blip_passive_wake_primed', '1'); } catch (e) { }
}

function getWakeWordSimilarity(rawToken = '') {
    const token = String(rawToken || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!token) return 0;
    if (token === 'blip') return 1;
    const targets = ['blip', 'blep', 'blib', 'blit', 'blup', 'bleep', 'plip', 'flip', 'clip'];
    let best = 0;
    for (const target of targets) {
        let matches = 0;
        const limit = Math.max(token.length, target.length);
        for (let i = 0; i < Math.min(token.length, target.length); i += 1) {
            if (token[i] === target[i]) matches += 1;
        }
        const lengthPenalty = Math.abs(token.length - target.length) * 0.08;
        const score = Math.max(0, (matches / limit) - lengthPenalty);
        if (score > best) best = score;
    }
    if (/^bl[a-z]{2}$/.test(token)) best = Math.max(best, 0.76);
    if (/^(?:bl|pl|fl|cl)[a-z]{2,3}$/.test(token)) best = Math.max(best, 0.68);
    return Math.min(1, best);
}

function syncWakeReadinessUI() {
    if (!meterBox || !meterLevel || !meterLabel) return;
    let uiState = 'off';
    let label = '';

    if (state.softSleepMode && (state.isListening || state.passiveWakeListening)) {
        uiState = 'sleep-armed';
        label = 'Voice Wake Ready';
    } else if (state.softSleepMode && !state.passiveWakePrimed) {
        uiState = 'sleep-tap';
        label = 'Press Wake Blip Once';
    } else if (state.softSleepMode) {
        uiState = 'sleep-ready';
        label = `Say ${WAKE_PHRASE_HINT}`;
    } else if (!state.isActive && state.passiveWakeEnabled && state.passiveWakeListening) {
        uiState = 'wake-armed';
        label = 'Listening For Blip';
    } else if (!state.isActive && state.passiveWakeEnabled && !state.passiveWakePrimed) {
        uiState = 'wake-tap';
        label = 'Press To Arm Voice';
    } else if (!state.isActive && state.passiveWakeEnabled) {
        uiState = 'wake-ready';
        label = 'Hands-Free Wake Ready';
    }

    meterBox.dataset.state = uiState;
    meterBox.classList.toggle('visible', uiState !== 'off');
    meterLabel.textContent = label || `Say ${WAKE_PHRASE_HINT}`;

    if (!['sleep-armed', 'wake-armed'].includes(uiState)) {
        meterLevel.style.width = ['sleep-ready', 'wake-ready'].includes(uiState) ? '42%' : '22%';
    }
}

function syncSleepButtonUI() {
    if (!sleepBtn) return;
    const resting = !state.isActive || state.softSleepMode;
    sleepBtn.textContent = resting ? 'Wake' : 'Sleep';
    sleepBtn.setAttribute('aria-label', resting ? 'Wake Blip' : 'Put Blip to sleep');
    sleepBtn.classList.toggle('wake-mode', resting);
}

function parseWakePhrase(text = '', options = {}) {
    const normalized = normalizeVoiceTokens(text);
    if (!normalized) return { matched: false, command: '' };
    const cleaned = normalized
        .replace(/[!?.,;:]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const compacted = cleaned.replace(/([a-z])\1{1,}/g, '$1');
    const tokens = cleaned
        .split(/\s+/)
        .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
        .filter(Boolean);
    const compactTokens = compacted
        .split(/\s+/)
        .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
        .filter(Boolean);
    if (!tokens.length || !compactTokens.length) return { matched: false, command: '', score: 0 };

    if (EXACT_WAKE_ONLY_RE.test(cleaned) || EXACT_WAKE_ONLY_RE.test(compacted)) {
        return { matched: true, command: '', score: 1 };
    }

    const directPrefixMatch = cleaned.match(WAKE_PREFIX_RE) || compacted.match(WAKE_PREFIX_RE);
    if (directPrefixMatch) {
        const command = cleaned.slice(directPrefixMatch[0].length).replace(/^[,.:;\-]+\s*/, '').trim();
        return { matched: true, command, score: 1 };
    }

    const starters = new Set(['hey', 'hi', 'okay', 'ok', 'wake']);
    let wakeIndex = 0;
    if (starters.has(compactTokens[0])) {
        wakeIndex = 1;
        if (compactTokens[0] === 'wake' && compactTokens[1] === 'up') wakeIndex = 2;
    }

    const wakeToken = compactTokens[wakeIndex] || '';
    const wakeScore = getWakeWordSimilarity(wakeToken);
    const confidence = Number.isFinite(Number(options.confidence)) ? Number(options.confidence) : 0;
    const hasStarter = wakeIndex > 0 || starters.has(compactTokens[0]);
    // Wake sensitivity tuning:
    // Lower thresholds so users don't need to repeat "Blip" multiple times,
    // while still requiring a wake-like token similarity.
    const threshold = hasStarter
        ? (confidence > 0 ? 0.34 : 0.46)
        : (confidence > 0 ? 0.44 : 0.56);
    if (wakeScore < threshold) return { matched: false, command: '', score: wakeScore };

    const command = tokens.slice(wakeIndex + 1).join(' ').replace(/^[,.:;-]+\s*/, '').trim();
    return { matched: true, command, score: wakeScore };
}

function stopPassiveWakeLoop() {
    if (state.passiveWakeLoopTimer) {
        clearTimeout(state.passiveWakeLoopTimer);
        state.passiveWakeLoopTimer = null;
    }
    if (state.passiveWakeListening) {
        state.passiveWakeListening = false;
        speech.stopListening();
    }
    syncWakeReadinessUI();
}

function shouldRunPassiveWakeLoop() {
    const wantsHandsFreeWake = state.passiveWakeEnabled || state.softSleepMode;
    return !!(
        wantsHandsFreeWake &&
        state.passiveWakePrimed &&
        !state.passiveWakeListening &&
        !state.isThinking &&
        !speech.isSpeaking &&
        !state.activeAlert &&
        !state.isLiveWatch &&
        (!state.isActive || state.softSleepMode)
    );
}

function schedulePassiveWakeLoop(delay = 320) {
    if (state.passiveWakeLoopTimer) clearTimeout(state.passiveWakeLoopTimer);
    if (!shouldRunPassiveWakeLoop()) {
        syncWakeReadinessUI();
        return;
    }
    state.passiveWakeLoopTimer = setTimeout(() => {
        state.passiveWakeLoopTimer = null;
        startPassiveWakeLoop();
    }, delay);
    syncWakeReadinessUI();
}

async function wakeBlipHandsFree(spokenText = '') {
    stopPassiveWakeLoop();
    speech.initAudio?.();
    if (state.idleAmbientEnabled) ensureIdleAmbienceEngine();
    state.isActive = true;
    state.softSleepMode = false;
    state.isThinking = false;
    setRestingEyes(false);
    setPersona('listening');
    triggerWakeRainbowBurst();
    talkBtn.classList.add('active');
    chatEntry.classList.remove('hidden');
    syncChatEngagementState();
    syncWakeReadinessUI();
    syncSleepButtonUI();

    const wakeInfo = parseWakePhrase(spokenText);
    if (wakeInfo.command) {
        transcriptText.innerHTML = `<i style="opacity: 0.7;">🎤 ${spokenText}</i>`;
        await handleCommand(spokenText);
        return;
    }

    transcriptText.innerText = 'I am awake.';
    if (WAKE_GREETING_ENABLED) {
        await speakWithGuard('I am awake.', 'happy');
    }
    resumeListeningAfterWake(220);
}

function startPassiveWakeLoop() {
    if (!speech.SR || !shouldRunPassiveWakeLoop()) return false;
    stopPassiveWakeLoop();
    state.passiveWakeListening = true;
    syncWakeReadinessUI();

    const started = speech.startListening(
        (result) => {
            if (!result?.isFinal) return;
            const wakeInfo = parseWakePhrase(result.text || '', { confidence: result.confidence });
            if (!wakeInfo.matched) return;
            state.passiveWakeListening = false;
            speech.stopListening();
            syncWakeReadinessUI();
            wakeBlipHandsFree(result.text || '').catch((error) => {
                console.warn('Hands-free wake failed:', error?.message || error);
                schedulePassiveWakeLoop(800);
            });
        },
        () => {
            state.passiveWakeListening = false;
            syncWakeReadinessUI();
            if (shouldRunPassiveWakeLoop()) schedulePassiveWakeLoop(260);
        },
        (error) => {
            state.passiveWakeListening = false;
            syncWakeReadinessUI();
            const code = String(error?.error || error?.message || '').toLowerCase();
            if (code.includes('not-allowed') || code.includes('service-not-allowed')) return;
            if (shouldRunPassiveWakeLoop()) schedulePassiveWakeLoop(900);
        }
    );

    if (started) {
        markPassiveWakePrimed();
        syncWakeReadinessUI();
        return true;
    }
    state.passiveWakeListening = false;
    syncWakeReadinessUI();
    return false;
}

function isForegroundMediaPlaying() {
    if (document.visibilityState === 'hidden') return true;
    if (isVideoPanelVisible()) return true;
    const mediaEls = Array.from(document.querySelectorAll('audio, video'));
    return mediaEls.some((el) => {
        if (!el || typeof el.paused !== 'boolean') return false;
        if (el.paused || el.ended) return false;
        if (typeof el.muted === 'boolean' && el.muted) return false;
        const volume = typeof el.volume === 'number' ? el.volume : 1;
        return volume > 0.02;
    });
}

function shouldPlayIdleAmbience() {
    return !!(
        state.idleAmbientEnabled &&
        state.isActive &&
        !state.softSleepMode &&
        !state.isThinking &&
        !speech.isSpeaking &&
        !state.activeAlert &&
        !isForegroundMediaPlaying()
    );
}

function getIdleAmbienceTargetGain() {
    return 0.012 + (state.idleAmbientVolume * 0.06);
}

function rampAudioParam(audioParam, target, duration = 1.4) {
    if (!audioParam || !Number.isFinite(target)) return;
    const now = state.idleAudioCtx?.currentTime || 0;
    const current = Number.isFinite(audioParam.value) ? audioParam.value : 0;
    try {
        audioParam.cancelScheduledValues(now);
        audioParam.setValueAtTime(current, now);
        audioParam.linearRampToValueAtTime(target, now + Math.max(0.05, duration));
    } catch (_) {
        audioParam.value = target;
    }
}

function ensureIdleAmbienceEngine() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!state.idleAudioCtx) state.idleAudioCtx = new Ctor();
    const ctx = state.idleAudioCtx;
    if (state.idleAmbientMasterGain) return ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const padGain = ctx.createGain();
    padGain.gain.value = 0.55;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 880;
    filter.Q.value = 0.18;

    padGain.connect(filter);
    filter.connect(master);

    const voices = [
        { freq: 146.83, type: 'triangle', gain: 0.12, detune: -6 },
        { freq: 220.0, type: 'sine', gain: 0.09, detune: 3 },
        { freq: 293.66, type: 'triangle', gain: 0.07, detune: 8 }
    ].map(({ freq, type, gain, detune }) => {
        const osc = ctx.createOscillator();
        const voiceGain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.detune.value = detune;
        voiceGain.gain.value = gain;
        osc.connect(voiceGain);
        voiceGain.connect(padGain);
        osc.start();
        return { osc, gain: voiceGain };
    });

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.065;
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    state.idleAmbientMasterGain = master;
    state.idleAmbientPadGain = padGain;
    state.idleAmbientFilter = filter;
    state.idleAmbientLfo = lfo;
    state.idleAmbientLfoGain = lfoGain;
    state.idleAmbientVoices = voices;

    return ctx;
}

function playIdleAmbientFx() {
    if (!state.idleAmbientRunning || !state.idleAmbientFxEnabled) return;
    const ctx = ensureIdleAmbienceEngine();
    if (!ctx || !state.idleAmbientMasterGain) return;
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2600;
    osc.type = Math.random() > 0.45 ? 'sine' : 'triangle';
    const base = 520 + (Math.random() * 220);
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * (1.55 + Math.random() * 0.28), now + 1.25);
    const peak = 0.012 + (state.idleAmbientVolume * 0.02);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(state.idleAmbientMasterGain);
    osc.start(now);
    osc.stop(now + 1.45);
}

function playWakeChime() {
    const ctx = ensureIdleAmbienceEngine();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { });
    }

    const now = ctx.currentTime + 0.02;
    const master = ctx.createGain();
    const shimmer = ctx.createBiquadFilter();
    master.gain.value = 0.0001;
    shimmer.type = 'highshelf';
    shimmer.frequency.value = 1800;
    shimmer.gain.value = 4;
    master.connect(shimmer);
    shimmer.connect(ctx.destination);

    const notes = [
        { freq: 392.0, start: 0, dur: 1.35, gain: 0.022, type: 'triangle' },
        { freq: 523.25, start: 0.06, dur: 1.2, gain: 0.02, type: 'sine' },
        { freq: 783.99, start: 0.14, dur: 0.95, gain: 0.013, type: 'sine' }
    ];

    notes.forEach(({ freq, start, dur, gain, type }) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now + start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.08, now + start + (dur * 0.45));
        noteGain.gain.setValueAtTime(0.0001, now + start);
        noteGain.gain.exponentialRampToValueAtTime(gain, now + start + 0.06);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        osc.connect(noteGain);
        noteGain.connect(master);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.04);
    });

    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.95, now + 0.05);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.42);
}

function scheduleIdleAmbientFx() {
    if (state.idleAmbientFxTimer) {
        clearTimeout(state.idleAmbientFxTimer);
        state.idleAmbientFxTimer = null;
    }
    if (!state.idleAmbientRunning || !state.idleAmbientFxEnabled) return;
    const delay = 9000 + Math.random() * 12000;
    state.idleAmbientFxTimer = setTimeout(() => {
        playIdleAmbientFx();
        scheduleIdleAmbientFx();
    }, delay);
}

function stopIdleAmbience({ immediate = false } = {}) {
    state.idleAmbientRunning = false;
    if (state.idleAmbientFxTimer) {
        clearTimeout(state.idleAmbientFxTimer);
        state.idleAmbientFxTimer = null;
    }
    if (!state.idleAmbientMasterGain) return;
    rampAudioParam(state.idleAmbientMasterGain.gain, 0, immediate ? 0.08 : 0.9);
}

function syncIdleAmbience({ immediate = false } = {}) {
    if (!shouldPlayIdleAmbience()) {
        stopIdleAmbience({ immediate });
        return;
    }
    const ctx = ensureIdleAmbienceEngine();
    if (!ctx || !state.idleAmbientMasterGain) return;
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { });
    }
    state.idleAmbientRunning = true;
    rampAudioParam(state.idleAmbientMasterGain.gain, getIdleAmbienceTargetGain(), immediate ? 0.08 : 2.2);
    scheduleIdleAmbientFx();
}

function persistCalendarCache() {
    try { localStorage.setItem(CALENDAR_CACHE_STORAGE_KEY, JSON.stringify(state.calendarCache || [])); } catch (e) { }
}

function persistPendingCalendarEvents() {
    try { localStorage.setItem(CALENDAR_PENDING_STORAGE_KEY, JSON.stringify(state.pendingCalendarEvents || [])); } catch (e) { }
}

function persistPendingCalendarDeletes() {
    try { localStorage.setItem(CALENDAR_PENDING_DELETE_STORAGE_KEY, JSON.stringify(state.pendingCalendarDeletes || [])); } catch (e) { }
}

function persistCalendarDisplayPreferences() {
    try { localStorage.setItem('blip_calendar_display_mode', normalizeCalendarDisplayMode(state.calendarDisplayMode)); } catch (e) { }
    try { localStorage.setItem('blip_calendar_anchor_date', normalizeCalendarAnchorDate(state.calendarAnchorDate).toISOString()); } catch (e) { }
}

function normalizeCachedCalendarEvent(event = {}) {
    const start = event?.start?.dateTime || event?.start?.date || event.start || '';
    const end = event?.end?.dateTime || event?.end?.date || event.end || '';
    return {
        id: String(event.id || `blip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        summary: String(event.summary || event.title || 'Untitled'),
        description: String(event.description || ''),
        start,
        end,
        htmlLink: String(event.htmlLink || event.url || ''),
        reminderMinutes: Math.max(0, Number(event.reminderMinutes || 0) || 0),
        source: event.source === 'pending' ? 'pending' : 'google'
    };
}

function normalizePendingCalendarDelete(entry = {}) {
    const id = String(entry.id || '').trim();
    if (!id) return null;
    return {
        id,
        summary: String(entry.summary || ''),
        start: String(entry.start || ''),
        queuedAt: String(entry.queuedAt || new Date().toISOString())
    };
}

function setCalendarCache(events) {
    const deletedIds = new Set(
        (state.pendingCalendarDeletes || [])
            .map(normalizePendingCalendarDelete)
            .filter(Boolean)
            .map((entry) => entry.id)
    );
    const merged = new Map();
    [...(Array.isArray(events) ? events : []), ...(state.pendingCalendarEvents || [])]
        .map(normalizeCachedCalendarEvent)
        .forEach((event) => {
            if (deletedIds.has(event.id)) return;
            merged.set(event.id, event);
        });
    state.calendarCache = Array.from(merged.values()).sort((a, b) => {
        const aTime = new Date(a.start).getTime();
        const bTime = new Date(b.start).getTime();
        return aTime - bTime;
    });
    persistCalendarCache();
}

function mergeCalendarCache(events) {
    const merged = new Map();
    [...(state.calendarCache || []), ...(Array.isArray(events) ? events : [])]
        .map(normalizeCachedCalendarEvent)
        .forEach((event) => {
            merged.set(event.id, event);
        });
    setCalendarCache(Array.from(merged.values()));
}

function queuePendingCalendarEvent(details) {
    const pending = normalizeCachedCalendarEvent({
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        summary: details.title || details.summary || 'Event',
        description: details.description || '',
        start: details.start,
        end: details.end,
        reminderMinutes: details.reminderMinutes || 0,
        source: 'pending'
    });
    state.pendingCalendarEvents = [...(state.pendingCalendarEvents || []), pending];
    persistPendingCalendarEvents();
    mergeCalendarCache([pending]);
    return pending;
}

function queuePendingCalendarDelete(event) {
    const normalized = normalizeCachedCalendarEvent(event);
    const pendingDelete = normalizePendingCalendarDelete({
        id: normalized.id,
        summary: normalized.summary,
        start: normalized.start
    });
    if (!pendingDelete) return null;
    const nextDeletes = new Map(
        (state.pendingCalendarDeletes || [])
            .map(normalizePendingCalendarDelete)
            .filter(Boolean)
            .map((entry) => [entry.id, entry])
    );
    nextDeletes.set(pendingDelete.id, pendingDelete);
    state.pendingCalendarDeletes = Array.from(nextDeletes.values());
    persistPendingCalendarDeletes();
    removeCalendarEventFromCache(normalized.id);
    return pendingDelete;
}

function removePendingCalendarEventById(eventId) {
    state.pendingCalendarEvents = (state.pendingCalendarEvents || []).filter((event) => event.id !== eventId);
    persistPendingCalendarEvents();
    state.calendarCache = (state.calendarCache || []).filter((event) => event.id !== eventId);
    persistCalendarCache();
}

function clearPendingCalendarDeleteById(eventId) {
    state.pendingCalendarDeletes = (state.pendingCalendarDeletes || [])
        .map(normalizePendingCalendarDelete)
        .filter((entry) => entry && entry.id !== eventId);
    persistPendingCalendarDeletes();
}

function updatePendingCalendarEventById(eventId, updates = {}) {
    let changed = false;
    state.pendingCalendarEvents = (state.pendingCalendarEvents || []).map((event) => {
        if (event.id !== eventId) return event;
        changed = true;
        return normalizeCachedCalendarEvent({ ...event, ...updates, source: 'pending' });
    });
    if (changed) {
        persistPendingCalendarEvents();
        setCalendarCache(state.calendarCache.map((event) => event.id === eventId ? { ...event, ...updates, source: 'pending' } : event));
    }
    return changed;
}

function removeCalendarEventFromCache(eventId) {
    state.calendarCache = (state.calendarCache || []).filter((event) => event.id !== eventId);
    persistCalendarCache();
}

function setCalendarDisplayMode(mode) {
    state.calendarDisplayMode = normalizeCalendarDisplayMode(mode);
    persistCalendarDisplayPreferences();
}

function setCalendarAnchorDate(value) {
    const anchor = normalizeCalendarAnchorDate(value);
    state.calendarAnchorDate = anchor.toISOString();
    persistCalendarDisplayPreferences();
    return anchor;
}

function upsertCalendarEventInCache(event) {
    mergeCalendarCache([event]);
}

function normalizeCalendarLookupText(value) {
    return String(value || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findCalendarEventsByTitle(query) {
    const needle = normalizeCalendarLookupText(query);
    if (!needle) return [];
    return (state.calendarCache || []).filter((event) => {
        const hay = normalizeCalendarLookupText(event.summary || '');
        return hay.includes(needle) || needle.includes(hay);
    });
}

function formatCalendarAuthStatus(authState) {
    const pendingCount = (state.pendingCalendarEvents || []).length;
    if (authState.backendConfigured && authState.connected) {
        return {
            text: pendingCount
                ? `Backend Google Calendar connected. ${pendingCount} event${pendingCount === 1 ? '' : 's'} waiting to sync.`
                : 'Backend Google Calendar connected.',
            tone: 'connected'
        };
    }
    if (authState.backendConfigured) {
        return {
            text: pendingCount
                ? `Backend Google Calendar ready. Press Connect Calendar to sign in and sync ${pendingCount} pending event${pendingCount === 1 ? '' : 's'}.`
                : 'Backend Google Calendar ready. Press Connect Calendar to sign in.',
            tone: 'warning'
        };
    }
    if (!authState.hasClientId) {
        return {
            text: 'Paste your Google OAuth Client ID here, then press Connect Calendar.',
            tone: 'warning'
        };
    }
    if (authState.connected) {
        return {
            text: pendingCount
                ? `Google Calendar connected. ${pendingCount} event${pendingCount === 1 ? '' : 's'} waiting to sync.`
                : 'Google Calendar connected for this browser session.',
            tone: 'connected'
        };
    }
    return {
        text: pendingCount
            ? `Client ID saved. Press Connect Calendar to sign in and sync ${pendingCount} pending event${pendingCount === 1 ? '' : 's'}.`
            : 'Client ID saved. Press Connect Calendar to sign in with Google.',
        tone: ''
    };
}

function updateCalendarAuthUi(authState = getGoogleCalendarAuthState()) {
    if (googleCalendarClientIdInput && googleCalendarClientIdInput.value !== state.googleCalendarClientId) {
        googleCalendarClientIdInput.value = state.googleCalendarClientId;
    }

    if (calendarAuthStatus) {
        const status = formatCalendarAuthStatus(authState);
        calendarAuthStatus.textContent = status.text;
        calendarAuthStatus.classList.remove('connected', 'warning');
        if (status.tone) calendarAuthStatus.classList.add(status.tone);
    }

    if (connectCalendarBtn) {
        connectCalendarBtn.disabled = !authState.backendConfigured && !state.googleCalendarClientId.trim();
        connectCalendarBtn.textContent = authState.connected ? 'Reconnect Calendar' : 'Connect Calendar';
    }

    if (disconnectCalendarBtn) {
        disconnectCalendarBtn.disabled = !authState.connected;
    }
}

function formatGmailAuthStatus(authState = getGoogleGmailAuthState()) {
    if (authState.backendConfigured && authState.connected) {
        return {
            text: authState.email
                ? `Backend Gmail connected as ${authState.email}.`
                : 'Backend Gmail connected.',
            tone: 'connected'
        };
    }
    if (authState.backendConfigured) {
        return {
            text: 'Backend Gmail ready. Press Connect Gmail to sign in.',
            tone: 'warning'
        };
    }
    return {
        text: 'Start the Gmail backend first, then press Connect Gmail.',
        tone: 'warning'
    };
}

function updateGmailAuthUi(authState = getGoogleGmailAuthState()) {
    if (gmailAuthStatus) {
        const status = formatGmailAuthStatus(authState);
        gmailAuthStatus.textContent = status.text;
        gmailAuthStatus.classList.remove('connected', 'warning');
        if (status.tone) gmailAuthStatus.classList.add(status.tone);
    }

    if (connectGmailBtn) {
        connectGmailBtn.disabled = !authState.backendConfigured;
        connectGmailBtn.textContent = authState.connected ? 'Reconnect Gmail' : 'Connect Gmail';
    }

    if (openGmailInboxBtn) {
        openGmailInboxBtn.disabled = !authState.connected;
    }

    if (disconnectGmailBtn) {
        disconnectGmailBtn.disabled = !authState.connected;
    }
}

function applyDisplayLumaProfile(profile) {
    const normalized = normalizeDisplayLuma(profile);
    state.displayLuma = normalized;
    document.body.setAttribute('data-display-luma', normalized);
    if (displayLumaSelect) displayLumaSelect.value = normalized;
    persistDisplayLuma();
}

function syncUsageTierControls() {
    if (usageTierSelect) usageTierSelect.value = normalizeUsageTier(state.usageTier);
    if (voiceEngineSelect) voiceEngineSelect.value = state.voiceEngine;
    if (modelSelect) modelSelect.value = state.selectedModel;
    if (imageModelSelect) imageModelSelect.value = state.imageModel;
    if (imageEngineSelect) imageEngineSelect.value = state.imageEngine || 'gemini';
    if (comfyuiBaseUrlInput) comfyuiBaseUrlInput.value = state.comfyuiBaseUrl || 'http://127.0.0.1:8188';
    if (comfyuiCheckpointInput) comfyuiCheckpointInput.value = state.comfyuiCheckpoint || '';
    if (comfyuiUrlGroup) comfyuiUrlGroup.style.display = state.imageEngine === 'comfyui' ? '' : 'none';
    if (displayLumaSelect) displayLumaSelect.value = normalizeDisplayLuma(state.displayLuma);
    syncVoiceEngineUi();
}

function applyUsageTier(tier, options = {}) {
    const normalizedTier = normalizeUsageTier(tier);
    const preset = getUsageTierPreset(normalizedTier);
    const preserveManual = options.preserveManual === true;

    state.usageTier = normalizedTier;
    if (!preserveManual) {
        state.selectedModel = preset.selectedModel;
        if (!state.voiceEngineOverridden) {
            state.voiceEngine = preset.voiceEngine;
            state.voiceEngineOverrideSource = 'tier';
        }
        state.imageModel = preset.imageModel;
    }

    syncUsageTierControls();
    syncVoiceEngineUi();
    persistUsageTierState();
}
// V4.3.4 - The Deep UI & Animation Restoration

// ── PERSONA CONFIGURATION (V3.4.0) ───────────────────────────────────────────
/** Reusable face animation states: add one to #face-container to run. Nose is included where appropriate. */
const FACE_ANIMATIONS = [
    'face-anim-wiggle', 'face-anim-bounce', 'face-anim-pulse', 'face-anim-blink',
    'face-anim-nod', 'face-anim-shake', 'face-anim-float', 'face-anim-glow',
    'face-anim-sniff', 'face-anim-sway'
];
let wakeRainbowTimer = null;
let emotionShowcaseTimer = null;
let emotionShowcaseResumeTimer = null;

const PERSONAS = {
    idle: { emoji: "✨", label: "BLIP", color: "#818cf8", emotion: "serious" },
    listening: { emoji: "👂", label: "LISTENING", color: "#f43f5e", emotion: "surprised" },
    thinking: { emoji: "🧠", label: "THINKING", color: "#8b5cf6", emotion: "thinking" },
    happy: { emoji: "😊", label: "HAPPY", color: "#10b981", emotion: "happy" },
    sad: { emoji: "😢", label: "SAD", color: "#64748b", emotion: "sad" },
    angry: { emoji: "🔥", label: "ANGRY", color: "#fb7185", emotion: "angry" },
    serious: { emoji: "🧊", label: "SERIOUS", color: "#8ec5ff", emotion: "serious" },
    despair: { emoji: "😰", label: "DESPAIR", color: "#475569", emotion: "despair" },
    warning: { emoji: "⚠️", label: "ALERT", color: "#f59e0b", emotion: "serious" },
    sleepy: { emoji: "💤", label: "SLEEPY", color: "#334155", emotion: "sleepy" },
    cooking: { emoji: "👨‍🍳", label: "CHEF MODE", color: "#fb923c", emotion: "gentle" },
    study: { emoji: "📚", label: "STUDY MODE", color: "#3b82f6", emotion: "serious" },
    media: { emoji: "🎬", label: "MEDIA", color: "#ef4444", emotion: "excited" },
    advice: { emoji: "💡", label: "ADVISOR", color: "#eab308", emotion: "gentle" }
};

function injectAppStyle(id, cssText) {
    let style = document.getElementById(id);
    if (!style) {
        style = document.createElement('style');
        style.id = id;
        document.head.appendChild(style);
    }
    style.textContent = cssText;
}

// ── UI: INITIALIZATION ───────────────────────────────────────────────────────
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
        const hasMicPermission = await syncPassiveWakePermission();
        if (state.passiveWakeEnabled && (state.passiveWakePrimed || hasMicPermission)) {
            schedulePassiveWakeLoop(1200);
        }
        syncWakeReadinessUI();
        window.addEventListener('focus', () => {
            if ((!state.isActive || state.softSleepMode) && !speech.isSpeaking) {
                schedulePassiveWakeLoop(180);
            }
            syncWakeReadinessUI();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && (!state.isActive || state.softSleepMode) && !speech.isSpeaking) {
                schedulePassiveWakeLoop(220);
            }
            syncWakeReadinessUI();
        });
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
            syncUsageTierControls();
            syncVoiceEngineUi();
            voiceEngineSelect.addEventListener('change', () => {
                state.voiceEngine = voiceEngineSelect.value;
                state.voiceEngineOverridden = true;
                state.voiceEngineOverrideSource = 'manual';
                persistUsageTierState();
                syncVoiceEngineUi();
                updateVoiceToggles();
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
        if (weatherKeyInput) weatherKeyInput.value = state.weatherApiKey;
        if (googleCalendarClientIdInput) googleCalendarClientIdInput.value = state.googleCalendarClientId;
        await initGoogleCalendar();
        setGoogleCalendarClientId(state.googleCalendarClientId);
        onGoogleCalendarAuthStateChange((authState) => {
            updateCalendarAuthUi(authState);
        });
        updateCalendarAuthUi();
        await emailFeature.initBackend();
        await telegramFeature.initBackend();
        syncUsageTierControls();
        if (usageTierSelect) {
            usageTierSelect.onchange = () => {
                applyUsageTier(usageTierSelect.value);
            };
        }
        if (modelSelect) {
            modelSelect.onchange = () => {
                state.selectedModel = modelSelect.value;
                persistUsageTierState();
            };
        }
        if (imageModelSelect) {
            imageModelSelect.onchange = () => {
                state.imageModel = imageModelSelect.value;
                persistUsageTierState();
            };
        }
        if (imageEngineSelect) {
            imageEngineSelect.onchange = () => {
                state.imageEngine = imageEngineSelect.value || 'gemini';
                if (comfyuiUrlGroup) comfyuiUrlGroup.style.display = state.imageEngine === 'comfyui' ? '' : 'none';
                persistUsageTierState();
            };
        }
        if (comfyuiBaseUrlInput) {
            comfyuiBaseUrlInput.value = state.comfyuiBaseUrl || 'http://127.0.0.1:8188';
            const syncComfyuiUrl = () => {
                state.comfyuiBaseUrl = (comfyuiBaseUrlInput.value || 'http://127.0.0.1:8188').trim();
                persistUsageTierState();
            };
            comfyuiBaseUrlInput.oninput = syncComfyuiUrl;
            comfyuiBaseUrlInput.onchange = syncComfyuiUrl;
        }
        if (comfyuiCheckpointInput) {
            comfyuiCheckpointInput.value = state.comfyuiCheckpoint || '';
            const syncComfyuiCheckpoint = () => {
                state.comfyuiCheckpoint = normalizeComfyuiCheckpointName(comfyuiCheckpointInput.value || '');
                persistUsageTierState();
            };
            comfyuiCheckpointInput.oninput = syncComfyuiCheckpoint;
            comfyuiCheckpointInput.onchange = syncComfyuiCheckpoint;
        }
        if (displayLumaSelect) {
            displayLumaSelect.onchange = () => {
                applyDisplayLumaProfile(displayLumaSelect.value);
            };
        }
        if (idleWeatherLocationInput) {
            idleWeatherLocationInput.value = state.idleWeatherLocation;
            const syncIdleWeatherLocation = () => {
                state.idleWeatherLocation = idleWeatherLocationInput.value.trim();
                persistIdleWeatherLocation();
            };
            const saveIdleWeatherLocation = () => {
                syncIdleWeatherLocation();
                state.lastIdleWeatherFetchAt = 0;
                refreshIdleWeatherScene({ force: true });
            };
            idleWeatherLocationInput.oninput = syncIdleWeatherLocation;
            idleWeatherLocationInput.onchange = saveIdleWeatherLocation;
            idleWeatherLocationInput.onblur = saveIdleWeatherLocation;
        }
        if (idleMusicToggle) {
            idleMusicToggle.checked = !!state.idleAmbientEnabled;
            idleMusicToggle.onchange = () => {
                state.idleAmbientEnabled = !!idleMusicToggle.checked;
                persistIdleAudioPreferences();
                syncIdleAmbience({ immediate: true });
            };
        }
        if (idleFxToggle) {
            idleFxToggle.checked = !!state.idleAmbientFxEnabled;
            idleFxToggle.onchange = () => {
                state.idleAmbientFxEnabled = !!idleFxToggle.checked;
                persistIdleAudioPreferences();
                syncIdleAmbience({ immediate: true });
            };
        }
        if (passiveWakeToggle) {
            passiveWakeToggle.checked = !!state.passiveWakeEnabled;
            passiveWakeToggle.onchange = async () => {
                state.passiveWakeEnabled = !!passiveWakeToggle.checked;
                persistPassiveWakePreference();
                if (state.passiveWakeEnabled) {
                    await syncPassiveWakePermission();
                    schedulePassiveWakeLoop(500);
                }
                else stopPassiveWakeLoop();
            };
        }
        applyDisplayLumaProfile(state.displayLuma);

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
        const saveWeatherKey = (e) => {
            if (!weatherKeyInput) return;
            state.weatherApiKey = e.target.value.trim();
            localStorage.setItem('blip_weather_key', state.weatherApiKey);
            console.log('🔐 Weather API key updated');
        };
        const saveGoogleCalendarClientId = (e) => {
            if (!googleCalendarClientIdInput) return;
            state.googleCalendarClientId = e.target.value.trim();
            localStorage.setItem('blip_google_calendar_client_id', state.googleCalendarClientId);
            setGoogleCalendarClientId(state.googleCalendarClientId);
            updateCalendarAuthUi();
            console.log('📅 Google Calendar Client ID updated');
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
        if (weatherKeyInput) {
            weatherKeyInput.oninput = saveWeatherKey;
            weatherKeyInput.onchange = saveWeatherKey;
            weatherKeyInput.onblur = saveWeatherKey;
        }
        if (googleCalendarClientIdInput) {
            googleCalendarClientIdInput.oninput = saveGoogleCalendarClientId;
            googleCalendarClientIdInput.onchange = saveGoogleCalendarClientId;
            googleCalendarClientIdInput.onblur = saveGoogleCalendarClientId;
        }
        if (connectCalendarBtn) {
            connectCalendarBtn.onclick = async () => {
                try {
                    await connectGoogleCalendar();
                    const synced = await syncPendingCalendarEvents();
                    const imported = await syncGoogleCalendarIntoBlip().catch((error) => {
                        console.warn('Initial Google Calendar import failed:', error?.message || error);
                        return { count: 0 };
                    });
                    await refreshOpenCalendarPanel();
                    if (transcriptText) {
                        const parts = ['Google Calendar connected.'];
                        if (synced > 0) {
                            parts.push(`Synced ${synced} pending event${synced === 1 ? '' : 's'}.`);
                        }
                        if (Number(imported?.count || 0) > 0) {
                            parts.push(`Loaded ${imported.count} Google event${imported.count === 1 ? '' : 's'} into Blip Calendar.`);
                        }
                        transcriptText.innerText = parts.join(' ');
                    }
                } catch (error) {
                    console.warn('Google Calendar connect failed:', error?.message || error);
                    if (transcriptText) transcriptText.innerText = error?.message || 'Could not connect Google Calendar.';
                } finally {
                    updateCalendarAuthUi();
                }
            };
        }
        if (disconnectCalendarBtn) {
            disconnectCalendarBtn.onclick = async () => {
                try {
                    await disconnectGoogleCalendar();
                    if (transcriptText) transcriptText.innerText = 'Google Calendar disconnected.';
                } catch (error) {
                    console.warn('Google Calendar disconnect failed:', error?.message || error);
                    if (transcriptText) transcriptText.innerText = error?.message || 'Could not disconnect Google Calendar.';
                } finally {
                    updateCalendarAuthUi();
                }
            };
        }
        emailFeature.bindSettingsControls();
        telegramFeature.bindSettingsControls();

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
        if (idleSoundVolumeInput && idleSoundVolumeValue) {
            const pct = Math.round(state.idleAmbientVolume * 100);
            const step = Math.min(100, Math.max(10, Math.round(pct / 5) * 5));
            state.idleAmbientVolume = clampIdleAmbientVolume(step / 100);
            idleSoundVolumeInput.value = step;
            idleSoundVolumeValue.textContent = step + '%';
            const saveIdleVolume = () => {
                const val = parseInt(idleSoundVolumeInput.value, 10);
                state.idleAmbientVolume = clampIdleAmbientVolume(val / 100);
                persistIdleAudioPreferences();
                idleSoundVolumeValue.textContent = val + '%';
                syncIdleAmbience({ immediate: true });
            };
            idleSoundVolumeInput.oninput = saveIdleVolume;
            idleSoundVolumeInput.onchange = saveIdleVolume;
        }

        // Standardized Voice Engine Toggles (simplified)
        updateVoiceToggles();

        function updateVoiceToggles() {
            const kItem = document.getElementById('kokoro-voice-item');
            const gItem = document.getElementById('gemini-voice-item');
            if (kItem) kItem.style.display = state.voiceEngine === 'kokoro' ? 'block' : 'none';
            if (gItem) gItem.style.display = state.voiceEngine === 'gemini' ? 'block' : 'none';
        }

        // Check Kokoro status and update its dot
        updateKokoroStatus();                          // immediate check (async, non-blocking)
        setInterval(updateKokoroStatus, 15000);        // re-check every 15s

        // Randomized Idle Personality (V3.1.0)
        setInterval(() => {
            if (!state.isActive || state.isThinking || speech.isSpeaking || state.activeAlert) return;

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
            if (!state.isActive || state.activeAlert || face?.classList.contains('resting-eyes') || state.currentEmotion === 'surprised') return;
            const eyes = document.querySelectorAll('.eye');
            eyes.forEach(e => e.style.height = '2px');
            setTimeout(() => {
                eyes.forEach(e => e.style.height = '14px');
            }, 150);
        }, 4000);

        // Build capability planets around Blip.
        registerExtraSceneryObjects();

        // Start Living Scenery Systems
        startSceneryTracking();
        startSceneryDirector();
        window.addEventListener('resize', startSceneryDirector);

        // Floating Symbols
        setInterval(() => {
            if (!state.isActive) return;
            if (state.activeAlert) return;
            if (state.softSleepMode || face?.classList.contains('resting-eyes')) return;

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
            if (e.key === 'Escape') {
                if (mediaLightbox && mediaLightbox.classList.contains('active')) {
                    closeMediaLightbox();
                    return;
                }
                setMode('core');
            }
        });

        // Initial Mode
        setMode('core');
        setRestingEyes(true);
        ensureWeatherSceneNodes();
        setWeatherScene('clear');
        startIdleWeatherRefreshLoop();
        startWeatherDisplayTicker();
        refreshIdleWeatherScene({ force: true });
        applyBlipPersonalization();
        applyFaceScale();
        syncSleepButtonUI();

        talkBtn.onclick = toggleApp;
        if (sleepBtn) {
            sleepBtn.onclick = async () => {
                if (state.softSleepMode || !state.isActive) {
                    await toggleApp();
                } else {
                    await enterSoftSleepMode('Wake me up if you need me.');
                }
            };
        }
        if (cameraBtn) cameraBtn.onclick = () => { if (state.cameraStream) exitVisionMode(); else startCamera(); };
        if (snapBtn) {
            snapBtn.onclick = async () => {
                const ok = await capturePhotoWhenReady();
                if (!ok) transcriptText.innerText = "Camera warming up. Try again.";
            };
        }
        if (recordBtn) {
            recordBtn.onclick = async () => {
                if (!state.cameraStream) {
                    await startCamera();
                }
                if (!state.cameraStream) return;
                if (isVideoRecording()) {
                    const stopped = await stopVideoRecording();
                    if (stopped) transcriptText.innerText = 'Video saved.';
                } else {
                    const started = await startVideoRecording();
                    transcriptText.innerText = started ? 'Recording video...' : 'Video recording unavailable.';
                }
            };
        }
        if (stopCameraBtn) stopCameraBtn.onclick = () => exitVisionMode();
        if (watchBtn) watchBtn.onclick = toggleLiveWatch;
        if (uploadBtn && fileInput) {
            uploadBtn.onclick = () => fileInput.click();
            fileInput.onchange = handleFileUpload;
        }
        if (clearImageBtn) clearImageBtn.onclick = clearPendingImage;
        if (saveToHubBtn) saveToHubBtn.onclick = saveCurrentVisionToHub;
        if (mediaBtn) mediaBtn.onclick = () => toggleMediaGallery(null, 'all');
        if (creationsBtn) {
            creationsBtn.onclick = () => {
                if (isCreationsPanelOpen()) {
                    closeSidePanel();
                    return;
                }
                openCreationsPanel();
            };
        }
        if (closeMediaStripBtn) {
            closeMediaStripBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleMediaGallery(false);
            };
        }
        if (mediaStripTabs) {
            mediaStripTabs.querySelectorAll('[data-media-lane]').forEach((btn) => {
                btn.onclick = () => {
                    const lane = normalizeMediaLane(btn.getAttribute('data-media-lane'));
                    if (lane === 'music') setYouTubeLibraryView('Music');
                    if (lane === 'videos') setYouTubeLibraryView('Videos');
                    toggleMediaGallery(true, lane);
                };
            });
        }
        if (closeMediaBtn) closeMediaBtn.onclick = () => toggleMediaGallery(false);
        if (closeMediaLightboxBtn) closeMediaLightboxBtn.onclick = closeMediaLightbox;
        if (shareMediaLightboxBtn) {
            shareMediaLightboxBtn.onclick = async () => {
                const result = await shareActiveMediaImage();
                if (transcriptText) transcriptText.innerText = result.message;
            };
        }
        if (downloadMediaLightboxBtn) {
            downloadMediaLightboxBtn.onclick = async () => {
                const result = await downloadActiveMediaImage();
                if (transcriptText) transcriptText.innerText = result.message;
            };
        }
        if (wallpaperMediaLightboxBtn) {
            wallpaperMediaLightboxBtn.onclick = async () => {
                const result = await setActiveMediaImageAsWallpaper();
                if (transcriptText) transcriptText.innerText = result.message;
            };
        }
        if (mediaLightbox) {
            mediaLightbox.onclick = (e) => {
                if (e.target === mediaLightbox) closeMediaLightbox();
            };
        }
        syncMediaLightboxActionButtons();
        if (hubBtn) hubBtn.onclick = toggleHub;
        if (notesBtn) notesBtn.onclick = toggleNotesPanel;
        if (emailBtn) {
            emailBtn.onclick = async () => {
                if (state.currentSidePanelAction === 'gmail' && isSidePanelVisible()) {
                    closeSidePanel();
                    if (transcriptText) transcriptText.innerText = 'Email closed.';
                    return;
                }
                try {
                    await emailFeature.openInboxPanel({ summary: 'Email open.' });
                    if (transcriptText) transcriptText.innerText = 'Email open.';
                } catch (error) {
                    console.warn('Open Email tool failed:', error?.message || error);
                    openSettingsPanel();
                    emailFeature.updateGmailAuthUi();
                    if (transcriptText) transcriptText.innerText = error?.message || 'Connect Gmail in Settings first.';
                }
            };
        }
        if (telegramBtn) {
            telegramBtn.onclick = async () => {
                if (state.currentSidePanelAction === 'telegram' && isSidePanelVisible()) {
                    closeSidePanel();
                    state.pendingTelegramReview = false;
                    if (transcriptText) transcriptText.innerText = 'Telegram closed.';
                    return;
                }
                try {
                    await telegramFeature.openPanel({ summary: 'Telegram open.' });
                    state.pendingTelegramReview = true;
                    if (transcriptText) transcriptText.innerText = 'Telegram open.';
                } catch (error) {
                    console.warn('Open Telegram tool failed:', error?.message || error);
                    openSettingsPanel();
                    telegramFeature.updateTelegramAuthUi();
                    if (transcriptText) transcriptText.innerText = error?.message || 'Start Telegram in Settings first.';
                }
            };
        }
        if (closeHubBtn) closeHubBtn.onclick = toggleHub;
        if (gamesBtn) gamesBtn.onclick = toggleLearningGames;
        if (closeGamesBtn) closeGamesBtn.onclick = toggleLearningGames;
        if (cartBtn) cartBtn.onclick = toggleCart;
        if (closeCartBtn) closeCartBtn.onclick = toggleCart;
        if (closeMapBtn) closeMapBtn.onclick = () => setMode('core');

        // Appliance UI Toggles
        gearBtn.onclick = () => {
            if (isSettingsPanelOpen()) closeSettingsPanel();
            else openSettingsPanel();
        };
        closePanelBtn.onclick = () => closeSettingsPanel();
        document.getElementById('ui-debug-refresh-btn')?.addEventListener('click', refreshUiDebugDump);

        // Chart Toggles
        if (closeChartBtn) closeChartBtn.onclick = () => setMode('core');
        if (downloadChartBtn) downloadChartBtn.onclick = downloadChart;
        if (saveChartBtn) {
            saveChartBtn.onclick = () => {
                const saved = saveCurrentCreationToGallery();
                transcriptText.innerText = saved ? 'Saved to media.' : 'No graph or design open.';
            };
        }
        if (calendarBtn) {
            calendarBtn.onclick = async () => {
                if (closeCalendarPanel()) {
                    if (transcriptText) transcriptText.innerText = 'Calendar closed.';
                    return;
                }
                try {
                    const result = await showCalendarOverview({ label: 'upcoming' });
                    if (transcriptText) transcriptText.innerText = result?.text || 'Showing your Blip Calendar.';
                } catch (error) {
                    console.warn('Calendar button failed:', error?.message || error);
                    if (transcriptText) transcriptText.innerText = error?.message || 'Could not open Blip Calendar.';
                }
            };
        }

        // Scenery Orbit (V4.3.1)

        chatBtn.onclick = () => toggleChatEntry();

        sendChatBtn.onclick = () => {
            syncChatEngagementState(true);
            postChat();
        };
        chatInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                postChat();
            }
        };
        chatInput.addEventListener('focus', () => syncChatEngagementState(true));
        chatInput.addEventListener('input', () => syncChatEngagementState());
        chatInput.addEventListener('blur', () => setTimeout(() => syncChatEngagementState(), 0));

        renderHub();
        renderCart();
        initLearningGames();
        persistMediaGallery();
        renderMediaGallery();
        restorePersistedTimers();
        startTimerCornerTicker();
        updateRecordButtonUI();
    } catch (err) {
        console.error('❌ Critical Initialization Error:', err);
        if (typeof transcriptText !== 'undefined' && transcriptText) {
            transcriptText.innerHTML = `<span style="color:#f43f5e">⚠️ System Error: ${err.message}. Please refresh.</span>`;
        }
    }
}

// ── UI: MODE CONTROLLER (V4.3.0) ─────────────────────────────────────────────
function setMode(mode) {
    console.log(`🎭 Switching to mode: ${mode}`);
    if (mode !== 'settings' && isSettingsPanelOpen()) {
        closeSettingsPanel();
    }
    state.currentMode = mode;
    document.body.setAttribute('data-mode', mode || 'core');
    if (mode !== 'media') closeMediaLightbox();
    const appContainer = document.querySelector('.container');

    // Hide all panels first
    const panels = [chartContainer, mapContainer, underTheHood];
    panels.forEach(p => { if (p) p.classList.remove('active'); });
    if (underTheHood) {
        underTheHood.style.display = 'none';
        underTheHood.style.pointerEvents = 'none';
    }
    if (hubContainer) hubContainer.style.display = 'none';
    if (gamesContainer) gamesContainer.style.display = 'none';
    if (cartContainer) cartContainer.style.display = 'none';
    if (mediaContainer) mediaContainer.style.display = 'none';
    if (cameraControls) cameraControls.style.display = 'none';

    // Show specific panel based on mode
    switch (mode) {
        case 'hub':
            if (hubContainer) hubContainer.style.display = 'flex';
            renderHub();
            break;
        case 'games':
            if (gamesContainer) gamesContainer.style.display = 'flex';
            renderLearningGamesPanel();
            break;
        case 'cart':
            if (cartContainer) cartContainer.style.display = 'flex';
            renderCart();
            break;
        case 'media':
            if (mediaContainer) mediaContainer.style.display = 'flex';
            renderMediaGallery();
            break;
        case 'chart':
            chartContainer.classList.add('active');
            setTimeout(() => chartContainer?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }), 50);
            break;
        case 'map':
            mapContainer.classList.add('active');
            setTimeout(() => mapContainer?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }), 50);
            break;
        case 'settings': underTheHood.classList.add('active'); break;
        case 'vision': cameraControls.style.display = 'flex'; break;
        default:
            // Core mode
            if (cameraControls) cameraControls.style.display = 'none';
            stopCamera({ keepTranscript: true });
            break;
    }

    // Full-browser layout uses fixed-height container. Enable scroll only when a panel needs vertical room.
    if (appContainer) {
        const allowPanelScroll = mode === 'map' || mode === 'chart' || mode === 'settings' || mode === 'hub' || mode === 'games' || mode === 'media' || state.isMediaStripOpen;
        appContainer.style.overflowY = allowPanelScroll ? 'auto' : 'hidden';
        appContainer.style.overflowX = 'hidden';
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

function syncChatEngagementState(forceValue = null) {
    const engaged = typeof forceValue === 'boolean'
        ? forceValue
        : !!(
            state.isActive &&
            chatEntry &&
            !chatEntry.classList.contains('hidden') &&
            (
                document.activeElement === chatInput ||
                !!chatInput?.value?.trim() ||
                state.isThinking
            )
        );
    state.chatEngaged = engaged;
    if (blipStage) blipStage.setAttribute('data-chat-engaged', engaged ? 'true' : 'false');
}

/**
 * 📝 Text Communication Handler
 */
async function postChat() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Fix: Initialize audio context on user gesture so cloud voice can play
    if (speech.initAudio) speech.initAudio();
    markPassiveWakePrimed();

    chatInput.value = '';
    syncChatEngagementState();
    // chatEntry.classList.add('hidden'); // Removed auto-hide so it stays visible while awake

    // Switch to thinking state
    setPersona('thinking');
    syncChatEngagementState(true);
    transcriptText.innerHTML = `<i style="opacity: 0.7;">💬 ${text}</i>`;

    await handleCommand(text);
    syncChatEngagementState();
}

// ── VISION LOGIC ─────────────────────────────────────────────────────────────
function waitForVideoReady(videoEl, timeoutMs = 1800) {
    if (!videoEl) return Promise.resolve(false);
    if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) return Promise.resolve(true);
    return new Promise((resolve) => {
        let done = false;
        const finish = (ok) => {
            if (done) return;
            done = true;
            videoEl.removeEventListener('loadedmetadata', onReady);
            videoEl.removeEventListener('canplay', onReady);
            clearTimeout(timer);
            resolve(ok);
        };
        const onReady = () => finish(true);
        const timer = setTimeout(() => finish(false), timeoutMs);
        videoEl.addEventListener('loadedmetadata', onReady, { once: true });
        videoEl.addEventListener('canplay', onReady, { once: true });
    });
}

async function startCamera() {
    if (state.cameraStream && webcamVideo?.srcObject) {
        if (webcamVideo) webcamVideo.style.display = 'block';
        if (cameraBtn) cameraBtn.style.display = 'none';
        setMode('vision');
        updateRecordButtonUI();
        transcriptText.innerText = "Camera on. Say snap photo or record video.";
        return true;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
        transcriptText.innerText = "Camera isn't available in this browser.";
        setEmotion('sad');
        if (state.isActive) startListeningLoop();
        return false;
    }
    try {
        setEmotion('curious');
        transcriptText.innerText = "Opening my eyes...";

        // Pause listening while camera is open
        speech.stopListening();

        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        state.cameraStream = stream;
        if (webcamVideo) {
            webcamVideo.muted = true;
            webcamVideo.playsInline = true;
            webcamVideo.srcObject = stream;
            webcamVideo.style.display = 'block';
            try { await webcamVideo.play?.(); } catch (_) { }
            await waitForVideoReady(webcamVideo);
        }
        setMode('vision');
        if (cameraBtn) cameraBtn.style.display = 'none'; // Hide camera icon while open
        updateRecordButtonUI();

        transcriptText.innerText = "Camera on. Say snap photo or record video.";
        return true;
    } catch (err) {
        console.error("Camera error:", err);
        transcriptText.innerText = "I couldn't open my eyes. Check camera permissions!";
        setEmotion('sad');
        if (state.isActive) startListeningLoop(); // Resume if failed
        return false;
    }
}

function stopCamera(options = {}) {
    const { keepTranscript = false, transcript = "Camera closed.", resumeListening = true } = options;
    if (isVideoRecording()) {
        try { state.mediaRecorder.stop(); } catch (_) { }
    }
    if (state.liveInterval) {
        clearInterval(state.liveInterval);
        state.liveInterval = null;
    }
    state.isLiveWatch = false;
    state.liveFrames = [];
    if (watchBtn) watchBtn.classList.remove('active');
    if (liveIndicator) liveIndicator.style.display = 'none';
    if (state.cameraStream) {
        state.cameraStream.getTracks().forEach(track => track.stop());
        state.cameraStream = null;
    }
    if (webcamVideo) {
        try { webcamVideo.pause?.(); } catch (_) { }
        webcamVideo.srcObject = null;
        webcamVideo.style.display = 'none';
    }
    if (cameraControls) cameraControls.style.display = 'none';
    if (cameraBtn) cameraBtn.style.display = 'block';
    if (visionPreviewContainer) visionPreviewContainer.style.display = state.pendingImage ? 'block' : 'none';
    updateRecordButtonUI();
    setEmotion('serious');
    if (!keepTranscript) transcriptText.innerText = transcript;

    // Resume listening if Blip is still active
    if (resumeListening && state.isActive && !state.isThinking && !speech.isSpeaking) startListeningLoop();
}

function capturePhoto() {
    if (!state.cameraStream || !webcamVideo || !captureCanvas) return false;
    if (!webcamVideo.videoWidth || !webcamVideo.videoHeight) return false;

    const ctx = captureCanvas.getContext('2d');
    if (!ctx) return false;
    captureCanvas.width = webcamVideo.videoWidth;
    captureCanvas.height = webcamVideo.videoHeight;
    ctx.drawImage(webcamVideo, 0, 0);

    const base64 = captureCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    if (!base64) return false;
    setPendingImage(base64);
    addSnapshotToGallery(base64, 'camera');

    exitVisionMode({ keepTranscript: true, resumeListening: false });
    setEmotion('happy');
    transcriptText.innerText = "I got it! Now, what would you like to know about this?";
    return true;
}

async function capturePhotoWhenReady() {
    if (!state.cameraStream) {
        const started = await startCamera();
        if (!started) return false;
    }
    const ready = await waitForVideoReady(webcamVideo, 2200);
    if (!ready || !webcamVideo?.videoWidth || !webcamVideo?.videoHeight) return false;
    return capturePhoto();
}

function exitVisionMode(options = {}) {
    const appContainer = document.querySelector('.container');
    stopCamera(options);
    state.currentMode = 'core';
    if (cameraControls) cameraControls.style.display = 'none';
    if (appContainer) {
        appContainer.style.overflowY = 'hidden';
        appContainer.style.overflowX = 'hidden';
    }
    document.body.setAttribute('data-mode', 'core');
}

/** Video Brain V3.0.0 */
function toggleLiveWatch() {
    state.isLiveWatch = !state.isLiveWatch;
    if (watchBtn) watchBtn.classList.toggle('active', state.isLiveWatch);
    if (liveIndicator) liveIndicator.style.display = state.isLiveWatch ? 'block' : 'none';
    if (visionPreviewContainer) visionPreviewContainer.style.display = state.isLiveWatch ? 'block' : (state.pendingImage ? 'block' : 'none');

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
    if (!state.cameraStream || !webcamVideo || !captureCanvas) return;

    const ctx = captureCanvas.getContext('2d');
    if (!ctx) return;
    captureCanvas.width = 160; // Tiny for performance
    captureCanvas.height = 120;
    ctx.drawImage(webcamVideo, 0, 0, 160, 120);

    const base64 = captureCanvas.toDataURL('image/jpeg', 0.5).split(',')[1];
    state.liveFrames.push({ data: base64, mimeType: 'image/jpeg' });

    if (state.liveFrames.length > 5) state.liveFrames.shift(); // Keep last 5 frames

    // Update preview bubble with latest
    if (visionPreview) visionPreview.src = `data:image/jpeg;base64,${base64}`;
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
            if (visionPreview) visionPreview.src = 'https://cdn-icons-png.flaticon.com/512/1179/1179069.png';
            transcriptText.innerText = "Video clip loaded! Analyzing the movement...";
        } else {
            setPendingImage(base64);
            addSnapshotToGallery(base64, 'upload');
            transcriptText.innerText = "Got the photo! Ask me anything about it.";
        }

        if (visionPreviewContainer) visionPreviewContainer.style.display = 'block';
        setEmotion('happy');
    };
    reader.readAsDataURL(file);
}

function setPendingImage(base64) {
    state.pendingImage = base64;
    if (visionPreview) visionPreview.src = `data:image/jpeg;base64,${base64}`;
    if (visionPreviewContainer) visionPreviewContainer.style.display = 'block';
}

function clearPendingImage() {
    state.pendingImage = null;
    if (visionPreviewContainer) visionPreviewContainer.style.display = 'none';
    if (visionPreview) visionPreview.src = '';
    if (fileInput) fileInput.value = '';
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
            stopPassiveWakeLoop();
            // 🎙️ VITAL: Initialize AudioContext on the user gesture
            speech.initAudio();
            markPassiveWakePrimed();
            if (state.idleAmbientEnabled) ensureIdleAmbienceEngine();

            state.softSleepMode = false;
            setRestingEyes(false);
            setPersona('listening');
            triggerWakeRainbowBurst();
            talkBtn.classList.add('active');
            chatEntry.classList.remove('hidden'); // Show chat entry automatically on wake
            syncChatEngagementState();
            syncSleepButtonUI();
            transcriptText.innerText = 'I am awake.';
            if (WAKE_GREETING_ENABLED) {
                await speakWithGuard('I am awake.', 'happy');
            }
            if (state.isActive && !state.isThinking) startListeningLoop();
        } catch (err) {
            console.error("Wake up error:", err);
            state.isActive = false;
            talkBtn.classList.remove('active');
            chatEntry.classList.add('hidden');
            syncSleepButtonUI();
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
    dismissActiveAlert({ resumeListening: false, clearVisual: true });
    speech.stopSpeaking?.();
    speech.stopListening();

    talkBtn.classList.add('active');
    setPersona('idle');
    document.body.classList.remove('projecting-visual');
    transcriptText.innerHTML = '<span style="color:#f88">🛑 Interrupted.</span>';
    startListeningLoop();
}

function stopApp() {
    if (emotionShowcaseResumeTimer) {
        clearTimeout(emotionShowcaseResumeTimer);
        emotionShowcaseResumeTimer = null;
    }
    state.isActive = false;
    state.softSleepMode = false;
    state.isListening = false;
    dismissActiveAlert({ resumeListening: false, clearVisual: true });
    resetBlipConversationMemory();
    document.body.classList.remove('reduce-motion');
    clearPendingImage();
    stopCamera();
    speech.stopListening();
    speech.stopSpeaking?.();

    talkBtn.classList.remove('active');
    chatEntry.classList.add('hidden'); // Hide chat entry on sleep
    syncChatEngagementState(false);
    setPersona('idle');
    setRestingEyes(true);
    document.body.classList.remove('projecting-visual');
    talkBtn.innerText = SLEEP_BUTTON_LABEL;
    transcriptText.innerText = SLEEP_PROMPT_TEXT;
    syncScenerySuppression();
    schedulePassiveWakeLoop(500);
    syncWakeReadinessUI();
    syncSleepButtonUI();
}

async function enterSoftSleepMode(message = SLEEP_PROMPT_TEXT) {
    state.softSleepMode = true;
    state.isThinking = false;
    stopListening();
    closeEverythingPanels();
    document.body.classList.remove('thinking-mode');
    face.classList.remove('thinking', 'listening');
    faceFrame?.classList.remove('listening-glow');
    setRestingEyes(false);
    setPersona('sleepy');
    talkBtn.classList.remove('listening', 'thinking', 'active');
    talkBtn.innerText = SLEEP_BUTTON_LABEL;
    transcriptText.innerHTML = `<b>Blip:</b> ${message}`;
    state.history.push({ user: '(system)', blip: message });
    if (state.history.length > HISTORY_MAX) state.history.shift();
    try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
    await speakWithGuard(message, 'sleepy');
    setPersona('sleepy');
    setRestingEyes(true);
    talkBtn.classList.remove('listening', 'thinking', 'active');
    talkBtn.innerText = SLEEP_BUTTON_LABEL;
    if (state.isActive && !speech.isSpeaking) {
        startListeningLoop();
    } else {
        schedulePassiveWakeLoop(500);
    }
    syncWakeReadinessUI();
    syncSleepButtonUI();
}

const GMAIL_VOICE_MERGE_FLUSH_MS = 850;
const GMAIL_VOICE_MERGE_WINDOW_MS = 2200;

function inActiveGmailDraftFlow() {
    if (state.currentSidePanelAction !== 'gmail') return false;
    if (state.pendingEmailReview) return true;
    const d = state.gmailComposeDraft || {};
    return !!(String(d.to || '').trim()
        || String(d.subject || '').trim()
        || String(d.text || '').trim()
        || String(d.recipientQuery || '').trim());
}

function looksLikeCompleteGmailUtterance(text) {
    const t = String(text || '').trim();
    if (!t) return false;
    if (t.length > 72) return true;
    if (/[\w.-]+@[\w.-]+\.\w+/.test(t)) return true;
    if (/^subject\s+/i.test(t)) return true;
    if (/[.!?]$/.test(t)) return true;
    if (/^no subject$/i.test(t)) return true;
    return false;
}

function isGmailImmediateVoiceCommand(text) {
    const t = normalizeVoiceTokens(String(text || '')).trim();
    if (!t) return true;
    if (looksLikeCompleteGmailUtterance(text)) return true;
    return /^(send|send it|send now|yes|no|ok|okay|go ahead|go on|never mind|nevermind|forget it|cancel|stop|no subject|correct|change it)$/i.test(t)
        || /^(okay you can send it|you can send it|please send)$/i.test(t)
        || /^(undo|scratch that|take that back|oops)$/i.test(t);
}

function clearGmailVoiceMergeState() {
    if (state.gmailVoiceMergeTimer) {
        clearTimeout(state.gmailVoiceMergeTimer);
        state.gmailVoiceMergeTimer = null;
    }
    state.gmailVoiceMergeBuffer = '';
    state.gmailVoiceMergeWindowUntil = 0;
}

function flushGmailVoiceMergeBufferSync() {
    if (state.gmailVoiceMergeTimer) {
        clearTimeout(state.gmailVoiceMergeTimer);
        state.gmailVoiceMergeTimer = null;
    }
    const full = state.gmailVoiceMergeBuffer;
    state.gmailVoiceMergeBuffer = '';
    state.gmailVoiceMergeWindowUntil = 0;
    return String(full || '').trim();
}

function scheduleGmailVoiceMerge(cmdRaw, onVoiceError) {
    const trimmed = String(cmdRaw || '').trim();
    if (!trimmed) return;
    if (looksLikeCompleteGmailUtterance(trimmed)) {
        const pending = flushGmailVoiceMergeBufferSync();
        (async () => {
            try {
                if (pending) await handleCommand(pending);
                await handleCommand(trimmed);
            } catch (error) {
                onVoiceError?.(error);
            }
        })();
        return;
    }
    clearTimeout(state.gmailVoiceMergeTimer);
    const now = Date.now();
    if (state.gmailVoiceMergeBuffer && now < state.gmailVoiceMergeWindowUntil) {
        state.gmailVoiceMergeBuffer = `${state.gmailVoiceMergeBuffer} ${trimmed}`.trim();
    } else {
        state.gmailVoiceMergeBuffer = trimmed;
    }
    state.gmailVoiceMergeWindowUntil = now + GMAIL_VOICE_MERGE_WINDOW_MS;
    state.gmailVoiceMergeTimer = setTimeout(() => {
        state.gmailVoiceMergeTimer = null;
        state.gmailVoiceMergeWindowUntil = 0;
        const full = state.gmailVoiceMergeBuffer;
        state.gmailVoiceMergeBuffer = '';
        if (full) {
            handleCommand(full).catch((error) => onVoiceError?.(error));
        }
    }, GMAIL_VOICE_MERGE_FLUSH_MS);
}

function startListeningLoop() {
    if (!state.isActive || state.isThinking || state.emotionShowcaseActive) return;
    stopPassiveWakeLoop();
    if (speech.isSpeaking && state.lastSpeechStartedAt && (Date.now() - state.lastSpeechStartedAt > 45000)) {
        console.warn('⚠️ Stale speaking state detected. Resetting speech flags.');
        speech.isSpeaking = false;
        state.lastSpeechStartedAt = 0;
        speech.stopSpeaking?.();
        animateMouth(0);
    }

    if (state.softSleepMode) {
        setPersona('sleepy');
        setRestingEyes(true);
        face.classList.remove('listening');
        faceFrame?.classList.remove('listening-glow');
        talkBtn.classList.remove('thinking', 'listening', 'active');
        talkBtn.innerText = SLEEP_BUTTON_LABEL;
    } else {
        setPersona('listening');
        setRestingEyes(false);
        face.classList.add('listening');
        faceFrame?.classList.add('listening-glow');
        talkBtn.classList.remove('thinking');
        talkBtn.classList.add('active', 'listening');
        talkBtn.innerText = 'Ask Blip';
    }
    face.classList.remove('thinking');
    state.isListening = true;
    syncChatEngagementState();
    syncScenerySuppression();
    syncWakeReadinessUI();

    const listeningStarted = speech.startListening(
        // On Result
        (result) => {
            if (speech.isSpeaking) {
                stopListening();
                return;
            }
            if (state.softSleepMode && !result.isFinal) return;
            transcriptText.innerHTML = `<i style="opacity: 0.7;">🎤 ${result.text}</i>`;
            if (result.isFinal) {
                const normalizedHeard = normalizeVoiceTokens(result.text);
                const normalizedLastSpoken = normalizeVoiceTokens(state.lastSpokenText || '');
                const heardOwnPrompt = normalizedHeard &&
                    normalizedLastSpoken &&
                    normalizedHeard === normalizedLastSpoken &&
                    state.lastSpokenFinishedAt &&
                    (Date.now() - state.lastSpokenFinishedAt) < 8000;
                if (heardOwnPrompt) {
                    transcriptText.innerHTML = `<i style="opacity: 0.7;">🎤 Ignored self-echo: ${result.text}</i>`;
                    return;
                }
                const systemCmd = getSystemVoiceCommand(result.text);
                if (state.softSleepMode) {
                    const wakePhrase = parseWakePhrase(result.text, { confidence: result.confidence });
                    if (systemCmd !== 'wake' && !wakePhrase.matched) {
                        transcriptText.innerText = SLEEP_PROMPT_TEXT;
                        setPersona('sleepy');
                        setRestingEyes(true);
                        return;
                    }
                }
                if (!systemCmd) setPersona('thinking');
                const onVoiceFailure = (error) => {
                    console.warn('Voice command failed:', error?.message || error);
                    state.isThinking = false;
                    if (state.isActive && !state.softSleepMode) {
                        setPersona('listening');
                        setRestingEyes(false);
                        talkBtn.classList.add('active');
                        talkBtn.classList.remove('thinking');
                        talkBtn.innerText = 'Ask Blip';
                    }
                    syncWakeReadinessUI();
                    if (transcriptText) {
                        transcriptText.innerText = error?.message || 'That command failed.';
                    }
                    if (state.isActive && !speech.isSpeaking && !state.softSleepMode) {
                        startListeningLoop();
                    }
                };
                if (inActiveGmailDraftFlow() && isGmailImmediateVoiceCommand(result.text)) {
                    const pending = flushGmailVoiceMergeBufferSync();
                    (async () => {
                        try {
                            if (pending) await handleCommand(pending);
                            await handleCommand(result.text);
                        } catch (error) {
                            onVoiceFailure(error);
                        }
                    })();
                } else if (inActiveGmailDraftFlow()) {
                    scheduleGmailVoiceMerge(result.text, onVoiceFailure);
                } else {
                    handleCommand(result.text).catch(onVoiceFailure);
                }
            }
        },
        // On End
        () => {
            state.isListening = false;
            syncScenerySuppression();
            syncWakeReadinessUI();
            if (state.isActive && !state.isThinking && !speech.isSpeaking) {
                setTimeout(startListeningLoop, 300);
            }
        },
        // On Error
        (err) => {
            state.isListening = false;
            syncScenerySuppression();
            syncWakeReadinessUI();
            console.warn('Recognition error:', err);
            if (err.error === 'not-allowed') {
                stopApp();
                transcriptText.innerText = '⚠️ Microphone blocked.';
                return;
            }
            if (state.isActive && !state.isThinking && !speech.isSpeaking) {
                setTimeout(() => {
                    if (!state.isActive || state.isThinking || speech.isSpeaking) return;
                    startListeningLoop();
                }, err?.error === 'no-speech' ? 250 : 700);
            }
        }
    );
    if (listeningStarted) {
        markPassiveWakePrimed();
        return;
    }

    state.isListening = false;
    syncScenerySuppression();
    syncWakeReadinessUI();
    if (!speech.SR && transcriptText && state.isActive) {
        transcriptText.innerText = 'Voice recognition is not supported in this browser. Try Chrome or Edge over HTTPS.';
        return;
    }
    if (state.isActive && !state.isThinking && !speech.isSpeaking) {
        setTimeout(() => {
            if (state.isActive && !state.isThinking && !speech.isSpeaking) {
                startListeningLoop();
            }
        }, 450);
    }
}

function stopListening() {
    state.isListening = false;
    speech.stopListening();
    syncScenerySuppression();
    syncWakeReadinessUI();
    if ((!state.isActive || state.softSleepMode) && !speech.isSpeaking) schedulePassiveWakeLoop(350);
}

function normalizeHatStyle(value) {
    const v = String(value || '').toLowerCase().trim();
    if (['none', 'off', 'remove'].includes(v)) return 'none';
    if (['cap', 'hat'].includes(v)) return 'cap';
    if (['beanie'].includes(v)) return 'beanie';
    if (['crown'].includes(v)) return 'crown';
    return BLIP_DEFAULT_PERSONALIZATION.hat;
}

function normalizeGlassesStyle(value) {
    const v = String(value || '').toLowerCase().trim();
    if (['none', 'off', 'remove'].includes(v)) return 'none';
    if (['round', 'glasses', 'glass'].includes(v)) return 'round';
    if (['visor'].includes(v)) return 'visor';
    return BLIP_DEFAULT_PERSONALIZATION.glasses;
}

function normalizeEyeColor(value) {
    const v = String(value || '').toLowerCase().trim();
    return BLIP_EYE_COLOR_MAP[v] ? v : BLIP_DEFAULT_PERSONALIZATION.eyeColor;
}

function normalizeAuraColor(value) {
    const v = String(value || '').toLowerCase().trim();
    return BLIP_AURA_COLOR_MAP[v] ? v : BLIP_DEFAULT_PERSONALIZATION.auraColor;
}

function ensureBlipAccessories() {
    if (!face) return;
    if (!face.querySelector('.blip-accessory-hat')) {
        const hat = document.createElement('div');
        hat.className = 'blip-accessory-hat';
        face.appendChild(hat);
    }
    if (!face.querySelector('.blip-accessory-glasses')) {
        const glasses = document.createElement('div');
        glasses.className = 'blip-accessory-glasses';
        const bridge = document.createElement('span');
        bridge.className = 'bridge';
        glasses.appendChild(bridge);
        face.appendChild(glasses);
    }
}

function persistBlipPersonalization() {
    try {
        localStorage.setItem(BLIP_PERSONALIZATION_STORAGE_KEY, JSON.stringify(state.personalization));
    } catch (_) { }
}

function applyBlipPersonalization() {
    if (!face) return;
    if (!ENABLE_BLIP_PERSONALIZATION) {
        face.classList.remove('style-hat-cap', 'style-hat-beanie', 'style-hat-crown', 'style-glasses-round', 'style-glasses-visor');
        face.style.setProperty('--blip-eye-color', BLIP_EYE_COLOR_MAP.white);
        document.documentElement.style.setProperty('--blip-aura-core', BLIP_AURA_COLOR_MAP.default.core);
        document.documentElement.style.setProperty('--blip-aura-mid', BLIP_AURA_COLOR_MAP.default.mid);
        return;
    }
    ensureBlipAccessories();

    const p = state.personalization || { ...BLIP_DEFAULT_PERSONALIZATION };
    const hat = normalizeHatStyle(p.hat);
    const glasses = normalizeGlassesStyle(p.glasses);
    const eyeColor = normalizeEyeColor(p.eyeColor);
    const auraColor = normalizeAuraColor(p.auraColor);
    state.personalization = { hat, glasses, eyeColor, auraColor };

    face.classList.remove('style-hat-cap', 'style-hat-beanie', 'style-hat-crown', 'style-glasses-round', 'style-glasses-visor');
    if (hat !== 'none') face.classList.add(`style-hat-${hat}`);
    if (glasses !== 'none') face.classList.add(`style-glasses-${glasses}`);

    face.style.setProperty('--blip-eye-color', BLIP_EYE_COLOR_MAP[eyeColor] || BLIP_EYE_COLOR_MAP.white);
    const auraPreset = BLIP_AURA_COLOR_MAP[auraColor] || BLIP_AURA_COLOR_MAP.default;
    document.documentElement.style.setProperty('--blip-aura-core', auraPreset.core);
    document.documentElement.style.setProperty('--blip-aura-mid', auraPreset.mid);
}

function updateBlipPersonalization(partial = {}) {
    if (!ENABLE_BLIP_PERSONALIZATION) return { ...BLIP_DEFAULT_PERSONALIZATION };
    state.personalization = {
        ...BLIP_DEFAULT_PERSONALIZATION,
        ...(state.personalization || {}),
        ...partial
    };
    state.personalization.hat = normalizeHatStyle(state.personalization.hat);
    state.personalization.glasses = normalizeGlassesStyle(state.personalization.glasses);
    state.personalization.eyeColor = normalizeEyeColor(state.personalization.eyeColor);
    state.personalization.auraColor = normalizeAuraColor(state.personalization.auraColor);
    applyBlipPersonalization();
    persistBlipPersonalization();
    return state.personalization;
}

function applyFaceScale() {
    if (!faceContainer) return;
    const safeScale = Math.min(1.45, Math.max(0.72, Number(state.faceScale) || 1));
    state.faceScale = safeScale;
    faceContainer.style.transform = `scale(${safeScale.toFixed(2)})`;
    faceContainer.style.transformOrigin = 'center center';
}

function setFaceScale(nextScale) {
    const safeScale = Math.min(1.45, Math.max(0.72, Number(nextScale) || 1));
    state.faceScale = safeScale;
    applyFaceScale();
    try { localStorage.setItem('blip_face_scale', String(safeScale)); } catch (e) { }
    return safeScale;
}

function scrollActiveSurface(direction = 'down') {
    const delta = direction === 'up' ? -320 : 320;
    const sidePanel = document.getElementById('blip-side-panel');
    const appContainer = document.querySelector('.container');
    const calendarOrbBody = sidePanel?.querySelector('.blip-calendar-orb-body') || document.querySelector('.blip-calendar-orb-body');
    const calendarBody = sidePanel?.querySelector('.blip-calendar-body') || document.querySelector('.blip-calendar-body');
    const youtubeLibraryList = sidePanel?.dataset.youtubeLibraryOnly === '1'
        ? sidePanel.querySelector('.blip-yt-recent-list')
        : null;
    const sidePanelScrollables = sidePanel
        ? Array.from(sidePanel.querySelectorAll('.blip-panel-scroll, .panel-content, .blip-panel-body'))
        : [];
    const settingsPanelContent = underTheHood?.querySelector('.panel-content');
    const candidates = [
        calendarOrbBody,
        calendarBody,
        youtubeLibraryList,
        ...sidePanelScrollables,
        settingsPanelContent,
        sidePanel,
        mapContainer,
        chartContainer,
        hubMessages,
        underTheHood,
        mediaStrip,
        createdStripList,
        mediaStripList,
        mediaContainer,
        appContainer,
        document.scrollingElement
    ];
    for (const el of candidates) {
        if (!el || typeof el.scrollBy !== 'function') continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const canScrollY = el.scrollHeight > el.clientHeight + 8;
        const canScrollX = el.scrollWidth > el.clientWidth + 12;
        if (canScrollY) {
            el.scrollBy({ top: delta, behavior: 'smooth' });
            return true;
        }
        if (canScrollX) {
            el.scrollBy({ left: delta, behavior: 'smooth' });
            return true;
        }
    }
    if (typeof window.scrollBy === 'function') {
        window.scrollBy({ top: delta, behavior: 'smooth' });
        return true;
    }
    return false;
}

function isCalendarScrollContextActive() {
    const sidePanel = document.getElementById('blip-side-panel');
    const calendarBody = sidePanel?.querySelector('.blip-calendar-orb-body, .blip-calendar-body')
        || document.querySelector('.blip-calendar-orb-body, .blip-calendar-body');
    if (!calendarBody) return false;
    const style = window.getComputedStyle(calendarBody);
    return style.display !== 'none' && style.visibility !== 'hidden';
}

function stopAutoScroll() {
    if (state.autoScrollTimer) {
        clearInterval(state.autoScrollTimer);
        state.autoScrollTimer = null;
    }
    state.autoScrollDirection = '';
}

function startAutoScroll(direction = 'down') {
    stopAutoScroll();
    const stepDirection = direction === 'up' ? 'up' : 'down';
    state.autoScrollDirection = stepDirection;
    state.autoScrollTimer = setInterval(() => {
        const ok = scrollActiveSurface(stepDirection);
        if (!ok) stopAutoScroll();
    }, 760);
}

function mergeTextParts(...parts) {
    return parts
        .map((part) => (typeof part === 'string' ? part.trim() : ''))
        .filter(Boolean)
        .join(' ')
        .trim();
}

function getIsDay(data = {}) {
    const location = String(data.city || data.location || '').toLowerCase();
    const home = BLIP_HOME_LOCATION.toLowerCase();
    if (!location || location.includes(home) || home.includes(location)) {
        const hour = new Date().getHours();
        return (hour >= 6 && hour < 20); // 6am to 8pm is day
    }
    return data.isDay !== false;
}

function getWeatherDisplayIcon(desc = '', isDay = true) {
    const lower = normalizeVoiceTokens(desc);
    if (/(storm|thunder)/.test(lower)) return '⛈️';
    if (/(rain|shower|drizzle|sleet)/.test(lower)) return '🌧️';
    if (/(snow|ice|blizzard)/.test(lower)) return '❄️';
    if (/(wind|breezy|gust)/.test(lower)) return '💨';
    if (/(cloud|overcast|mist|fog|haze)/.test(lower)) return '☁️';
    return isDay ? '☀️' : '🌙';
}

function formatOffsetClock(offsetSeconds) {
    if (!Number.isFinite(Number(offsetSeconds))) return '';
    const now = new Date(Date.now() + (Number(offsetSeconds) * 1000));
    const h = String(now.getUTCHours()).padStart(2, '0');
    const m = String(now.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

function formatOffsetCalendarDate(offsetSeconds) {
    if (!Number.isFinite(Number(offsetSeconds))) return '';
    const now = new Date(Date.now() + (Number(offsetSeconds) * 1000));
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
    }).format(now);
}

function getLiveWeatherLocalDateTime(data = {}) {
    const raw = String(data.localTime || '').trim();
    const fetchTime = Number(data.fetchTime);
    if (!raw || !Number.isFinite(fetchTime)) return null;

    const match = raw.match(/(?:(\d{4})-(\d{1,2})-(\d{1,2}))?\s*(\d{1,2})[:.](\d{2})\s*(AM|PM)?/i);
    if (!match) return null;

    const now = new Date();
    const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, ampmRaw] = match;
    const year = yearRaw ? Number(yearRaw) : now.getFullYear();
    const monthIndex = monthRaw ? (Number(monthRaw) - 1) : now.getMonth();
    const day = dayRaw ? Number(dayRaw) : now.getDate();
    let hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    const ampm = ampmRaw ? ampmRaw.toUpperCase() : '';

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    const initial = new Date(year, monthIndex, day, hour, minute, 0, 0);
    if (Number.isNaN(initial.getTime())) return null;

    const elapsedMs = Math.max(0, Date.now() - fetchTime);
    return {
        date: new Date(initial.getTime() + elapsedMs),
        hasExplicitDate: Boolean(yearRaw && monthRaw && dayRaw)
    };
}

function getWeatherDisplayLocalTime(data = {}) {
    const timezoneOffset = Number(data.timezoneOffset);
    if (Number.isFinite(timezoneOffset)) return formatOffsetClock(timezoneOffset);

    // Fallback: If it's the home location or no location provided, use current client time
    const location = String(data.city || data.location || '').toLowerCase();
    const home = BLIP_HOME_LOCATION.toLowerCase();
    if (!location || location.includes(home) || home.includes(location)) {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    }

    const localTimeStr = String(data.localTime || '').trim();
    if (!localTimeStr) return '';

    try {
        const live = getLiveWeatherLocalDateTime(data);
        if (live?.date) {
            const displayH = String(live.date.getHours()).padStart(2, '0');
            const displayM = String(live.date.getMinutes()).padStart(2, '0');
            return `${displayH}:${displayM}`;
        }
    } catch (e) {
        console.warn('Failed to calculate live local time:', e);
    }

    return localTimeStr;
}

function getWeatherDisplayLocalDate(data = {}) {
    const timezoneOffset = Number(data.timezoneOffset);
    if (Number.isFinite(timezoneOffset)) return formatOffsetCalendarDate(timezoneOffset);

    const live = getLiveWeatherLocalDateTime(data);
    if (live?.date && live.hasExplicitDate) {
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(live.date);
    }

    const raw = String(data.localTime || '').trim();
    if (!raw) return '';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(parsed);
}

function renderWeatherDisplay(data = {}) {
    if (!weatherDisplay) return;
    const city = escapeHtml(String(data.city || data.location || 'Weather').trim() || 'Weather');
    const desc = escapeHtml(String(data.desc || data.condition || '').trim() || 'Current conditions');
    const tempNumber = Number(data.temp);
    const temp = Number.isFinite(tempNumber) ? `${Math.round(tempNumber)}°C` : '--';
    const humidityNumber = Number(data.humidity);
    const humidity = Number.isFinite(humidityNumber) ? `${Math.round(humidityNumber)}% humidity` : '';
    const localTimeRaw = getWeatherDisplayLocalTime(data);
    const localTime = localTimeRaw ? escapeHtml(localTimeRaw) : '';
    const localDateRaw = getWeatherDisplayLocalDate(data);
    const localDate = localDateRaw ? escapeHtml(localDateRaw) : '';
    const isDay = getIsDay(data);
    const icon = getWeatherDisplayIcon(data.desc || data.condition || '', isDay);
    weatherDisplay.innerHTML = `
        <span class="weather-display-icon" aria-hidden="true">${icon}</span>
        <span class="weather-display-copy">
            <span class="weather-display-city">${city}</span>
            ${localTime ? `<span class="weather-display-time">${localTime}</span>` : ''}
            ${localDate ? `<span class="weather-display-date">${localDate}</span>` : ''}
            <span class="weather-display-temp">${temp}</span>
            <span class="weather-display-desc">${desc}${humidity ? ` · ${escapeHtml(humidity)}` : ''}</span>
        </span>
    `;
    weatherDisplay.classList.remove('hidden');
}

function getCountdownDisplayIcon(label = '') {
    const lower = normalizeVoiceTokens(label);
    if (/\b(egg|eggs)\b/.test(lower)) return '🥚';
    if (/\b(pasta|spaghetti|noodle|noodles)\b/.test(lower)) return '🍝';
    if (/\b(tea|coffee)\b/.test(lower)) return '☕';
    return '⏳';
}

function isGenericReminderLabel(label = '') {
    return /^(?:alarm|timer|countdown|reminder)$/i.test(String(label || '').trim());
}

function formatReminderDayLabel(timestamp, now = Date.now()) {
    const dueAt = Number(timestamp || 0);
    if (!Number.isFinite(dueAt) || dueAt <= 0) return 'Scheduled';
    const dueDate = new Date(dueAt);
    const nowDate = new Date(now);
    const todayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
    const tomorrowStart = todayStart + (24 * 60 * 60 * 1000);
    const dayAfterTomorrowStart = tomorrowStart + (24 * 60 * 60 * 1000);
    if (dueAt >= todayStart && dueAt < tomorrowStart) return 'Today';
    if (dueAt >= tomorrowStart && dueAt < dayAfterTomorrowStart) return 'Tomorrow';
    return dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatReminderTimeLabel(timestamp) {
    const dueAt = Number(timestamp || 0);
    if (!Number.isFinite(dueAt) || dueAt <= 0) return '--';
    return new Date(dueAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getReminderDisplayEntry() {
    if (state.activeAlert) {
        return {
            text: state.activeAlert.text,
            time: Date.now(),
            isAlert: true
        };
    }
    const next = getNextTimerDue();
    if (next) return { ...next, isAlert: false };
    const fallback = state.lastScheduledReminder;
    if (fallback && Number.isFinite(fallback.time) && fallback.time > Date.now()) {
        return { ...fallback, isAlert: false };
    }
    return state.alertDisplay ? { ...state.alertDisplay, time: Date.now(), isAlert: true } : null;
}

function getReminderDisplayCard(entry) {
    if (!entry) return null;
    const label = String(entry.text || 'Reminder').trim() || 'Reminder';
    const generic = isGenericReminderLabel(label);
    if (entry.isAlert) {
        return {
            icon: '🔔',
            heading: generic ? 'Alarm' : label,
            day: 'Now',
            time: 'READY',
            detail: generic ? 'Alarm ringing now' : `${label} ready now`,
            alarm: true
        };
    }
    return {
        icon: getCountdownDisplayIcon(label),
        heading: generic ? 'Reminder' : label,
        day: formatReminderDayLabel(entry.time),
        time: formatReminderTimeLabel(entry.time),
        detail: generic ? 'Reminder scheduled' : 'Reminder scheduled',
        alarm: false
    };
}

function clearAlertDisplay() {
    if (state.alertDisplayClearTimer) {
        clearTimeout(state.alertDisplayClearTimer);
        state.alertDisplayClearTimer = null;
    }
    state.alertDisplay = null;
    renderCountdownDisplay();
}

function showAlertDisplay(text, durationMs = 45000) {
    if (state.alertDisplayClearTimer) {
        clearTimeout(state.alertDisplayClearTimer);
        state.alertDisplayClearTimer = null;
    }
    state.alertDisplay = {
        text: String(text || 'Countdown').trim() || 'Countdown',
        startedAt: Date.now()
    };
    renderCountdownDisplay();
    if (durationMs > 0) {
        state.alertDisplayClearTimer = setTimeout(() => {
            clearAlertDisplay();
        }, durationMs);
    }
}

function renderCountdownDisplay() {
    if (!countdownDisplay) return;
    const entry = getReminderDisplayEntry();
    if (!entry) {
        countdownDisplay.classList.add('hidden');
        countdownDisplay.classList.remove('alarm');
        countdownDisplay.innerHTML = '';
        return;
    }
    const card = getReminderDisplayCard(entry);
    if (!card) {
        countdownDisplay.classList.add('hidden');
        countdownDisplay.classList.remove('alarm');
        countdownDisplay.innerHTML = '';
        return;
    }

    countdownDisplay.innerHTML = `
        <span class="weather-display-icon" aria-hidden="true">${card.icon}</span>
        <span class="weather-display-copy">
            <span class="weather-display-city">${escapeHtml(card.heading)}</span>
            <span class="weather-display-time">${escapeHtml(card.day)}</span>
            <span class="weather-display-temp">${escapeHtml(card.time)}</span>
            <span class="weather-display-desc">${escapeHtml(card.detail)}</span>
        </span>
    `;
    countdownDisplay.classList.toggle('alarm', !!card.alarm);
    countdownDisplay.classList.remove('hidden');
}

function refreshWeatherDisplayClock() {
    if (!weatherDisplay || weatherDisplay.classList.contains('hidden')) return;
    const weatherData = state.lastContext?.lastWeather;
    if (!weatherData) return;
    const location = state.lastContext?.lastWeatherLocation || state.idleWeatherLocation || BLIP_HOME_LOCATION;
    renderWeatherDisplay({ ...weatherData, location });
}

function ensureWeatherSceneNodes() {
    if (!weatherLayer) return;
    if (!weatherLayer.querySelector('.weather-sun-ring')) {
        const sunRing = document.createElement('div');
        sunRing.className = 'weather-sun-ring';
        weatherLayer.appendChild(sunRing);
    }
    if (!weatherLayer.querySelector('.weather-cloud-bank')) {
        const cloudBank = document.createElement('div');
        cloudBank.className = 'weather-cloud-bank';
        weatherLayer.appendChild(cloudBank);
    }
    if (!weatherLayer.querySelector('.weather-night-halo')) {
        const nightHalo = document.createElement('div');
        nightHalo.className = 'weather-night-halo';
        weatherLayer.appendChild(nightHalo);
    }
}

function normalizeWeatherToBlip(condition = '', isDay = true) {
    const c = normalizeVoiceTokens(condition);
    if (/(rain|shower|drizzle|storm|thunder|sleet|downpour|squall)/.test(c)) return 'rainy';
    if (/(wind|breezy|gust|gale)/.test(c)) return 'windy';
    if (!isDay) return 'night';
    if (/(cloud|overcast|mist|fog|haze|smoke|dust|sand|ash)/.test(c)) return 'cloudy';
    return 'sunny';
}

function clearWeatherVisuals() {
    if (!weatherLayer) return;
    weatherLayer.querySelectorAll('.weather-particle').forEach((node) => node.remove());
    const stage = document.getElementById('blip-stage');
    if (stage) {
        stage.classList.remove('blip-weather-sunny', 'blip-weather-cloudy', 'blip-weather-rainy', 'blip-weather-windy', 'blip-weather-night');
    }
    weatherLayer.setAttribute('data-scene', 'clear');
}

// ── UI: DEBUG (snapshot + settings panel) ─────────────────────────────────────
function getUiDebugSnapshot() {
    const sidePanel = document.getElementById('blip-side-panel');
    const sidePanelVisible = sidePanel && sidePanel.style.display !== 'none';
    const panels = {
        hub: !!(hubContainer && hubContainer.style.display === 'flex'),
        cart: !!(cartContainer && cartContainer.style.display === 'flex'),
        media: !!(mediaContainer && mediaContainer.style.display === 'flex'),
        games: !!(gamesContainer && gamesContainer.style.display === 'flex'),
        chart: !!(chartContainer && chartContainer?.classList?.contains('active')),
        map: !!(mapContainer && mapContainer?.classList?.contains('active')),
        settings: isSettingsPanelOpen(),
        sidePanel: sidePanelVisible,
        mediaLightbox: !!(mediaLightbox && mediaLightbox.classList.contains('active'))
    };
    return [
        '── UI state (debug) ──',
        `mode: ${state.currentMode}`,
        `sidePanelAction: ${state.currentSidePanelAction}`,
        `sidePanelVisible: ${sidePanelVisible}`,
        `isActive: ${state.isActive}`,
        `isThinking: ${state.isThinking}`,
        `isListening: ${state.isListening}`,
        `panels: ${JSON.stringify(panels, null, 0).replace(/"/g, '')}`,
        `data-mode: ${document.body.getAttribute('data-mode') || 'none'}`
    ].join('\n');
}

function refreshUiDebugDump() {
    const el = document.getElementById('ui-debug-dump');
    if (el) el.textContent = getUiDebugSnapshot();
}

function openSettingsPanel() {
    if (!underTheHood) return false;
    underTheHood.style.display = 'flex';
    underTheHood.style.pointerEvents = 'auto';
    underTheHood.classList.add('active');
    state.currentMode = 'settings';
    document.body.setAttribute('data-mode', 'settings');
    const appContainer = document.querySelector('.container');
    if (appContainer) {
        appContainer.style.overflowY = 'auto';
        appContainer.style.overflowX = 'hidden';
    }
    refreshUiDebugDump();
    return true;
}

function isSettingsPanelOpen() {
    return !!underTheHood &&
        underTheHood.style.display !== 'none' &&
        (underTheHood.classList.contains('active') || state.currentMode === 'settings');
}

function closeSettingsPanel() {
    if (!underTheHood) return false;
    underTheHood.classList.remove('active');
    underTheHood.style.transform = 'translateY(100%)';
    underTheHood.style.pointerEvents = 'none';
    underTheHood.style.display = 'none';
    if (state.currentMode === 'settings') state.currentMode = 'core';
    document.body.setAttribute('data-mode', 'core');
    const appContainer = document.querySelector('.container');
    if (appContainer) {
        appContainer.style.overflowY = state.isMediaStripOpen ? 'auto' : 'hidden';
        appContainer.style.overflowX = 'hidden';
    }
    return true;
}

function toggleChatEntry(forceOpen = null) {
    if (!chatEntry) return false;
    const shouldShow = typeof forceOpen === 'boolean'
        ? forceOpen
        : chatEntry.classList.contains('hidden');
    chatEntry.classList.toggle('hidden', !shouldShow);
    if (shouldShow) chatInput?.focus?.();
    syncChatEngagementState();
    return shouldShow;
}

function spawnWeatherParticles(count, className, minDur = 3, maxDur = 8) {
    if (!weatherLayer) return;
    for (let i = 0; i < count; i += 1) {
        const el = document.createElement('span');
        el.className = `weather-particle ${className}`;
        el.style.left = `${Math.random() * 100}%`;
        el.style.top = `${Math.random() * 86}%`;
        el.style.animationDuration = `${(minDur + Math.random() * (maxDur - minDur)).toFixed(2)}s`;
        el.style.animationDelay = `${(Math.random() * 2).toFixed(2)}s`;
        weatherLayer.appendChild(el);
    }
}

function setWeatherScene(scene = 'clear', options = {}) {
    const subtle = options.subtle === true;
    const nextScene = ['sunny', 'cloudy', 'rainy', 'windy', 'night'].includes(scene) ? scene : 'clear';
    state.currentWeatherScene = nextScene;
    state.currentWeatherSceneIntensity = subtle ? 'subtle' : 'active';
    if (!weatherLayer) return;
    ensureWeatherSceneNodes();
    const stage = document.getElementById('blip-stage');
    clearWeatherVisuals();
    if (stage && nextScene !== 'clear') stage.classList.add(`blip-weather-${nextScene}`);
    if (nextScene === 'cloudy') spawnWeatherParticles(subtle ? 3 : 8, 'cloud', subtle ? 14 : 10, subtle ? 22 : 18);
    if (nextScene === 'rainy') spawnWeatherParticles(subtle ? 10 : 28, 'rain', subtle ? 3.2 : 1.8, subtle ? 5.2 : 3.8);
    if (nextScene === 'windy') spawnWeatherParticles(subtle ? 5 : 12, 'cloud', subtle ? 8 : 6, subtle ? 14 : 10);
    weatherLayer.setAttribute('data-scene', nextScene);
    weatherLayer.setAttribute('data-intensity', subtle ? 'subtle' : 'active');
}

function stopWeatherSceneShowcase(options = {}) {
    if (state.weatherSceneShowcaseTimer) {
        clearInterval(state.weatherSceneShowcaseTimer);
        state.weatherSceneShowcaseTimer = null;
    }
    state.weatherSceneShowcaseIndex = -1;
    if (options.restoreIdle === true) {
        const restored = refreshIdleWeatherScene({ force: true });
        if (restored && typeof restored.catch === 'function') {
            restored.catch(() => { });
        }
    }
}

function startWeatherSceneShowcase() {
    stopWeatherSceneShowcase({ restoreIdle: false });
    const scenes = ['sunny', 'cloudy', 'rainy', 'windy', 'night'];
    state.weatherSceneShowcaseIndex = 0;
    setWeatherScene(scenes[0], { subtle: false });
    state.weatherSceneShowcaseTimer = setInterval(() => {
        state.weatherSceneShowcaseIndex = (state.weatherSceneShowcaseIndex + 1) % scenes.length;
        setWeatherScene(scenes[state.weatherSceneShowcaseIndex], { subtle: false });
    }, 3200);
}

function getIdleWeatherLocation() {
    return String(state.idleWeatherLocation || state.lastContext?.lastWeatherLocation || BLIP_HOME_LOCATION).trim();
}

function canApplyIdleWeatherScene() {
    return !state.isThinking &&
        !speech.isSpeaking &&
        !state.cameraStream &&
        !state.isLiveWatch &&
        !state.softSleepMode;
}

async function refreshIdleWeatherScene(options = {}) {
    const force = options.force === true;
    const location = getIdleWeatherLocation();
    if (!location) return false;
    if (!force && !canApplyIdleWeatherScene()) return false;
    if (!force && state.lastIdleWeatherFetchAt && (Date.now() - state.lastIdleWeatherFetchAt) < IDLE_WEATHER_REFRESH_MS) return false;
    try {
        const weather = await web.getWeather(location, state.weatherApiKey);
        if (weather?.error) return false;
        const scene = normalizeWeatherToBlip(weather?.data?.desc || weather?.text || '', getIsDay(weather?.data || {}));
        setWeatherScene(scene, { subtle: true });
        renderWeatherDisplay({ ...(weather?.data || {}), location });
        state.lastContext.lastWeather = weather?.data ? { ...weather.data, scene } : { scene };
        state.lastContext.lastWeatherLocation = location;
        state.lastIdleWeatherFetchAt = Date.now();
        return true;
    } catch (err) {
        console.warn('Idle weather refresh failed:', err?.message || err);
        return false;
    }
}

function startIdleWeatherRefreshLoop() {
    if (state.idleWeatherRefreshTimer) {
        clearInterval(state.idleWeatherRefreshTimer);
        state.idleWeatherRefreshTimer = null;
    }
    state.idleWeatherRefreshTimer = setInterval(() => {
        refreshIdleWeatherScene();
    }, IDLE_WEATHER_REFRESH_MS);
}

function startWeatherDisplayTicker() {
    if (state.weatherDisplayTicker) {
        clearInterval(state.weatherDisplayTicker);
        state.weatherDisplayTicker = null;
    }
    refreshWeatherDisplayClock();
    state.weatherDisplayTicker = setInterval(() => {
        refreshWeatherDisplayClock();
    }, WEATHER_DISPLAY_TICK_MS);
}

// ── ACTION HANDLERS ──────────────────────────────────────────────────────────
const actionHandlers = {
    weather: async (res, state) => {
        if (!res.tool_params?.location) return { text: res.text };
        const weather = await web.getWeather(res.tool_params.location, state.weatherApiKey);
        if (weather?.error) {
            state.history.push({ user: `(System: Weather in ${res.tool_params.location})`, blip: weather.text });
            return { text: mergeTextParts(res.text, weather.text), weatherScene: 'clear' };
        }
        const scene = normalizeWeatherToBlip(weather?.data?.desc || weather?.text || '', getIsDay(weather?.data || {}));
        setWeatherScene(scene, { subtle: false });
        renderWeatherDisplay({ ...(weather?.data || {}), location: res.tool_params.location });
        state.lastContext.lastWeather = weather?.data ? { ...weather.data, scene } : { scene };
        state.lastContext.lastWeatherLocation = res.tool_params.location;
        if (!state.idleWeatherLocation || state.idleWeatherLocation === BLIP_HOME_LOCATION) {
            state.idleWeatherLocation = String(res.tool_params.location || '').trim();
            persistIdleWeatherLocation();
            if (idleWeatherLocationInput) idleWeatherLocationInput.value = state.idleWeatherLocation;
        }
        addToHub('ai', `🌤️ Weather for ${res.tool_params.location}: ${weather.text}`);
        state.history.push({ user: `(System: Weather in ${res.tool_params.location})`, blip: weather.text });
        return { text: mergeTextParts(res.text, weather.text), weatherScene: scene };
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
        return { text: mergeTextParts(res.text, exchange.text), extraHtml };
    },

    map: async (res, state) => {
        const rawQuery = String(res.tool_params?.query || '').trim();
        const rawLocation = String(res.tool_params?.location || '').trim();
        const request = buildMapRequest(rawQuery, rawLocation);
        if (!request) return { text: res.text };

        const opened = openMapRequest(request);
        if (!opened.ok) return { text: res.text };

        if (opened.type === 'route') {
            const routeText = `Route ready from ${request.from} to ${request.to}.`;
            const routeHtml = `<br><a href="${opened.url}" target="_blank" class="action-link green">🧭 OPEN ROUTE IN GOOGLE MAPS</a>`;
            const routeReply = mergeTextParts(res.text, routeText);
            state.history.push({ user: `(System: Route ${request.from} -> ${request.to})`, blip: routeReply });
            return { text: routeReply, extraHtml: routeHtml };
        }

        const queryText = request.query || opened.label;
        const searchSummary = await web.getPlaceInfo(queryText, rawLocation || '');
        let extraHtml = `<br>${searchSummary.html || ''}`;
        extraHtml += `<br><a href="${opened.url}" target="_blank" class="action-link green">🌍 SEARCH ENTIRE AREA IN GOOGLE MAPS</a>`;
        const finalReply = mergeTextParts(res.text, searchSummary.text || searchSummary);
        state.history.push({ user: `(System: Map search for ${queryText})`, blip: finalReply });
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
        return { text: mergeTextParts(res.text, reviewText), extraHtml: reviewHtml };
    },

    movies: async (res, state) => {
        if (!res.tool_params?.location) return { text: res.text };
        const moviesText = await web.getMovies(res.tool_params.location);
        addToHub('ai', `🎬 Movies in ${res.tool_params.location}: ${moviesText.substring(0, 100)}...`);
        state.history.push({ user: `(System: Fetched movies for ${res.tool_params.location})`, blip: moviesText });
        document.body.classList.add('projecting-visual');
        return { text: mergeTextParts(res.text, moviesText) };
    },

    products: async (res, state) => {
        if (!res.tool_params?.query) return { text: res.text };
        const recommendations = res.tool_params.recommendations || [];
        const retailer = String(res.tool_params.retailer || '');
        const result = await web.getProducts(res.tool_params.query, recommendations, { retailer, apiKey: state.geminiKey });
        let previewDataUrl = '';
        if (state.geminiKey) {
            try {
                const preview = await generateImage(
                    `Realistic studio product photo of ${res.tool_params.query}. Clean background, centered item, ecommerce style, no text, no watermark.`,
                    state.geminiKey,
                    { model: state.imageModel, timeoutMs: 90000, imageEngine: state.imageEngine, comfyuiBaseUrl: state.comfyuiBaseUrl, comfyuiCheckpoint: state.comfyuiCheckpoint }
                );
                previewDataUrl = preview?.dataUrl || '';
            } catch (error) {
                console.warn('Product preview image failed:', error?.message || error);
            }
        }
        state.lastContext.lastProductLinks = Array.isArray(result.links) ? result.links : [];
        state.lastContext.lastProductPreviewDataUrl = previewDataUrl;
        state.lastContext.lastProductRetailer = retailer;
        state.history.push({ user: `(System: Products for ${res.tool_params.query})`, blip: result.text });
        document.body.classList.add('projecting-visual');
        return { text: result.text, extraHtml: result.html, links: result.links || [], previewDataUrl };
    },

    time: async (res) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return { text: mergeTextParts(res.text, `It is currently ${timeStr}.`) };
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
        if (!isCalendarDateLike(details.start) || !isCalendarDateLike(details.end)) {
            return {
                text: "I need a clearer day and time before I can create that calendar event."
            };
        }
        const url = createGoogleCalendarUrl(details);
        const eventTitle = details.title || details.summary || 'Event';
        const reminderStatus = scheduleCalendarEventReminder(details);
        await ensureGoogleCalendarConnected({ silent: true });
        const authState = getGoogleCalendarAuthState();

        if (authState.connected) {
            try {
                const event = await createGoogleCalendarEvent(details);
                const eventUrl = event?.htmlLink || url;
                mergeCalendarCache([{
                    id: event?.id || eventTitle,
                    summary: event?.summary || eventTitle,
                    start: event?.start?.dateTime || event?.start?.date || details.start,
                    end: event?.end?.dateTime || event?.end?.date || details.end,
                    htmlLink: eventUrl,
                    source: 'google'
                }]);
                await refreshOpenCalendarPanel();
                addToHub('link', `📅 Calendar Event: ${eventTitle}`, { url: eventUrl });
                return {
                    text: (typeof res.text === 'string' && res.text.trim())
                        ? res.text
                        : `I added ${eventTitle} to your Google Calendar.${buildCalendarReminderFollowUpText(details)}${reminderStatus.reason === 'too_late' ? ' Reminder skipped because the event is too soon.' : ''}`,
                    extraHtml: `<br><a href="${eventUrl}" target="_blank" class="action-link blue">📅 OPEN GOOGLE CALENDAR EVENT</a>`
                };
            } catch (error) {
                console.warn('Google Calendar event creation failed:', error?.message || error);
                if (error?.code === 'calendar_auth_required') {
                    const reconnected = await ensureGoogleCalendarConnected({ silent: true });
                    if (reconnected) {
                        try {
                            const event = await createGoogleCalendarEvent(details);
                            const eventUrl = event?.htmlLink || url;
                            mergeCalendarCache([{
                                id: event?.id || eventTitle,
                                summary: event?.summary || eventTitle,
                                start: event?.start?.dateTime || event?.start?.date || details.start,
                                end: event?.end?.dateTime || event?.end?.date || details.end,
                                htmlLink: eventUrl,
                                source: 'google'
                            }]);
                            await refreshOpenCalendarPanel();
                            addToHub('link', `📅 Calendar Event: ${eventTitle}`, { url: eventUrl });
                            return {
                                text: (typeof res.text === 'string' && res.text.trim())
                                    ? res.text
                                    : `I added ${eventTitle} to your Google Calendar.${buildCalendarReminderFollowUpText(details)}${reminderStatus.reason === 'too_late' ? ' Reminder skipped because the event is too soon.' : ''}`,
                                extraHtml: `<br><a href="${eventUrl}" target="_blank" class="action-link blue">📅 OPEN GOOGLE CALENDAR EVENT</a>`
                            };
                        } catch (retryError) {
                            console.warn('Google Calendar event retry failed:', retryError?.message || retryError);
                        }
                    }
                } else {
                    return {
                        text: `I could not save that event directly to Google Calendar, so I made a backup link for ${eventTitle}.`,
                        extraHtml: `<br><a href="${url}" target="_blank" class="action-link blue">📅 ADD TO GOOGLE CALENDAR</a>`
                    };
                }
            }
        }

        queuePendingCalendarEvent(details);
        await refreshOpenCalendarPanel();
        addToHub('link', `📅 Calendar Event: ${eventTitle}`, { url });
        return {
            text: (typeof res.text === 'string' && res.text.trim())
                ? `${res.text} I also saved it in Blip and will sync it to Google Calendar when you reconnect.`
                : `I saved ${eventTitle} in Blip and will sync it to Google Calendar when you reconnect. I also made a calendar link for now.${buildCalendarReminderFollowUpText(details)}${reminderStatus.reason === 'too_late' ? ' Reminder skipped because the event is too soon.' : ''}`,
            extraHtml: `<br><a href="${url}" target="_blank" class="action-link blue">📅 ADD TO GOOGLE CALENDAR</a>`
        };
    },

    youtube: async (res) => {
        const rawQuery = res.tool_params?.query || '';
        const requestedLibraryView = resolveRequestedYouTubeLibraryView(rawQuery, res.text || '');
        if (requestedLibraryView) {
            const nextView = setYouTubeLibraryView(requestedLibraryView);
            state.lastContext.lastYoutubeQuery = nextView;
            state.lastContext.lastYoutubeSearchIndex = 0;
            return {
                text: mergeTextParts(res.text, `Here are your saved ${nextView.toLowerCase()} in Media.`),
                libraryView: nextView,
                libraryOnly: true
            };
        }
        const cleanedQuery = stripTrailingYouTubeControlPhrases(rawQuery);
        if (cleanedQuery !== rawQuery && wantsUnmuteVideo(rawQuery)) {
            state.pendingYouTubeAction = 'unmute';
        }
        const rawVideoRef = res.tool_params?.videoId || res.tool_params?.url || rawQuery;
        const directVideoId = extractYouTubeVideoId(rawVideoRef);

        if (directVideoId) {
            const watchUrl = `https://www.youtube.com/watch?v=${directVideoId}`;
            const embedUrl = `https://www.youtube.com/embed/${directVideoId}?autoplay=1`;
            state.lastContext.lastOpenableUrl = watchUrl;
            state.lastContext.lastYoutubeUrl = watchUrl;
            state.lastContext.lastYoutubeEmbedUrl = embedUrl;
            state.lastContext.lastYoutubeVideoId = directVideoId;
            state.lastContext.lastYoutubeSearchResults = [{ videoId: directVideoId, title: rawQuery || 'Video' }];
            state.lastContext.lastYoutubeQuery = rawQuery || 'video';
            state.lastContext.lastYoutubeSearchIndex = 0;
            addToHub('link', `🎬 YouTube: ${rawQuery || directVideoId}`, { url: watchUrl });
            document.body.classList.add('projecting-visual');
            return {
                text: mergeTextParts(res.text, 'Playing your YouTube video now.'),
                extraHtml: `<br><a href="${watchUrl}" target="_blank" class="action-link red">🎬 OPEN ON YOUTUBE</a>`
            };
        }

        const effectiveQuery = cleanedQuery || rawQuery;
        if (!effectiveQuery) return { text: res.text };
        const result = await web.searchYouTube(effectiveQuery, state.youtubeApiKey);
        state.lastContext.lastOpenableUrl = result.watchUrl || result.url || '';
        state.lastContext.lastYoutubeUrl = result.watchUrl || result.url;
        state.lastContext.lastYoutubeEmbedUrl = result.embedUrl || null;
        state.lastContext.lastYoutubeVideoId = result.videoId || null;
        state.lastContext.lastYoutubeSearchResults = result.searchResults || null;
        state.lastContext.lastYoutubeQuery = effectiveQuery;
        state.lastContext.lastYoutubeSearchIndex = 0;
        addToHub('link', `🎬 YouTube: ${effectiveQuery}`, { url: result.watchUrl || result.url });
        document.body.classList.add('projecting-visual');
        return { text: mergeTextParts(res.text, result.text), extraHtml: `<br>${result.html}` };
    },

    search: async (res) => {
        if (!res.tool_params?.query) return { text: res.text };
        const result = await web.search(res.tool_params.query);
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(res.tool_params.query)}`;
        state.lastContext.lastOpenableUrl = googleUrl;
        addToHub('link', `🔍 Search: ${res.tool_params.query}`, { url: googleUrl });
        document.body.classList.add('projecting-visual');
        return { text: mergeTextParts(res.text, result.text), extraHtml: `<br>${result.html}` };
    },

    chart: async (res) => {
        if (!res.tool_params?.labels || !res.tool_params?.data) return { text: res.text };
        const title = res.tool_params.title || 'Data Graph';
        const type = res.tool_params.type || 'bar';

        renderChart(res.tool_params.labels, res.tool_params.data, title, type);

        // Show panel
        setMode('chart');
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
            : label === 'Timer'
                ? `OK! I've set a timer for ${durationText}.`
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
    if (!hubContainer) return;
    const shouldShow = state.currentMode !== 'hub';
    setMode(shouldShow ? 'hub' : 'core');
}

function getDisplayUserName() {
    return String(state.userProfile?.preferredName || state.userProfile?.name || '').trim();
}

function beginUserProfileOnboarding(options = {}) {
    state.pendingProfileDraft = {
        stage: 'awaiting_name',
        continueToNotes: Boolean(options.continueToNotes),
        nextNotesDraft: options.nextNotesDraft || null
    };
}

function formatPendingProfilePrompt(draft) {
    if (!draft) return 'What should I call you?';
    if (draft.stage === 'awaiting_name') return 'Before we start, what should I call you?';
    if (draft.stage === 'awaiting_store') return 'What store do you use most?';
    if (draft.stage === 'awaiting_habits') return 'Any shopping habits I should remember? For example weekly shopping or favorite things.';
    return 'Tell me about yourself.';
}

function resolvePendingProfileFollowUp(cmd) {
    const draft = state.pendingProfileDraft;
    if (!draft) return null;
    const raw = sanitizeVoiceQuery(cmd);
    const lower = normalizeVoiceTokens(cmd);
    if (/^(?:cancel|never mind|nevermind|forget it|stop)$/i.test(lower)) {
        state.pendingProfileDraft = null;
        return { cancelled: true, message: 'Profile setup cancelled.' };
    }

    if (draft.stage === 'awaiting_name') {
        const cleanedName = sanitizeVoiceQuery(raw
            .replace(/^(?:my\s+name\s+is|call\s+me|i\s+am|i'm)\s+/i, '')
            .replace(/^(?:name)\s+/i, ''));
        if (!cleanedName) {
            return { needsMore: true, message: formatPendingProfilePrompt(draft) };
        }
        state.userProfile = normalizeUserProfile({
            ...state.userProfile,
            name: toTitleWords(cleanedName),
            preferredName: toTitleWords(cleanedName)
        });
        persistUserProfile();
        state.pendingProfileDraft = { ...draft, stage: 'awaiting_store' };
        return { needsMore: true, message: `Nice to meet you, ${getDisplayUserName()}. ${formatPendingProfilePrompt(state.pendingProfileDraft)}` };
    }

    if (draft.stage === 'awaiting_store') {
        const preferredStore = sanitizeVoiceQuery(raw
            .replace(/^(?:i\s+shop\s+at|i\s+go\s+to|store\s+is|usually)\s+/i, '')
            .replace(/^(?:the\s+)?store\s+/i, ''));
        if (!preferredStore) {
            return { needsMore: true, message: formatPendingProfilePrompt(draft) };
        }
        state.userProfile = normalizeUserProfile({
            ...state.userProfile,
            preferredStore: toTitleWords(preferredStore)
        });
        persistUserProfile();
        state.pendingProfileDraft = { ...draft, stage: 'awaiting_habits' };
        return { needsMore: true, message: formatPendingProfilePrompt(state.pendingProfileDraft) };
    }

    if (draft.stage === 'awaiting_habits') {
        const habits = sanitizeVoiceQuery(raw
            .replace(/^(?:i\s+usually|usually|my\s+habit\s+is|shopping\s+habit\s+is)\s+/i, ''));
        if (!habits) {
            return { needsMore: true, message: formatPendingProfilePrompt(draft) };
        }
        state.userProfile = normalizeUserProfile({
            ...state.userProfile,
            shoppingHabits: habits,
            onboardingComplete: true
        });
        persistUserProfile();
        const userName = getDisplayUserName() || 'friend';
        state.pendingProfileDraft = null;
        if (draft.continueToNotes) {
            state.pendingNotesDraft = draft.nextNotesDraft || { stage: 'awaiting_kind', noteType: '', title: '', items: [] };
            return { completed: true, message: `Perfect, ${userName}. I will remember that. What kind of note do you need?`, continueToNotes: true };
        }
        return { completed: true, message: `Perfect, ${userName}. I will remember that.` };
    }

    return null;
}

function getNoteItems() {
    return notesStore.getNoteItems(state);
}

function addNoteItem(content = '', data = {}) {
    if (!notesStore.addNote(state, content, data)) return false;
    renderHub();
    persistHub();
    return true;
}

function formatSpokenList(items = []) {
    const parts = (items || []).map((item) => String(item || '').trim()).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
    return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function buildPendingNotesDraft(kind = 'note', title = 'Note') {
    return {
        stage: 'awaiting_items',
        noteType: String(kind || 'note').trim() || 'note',
        title: String(title || 'Note').trim() || 'Note',
        items: []
    };
}

function buildFreeformNoteDraft(title = 'Note') {
    return {
        stage: 'awaiting_freeform',
        noteType: 'note',
        title: String(title || 'Note').trim() || 'Note',
        items: [],
        bodyText: ''
    };
}

function inferNoteKindAndTitle(text = '') {
    const raw = sanitizeVoiceQuery(text)
        .replace(/^(?:it'?s|it is|this is)\s+/i, '')
        .replace(/^(?:a|an)\s+/i, '')
        .trim();
    if (!raw) return null;
    const lower = normalizeVoiceTokens(raw);

    let noteType = 'note';
    if (/\b(shopping|grocery|supermarket|super market|market)\b/.test(lower)) noteType = 'shopping list';
    else if (/\b(work|task|tasks)\b/.test(lower)) noteType = 'task list';
    else if (/\b(pack|packing|travel|trip)\b/.test(lower)) noteType = 'packing list';
    else if (/\b(ideas?|brainstorm)\b/.test(lower)) noteType = 'ideas note';
    else if (/\b(reminder|reminders|personal)\b/.test(lower)) noteType = 'reminder list';
    else if (/\blist\b/.test(lower)) noteType = 'list';

    let title = '';
    const explicitTitleMatch = raw.match(/\b(?:for|called|named)\s+(.+)$/i);
    if (explicitTitleMatch?.[1]) {
        title = sanitizeVoiceQuery(explicitTitleMatch[1]).replace(/^(?:the|my)\s+/i, '').trim();
    }

    if (!title) {
        const fallback = raw
            .replace(/\b(?:shopping|grocery|supermarket|super market|work|task|tasks|packing|travel|trip|ideas?|brainstorm|personal|reminder|reminders)\b/ig, '')
            .replace(/\b(?:list|note)\b/ig, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (fallback) title = fallback;
    }

    if (!title) {
        title = noteType === 'shopping list'
            ? 'Super Market'
            : noteType === 'task list'
                ? 'Tasks'
                : noteType === 'packing list'
                    ? 'Packing'
                    : noteType === 'ideas note'
                        ? 'Ideas'
                        : noteType === 'reminder list'
                            ? 'Reminders'
                            : noteType === 'list'
                                ? 'List'
                                : 'Note';
    }

    return {
        noteType,
        title: toTitleWords(title).slice(0, 48) || 'Note'
    };
}

function parseNoteItemsFromText(text = '') {
    const raw = sanitizeVoiceQuery(text)
        .replace(/^(?:please\s+)?(?:add|include|put|write\s+down|save|note)\s+/i, '')
        .replace(/^(?:and|also)\s+/i, '')
        .replace(/^(?:you\s+can\s+)?save\s+(?:the\s+)?note$/i, '')
        .replace(/^(?:you\s+can\s+)?save\s+(?:the\s+)?list$/i, '')
        .trim();
    if (!raw) return [];
    const normalized = raw
        .replace(/\s+(?:and\s+then|then|plus|also)\s+/gi, ', ')
        .replace(/\s+\band\b\s+/gi, ', ')
        .replace(/[.;]+/g, ',');
    const items = normalized
        .split(',')
        .map((part) => sanitizeVoiceQuery(part).replace(/^(?:the|my|some)\s+/i, '').trim())
        .filter(Boolean);
    return [...new Set(items)];
}

function isNotesDraftFinishIntent(text = '') {
    const lower = normalizeVoiceTokens(text);
    return /^(?:done|finished|finish|save|save it|save note|save the note|save list|save the list|you can save the note|you can save the list|that's all|thats all|that's it|thats it|that is all|end note|end list|complete|okay save note|ok save note)$/i.test(lower);
}

function buildSavedNoteContent(draft) {
    const bodyText = String(draft?.bodyText || '').trim();
    if (bodyText) return bodyText;
    const items = Array.isArray(draft?.items) ? draft.items : [];
    const title = String(draft?.title || 'Note').trim() || 'Note';
    if (!items.length) return title;
    return `${title}: ${items.join(', ')}`;
}

function formatPendingNotesDraftPrompt(draft) {
    const userName = getDisplayUserName();
    if (!draft) return userName ? `What kind of note do you need, ${userName}?` : 'What kind of note do you need?';
    if (draft.stage === 'awaiting_freeform') {
        return userName
            ? `Okay, ${userName}. I am listening. Dictate your note.`
            : 'Okay. I am listening. Dictate your note.';
    }
    const kindLabel = draft.noteType === 'note' ? 'note' : draft.noteType;
    return userName
        ? `Okay, ${userName}. I will create a ${kindLabel} called ${draft.title}. What should I add?`
        : `Okay. I will create a ${kindLabel} called ${draft.title}. What should I add?`;
}

function parseFreeformNoteBody(text = '') {
    return sanitizeVoiceQuery(text)
        .replace(/^(?:yes\s+)?(?:this|here)(?:\s+is)?\s+(?:the\s+)?note[:\s,-]*/i, '')
        .replace(/^(?:yes\s+)?(?:it'?s|it is)\s+(?:the\s+)?note[:\s,-]*/i, '')
        .replace(/^(?:please\s+)?(?:take|save|write)\s+(?:this\s+)?note[:\s,-]*/i, '')
        .replace(/^(?:note|memo)[:\s,-]*/i, '')
        .trim();
}

function resolvePendingNotesFollowUp(cmd) {
    const draft = state.pendingNotesDraft;
    if (!draft) return null;
    const lower = normalizeVoiceTokens(cmd);

    if (/^(?:cancel|never mind|nevermind|forget it|stop)$/i.test(lower)) {
        state.pendingNotesDraft = null;
        return { cancelled: true, message: 'Notes cancelled.' };
    }

    if (draft.stage === 'awaiting_kind') {
        const descriptor = inferNoteKindAndTitle(cmd);
        if (!descriptor) {
            return { needsMore: true, message: 'What kind of note do you need, Pablo?' };
        }
        state.pendingNotesDraft = buildPendingNotesDraft(descriptor.noteType, descriptor.title);
        return { needsMore: true, message: formatPendingNotesDraftPrompt(state.pendingNotesDraft) };
    }

    if (draft.stage === 'awaiting_freeform') {
        const bodyText = parseFreeformNoteBody(cmd);
        if (!bodyText) {
            return { needsMore: true, message: 'I am listening. Dictate the note when you are ready.' };
        }
        state.pendingNotesDraft = null;
        return {
            completed: true,
            draft: {
                ...draft,
                bodyText
            }
        };
    }

    if (isNotesDraftFinishIntent(cmd)) {
        if (!draft.items?.length) {
            return { needsMore: true, message: 'Tell me what should go in the note first.' };
        }
        state.pendingNotesDraft = null;
        return {
            completed: true,
            draft
        };
    }

    const items = parseNoteItemsFromText(cmd);
    if (items.length) {
        const existing = new Set((draft.items || []).map((item) => String(item || '').toLowerCase()));
        const nextItems = [...(draft.items || [])];
        items.forEach((item) => {
            const key = String(item || '').toLowerCase();
            if (!existing.has(key)) {
                existing.add(key);
                nextItems.push(item);
            }
        });
        state.pendingNotesDraft = {
            ...draft,
            items: nextItems
        };
        return {
            needsMore: true,
            message: `I added ${formatSpokenList(items)}. Anything else, or say save note.`
        };
    }

    return {
        needsMore: true,
        message: draft.items?.length
            ? 'I am still listening. Add more items, or say save note.'
            : 'Tell me what should go in the note.'
    };
}

function removeLatestNoteItem() {
    const latest = getNoteItems()[0] || null;
    if (!latest?.id) return null;
    removeHubItem(latest.id);
    return latest;
}

function removeMatchingNoteItem(query = '') {
    const needle = sanitizeVoiceQuery(query || '').toLowerCase();
    if (!needle) return removeLatestNoteItem();
    const match = getNoteItems().find((item) => String(item?.content || '').toLowerCase().includes(needle));
    if (!match?.id) return null;
    removeHubItem(match.id);
    return match;
}

function clearNotes() {
    const removedCount = notesStore.clearNotes(state);
    if (removedCount > 0) {
        renderHub();
        persistHub();
    }
    return removedCount;
}

function openNotesPanel(message = '', prefill = '') {
    const notes = getNoteItems().map((item) => ({
        id: item.id,
        content: String(item.content || ''),
        timestamp: String(item.timestamp || ''),
        data: item.data || {}
    }));
    const summary = message || (notes.length
        ? `Notes ready. ${notes.length} note${notes.length === 1 ? '' : 's'}.`
        : 'Notes ready. Start with your first note.');
    renderActionInSidePanel({
        action: 'notes',
        tool_params: { notes, prefill: String(prefill || ''), draft: state.pendingNotesDraft || null },
        text: summary
    });
}

function syncNotesPanelIfVisible(message = '', prefill = '') {
    if (isSidePanelVisible() && state.currentSidePanelAction === 'notes') {
        openNotesPanel(message, prefill);
    }
}

function toggleNotesPanel() {
    if (isSidePanelVisible() && state.currentSidePanelAction === 'notes') {
        closeSidePanel();
        return false;
    }
    openNotesPanel();
    return true;
}

function toggleCart() {
    if (!cartContainer) return;
    const shouldShow = state.currentMode !== 'cart';
    setMode(shouldShow ? 'cart' : 'core');
}

function toggleLearningGames() {
    if (!gamesContainer) return;
    const shouldShow = state.currentMode !== 'games';
    setMode(shouldShow ? 'games' : 'core');
}

function randomInt(min, max) {
    const safeMin = Math.ceil(Number(min) || 0);
    const safeMax = Math.floor(Number(max) || safeMin);
    return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

function shuffleArray(items = []) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function generateMathQuestion() {
    const type = Math.random() < 0.6 ? 'add' : 'subtract';
    let a = 0;
    let b = 0;
    let answer = 0;
    let text = '';

    if (type === 'add') {
        a = randomInt(1, 10);
        b = randomInt(1, 10);
        answer = a + b;
        text = `${a} + ${b} = ?`;
    } else {
        a = randomInt(3, 10);
        b = randomInt(1, a);
        answer = a - b;
        text = `${a} - ${b} = ?`;
    }

    const options = new Set([answer]);
    while (options.size < 4) {
        const candidate = Math.max(0, answer + randomInt(-5, 5));
        options.add(candidate === answer ? answer + randomInt(1, 3) : candidate);
    }

    return {
        text,
        answer,
        options: shuffleArray([...options].slice(0, 4))
    };
}

async function speakLearningGameLine(text, emotion = 'curious') {
    if (!text) return;
    transcriptText.innerHTML = `<b>Blip:</b> ${text}`;
    setBlipEmotion(emotion);
    setPersona(getReplyPersonaKey(emotion));
    if (!state.isThinking && !state.softSleepMode) {
        try {
            await speakWithGuard(text, emotion);
        } catch (_) { }
    }
}

async function renderMathQuestion() {
    if (!mathQuestion || !mathOptions || !mathFeedback || !mathNextBtn) return;
    const q = generateMathQuestion();
    state.mathGame.currentAnswer = q.answer;
    state.mathGame.currentQuestion = q.text;
    state.mathGame.answered = false;

    mathQuestion.textContent = q.text;
    mathOptions.innerHTML = '';
    mathFeedback.textContent = '';
    mathNextBtn.style.display = 'none';

    q.options.forEach((value) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'math-option-btn';
        btn.textContent = String(value);
        btn.addEventListener('click', () => {
            void handleMathAnswer(value);
        });
        mathOptions.appendChild(btn);
    });

    setBlipEmotion('curious');
    setPersona(getReplyPersonaKey('curious'));
    if (mathIntro) mathIntro.textContent = 'Blip will ask easy number questions!';
    await speakLearningGameLine(`Can you solve this? ${q.text}`, 'curious');
}

async function handleMathAnswer(selected) {
    if (!mathFeedback || !mathNextBtn || !mathScore || state.mathGame.answered) return;
    state.mathGame.answered = true;
    const optionButtons = document.querySelectorAll('.math-option-btn');
    optionButtons.forEach((btn) => {
        btn.disabled = true;
    });

    if (selected === state.mathGame.currentAnswer) {
        state.mathGame.score += 1;
        mathScore.textContent = `Score: ${state.mathGame.score}`;
        mathFeedback.textContent = "Great job! That's correct.";
        await speakLearningGameLine('Yay! You got it!', 'happy');
    } else {
        mathFeedback.textContent = `Good try! The answer was ${state.mathGame.currentAnswer}.`;
        await speakLearningGameLine(`That's okay, we can learn together. The answer was ${state.mathGame.currentAnswer}.`, 'gentle');
    }

    mathNextBtn.style.display = 'inline-block';
}

async function startMathGame() {
    state.mathGame.score = 0;
    state.mathGame.started = true;
    state.mathGame.answered = false;
    if (mathScore) mathScore.textContent = 'Score: 0';
    if (mathIntro) mathIntro.textContent = 'Blip will ask easy number questions!';
    await renderMathQuestion();
}

function renderLearningGamesPanel() {
    if (!gamesContainer) return;
    if (mathScore) mathScore.textContent = `Score: ${state.mathGame.score}`;
    if (!state.mathGame.started) {
        if (mathQuestion) mathQuestion.textContent = 'Press Start';
        if (mathIntro) mathIntro.textContent = "Let's play with numbers!";
        if (mathFeedback) mathFeedback.textContent = '';
        if (mathOptions) mathOptions.innerHTML = '';
        if (mathNextBtn) mathNextBtn.style.display = 'none';
    }
}

function initLearningGames() {
    if (mathStartBtn) {
        mathStartBtn.addEventListener('click', () => {
            void startMathGame();
        });
    }
    if (mathNextBtn) {
        mathNextBtn.addEventListener('click', () => {
            void renderMathQuestion();
        });
    }
    renderLearningGamesPanel();
}

function normalizeMediaLane(lane) {
    if (lane === 'created' || lane === MEDIA_BUCKET_CREATED) return CREATIONS_TOOL_ENABLED ? 'created' : 'shots';
    if (lane === 'music') return 'music';
    if (lane === 'videos') return 'videos';
    if (lane === 'all') return 'all';
    return 'shots';
}

function normalizeMediaRotation(rotation) {
    const value = Number(rotation);
    if (!Number.isFinite(value)) return 0;
    return ((Math.round(value / 90) * 90) % 360 + 360) % 360;
}

function normalizeMediaBrightness(brightness) {
    const value = Number(brightness);
    if (!Number.isFinite(value)) return 1;
    return Math.min(1.8, Math.max(0.4, Math.round(value * 100) / 100));
}

function normalizeMediaEditSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || typeof snapshot.url !== 'string') return null;
    return {
        url: snapshot.url,
        rotation: normalizeMediaRotation(snapshot.rotation),
        brightness: normalizeMediaBrightness(snapshot.brightness)
    };
}

function normalizeMediaCreatedAt(value, fallbackId = null) {
    if (typeof value === 'string' && value.trim()) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
    if (typeof fallbackId === 'number' && Number.isFinite(fallbackId) && fallbackId > 0) {
        const parsed = new Date(fallbackId);
        if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
    return new Date().toISOString();
}

function getMediaDate(item) {
    const parsed = new Date(item?.createdAt || item?.id || Date.now());
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatMediaDateLabel(item) {
    const date = getMediaDate(item);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function startOfMediaWeek(dateInput) {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return new Date();
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
}

function groupMediaItemsByWeek(items = []) {
    const groups = new Map();
    items.forEach((item) => {
        const mediaDate = getMediaDate(item);
        const weekStart = startOfMediaWeek(mediaDate);
        const key = weekStart.toISOString();
        if (!groups.has(key)) {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            groups.set(key, {
                key,
                start: weekStart,
                end: weekEnd,
                items: []
            });
        }
        groups.get(key).items.push(item);
    });
    return Array.from(groups.values()).sort((a, b) => b.start.getTime() - a.start.getTime());
}

function formatMediaWeekLabel(group) {
    const nowWeek = startOfMediaWeek(Date.now()).getTime();
    const prevWeek = startOfMediaWeek(Date.now() - (7 * 24 * 60 * 60 * 1000)).getTime();
    const startTime = group?.start?.getTime?.() || 0;
    if (startTime === nowWeek) return 'This Week';
    if (startTime === prevWeek) return 'Last Week';
    const sameMonth = group.start.getMonth() === group.end.getMonth() && group.start.getFullYear() === group.end.getFullYear();
    const startLabel = group.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = group.end.toLocaleDateString('en-US', sameMonth
        ? { day: 'numeric', year: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startLabel} - ${endLabel}`;
}

function normalizeCreationVoiceLabel(text = '') {
    return sanitizeVoiceQuery(normalizeVoiceTokens(text))
        .replace(/\b(?:creation|design|drawing|graph|chart|art|image|picture|item|saved)\b/g, ' ')
        .replace(/\b(?:snapshot|panel|memory)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeCreationTitle(text = '', fallback = 'Creation') {
    let cleaned = String(text || '')
        .split(/[\n.!?]/)[0]
        .replace(/^(?:a\s+high\s+quality\s+image|high\s+quality\s+image|educational\s+(?:labeled\s+)?(?:illustration|diagram|space\s+diagram)|illustration|diagram|image|picture)\s+(?:of|for|showing|showing\s+how)\s+/i, '')
        .replace(/^how\s+/i, '')
        .replace(/^map\s+of\s+/i, '')
        .replace(/^recipe\s+(?:for|of)\s+/i, '')
        .replace(/\s+(?:clean\s+infographic\s+style|high\s+contrast|easy\s+to\s+understand|labeled\s+parts\s+if\s+relevant).*$/i, '')
        .replace(/^[\s:,\-]+/, '')
        .trim();
    if (!cleaned) cleaned = String(fallback || 'Creation').trim();
    return toTitleWords(cleaned).slice(0, 80) || 'Creation';
}

function normalizePhotoVoiceLabel(text = '') {
    return sanitizeVoiceQuery(normalizeVoiceTokens(text))
        .replace(/\b(?:photo|foto|picture|shot|snapshot|image|item|saved|captured|taken)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizePhotoTitle(text = '', item = {}) {
    const cleaned = String(text || '').trim();
    if (cleaned) return cleaned.slice(0, 80);
    return `Photo ${formatMediaDateLabel(item)}`.slice(0, 80);
}

function buildPhotoVoiceLabel(item = {}) {
    const date = getMediaDate(item);
    const explicitTitle = String(item?.title || '').trim();
    const longDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    const shortDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    const time = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
    return normalizePhotoVoiceLabel(`${explicitTitle} ${longDate} ${shortDate} ${time} ${formatMediaDateLabel(item)}`);
}

function normalizeMediaItemTitle(item = {}) {
    if (normalizeMediaBucket(item?.bucket) === MEDIA_BUCKET_CREATED) {
        return normalizeCreationTitle(item?.title || item?.source || 'Creation', 'Creation');
    }
    return normalizePhotoTitle(item?.title || '', item);
}

function deriveCreationTitleFromContext(source = 'design') {
    const chartTitle = String(state.lastContext?.lastChartData?.title || '').trim();
    if (chartTitle) return normalizeCreationTitle(chartTitle, 'Chart');

    const designPrompt = String(state.lastContext?.lastDesignPrompt || '').trim();
    if (designPrompt) return normalizeCreationTitle(designPrompt, 'Design');

    const searchTopic = String(state.lastContext?.lastSearchTopic || '').trim();
    if (state.currentSidePanelAction === 'image' && searchTopic) {
        return normalizeCreationTitle(searchTopic, 'Reference Image');
    }

    const location = String(state.lastContext?.lastLocation || '').trim();
    if (location) return `Map Of ${normalizeCreationTitle(location, 'Location')}`;

    return normalizeCreationTitle(source, 'Creation');
}

function findCreationMatchByQuery(query = '') {
    const needle = normalizeCreationVoiceLabel(query);
    if (!needle || needle.length < 2) return null;
    let best = null;
    let bestScore = 0;
    const needleTokens = needle.split(' ').filter((token) => token.length > 1);
    for (const item of getMediaItemsByBucket(MEDIA_BUCKET_CREATED)) {
        const haystack = normalizeCreationVoiceLabel(item?.voiceLabel || item?.title || item?.source || '');
        if (!haystack) continue;
        let score = 0;
        if (haystack === needle) score = 100;
        else if (haystack.startsWith(needle) || haystack.includes(` ${needle}`)) score = 92;
        else if (haystack.includes(needle) || needle.includes(haystack)) score = 84;
        else if (needleTokens.length) {
            const hayTokens = new Set(haystack.split(' ').filter(Boolean));
            const overlap = needleTokens.filter((token) => hayTokens.has(token)).length;
            if (overlap === needleTokens.length) score = 74 + overlap;
            else if (overlap >= 2) score = 58 + overlap;
        }
        if (score > bestScore) {
            bestScore = score;
            best = item;
        }
    }
    return bestScore >= 60 ? best : null;
}

function findPhotoMatchByQuery(query = '') {
    const needle = normalizePhotoVoiceLabel(query);
    if (!needle || needle.length < 2) return null;
    let best = null;
    let bestScore = 0;
    const needleTokens = needle.split(' ').filter((token) => token.length > 1);
    for (const item of getMediaItemsByBucket(MEDIA_BUCKET_SHOTS)) {
        if (item?.kind === 'video') continue;
        const haystack = buildPhotoVoiceLabel(item);
        if (!haystack) continue;
        let score = 0;
        if (haystack === needle) score = 100;
        else if (haystack.startsWith(needle) || haystack.includes(` ${needle}`)) score = 92;
        else if (haystack.includes(needle) || needle.includes(haystack)) score = 84;
        else if (needleTokens.length) {
            const hayTokens = new Set(haystack.split(' ').filter(Boolean));
            const overlap = needleTokens.filter((token) => hayTokens.has(token)).length;
            if (overlap === needleTokens.length) score = 74 + overlap;
            else if (overlap >= 2) score = 58 + overlap;
        }
        if (score > bestScore) {
            bestScore = score;
            best = item;
        }
    }
    return bestScore >= 60 ? best : null;
}

function captureMediaEditSnapshot(item) {
    if (!item || typeof item.url !== 'string') return null;
    return {
        url: item.url,
        rotation: normalizeMediaRotation(item.rotation),
        brightness: normalizeMediaBrightness(item.brightness)
    };
}

function rememberMediaEditState(item) {
    if (!item || typeof item.url !== 'string') return;
    if (typeof item.originalUrl !== 'string' || !item.originalUrl) item.originalUrl = item.url;
    item.lastEdit = captureMediaEditSnapshot(item);
}

function normalizeMediaBucket(bucket) {
    return bucket === MEDIA_BUCKET_CREATED ? MEDIA_BUCKET_CREATED : MEDIA_BUCKET_SHOTS;
}

function getMediaItemsByBucket(bucket = MEDIA_BUCKET_SHOTS) {
    const normalizedBucket = normalizeMediaBucket(bucket);
    if (!CREATIONS_TOOL_ENABLED && normalizedBucket === MEDIA_BUCKET_CREATED) return [];
    return (state.mediaItems || []).filter((item) => normalizeMediaBucket(item?.bucket) === normalizedBucket);
}

function findMediaGlobalIndexById(id) {
    const target = String(id ?? '').trim();
    if (!target) return -1;
    return (state.mediaItems || []).findIndex((item) => String(item?.id ?? '').trim() === target);
}

function toggleMediaGallery(forceOpen = null, lane = null) {
    const isVisible = !!state.isMediaStripOpen;
    const appContainer = document.querySelector('.container');
    const requestedLane = lane ? normalizeMediaLane(lane) : null;
    const currentLane = normalizeMediaLane(state.mediaStripLane);
    const shouldShow = typeof forceOpen === 'boolean'
        ? forceOpen
        : (!isVisible || (requestedLane && requestedLane !== currentLane));
    if (requestedLane) state.mediaStripLane = requestedLane;
    else state.mediaStripLane = currentLane;
    state.isMediaStripOpen = shouldShow;
    document.body.classList.toggle('media-strip-open', shouldShow);
    if (shouldShow) {
        if (state.currentMode !== 'core') setMode('core');
        closeAuxiliaryPanelsForGallery();
        if (requestedLane === 'created') state.activeMediaBucket = MEDIA_BUCKET_CREATED;
        else if (requestedLane === 'shots') state.activeMediaBucket = MEDIA_BUCKET_SHOTS;
    }
    if (mediaContainer) mediaContainer.style.display = 'none'; // legacy panel no longer used as primary gallery
    if (mediaStrip) {
        mediaStrip.classList.toggle('hidden', !shouldShow);
        mediaStrip.style.display = '';
        mediaStrip.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
    }
    if (appContainer) {
        appContainer.style.overflowY = shouldShow ? 'auto' : 'hidden';
        appContainer.style.overflowX = 'hidden';
    }
    renderMediaGallery();
    if (shouldShow && mediaStrip && typeof mediaStrip.scrollIntoView === 'function') {
        requestAnimationFrame(() => {
            const scrollTarget = requestedLane === 'created' && createdStripList
                ? createdStripList
                : requestedLane === 'music' && mediaStripMusicList
                    ? mediaStripMusicList
                    : requestedLane === 'videos' && mediaStripVideosList
                        ? mediaStripVideosList
                : mediaStrip;
            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
    if (!shouldShow) closeMediaLightbox();
    return shouldShow;
}

function isContainerActuallyVisible(el) {
    if (!el || !el.isConnected) return false;
    if (el.hidden) return false;
    if (el.getAttribute?.('aria-hidden') === 'true') return false;
    if (el.classList?.contains('hidden')) return false;
    const style = typeof window !== 'undefined' && typeof window.getComputedStyle === 'function'
        ? window.getComputedStyle(el)
        : null;
    if (style) {
        if (style.display === 'none') return false;
        if (style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    } else if (el.style?.display === 'none') {
        return false;
    }
    if (typeof el.getBoundingClientRect === 'function') {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
    }
    return true;
}

function isMediaStripActuallyVisible() {
    return !!state.isMediaStripOpen && isContainerActuallyVisible(mediaStrip);
}

function isMediaLightboxActuallyVisible(kind = '') {
    if (!mediaLightbox?.classList.contains('active')) return false;
    if (!isContainerActuallyVisible(mediaLightbox)) return false;
    if (kind === 'video') {
        return !!mediaLightboxVideo &&
            mediaLightboxVideo.style.display !== 'none' &&
            !!String(mediaLightboxVideo.src || '').trim();
    }
    if (kind === 'image') {
        return !!mediaLightboxImage &&
            mediaLightboxImage.style.display !== 'none' &&
            !!String(mediaLightboxImage.src || '').trim();
    }
    return true;
}

function isSidePanelActuallyVisible(expectedAction = '') {
    const sidePanel = document.getElementById('blip-side-panel');
    if (!isContainerActuallyVisible(sidePanel)) return false;
    if (!expectedAction) return true;
    if (expectedAction === 'calendarAgenda') {
        return sidePanel.classList.contains('blip-calendar-orb');
    }
    const panelAction = String(sidePanel.dataset?.panelAction || state.currentSidePanelAction || '').trim();
    return panelAction === expectedAction;
}

function isYouTubePanelActuallyVisible() {
    const sidePanel = document.getElementById('blip-side-panel');
    if (!isSidePanelActuallyVisible('youtube')) return false;
    return !!blipYtPlayer ||
        !!sidePanel?.querySelector('#blip-yt-player') ||
        sidePanel?.dataset?.youtubeLibraryOnly === '1';
}

function isMapActuallyVisible() {
    return state.currentMode === 'map' &&
        isContainerActuallyVisible(mapContainer) &&
        !!String(mapFrame?.src || '').trim();
}

function isChartActuallyVisible() {
    return state.currentMode === 'chart' && isContainerActuallyVisible(chartContainer);
}

function isCalendarPanelActuallyVisible() {
    return isSidePanelActuallyVisible('calendarAgenda');
}

function logUiOpenVisibilityFailure(cmd = '', target = '', details = {}) {
    console.warn('[ui-open-verify] target did not become visible', {
        cmd,
        target,
        currentMode: state.currentMode,
        currentSidePanelAction: state.currentSidePanelAction,
        isMediaStripOpen: state.isMediaStripOpen,
        mediaStripLane: state.mediaStripLane,
        activeMediaBucket: state.activeMediaBucket,
        mediaStripVisible: isMediaStripActuallyVisible(),
        mediaLightboxVisible: isMediaLightboxActuallyVisible(),
        sidePanelVisible: isSidePanelActuallyVisible(),
        youtubeVisible: isYouTubePanelActuallyVisible(),
        calendarVisible: isCalendarPanelActuallyVisible(),
        mapVisible: isMapActuallyVisible(),
        chartVisible: isChartActuallyVisible(),
        ...details
    });
}

function getVerifiedOpenMessage({
    cmd = '',
    target = '',
    visible = false,
    successMessage = '',
    failureMessage = 'I tried to open it, but the window did not appear.',
    details = {}
} = {}) {
    if (visible) return successMessage;
    logUiOpenVisibilityFailure(cmd, target, details);
    return failureMessage;
}

function persistMediaGallery() {
    const isQuotaError = (error) => {
        const message = String(error?.message || error || '').toLowerCase();
        return message.includes('exceeded the quota') || message.includes('quota exceeded') || message.includes('quota_exceeded');
    };
    const persistableItems = (state.mediaItems || []).filter((item) =>
        item?.kind !== 'video' &&
        typeof item?.url === 'string' &&
        item.url.trim() &&
        !item.url.startsWith('blob:')
    );
    const toPayload = (items) => items.map((item) => ({
        id: item.id,
        kind: 'image',
        bucket: normalizeMediaBucket(item.bucket),
        source: item.source || 'snapshot',
        url: item.url,
        createdAt: normalizeMediaCreatedAt(item.createdAt, item.id),
        timestamp: item.timestamp || '',
        rotation: normalizeMediaRotation(item.rotation),
        brightness: normalizeMediaBrightness(item.brightness),
        originalUrl: typeof item.originalUrl === 'string' && item.originalUrl ? item.originalUrl : item.url,
        lastEdit: normalizeMediaEditSnapshot(item.lastEdit)
    }));

    if (!persistableItems.length) {
        try {
            localStorage.setItem(MEDIA_STORAGE_KEY, '[]');
            state.lastMediaPersistStatus = 'ok';
            return { ok: true, prunedCount: 0 };
        } catch (e) {
            state.lastMediaPersistStatus = isQuotaError(e) ? 'quota' : 'error';
            console.warn('Media gallery save failed:', e.message);
            return { ok: false, prunedCount: 0, reason: state.lastMediaPersistStatus };
        }
    }

    let keptItems = persistableItems.slice();
    while (keptItems.length) {
        try {
            localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(toPayload(keptItems)));
            const keptIds = new Set(keptItems.map((item) => item.id));
            const dropped = [];
            state.mediaItems = (state.mediaItems || []).filter((item) => {
                const isPersistable = item?.kind !== 'video' &&
                    typeof item?.url === 'string' &&
                    item.url.trim() &&
                    !item.url.startsWith('blob:');
                if (!isPersistable) return true;
                if (keptIds.has(item.id)) return true;
                dropped.push(item);
                return false;
            });
            dropped.forEach(disposeMediaItem);
            if (dropped.length) {
                console.warn(`Media gallery storage full; pruned ${dropped.length} oldest saved image${dropped.length === 1 ? '' : 's'}.`);
            }
            state.lastMediaPersistStatus = 'ok';
            return { ok: true, prunedCount: dropped.length };
        } catch (e) {
            if (!isQuotaError(e) || keptItems.length <= 1) {
                state.lastMediaPersistStatus = isQuotaError(e) ? 'quota' : 'error';
                console.warn('Media gallery save failed:', e.message);
                return { ok: false, prunedCount: 0, reason: state.lastMediaPersistStatus };
            }
            keptItems.pop();
        }
    }

    state.lastMediaPersistStatus = 'quota';
    return { ok: false, prunedCount: 0, reason: 'quota' };
}

function trimMediaItems() {
    while (state.mediaItems.length > MEDIA_MAX) {
        const removed = state.mediaItems.pop();
        disposeMediaItem(removed);
    }
}

function disposeMediaItem(item) {
    if (item?.kind === 'video' && typeof item.url === 'string' && item.url.startsWith('blob:')) {
        try { URL.revokeObjectURL(item.url); } catch (_) { }
    }
}

function disposeMediaUndoEntry(entry) {
    if (!entry || !String(entry?.type || '').startsWith('media')) return;
    const entries = Array.isArray(entry.items) ? entry.items : [];
    entries.forEach(({ item }) => disposeMediaItem(item));
}

function rememberMediaUndo(entry = null) {
    if (state.lastMediaUndo) disposeMediaUndoEntry(state.lastMediaUndo);
    state.lastMediaUndo = entry
        ? {
            ...entry,
            savedAt: Date.now()
        }
        : null;
}

function getMediaUndoLane(entry = null) {
    if (!entry) return null;
    if (entry.type === 'youtube-single' || entry.type === 'youtube-bulk') {
        return entry.view === 'Videos' ? 'videos' : 'music';
    }
    if (entry.type === 'media-single' || entry.type === 'media-bulk') {
        return entry.bucket === MEDIA_BUCKET_CREATED ? 'created' : 'shots';
    }
    return null;
}

function undoLastMediaRemoval() {
    const undoEntry = state.lastMediaUndo;
    if (!undoEntry) return { ok: false, message: 'Nothing to undo.', lane: null };
    state.lastMediaUndo = null;

    if (undoEntry.type === 'media-single' || undoEntry.type === 'media-bulk') {
        const entries = Array.isArray(undoEntry.items) ? [...undoEntry.items] : [];
        entries
            .sort((a, b) => Number(a?.index || 0) - Number(b?.index || 0))
            .forEach(({ item, index }) => {
                if (!item || typeof item !== 'object') return;
                const safeIndex = Math.max(0, Math.min(state.mediaItems.length, Math.floor(Number(index) || 0)));
                state.mediaItems.splice(safeIndex, 0, item);
            });
        persistMediaGallery();
        renderMediaGallery();
        const lane = getMediaUndoLane(undoEntry);
        return {
            ok: entries.length > 0,
            lane,
            message: entries.length > 1
                ? `Restored ${entries.length} ${lane === 'created' ? 'creation' : 'media'} items.`
                : `Restored ${lane === 'created' ? 'creation' : 'media'} item.`
        };
    }

    if (undoEntry.type === 'youtube-single' || undoEntry.type === 'youtube-bulk') {
        const view = undoEntry.view === 'Videos' ? 'Videos' : 'Music';
        const currentItems = Array.isArray(state.videoPlaylists?.[view]) ? [...state.videoPlaylists[view]] : [];
        const entries = Array.isArray(undoEntry.items) ? [...undoEntry.items] : [];
        entries
            .sort((a, b) => Number(a?.index || 0) - Number(b?.index || 0))
            .forEach(({ item, index }) => {
                if (!item || typeof item !== 'object') return;
                const safeIndex = Math.max(0, Math.min(currentItems.length, Math.floor(Number(index) || 0)));
                currentItems.splice(safeIndex, 0, item);
            });
        const nextPlaylists = { ...(state.videoPlaylists || {}) };
        if (currentItems.length) nextPlaylists[view] = currentItems;
        else delete nextPlaylists[view];
        state.videoPlaylists = nextPlaylists;
        setYouTubeLibraryView(view);
        if (entries.length) {
            state.youtubeLibraryBrowseIndex = normalizeYouTubeLibraryBrowseIndex(entries[0]?.index, currentItems);
        }
        persistVideoPlaylists();
        renderMediaGallery();
        return {
            ok: entries.length > 0,
            lane: getMediaUndoLane(undoEntry),
            message: entries.length > 1
                ? `Restored ${entries.length} ${view.toLowerCase()} items.`
                : `Restored ${view.toLowerCase()} item.`
        };
    }

    return { ok: false, message: 'Nothing to undo.', lane: null };
}

function removeMediaAtGlobalIndex(index) {
    const idx = Number(index);
    if (!Number.isFinite(idx) || idx < 0 || idx >= state.mediaItems.length) return null;
    const safeIdx = Math.floor(idx);
    const activeItemId = Number.isFinite(state.activeMediaIndex) && state.activeMediaIndex >= 0
        ? state.mediaItems[state.activeMediaIndex]?.id
        : null;
    const [removed] = state.mediaItems.splice(safeIdx, 1);
    if (!removed) return null;
    rememberMediaUndo({
        type: 'media-single',
        bucket: normalizeMediaBucket(removed.bucket),
        items: [{ item: removed, index: safeIdx }]
    });
    if (activeItemId && removed.id === activeItemId) {
        closeMediaLightbox();
    } else if (activeItemId) {
        state.activeMediaIndex = findMediaGlobalIndexById(activeItemId);
    }
    persistMediaGallery();
    renderMediaGallery();
    return removed;
}

function removeMediaByBucketIndex(bucket, index) {
    const normalizedBucket = normalizeMediaBucket(bucket);
    const laneItems = getMediaItemsByBucket(normalizedBucket);
    const idx = Number(index);
    if (!Number.isFinite(idx)) return null;
    const safeIdx = Math.floor(idx);
    const item = laneItems[safeIdx];
    if (!item?.id) return null;
    const globalIndex = findMediaGlobalIndexById(item.id);
    if (globalIndex < 0) return null;
    return removeMediaAtGlobalIndex(globalIndex);
}

function removeLatestMediaByBucket(bucket = MEDIA_BUCKET_SHOTS) {
    return removeMediaByBucketIndex(bucket, 0);
}

function removeMediaByNumber(number, bucket = MEDIA_BUCKET_SHOTS) {
    const oneBased = Number(number);
    if (!Number.isFinite(oneBased) || oneBased < 1) return null;
    return removeMediaByBucketIndex(bucket, Math.floor(oneBased) - 1);
}

function removeMediaByNumbers(numbers = [], bucket = MEDIA_BUCKET_SHOTS) {
    const normalizedBucket = normalizeMediaBucket(bucket);
    const laneItems = getMediaItemsByBucket(normalizedBucket);
    const requested = Array.isArray(numbers)
        ? [...new Set(numbers.map((value) => Math.floor(Number(value))).filter((value) => Number.isFinite(value) && value > 0))]
        : [];
    if (!requested.length) return { ok: false, message: normalizedBucket === MEDIA_BUCKET_CREATED ? 'No creations selected.' : 'No photos selected.' };

    const removals = requested
        .map((oneBased) => {
            const item = laneItems[oneBased - 1];
            if (!item?.id) return null;
            const globalIndex = findMediaGlobalIndexById(item.id);
            if (globalIndex < 0) return null;
            return { oneBased, globalIndex, item };
        })
        .filter(Boolean)
        .sort((a, b) => b.globalIndex - a.globalIndex);

    if (!removals.length) {
        return { ok: false, message: normalizedBucket === MEDIA_BUCKET_CREATED ? 'No matching creations.' : 'No matching photos.' };
    }

    const activeItemId = Number.isFinite(state.activeMediaIndex) && state.activeMediaIndex >= 0
        ? state.mediaItems[state.activeMediaIndex]?.id
        : null;
    const removedEntries = removals.map(({ globalIndex, item }) => ({ item, index: globalIndex }));
    const removalIndexes = new Set(removals.map(({ globalIndex }) => globalIndex));
    state.mediaItems = (state.mediaItems || []).filter((_, index) => !removalIndexes.has(index));
    rememberMediaUndo({
        type: 'media-bulk',
        bucket: normalizedBucket,
        items: removedEntries
    });
    if (activeItemId && removals.some(({ item }) => item?.id === activeItemId)) {
        closeMediaLightbox();
    } else if (activeItemId) {
        state.activeMediaIndex = findMediaGlobalIndexById(activeItemId);
    }
    persistMediaGallery();
    renderMediaGallery();

    const labels = removals
        .map(({ oneBased }) => `#${oneBased}`)
        .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
        .join(', ');
    return {
        ok: true,
        message: `${normalizedBucket === MEDIA_BUCKET_CREATED ? 'Removed creations' : 'Removed photos'} ${labels}.`
    };
}

function removeMediaById(id) {
    const globalIndex = findMediaGlobalIndexById(id);
    if (globalIndex < 0) return null;
    return removeMediaAtGlobalIndex(globalIndex);
}

function removeActiveMediaByBucket(bucket = MEDIA_BUCKET_SHOTS) {
    const normalizedBucket = normalizeMediaBucket(bucket);
    if (!Number.isFinite(state.activeMediaIndex) || state.activeMediaIndex < 0) return null;
    const activeItem = state.mediaItems[state.activeMediaIndex];
    if (!activeItem || normalizeMediaBucket(activeItem.bucket) !== normalizedBucket) return null;
    return removeMediaAtGlobalIndex(state.activeMediaIndex);
}

function clearMediaByBucket(bucket = MEDIA_BUCKET_SHOTS) {
    const normalizedBucket = normalizeMediaBucket(bucket);
    const activeItemId = Number.isFinite(state.activeMediaIndex) && state.activeMediaIndex >= 0
        ? state.mediaItems[state.activeMediaIndex]?.id
        : null;
    const removedItems = [];
    const keptItems = [];
    state.mediaItems.forEach((item, index) => {
        if (normalizeMediaBucket(item?.bucket) === normalizedBucket) {
            removedItems.push({ item, index });
            return;
        }
        keptItems.push(item);
    });
    state.mediaItems = keptItems;
    if (!removedItems.length) return 0;
    rememberMediaUndo({
        type: 'media-bulk',
        bucket: normalizedBucket,
        items: removedItems
    });
    if (activeItemId && removedItems.some(({ item }) => item?.id === activeItemId)) {
        closeMediaLightbox();
    } else if (activeItemId) {
        state.activeMediaIndex = findMediaGlobalIndexById(activeItemId);
    }
    persistMediaGallery();
    renderMediaGallery();
    return removedItems.length;
}

function addSnapshotToGallery(base64, source = 'snapshot') {
    if (!base64 || typeof base64 !== 'string') {
        state.lastMediaPersistStatus = 'missing';
        return false;
    }
    const normalized = /^(?:data:|https?:\/\/|blob:)/i.test(base64) ? base64 : `data:image/jpeg;base64,${base64}`;
    const item = {
        id: Date.now(),
        kind: 'image',
        bucket: MEDIA_BUCKET_SHOTS,
        source,
        url: normalized,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        rotation: 0,
        brightness: 1,
        originalUrl: normalized,
        lastEdit: null
    };
    item.title = normalizePhotoTitle('', item);
    item.voiceLabel = buildPhotoVoiceLabel(item);
    state.mediaItems.unshift(item);
    trimMediaItems();
    const persisted = persistMediaGallery();
    const kept = !!state.mediaItems.some((candidate) => candidate?.id === item.id);
    if (!persisted.ok || !kept) {
        state.mediaItems = (state.mediaItems || []).filter((candidate) => candidate?.id !== item.id);
        renderMediaGallery();
        return false;
    }
    renderMediaGallery();
    state.lastMediaPersistStatus = 'ok';
    return true;
}

function addVideoToGallery(url, source = 'video', mimeType = 'video/webm') {
    if (!url || typeof url !== 'string') return;
    const item = {
        id: Date.now(),
        kind: 'video',
        bucket: MEDIA_BUCKET_SHOTS,
        source,
        url,
        mimeType,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    state.mediaItems.unshift(item);
    trimMediaItems();
    persistMediaGallery();
    renderMediaGallery();
}

function addCreationToGallery(base64, source = 'design', options = {}) {
    if (!base64 || typeof base64 !== 'string') {
        state.lastMediaPersistStatus = 'missing';
        return false;
    }
    const normalized = /^(?:data:|https?:\/\/|blob:)/i.test(base64) ? base64 : `data:image/png;base64,${base64}`;
    const targetBucket = CREATIONS_TOOL_ENABLED ? MEDIA_BUCKET_CREATED : MEDIA_BUCKET_SHOTS;
    const title = normalizeCreationTitle(options?.title || source, CREATIONS_TOOL_ENABLED ? 'Creation' : 'Media');
    const exists = Array.isArray(state.mediaItems) && state.mediaItems.some((item) =>
        item?.url === normalized && normalizeMediaBucket(item?.bucket) === targetBucket
    );
    if (exists) {
        state.lastMediaPersistStatus = 'ok';
        return true;
    }
    const item = {
        id: Date.now(),
        kind: 'image',
        bucket: targetBucket,
        source,
        title,
        voiceLabel: normalizeCreationVoiceLabel(title),
        url: normalized,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        rotation: 0,
        brightness: 1,
        originalUrl: normalized,
        lastEdit: null
    };
    state.mediaItems.unshift(item);
    trimMediaItems();
    const persisted = persistMediaGallery();
    const kept = !!state.mediaItems.some((candidate) => candidate?.id === item.id);
    if (!persisted.ok || !kept) {
        state.mediaItems = (state.mediaItems || []).filter((candidate) => candidate?.id !== item.id);
        renderMediaGallery();
        return false;
    }
    renderMediaGallery();
    state.lastMediaPersistStatus = 'ok';
    return true;
}

function getMediaPersistFailureMessage(fallback = 'Could not save that.') {
    if (state.lastMediaPersistStatus === 'quota') {
        return 'Storage is full. Remove some old media and try again.';
    }
    if (state.lastMediaPersistStatus === 'error') {
        return 'Could not save because browser storage failed.';
    }
    return fallback;
}

function snapshotChartFromData(chartData) {
    if (!chartData?.labels?.length || !chartData?.data?.length || typeof Chart === 'undefined') return null;
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = 640;
    tmpCanvas.height = 380;
    const tmpChart = new Chart(tmpCanvas, {
        type: chartData.type || 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: chartData.title || 'Data',
                data: chartData.data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            responsive: false,
            animation: false,
            plugins: { legend: { display: true } }
        }
    });
    const dataUrl = tmpChart.toBase64Image?.() || null;
    tmpChart.destroy();
    return dataUrl;
}

function saveCurrentCreationToGallery() {
    let dataUrl = null;
    let source = 'design';
    let title = '';
    const sidePanel = document.getElementById('blip-side-panel');
    const sidePanelVisible = !!sidePanel && sidePanel.style.display !== 'none';

    if (sidePanelChart?.toBase64Image) {
        dataUrl = sidePanelChart.toBase64Image();
        source = 'graph panel';
        title = normalizeCreationTitle(state.lastContext?.lastChartData?.title || 'Chart', 'Chart');
    }
    // Prefer stored design URL when design panel is showing (ensures solar system / long SVG data URLs save reliably; img src can be truncated).
    if (!dataUrl && state.currentSidePanelAction === 'design' && typeof state.lastContext?.lastDesignDataUrl === 'string' && state.lastContext.lastDesignDataUrl.startsWith('data:image/')) {
        dataUrl = state.lastContext.lastDesignDataUrl;
        source = 'design panel';
        title = normalizeCreationTitle(state.lastContext?.lastDesignPrompt || 'Design', 'Design');
    }
    if (!dataUrl && sidePanelVisible) {
        const panelCanvas = sidePanel.querySelector('canvas');
        if (panelCanvas?.toDataURL) {
            dataUrl = panelCanvas.toDataURL('image/png');
            source = 'design panel';
            title = normalizeCreationTitle(state.lastContext?.lastChartData?.title || state.lastContext?.lastDesignPrompt || 'Design', 'Design');
        }
    }
    if (!dataUrl && sidePanelVisible) {
        const panelImage = sidePanel.querySelector('img');
        const panelSrc = panelImage?.getAttribute('src') || '';
        if (typeof panelSrc === 'string' && /^(?:data:image\/|https?:\/\/|blob:)/i.test(panelSrc)) {
            dataUrl = panelSrc;
            source = state.currentSidePanelAction === 'image' ? 'reference image' : 'design image';
            title = state.currentSidePanelAction === 'image'
                ? normalizeCreationTitle(state.lastContext?.lastSearchTopic || 'Reference Image', 'Reference Image')
                : normalizeCreationTitle(state.lastContext?.lastDesignPrompt || 'Design', 'Design');
        }
    }
    if (!dataUrl && activeChart?.toBase64Image) {
        dataUrl = activeChart.toBase64Image();
        source = 'graph';
        title = normalizeCreationTitle(state.lastContext?.lastChartData?.title || 'Chart', 'Chart');
    }
    if (!dataUrl && state.lastContext?.lastChartData) {
        dataUrl = snapshotChartFromData(state.lastContext.lastChartData);
        source = 'graph memory';
        title = normalizeCreationTitle(state.lastContext?.lastChartData?.title || 'Chart', 'Chart');
    }
    if (!dataUrl && typeof state.lastContext?.lastDesignDataUrl === 'string' && state.lastContext.lastDesignDataUrl.startsWith('data:image/')) {
        dataUrl = state.lastContext.lastDesignDataUrl;
        source = 'design memory';
        title = normalizeCreationTitle(state.lastContext?.lastDesignPrompt || 'Design', 'Design');
    }
    // Save what's in the lightbox when enlarged (so "enlarge then save" works).
    if (!dataUrl && mediaLightbox?.classList.contains('active') && mediaLightboxImage?.src && String(mediaLightboxImage.src).startsWith('data:image/')) {
        dataUrl = mediaLightboxImage.src;
        source = 'lightbox';
        title = normalizeCreationTitle(state.lastContext?.lastDesignPrompt || state.lastContext?.lastChartData?.title || 'Creation', 'Creation');
        if (state.lastContext) state.lastContext.lastDesignDataUrl = dataUrl;
    }
    if (!dataUrl && (state.currentMode === 'map' || state.lastContext?.lastLocation || mapFrame?.src)) {
        return saveLatestMapToGallery();
    }
    if (!dataUrl || !/^(?:data:image\/|https?:\/\/|blob:)/i.test(String(dataUrl))) {
        state.lastMediaPersistStatus = 'missing';
        return false;
    }

    const saved = addCreationToGallery(dataUrl, source, { title: title || deriveCreationTitleFromContext(source) });
    if (saved) {
        toggleMediaGallery(true, 'shots');
    }
    return saved;
}

function isRecipeRequest(text) {
    return RECIPE_QUERY_RE.test(String(text || ''));
}

function buildFallbackRecipeText(topic = 'diabetic-friendly meal') {
    const titleTopic = String(topic || 'diabetic-friendly meal').slice(0, 64);
    return `Diabetic-Friendly Recipe: Lemon Garlic Chicken Bowl

Request focus: ${titleTopic}

Ingredients (2 servings):
- 2 small chicken breasts
- 1 tablespoon olive oil
- 1 teaspoon garlic, minced
- 1 cup broccoli florets
- 1/2 cup red bell pepper, sliced
- 1 cup cooked quinoa
- 1 tablespoon lemon juice
- Salt, black pepper, paprika

Steps:
1. Season chicken with salt, pepper, and paprika.
2. Cook chicken in olive oil on medium heat 5-6 minutes per side.
3. In the same pan, saute garlic, broccoli, and pepper for 4-5 minutes.
4. Slice chicken and serve over quinoa with vegetables.
5. Finish with lemon juice.

Approx nutrition per serving:
- Calories: ~430
- Protein: ~35g
- Carbs: ~30g
- Fiber: ~6g`;
}

async function generateRecipeForChat(userRequest, recipeQuery = '', evidence = '') {
    const focus = String(recipeQuery || userRequest || 'diabetic-friendly meal').trim();
    const systemPrompt = `You are a practical cooking assistant specialized in diabetic-friendly meals.
Give one complete recipe in plain text (no JSON, no markdown code blocks, no links).
Keep it concise, clear, and realistic for home cooking.`;
    const userPrompt = `User request: "${focus}"
Original command: "${String(userRequest || '')}"
Context evidence (optional):
${String(evidence || '').slice(0, 1200)}

Return this structure:
Title:
Why this works for diabetes:
Ingredients (with amounts):
Steps (numbered):
Approx nutrition per serving: calories, protein, carbs, fiber.

Keep it around 120-220 words.`;
    try {
        const raw = await generateWithPrompt(systemPrompt, userPrompt, state.geminiKey, state.selectedModel);
        const cleaned = String(raw || '').trim();
        return cleaned || buildFallbackRecipeText(focus);
    } catch (error) {
        console.warn('Recipe generation fallback:', error?.message || error);
        return buildFallbackRecipeText(focus);
    }
}

function isDesignRequest(text) {
    const lower = normalizeVoiceTokens(String(text || ''));
    if (!lower) return false;
    if (/\b(graph|chart|recipe|nutrition|camera|photo|snapshot|video|youtube|map)\b/.test(lower)) return false;
    if (/\bsave to creations?\b/.test(lower)) return false;
    const directDesignVerb = /\b(draw|design|sketch|illustrate)\b/;
    const buildDesignVerb = /\b(make|create)\b/;
    const designTarget = /\b(drawing|design|sketch|illustration|logo|poster|icon|art|flower|turtle|turle|horse|sun|solar\s+system|planet|planets)\b/;
    if (/^(open|close|hide|scroll|wake|sleep|save|next|previous|play|pause|stop|mute|unmute|volume|go)\b/.test(lower)) return false;
    if (/^show\b/.test(lower) && !designTarget.test(lower)) return false;
    const followUpSignals = /\b(new one|another one|another|redo|update|change|missing|add|with|without|include|problem|fix|only|no|less|more|realistic|accurate|accuracy|cartoon|cartoonish|cleaner|simpler|detail|detailed|darker|lighter|name|names|label|labels)\b|\b(?:do\s+not|don't|dont|can'?t|cannot)\s+see\b/;
    const hasActiveDesignContext = !!state.lastContext?.lastDesignPrompt || !!state.lastContext?.lastDesignDataUrl;
    if (hasActiveDesignContext && followUpSignals.test(lower)) return true;
    if (state.lastContext?.lastDesignDataUrl && followUpSignals.test(lower) && designTarget.test(lower)) return true;
    if (directDesignVerb.test(lower)) return true;
    if (buildDesignVerb.test(lower) && designTarget.test(lower)) return true;
    if (/\b(need|want)\b/.test(lower) && designTarget.test(lower)) return true;
    return false;
}

function isSpaceDesignPrompt(text) {
    const lower = normalizeVoiceTokens(String(text || ''));
    return /\b(solar\s+system|planet|planets|orbit|orbits|mercury|venus|earth|mars|jupiter|saturn|uranus|neptune|sun|moon|space|galaxy)\b/.test(lower);
}

function isRealisticDesignPrompt(text) {
    const lower = normalizeVoiceTokens(String(text || ''));
    return /\b(realistic|photorealistic|realistic-looking|realistic style|photo realistic|accurate|scientific|science|educational|nasa|space documentary)\b/.test(lower);
}

function extractDesignSubject(prompt = '') {
    const raw = String(prompt || '').trim();
    if (!raw) return 'simple friendly illustration';
    let cleaned = normalizeVoiceTokens(raw)
        .replace(/^(?:hey\s+)?blip[,\s]+/, '')
        .replace(/^blip\s+/, '')
        .replace(/^(?:please\s+)?(?:can|could|would|will)\s+you\s+/, '')
        .replace(/^(?:please\s+)?(?:create|make|draw|design|sketch|illustrate|generate|show)\s+(?:me\s+)?(?:a\s+|an\s+|the\s+)?/, '')
        .replace(/\b(?:i am|i'm|we are|we're|im)\s+doing\s+(?:a\s+)?(?:school\s+)?(?:project|work|homework|assignment)\b/g, '')
        .replace(/\b(?:doing|making)\s+(?:a\s+)?(?:school\s+)?(?:project|work|homework|assignment)\b/g, '')
        .replace(/\b(?:a\s+)?work\s+with\s+(?:my\s+)?(?:son|daughter|kid|child|kids|children)\b/g, '')
        .replace(/\bwith\s+(?:my\s+)?(?:son|daughter|kid|child|kids|children)\b/g, '')
        .replace(/\bfor\s+(?:my\s+)?(?:son|daughter|kid|child|kids|children)\b/g, '')
        .replace(/\b(?:my\s+)?(?:son|daughter|kid|child|kids|children)\b/g, '')
        .replace(/\b(?:can\s+)?create\s+(?:a\s+|an\s+|the\s+)?/, '')
        .replace(/\babout\s+/, '')
        .replace(/\bcan\s+you\s+create\s+/, '')
        .replace(/\bcan\s+you\s+make\s+/, '')
        .replace(/^[,.\s]+|[,.\s]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (isSpaceDesignPrompt(cleaned)) {
        return /\bsolar\s+system\b/.test(cleaned) ? 'solar system' : cleaned;
    }
    return cleaned || raw;
}

function buildDesignPromptFromCommand(cmd) {
    const prompt = String(cmd || '').trim();
    const lastPrompt = String(state.lastContext?.lastDesignPrompt || '').trim();
    const lower = normalizeVoiceTokens(prompt);
    const isRefinementOnly = !!lastPrompt && /\b(less|more|realistic|accurate|accuracy|cartoon|cartoonish|cleaner|simpler|detail|detailed|darker|lighter|with|without|add|remove|change|update|redo|fix|name|names|label|labels)\b|\b(?:do\s+not|don't|dont|can'?t|cannot)\s+see\b/.test(lower);
    if (isRefinementOnly) {
        return `${lastPrompt}. Update this design: ${prompt}.`;
    }
    return extractDesignSubject(prompt);
}

function extractDesignStyleHints(prompt = '') {
    const lower = normalizeVoiceTokens(String(prompt || ''));
    const hints = [];
    if (/\brealistic|photorealistic|accurate|scientific\b/.test(lower)) hints.push('realistic');
    if (/\beducational|school|science|diagram\b/.test(lower)) hints.push('educational');
    if (/\bnot\s+cartoon|no\s+cartoon|without\s+cartoon|not\s+cartoonish\b/.test(lower)) hints.push('not cartoon');
    if (/\bcartoon|cartoonish\b/.test(lower) && !/\bnot\s+cartoon|no\s+cartoon|without\s+cartoon|not\s+cartoonish\b/.test(lower)) hints.push('cartoon');
    if (/\bwith\s+labels?|label(?:ed)?\b/.test(lower)) hints.push('with labels');
    if (/\bwith\s+(?:the\s+)?names?\b|\bplanet\s+names?\b|\bnames?\s+of\s+(?:the\s+)?(?:planets?|solar\s+system)\b/.test(lower)) hints.push('with labels');
    if (/\bwithout\s+labels?|no\s+labels?\b/.test(lower)) hints.push('without labels');
    if (/\bwithout\s+text|no\s+text\b/.test(lower)) hints.push('without text');
    if (/\bdark\s+background|black\s+background|space\s+background\b/.test(lower)) hints.push('dark background');
    if (/\bhigh\s+detail|detailed\b/.test(lower)) hints.push('high detail');
    if (/\bclean\b/.test(lower)) hints.push('clean composition');
    return [...new Set(hints)];
}

function extractDesignExplicitRequirements(prompt = '') {
    const lower = normalizeVoiceTokens(String(prompt || ''));
    const requirements = [];

    if (/\bwith\s+(?:the\s+)?names?\b|\bplanet\s+names?\b|\bnames?\s+of\s+(?:the\s+)?(?:planets?|solar\s+system)\b/.test(lower)) {
        requirements.push('Use readable labels with the correct names.');
    }
    if (/\b(correct\s+order|in\s+order|planet\s+order)\b/.test(lower)) {
        requirements.push('Keep the planets in the correct order from the Sun outward.');
    }
    if (/\b(?:all\s+eight|8)\s+planets?\b/.test(lower)) {
        requirements.push('Show all eight planets.');
    }
    if (/\borbit(?:al)?\s+paths?\b|\btrajector(?:y|ies)\b/.test(lower)) {
        requirements.push('Show the orbital paths clearly.');
    }
    if (/\binclude\b\s+(.+)$/.test(lower)) {
        const includeMatch = lower.match(/\binclude\b\s+(.+)$/);
        const includeText = sanitizeVoiceQuery(includeMatch?.[1] || '');
        if (includeText) requirements.push(`Include: ${includeText}.`);
    }

    return [...new Set(requirements)];
}

function buildDesignImagePrompt(prompt = '') {
    const subject = extractDesignSubject(prompt);
    const lower = normalizeVoiceTokens(prompt);
    const styleHints = extractDesignStyleHints(prompt);
    const explicitRequirements = extractDesignExplicitRequirements(prompt);
    const wantsLabels = styleHints.includes('with labels');
    const wantsNoLabels = styleHints.includes('without labels');
    const wantsNoText = styleHints.includes('without text') || wantsNoLabels;
    const realistic = styleHints.includes('realistic') || isRealisticDesignPrompt(prompt) || /\b(realistic|accurate)\b/.test(lower);
    const educational = styleHints.includes('educational');
    const noCartoon = styleHints.includes('not cartoon') || realistic || educational;
    const darkBackground = styleHints.includes('dark background') || isSpaceDesignPrompt(subject);
    const detailLevel = styleHints.includes('high detail') ? 'high detail' : 'clear detail';
    const strictRequirements = explicitRequirements.length
        ? ` Strict requirements from the user: ${explicitRequirements.join(' ')} Do not omit these requested details.`
        : '';
    if (isSpaceDesignPrompt(subject)) {
        const labelInstruction = wantsLabels
            ? 'Leave clean dark space for labels and include clear readable labels for the Sun and each planet. This is mandatory.'
            : wantsNoText
                ? 'Absolutely no text, labels, captions, or writing anywhere in the image.'
                : 'Absolutely no text, labels, captions, or writing anywhere in the image.';
        const accuracyInstruction = 'Show only the Sun and the eight planets once each. Correct order from the Sun outward: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune. Do not add extra planets, duplicate planets, random small spheres, asteroid-belt clutter, or moons unless the user explicitly asks for them. Jupiter must be the largest planet. Saturn must be slightly smaller than Jupiter and have rings. Uranus and Neptune must be smaller ice giants. Mercury must be the smallest. Venus and Earth should be similar in size, with Earth slightly larger. Mars should be smaller than Earth.';
        return realistic
            ? `Create a realistic educational illustration of the solar system from an external observer view. ${accuracyInstruction} Use believable relative size differences, clean spacing, ${darkBackground ? 'deep black space background with subtle stars,' : ''} scientifically plausible planetary colors, and ${detailLevel}. ${labelInstruction}${strictRequirements} No people, no children, no astronauts, no cartoon characters, no mascots.`
            : `Create a polished educational illustration of the solar system. ${accuracyInstruction} Use a ${darkBackground ? 'clean dark space background,' : ''} clear layout and ${detailLevel}. ${labelInstruction}${strictRequirements} No people, no cartoon characters, no mascots.`;
    }
    if (realistic) {
        return `Create a realistic ${educational ? 'educational ' : ''}illustration of ${subject}. Natural lighting, accurate materials, ${detailLevel}, clean composition.${noCartoon ? ' No cartoon style, no mascots.' : ''} ${wantsLabels ? 'Include clear readable labels when requested. This is mandatory if the user asked for names or labels.' : wantsNoText ? 'Absolutely no text, labels, captions, or writing anywhere in the image.' : 'Absolutely no text, labels, captions, or writing anywhere in the image.'}${strictRequirements}`;
    }
    return `Create one polished design illustration for: ${subject}. Clean composition, intentional shapes, high contrast, centered subject.${styleHints.includes('cartoon') ? ' Gentle illustrated/cartoon look is okay.' : ''} ${wantsLabels ? 'Include clear readable labels when requested. This is mandatory if the user asked for names or labels.' : wantsNoText ? 'Absolutely no text, labels, captions, or writing anywhere in the image.' : 'Absolutely no text, labels, captions, or writing anywhere in the image.'}${strictRequirements}`;
}

function closeAuxiliaryPanelsForDesign() {
    if (mediaLightbox?.classList.contains('active')) closeMediaLightbox();
    if (state.isMediaStripOpen) toggleMediaGallery(false);
}

function extractSvgMarkup(raw) {
    const text = String(raw || '');
    const start = text.indexOf('<svg');
    const end = text.lastIndexOf('</svg>');
    if (start === -1 || end === -1 || end <= start) return '';
    return text.slice(start, end + 6).trim();
}

function normalizeSvgMarkup(svg) {
    let safe = String(svg || '');
    if (!safe) return '';
    safe = safe
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
        .replace(/\son\w+="[^"]*"/gi, '')
        .replace(/\son\w+='[^']*'/gi, '')
        .trim();
    if (!safe.startsWith('<svg')) return '';
    if (!/\sxmlns=/.test(safe)) {
        safe = safe.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!/\sviewBox=/.test(safe)) {
        safe = safe.replace('<svg', '<svg viewBox="0 0 1024 1024"');
    }
    return safe;
}

function buildFallbackDesignSvg(prompt = '') {
    const lowerPrompt = normalizeVoiceTokens(String(prompt || ''));
    const wantsFlower = /\bflower\b/.test(lowerPrompt);
    const wantsTurtle = /\b(turtle|turle)\b/.test(lowerPrompt);
    const wantsHorse = /\bhorse\b/.test(lowerPrompt);
    const wantsSun = /\bsun\b/.test(lowerPrompt);
    const title = escapeHtml(String(prompt || 'Blip design').slice(0, 80));
    if (!wantsFlower && !wantsTurtle && !wantsHorse && !wantsSun) {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#07111f"/>
      <stop offset="100%" stop-color="#10315c"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(190,242,255,0.20)"/>
      <stop offset="100%" stop-color="rgba(96,165,250,0.08)"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect x="116" y="136" width="792" height="752" rx="48" fill="url(#panel)" stroke="rgba(191,219,254,0.22)" />
  <rect x="164" y="204" width="696" height="12" rx="6" fill="rgba(125,211,252,0.42)"/>
  <rect x="164" y="246" width="520" height="12" rx="6" fill="rgba(125,211,252,0.22)"/>
  <rect x="164" y="516" width="696" height="160" rx="28" fill="rgba(8,47,73,0.34)" stroke="rgba(125,211,252,0.16)"/>
  <text x="512" y="444" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="700" fill="#e0f2fe">${title}</text>
  <text x="512" y="602" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="28" letter-spacing="8" fill="#93c5fd">BLIP DESIGN PREVIEW</text>
  <text x="512" y="950" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="30" fill="#bfdbfe">Fallback visual generated from your prompt</text>
</svg>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g ${wantsSun ? '' : 'display="none"'}>
    <circle cx="830" cy="180" r="84" fill="#fbbf24" opacity="0.94"/>
    <circle cx="830" cy="180" r="114" fill="#fde68a" opacity="0.24"/>
  </g>
  <g opacity="0.9" ${wantsFlower ? '' : 'display="none"'}>
    <circle cx="300" cy="310" r="120" fill="#f472b6"/>
    <circle cx="230" cy="230" r="55" fill="#f9a8d4"/>
    <circle cx="370" cy="230" r="55" fill="#f9a8d4"/>
    <circle cx="220" cy="350" r="55" fill="#f9a8d4"/>
    <circle cx="380" cy="350" r="55" fill="#f9a8d4"/>
    <circle cx="300" cy="310" r="56" fill="#fde68a"/>
    <rect x="292" y="430" width="16" height="160" rx="8" fill="#22c55e"/>
  </g>
  <g transform="translate(480 560)" ${wantsTurtle ? '' : 'display="none"'}>
    <ellipse cx="200" cy="110" rx="170" ry="95" fill="#22c55e"/>
    <circle cx="355" cy="95" r="52" fill="#16a34a"/>
    <circle cx="370" cy="86" r="8" fill="#0f172a"/>
    <rect x="120" y="168" width="30" height="76" rx="14" fill="#16a34a"/>
    <rect x="178" y="168" width="30" height="76" rx="14" fill="#16a34a"/>
    <rect x="242" y="168" width="30" height="76" rx="14" fill="#16a34a"/>
    <rect x="300" y="168" width="30" height="76" rx="14" fill="#16a34a"/>
  </g>
  <g transform="translate(110 570)" ${wantsHorse ? '' : 'display="none"'}>
    <ellipse cx="240" cy="120" rx="150" ry="84" fill="#a16207"/>
    <circle cx="382" cy="84" r="52" fill="#92400e"/>
    <circle cx="396" cy="76" r="7" fill="#0f172a"/>
    <rect x="150" y="188" width="26" height="96" rx="12" fill="#7c2d12"/>
    <rect x="212" y="188" width="26" height="96" rx="12" fill="#7c2d12"/>
    <rect x="278" y="188" width="26" height="96" rx="12" fill="#7c2d12"/>
    <rect x="336" y="188" width="26" height="96" rx="12" fill="#7c2d12"/>
    <path d="M126 112 C72 122, 66 176, 120 186" fill="none" stroke="#7c2d12" stroke-width="16" stroke-linecap="round"/>
    <path d="M356 38 C322 24, 294 32, 286 72 C320 64, 344 64, 356 38" fill="#78350f"/>
  </g>
  <text x="512" y="950" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="34" fill="#e2e8f0">${title}</text>
</svg>`;
}

function shouldUseStructuredSpaceDiagram(prompt = '') {
    if (!isSpaceDesignPrompt(prompt)) return false;
    const hints = extractDesignStyleHints(prompt);
    return hints.includes('with labels') && !hints.includes('without text');
}

function shouldShowSolarSystemLegend(prompt = '') {
    if (!isSpaceDesignPrompt(prompt)) return false;
    const lower = normalizeVoiceTokens(String(prompt || ''));
    return /\b(label|labels|name|names|planet names|correct order|all eight|8 planets)\b/.test(lower);
}

function appendSolarSystemLegend(container) {
    if (!container) return;
    const legend = document.createElement('div');
    legend.className = 'solar-system-legend';
    legend.style.marginTop = '10px';
    legend.style.padding = '10px';
    legend.style.borderRadius = '12px';
    legend.style.background = 'rgba(103, 171, 255, 0.08)';
    legend.style.border = '1px solid rgba(173, 216, 255, 0.14)';

    const title = document.createElement('div');
    title.style.fontSize = '12px';
    title.style.letterSpacing = '0.12em';
    title.style.textTransform = 'uppercase';
    title.style.color = '#9ecaff';
    title.style.marginBottom = '6px';
    title.textContent = 'Planet Order';
    legend.appendChild(title);

    const order = document.createElement('div');
    order.style.fontSize = '13px';
    order.style.lineHeight = '1.55';
    order.style.color = '#eef7ff';
    order.textContent = 'Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune';
    legend.appendChild(order);

    container.appendChild(legend);
}

function buildStructuredSolarSystemSvg(prompt = '') {
    const realistic = isRealisticDesignPrompt(prompt);
    const title = realistic ? 'Realistic Solar System' : 'Solar System';
    const subtitle = 'Sun and eight planets in correct order';
    const planets = [
        { name: 'Mercury', orbit: 120, radius: 10, x: 632, y: 512, fill: '#b7b9c5' },
        { name: 'Venus', orbit: 165, radius: 14, x: 677, y: 512, fill: '#d4ad6a' },
        { name: 'Earth', orbit: 220, radius: 15, x: 732, y: 512, fill: '#43b0ff' },
        { name: 'Mars', orbit: 278, radius: 12, x: 790, y: 512, fill: '#d97050' },
        { name: 'Jupiter', orbit: 360, radius: 30, x: 872, y: 512, fill: '#d6b08a' },
        { name: 'Saturn', orbit: 445, radius: 26, x: 957, y: 512, fill: '#d6c07d', ring: true },
        { name: 'Uranus', orbit: 520, radius: 22, x: 1032, y: 512, fill: '#86ecff' },
        { name: 'Neptune', orbit: 595, radius: 22, x: 1107, y: 512, fill: '#5278ff' }
    ];

    const orbitSvg = planets.map((planet) =>
        `<circle cx="512" cy="512" r="${planet.orbit}" fill="none" stroke="rgba(125,211,252,0.16)" stroke-width="2" />`
    ).join('');

    const planetSvg = planets.map((planet, index) => {
        const labelY = 140 + (index * 44);
        const ring = planet.ring
            ? `<ellipse cx="${planet.x}" cy="${planet.y}" rx="${planet.radius + 14}" ry="${planet.radius - 4}" fill="none" stroke="rgba(236, 201, 126, 0.72)" stroke-width="5" transform="rotate(-18 ${planet.x} ${planet.y})"/>`
            : '';
        return `
            ${ring}
            <circle cx="${planet.x}" cy="${planet.y}" r="${planet.radius}" fill="${planet.fill}" stroke="rgba(255,255,255,0.42)" stroke-width="2" />
            <line x1="${planet.x}" y1="${planet.y}" x2="140" y2="${labelY}" stroke="rgba(191,219,254,0.48)" stroke-width="2" />
            <circle cx="140" cy="${labelY}" r="4" fill="${planet.fill}" />
            <text x="156" y="${labelY + 6}" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" fill="#eef8ff">${planet.name}</text>
        `;
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 1024">
  <defs>
    <radialGradient id="spaceBg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#0f2145"/>
      <stop offset="55%" stop-color="#071327"/>
      <stop offset="100%" stop-color="#040913"/>
    </radialGradient>
    <radialGradient id="sunGlow" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#fff6c4"/>
      <stop offset="52%" stop-color="#ffd56a"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </radialGradient>
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="1280" height="1024" fill="url(#spaceBg)"/>
  <g opacity="0.55">
    <circle cx="160" cy="120" r="2" fill="#ffffff"/>
    <circle cx="298" cy="232" r="1.6" fill="#bfe8ff"/>
    <circle cx="412" cy="96" r="1.8" fill="#ffffff"/>
    <circle cx="1040" cy="168" r="2" fill="#dbeafe"/>
    <circle cx="1168" cy="264" r="1.7" fill="#ffffff"/>
    <circle cx="980" cy="840" r="1.5" fill="#ffffff"/>
    <circle cx="824" cy="140" r="1.6" fill="#dbeafe"/>
    <circle cx="1184" cy="724" r="1.8" fill="#ffffff"/>
  </g>
  <text x="80" y="76" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="800" fill="#f8fbff">${title}</text>
  <text x="80" y="112" font-family="Inter, Arial, sans-serif" font-size="20" fill="rgba(224,242,254,0.82)">${subtitle}</text>
  <g filter="url(#softGlow)">
    <circle cx="512" cy="512" r="74" fill="url(#sunGlow)" />
    <circle cx="512" cy="512" r="120" fill="rgba(251,191,36,0.18)" />
  </g>
  <text x="440" y="630" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="700" fill="#fff7d6">Sun</text>
  ${orbitSvg}
  ${planetSvg}
</svg>`;
}

async function generateDesignDataUrl(promptText) {
    const prompt = String(promptText || '').trim() || 'simple friendly abstract illustration';
    if (shouldUseStructuredSpaceDiagram(prompt)) {
        const svg = buildStructuredSolarSystemSvg(prompt);
        return {
            dataUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
            source: 'blip structured solar system'
        };
    }
    const preferRaster = isSpaceDesignPrompt(prompt) || isRealisticDesignPrompt(prompt);
    const imagePrompt = buildDesignImagePrompt(prompt);
    const systemPrompt = `You are an SVG illustrator.
Return only one valid SVG image. No markdown fences. No explanations.
Canvas: 1024x1024. Theme: clean, friendly, colorful.`;
    const userPrompt = `Create a simple design illustration for: "${prompt}".
Rules:
- Return only <svg>...</svg>.
- Use layered shapes and gradients.
- Keep it visually clear at small size.
- Avoid external assets and avoid scripts.`;
    if (!preferRaster) {
        try {
            const raw = await generateWithPrompt(systemPrompt, userPrompt, state.geminiKey, state.selectedModel);
            const extracted = extractSvgMarkup(raw);
            const safeSvg = normalizeSvgMarkup(extracted);
            if (safeSvg) {
                return {
                    dataUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(safeSvg)}`,
                    source: 'gemini svg'
                };
            }
        } catch (error) {
            console.warn('Design generation fallback:', error?.message || error);
        }
    }
    if (state.geminiKey) {
        try {
            const image = await generateImage(
                imagePrompt,
                state.geminiKey,
                { model: state.imageModel, timeoutMs: 90000, imageEngine: state.imageEngine, comfyuiBaseUrl: state.comfyuiBaseUrl, comfyuiCheckpoint: state.comfyuiCheckpoint }
            );
            if (image?.dataUrl) {
                return {
                    dataUrl: image.dataUrl,
                    source: 'gemini image fallback'
                };
            }
        } catch (error) {
            console.warn('Design image fallback failed:', error?.message || error);
        }
    }
    const fallbackSvg = buildFallbackDesignSvg(prompt);
    return {
        dataUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(fallbackSvg)}`,
        source: 'fallback svg'
    };
}

function wrapCanvasText(ctx, text, maxWidth, maxLines = 24) {
    const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
        const trial = current ? `${current} ${word}` : word;
        if (ctx.measureText(trial).width <= maxWidth) {
            current = trial;
            continue;
        }
        if (current) lines.push(current);
        current = word;
        if (lines.length >= maxLines) break;
    }
    if (current && lines.length < maxLines) lines.push(current);
    return lines;
}

function buildRecipeSnapshotCardDataUrl(title, body, subtitle = '') {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1320;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#041225');
    bg.addColorStop(1, '#0a1f38');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
    ctx.fillRect(48, 44, canvas.width - 96, 86);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '700 38px "JetBrains Mono", monospace';
    ctx.fillText('BLIP RECIPE SNAPSHOT', 72, 98);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 56px Inter, sans-serif';
    ctx.fillText(String(title || 'Diabetic Meal Recipe').slice(0, 34), 72, 212);

    if (subtitle) {
        ctx.fillStyle = '#93c5fd';
        ctx.font = '500 28px Inter, sans-serif';
        ctx.fillText(String(subtitle).slice(0, 56), 72, 258);
    }

    ctx.fillStyle = 'rgba(15, 23, 42, 0.66)';
    ctx.fillRect(62, 292, canvas.width - 124, canvas.height - 410);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.38)';
    ctx.lineWidth = 2;
    ctx.strokeRect(62, 292, canvas.width - 124, canvas.height - 410);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '500 34px Inter, sans-serif';
    const lines = wrapCanvasText(ctx, body, canvas.width - 180, 22);
    let y = 360;
    lines.forEach((line) => {
        ctx.fillText(line, 92, y);
        y += 48;
    });

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 26px "JetBrains Mono", monospace';
    ctx.fillText(`Saved ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 72, canvas.height - 74);

    return canvas.toDataURL('image/png', 0.92);
}

function resolveLatestMapContext() {
    let query = String(state.lastContext?.lastLocation || '').trim();
    let mapUrl = '';

    if (mapFrame?.src && typeof mapFrame.src === 'string' && mapFrame.src.includes('maps')) {
        try {
            const url = new URL(mapFrame.src);
            const q = url.searchParams.get('q') || '';
            if (q && !query) query = decodeURIComponent(q).replace(/\+/g, ' ').trim();
        } catch (_) { }
    }

    if (query) {
        mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    } else if (mapFrame?.src && typeof mapFrame.src === 'string' && mapFrame.src.startsWith('http')) {
        mapUrl = mapFrame.src;
    }

    return { query, mapUrl };
}

function buildMapSnapshotCardDataUrl(query = '', mapUrl = '') {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 860;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, '#031525');
    bg.addColorStop(1, '#0f2a3d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
    ctx.fillRect(48, 38, canvas.width - 96, 84);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '700 38px "JetBrains Mono", monospace';
    ctx.fillText('BLIP MAP SNAPSHOT', 72, 92);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 54px Inter, sans-serif';
    const queryTitle = String(query || 'Last map location').slice(0, 34);
    ctx.fillText(queryTitle, 72, 198);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.64)';
    ctx.fillRect(62, 246, canvas.width - 124, 470);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.36)';
    ctx.lineWidth = 2;
    ctx.strokeRect(62, 246, canvas.width - 124, 470);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 36px Inter, sans-serif';
    ctx.fillText('Location remembered.', 98, 316);
    ctx.font = '500 32px Inter, sans-serif';
    const details = query || 'No map query available.';
    const lines = wrapCanvasText(ctx, details, canvas.width - 200, 6);
    let y = 372;
    lines.forEach((line) => {
        ctx.fillText(line, 98, y);
        y += 48;
    });

    if (mapUrl) {
        ctx.fillStyle = '#93c5fd';
        ctx.font = '500 24px "JetBrains Mono", monospace';
        const mapLine = `Open: ${mapUrl}`;
        const mapLines = wrapCanvasText(ctx, mapLine, canvas.width - 200, 5);
        let mapY = 612;
        mapLines.forEach((line) => {
            ctx.fillText(line, 98, mapY);
            mapY += 34;
        });
    }

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 24px "JetBrains Mono", monospace';
    ctx.fillText(`Saved ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 72, canvas.height - 56);
    return canvas.toDataURL('image/png', 0.92);
}

function saveLatestRecipeToGallery() {
    const recipeQuery = state.lastContext?.lastRecipeQuery || '';
    const recipeText = state.lastContext?.lastRecipeText || '';
    if (!recipeText) {
        state.lastMediaPersistStatus = 'missing';
        return false;
    }
    const dataUrl = buildRecipeSnapshotCardDataUrl('Diabetic Meal', recipeText, recipeQuery || 'Recipe');
    if (!dataUrl) {
        state.lastMediaPersistStatus = 'error';
        return false;
    }
    const saved = addCreationToGallery(dataUrl, 'recipe snapshot', {
        title: normalizeCreationTitle(recipeQuery || 'Diabetic Meal', 'Recipe')
    });
    if (saved) {
        toggleMediaGallery(true, 'shots');
    }
    return saved;
}

function saveLatestMapToGallery() {
    const { query, mapUrl } = resolveLatestMapContext();
    if (!query && !mapUrl) {
        state.lastMediaPersistStatus = 'missing';
        return false;
    }
    const dataUrl = buildMapSnapshotCardDataUrl(query, mapUrl);
    if (!dataUrl) {
        state.lastMediaPersistStatus = 'error';
        return false;
    }
    const saved = addCreationToGallery(dataUrl, 'map snapshot', {
        title: query ? `Map Of ${normalizeCreationTitle(query, 'Location')}` : 'Map Snapshot'
    });
    if (saved) {
        if (mapUrl) addToHub('link', `🌍 Map saved: ${query || 'location'}`, { url: mapUrl });
        toggleMediaGallery(true, 'shots');
    }
    return saved;
}

function saveLatestPhotoToGallery() {
    let normalized = null;
    let source = 'snapshot';
    if (typeof state.pendingImage === 'string' && state.pendingImage.trim()) {
        normalized = state.pendingImage.startsWith('data:')
            ? state.pendingImage
            : `data:image/jpeg;base64,${state.pendingImage}`;
        source = 'camera';
    } else if (canSaveCurrentImageFromPanel()) {
        normalized = state.currentSidePanelVisualUrl;
        source = state.lastContext?.lastSearchTopic ? `image search: ${state.lastContext.lastSearchTopic}` : 'image panel';
    } else if (Array.isArray(state.mediaItems)) {
        const latestImage = state.mediaItems.find((item) =>
            normalizeMediaBucket(item?.bucket) === MEDIA_BUCKET_SHOTS &&
            item?.kind !== 'video' &&
            item?.url
        );
        if (latestImage) {
            normalized = latestImage.url;
            source = latestImage.source || 'snapshot';
        }
    }
    if (!normalized) {
        state.lastMediaPersistStatus = 'missing';
        return false;
    }
    const exists = Array.isArray(state.mediaItems) && state.mediaItems.some((item) => item?.url === normalized);
    if (!exists) {
        const saved = addSnapshotToGallery(normalized, source);
        if (!saved) return false;
    } else {
        state.lastMediaPersistStatus = 'ok';
    }
    toggleMediaGallery(true, 'shots');
    return true;
}

function returnToPhotosAfterSave() {
    const savedPhotoOpen = mediaLightbox?.classList.contains('active') &&
        state.activeMediaBucket === MEDIA_BUCKET_SHOTS;
    if (savedPhotoOpen) closeMediaLightbox();
    toggleMediaGallery(true, 'shots');
    return savedPhotoOpen;
}

function canSaveCurrentImageFromPanel() {
    const sidePanel = document.getElementById('blip-side-panel');
    return !!sidePanel &&
        sidePanel.style.display !== 'none' &&
        state.currentSidePanelAction === 'image' &&
        typeof state.currentSidePanelVisualUrl === 'string' &&
        !!state.currentSidePanelVisualUrl;
}

function isVideoRecording() {
    return !!(state.mediaRecorder && state.mediaRecorder.state === 'recording');
}

function updateRecordButtonUI() {
    if (!recordBtn) return;
    const recording = isVideoRecording();
    recordBtn.classList.toggle('active', recording);
    recordBtn.innerText = recording ? '⏹ STOP VIDEO' : '🎬 RECORD VIDEO';
    if (snapBtn) {
        snapBtn.disabled = recording;
        snapBtn.style.opacity = recording ? '0.55' : '1';
        snapBtn.style.cursor = recording ? 'not-allowed' : '';
    }
}

function findLatestVideoMediaIndex() {
    if (!Array.isArray(state.mediaItems)) return -1;
    return state.mediaItems.findIndex((item) =>
        normalizeMediaBucket(item?.bucket) === MEDIA_BUCKET_SHOTS &&
        item?.kind === 'video' &&
        typeof item?.url === 'string'
    );
}

function openLatestVideoClip() {
    const videoIdx = findLatestVideoMediaIndex();
    if (videoIdx < 0) return false;
    return openMediaByIndex(videoIdx);
}

function cleanupRecordingCaptureStreams() {
    if (state.recordingStream) {
        state.recordingStream.getTracks().forEach((track) => {
            try { track.stop(); } catch (_) { }
        });
        state.recordingStream = null;
    }
    if (state.recordingAudioStream) {
        state.recordingAudioStream.getTracks().forEach((track) => {
            try { track.stop(); } catch (_) { }
        });
        state.recordingAudioStream = null;
    }
}

async function buildRecordingStream() {
    if (!state.cameraStream) return null;
    const videoTracks = state.cameraStream.getVideoTracks().map((track) => {
        try { return track.clone(); } catch (_) { return track; }
    });
    const tracks = [...videoTracks];
    if (navigator.mediaDevices?.getUserMedia) {
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            state.recordingAudioStream = audioStream;
            tracks.push(...audioStream.getAudioTracks());
        } catch (err) {
            console.warn('Recording audio unavailable:', err?.message || err);
        }
    }
    if (!tracks.length) return null;
    const recordingStream = new MediaStream(tracks);
    state.recordingStream = recordingStream;
    return recordingStream;
}

async function startVideoRecording() {
    if (!state.cameraStream || typeof MediaRecorder === 'undefined') return false;
    if (isVideoRecording()) return true;
    cleanupRecordingCaptureStreams();
    const stream = await buildRecordingStream();
    if (!stream) return false;
    let recorder = null;
    try {
        const candidates = [
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9,opus',
            'video/webm',
            'video/mp4;codecs=h264,aac',
            'video/mp4'
        ];
        const supportedMimeType = candidates.find((mimeType) => MediaRecorder.isTypeSupported?.(mimeType));
        recorder = supportedMimeType
            ? new MediaRecorder(stream, { mimeType: supportedMimeType, videoBitsPerSecond: 700_000 })
            : new MediaRecorder(stream);
    } catch (e) {
        console.warn('MediaRecorder start failed:', e.message);
        cleanupRecordingCaptureStreams();
        return false;
    }

    state.mediaRecorder = recorder;
    state.recordingChunks = [];
    state.recordingStartedAt = Date.now();
    state.recordingStopReason = 'manual';

    recorder.ondataavailable = (event) => {
        if (event?.data && event.data.size > 0) state.recordingChunks.push(event.data);
    };
    recorder.onstop = () => {
        const chunks = state.recordingChunks || [];
        state.recordingChunks = [];
        if (state.recordingAutoStopTimer) {
            clearTimeout(state.recordingAutoStopTimer);
            state.recordingAutoStopTimer = null;
        }
        cleanupRecordingCaptureStreams();
        if (!chunks.length) {
            state.mediaRecorder = null;
            updateRecordButtonUI();
            return;
        }
        const mimeType = recorder.mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        addVideoToGallery(url, 'camera video', mimeType);
        const stopReason = state.recordingStopReason || 'manual';
        state.recordingStopReason = null;
        state.mediaRecorder = null;
        toggleMediaGallery(true, 'shots');
        updateRecordButtonUI();
        if (transcriptText) {
            transcriptText.innerText = stopReason === 'auto'
                ? 'Video auto-saved. Say "open latest video clip".'
                : 'Video saved. Say "open latest video clip".';
        }
    };
    recorder.onerror = (event) => {
        console.warn('MediaRecorder error:', event?.error?.message || 'unknown');
        state.mediaRecorder = null;
        state.recordingChunks = [];
        state.recordingStopReason = null;
        cleanupRecordingCaptureStreams();
        updateRecordButtonUI();
        if (transcriptText) transcriptText.innerText = 'Video recording failed.';
    };

    try {
        recorder.start(300);
    } catch (e) {
        console.warn('MediaRecorder start failed:', e.message);
        state.mediaRecorder = null;
        state.recordingChunks = [];
        state.recordingStopReason = null;
        cleanupRecordingCaptureStreams();
        updateRecordButtonUI();
        return false;
    }
    state.recordingAutoStopTimer = setTimeout(() => {
        if (isVideoRecording()) {
            state.recordingStopReason = 'auto';
            try { recorder.stop(); } catch (_) { }
        }
    }, CAMERA_RECORDING_MAX_MS);
    updateRecordButtonUI();
    if (transcriptText) transcriptText.innerText = 'Recording video with sound when available. Say stop recording when ready.';
    return true;
}

async function stopVideoRecording() {
    if (!isVideoRecording()) return false;
    const recorder = state.mediaRecorder;
    state.recordingStopReason = 'manual';
    await new Promise((resolve) => {
        const done = () => resolve();
        recorder.addEventListener('stop', done, { once: true });
        try { recorder.stop(); } catch (_) { resolve(); }
    });
    updateRecordButtonUI();
    return true;
}

function renderMediaGallery() {
    const shotItems = getMediaItemsByBucket(MEDIA_BUCKET_SHOTS);
    const musicItems = getYouTubeLibraryItems('Music');
    const videoItems = getYouTubeLibraryItems('Videos');
    const hasMedia = shotItems.length + musicItems.length + videoItems.length > 0;
    const lane = normalizeMediaLane(state.mediaStripLane);
    const showingShots = lane === 'all' || lane === 'shots';
    const showingMusic = lane === 'all' || lane === 'music';
    const showingVideos = lane === 'all' || lane === 'videos';
    const laneCount = lane === 'music'
            ? musicItems.length
            : lane === 'videos'
                ? videoItems.length
                : lane === 'shots'
            ? shotItems.length
            : shotItems.length + musicItems.length + videoItems.length;

    if (mediaStrip) {
        mediaStrip.classList.toggle('hidden', !state.isMediaStripOpen);
        mediaStrip.style.display = '';
        mediaStrip.setAttribute('aria-hidden', state.isMediaStripOpen ? 'false' : 'true');
    }
    if (mediaStripCount) mediaStripCount.textContent = String(laneCount);
    if (mediaStripTabs) {
        mediaStripTabs.querySelectorAll('[data-media-lane]').forEach((btn) => {
            btn.classList.toggle('is-active', normalizeMediaLane(btn.getAttribute('data-media-lane')) === lane);
        });
    }
    if (mediaStripTitle) {
        mediaStripTitle.textContent = lane === 'music'
                ? 'Music'
                : lane === 'videos'
                    ? 'Videos'
                    : lane === 'shots'
                        ? 'Photos'
                        : 'Media';
    }
    if (mediaStripHint) {
        mediaStripHint.textContent = lane === 'music'
            ? 'Say "open 3", "delete 3", or "scroll down" for saved music.'
            : lane === 'videos'
                ? 'Say "open 3", "delete 3", or "scroll down" for saved videos.'
                : lane === 'shots'
                        ? 'Say "open 3", "open photo March 19", or "delete 3" for photos.'
                        : 'Say "open photos", "open music", "open videos", or "scroll down".';
    }
    if (mediaStripCommands) {
        const commandPills = lane === 'music'
            ? ['open 3', 'delete 3', 'undo delete', 'change to videos']
            : lane === 'videos'
                ? ['open 3', 'delete 3', 'undo delete', 'change to music']
                : lane === 'shots'
                        ? ['open 3', 'open photo March 19', 'delete 3', 'undo delete']
                        : ['open photos', 'open music', 'open videos', 'undo delete'];
        mediaStripCommands.innerHTML = commandPills
            .map((label) => `<span class="media-strip-command">"${escapeHtml(label)}"</span>`)
            .join('');
    }
    if (mediaStripShotsCount) mediaStripShotsCount.textContent = String(shotItems.length);
    if (mediaStripMusicCount) mediaStripMusicCount.textContent = String(musicItems.length);
    if (mediaStripVideosCount) mediaStripVideosCount.textContent = String(videoItems.length);
    if (mediaStripShotsGroup) mediaStripShotsGroup.style.display = showingShots ? '' : 'none';
    if (mediaStripMusicGroup) mediaStripMusicGroup.style.display = showingMusic ? '' : 'none';
    if (mediaStripVideosGroup) mediaStripVideosGroup.style.display = showingVideos ? '' : 'none';

    const renderStripList = (listEl, items, emptyText, bucket) => {
        if (!listEl) return;
        if (!items.length) {
            listEl.innerHTML = `<button type="button" class="media-strip-empty">${emptyText}</button>`;
            return;
        }
        listEl.innerHTML = items.slice(0, 14).map((item, idx) => `
            <button
                type="button"
                class="media-strip-card ${item.kind === 'video' ? 'video' : ''} ${bucket === MEDIA_BUCKET_CREATED ? 'created' : ''}"
                data-media-url="${item.url}"
                data-media-kind="${item.kind || 'image'}"
                data-media-index="${idx + 1}"
                data-media-bucket="${bucket}"
                title="Open ${escapeHtml(bucket === MEDIA_BUCKET_CREATED ? (item.title || `creation ${idx + 1}`) : `shot ${idx + 1}`)} • ${escapeHtml(formatMediaDateLabel(item))}">
                <span class="media-strip-index">#${idx + 1}</span>
                ${item.kind === 'video'
                ? `<video src="${item.url}" muted playsinline preload="metadata"></video>`
                : `<img src="${item.url}" alt="${bucket === MEDIA_BUCKET_CREATED ? 'Creation' : 'Shot'} ${idx + 1}" style="--media-rotation:${normalizeMediaRotation(item.rotation)}deg; --media-brightness:${normalizeMediaBrightness(item.brightness)};">`}
                ${bucket === MEDIA_BUCKET_CREATED ? `<span class="media-strip-label">${escapeHtml(item.title || `Creation ${idx + 1}`)}</span>` : ''}
            </button>
        `).join('');
        listEl.querySelectorAll('.media-strip-card').forEach((card) => {
            card.onclick = () => {
                const idx = Number(card.getAttribute('data-media-index')) - 1;
                const cardBucket = normalizeMediaBucket(card.getAttribute('data-media-bucket'));
                if (Number.isFinite(idx) && idx >= 0) openMediaByBucketIndex(cardBucket, idx);
            };
        });
    };

    renderStripList(mediaStripList, shotItems, 'No snapshots yet.', MEDIA_BUCKET_SHOTS);

    const renderYouTubeStripList = (listEl, items, emptyText, view) => {
        if (!listEl) return;
        if (!items.length) {
            listEl.innerHTML = `<button type="button" class="media-strip-empty">${emptyText}</button>`;
            return;
        }
        const isActiveView = getActiveSavedYouTubeViewForVoice() === view;
        const activeIndex = isActiveView
            ? normalizeYouTubeLibraryBrowseIndex(state.youtubeLibraryBrowseIndex, items)
            : -1;
        if (isActiveView) state.youtubeLibraryBrowseIndex = activeIndex;
        listEl.innerHTML = items.slice(0, 14).map((item, idx) => {
            const title = escapeHtml(String(item?.title || item?.query || 'Saved item'));
            const subtitle = escapeHtml(String(item?.query || view));
            const activeClass = idx === activeIndex ? ' active' : '';
            return `
                <button
                    type="button"
                    class="media-strip-card youtube-saved${activeClass}"
                    data-yt-media-play="${view}"
                    data-yt-index="${idx}"
                    data-yt-video-id="${escapeHtml(String(item?.videoId || ''))}"
                    aria-current="${idx === activeIndex ? 'true' : 'false'}"
                    title="Play ${title}">
                    <span class="media-strip-index">#${idx + 1}</span>
                    <span class="media-strip-youtube-icon">${view === 'Music' ? '♪' : '▶'}</span>
                    <span class="media-strip-youtube-title">${title}</span>
                    <span class="media-strip-youtube-meta">${subtitle}</span>
                </button>
            `;
        }).join('');
        listEl.querySelectorAll('[data-yt-media-play]').forEach((card) => {
            card.onclick = () => {
                const rawIndex = Number(card.getAttribute('data-yt-index'));
                const nextView = card.getAttribute('data-yt-media-play') === 'Videos' ? 'Videos' : 'Music';
                setYouTubeLibraryView(nextView);
                state.youtubeLibraryBrowseIndex = Number.isFinite(rawIndex) ? rawIndex : state.youtubeLibraryBrowseIndex;
                syncYouTubeLibraryBrowseSelection({ scrollIntoView: false });
                const oneBased = Number.isFinite(rawIndex) ? rawIndex + 1 : NaN;
                if (!Number.isFinite(oneBased) || oneBased < 1) return;
                playSavedYouTubeItemByNumber(oneBased, nextView);
            };
        });
    };

    renderYouTubeStripList(mediaStripMusicList, musicItems, 'No saved music yet.', 'Music');
    renderYouTubeStripList(mediaStripVideosList, videoItems, 'No saved videos yet.', 'Videos');

    // Keep legacy full gallery panel in sync (fallback/debug)
    if (!mediaGrid) return;
    if (!hasMedia) {
        mediaGrid.innerHTML = '<div class="media-empty">No media yet. Say "snap photo" or save music/videos to start.</div>';
        return;
    }
    const mediaGridItems = state.mediaItems.filter((item) => {
        const bucket = normalizeMediaBucket(item?.bucket);
        if (lane === 'shots') return bucket === MEDIA_BUCKET_SHOTS;
        if (lane === 'music' || lane === 'videos') return false;
        return bucket === MEDIA_BUCKET_SHOTS;
    });
    let runningIndex = 0;
    mediaGrid.innerHTML = groupMediaItemsByWeek(mediaGridItems).map((group) => {
        const cardsHtml = group.items.map((item) => {
            runningIndex += 1;
            const mediaDate = formatMediaDateLabel(item);
            return `
                <button
                    type="button"
                    class="media-card"
                    data-media-url="${item.url}"
                    data-media-id="${item.id}"
                    data-media-kind="${item.kind || 'image'}"
                    data-media-index="${runningIndex}"
                    data-media-bucket="${normalizeMediaBucket(item.bucket)}"
                    title="Open item #${runningIndex}">
                    <span class="media-index">#${runningIndex}</span>
                    ${item.kind === 'video'
                        ? `<video src="${item.url}" muted playsinline preload="metadata"></video>`
                        : `<img src="${item.url}" alt="Blip media" style="--media-rotation:${normalizeMediaRotation(item.rotation)}deg; --media-brightness:${normalizeMediaBrightness(item.brightness)};">`}
                    <span class="media-meta">${normalizeMediaBucket(item.bucket) === MEDIA_BUCKET_CREATED ? escapeHtml(item.title || 'Creation') : `shot · ${escapeHtml(item.source || 'photo')}`}</span>
                    <span class="media-date">${mediaDate}</span>
                </button>
            `;
        }).join('');
        return `
            <div class="media-week-group">
                <div class="media-week-header">${escapeHtml(formatMediaWeekLabel(group))}</div>
                <div class="media-week-grid">${cardsHtml}</div>
            </div>
        `;
    }).join('');
    mediaGrid.querySelectorAll('.media-card').forEach((card) => {
        card.onclick = () => {
            const url = card.getAttribute('data-media-url');
            const itemId = Number(card.getAttribute('data-media-id'));
            const kind = card.getAttribute('data-media-kind') || 'image';
            const bucket = normalizeMediaBucket(card.getAttribute('data-media-bucket'));
            const idx = Number.isFinite(itemId) ? findMediaGlobalIndexById(itemId) : -1;
            if (url) openMediaLightbox(url, idx >= 0 ? idx : null, kind, bucket);
        };
    });
}

function openMediaByBucketIndex(bucket, index) {
    const normalizedBucket = normalizeMediaBucket(bucket);
    const oneLaneItems = getMediaItemsByBucket(normalizedBucket);
    const idx = Number(index);
    if (!Number.isFinite(idx)) return false;
    const safeIdx = Math.floor(idx);
    const item = oneLaneItems[safeIdx];
    if (!item?.url) return false;
    const globalIndex = findMediaGlobalIndexById(item.id);
    if (globalIndex < 0) return false;
    toggleMediaGallery(true, normalizedBucket === MEDIA_BUCKET_CREATED ? 'created' : 'shots');
    openMediaLightbox(item.url, globalIndex, item.kind || 'image', normalizedBucket);
    return isMediaLightboxActuallyVisible(item.kind === 'video' ? 'video' : 'image');
}

function openLatestMediaByBucket(bucket = MEDIA_BUCKET_SHOTS) {
    return openMediaByBucketIndex(bucket, 0);
}

function getLatestMediaItemByBucket(bucket = MEDIA_BUCKET_SHOTS) {
    const laneItems = getMediaItemsByBucket(bucket);
    return laneItems[0] || null;
}

function getLatestImageItemByBucket(bucket = MEDIA_BUCKET_SHOTS) {
    const laneItems = getMediaItemsByBucket(bucket);
    return laneItems.find((item) => item?.kind !== 'video' && item?.url) || null;
}

function openLatestImageByBucket(bucket = MEDIA_BUCKET_SHOTS) {
    const laneItems = getMediaItemsByBucket(bucket);
    const imageIndex = laneItems.findIndex((item) => item?.kind !== 'video' && item?.url);
    if (imageIndex < 0) return false;
    return openMediaByBucketIndex(bucket, imageIndex);
}

function openMediaByIndex(index) {
    const idx = Number(index);
    if (!Number.isFinite(idx)) return false;
    const safeIdx = Math.floor(idx);
    const item = state.mediaItems?.[safeIdx];
    if (!item?.url) return false;
    const bucket = normalizeMediaBucket(item.bucket);
    toggleMediaGallery(true, bucket === MEDIA_BUCKET_CREATED ? 'created' : 'shots');
    openMediaLightbox(item.url, safeIdx, item.kind || 'image', bucket);
    return isMediaLightboxActuallyVisible(item.kind === 'video' ? 'video' : 'image');
}

function openMediaByNumber(number, bucket = MEDIA_BUCKET_SHOTS) {
    const oneBased = Number(number);
    if (!Number.isFinite(oneBased) || oneBased < 1) return false;
    return openMediaByBucketIndex(bucket, Math.floor(oneBased) - 1);
}

function openMediaById(id) {
    const globalIndex = findMediaGlobalIndexById(id);
    if (globalIndex < 0) return false;
    return openMediaByIndex(globalIndex);
}

function openMediaRelative(delta) {
    const bucket = normalizeMediaBucket(state.activeMediaBucket);
    const laneItems = getMediaItemsByBucket(bucket);
    if (!laneItems.length) return false;

    let currentInLane = 0;
    if (Number.isFinite(state.activeMediaIndex) && state.activeMediaIndex >= 0) {
        const currentGlobal = state.mediaItems[state.activeMediaIndex];
        if (currentGlobal?.id) {
            const found = laneItems.findIndex((item) => item?.id === currentGlobal.id);
            if (found >= 0) currentInLane = found;
        }
    }
    const next = (currentInLane + delta + laneItems.length) % laneItems.length;
    return openMediaByBucketIndex(bucket, next);
}

function openMediaLightbox(url, index = null, kind = 'image', bucket = MEDIA_BUCKET_SHOTS) {
    if (!mediaLightbox || !mediaLightboxImage || !url) return;
    const normalizedBucket = normalizeMediaBucket(bucket);
    const mediaKind = kind === 'video' ? 'video' : 'image';
    if (mediaKind === 'video' && mediaLightboxVideo) {
        mediaLightboxImage.style.display = 'none';
        mediaLightboxVideo.style.display = 'block';
        mediaLightboxVideo.src = url;
        const playPromise = mediaLightboxVideo.play?.();
        if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => { });
    } else {
        if (mediaLightboxVideo) {
            mediaLightboxVideo.pause?.();
            mediaLightboxVideo.src = '';
            mediaLightboxVideo.style.display = 'none';
        }
        mediaLightboxImage.style.display = 'block';
        mediaLightboxImage.src = url;
    }
    mediaLightbox.style.display = 'flex';
    mediaLightbox.style.visibility = 'visible';
    mediaLightbox.style.opacity = '1';
    mediaLightbox.style.pointerEvents = 'auto';
    mediaLightbox.classList.add('active');
    mediaLightbox.setAttribute('aria-hidden', 'false');
    state.activeMediaBucket = normalizedBucket;
    if (Number.isFinite(index) && index >= 0) {
        state.activeMediaIndex = Math.floor(index);
    } else {
        const found = state.mediaItems.findIndex((item) =>
            item?.url === url && normalizeMediaBucket(item?.bucket) === normalizedBucket
        );
        state.activeMediaIndex = found >= 0 ? found : -1;
    }
    const activeItem = Number.isFinite(state.activeMediaIndex) && state.activeMediaIndex >= 0
        ? state.mediaItems[state.activeMediaIndex]
        : null;
    const activeId = activeItem?.id;
    const overrideBrightness = activeId != null ? state.mediaBrightnessOverrides?.[String(activeId)] : null;
    mediaLightboxImage.style.setProperty('--media-rotation', `${normalizeMediaRotation(activeItem?.rotation)}deg`);
    mediaLightboxImage.style.setProperty(
        '--media-brightness',
        String(normalizeMediaBrightness(overrideBrightness != null ? overrideBrightness : 1))
    );
    syncMediaLightboxActionButtons();
}

function clearSidePanelContext() {
    stopTimerPanelTicker();
    if (state.currentSidePanelAction === 'telegram') {
        state.pendingTelegramReview = false;
    }
    state.currentSidePanelAction = '';
    state.currentSidePanelVisualUrl = '';
    document.body.classList.remove('blip-gmail-panel-open', 'blip-telegram-panel-open');
}

function applyDefaultSidePanelLayout(sidePanel, action = '') {
    if (!sidePanel) return;
    sidePanel.classList.remove('blip-video-big', 'blip-side-panel-centered', 'blip-calendar-orb', 'blip-side-panel-workspace', 'blip-gmail-dock', 'blip-telegram-dock');
    sidePanel.dataset.panelAction = action || '';
    delete sidePanel.dataset.youtubeLibraryOnly;
    sidePanel.querySelectorAll('.blip-workspace-dock').forEach((node) => node.remove());
    sidePanel.style.top = '120px';
    sidePanel.style.left = 'auto';
    sidePanel.style.right = '32px';
    sidePanel.style.transform = 'none';
    sidePanel.style.width = '280px';
    sidePanel.style.height = '340px';
    sidePanel.style.padding = '14px';
    sidePanel.style.borderRadius = '18px';
    sidePanel.style.overflow = 'auto';
    sidePanel.style.background = 'rgba(10, 10, 30, 0.96)';
    sidePanel.style.border = '1px solid rgba(125, 211, 252, 0.18)';
    sidePanel.style.boxShadow = '0 18px 48px rgba(2, 6, 23, 0.5)';
}

/** Wide, centered workspace tools. Gmail & Telegram use compact corner docks, not this. */
function isWideWorkspaceAction(action = '') {
    return ['youtube', 'products', 'notes', 'image', 'design', 'drawing', 'chart'].includes(String(action || ''));
}

function panelUsesFlexColumnLayout(action = '') {
    return isWideWorkspaceAction(action) || action === 'gmail' || action === 'telegram';
}

function applyWorkspaceSidePanelLayout(sidePanel, action = '') {
    if (!sidePanel) return;
    sidePanel.classList.add('blip-side-panel-workspace');
    sidePanel.style.top = '50%';
    sidePanel.style.left = '50%';
    sidePanel.style.right = 'auto';
    sidePanel.style.transform = 'translate(-50%, -50%)';
    sidePanel.style.width = 'min(1120px, calc(100vw - 40px))';
    sidePanel.style.height = 'min(760px, calc(100vh - 52px))';
    sidePanel.style.padding = '18px 124px 18px 18px';
    sidePanel.style.borderRadius = '28px';
    sidePanel.style.overflow = action === 'youtube' ? 'hidden' : 'auto';
    sidePanel.style.display = 'flex';
    sidePanel.style.flexDirection = 'column';
}

/** Gmail: compact bottom-right dock — fixed panel is on BODY; #app padding + 100% widths keep the face clear. */
function applyGmailSidePanelLayout(sidePanel) {
    if (!sidePanel) return;
    sidePanel.classList.remove('blip-side-panel-workspace', 'blip-side-panel-centered', 'blip-calendar-orb', 'blip-telegram-dock');
    sidePanel.classList.add('blip-gmail-dock');
    sidePanel.style.top = 'auto';
    sidePanel.style.bottom = 'max(10px, env(safe-area-inset-bottom, 0px))';
    sidePanel.style.left = 'auto';
    sidePanel.style.right = 'max(10px, env(safe-area-inset-right, 0px))';
    sidePanel.style.transform = 'none';
    sidePanel.style.width = 'min(240px, calc(100vw - 20px))';
    sidePanel.style.maxWidth = 'min(240px, calc(100vw - 20px))';
    sidePanel.style.height = 'min(24vh, 300px)';
    sidePanel.style.maxHeight = 'min(24vh, 300px)';
    sidePanel.style.padding = '10px 12px';
    sidePanel.style.borderRadius = '18px';
    sidePanel.style.overflow = 'auto';
    sidePanel.style.display = 'flex';
    sidePanel.style.flexDirection = 'column';
}

/** Telegram: same compact bottom-right dock as Gmail (face stays visible). */
function applyTelegramSidePanelLayout(sidePanel) {
    if (!sidePanel) return;
    sidePanel.classList.remove('blip-side-panel-workspace', 'blip-side-panel-centered', 'blip-calendar-orb', 'blip-gmail-dock');
    sidePanel.classList.add('blip-telegram-dock');
    sidePanel.style.top = 'auto';
    sidePanel.style.bottom = 'max(10px, env(safe-area-inset-bottom, 0px))';
    sidePanel.style.left = 'auto';
    sidePanel.style.right = 'max(10px, env(safe-area-inset-right, 0px))';
    sidePanel.style.transform = 'none';
    sidePanel.style.width = 'min(240px, calc(100vw - 20px))';
    sidePanel.style.maxWidth = 'min(240px, calc(100vw - 20px))';
    sidePanel.style.height = 'min(24vh, 300px)';
    sidePanel.style.maxHeight = 'min(24vh, 300px)';
    sidePanel.style.padding = '10px 12px';
    sidePanel.style.borderRadius = '18px';
    sidePanel.style.overflow = 'auto';
    sidePanel.style.display = 'flex';
    sidePanel.style.flexDirection = 'column';
}

function getWorkspaceDockText(action = '') {
    if (action === 'products') return { title: 'Blip Shop', hint: 'Browse and compare' };
    if (action === 'notes') return { title: 'Blip Notes', hint: 'Listen and save' };
    if (action === 'gmail') return { title: 'Blip Email', hint: 'Inbox and compose' };
    if (action === 'telegram') return { title: 'Blip Telegram', hint: 'Text and photo send' };
    if (action === 'image' || action === 'design' || action === 'drawing') return { title: 'Blip Vision', hint: 'Create and inspect' };
    if (action === 'chart') return { title: 'Blip Data', hint: 'View and save' };
    return { title: 'Blip', hint: 'Voice ready' };
}

function ensureWorkspaceDock(sidePanel, action = '') {
    if (!sidePanel || !isWideWorkspaceAction(action) || action === 'youtube') return;
    if (sidePanel.querySelector('.blip-workspace-dock')) return;
    const dock = document.createElement('div');
    dock.className = 'blip-workspace-dock';
    const dockText = getWorkspaceDockText(action);
    dock.innerHTML = `
        <div class="blip-workspace-orb" aria-hidden="true">
            <span class="blip-workspace-orb-core"></span>
            <span class="blip-workspace-orb-ring"></span>
            <span class="blip-workspace-orb-ring blip-workspace-orb-ring-outer"></span>
        </div>
        <div class="blip-workspace-dock-title">${escapeHtml(dockText.title)}</div>
        <div class="blip-workspace-dock-hint">${escapeHtml(dockText.hint)}</div>
    `;
    sidePanel.appendChild(dock);
}

function getSidePanelSummaryText(text = '') {
    const summary = String(text || '').trim();
    if (!summary) return '';
    return summary.slice(0, 200) + (summary.length > 200 ? '…' : '');
}

function buildSidePanelHeaderHtml({ title = 'Panel', summary = '', kicker = 'Tool', controls = '' } = {}) {
    const safeTitle = escapeHtml(String(title || 'Panel'));
    const safeSummary = escapeHtml(String(summary || ''));
    const safeKicker = escapeHtml(String(kicker || 'Tool'));
    return `
        <button type="button" aria-label="Close panel" class="blip-panel-close">×</button>
        ${controls ? `<div class="blip-panel-top-actions">${controls}</div>` : ''}
        <div class="blip-panel-head ${controls ? 'has-actions' : ''}">
            <div class="blip-panel-signal" aria-hidden="true">
                <span class="blip-panel-signal-core"></span>
                <span class="blip-panel-signal-ring"></span>
            </div>
            <div class="blip-panel-kicker">${safeKicker}</div>
            <h3 class="blip-panel-title">${safeTitle}</h3>
            ${safeSummary ? `<p class="blip-panel-summary">${safeSummary}</p>` : ''}
        </div>
    `;
}

function buildYouTubeShellHtml(innerHtml = '', variant = 'player') {
    return `
        <div class="blip-yt-shell blip-yt-shell-${escapeHtml(String(variant || 'player'))}">
            <div class="blip-yt-stars" aria-hidden="true">
                <span class="blip-yt-star star-1"></span>
                <span class="blip-yt-star star-2"></span>
                <span class="blip-yt-star star-3"></span>
                <span class="blip-yt-star star-4"></span>
                <span class="blip-yt-star star-5"></span>
                <span class="blip-yt-star star-6"></span>
                <span class="blip-yt-star star-7"></span>
                <span class="blip-yt-star star-8"></span>
            </div>
            <div class="blip-yt-particles" aria-hidden="true">
                <span class="blip-yt-particle particle-1"></span>
                <span class="blip-yt-particle particle-2"></span>
                <span class="blip-yt-particle particle-3"></span>
                <span class="blip-yt-particle particle-4"></span>
                <span class="blip-yt-particle particle-5"></span>
            </div>
            <div class="blip-yt-shell-frame">
                ${innerHtml}
            </div>
        </div>
    `;
}

function isCreationsPanelOpen() {
    return CREATIONS_TOOL_ENABLED && isSidePanelVisible() && state.currentSidePanelAction === 'creations';
}

function openCreationsPanel(summary = '') {
    if (!CREATIONS_TOOL_ENABLED) {
        toggleMediaGallery(true, 'shots');
        return;
    }
    const count = getMediaItemsByBucket(MEDIA_BUCKET_CREATED).length;
    renderActionInSidePanel({
        action: 'creations',
        tool_params: {},
        text: summary || (count > 0 ? `Creations open. ${count} item${count === 1 ? '' : 's'}.` : 'Creations open. Empty.')
    });
}

function closeSidePanel() {
    if (state.currentSidePanelAction === 'youtube') {
        closeYouTubePanel();
        return 'youtube';
    }
    if (closeCalendarPanel()) {
        return 'calendar';
    }
    const sidePanel = document.getElementById('blip-side-panel');
    if (!sidePanel || sidePanel.style.display === 'none') return null;
    sidePanel.innerHTML = '';
    sidePanel.style.display = 'none';
    applyDefaultSidePanelLayout(sidePanel);
    clearSidePanelContext();
    return 'panel';
}

function canOpenCurrentCreationFromPanel() {
    if (!CREATIONS_TOOL_ENABLED) return false;
    const sidePanel = document.getElementById('blip-side-panel');
    return !!sidePanel &&
        sidePanel.style.display !== 'none' &&
        ['design', 'drawing', 'image'].includes(state.currentSidePanelAction) &&
        typeof state.currentSidePanelVisualUrl === 'string' &&
        !!state.currentSidePanelVisualUrl;
}

function openCurrentCreationView() {
    if (!CREATIONS_TOOL_ENABLED) return false;
    if (canOpenCurrentCreationFromPanel()) {
        openMediaLightbox(state.currentSidePanelVisualUrl, null, 'image', MEDIA_BUCKET_CREATED);
        return true;
    }
    if (typeof state.lastContext?.lastDesignDataUrl === 'string' && state.lastContext.lastDesignDataUrl.startsWith('data:image/')) {
        openMediaLightbox(state.lastContext.lastDesignDataUrl, null, 'image', MEDIA_BUCKET_CREATED);
        return true;
    }
    return openLatestMediaByBucket(MEDIA_BUCKET_CREATED);
}

function closeMediaLightbox() {
    if (!mediaLightbox || !mediaLightboxImage) return;
    mediaLightbox.classList.remove('active');
    mediaLightbox.setAttribute('aria-hidden', 'true');
    mediaLightbox.style.display = 'none';
    mediaLightbox.style.visibility = 'hidden';
    mediaLightbox.style.opacity = '0';
    mediaLightbox.style.pointerEvents = 'none';
    mediaLightboxImage.removeAttribute('src');
    mediaLightboxImage.style.display = 'block';
    mediaLightboxImage.style.setProperty('--media-rotation', '0deg');
    mediaLightboxImage.style.setProperty('--media-brightness', '1');
    if (mediaLightboxVideo) {
        mediaLightboxVideo.pause?.();
        mediaLightboxVideo.removeAttribute('src');
        mediaLightboxVideo.load?.();
        mediaLightboxVideo.style.display = 'none';
    }
    state.activeMediaIndex = -1;
    state.activeMediaBucket = MEDIA_BUCKET_SHOTS;
    syncMediaLightboxActionButtons();
}

function closeMediaLightboxAndVerify(cmd = '') {
    closeMediaLightbox();
    const hidden = !isContainerActuallyVisible(mediaLightbox) &&
        !mediaLightbox?.classList.contains('active') &&
        mediaLightbox?.getAttribute('aria-hidden') === 'true';
    if (!hidden) {
        logUiOpenVisibilityFailure(cmd, 'media-lightbox-close', {
            attemptedClose: true,
            mediaLightboxDisplay: mediaLightbox?.style?.display || '',
            mediaLightboxVisibility: mediaLightbox?.style?.visibility || '',
            mediaLightboxOpacity: mediaLightbox?.style?.opacity || ''
        });
    }
    return hidden;
}

function syncMediaLightboxActionButtons() {
    const imageVisible = isMediaLightboxActuallyVisible('image');
    [shareMediaLightboxBtn, downloadMediaLightboxBtn, wallpaperMediaLightboxBtn].forEach((btn) => {
        if (!btn) return;
        btn.disabled = !imageVisible;
        btn.style.opacity = imageVisible ? '1' : '0.55';
        btn.style.cursor = imageVisible ? '' : 'not-allowed';
    });
}

function getEditableMediaImageIndex() {
    if (Number.isFinite(state.activeMediaIndex) && state.activeMediaIndex >= 0) {
        const activeItem = state.mediaItems?.[state.activeMediaIndex];
        if (activeItem && activeItem.kind !== 'video') return state.activeMediaIndex;
    }
    const latest = getLatestImageItemByBucket(MEDIA_BUCKET_SHOTS);
    if (!latest?.id) return -1;
    return findMediaGlobalIndexById(latest.id);
}

async function rotateActiveMediaImage(delta = 90) {
    const targetIndex = getEditableMediaImageIndex();
    if (!Number.isFinite(targetIndex) || targetIndex < 0) return false;
    const item = state.mediaItems?.[targetIndex];
    if (!item || item.kind === 'video') return false;
    state.activeMediaIndex = targetIndex;
    state.activeMediaBucket = normalizeMediaBucket(item.bucket);
    const rotationDelta = normalizeMediaRotation(Number(delta || 0));
    rememberMediaEditState(item);
    const normalizedUrl = String(item.url || '');
    if (/^data:image\//i.test(normalizedUrl) && rotationDelta) {
        try {
            const rotatedUrl = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const effectiveRotation = normalizeMediaRotation((item.rotation || 0) + rotationDelta);
                    const quarterTurns = Math.round(effectiveRotation / 90) % 4;
                    const swapSides = quarterTurns % 2 !== 0;
                    const canvas = document.createElement('canvas');
                    canvas.width = swapSides ? img.height : img.width;
                    canvas.height = swapSides ? img.width : img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas unavailable'));
                        return;
                    }
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.rotate((effectiveRotation * Math.PI) / 180);
                    ctx.drawImage(img, -img.width / 2, -img.height / 2);
                    resolve(canvas.toDataURL('image/jpeg', 0.92));
                };
                img.onerror = () => reject(new Error('Image load failed'));
                img.src = normalizedUrl;
            });
            item.url = rotatedUrl;
            item.rotation = 0;
        } catch (_) {
            item.rotation = normalizeMediaRotation((item.rotation || 0) + rotationDelta);
        }
    } else {
        item.rotation = normalizeMediaRotation((item.rotation || 0) + rotationDelta);
    }
    persistMediaGallery();
    renderMediaGallery();
    openMediaLightbox(item.url, targetIndex, item.kind || 'image', normalizeMediaBucket(item.bucket));
    return true;
}

async function adjustActiveMediaBrightness(delta = 0.35) {
    const targetIndex = getEditableMediaImageIndex();
    if (!Number.isFinite(targetIndex) || targetIndex < 0) return false;
    const item = state.mediaItems?.[targetIndex];
    if (!item || item.kind === 'video') return false;
    state.activeMediaIndex = targetIndex;
    state.activeMediaBucket = normalizeMediaBucket(item.bucket);
    const brightnessDelta = Number(delta || 0);
    const baseBrightness = state.mediaBrightnessOverrides?.[String(item.id)] ?? 1;
    const nextBrightness = normalizeMediaBrightness(Number(baseBrightness) + brightnessDelta);
    rememberMediaEditState(item);
    const normalizedUrl = String(item.url || '');
    // For data URLs, we can bake brightness into pixels so it persists without "remembering" a filter.
    if (/^data:image\//i.test(normalizedUrl) && nextBrightness !== 1) {
        try {
            const adjustedUrl = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas unavailable'));
                        return;
                    }
                    ctx.filter = `brightness(${nextBrightness})`;
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg', 0.92));
                };
                img.onerror = () => reject(new Error('Image load failed'));
                img.src = normalizedUrl;
            });
            item.url = adjustedUrl;
            // Baked into pixels; clear any per-session override.
            if (state.mediaBrightnessOverrides) delete state.mediaBrightnessOverrides[String(item.id)];
        } catch (_) {
            if (!state.mediaBrightnessOverrides) state.mediaBrightnessOverrides = {};
            state.mediaBrightnessOverrides[String(item.id)] = nextBrightness;
        }
    } else {
        if (!state.mediaBrightnessOverrides) state.mediaBrightnessOverrides = {};
        state.mediaBrightnessOverrides[String(item.id)] = nextBrightness;
    }
    persistMediaGallery();
    renderMediaGallery();
    openMediaLightbox(item.url, targetIndex, item.kind || 'image', normalizeMediaBucket(item.bucket));
    return nextBrightness;
}

function undoActiveMediaEdits() {
    const targetIndex = getEditableMediaImageIndex();
    if (!Number.isFinite(targetIndex) || targetIndex < 0) return false;
    const item = state.mediaItems?.[targetIndex];
    const lastEdit = normalizeMediaEditSnapshot(item?.lastEdit);
    if (!item || item.kind === 'video' || !lastEdit) return false;
    state.activeMediaIndex = targetIndex;
    state.activeMediaBucket = normalizeMediaBucket(item.bucket);
    item.url = lastEdit.url;
    item.rotation = lastEdit.rotation;
    if (state.mediaBrightnessOverrides) delete state.mediaBrightnessOverrides[String(item.id)];
    item.lastEdit = null;
    persistMediaGallery();
    renderMediaGallery();
    openMediaLightbox(item.url, targetIndex, item.kind || 'image', normalizeMediaBucket(item.bucket));
    return true;
}

function resetActiveMediaEdits() {
    const targetIndex = getEditableMediaImageIndex();
    if (!Number.isFinite(targetIndex) || targetIndex < 0) return false;
    const item = state.mediaItems?.[targetIndex];
    if (!item || item.kind === 'video') return false;
    const originalUrl = typeof item.originalUrl === 'string' && item.originalUrl ? item.originalUrl : '';
    if (!originalUrl) return false;
    state.activeMediaIndex = targetIndex;
    state.activeMediaBucket = normalizeMediaBucket(item.bucket);
    item.lastEdit = captureMediaEditSnapshot(item);
    item.url = originalUrl;
    item.rotation = 0;
    if (state.mediaBrightnessOverrides) delete state.mediaBrightnessOverrides[String(item.id)];
    persistMediaGallery();
    renderMediaGallery();
    openMediaLightbox(item.url, targetIndex, item.kind || 'image', normalizeMediaBucket(item.bucket));
    return true;
}

function closeCurrentPanel() {
    if (mediaLightbox?.classList.contains('active')) {
        return closeMediaLightboxAndVerify('close-current-panel') ? 'picture' : null;
    }
    if (state.isMediaStripOpen) {
        toggleMediaGallery(false);
        return 'gallery';
    }
    if (state.currentMode === 'chart') {
        setMode('core');
        return 'graph';
    }
    if (state.currentMode === 'map') {
        setMode('core');
        return 'map';
    }
    if (state.currentMode === 'settings' || isSettingsPanelOpen()) {
        closeSettingsPanel();
        return 'panel';
    }
    if (state.currentMode === 'hub' || state.currentMode === 'vision') {
        setMode('core');
        return 'panel';
    }
    if (closeCalendarPanel()) {
        return 'calendar';
    }
    if (isSidePanelVisible()) {
        return closeSidePanel() || 'panel';
    }
    return null;
}

function closeEverythingPanels() {
    stopAutoScroll();
    closeMediaLightbox();
    toggleMediaGallery(false);
    clearPendingImage();
    closeCalendarPanel();
    state.pendingNotesDraft = null;
    state.pendingProfileDraft = null;
    if (state.currentSidePanelAction === 'youtube' || blipYtPlayer) {
        closeYouTubePanel();
    } else if (isSidePanelVisible()) {
        closeSidePanel();
    }
    if (state.currentMode === 'settings' || isSettingsPanelOpen()) closeSettingsPanel();
    if (state.currentMode !== 'core') setMode('core');
    state.currentMode = 'core';
    state.isMediaStripOpen = false;
    state.videoBigMode = false;
    state.pendingYouTubeAction = null;
    state.youtubeLibraryBrowseIndex = 0;
    state.pendingCalendarDraft = null;
    state.activeCalendarViewRequest = null;
    if (hubContainer) hubContainer.style.display = 'none';
    if (cartContainer) cartContainer.style.display = 'none';
    if (mapContainer) {
        mapContainer.classList.remove('active');
        mapContainer.style.display = 'none';
    }
    if (chartContainer) {
        chartContainer.classList.remove('active', 'reveal');
        chartContainer.style.display = 'none';
    }
    if (underTheHood) {
        underTheHood.classList.remove('active');
        underTheHood.style.display = 'none';
        underTheHood.style.pointerEvents = 'none';
    }
    if (mediaContainer) mediaContainer.style.display = 'none';
    if (mediaStrip) {
        mediaStrip.classList.add('hidden');
        mediaStrip.style.display = '';
        mediaStrip.setAttribute('aria-hidden', 'true');
    }
    const sidePanel = document.getElementById('blip-side-panel');
    if (sidePanel) {
        sidePanel.innerHTML = '';
        sidePanel.style.display = 'none';
        applyDefaultSidePanelLayout(sidePanel);
        clearSidePanelContext();
    }
    document.body.classList.remove('projecting-visual');
    if (sidePanelChart) {
        sidePanelChart.destroy();
        sidePanelChart = null;
    }
    syncScenerySuppression();
    return true;
}

function getAlarmAudioContext() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!state.alarmAudioCtx) state.alarmAudioCtx = new Ctor();
    return state.alarmAudioCtx;
}

function playAlarmChimeOnce() {
    const ctx = getAlarmAudioContext();
    if (!ctx) return false;
    try {
        if (ctx.state === 'suspended') ctx.resume().catch(() => { });
        const now = ctx.currentTime + 0.01;
        const master = ctx.createGain();
        const brightener = ctx.createBiquadFilter();
        master.gain.value = 1.45;
        brightener.type = 'highshelf';
        brightener.frequency.value = 1500;
        brightener.gain.value = 4.5;
        master.connect(brightener);
        brightener.connect(ctx.destination);
        const ring = (freq, offset, duration, peak = 0.12) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = freq >= 1200 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, now + offset);
            gain.gain.setValueAtTime(0.0001, now + offset);
            gain.gain.exponentialRampToValueAtTime(peak, now + offset + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
            osc.connect(gain);
            gain.connect(master);
            osc.start(now + offset);
            osc.stop(now + offset + duration + 0.03);
        };
        ring(880, 0, 0.22, 0.16);
        ring(1320, 0.18, 0.2, 0.14);
        ring(1760, 0.34, 0.14, 0.08);
        return true;
    } catch (e) {
        console.warn('Alarm chime failed:', e.message);
        return false;
    }
}

/** Soft “swish” confirm when an email is sent (Web Audio; no external file). */
function playEmailSentSwish() {
    const ctx = getAlarmAudioContext();
    if (!ctx) return false;
    try {
        if (ctx.state === 'suspended') ctx.resume().catch(() => { });
        const now = ctx.currentTime + 0.02;
        const vol = Math.min(0.38, 0.2 + (Number(state.speechVolume) || 0.5) * 0.2);

        const master = ctx.createGain();
        master.gain.setValueAtTime(0.0001, now);
        master.gain.exponentialRampToValueAtTime(vol, now + 0.04);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        master.connect(ctx.destination);

        const sweep = (startHz, endHz, peak, t0, dur) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(startHz, t0);
            osc.frequency.exponentialRampToValueAtTime(Math.max(120, endHz), t0 + dur);
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(peak, t0 + 0.04);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.connect(g);
            g.connect(master);
            osc.start(t0);
            osc.stop(t0 + dur + 0.02);
        };

        sweep(2400, 540, 0.72, now, 0.16);
        sweep(1800, 420, 0.5, now + 0.07, 0.18);
        sweep(1350, 640, 0.22, now + 0.17, 0.18);

        const noiseBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.12), ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.45;
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.exponentialRampToValueAtTime(2400, now + 0.08);
        filter.Q.value = 0.85;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.0001, now);
        ng.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
        ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
        noise.connect(filter);
        filter.connect(ng);
        ng.connect(master);
        noise.start(now + 0.02);
        noise.stop(now + 0.17);

        return true;
    } catch (e) {
        console.warn('Email swish sound failed:', e?.message || e);
        return false;
    }
}

function startAlarmSoundLoop() {
    if (state.alarmLoopTimer) return;
    playAlarmChimeOnce();
    state.alarmLoopTimer = setInterval(() => {
        if (!state.activeAlert) {
            stopAlarmSoundLoop();
            return;
        }
        playAlarmChimeOnce();
    }, 1800);
}

function stopAlarmSoundLoop() {
    if (state.alarmLoopTimer) {
        clearInterval(state.alarmLoopTimer);
        state.alarmLoopTimer = null;
    }
}

function formatTimerRemaining(ms) {
    const total = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatTimerDueTime(timestamp) {
    const dueAt = Number(timestamp || 0);
    if (!Number.isFinite(dueAt) || dueAt <= 0) return '';
    try {
        return new Date(dueAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (_) {
        return '';
    }
}

function getUpcomingTimersSorted() {
    const now = Date.now();
    return (state.timers || [])
        .filter((t) => t && Number.isFinite(t.time) && t.time > now)
        .sort((a, b) => a.time - b.time);
}

function renderTimerPanelBody(sidePanel, focusId = null) {
    if (!sidePanel) return;
    const body = sidePanel.querySelector('#blip-timer-panel-body');
    if (!body) return;

    const timers = getUpcomingTimersSorted();
    const numericFocusId = Number.isFinite(Number(focusId)) ? Number(focusId) : null;
    const focusedTimer = timers.find((timer) => timer.id === numericFocusId) || timers[0] || null;
    const helpers = {
        getUpcomingTimersSorted: () => getUpcomingTimersSorted(),
        getReminderDisplayCard: (entry) => getReminderDisplayCard(entry),
        formatReminderTimeLabel,
        formatReminderDayLabel,
        escapeHtml
    };
    body.innerHTML = buildTimerPanelBodyHtml(state, helpers);
    // Re-apply focusId for active row styling (buildTimerPanelBodyHtml uses first timer as focused)
    body.querySelectorAll('[data-timer-focus]').forEach((btn) => {
        const timerId = Number(btn.getAttribute('data-timer-focus'));
        if (timerId === (focusedTimer?.id ?? numericFocusId)) btn.classList.add('active');
    });

    body.querySelectorAll('[data-timer-focus]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const nextFocus = Number(btn.getAttribute('data-timer-focus'));
            sidePanel.dataset.timerFocusId = Number.isFinite(nextFocus) ? String(nextFocus) : '';
            renderTimerPanelBody(sidePanel, nextFocus);
        });
    });

    body.querySelector('#blip-timer-dismiss-alert')?.addEventListener('click', async () => {
        const closed = dismissActiveAlert({ resumeListening: false, clearVisual: true });
        if (transcriptText && closed) transcriptText.innerText = 'Alarm silenced.';
        renderTimerPanelBody(sidePanel, numericFocusId);
    });

    body.querySelector('#blip-timer-hide-panel')?.addEventListener('click', () => {
        sidePanel.style.display = 'none';
        clearSidePanelContext();
    });
}

function syncTimerSidePanel(options = {}) {
    const sidePanel = document.getElementById('blip-side-panel');
    if (!sidePanel || sidePanel.style.display === 'none' || state.currentSidePanelAction !== 'timer') {
        stopTimerPanelTicker();
        return;
    }
    const requestedFocus = Number.isFinite(Number(options.focusId)) ? Number(options.focusId) : null;
    const currentFocus = Number(sidePanel.dataset.timerFocusId || '');
    const focusId = requestedFocus ?? (Number.isFinite(currentFocus) ? currentFocus : null);
    if (Number.isFinite(focusId)) {
        sidePanel.dataset.timerFocusId = String(focusId);
    }
    renderTimerPanelBody(sidePanel, focusId);
}

function stopTimerPanelTicker() {
    if (state.timerPanelTicker) {
        clearInterval(state.timerPanelTicker);
        state.timerPanelTicker = null;
    }
}

function startTimerPanelTicker(options = {}) {
    stopTimerPanelTicker();
    syncTimerSidePanel(options);
    const sidePanel = document.getElementById('blip-side-panel');
    if (!sidePanel || sidePanel.style.display === 'none' || state.currentSidePanelAction !== 'timer') return;
    state.timerPanelTicker = setInterval(() => syncTimerSidePanel(), 300);
}

function getNextTimerDue() {
    if (!Array.isArray(state.timers) || state.timers.length === 0) return null;
    const now = Date.now();
    let next = null;
    for (const t of state.timers) {
        if (!t || !Number.isFinite(t.time) || t.time <= now) continue;
        if (!next || t.time < next.time) next = t;
    }
    return next;
}

function updateTimerCorner() {
    renderCountdownDisplay();
    if (!timerCorner || !timerCornerTime) return;
    const active = state.activeAlert;
    const next = getNextTimerDue();

    if (active) {
        timerCorner.classList.remove('hidden');
        timerCorner.classList.add('alarm');
        timerCornerTime.textContent = 'ALARM';
        return;
    }
    if (next) {
        timerCorner.classList.remove('hidden');
        timerCorner.classList.remove('alarm');
        timerCornerTime.textContent = formatReminderTimeLabel(next.time);
        return;
    }
    timerCorner.classList.add('hidden');
    timerCorner.classList.remove('alarm');
    timerCornerTime.textContent = '00:00';
}

function startTimerCornerTicker() {
    if (state.timerCornerTicker) {
        clearInterval(state.timerCornerTicker);
        state.timerCornerTicker = null;
    }
    updateTimerCorner();
    state.timerCornerTicker = setInterval(updateTimerCorner, 300);
}

function persistTimers() {
    try {
        const now = Date.now();
        const payload = (state.timers || [])
            .filter((t) => t && Number.isFinite(t.time) && t.time > now)
            .map((t) => ({
                text: String(t.text || 'Timer'),
                time: Number(t.time)
            }));
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) { }
    const nextReminder = getNextTimerDue();
    state.lastScheduledReminder = nextReminder
        ? { id: nextReminder.id, text: nextReminder.text, time: nextReminder.time }
        : null;
    updateTimerCorner();
    renderCountdownDisplay();
    syncTimerSidePanel();
}

function cancelScheduledTimerById(timerId) {
    if (!Array.isArray(state.timers) || !state.timers.length) return null;
    const idx = state.timers.findIndex((timer) => timer?.id === timerId);
    if (idx < 0) return null;
    const [removed] = state.timers.splice(idx, 1);
    try { clearTimeout(timerId); } catch (_) { }
    persistTimers();
    renderCountdownDisplay();
    return removed || null;
}

function cancelNextScheduledTimer() {
    const next = getNextTimerDue();
    if (!next) return null;
    return cancelScheduledTimerById(next.id);
}

function cancelMatchingScheduledTimer(query = '') {
    const needle = normalizeVoiceTokens(String(query || ''));
    if (!needle) return cancelNextScheduledTimer();
    const match = getUpcomingTimersSorted().find((timer) =>
        normalizeVoiceTokens(String(timer?.text || '')).includes(needle)
    );
    if (!match) return null;
    return cancelScheduledTimerById(match.id);
}

function clearAllScheduledTimers() {
    const timers = Array.isArray(state.timers) ? [...state.timers] : [];
    if (!timers.length) return 0;
    timers.forEach((timer) => {
        try { clearTimeout(timer?.id); } catch (_) { }
    });
    state.timers = [];
    persistTimers();
    renderCountdownDisplay();
    return timers.length;
}

function restorePersistedTimers() {
    try {
        const raw = localStorage.getItem(TIMER_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) return;
        const now = Date.now();
        parsed.forEach((item) => {
            const text = String(item?.text || 'Timer');
            const dueAt = Number(item?.time || 0);
            if (!Number.isFinite(dueAt)) return;
            const ms = Math.max(500, dueAt - now);
            setBlipTimer(text, ms, dueAt);
        });
    } catch (_) { }
}

function dismissActiveAlert(options = {}) {
    const { resumeListening = true, clearVisual = false } = options;
    const activeAlert = state.activeAlert;
    if (activeAlert?.autoClearTimer) clearTimeout(activeAlert.autoClearTimer);
    state.activeAlert = null;
    stopAlarmSoundLoop();
    if (clearVisual) clearAlertDisplay();
    const nextReminder = getNextTimerDue();
    if (!nextReminder) state.lastScheduledReminder = null;
    updateTimerCorner();
    renderCountdownDisplay();
    syncTimerSidePanel();
    if (!nextReminder) {
        const sidePanel = document.getElementById('blip-side-panel');
        if (sidePanel && sidePanel.style.display !== 'none' && state.currentSidePanelAction === 'timer') {
            sidePanel.style.display = 'none';
            clearSidePanelContext();
        }
    }
    if (!activeAlert) return false;

    speech.stopSpeaking?.();
    speech.isSpeaking = false;
    state.lastSpeechStartedAt = 0;
    animateMouth(0);

    if (resumeListening && state.isActive && !state.isThinking && !state.softSleepMode) {
        talkBtn.classList.remove('thinking', 'listening');
        talkBtn.classList.add('active');
        talkBtn.innerText = 'Ask Blip';
        setPersona('listening');
        setRestingEyes(false);
        startListeningLoop();
    }
    return true;
}

function isVideoPanelVisible() {
    return isYouTubePanelActuallyVisible();
}

function openLastVideoPanel() {
    const last = state.lastContext || {};
    const videoId = last.lastYoutubeVideoId || extractYouTubeVideoId(last.lastYoutubeUrl || last.lastYoutubeEmbedUrl || '');
    const watchUrl = last.lastYoutubeUrl || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');
    const embedUrl = last.lastYoutubeEmbedUrl || (videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null);
    if (!watchUrl && !videoId) return false;
    renderActionInSidePanel({
        action: 'youtube',
        tool_params: {
            query: last.lastYoutubeQuery || 'video',
            url: watchUrl,
            embedUrl,
            videoId: videoId || null,
            searchResults: last.lastYoutubeSearchResults || null
        },
        text: 'Reopening last video.'
    });
    return isYouTubePanelActuallyVisible();
}

function playSavedYouTubePlaylist(name = '') {
    const playlistName = normalizeVideoPlaylistName(name);
    const items = Array.isArray(state.videoPlaylists?.[playlistName]) ? state.videoPlaylists[playlistName] : [];
    const first = items[0];
    if (!first?.videoId && !first?.url) return { ok: false, message: `No saved videos in ${playlistName}.` };
    const videoId = first.videoId || extractYouTubeVideoId(first.url || '');
    if (!videoId) return { ok: false, message: `No saved videos in ${playlistName}.` };
    state.lastContext.lastYoutubeQuery = first.query || first.title || playlistName;
    state.lastContext.lastYoutubeVideoId = videoId;
    state.lastContext.lastYoutubeUrl = first.url || `https://www.youtube.com/watch?v=${videoId}`;
    state.lastContext.lastYoutubeEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    state.lastContext.lastYoutubeSearchResults = items.map((it) => ({ videoId: it.videoId, title: it.title })) || null;
    state.lastContext.lastYoutubeSearchIndex = 0;
    renderActionInSidePanel({
        action: 'youtube',
        tool_params: {
            query: playlistName,
            url: state.lastContext.lastYoutubeUrl,
            embedUrl: state.lastContext.lastYoutubeEmbedUrl,
            videoId,
            searchResults: state.lastContext.lastYoutubeSearchResults
        },
        text: `Playing: ${playlistName}`
    });
    return { ok: true, message: `Playing ${playlistName}.` };
}

function getCurrentYouTubeTitle() {
    const results = Array.isArray(state.lastContext?.lastYoutubeSearchResults)
        ? state.lastContext.lastYoutubeSearchResults
        : [];
    const index = Math.max(0, Number(state.lastContext?.lastYoutubeSearchIndex) || 0);
    const candidate = results[index] || results[0] || null;
    return String(candidate?.title || state.lastContext?.lastYoutubeQuery || 'YouTube video').trim() || 'YouTube video';
}

function getCurrentYouTubeSavePayload() {
    const last = state.lastContext || {};
    const videoId = last.lastYoutubeVideoId || extractYouTubeVideoId(last.lastYoutubeUrl || last.lastYoutubeEmbedUrl || '');
    const url = last.lastYoutubeUrl || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');
    const embedUrl = last.lastYoutubeEmbedUrl || (videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : '');
    if (!url && !videoId) return null;
    return normalizeSavedVideoEntry({
        title: getCurrentYouTubeTitle(),
        query: last.lastYoutubeQuery || getCurrentYouTubeTitle(),
        url,
        embedUrl,
        videoId
    });
}

function saveCurrentYouTubeToPlaylist(playlistName = DEFAULT_VIDEO_PLAYLIST) {
    const payload = getCurrentYouTubeSavePayload();
    if (!payload) return { ok: false, playlistName: normalizeVideoPlaylistName(playlistName), duplicate: false };

    const normalizedName = normalizeVideoPlaylistName(playlistName);
    const existingList = Array.isArray(state.videoPlaylists?.[normalizedName]) ? state.videoPlaylists[normalizedName] : [];
    const duplicate = existingList.find((item) => {
        const sameId = payload.videoId && item?.videoId && payload.videoId === item.videoId;
        const sameUrl = payload.url && item?.url && payload.url === item.url;
        return sameId || sameUrl;
    });
    if (duplicate) {
        return { ok: true, playlistName: normalizedName, duplicate: true, item: duplicate };
    }

    const nextList = [payload, ...existingList].slice(0, 80);
    state.videoPlaylists = {
        ...(state.videoPlaylists || {}),
        [normalizedName]: nextList
    };
    persistVideoPlaylists();
    addToHub('link', `🎬 ${normalizedName}: ${payload.title}`, {
        url: payload.url,
        playlistName: normalizedName,
        videoId: payload.videoId || '',
        kind: 'youtube-playlist'
    });
    return { ok: true, playlistName: normalizedName, duplicate: false, item: payload };
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

function persistHub() {
    try {
        localStorage.setItem('blip_hub', JSON.stringify(state.hubItems || []));
    } catch (e) {
        console.warn('Hub save failed:', e.message);
    }
}

function removeHubItem(itemId) {
    const before = Array.isArray(state.hubItems) ? state.hubItems.length : 0;
    state.hubItems = (state.hubItems || []).filter((item) => String(item?.id) !== String(itemId));
    renderHub();
    persistHub();
    return before !== state.hubItems.length;
}

function removeLatestHubItem() {
    const latest = Array.isArray(state.hubItems) && state.hubItems.length ? state.hubItems[0] : null;
    if (!latest) return null;
    removeHubItem(latest.id);
    return latest;
}

function removeMatchingHubItem(query = '') {
    const needle = sanitizeVoiceQuery(query || '').toLowerCase();
    if (!needle) return removeLatestHubItem();
    const match = (state.hubItems || []).find((item) => {
        const content = String(item?.content || '').toLowerCase();
        const url = String(item?.data?.url || '').toLowerCase();
        return content.includes(needle) || url.includes(needle);
    });
    if (!match) return null;
    removeHubItem(match.id);
    return match;
}

function clearHub() {
    const removedCount = Array.isArray(state.hubItems) ? state.hubItems.length : 0;
    state.hubItems = [];
    renderHub();
    persistHub();
    return removedCount;
}

function persistCart() {
    try {
        localStorage.setItem('blip_cart', JSON.stringify(state.cartItems || []));
    } catch (e) {
        console.warn('Cart save failed:', e.message);
    }
}

function addToCart(item) {
    if (!item || typeof item !== 'object' || !item.url) return false;
    const existing = Array.isArray(state.cartItems) ? state.cartItems.find((entry) => entry?.url === item.url) : null;
    if (existing) {
        const nextImageUrl = String(item.imageUrl || item.previewDataUrl || '');
        if (nextImageUrl && !existing.imageUrl) {
            existing.imageUrl = nextImageUrl;
            persistCart();
            renderCart();
        }
        return true;
    }
    const cartItem = {
        id: Date.now(),
        name: String(item.name || 'Product'),
        url: String(item.url),
        retailer: String(item.retailer || ''),
        imageUrl: String(item.imageUrl || item.previewDataUrl || ''),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    state.cartItems.unshift(cartItem);
    if (state.cartItems.length > 50) state.cartItems.pop();
    state.cartBrowseIndex = 0;
    persistCart();
    renderCart();
    return true;
}

function removeFromCart(itemId) {
    state.cartItems = (state.cartItems || []).filter((item) => String(item?.id) !== String(itemId));
    state.cartBrowseIndex = Math.max(0, Math.min(state.cartBrowseIndex, Math.max(0, state.cartItems.length - 1)));
    persistCart();
    renderCart();
}

function removeLatestCartItem() {
    const latest = Array.isArray(state.cartItems) && state.cartItems.length ? state.cartItems[0] : null;
    if (!latest) return null;
    removeFromCart(latest.id);
    return latest;
}

function removeMatchingCartItem(query = '') {
    const needle = normalizeVoiceTokens(String(query || ''));
    if (!needle) return removeLatestCartItem();
    const match = (state.cartItems || []).find((item) => {
        const haystack = normalizeVoiceTokens(`${item?.name || ''} ${item?.retailer || ''}`);
        return haystack.includes(needle);
    });
    if (!match) return null;
    removeFromCart(match.id);
    return match;
}

function clearCart() {
    const total = Array.isArray(state.cartItems) ? state.cartItems.length : 0;
    if (!total) return 0;
    state.cartItems = [];
    state.cartBrowseIndex = 0;
    persistCart();
    renderCart();
    return total;
}

function getCartItemAt(index = 0) {
    const items = Array.isArray(state.cartItems) ? state.cartItems : [];
    if (!items.length) return null;
    const safeIndex = Math.max(0, Math.min(Number(index) || 0, items.length - 1));
    return items[safeIndex] || null;
}

function focusCartItem(index = state.cartBrowseIndex) {
    if (!cartItemsEl) return;
    cartItemsEl.querySelectorAll('.cart-item').forEach((node) => node.classList.remove('active'));
    const item = getCartItemAt(index);
    if (!item) return;
    const card = cartItemsEl.querySelector(`.cart-item[data-cart-id="${String(item.id)}"]`);
    if (!card) return;
    card.classList.add('active');
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function describeCartItem(item, index, total) {
    if (!item) return 'Cart is empty.';
    const position = `Item ${index + 1} of ${total}`;
    const retailer = item.retailer ? ` from ${item.retailer}` : '';
    const imageNote = item.imageUrl ? ' Image ready.' : ' No image saved yet.';
    return `${position}. ${item.name}${retailer}.${imageNote}`;
}

function showCartItem(index = 0, options = {}) {
    const { previewImage = true, speak = false } = options;
    const items = Array.isArray(state.cartItems) ? state.cartItems : [];
    if (!items.length) return { ok: false, text: 'Cart is empty.' };
    const safeIndex = Math.max(0, Math.min(Number(index) || 0, items.length - 1));
    state.cartBrowseIndex = safeIndex;
    setMode('cart');
    renderCart();
    const item = items[safeIndex];
    if (previewImage && item?.imageUrl) {
        openMediaLightbox(item.imageUrl, null, 'image', MEDIA_BUCKET_CREATED);
    }
    focusCartItem(safeIndex);
    return {
        ok: true,
        item,
        text: speak ? describeCartItem(item, safeIndex, items.length) : ''
    };
}

function stepCartItem(delta = 1, options = {}) {
    const items = Array.isArray(state.cartItems) ? state.cartItems : [];
    if (!items.length) return { ok: false, text: 'Cart is empty.' };
    const nextIndex = (state.cartBrowseIndex + delta + items.length) % items.length;
    return showCartItem(nextIndex, options);
}

function openCurrentCartProduct() {
    const item = getCartItemAt(state.cartBrowseIndex);
    if (!item?.url) return { ok: false, text: 'No cart item selected yet.' };
    try {
        window.open(item.url, '_blank', 'noopener');
    } catch (_) { }
    return { ok: true, text: `Opening ${item.name}.` };
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
    if (saveToHubBtn) {
        const originalText = saveToHubBtn.innerText;
        saveToHubBtn.innerText = '✅ Saved!';
        setTimeout(() => {
            saveToHubBtn.innerText = originalText;
        }, 2000);
    }
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

function renderCart() {
    if (!cartItemsEl) return;
    if (!Array.isArray(state.cartItems) || state.cartItems.length === 0) {
        cartItemsEl.innerHTML = '<div class="cart-empty">Cart is empty. Save products here.</div>';
        return;
    }

    cartItemsEl.innerHTML = state.cartItems.map((item) => `
        <div class="cart-item ${String(item.id) === String(getCartItemAt(state.cartBrowseIndex)?.id || '') ? 'active' : ''}" data-cart-id="${item.id}">
            <div class="cart-item-head">
                <strong>${escapeHtml(item.name || 'Product')}</strong>
                <button type="button" class="cart-remove-btn" data-cart-id="${item.id}" aria-label="Remove from cart">✕</button>
            </div>
            <div class="cart-item-meta">${escapeHtml(item.retailer || 'store')} · ${escapeHtml(item.timestamp || '')}</div>
            <div class="cart-item-body">
                ${item.imageUrl ? `
                    <button type="button" class="cart-thumb-btn" data-cart-image="${escapeHtml(item.imageUrl)}" aria-label="Preview saved product image">
                        <img src="${item.imageUrl}" alt="${escapeHtml(item.name || 'Saved product')}">
                    </button>
                ` : ''}
                <div class="cart-item-actions">
                    <a href="${item.url}" target="_blank" rel="noopener" class="action-link orange">Open product</a>
                    ${item.imageUrl ? `<button type="button" class="action-link outline cart-preview-btn" data-cart-image="${escapeHtml(item.imageUrl)}">Preview image</button>` : ''}
                </div>
            </div>
        </div>
    `).join('');

    cartItemsEl.querySelectorAll('.cart-remove-btn').forEach((btn) => {
        btn.addEventListener('click', () => removeFromCart(btn.dataset.cartId));
    });
    const previewImage = (src) => {
        if (!src) return;
        openMediaLightbox(src, null, 'image', MEDIA_BUCKET_CREATED);
    };
    cartItemsEl.querySelectorAll('.cart-item').forEach((card, index) => {
        card.addEventListener('click', (event) => {
            if (event.target.closest('a, button')) return;
            state.cartBrowseIndex = index;
            focusCartItem(index);
        });
    });
    cartItemsEl.querySelectorAll('.cart-thumb-btn, .cart-preview-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const cartId = String(btn.closest('.cart-item')?.dataset.cartId || '');
            const itemIndex = (state.cartItems || []).findIndex((item) => String(item?.id) === cartId);
            if (itemIndex >= 0) state.cartBrowseIndex = itemIndex;
            focusCartItem(state.cartBrowseIndex);
            previewImage(btn.dataset.cartImage || '');
        });
    });
    cartItemsEl.querySelectorAll('.cart-item a[href]').forEach((link) => {
        link.addEventListener('click', () => {
            const itemIndex = (state.cartItems || []).findIndex((item) => String(item?.id) === String(link.closest('.cart-item')?.dataset.cartId || ''));
            if (itemIndex >= 0) state.cartBrowseIndex = itemIndex;
            focusCartItem(state.cartBrowseIndex);
        });
    });
}

function saveProductLinksToCart(links = [], options = {}) {
    const items = Array.isArray(links) ? links : [];
    const previewDataUrl = String(options?.previewDataUrl || '');
    let saved = 0;
    items.forEach((item) => {
        const before = Array.isArray(state.cartItems) ? state.cartItems.length : 0;
        addToCart({
            ...item,
            imageUrl: String(item?.imageUrl || previewDataUrl || '')
        });
        const after = Array.isArray(state.cartItems) ? state.cartItems.length : 0;
        if (after > before) saved += 1;
    });
    return saved;
}

const BLIP_JOKES = [
    'Why did the scarecrow win an award? He was outstanding in his field!',
    'What do you call a bear with no teeth? A gummy bear!',
    'Why don\'t scientists trust atoms? Because they make up everything!',
    'What do you call a fake noodle? An impasta!',
    'Why did the bicycle fall over? Because it was two-tired!',
    'What do you call a fish without eyes? A fsh!',
    'Why can\'t you give a Blip a cookie? It might want a glass of milk!',
    'Why did the coffee file a police report? It got mugged!',
    'What do you call a can opener that doesn\'t work? A can\'t opener!',
    'Why did the math book look sad? Because it had too many problems!',
    'What do you call a snowman in the summer? A puddle!',
    'Why don\'t eggs tell jokes? They\'d crack each other up!',
];

function getNextJoke() {
    if (!BLIP_JOKES.length) return 'I\'m all out of jokes. Ask me again later!';
    state.lastJokeIndex = (state.lastJokeIndex + 1) % BLIP_JOKES.length;
    return BLIP_JOKES[state.lastJokeIndex];
}

async function handleCommand(text) {
    if (!text.toLowerCase().includes('hey blip') && !parseWakePhrase(text).matched && text.length < 3) return;

    const normalizedText = normalizeVoiceTokens(text);
    const rawYouTubeCmd = getYouTubeVoiceCommand(normalizedText);
    const canPrioritizeRawYouTubeCommand = !!(
        rawYouTubeCmd &&
        (
            isYouTubePanelActuallyVisible() ||
            isSidePanelVisible() ||
            !!blipYtPlayer ||
            state.pendingYouTubeAction ||
            state.lastContext?.lastYoutubeUrl
        )
    );
    const sleepLikePhrase = /^(?:go\s+back\s+to\s+sleep|go\s+to\s+sleep|sleep|sleep\s+blip|blip\s+sleep)$/i.test(normalizedText.trim());
    const wakeInfo = canPrioritizeRawYouTubeCommand
        ? { matched: false, command: '', score: 0 }
        : (sleepLikePhrase ? { matched: false, command: '', score: 0 } : parseWakePhrase(text));
    const cmd = canPrioritizeRawYouTubeCommand
        ? normalizedText
        : (wakeInfo.matched
        ? (wakeInfo.command || 'wake')
        : (normalizedText.includes('hey blip')
            ? normalizedText.split('hey blip')[1].trim()
            : normalizedText));

    if (!cmd) return;
    state.currentVoiceCommandText = cmd;

    if (!inActiveGmailDraftFlow()) {
        clearGmailVoiceMergeState();
    }

    const earlySystemCmd = getSystemVoiceCommand(cmd);
    if (state.autoScrollTimer && earlySystemCmd !== 'scrollDown' && earlySystemCmd !== 'scrollUp' && earlySystemCmd !== 'stopScroll') {
        stopAutoScroll();
    }

    const quickReply = async (message, emotion = 'happy', extraHtml = '', resumeListening = true) => {
        transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${message}${extraHtml}`;
        state.history.push({ user: cmd, blip: message });
        if (state.history.length > HISTORY_MAX) state.history.shift();
        try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
        setBlipEmotion(emotion);
        setPersona(getReplyPersonaKey(emotion));
        const normalizedCmd = normalizeVoiceTokens(String(cmd || ''));
        const isFastUiCmd = /^(?:close|hide|exit|dismiss|open|show|display|browse|next|previous|prev|back|scroll|stop|save|maximize|full\s*screen|minimize|shrink|normal)\b/.test(normalizedCmd);
        const shouldSpeakAck = !(isFastUiCmd && String(message || '').trim().length <= 48);
        const resumeAfterSpeech = () => {
            if (!resumeListening || !state.isActive || state.softSleepMode) return;
            state.isThinking = false;
            document.body.classList.remove('thinking-mode');
            const tryKick = (attempt = 0) => {
                if (!state.isActive || state.softSleepMode) return;
                if (!state.isThinking && !speech.isSpeaking) {
                    startListeningLoop();
                    return;
                }
                if (attempt >= 24) return; // ~4.8s max wait
                setTimeout(() => tryKick(attempt + 1), 200);
            };
            setTimeout(() => tryKick(0), 120);
        };
        if (shouldSpeakAck) {
            talkBtn.innerText = '🔊 SPEAKING...';
            await speakWithGuard(message, emotion);
        } else {
            // Still acknowledge audibly (users often aren't watching the transcript),
            // but don't block UI updates waiting for speech.
            talkBtn.innerText = '🔊 SPEAKING...';
            speakWithGuard(message, emotion).catch(() => { });
            // Ensure we don't get stuck after non-blocking acks (speech may still be playing at 120ms).
            resumeAfterSpeech();
            return;
        }
        resumeAfterSpeech();
    };

    const passiveReply = async (message = '', emotion = 'happy', extraHtml = '', resumeListening = true) => {
        transcriptText.innerHTML = `<b>You:</b> ${cmd}${message ? `<br><b>Blip:</b> ${message}` : ''}${extraHtml}`;
        if (message) {
            state.history.push({ user: cmd, blip: message });
            if (state.history.length > HISTORY_MAX) state.history.shift();
            try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
        }
        setBlipEmotion(emotion);
        setPersona(getReplyPersonaKey(emotion));
        talkBtn.innerText = state.isActive ? '🎤 LISTENING...' : '🎙️ TALK';
        if (resumeListening && state.isActive && !state.isThinking && !speech.isSpeaking && !state.softSleepMode) startListeningLoop();
    };

    const handleYouTubeVoiceShortcut = async (ytCmd) => {
        if (!ytCmd) return false;
        face.classList.remove('thinking');
        let msg = '';
        let silentAck = false;
        const panelVisible = isSidePanelVisible();
        const hasPlayer = !!blipYtPlayer;
        const recoverablePlayerAction = ['stop', 'rewind', 'forward', 'pause', 'unmute', 'mute', 'play', 'restart', 'next'].includes(ytCmd);

        if ((ytCmd === 'videoBig' || ytCmd === 'videoSmall') && panelVisible) {
            setVideoBigMode(ytCmd === 'videoBig');
            msg = ytCmd === 'videoBig' ? 'Video full.' : 'Video normal.';
        } else if ((ytCmd === 'blipBig' || ytCmd === 'blipSmall') && panelVisible) {
            state.videoCompanionSize = ytCmd === 'blipBig' ? 'big' : 'mini';
            try { localStorage.setItem('blip_video_companion_size', state.videoCompanionSize); } catch (e) { }
            if (ytCmd === 'blipBig' && !state.videoBigMode) setVideoBigMode(true);
            applyVideoCompanionSizing();
            msg = ytCmd === 'blipBig' ? 'Blip big.' : 'Blip mini.';
        } else if (ytCmd === 'videoBig' || ytCmd === 'videoSmall' || ytCmd === 'blipBig' || ytCmd === 'blipSmall') {
            msg = 'Open video first.';
        } else if (ytCmd === 'openYouTube' || ytCmd === 'openMusic' || ytCmd === 'openVideos') {
            if (ytCmd === 'openVideos') {
                const activeView = openSavedMediaLane('Videos');
                msg = getVerifiedOpenMessage({
                    cmd,
                    target: 'media-strip',
                    visible: isMediaStripActuallyVisible(),
                    successMessage: `${activeView} open.`,
                    details: { lane: 'videos' }
                });
            } else if (ytCmd === 'openMusic') {
                const activeView = openSavedMediaLane('Music');
                msg = getVerifiedOpenMessage({
                    cmd,
                    target: 'media-strip',
                    visible: isMediaStripActuallyVisible(),
                    successMessage: `${activeView} open.`,
                    details: { lane: 'music' }
                });
            } else {
                toggleMediaGallery(true, 'all');
                msg = getVerifiedOpenMessage({
                    cmd,
                    target: 'media-strip',
                    visible: isMediaStripActuallyVisible(),
                    successMessage: 'Media open.',
                    details: { lane: 'all' }
                });
            }
        } else if (ytCmd === 'close' || ytCmd === 'new') {
            closeYouTubePanel();
            if (ytCmd === 'new') {
                state.lastContext.lastYoutubeQuery = null;
                state.lastContext.lastYoutubeSearchResults = null;
                state.lastContext.lastYoutubeSearchIndex = 0;
            }
            msg = ytCmd === 'close' ? 'Video closed.' : 'Closed. Ask new video.';
        } else if (hasPlayer && recoverablePlayerAction) {
            const ok = runYouTubeAction(ytCmd);
            msg = getYouTubeActionMessage(ytCmd, ok);
            silentAck = ['pause', 'unmute', 'mute', 'play', 'rewind', 'forward', 'restart', 'next'].includes(ytCmd);
            if (ytCmd === 'unmute' && ok) {
                await new Promise((resolve) => setTimeout(resolve, 660));
                const stillMuted = isYouTubePlayerMuted();
                if (stillMuted === true) {
                    state.pendingYouTubeAction = 'unmute';
                    msg = 'Chrome still has the video muted. Tap the video or the Unmute button once.';
                    silentAck = false;
                }
            }
        } else if (recoverablePlayerAction && state.lastContext.lastYoutubeUrl) {
            state.pendingYouTubeAction = ytCmd;
            const opened = openLastVideoPanel();
            msg = opened
                ? getVerifiedOpenMessage({
                    cmd,
                    target: 'youtube-panel',
                    visible: isYouTubePanelActuallyVisible(),
                    successMessage: 'Opening last video.'
                })
                : 'No active video.';
        } else {
            return false;
        }

        transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
        state.history.push({ user: cmd, blip: msg });
        if (state.history.length > HISTORY_MAX) state.history.shift();
        try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
        setBlipEmotion('happy');
        setPersona('happy');
        if (silentAck) {
            talkBtn.innerText = state.isActive ? '🎤 LISTENING...' : '🎙️ TALK';
            if (state.isActive && !state.isThinking && !speech.isSpeaking && !state.softSleepMode) startListeningLoop();
            return true;
        }
        talkBtn.innerText = '🔊 SPEAKING...';
        await speakWithGuard(msg, 'happy');
        return true;
    };

    const handleNaturalConversationBridge = async () => {
        const lower = normalizeVoiceTokens(String(cmd || ''));
        const pendingNatural = state.pendingNaturalConversation;

        if (pendingNatural?.kind === 'timerDuration') {
            const duration = parseStandaloneDurationMs(lower);
            if (duration) {
                clearPendingNaturalConversation();
                face.classList.remove('thinking');
                const result = await actionHandlers.timer({ text: '', tool_params: duration }, state);
                await quickReply(result?.text || 'Timer set.', 'happy', result?.extraHtml || '');
                return true;
            }
        }

        if (pendingNatural?.kind === 'alarmTime') {
            const alarmFollowUp = getDirectAlarmVoiceCommand(lower);
            if (alarmFollowUp) {
                clearPendingNaturalConversation();
                face.classList.remove('thinking');
                setBlipTimer(alarmFollowUp.label, alarmFollowUp.ms, alarmFollowUp.dueAt);
                state.lastContext.lastUserQuery = cmd;
                await quickReply(`Alarm set for ${alarmFollowUp.whenText}!`, 'happy');
                return true;
            }
        }

        const wantsNaturalTimer = /^(?:please\s+)?(?:set|start|create|make|put)\s+(?:a\s+)?(?:timer|countdown)(?:\s+for)?\s*$/.test(lower);
        if (wantsNaturalTimer) {
            beginPendingNaturalConversation('timerDuration');
            await quickReply('How long should I set the timer for?', 'happy');
            return true;
        }

        const wantsNaturalAlarm = /^(?:please\s+)?(?:(?:set|start|create|make)\s+(?:an?\s+)?)?(?:alarm|reminder)\s*$/.test(lower)
            || /^(?:please\s+)?(?:wake|remind)\s+me\s*$/.test(lower);
        if (wantsNaturalAlarm) {
            beginPendingNaturalConversation('alarmTime');
            await quickReply('What time should I set it for?', 'happy');
            return true;
        }

        const naturalOpenIntent = resolveNaturalOpenIntent(lower);
        if (naturalOpenIntent?.type === 'youtube' && state.lastContext.lastYoutubeUrl) {
            face.classList.remove('thinking');
            const opened = openLastVideoPanel();
            await quickReply(opened ? 'Opening video.' : 'No video yet.', 'happy');
            return true;
        }
        if (naturalOpenIntent?.type === 'map' && state.lastContext.lastLocation) {
            face.classList.remove('thinking');
            mapFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(state.lastContext.lastLocation)}&output=embed`;
            setMode('map');
            await quickReply(`Map open: ${state.lastContext.lastLocation}.`, 'happy');
            return true;
        }
        if (naturalOpenIntent?.type === 'chart' && state.lastContext.lastChartData) {
            face.classList.remove('thinking');
            const chartData = state.lastContext.lastChartData;
            setMode('chart');
            renderChart(chartData.labels, chartData.data, chartData.title || 'Chart', chartData.type || 'bar');
            await quickReply('Chart open.', 'happy');
            return true;
        }
        if (naturalOpenIntent?.type === 'media' && state.mediaItems.length > 0) {
            face.classList.remove('thinking');
            const bucket = naturalOpenIntent.bucket === MEDIA_BUCKET_CREATED ? MEDIA_BUCKET_CREATED : MEDIA_BUCKET_SHOTS;
            toggleMediaGallery(true, bucket === MEDIA_BUCKET_CREATED ? 'created' : 'shots');
            openLatestMediaByBucket(bucket);
            await quickReply('Opening latest media.', 'happy');
            return true;
        }

        const naturalPlayQuery = getNaturalPlayQuery(lower);
        if (naturalPlayQuery && !isSidePanelActuallyVisible('gmail') && !isSidePanelActuallyVisible('telegram')) {
            face.classList.remove('thinking');
            await actionHandlers.youtube({ text: '', tool_params: { query: naturalPlayQuery } }, state);
            const ytUrl = state.lastContext.lastYoutubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(naturalPlayQuery)}`;
            const embedUrl = state.lastContext.lastYoutubeEmbedUrl || null;
            const videoId = state.lastContext.lastYoutubeVideoId || null;
            const searchResults = state.lastContext.lastYoutubeSearchResults || null;
            renderActionInSidePanel({
                action: 'youtube',
                tool_params: { query: naturalPlayQuery, url: ytUrl, embedUrl, videoId, searchResults },
                text: `Playing: ${naturalPlayQuery}`
            });
            await quickReply('Opening video.', 'happy');
            return true;
        }

        return false;
    };

    const lowerCmd = normalizeVoiceTokens(String(cmd || ''));
    if (await handleNaturalConversationBridge()) {
        return;
    }
    const ytCmd = getYouTubeVoiceCommand(cmd);
    const prioritizedYouTubeCommands = new Set([
        'pause', 'play', 'stop', 'rewind', 'forward', 'mute', 'unmute', 'restart', 'next',
        'close', 'new', 'videoBig', 'videoSmall', 'blipBig', 'blipSmall', 'openMusic', 'openVideos', 'openYouTube'
    ]);
    if (ytCmd && prioritizedYouTubeCommands.has(ytCmd) && await handleYouTubeVoiceShortcut(ytCmd)) {
        return;
    }

    const jokeRequest = /^(?:tell\s+me\s+)?(?:a\s+)?joke\s*$|^tell\s+a\s+joke\s*$|^joke\s*$|^make\s+me\s+laugh\s*$|^say\s+(?:a\s+)?joke\s*$|^give\s+me\s+(?:a\s+)?joke\s*$|^another\s+joke\s*$/.test(lowerCmd);
    if (jokeRequest) {
        face.classList.remove('thinking');
        await quickReply(getNextJoke(), 'playful');
        return;
    }

    const openLinkCmd = getOpenLinkVoiceCommand(cmd);
    if (openLinkCmd === 'openLatestLink') {
        const url = state.lastContext?.lastOpenableUrl
            || state.lastContext?.lastYoutubeUrl
            || (state.lastContext?.lastLocation ? `https://www.google.com/maps/search/${encodeURIComponent(state.lastContext.lastLocation)}` : '')
            || (state.lastContext?.lastSearchTopic ? `https://www.google.com/search?q=${encodeURIComponent(state.lastContext.lastSearchTopic)}` : '');
        if (url) {
            try { window.open(url, '_blank', 'noopener'); } catch (_) { }
            await quickReply('Opening latest link.', 'happy');
        } else {
            await quickReply('No recent link to open yet.', 'happy');
        }
        return;
    }

    const systemCmd = getSystemVoiceCommand(cmd);
    if (systemCmd) {
        if (systemCmd === 'closeAllSleep') {
            cancelCurrentRequest();
            closeEverythingPanels();
            dismissActiveAlert({ resumeListening: false, clearVisual: true });
            await enterSoftSleepMode('Everything closed. Sleep mode on.');
            return;
        }
        if (systemCmd === 'closeAll') {
            cancelCurrentRequest();
            dismissActiveAlert({ resumeListening: false, clearVisual: true });
            closeEverythingPanels();
            await quickReply('Everything closed.', 'happy');
            return;
        }
        if (systemCmd === 'closeAlert') {
            const closed = dismissActiveAlert({ resumeListening: false, clearVisual: true });
            if (closed) {
                await quickReply('Alert closed.', 'happy');
                return;
            }
            const reminderCancelCmd = getReminderCancelVoiceCommand(cmd);
            if (reminderCancelCmd?.action === 'clearAll') {
                const removedCount = clearAllScheduledTimers();
                await quickReply(
                    removedCount
                        ? `Cancelled ${removedCount} scheduled reminder${removedCount === 1 ? '' : 's'}.`
                        : 'No scheduled reminders to cancel.',
                    'happy'
                );
            } else {
                const removed = reminderCancelCmd?.action === 'cancelMatch'
                    ? cancelMatchingScheduledTimer(reminderCancelCmd.query)
                    : cancelNextScheduledTimer();
                await quickReply(
                    removed
                        ? `Cancelled ${String(removed.text || 'alarm')}.`
                        : 'No scheduled reminders to cancel.',
                    'happy'
                );
            }
            return;
        }
        if (systemCmd === 'wake') {
            state.isActive = true;
            state.softSleepMode = false;
            state.isThinking = false;
            setRestingEyes(false);
            setPersona('listening');
            triggerWakeRainbowBurst();
            talkBtn.classList.add('active');
            await quickReply('I am awake.', 'happy', '', false);
            resumeListeningAfterWake(220);
            return;
        }
        if (systemCmd === 'sleepHelp') {
            await quickReply('Say go to sleep.', 'happy');
            return;
        }
        if (systemCmd === 'sleep') {
            await enterSoftSleepMode('Wake me up if you need me.');
            return;
        }
        if (systemCmd === 'stopScroll') {
            const wasScrolling = !!state.autoScrollTimer;
            stopAutoScroll();
            await quickReply(wasScrolling ? 'Stopped scrolling.' : 'Nothing is scrolling right now.', 'happy');
            return;
        }
        if (systemCmd === 'scrollDown' || systemCmd === 'scrollUp') {
            const direction = systemCmd === 'scrollUp' ? 'up' : 'down';
            const ok = scrollActiveSurface(direction);
            await quickReply(ok ? (direction === 'up' ? 'Scrolled up.' : 'Scrolled down.') : 'Nothing to scroll.', 'happy');
            return;
        }
        if (systemCmd === 'sizeUp' || systemCmd === 'sizeDown' || systemCmd === 'sizeReset') {
            let scale = state.faceScale || 1;
            if (systemCmd === 'sizeReset') scale = setFaceScale(1);
            else if (systemCmd === 'sizeUp') scale = setFaceScale((state.faceScale || 1) + 0.1);
            else scale = setFaceScale((state.faceScale || 1) - 0.1);
            await quickReply(`Size ${Math.round(scale * 100)}%.`, 'happy');
            return;
        }
    }

    const reminderCancelCmd = getReminderCancelVoiceCommand(cmd);
    if (reminderCancelCmd) {
        face.classList.remove('thinking');
        if (reminderCancelCmd.action === 'clearAll') {
            const removedCount = clearAllScheduledTimers();
            await quickReply(
                removedCount
                    ? `Cancelled ${removedCount} scheduled reminder${removedCount === 1 ? '' : 's'}.`
                    : 'No scheduled reminders to cancel.',
                'happy'
            );
        } else {
            const removed = reminderCancelCmd.action === 'cancelMatch'
                ? cancelMatchingScheduledTimer(reminderCancelCmd.query)
                : cancelNextScheduledTimer();
            await quickReply(
                removed
                    ? `Cancelled ${String(removed.text || 'alarm')}.`
                    : 'No scheduled reminders to cancel.',
                'happy'
            );
        }
        return;
    }

    const settingsCmd = getSettingsVoiceCommand(cmd);
    if (settingsCmd) {
        face.classList.remove('thinking');
        if (settingsCmd === 'open') {
            openSettingsPanel();
            await quickReply('Settings open.', 'happy');
        } else {
            closeSettingsPanel();
            await quickReply('Settings closed.', 'happy');
        }
        return;
    }

    const chatCmd = getChatVoiceCommand(cmd);
    if (chatCmd) {
        face.classList.remove('thinking');
        const opened = toggleChatEntry(chatCmd === 'open');
        await quickReply(opened ? 'Chat open.' : 'Chat closed.', 'happy');
        return;
    }

    const naturalMessageFlow = parseNaturalMessageFlow(cmd, getVoiceRoutingContext(state));
    if (naturalMessageFlow?.channel === 'gmail' && !getGmailVoiceCommand(cmd)) {
        face.classList.remove('thinking');
        try {
            await emailFeature.handleVoiceCommand({
                action: 'compose',
                draft: {
                    to: naturalMessageFlow.draft?.to || '',
                    subject: naturalMessageFlow.draft?.subject || '',
                    text: naturalMessageFlow.draft?.text || ''
                }
            });
            return;
        } catch (error) {
            console.warn('Natural Gmail flow failed:', error?.message || error);
            await quickReply(error?.message || 'Could not start that email draft right now.', 'sad');
            return;
        }
    }

    if (naturalMessageFlow?.channel === 'telegram' && !getTelegramVoiceCommand(cmd)) {
        face.classList.remove('thinking');
        try {
            await telegramFeature.handleVoiceCommand({
                action: 'compose',
                draft: {
                    chatId: naturalMessageFlow.draft?.chatId || '',
                    text: naturalMessageFlow.draft?.text || ''
                }
            });
            return;
        } catch (error) {
            console.warn('Natural Telegram flow failed:', error?.message || error);
            await quickReply(error?.message || 'Could not start that Telegram draft right now.', 'sad');
            return;
        }
    }

    const gmailCmd = getGmailVoiceCommand(cmd);
    const isFreshGmailComposeIntent = !!(
        gmailCmd
        && (
            gmailCmd.action === 'compose'
            || gmailCmd.action === 'sendDirect'
            || gmailCmd.action === 'shareCurrent'
            || gmailCmd.action === 'openDraft'
            || gmailCmd.action === 'openInbox'
            || gmailCmd.action === 'refreshInbox'
            || gmailCmd.action === 'readIndex'
            || gmailCmd.action === 'listContacts'
            || gmailCmd.action === 'saveContact'
            || gmailCmd.action === 'clearContacts'
            || gmailCmd.action === 'setSubject'
            || gmailCmd.action === 'connect'
            || gmailCmd.action === 'disconnect'
            || gmailCmd.action === 'close'
        )
    );

    // Email draft follow-ups must run even if pendingEmailReview was cleared (e.g. after "yes"),
    // as long as the Gmail panel is open with something in the compose fields — otherwise the LLM
    // may "role-play" sending mail without calling the Gmail API.
    // But if the user gives a fresh Gmail intent like "send email to my daughter", let that
    // override the old draft instead of treating it like an update to the previous draft.
    // Run before Telegram voice so phrases like "send it to name@example.com" update the draft
    // instead of matching Telegram photo-share heuristics.
    const hasVoiceEmailDraft = (() => {
        const d = state.gmailComposeDraft || {};
        return !!(String(d.to || '').trim() || String(d.subject || '').trim() || String(d.text || '').trim());
    })();
    const hasRecentGmailSend = !!(
        state.currentSidePanelAction === 'gmail'
        && state.lastGmailSendResult
    );
    const shouldHandleEmailDraftVoice = !isFreshGmailComposeIntent && (
        state.pendingEmailReview
        || (state.currentSidePanelAction === 'gmail' && hasVoiceEmailDraft)
        || hasRecentGmailSend
    );

    if (shouldHandleEmailDraftVoice) {
        face.classList.remove('thinking');
        try {
            const handled = await emailFeature.handlePendingVoiceFollowUp(cmd);
            if (handled) return;
        } catch (error) {
            console.warn('Email draft follow-up failed:', error?.message || error);
            await quickReply(error?.message || 'Could not update that email draft right now.', 'sad');
            return;
        }
    }

    const telegramCmd = getTelegramVoiceCommand(cmd);
    if (telegramCmd) {
        face.classList.remove('thinking');
        try {
            await telegramFeature.handleVoiceCommand(telegramCmd);
            return;
        } catch (error) {
            console.warn('Telegram voice command failed:', error?.message || error);
            telegramFeature.updateTelegramAuthUi();
            await quickReply(error?.message || 'Could not handle Telegram right now.', 'sad');
            return;
        }
    }

    if (gmailCmd) {
        face.classList.remove('thinking');
        try {
            await emailFeature.handleVoiceCommand(gmailCmd);
            return;
        } catch (error) {
            console.warn('Gmail voice command failed:', error?.message || error);
            emailFeature.updateGmailAuthUi();
            await quickReply(error?.message || 'Could not handle Gmail right now.', 'sad');
            return;
        }
    }

    const hasVoiceTelegramDraft = !!String(state.telegramDraft?.text || '').trim();
    const shouldHandleTelegramDraftVoice = !telegramCmd && (
        state.pendingTelegramReview
        || (state.currentSidePanelAction === 'telegram' && hasVoiceTelegramDraft)
    );

    if (shouldHandleTelegramDraftVoice) {
        face.classList.remove('thinking');
        try {
            const handled = await telegramFeature.handlePendingVoiceFollowUp(cmd);
            if (handled) return;
        } catch (error) {
            console.warn('Telegram draft follow-up failed:', error?.message || error);
            await quickReply(error?.message || 'Could not update that Telegram draft right now.', 'sad');
            return;
        }
    }

    const learningGamesCmd = getLearningGamesVoiceCommand(cmd);
    if (learningGamesCmd) {
        if (learningGamesCmd.action === 'close') {
            state.isThinking = false;
            document.body.classList.remove('thinking-mode');
            face.classList.remove('thinking');
            talkBtn.classList.remove('thinking');
            talkBtn.innerText = 'Ask Blip';
            if (state.currentMode === 'games') setMode('core');
            await quickReply('Learning Games closed.', 'happy');
            return;
        }
        state.isThinking = true;
        document.body.classList.remove('thinking-mode');
        face.classList.remove('thinking');
        talkBtn.classList.remove('thinking');
        talkBtn.innerText = 'Ask Blip';
        try {
            setMode('games');
            renderLearningGamesPanel();
            if (learningGamesCmd.action === 'startMath') {
                await startMathGame();
            } else if (learningGamesCmd.action === 'answerMath') {
                if (!state.mathGame.started) {
                    await quickReply('Say "start math game" first, then I will ask you a question.', 'happy', '', false);
                } else {
                    await handleMathAnswer(Number(learningGamesCmd.value));
                }
            } else if (learningGamesCmd.action === 'nextMath') {
                await renderMathQuestion();
            } else {
                await quickReply('Learning Games open. Say "start math game" when you want to play.', 'happy', '', false);
            }
        } finally {
            state.isThinking = false;
            document.body.classList.remove('thinking-mode');
            if (state.isActive && state.currentMode === 'games' && !state.softSleepMode) {
                setTimeout(() => {
                    if (state.isActive && state.currentMode === 'games' && !state.isThinking && !speech.isSpeaking) {
                        startListeningLoop();
                    }
                }, 180);
            }
        }
        return;
    }

    const styleCmd = getPersonalizationVoiceCommand(cmd);
    if (styleCmd) {
        if (styleCmd.action === 'reset') {
            updateBlipPersonalization({ ...BLIP_DEFAULT_PERSONALIZATION });
            await quickReply('Style reset.', 'happy');
            return;
        }
        if (styleCmd.action === 'hat') {
            const next = updateBlipPersonalization({ hat: styleCmd.value });
            await quickReply(next.hat === 'none' ? 'Hat off.' : `Hat ${next.hat}.`, 'happy');
            return;
        }
        if (styleCmd.action === 'glasses') {
            const next = updateBlipPersonalization({ glasses: styleCmd.value });
            await quickReply(next.glasses === 'none' ? 'Glasses off.' : `${next.glasses} glasses on.`, 'happy');
            return;
        }
        if (styleCmd.action === 'eyeColor') {
            const next = updateBlipPersonalization({ eyeColor: styleCmd.value });
            await quickReply(`Eye color ${next.eyeColor}.`, 'happy');
            return;
        }
        if (styleCmd.action === 'eyeColorPrompt') {
            await quickReply('Say: eye color blue, green, amber, purple, pink, cyan, or white.', 'happy');
            return;
        }
        if (styleCmd.action === 'auraColor') {
            const next = updateBlipPersonalization({ auraColor: styleCmd.value });
            await quickReply(`Aura ${next.auraColor}.`, 'happy');
            return;
        }
        if (styleCmd.action === 'auraColorPrompt') {
            await quickReply('Say: aura color gold, blue, green, pink, purple, cyan, or default.', 'happy');
            return;
        }
    }

    const emotionCmd = getEmotionShowcaseCommand(cmd);
    if (emotionCmd) {
        const personaKey = emotionCmd === 'serious' ? 'serious' : emotionCmd;
        stopListening();
        state.isThinking = false;
        syncChatEngagementState(false);
        face.classList.remove('thinking', 'listening');
        faceFrame?.classList.remove('listening-glow');
        talkBtn.classList.remove('thinking', 'listening');
        talkBtn.classList.add('active');
        talkBtn.innerText = 'Feeling';
        setBlipEmotion(personaKey);
        setPersona(getReplyPersonaKey(personaKey));
        triggerEmotionShowcase(emotionCmd);
        const message = emotionCmd === 'happy'
            ? 'Here is my happy.'
            : emotionCmd === 'sad'
                ? 'Here is my sad.'
                : emotionCmd === 'angry'
                    ? 'Here is my angry.'
                    : 'Here is my serious.';
        transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${message}`;
        state.history.push({ user: cmd, blip: message });
        if (state.history.length > HISTORY_MAX) state.history.shift();
        try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
        await speakWithGuard(message, personaKey);
        resumeListeningAfterEmotionShowcase(80);
        return;
    }

    if (state.activeAlert) {
        dismissActiveAlert({ resumeListening: false, clearVisual: true });
    }

    if (state.softSleepMode) {
        await quickReply('Wake me up if you need me.', 'sleepy');
        return;
    }

    if (isPraise(cmd)) triggerBlipParty();

    state.isThinking = true;
    stopListening();


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

        const executeStructuredAssistantResponse = async (response, routeMeta = null) => {
            if (!response || typeof response !== 'object') {
                await quickReply("I'm here.", 'happy');
                return;
            }

            const action = String(response.action || 'none');
            const emotion = String(response.emotion || 'happy');
            let replyText = sanitizeBlipReplyText(String(response.text || '').trim()) || "I'm here.";
            let extraHtml = '';
            let handlerResult = null;

            if (actionHandlers[action]) {
                handlerResult = await actionHandlers[action](response, state);
                if (handlerResult?.text) replyText = handlerResult.text;
                if (handlerResult?.extraHtml) extraHtml += handlerResult.extraHtml;

                if (action === 'chart' && response.tool_params?.labels && response.tool_params?.data) {
                    renderActionInSidePanel({ action: 'chart', tool_params: response.tool_params, text: replyText });
                } else if (action === 'youtube') {
                    const requestedLibraryView = handlerResult?.libraryView || resolveRequestedYouTubeLibraryView(
                        response.tool_params?.query || '',
                        cmd,
                        replyText
                    );
                    if (requestedLibraryView) {
                        openSavedMediaLane(requestedLibraryView);
                    } else {
                        renderActionInSidePanel({
                            action: 'youtube',
                            tool_params: {
                                query: response.tool_params?.query || cmd,
                                url: state.lastContext.lastYoutubeUrl || response.tool_params?.url || '',
                                embedUrl: state.lastContext.lastYoutubeEmbedUrl || null,
                                videoId: state.lastContext.lastYoutubeVideoId || response.tool_params?.videoId || null,
                                searchResults: state.lastContext.lastYoutubeSearchResults || null
                            },
                            text: replyText
                        });
                    }
                } else if (action === 'products') {
                    renderActionInSidePanel({
                        action: 'products',
                        tool_params: {
                            query: response.tool_params?.query || cmd,
                            links: handlerResult?.links || [],
                            previewDataUrl: handlerResult?.previewDataUrl || ''
                        },
                        text: replyText
                    });
                }
            }

            transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${replyText}${extraHtml}`;
            state.lastContext.lastUserQuery = cmd;
            if (response.tool_params?.query) state.lastContext.lastSearchTopic = response.tool_params.query;
            state.history.push({ user: cmd, blip: replyText });
            if (state.history.length > HISTORY_MAX) state.history.shift();
            try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }

            contextAgent.observe({
                voiceTranscript: cmd,
                lastBlipReply: replyText,
                hasCameraImage: !!state.pendingImage,
                isLiveWatch: state.isLiveWatch,
                timers: state.timers,
                screenMode: state.currentMode,
                recentQuestions: state.history
            });
            const decision = contextAgent.decide();
            applyContextDecision(decision);

            face.classList.remove('thinking', 'despair');
            setBlipEmotion(emotion);
            setEmotion(emotion);
            setPersona(getReplyPersonaKey(emotion));
            if (response.symbol) spawnSymbol(response.symbol);
            else if (routeMeta?.mode === 'deep') spawnSymbol('brain');
            if (state.pendingImage) clearPendingImage();

            talkBtn.innerText = '🔊 SPEAKING...';
            await speak(replyText, emotion);
        };

        const hubCmd = getHubVoiceCommand(cmd);
        if (hubCmd) {
            face.classList.remove('thinking');
            let msg = '';
            if (hubCmd.action === 'open') {
                setMode('hub');
                renderHub();
                msg = state.hubItems.length ? `Hub open. ${state.hubItems.length} item${state.hubItems.length === 1 ? '' : 's'}.` : 'Hub open. Empty.';
            } else if (hubCmd.action === 'close') {
                if (state.currentMode === 'hub') setMode('core');
                msg = 'Hub closed.';
            } else if (hubCmd.action === 'review') {
                setMode('hub');
                renderHub();
                if (!state.hubItems.length) {
                    msg = 'Hub is empty.';
                } else {
                    const latest = state.hubItems[0];
                    const latestLabel = String(latest?.content || latest?.type || 'item').slice(0, 60);
                    msg = `Hub has ${state.hubItems.length} items. Latest: ${latestLabel}.`;
                }
            } else if (hubCmd.action === 'saveCurrent') {
                if (state.pendingImage || state.currentImage) {
                    saveCurrentVisionToHub();
                    msg = 'Saved to Hub.';
                } else if (state.lastContext?.lastYoutubeUrl) {
                    addToHub('link', `🎬 Video: ${state.lastContext.lastYoutubeQuery || 'YouTube video'}`, { url: state.lastContext.lastYoutubeUrl });
                    msg = 'Video saved to Hub.';
                } else if (state.lastContext?.lastLocation) {
                    const mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(state.lastContext.lastLocation)}`;
                    addToHub('link', `🌍 Map: ${state.lastContext.lastLocation}`, { url: mapUrl });
                    msg = 'Map saved to Hub.';
                } else {
                    msg = 'Nothing ready to save to Hub.';
                }
            } else if (hubCmd.action === 'saveNote') {
                addToHub('note', hubCmd.note, { source: 'hub' });
                msg = 'Note saved to Hub.';
            } else if (hubCmd.action === 'removeLatest') {
                const removed = removeLatestHubItem();
                msg = removed ? 'Removed latest Hub item.' : 'Hub is already empty.';
            } else if (hubCmd.action === 'removeMatch') {
                const removed = removeMatchingHubItem(hubCmd.query);
                msg = removed ? 'Removed matching Hub item.' : 'No matching Hub item found.';
            } else if (hubCmd.action === 'clear') {
                const removedCount = clearHub();
                msg = removedCount ? `Hub cleared. Removed ${removedCount} item${removedCount === 1 ? '' : 's'}.` : 'Hub is already empty.';
            }
            if (msg) {
                await quickReply(msg, 'happy');
                return;
            }
        }

        const memoryCmd = getMemoryVoiceCommand(cmd);
        if (memoryCmd) {
            face.classList.remove('thinking');
            let msg = '';
            if (memoryCmd.action === 'start') {
                beginUserProfileOnboarding({ continueToNotes: false });
                msg = formatPendingProfilePrompt(state.pendingProfileDraft);
            } else if (memoryCmd.action === 'review') {
                const name = getDisplayUserName() || 'not set yet';
                const store = state.userProfile?.preferredStore || 'not set yet';
                const habits = state.userProfile?.shoppingHabits || 'not set yet';
                msg = `I remember: name ${name}, store ${store}, shopping habits ${habits}.`;
            }
            if (msg) {
                await quickReply(msg, 'happy');
                return;
            }
        }

        const notesCmd = getNotesVoiceCommand(cmd);
        if (notesCmd) {
            face.classList.remove('thinking');
            let msg = '';
            if (notesCmd.action === 'startDraft') {
                const descriptor = inferNoteKindAndTitle(notesCmd.descriptor || '');
                state.pendingNotesDraft = descriptor
                    ? buildPendingNotesDraft(descriptor.noteType, descriptor.title)
                    : { stage: 'awaiting_kind', noteType: '', title: '', items: [] };
                if (!getDisplayUserName()) {
                    beginUserProfileOnboarding({ continueToNotes: true, nextNotesDraft: state.pendingNotesDraft });
                    state.pendingNotesDraft = null;
                    msg = formatPendingProfilePrompt(state.pendingProfileDraft);
                } else {
                    msg = formatPendingNotesDraftPrompt(state.pendingNotesDraft);
                    syncNotesPanelIfVisible(msg);
                }
            } else if (notesCmd.action === 'open') {
                state.pendingNotesDraft = state.pendingNotesDraft || buildFreeformNoteDraft('Note');
                openNotesPanel();
                const count = getNoteItems().length;
                msg = count
                    ? `Notes open. ${count} note${count === 1 ? '' : 's'}. Dictate your note when ready.`
                    : 'Notes open. Dictate your note.';
            } else if (notesCmd.action === 'close') {
                state.pendingNotesDraft = null;
                const didClose = state.currentSidePanelAction === 'notes' ? !!closeSidePanel() : false;
                msg = didClose ? 'Notes closed.' : 'Notes were not open.';
            } else if (notesCmd.action === 'saveNote') {
                const saved = addNoteItem(notesCmd.note, { source: 'notes-voice' });
                const preview = String(notesCmd.note || '').trim();
                syncNotesPanelIfVisible(saved ? `Note saved: ${preview}` : 'Could not save that note.', preview);
                msg = saved ? `Note saved: ${preview}` : 'Could not save that note.';
            } else if (notesCmd.action === 'removeLatest') {
                const removed = removeLatestNoteItem();
                syncNotesPanelIfVisible(removed ? 'Removed latest note.' : 'No notes to remove.');
                msg = removed ? 'Removed latest note.' : 'No notes to remove.';
            } else if (notesCmd.action === 'removeMatch') {
                const removed = removeMatchingNoteItem(notesCmd.query);
                syncNotesPanelIfVisible(removed ? 'Removed matching note.' : 'No matching note found.');
                msg = removed ? 'Removed matching note.' : 'No matching note found.';
            } else if (notesCmd.action === 'clear') {
                const removedCount = clearNotes();
                syncNotesPanelIfVisible(removedCount ? `Cleared ${removedCount} note${removedCount === 1 ? '' : 's'}.` : 'No notes to clear.');
                msg = removedCount ? `Cleared ${removedCount} note${removedCount === 1 ? '' : 's'}.` : 'No notes to clear.';
            }
            if (msg) {
                await quickReply(msg, 'happy');
                return;
            }
        }

        const cartCmd = getCartVoiceCommand(cmd);
        if (cartCmd) {
            face.classList.remove('thinking');
            let msg = '';
            const action = typeof cartCmd === 'string' ? cartCmd : cartCmd.action;
            if (action === 'open') {
                setMode('cart');
                renderCart();
                msg = state.cartItems.length ? `Cart open. ${state.cartItems.length} item${state.cartItems.length === 1 ? '' : 's'}.` : 'Cart open. Empty.';
            } else if (action === 'close') {
                if (state.currentMode === 'cart') setMode('core');
                msg = 'Cart closed.';
            } else if (action === 'review') {
                setMode('cart');
                renderCart();
                msg = state.cartItems.length ? `Cart has ${state.cartItems.length} items.` : 'Cart is empty.';
            } else if (action === 'showImages') {
                const shown = showCartItem(state.cartBrowseIndex || 0, { previewImage: true, speak: true });
                msg = shown.text;
            } else if (action === 'saveCurrent') {
                const saved = saveProductLinksToCart(state.lastContext.lastProductLinks || [], {
                    previewDataUrl: state.lastContext.lastProductPreviewDataUrl || ''
                });
                msg = saved > 0 ? `Saved ${saved} product${saved === 1 ? '' : 's'} to cart.` : 'No products ready to save.';
            } else if (action === 'nextItem') {
                const shown = stepCartItem(1, { previewImage: true, speak: true });
                msg = shown.text;
            } else if (action === 'prevItem') {
                const shown = stepCartItem(-1, { previewImage: true, speak: true });
                msg = shown.text;
            } else if (action === 'showCurrent') {
                const shown = showCartItem(state.cartBrowseIndex || 0, { previewImage: true, speak: true });
                msg = shown.text;
            } else if (action === 'buyCurrent') {
                const opened = openCurrentCartProduct();
                msg = opened.text;
            } else if (action === 'removeLatest') {
                const removed = removeLatestCartItem();
                msg = removed ? `${removed.name} removed from cart.` : 'Cart is already empty.';
            } else if (action === 'removeMatch') {
                const removed = removeMatchingCartItem(cartCmd.query);
                msg = removed ? `${removed.name} removed from cart.` : 'No matching cart item found.';
            } else if (action === 'clear') {
                const removedCount = clearCart();
                msg = removedCount ? `Cart cleared. Removed ${removedCount} item${removedCount === 1 ? '' : 's'}.` : 'Cart is already empty.';
            }
            if (msg) {
                await quickReply(msg, 'happy');
                return;
            }
        }

        // Universal save resolver (map/creation/photo) for commands like "save this".
        const timerCmd = getDirectTimerVoiceCommand(cmd);
        if (timerCmd) {
            face.classList.remove('thinking');
            const result = await actionHandlers.timer({ text: '', tool_params: timerCmd }, state);
            await quickReply(result?.text || 'Timer set.', 'happy', result?.extraHtml || '');
            return;
        }

        const alarmCmd = getDirectAlarmVoiceCommand(cmd);
        if (alarmCmd) {
            face.classList.remove('thinking');
            setBlipTimer(alarmCmd.label, alarmCmd.ms, alarmCmd.dueAt);
            state.lastContext.lastUserQuery = cmd;
            await quickReply(`Alarm set for ${alarmCmd.whenText}!`, 'happy');
            return;
        }

        const videoSaveCmd = getYouTubeSaveVoiceCommand(cmd);
        if (videoSaveCmd) {
            face.classList.remove('thinking');
            const result = saveCurrentYouTubeToPlaylist(videoSaveCmd.playlistName || DEFAULT_VIDEO_PLAYLIST);
            const msg = result.ok
                ? result.duplicate
                    ? `${result.item?.title || 'Video'} is already in ${result.playlistName}.`
                    : `Saved this video to ${result.playlistName}.`
                : 'No active video to save yet.';
            await quickReply(msg, 'happy');
            return;
        }

        const saveCmd = getDirectSaveVoiceCommand(cmd);
        if (saveCmd) {
            face.classList.remove('thinking');
            let msg = '';
            if (saveCmd === 'saveMap') {
                const ok = saveLatestMapToGallery();
                msg = ok ? 'Map saved to media.' : getMediaPersistFailureMessage('No map yet.');
            } else if (saveCmd === 'saveRecipe') {
                const ok = saveLatestRecipeToGallery();
                msg = ok ? 'Recipe saved to media.' : getMediaPersistFailureMessage('No recipe yet.');
            } else if (saveCmd === 'saveCreation') {
                const ok = saveCurrentCreationToGallery();
                msg = ok ? 'Saved to media.' : getMediaPersistFailureMessage('No graph, design, or map open.');
            } else if (saveCmd === 'savePhoto') {
                const ok = saveLatestPhotoToGallery();
                const returnedToPhotos = ok ? returnToPhotosAfterSave() : false;
                msg = ok
                    ? (returnedToPhotos ? 'Photo saved. Back to media.' : 'Photo saved.')
                    : getMediaPersistFailureMessage('No photo to save.');
            }
            if (msg) {
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
                state.history.push({ user: cmd, blip: msg });
                if (state.history.length > HISTORY_MAX) state.history.shift();
                try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
                setBlipEmotion('happy');
                setPersona('happy');
                talkBtn.innerText = '🔊 SPEAKING...';
                await speakWithGuard(msg, 'happy');
                return;
            }
        }

        // Voice shortcuts: camera controls (open/close/snap) should not depend on model interpretation.
        const cameraCmd = getCameraVoiceCommand(cmd);
        if (cameraCmd) {
            face.classList.remove('thinking');
            let msg = '';
            if (cameraCmd === 'open') {
                if (state.cameraStream) {
                    msg = "Camera already on.";
                } else {
                    const started = await startCamera();
                    msg = started && state.cameraStream ? "Camera on." : "Camera blocked.";
                }
            } else if (cameraCmd === 'close') {
                if (state.cameraStream || state.currentMode === 'vision') {
                    exitVisionMode({ keepTranscript: true, resumeListening: false });
                    msg = "Camera off.";
                } else {
                    msg = "Camera already off.";
                }
            } else if (cameraCmd === 'snap') {
                const ok = await capturePhotoWhenReady();
                if (ok) {
                    const opened = openLatestImageByBucket(MEDIA_BUCKET_SHOTS);
                    msg = opened ? 'Photo saved. Opening it now.' : 'Photo saved.';
                } else {
                    msg = "Camera warming up. Try again.";
                }
            } else if (cameraCmd === 'videoStart') {
                if (!state.cameraStream) {
                    await startCamera();
                }
                if (!state.cameraStream) {
                    msg = 'Camera blocked.';
                } else if (isVideoRecording()) {
                    msg = 'Already recording.';
                } else {
                    const ok = await startVideoRecording();
                    msg = ok ? 'Recording video.' : 'Video recording unavailable.';
                }
            } else if (cameraCmd === 'videoStop') {
                if (!isVideoRecording()) {
                    msg = 'No video recording.';
                } else {
                    const ok = await stopVideoRecording();
                    msg = ok ? 'Video saved.' : 'Could not save video.';
                }
            } else if (cameraCmd === 'save') {
                const ok = saveLatestPhotoToGallery();
                msg = ok ? 'Photo saved.' : getMediaPersistFailureMessage('No photo to save.');
            }
            if (msg) {
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
                state.history.push({ user: cmd, blip: msg });
                if (state.history.length > HISTORY_MAX) state.history.shift();
                try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
                setBlipEmotion('happy');
                setPersona('happy');
                talkBtn.innerText = '🔊 SPEAKING...';
                await speakWithGuard(msg, 'happy');
                return;
            }
        }

        // Voice shortcuts: creation media (graphs/designs/drawings) save + gallery lane.
        const lowerCreationsCmd = normalizeVoiceTokens(String(cmd || ''));
        if (!CREATIONS_TOOL_ENABLED) {
            const saveToCreationsCmd = /\b(save|store|keep)\b[\s\w]{0,24}\b(to|in)\s+creations?\b/.test(lowerCreationsCmd);
            if (saveToCreationsCmd) {
                face.classList.remove('thinking');
                const saved = saveCurrentCreationToGallery();
                await quickReply(saved ? 'Saved to media.' : getMediaPersistFailureMessage('No image to save.'), saved ? 'happy' : 'serious');
                return;
            }
            if (/\bcreations?\b/.test(lowerCreationsCmd)) {
                face.classList.remove('thinking');
                await quickReply(CREATIONS_DISABLED_MESSAGE, 'serious');
                return;
            }
        }

        const creationCmd = CREATIONS_TOOL_ENABLED ? getCreationGalleryVoiceCommand(cmd) : null;
        if (creationCmd) {
            face.classList.remove('thinking');
            let msg = '';
            const action = typeof creationCmd === 'string' ? creationCmd : creationCmd.action;
            if (action === 'saveRecipe') {
                const ok = saveLatestRecipeToGallery();
                msg = ok ? 'Recipe saved to media.' : getMediaPersistFailureMessage('No recipe yet.');
            } else if (action === 'saveMap') {
                const ok = saveLatestMapToGallery();
                msg = ok ? 'Map saved to media.' : getMediaPersistFailureMessage('No map yet.');
            } else if (action === 'saveCurrent') {
                const ok = saveCurrentCreationToGallery();
                msg = ok ? 'Saved to media.' : getMediaPersistFailureMessage('No graph, design, or map open.');
            } else if (action === 'open') {
                if (mediaLightbox?.classList.contains('active')) closeMediaLightbox();
                const count = getMediaItemsByBucket(MEDIA_BUCKET_CREATED).length;
                openCreationsPanel(count > 0
                    ? `Creations open. ${count} item${count === 1 ? '' : 's'}. Pick one to open.`
                    : 'Creations open. Empty.');
                msg = count > 0
                    ? `Creations open. ${count} item${count === 1 ? '' : 's'}. Pick one to open.`
                    : 'Creations open. Empty.';
            } else if (action === 'close') {
                let closedAny = false;
                if (mediaLightbox?.classList.contains('active') && state.activeMediaBucket === MEDIA_BUCKET_CREATED) {
                    closeMediaLightbox();
                    closedAny = true;
                }
                if (canOpenCurrentCreationFromPanel() || isCreationsPanelOpen()) {
                    closeSidePanel();
                    closedAny = true;
                }
                const activeLane = normalizeMediaLane(state.mediaStripLane);
                if (state.isMediaStripOpen && (activeLane === 'created' || state.activeMediaBucket === MEDIA_BUCKET_CREATED)) {
                    toggleMediaGallery(false);
                    closedAny = true;
                }
                msg = closedAny ? 'Creations closed.' : 'Creations were not open.';
            } else if (action === 'expandLatest') {
                const ok = openCurrentCreationView();
                msg = ok ? 'Opening latest creation.' : 'No creations yet.';
            } else if (action === 'openIndex') {
                const n = Number(creationCmd.index);
                const ok = openMediaByNumber(n, MEDIA_BUCKET_CREATED);
                msg = ok ? `Opening creation ${n}.` : `No creation ${n}.`;
            } else if (action === 'openMatch') {
                const ok = openMediaById(creationCmd.id);
                msg = ok ? `Opening ${creationCmd.title || 'creation'}.` : `I couldn't find that creation yet.`;
            } else if (action === 'deleteLatest') {
                const removed = removeLatestMediaByBucket(MEDIA_BUCKET_CREATED);
                if (isCreationsPanelOpen()) openCreationsPanel(removed ? 'Removed latest creation.' : 'No creations yet.');
                msg = removed ? 'Removed latest creation.' : 'No creations yet.';
            } else if (action === 'deleteCurrent') {
                const removedCurrent = removeActiveMediaByBucket(MEDIA_BUCKET_CREATED);
                if (removedCurrent) {
                    if (isCreationsPanelOpen()) openCreationsPanel('Removed current creation.');
                    msg = 'Removed current creation.';
                } else {
                    const removedLatest = removeLatestMediaByBucket(MEDIA_BUCKET_CREATED);
                    if (isCreationsPanelOpen()) openCreationsPanel(removedLatest ? 'Removed latest creation.' : 'No creations yet.');
                    msg = removedLatest ? 'Removed latest creation.' : 'No creations yet.';
                }
            } else if (action === 'deleteIndex') {
                const n = Number(creationCmd.index);
                const removed = removeMediaByNumber(n, MEDIA_BUCKET_CREATED);
                if (isCreationsPanelOpen()) openCreationsPanel(removed ? `Removed creation ${n}.` : `No creation ${n}.`);
                msg = removed ? `Removed creation ${n}.` : `No creation ${n}.`;
            } else if (action === 'clear') {
                const removedCount = clearMediaByBucket(MEDIA_BUCKET_CREATED);
                if (isCreationsPanelOpen()) openCreationsPanel(removedCount ? `Cleared creations. Removed ${removedCount} item${removedCount === 1 ? '' : 's'}.` : 'No creations to clear.');
                msg = removedCount ? `Cleared creations. Removed ${removedCount} item${removedCount === 1 ? '' : 's'}.` : 'No creations to clear.';
            }
            if (msg) {
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
                state.history.push({ user: cmd, blip: msg });
                if (state.history.length > HISTORY_MAX) state.history.shift();
                try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
                setBlipEmotion('happy');
                setPersona('happy');
                talkBtn.innerText = '🔊 SPEAKING...';
                await speakWithGuard(msg, 'happy');
                return;
            }
        }

        // Recovery shortcut: if user says they can't see it / where it opened, force media UI open.
        if (wantsToSeeMediaAgain(cmd) && state.mediaItems.length > 0) {
            face.classList.remove('thinking');
            const lane = state.activeMediaBucket === MEDIA_BUCKET_CREATED ? 'created' : 'shots';
            toggleMediaGallery(true, lane);
            const lowerCmd = cmd.toLowerCase();
            if (/\b(open|expand|zoom)\s+(it|this)\b/.test(lowerCmd)) {
                openLatestMediaByBucket(lane === 'created' ? MEDIA_BUCKET_CREATED : MEDIA_BUCKET_SHOTS);
            }
            const wantsLightbox = /\b(open|expand|zoom)\s+(it|this)\b/.test(lowerCmd);
            const msg = getVerifiedOpenMessage({
                cmd,
                target: wantsLightbox ? 'media-lightbox' : 'media-strip',
                visible: wantsLightbox ? isMediaLightboxActuallyVisible() : isMediaStripActuallyVisible(),
                successMessage: 'Gallery open.'
            });
            transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
            state.history.push({ user: cmd, blip: msg });
            if (state.history.length > HISTORY_MAX) state.history.shift();
            try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
            setBlipEmotion('happy');
            setPersona('happy');
            talkBtn.innerText = '🔊 SPEAKING...';
            await speakWithGuard(msg, 'happy');
            return;
        }

        // Hands-free map query/route: "show map of madrid", "route from A to B", etc.
        const directMapRequest = getDirectMapVoiceRequest(cmd);
        if (directMapRequest) {
            face.classList.remove('thinking');
            const opened = openMapRequest(directMapRequest);
            const msg = !opened.ok
                ? 'Could not open map right now.'
                : getVerifiedOpenMessage({
                    cmd,
                    target: 'map',
                    visible: isMapActuallyVisible(),
                    successMessage: opened.type === 'route'
                        ? `Route open: ${opened.label}.`
                        : `Map open: ${opened.label}.`,
                    details: { label: opened.label, type: opened.type }
                });
            await quickReply(msg, 'happy');
            return;
        }

        // Hands-free local chart: "make chart apples 10 pears 30".
        const inlineChart = getInlineChartVoiceData(cmd);
        if (inlineChart) {
            face.classList.remove('thinking');
            setMode('chart');
            chartContainer.classList.add('reveal');
            document.body.classList.add('projecting-visual');
            renderChart(inlineChart.labels, inlineChart.data, inlineChart.title, inlineChart.type);
            state.lastContext.lastChartTitle = inlineChart.title;
            state.lastContext.lastChartData = {
                labels: inlineChart.labels,
                data: inlineChart.data,
                title: inlineChart.title,
                type: inlineChart.type
            };
            setTimeout(() => chartContainer.classList.remove('reveal'), 700);
            await quickReply('Graph ready. Say "save to media".', 'happy');
            return;
        }

        const directImageLookup = getDirectImageLookupRequest(cmd);
        if (directImageLookup) {
            face.classList.remove('thinking');
            const result = await web.getImageLookup(directImageLookup.query);
            state.lastContext.lastSearchTopic = directImageLookup.query;
            state.lastContext.lastOpenableUrl = result.sourceUrl || `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(directImageLookup.query)}`;
            if (result.imageUrl) {
                renderActionInSidePanel({
                    action: 'image',
                    tool_params: {
                        imageUrl: result.imageUrl,
                        fallbackImageUrls: Array.isArray(result.fallbackImageUrls) ? result.fallbackImageUrls : [],
                        title: result.title || directImageLookup.query,
                        sourceUrl: result.sourceUrl || ''
                    },
                    text: result.text || `Here is ${directImageLookup.query}.`
                });
            }
            addToHub('link', `🖼 Image: ${directImageLookup.query}`, { url: state.lastContext.lastOpenableUrl });
            await quickReply(result.text || `Here is ${directImageLookup.query}.`, 'happy', result.html ? `<br>${result.html}` : '');
            return;
        }

        const libraryPlayTarget = isYouTubeLibraryVoiceContextOpen()
            ? extractYouTubeLibraryPlayTargetFromVoice(cmd)
            : null;
        if (libraryPlayTarget) {
            face.classList.remove('thinking');
            const lane = normalizeMediaLane(state.mediaStripLane);
            const activeView = lane === 'videos'
                ? 'Videos'
                : lane === 'music'
                    ? 'Music'
                    : getActiveSavedYouTubeViewForVoice();
            const preferredViews = libraryPlayTarget.view
                ? [libraryPlayTarget.view]
                : [activeView, activeView === 'Videos' ? 'Music' : 'Videos'];
            const result = libraryPlayTarget.mode === 'current'
                ? playCurrentSavedYouTubeItem(activeView)
                : playSavedYouTubeItemByTitle(libraryPlayTarget.title, { preferredViews });
            const targetLane = (result.view || preferredViews[0] || activeView) === 'Videos' ? 'videos' : 'music';
            if (result.ok) toggleMediaGallery(true, targetLane);
            await quickReply(result.message, result.ok ? 'happy' : 'serious');
            return;
        }

        const similarYouTube = getYouTubeSimilarVoiceCommand(cmd);
        if (similarYouTube?.query) {
            face.classList.remove('thinking');
            state.pendingYouTubeAction = wantsUnmuteVideo(cmd) ? 'unmute' : null;
            await actionHandlers.youtube({ text: '', tool_params: { query: similarYouTube.query } }, state);
            const ytUrl = state.lastContext.lastYoutubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(similarYouTube.query)}`;
            const embedUrl = state.lastContext.lastYoutubeEmbedUrl || null;
            const videoId = state.lastContext.lastYoutubeVideoId || null;
            const searchResults = state.lastContext.lastYoutubeSearchResults || null;
            renderActionInSidePanel({
                action: 'youtube',
                tool_params: { query: similarYouTube.query, url: ytUrl, embedUrl, videoId, searchResults },
                text: `Playing: ${similarYouTube.query}`
            });
            await quickReply('Opening a similar video.', 'happy');
            return;
        }

        // Hands-free YouTube search: "play video about whales", "youtube lo-fi beats".
        const directYouTubeQuery = getDirectYouTubeVoiceQuery(cmd);
        if (directYouTubeQuery) {
            face.classList.remove('thinking');
            if (wantsUnmuteVideo(cmd)) state.pendingYouTubeAction = 'unmute';
            await actionHandlers.youtube({ text: '', tool_params: { query: directYouTubeQuery } }, state);
            const ytUrl = state.lastContext.lastYoutubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(directYouTubeQuery)}`;
            const embedUrl = state.lastContext.lastYoutubeEmbedUrl || null;
            const videoId = state.lastContext.lastYoutubeVideoId || null;
            const searchResults = state.lastContext.lastYoutubeSearchResults || null;
            renderActionInSidePanel({
                action: 'youtube',
                tool_params: { query: directYouTubeQuery, url: ytUrl, embedUrl, videoId, searchResults },
                text: `Playing: ${directYouTubeQuery}`
            });
            // Auto-save into Music vs Videos playlist.
            const currentEntry = Array.isArray(searchResults)
                ? (searchResults[Math.max(0, Number(state.lastContext.lastYoutubeSearchIndex) || 0)] || searchResults[0] || null)
                : null;
            const autoPlaylist = resolveAutoPlaylistForYouTube(directYouTubeQuery, currentEntry);
            saveCurrentYouTubeToPlaylist(autoPlaylist);
            await quickReply('Opening video.', 'happy');
            return;
        }

        // "Enlarge" / "make big" = 20% zoom on design panel; "full screen" / "maximize" = open lightbox.
        const lowerForEnlarge = normalizeVoiceTokens(String(cmd || ''));
        const indexedMediaOpenMatch = /^(?:open|show|view|play)\s+(?:the\s+)?(?:photo|foto|picture|shot|snapshot|creation|design|drawing|video|song|track)\s+(?:number\s+|#\s*)?(?:\d{1,3}|one|two|to|too|three|four|for|five|six|seven|eight|nine|ten|eleven|twelve|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\b/.test(lowerForEnlarge);
        const fullScreenMatch = /\bfull\s*(?:screen|size)\b|\bmaximize\b|\b(?:open|show|view)\s+(?:full\s*screen|it\s+full)\b/.test(lowerForEnlarge);
        const enlargeLongMatch = /\b(expand|enlarge|zoom|maximize|open|show|view)\s+(?:me\s+)?(?:the\s+)?(?:it|this|this\s+one|that|picture|photo|image|shot|snapshot|design|creation|drawing)\s*(?:big|bigger|large|larger|full(?:\s+screen)?)?\b|\b(?:big|bigger|large|larger|full(?:\s+screen)?)\s+(?:picture|photo|image|shot|snapshot|design|creation)\b/.test(lowerForEnlarge);
        const enlargeShortMatch = /^(?:make\s+)(?:it\s+)?(?:big|bigger|large|larger)\s*$|^(?:enlarge|expand|zoom|maximize)(?:\s+it)?\s*$|^(?:show|open|view)\s+(?:it\s+)?(?:big|bigger|large|larger)\s*$|^\s*(?:big|bigger|large|larger)\s*(?:please)?\s*$/.test(lowerForEnlarge);
        const enlargeImageMatch = fullScreenMatch || enlargeLongMatch || enlargeShortMatch;
        const hasDesignImage = typeof state.lastContext?.lastDesignDataUrl === 'string' && state.lastContext.lastDesignDataUrl.startsWith('data:image/');
        const sidePanelShowingDesign = state.currentSidePanelAction === 'design';
        const hasCreations = CREATIONS_TOOL_ENABLED && getMediaItemsByBucket(MEDIA_BUCKET_CREATED).length > 0;
        const lightboxOpenWithCreation = CREATIONS_TOOL_ENABLED && mediaLightbox?.classList.contains('active') && state.activeMediaBucket === MEDIA_BUCKET_CREATED;
        const canEnlargeDesign = hasDesignImage && (sidePanelShowingDesign || /\b(image|picture|photo|design|creation|drawing)\b/.test(lowerForEnlarge));
        const canEnlargeCreation = (hasCreations || lightboxOpenWithCreation) && (sidePanelShowingDesign || enlargeShortMatch || enlargeLongMatch);
        const normalSizeMatch = /^(?:normal\s+size|shrink|smaller|reset\s+size)(?:\s+please)?\s*$|^\s*(?:back\s+to\s+normal|normal)\s*$/.test(lowerForEnlarge);
        if (!indexedMediaOpenMatch && (enlargeImageMatch || normalSizeMatch) && (canEnlargeDesign || canEnlargeCreation || (normalSizeMatch && state.designPanelZoomed))) {
            face.classList.remove('thinking');
            document.body.classList.add('projecting-visual');
            let msg = '';
            if (normalSizeMatch && state.designPanelZoomed) {
                const sidePanel = document.getElementById('blip-side-panel');
                const panelImg = sidePanel?.querySelector('img');
                if (panelImg) {
                    panelImg.style.transform = '';
                    panelImg.style.transformOrigin = '';
                }
                state.designPanelZoomed = false;
                msg = 'Back to normal size.';
            } else if (normalSizeMatch) {
                msg = 'Already normal size.';
            } else if (fullScreenMatch) {
                let didOpen = false;
                if (hasDesignImage && (sidePanelShowingDesign || !hasCreations)) {
                    openMediaLightbox(state.lastContext.lastDesignDataUrl, null, 'image', MEDIA_BUCKET_CREATED);
                    didOpen = true;
                } else if (hasCreations && !lightboxOpenWithCreation) {
                    didOpen = openLatestMediaByBucket(MEDIA_BUCKET_CREATED);
                }
                msg = didOpen ? 'Full screen.' : 'Already full size.';
            } else if (!normalSizeMatch) {
                const sidePanel = document.getElementById('blip-side-panel');
                const panelImg = sidePanel?.querySelector('img');
                if (panelImg && sidePanelShowingDesign) {
                    if (state.designPanelZoomed) {
                        panelImg.style.transform = '';
                        panelImg.style.transformOrigin = '';
                        state.designPanelZoomed = false;
                        msg = 'Back to normal size.';
                    } else {
                        panelImg.style.transform = 'scale(1.2)';
                        panelImg.style.transformOrigin = 'center';
                        state.designPanelZoomed = true;
                        msg = 'Image 20% bigger.';
                    }
                } else if (hasCreations && !lightboxOpenWithCreation) {
                    const didOpen = openLatestMediaByBucket(MEDIA_BUCKET_CREATED);
                    msg = didOpen ? 'Image enlarged.' : 'No creation to show.';
                } else {
                    msg = lightboxOpenWithCreation ? 'Already full size.' : 'No image to enlarge.';
                }
            }
            transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
            state.history.push({ user: cmd, blip: msg });
            if (state.history.length > HISTORY_MAX) state.history.shift();
            setBlipEmotion('happy');
            setPersona('happy');
            talkBtn.innerText = '🔊 SPEAKING...';
            await speakWithGuard(msg, 'happy');
            return;
        }

        // Voice shortcuts: media gallery controls (open/close).
        // If Creations is the current gallery context, "open 3" means "open creation 3" (not shot 3).
        {
            const lowerQuickOpenRaw = normalizeVoiceTokens(String(cmd || ''));
            const lowerQuickOpen = lowerQuickOpenRaw
                .replace(/^(?:hey\s+)?blip[,\s]+/, '')
                .replace(/^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+)?/, '')
                .trim();
            const explicitCreations = CREATIONS_TOOL_ENABLED && /\bcreations?\b/.test(lowerQuickOpen);
            const explicitMusic = /\b(?:music|songs?|tracks?)\b/.test(lowerQuickOpen) && !explicitCreations;
            const explicitVideos = /\bvideos?\b/.test(lowerQuickOpen) && !explicitCreations;
            const explicitPhotos = /\b(?:photos?|fotos?|pictures?|shots?|snapshots?)\b/.test(lowerQuickOpen) && !explicitCreations && !explicitMusic && !explicitVideos;
            const inCreationsContext = CREATIONS_TOOL_ENABLED && (isCreationsPanelOpen() || (state.isMediaStripOpen && (normalizeMediaLane(state.mediaStripLane) === 'created' || state.activeMediaBucket === MEDIA_BUCKET_CREATED)));
            const inPhotosContext = state.isMediaStripOpen && (normalizeMediaLane(state.mediaStripLane) === 'shots' || state.activeMediaBucket === MEDIA_BUCKET_SHOTS);
            const inMusicContext = state.isMediaStripOpen && normalizeMediaLane(state.mediaStripLane) === 'music';
            const inVideosContext = state.isMediaStripOpen && normalizeMediaLane(state.mediaStripLane) === 'videos';
            const explicitPhotoDigit = lowerQuickOpen.match(/^(?:open|show|view)\s+(?:the\s+)?(?:photo|foto|picture|shot|snapshot)\s+(?:number\s+|#\s*)?(\d{1,3})\b/);
            const explicitPhotoWord = lowerQuickOpen.match(/^(?:open|show|view)\s+(?:the\s+)?(?:photo|foto|picture|shot|snapshot)\s+(?:number\s+)?(one|two|to|too|three|four|for|five|six|seven|eight|nine|ten|eleven|twelve)\b/);
            // Accept: "open 2 in creations", "open #2 creations", "show 3 from creations", etc.
            const quickOpenCreatedDigit = lowerQuickOpen.match(/^(?:open|show|view)\s+(?:number\s+|#\s*)?(\d{1,3})\b(?:\s+(?:in|from)\s+creations?)?\b/);
            const quickOpenCreatedWord = lowerQuickOpen.match(/^(?:open|show|view)\s+(?:number\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b(?:\s+(?:in|from)\s+creations?)?\b/);
            const quickOpenOrdinal = lowerQuickOpen.match(/^(?:open|show|view|play)\s+(?:the\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+(?:one|photo|picture|shot|snapshot|song|track|video)\b(?:\s+(?:in|from)\s+(?:creations?|music|videos?))?\b/);
            const quickOpenGenericDigit = lowerQuickOpen.match(/^(?:open|show|view|play)\s+(?:(?:the\s+)?(?:song|track|video|photo|foto|picture|shot|snapshot|tag)\s+)?(?:(?:number|tag)\s+|#\s*)?(\d{1,3})\b(?:\s+(?:in|from)\s+(creations?|music|songs?|tracks?|videos?|photos?|fotos?|pictures?|shots?|snapshots?))?\b/);
            const quickOpenGenericWord = lowerQuickOpen.match(/^(?:open|show|view|play)\s+(?:(?:the\s+)?(?:song|track|video|photo|foto|picture|shot|snapshot|tag)\s+)?(?:(?:number|tag)\s+)?(one|two|to|too|three|four|for|five|six|seven|eight|nine|ten|eleven|twelve)\b(?:\s+(?:in|from)\s+(creations?|music|songs?|tracks?|videos?|photos?|fotos?|pictures?|shots?|snapshots?))?\b/);
            const quickDeleteGenericDigit = lowerQuickOpen.match(/^(?:delete|remove|erase|trash|clear)\s+(?:(?:the\s+)?(?:song|track|video|photo|foto|picture|shot|snapshot|tag)\s+)?(?:(?:number|tag)\s+|#\s*)?(\d{1,3})\b(?:\s+(?:in|from)\s+(creations?|music|songs?|tracks?|videos?|photos?|fotos?|pictures?|shots?|snapshots?))?\b/);
            const quickDeleteGenericWord = lowerQuickOpen.match(/^(?:delete|remove|erase|trash|clear)\s+(?:(?:the\s+)?(?:song|track|video|photo|foto|picture|shot|snapshot|tag)\s+)?(?:(?:number|tag)\s+)?(one|two|to|too|three|four|for|five|six|seven|eight|nine|ten|eleven|twelve)\b(?:\s+(?:in|from)\s+(creations?|music|songs?|tracks?|videos?|photos?|fotos?|pictures?|shots?|snapshots?))?\b/);
            const wordToNum = { one: 1, two: 2, to: 2, too: 2, three: 3, four: 4, for: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
            const ordinalToNum = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12 };
            const multiDeleteIndexes = getMultiIndexDeleteVoiceCommand(lowerQuickOpen);
            const resolveQuickTargetLane = (hintedLane = '') => {
                const hinted = String(hintedLane || '').trim();
                if (/creation/.test(hinted) || explicitCreations) return 'created';
                if (/video/.test(hinted) || explicitVideos) return 'videos';
                if (/music|song|track/.test(hinted) || explicitMusic) return 'music';
                if (/photo|foto|picture|shot|snapshot/.test(hinted) || explicitPhotos) return 'shots';
                if (inCreationsContext) return 'created';
                if (inVideosContext) return 'videos';
                if (inMusicContext) return 'music';
                return 'shots';
            };
            if (explicitPhotoDigit || explicitPhotoWord) {
                face.classList.remove('thinking');
                const n = explicitPhotoDigit
                    ? Number(explicitPhotoDigit[1])
                    : (wordToNum[explicitPhotoWord?.[1]] || NaN);
                if (Number.isFinite(n) && n > 0) toggleMediaGallery(true, 'shots');
                const ok = Number.isFinite(n) && n > 0 ? openMediaByNumber(n, MEDIA_BUCKET_SHOTS) : false;
                const msg = ok ? `Opening photo ${n}.` : `No photo ${n}.`;
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
                state.history.push({ user: cmd, blip: msg });
                if (state.history.length > HISTORY_MAX) state.history.shift();
                setBlipEmotion(ok ? 'happy' : 'serious');
                setPersona(ok ? 'happy' : 'serious');
                talkBtn.innerText = '🔊 SPEAKING...';
                await speakWithGuard(msg, ok ? 'happy' : 'serious');
                return;
            }
            const quickOpenCreated = quickOpenCreatedDigit || quickOpenCreatedWord;
            if ((explicitCreations || inCreationsContext) && (quickOpenCreated || quickOpenOrdinal)) {
                face.classList.remove('thinking');
                const n = quickOpenCreatedDigit
                    ? Number(quickOpenCreatedDigit[1])
                    : (quickOpenCreatedWord ? (wordToNum[quickOpenCreatedWord?.[1]] || NaN) : (ordinalToNum[quickOpenOrdinal?.[1]] || NaN));
                if (Number.isFinite(n) && n > 0) openCreationsPanel();
                const ok = Number.isFinite(n) && n > 0 ? openMediaByNumber(n, MEDIA_BUCKET_CREATED) : false;
                const msg = ok ? `Opening creation ${n}.` : `No creation ${n}.`;
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
                state.history.push({ user: cmd, blip: msg });
                if (state.history.length > HISTORY_MAX) state.history.shift();
                setBlipEmotion('happy');
                setPersona('happy');
                talkBtn.innerText = '🔊 SPEAKING...';
                await speakWithGuard(msg, 'happy');
                return;
            }

            if ((explicitMusic || inMusicContext || explicitVideos || inVideosContext) && quickOpenOrdinal) {
                face.classList.remove('thinking');
                const n = ordinalToNum[quickOpenOrdinal?.[1]] || NaN;
                const view = explicitVideos || inVideosContext ? 'Videos' : 'Music';
                if (Number.isFinite(n) && n > 0) toggleMediaGallery(true, view === 'Videos' ? 'videos' : 'music');
                const result = Number.isFinite(n) && n > 0 ? playSavedYouTubeItemByNumber(n, view) : { ok: false, message: `No ${view.toLowerCase()} ${n}.` };
                const msg = result.message;
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
                state.history.push({ user: cmd, blip: msg });
                if (state.history.length > HISTORY_MAX) state.history.shift();
                setBlipEmotion(result.ok ? 'happy' : 'serious');
                setPersona(result.ok ? 'happy' : 'serious');
                talkBtn.innerText = '🔊 SPEAKING...';
                await speakWithGuard(msg, result.ok ? 'happy' : 'serious');
                return;
            }

            // Photos context: "open first one" should open photo 1 (and never become calendar day 1).
            if (inPhotosContext && quickOpenOrdinal) {
                face.classList.remove('thinking');
                const n = ordinalToNum[quickOpenOrdinal?.[1]] || NaN;
                if (Number.isFinite(n) && n > 0) toggleMediaGallery(true, 'shots');
                const ok = Number.isFinite(n) && n > 0 ? openMediaByNumber(n, MEDIA_BUCKET_SHOTS) : false;
                const msg = ok ? `Opening photo ${n}.` : `No photo ${n}.`;
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
                state.history.push({ user: cmd, blip: msg });
                if (state.history.length > HISTORY_MAX) state.history.shift();
                setBlipEmotion('happy');
                setPersona('happy');
                talkBtn.innerText = '🔊 SPEAKING...';
                await speakWithGuard(msg, 'happy');
                return;
            }

            const quickOpenGeneric = quickOpenGenericDigit || quickOpenGenericWord;
            if ((explicitPhotos || inPhotosContext || explicitMusic || inMusicContext || explicitVideos || inVideosContext || explicitCreations || inCreationsContext) && quickOpenGeneric) {
                face.classList.remove('thinking');
                const n = quickOpenGenericDigit
                    ? Number(quickOpenGenericDigit[1])
                    : (wordToNum[quickOpenGenericWord?.[1]] || NaN);
                const hintedLane = String(quickOpenGenericDigit?.[2] || quickOpenGenericWord?.[2] || '').trim();
                const targetLane = resolveQuickTargetLane(hintedLane);
                let msg = '';
                let emotion = 'happy';
                if (targetLane === 'created') {
                    if (Number.isFinite(n) && n > 0) openCreationsPanel();
                    const ok = Number.isFinite(n) && n > 0 ? openMediaByNumber(n, MEDIA_BUCKET_CREATED) : false;
                    msg = ok ? `Opening creation ${n}.` : `No creation ${n}.`;
                    emotion = ok ? 'happy' : 'serious';
                } else if (targetLane === 'music' || targetLane === 'videos') {
                    const view = targetLane === 'videos' ? 'Videos' : 'Music';
                    if (Number.isFinite(n) && n > 0) toggleMediaGallery(true, targetLane);
                    const result = Number.isFinite(n) && n > 0 ? playSavedYouTubeItemByNumber(n, view) : { ok: false, message: `No ${view.toLowerCase()} ${n}.` };
                    msg = result.message;
                    emotion = result.ok ? 'happy' : 'serious';
                } else {
                    if (Number.isFinite(n) && n > 0) toggleMediaGallery(true, 'shots');
                    const ok = Number.isFinite(n) && n > 0 ? openMediaByNumber(n, MEDIA_BUCKET_SHOTS) : false;
                    msg = ok ? `Opening photo ${n}.` : `No photo ${n}.`;
                    emotion = ok ? 'happy' : 'serious';
                }
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
                state.history.push({ user: cmd, blip: msg });
                if (state.history.length > HISTORY_MAX) state.history.shift();
                setBlipEmotion(emotion);
                setPersona(emotion);
                talkBtn.innerText = '🔊 SPEAKING...';
                await speakWithGuard(msg, emotion);
                return;
            }

            const quickOpenSavedDigit = lowerQuickOpen.match(/^(?:open|show|view|play)\s+(?:number\s+|#\s*)?(\d{1,3})\b(?:\s+(?:in|from)\s+(music|videos?))?\b/);
            if ((explicitMusic || inMusicContext || explicitVideos || inVideosContext) && quickOpenSavedDigit) {
                face.classList.remove('thinking');
                const n = Number(quickOpenSavedDigit[1]);
                const hinted = quickOpenSavedDigit[2];
                const view = /video/.test(String(hinted || '')) || explicitVideos || inVideosContext ? 'Videos' : 'Music';
                if (Number.isFinite(n) && n > 0) toggleMediaGallery(true, view === 'Videos' ? 'videos' : 'music');
                const result = Number.isFinite(n) && n > 0 ? playSavedYouTubeItemByNumber(n, view) : { ok: false, message: `No ${view.toLowerCase()} ${n}.` };
                const msg = result.message;
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
                state.history.push({ user: cmd, blip: msg });
                if (state.history.length > HISTORY_MAX) state.history.shift();
                setBlipEmotion(result.ok ? 'happy' : 'serious');
                setPersona(result.ok ? 'happy' : 'serious');
                talkBtn.innerText = '🔊 SPEAKING...';
                await speakWithGuard(msg, result.ok ? 'happy' : 'serious');
                return;
            }

            if ((explicitPhotos || inPhotosContext || explicitMusic || inMusicContext || explicitVideos || inVideosContext || explicitCreations || inCreationsContext) && multiDeleteIndexes?.length) {
                face.classList.remove('thinking');
                const targetLane = resolveQuickTargetLane(lowerQuickOpen);
                let result = { ok: false, message: 'No items selected.' };
                if (targetLane === 'created') result = removeMediaByNumbers(multiDeleteIndexes, MEDIA_BUCKET_CREATED);
                else if (targetLane === 'music' || targetLane === 'videos') result = removeSavedYouTubeItemsByNumbers(multiDeleteIndexes, targetLane === 'videos' ? 'Videos' : 'Music');
                else result = removeMediaByNumbers(multiDeleteIndexes, MEDIA_BUCKET_SHOTS);
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${result.message}`;
                state.history.push({ user: cmd, blip: result.message });
                if (state.history.length > HISTORY_MAX) state.history.shift();
                setBlipEmotion(result.ok ? 'happy' : 'serious');
                setPersona(result.ok ? 'happy' : 'serious');
                talkBtn.innerText = '🔊 SPEAKING...';
                await speakWithGuard(result.message, result.ok ? 'happy' : 'serious');
                return;
            }

            const quickDeleteGeneric = quickDeleteGenericDigit || quickDeleteGenericWord;
            if ((explicitPhotos || inPhotosContext || explicitMusic || inMusicContext || explicitVideos || inVideosContext || explicitCreations || inCreationsContext) && quickDeleteGeneric) {
                face.classList.remove('thinking');
                const n = quickDeleteGenericDigit
                    ? Number(quickDeleteGenericDigit[1])
                    : (wordToNum[quickDeleteGenericWord?.[1]] || NaN);
                const hintedLane = String(quickDeleteGenericDigit?.[2] || quickDeleteGenericWord?.[2] || '').trim();
                const targetLane = resolveQuickTargetLane(hintedLane);
                let msg = '';
                let emotion = 'happy';
                if (targetLane === 'created') {
                    const removed = Number.isFinite(n) && n > 0 ? removeMediaByNumber(n, MEDIA_BUCKET_CREATED) : false;
                    msg = removed ? `Removed creation ${n}.` : `No creation ${n}.`;
                    if (removed && isCreationsPanelOpen()) openCreationsPanel(msg);
                    emotion = removed ? 'happy' : 'serious';
                } else if (targetLane === 'music' || targetLane === 'videos') {
                    const view = targetLane === 'videos' ? 'Videos' : 'Music';
                    const result = Number.isFinite(n) && n > 0 ? removeSavedYouTubeItemByNumber(n, view) : { ok: false, message: `No ${view.toLowerCase()} ${n}.` };
                    if (result.ok) toggleMediaGallery(true, targetLane);
                    msg = result.message;
                    emotion = result.ok ? 'happy' : 'serious';
                } else {
                    const removed = Number.isFinite(n) && n > 0 ? removeMediaByNumber(n, MEDIA_BUCKET_SHOTS) : false;
                    msg = removed ? `Removed photo ${n}.` : `No photo ${n}.`;
                    if (removed) toggleMediaGallery(true, 'shots');
                    emotion = removed ? 'happy' : 'serious';
                }
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
                state.history.push({ user: cmd, blip: msg });
                if (state.history.length > HISTORY_MAX) state.history.shift();
                setBlipEmotion(emotion);
                setPersona(emotion);
                talkBtn.innerText = '🔊 SPEAKING...';
                await speakWithGuard(msg, emotion);
                return;
            }
        }

        const mediaUndoCmd = getMediaUndoVoiceCommand(cmd);
        if (mediaUndoCmd === 'undoDelete') {
            face.classList.remove('thinking');
            const result = undoLastMediaRemoval();
            if (result.ok && result.lane) toggleMediaGallery(true, result.lane);
            transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${result.message}`;
            state.history.push({ user: cmd, blip: result.message });
            if (state.history.length > HISTORY_MAX) state.history.shift();
            try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
            setBlipEmotion(result.ok ? 'happy' : 'serious');
            setPersona(result.ok ? 'happy' : 'serious');
            talkBtn.innerText = '🔊 SPEAKING...';
            await speakWithGuard(result.message, result.ok ? 'happy' : 'serious');
            return;
        }
        const mediaCmd = getMediaGalleryVoiceCommand(cmd);
        if (mediaCmd) {
            face.classList.remove('thinking');
            let msg = '';
            const action = typeof mediaCmd === 'string' ? mediaCmd : mediaCmd.action;
            const lowerMediaCmd = normalizeVoiceTokens(String(cmd || ''));
            const wantsCreationsLane = CREATIONS_TOOL_ENABLED && /\bcreations?\b/.test(lowerMediaCmd);
            const wantsMusicLane = /\b(?:music|songs?|tracks?)\b/.test(lowerMediaCmd) && !wantsCreationsLane;
            const wantsVideosLane = /\bvideos?\b/.test(lowerMediaCmd) && !wantsCreationsLane;
            const wantsPhotosLane = /\b(?:photos?|fotos?|pictures?|shots?|snapshots?)\b/.test(lowerMediaCmd) && !wantsCreationsLane && !wantsMusicLane && !wantsVideosLane;
            const currentLane = normalizeMediaLane(state.mediaStripLane);
            const activeSavedView = wantsVideosLane || currentLane === 'videos'
                ? 'Videos'
                : 'Music';
            if (action === 'openLatestVideo') {
                const ok = openLatestVideoClip();
                if (ok) {
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: 'media-lightbox-video',
                        visible: isMediaLightboxActuallyVisible('video'),
                        successMessage: 'Opening latest video clip.'
                    });
                } else {
                    msg = 'No video clip yet.';
                }
            } else if (action === 'openLatestMedia') {
                const latest = getLatestMediaItemByBucket(MEDIA_BUCKET_SHOTS);
                const ok = openLatestMediaByBucket(MEDIA_BUCKET_SHOTS);
                if (!ok || !latest) {
                    msg = 'No media yet.';
                } else {
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: latest.kind === 'video' ? 'media-lightbox-video' : 'media-lightbox-image',
                        visible: isMediaLightboxActuallyVisible(latest.kind === 'video' ? 'video' : 'image'),
                        successMessage: latest.kind === 'video' ? 'Opening latest video clip.' : 'Opening latest shot.'
                    });
                }
            } else if (action === 'open') {
                if (mediaLightbox?.classList.contains('active')) closeMediaLightbox();
                if (wantsCreationsLane) {
                    openCreationsPanel();
                    const creationCount = getMediaItemsByBucket(MEDIA_BUCKET_CREATED).length;
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: 'creations-panel',
                        visible: isSidePanelActuallyVisible('creations'),
                        successMessage: creationCount > 0
                            ? `Creations open. ${creationCount} item${creationCount === 1 ? '' : 's'}.`
                            : 'Creations open. Empty.'
                    });
                    transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
                    state.history.push({ user: cmd, blip: msg });
                    if (state.history.length > HISTORY_MAX) state.history.shift();
                    try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
                    setBlipEmotion('happy');
                    setPersona('happy');
                    talkBtn.innerText = '🔊 SPEAKING...';
                    await speakWithGuard(msg, 'happy');
                    return;
                }
                const lane = wantsCreationsLane
                    ? 'created'
                    : wantsMusicLane
                        ? 'music'
                        : wantsVideosLane
                            ? 'videos'
                            : wantsPhotosLane
                                ? 'shots'
                                : 'all';
                toggleMediaGallery(true, lane);
                const count = wantsCreationsLane
                    ? getMediaItemsByBucket(MEDIA_BUCKET_CREATED).length
                    : wantsMusicLane
                        ? getYouTubeLibraryItems('Music').length
                        : wantsVideosLane
                            ? getYouTubeLibraryItems('Videos').length
                            : wantsPhotosLane
                                ? getMediaItemsByBucket(MEDIA_BUCKET_SHOTS).length
                            : getMediaItemsByBucket(MEDIA_BUCKET_SHOTS).length + getYouTubeLibraryItems('Music').length + getYouTubeLibraryItems('Videos').length;
                if (wantsCreationsLane) {
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: 'creations-panel',
                        visible: isSidePanelActuallyVisible('creations'),
                        successMessage: count > 0
                            ? `Creations open. ${count} item${count === 1 ? '' : 's'}.`
                            : 'Creations open. Empty.'
                    });
                } else if (wantsMusicLane) {
                    setYouTubeLibraryView('Music');
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: 'media-strip',
                        visible: isMediaStripActuallyVisible(),
                        successMessage: count > 0 ? `Music open. ${count} saved item${count === 1 ? '' : 's'}.` : 'Music open. Empty.',
                        details: { lane: 'music' }
                    });
                } else if (wantsVideosLane) {
                    setYouTubeLibraryView('Videos');
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: 'media-strip',
                        visible: isMediaStripActuallyVisible(),
                        successMessage: count > 0 ? `Videos open. ${count} saved item${count === 1 ? '' : 's'}.` : 'Videos open. Empty.',
                        details: { lane: 'videos' }
                    });
                } else if (wantsPhotosLane) {
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: 'media-strip',
                        visible: isMediaStripActuallyVisible(),
                        successMessage: count > 0 ? `Photos open. ${count} item${count === 1 ? '' : 's'}.` : 'Photos open. Empty.',
                        details: { lane: 'shots' }
                    });
                } else {
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: 'media-strip',
                        visible: isMediaStripActuallyVisible(),
                        successMessage: count > 0 ? `Media open. ${count} saved item${count === 1 ? '' : 's'}.` : 'Media open. Empty.',
                        details: { lane: 'all' }
                    });
                }
            } else if (action === 'openRecordings') {
                if (openLatestVideoClip()) {
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: 'media-lightbox-video',
                        visible: isMediaLightboxActuallyVisible('video'),
                        successMessage: 'Opening latest recording.'
                    });
                } else {
                    toggleMediaGallery(true, 'shots');
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: 'media-strip',
                        visible: isMediaStripActuallyVisible(),
                        successMessage: 'No recordings yet. Photos open.',
                        failureMessage: 'No recordings yet, and the photos window did not appear.'
                    });
                }
            } else if (action === 'mediaCloseImage') {
                if (mediaLightbox?.classList.contains('active')) {
                    msg = closeMediaLightboxAndVerify(cmd)
                        ? 'Picture closed.'
                        : 'I tried to close the picture, but it stayed open.';
                } else {
                    toggleMediaGallery(false);
                    msg = 'Photos closed.';
                }
            } else if (action === 'close') {
                if (wantsCreationsLane && isCreationsPanelOpen()) {
                    closeSidePanel();
                    msg = 'Creations closed.';
                    transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
                    state.history.push({ user: cmd, blip: msg });
                    if (state.history.length > HISTORY_MAX) state.history.shift();
                    try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
                    setBlipEmotion('happy');
                    setPersona('happy');
                    talkBtn.innerText = '🔊 SPEAKING...';
                    await speakWithGuard(msg, 'happy');
                    return;
                }
                toggleMediaGallery(false);
                msg = wantsCreationsLane
                    ? 'Creations closed.'
                    : wantsMusicLane || currentLane === 'music'
                        ? 'Music closed.'
                        : wantsVideosLane || currentLane === 'videos'
                            ? 'Videos closed.'
                            : 'Photos closed.';
            } else if (action === 'openLatestImage') {
                const bucket = wantsCreationsLane ? MEDIA_BUCKET_CREATED : MEDIA_BUCKET_SHOTS;
                const ok = openLatestImageByBucket(bucket);
                if (!ok) {
                    msg = wantsCreationsLane ? 'No creations yet.' : 'No picture yet.';
                } else {
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: wantsCreationsLane ? 'creation-lightbox' : 'media-lightbox-image',
                        visible: isMediaLightboxActuallyVisible('image'),
                        successMessage: wantsCreationsLane ? 'Opening latest creation.' : 'Opening latest picture.'
                    });
                }
            } else if (action === 'expandLatest') {
                const bucket = wantsCreationsLane ? MEDIA_BUCKET_CREATED : MEDIA_BUCKET_SHOTS;
                const ok = openLatestMediaByBucket(bucket);
                if (!ok) {
                    msg = wantsCreationsLane ? 'No creations yet.' : 'No snapshot yet.';
                } else {
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: wantsCreationsLane ? 'creation-lightbox' : 'media-lightbox',
                        visible: isMediaLightboxActuallyVisible(),
                        successMessage: wantsCreationsLane ? 'Opening latest creation.' : 'Opening latest shot.'
                    });
                }
            } else if (action === 'openMatch') {
                const ok = openMediaById(mediaCmd.id);
                msg = ok
                    ? getVerifiedOpenMessage({
                        cmd,
                        target: 'media-lightbox',
                        visible: isMediaLightboxActuallyVisible(),
                        successMessage: `Opening ${mediaCmd.title || 'photo'}.`,
                        details: { mediaId: mediaCmd.id }
                    })
                    : `I couldn't find that photo yet.`;
            } else if (action === 'openIndex') {
                const n = Number(mediaCmd.index);
                if (wantsMusicLane || wantsVideosLane || currentLane === 'music' || currentLane === 'videos') {
                    const result = playSavedYouTubeItemByNumber(n, activeSavedView);
                    msg = result.ok
                        ? getVerifiedOpenMessage({
                            cmd,
                            target: 'youtube-panel',
                            visible: isYouTubePanelActuallyVisible(),
                            successMessage: result.message,
                            details: { index: n, view: activeSavedView }
                        })
                        : result.message;
                } else {
                    const bucket = wantsCreationsLane ? MEDIA_BUCKET_CREATED : MEDIA_BUCKET_SHOTS;
                    const ok = openMediaByNumber(n, bucket);
                    if (wantsCreationsLane) {
                        msg = ok
                            ? getVerifiedOpenMessage({
                                cmd,
                                target: 'creation-lightbox',
                                visible: isMediaLightboxActuallyVisible(),
                                successMessage: `Opening creation ${n}.`,
                                details: { index: n, bucket: 'created' }
                            })
                            : `No creation ${n}.`;
                    } else {
                        msg = ok
                            ? getVerifiedOpenMessage({
                                cmd,
                                target: 'media-lightbox',
                                visible: isMediaLightboxActuallyVisible(),
                                successMessage: `Opening shot ${n}.`,
                                details: { index: n, bucket: 'shots' }
                            })
                            : `No shot ${n}.`;
                    }
                }
            } else if (action === 'deleteLatest') {
                if (wantsMusicLane || wantsVideosLane || currentLane === 'music' || currentLane === 'videos') {
                    const items = getSavedYouTubeItemsByView(activeSavedView);
                    const result = items.length ? removeSavedYouTubeItemByNumber(1, activeSavedView) : { ok: false, message: `No ${activeSavedView.toLowerCase()} yet.` };
                    msg = result.message;
                } else {
                    const latest = getLatestMediaItemByBucket(MEDIA_BUCKET_SHOTS);
                    const removed = removeLatestMediaByBucket(MEDIA_BUCKET_SHOTS);
                    if (!removed || !latest) {
                        msg = 'No media yet.';
                    } else {
                        msg = latest.kind === 'video' ? 'Removed latest video clip.' : 'Removed latest shot.';
                    }
                }
            } else if (action === 'deleteCurrent') {
                if (wantsMusicLane || wantsVideosLane || currentLane === 'music' || currentLane === 'videos') {
                    const currentIndex = Math.max(0, Number(state.youtubeLibraryBrowseIndex) || 0) + 1;
                    const result = removeSavedYouTubeItemByNumber(currentIndex, activeSavedView);
                    msg = result.message;
                } else {
                    const removedCurrent = removeActiveMediaByBucket(MEDIA_BUCKET_SHOTS);
                    if (removedCurrent) {
                        msg = removedCurrent.kind === 'video' ? 'Removed current video clip.' : 'Removed current shot.';
                    } else {
                        const latest = getLatestMediaItemByBucket(MEDIA_BUCKET_SHOTS);
                        const removedLatest = removeLatestMediaByBucket(MEDIA_BUCKET_SHOTS);
                        if (!removedLatest || !latest) {
                            msg = 'No media yet.';
                        } else {
                            msg = latest.kind === 'video' ? 'Removed latest video clip.' : 'Removed latest shot.';
                        }
                    }
                }
            } else if (action === 'deleteIndex') {
                const n = Number(mediaCmd.index);
                if (wantsMusicLane || wantsVideosLane || currentLane === 'music' || currentLane === 'videos') {
                    const result = removeSavedYouTubeItemByNumber(n, activeSavedView);
                    msg = result.message;
                } else {
                    const removed = removeMediaByNumber(n, MEDIA_BUCKET_SHOTS);
                    msg = removed ? `Removed shot ${n}.` : `No shot ${n}.`;
                }
            } else if (action === 'deleteMatch') {
                const removed = removeMediaById(mediaCmd.id);
                msg = removed ? `Removed ${mediaCmd.title || 'photo'}.` : `I couldn't find that photo yet.`;
            } else if (action === 'rotateCurrentImage') {
                const ok = await rotateActiveMediaImage(Number(mediaCmd.delta) || 90);
                msg = ok ? 'Photo corrected.' : 'Open a picture first.';
            } else if (action === 'adjustCurrentImageBrightness') {
                const level = await adjustActiveMediaBrightness(Number(mediaCmd.delta) || 0.35);
                msg = level ? `Photo brightness ${Math.round(level * 100)}%.` : 'Open a picture first.';
            } else if (action === 'undoCurrentImageEdits') {
                const ok = undoActiveMediaEdits();
                msg = ok ? 'Last photo edit undone.' : 'Nothing to undo.';
            } else if (action === 'resetCurrentImageEdits') {
                const ok = resetActiveMediaEdits();
                msg = ok ? 'Photo reset to original.' : 'No original photo to restore.';
            } else if (action === 'cropCurrentImageUnsupported') {
                msg = 'Crop is not wired yet. I can rotate or brighten the current photo.';
            } else if (action === 'shareCurrentImage') {
                const result = await shareActiveMediaImage();
                msg = result.message;
            } else if (action === 'downloadCurrentImage') {
                const result = await downloadActiveMediaImage();
                msg = result.message;
            } else if (action === 'wallpaperCurrentImage') {
                const result = await setActiveMediaImageAsWallpaper();
                msg = result.message;
            } else if (action === 'clear') {
                if (wantsMusicLane || wantsVideosLane || currentLane === 'music' || currentLane === 'videos') {
                    const result = clearSavedYouTubeItems(activeSavedView);
                    msg = result.message;
                } else {
                    const removedCount = clearMediaByBucket(MEDIA_BUCKET_SHOTS);
                    msg = removedCount ? `Cleared media. Removed ${removedCount} item${removedCount === 1 ? '' : 's'}.` : 'No media to clear.';
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
                await speakWithGuard(msg, 'happy');
                return;
            }
        }

        const unnamedMediaReferenceReply = getUnnamedMediaReferenceVoiceReply(cmd);
        if (unnamedMediaReferenceReply) {
            face.classList.remove('thinking');
            await quickReply(unnamedMediaReferenceReply, 'happy');
            return;
        }

        const directWeatherSceneDemo = getDirectWeatherSceneDemo(cmd);
        if (directWeatherSceneDemo) {
            face.classList.remove('thinking');
            stopWeatherSceneShowcase({ restoreIdle: false });
            setWeatherScene(directWeatherSceneDemo, { subtle: false });
            await quickReply(`${toTitleWords(directWeatherSceneDemo)} weather loaded.`, 'happy');
            return;
        }

        const weatherSceneShowcaseCmd = getWeatherSceneShowcaseCommand(cmd);
        if (weatherSceneShowcaseCmd === 'start') {
            face.classList.remove('thinking');
            startWeatherSceneShowcase();
            await quickReply('Showing all weather animations.', 'happy');
            return;
        }
        if (weatherSceneShowcaseCmd === 'stop') {
            face.classList.remove('thinking');
            stopWeatherSceneShowcase({ restoreIdle: true });
            await quickReply('Weather animation showcase stopped.', 'happy');
            return;
        }

        const directWeatherLocation = getDirectWeatherVoiceLocation(cmd);
        if (directWeatherLocation) {
            face.classList.remove('thinking');
            stopWeatherSceneShowcase({ restoreIdle: false });
            const result = await actionHandlers.weather({ text: '', tool_params: { location: directWeatherLocation } }, state);
            await quickReply(result?.text || `Weather for ${directWeatherLocation}.`, 'happy', result?.extraHtml || '');
            return;
        }
        if (isGenericWeatherVoiceRequest(cmd)) {
            face.classList.remove('thinking');
            stopWeatherSceneShowcase({ restoreIdle: false });
            const weatherLocation = getIdleWeatherLocation();
            if (!weatherLocation) {
                await quickReply('Set an idle weather location in Settings first.', 'happy');
                return;
            }
            const result = await actionHandlers.weather({ text: '', tool_params: { location: weatherLocation } }, state);
            await quickReply(result?.text || `Weather for ${weatherLocation}.`, 'happy', result?.extraHtml || '');
            return;
        }

        if (isDirectTimeVoiceRequest(cmd)) {
            face.classList.remove('thinking');
            const result = await actionHandlers.time({ text: '', tool_params: {} }, state);
            await quickReply(result?.text || 'Here is the time.', 'happy', result?.extraHtml || '');
            return;
        }

        if (isDirectDateVoiceRequest(cmd)) {
            face.classList.remove('thinking');
            const today = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });
            await quickReply(`Today is ${today}.`, 'happy');
            return;
        }

        if (isBrainResetVoiceRequest(cmd)) {
            face.classList.remove('thinking');
            resetBlipConversationMemory();
            await quickReply('Brain refreshed. English mode back on.', 'happy');
            return;
        }

        const directProductQuery = getDirectProductVoiceQuery(cmd);
        if (directProductQuery) {
            face.classList.remove('thinking');
            const retailer = isAmazonOnlyProductRequest(cmd) ? 'Amazon' : '';
            const result = await actionHandlers.products({ text: '', tool_params: { query: directProductQuery, recommendations: [], retailer } }, state);
            renderActionInSidePanel({
                action: 'products',
                tool_params: { query: directProductQuery, links: result?.links || [], previewDataUrl: result?.previewDataUrl || '' },
                text: result?.text || `Looking up ${directProductQuery}.`
            });
            await quickReply(result?.text || `Looking up ${directProductQuery}.`, 'happy', result?.extraHtml || '');
            return;
        }

        const calendarAgendaRequest = getCalendarAgendaVoiceRequest(cmd);
        if (calendarAgendaRequest) {
            face.classList.remove('thinking');
            try {
                const result = await forceOpenCalendarOverview(calendarAgendaRequest);
                await passiveReply('', 'happy', result?.extraHtml || '');
            } catch (error) {
                console.warn('Calendar overview failed:', error?.message || error);
                await quickReply(error?.message || 'Could not show your calendar right now.', 'sad');
            }
            return;
        }

        // Direct image generation: "make an image of X", "generate an image of that".
        const directMakeImage = getDirectMakeImageRequest(cmd, state.lastContext?.lastSearchTopic || '');
        if (directMakeImage) {
            face.classList.remove('thinking');
            setPersona('thinking');
            renderActionInSidePanel({
                action: 'design',
                tool_params: { prompt: directMakeImage.imagePrompt },
                text: 'Generating image…'
            });
            document.body.classList.add('projecting-visual');
            try {
                // Solar system with names: use structured SVG so planet names are always crisp.
                let dataUrl = '';
                let source = state.imageEngine === 'comfyui' ? 'comfyui' : 'image';
                if (shouldUseStructuredSpaceDiagram(directMakeImage.imagePrompt)) {
                    const structured = await generateDesignDataUrl(directMakeImage.imagePrompt);
                    dataUrl = structured?.dataUrl || '';
                    source = structured?.source || 'blip structured solar system';
                }
                if (!dataUrl) {
                    const image = await generateImage(
                        directMakeImage.imagePrompt,
                        state.geminiKey,
                        { model: state.imageModel, timeoutMs: 120000, imageEngine: state.imageEngine, comfyuiBaseUrl: state.comfyuiBaseUrl, comfyuiCheckpoint: state.comfyuiCheckpoint }
                    );
                    dataUrl = image?.dataUrl || '';
                    source = image?.source || source;
                }
                state.lastContext.lastDesignDataUrl = dataUrl || '';
                if (dataUrl) {
                    renderActionInSidePanel({
                        action: 'design',
                        tool_params: {
                            dataUrl,
                            source,
                            prompt: directMakeImage.imagePrompt
                        },
                        text: 'Image ready.'
                    });
                    document.body.classList.add('projecting-visual');
                    await quickReply('Image ready.', 'happy');
                    return;
                }
                renderActionInSidePanel({
                    action: 'design',
                    tool_params: { prompt: directMakeImage.imagePrompt },
                    text: 'No image was returned.'
                });
                await quickReply('I could not generate that image.', 'sad');
                return;
            } catch (error) {
                console.warn('Direct image generation failed:', error?.message || error);
                renderActionInSidePanel({
                    action: 'design',
                    tool_params: { prompt: directMakeImage.imagePrompt },
                    text: `Image failed: ${String(error?.message || 'Unknown error').slice(0, 200)}`
                });
                await quickReply(error?.message || 'Image generation failed.', 'sad');
                return;
            }
        }

        // Direct multimodal explain + image flow: "show me how a volcano erupts".
        let visualExplain = getDirectVisualExplainRequest(cmd);
        if (!visualExplain) {
            const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
            const wantsContextImage = /^(?:please\s+)?(?:can\s+you\s+)?(?:create|make|generate|draw|illustrate)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture|illustration|diagram)\s+(?:of|for)\s+(?:it|this|that)\b/.test(lower);
            const topic = sanitizeVoiceQuery(state.lastContext?.lastSearchTopic || '');
            if (wantsContextImage && topic) {
                visualExplain = {
                    topic,
                    userText: `Explain ${topic}`,
                    explanationPrompt: `Explain ${topic}`,
                    imagePrompt: `Educational illustration of ${topic}. Clean infographic style, labeled parts if relevant, high contrast, easy to understand.`
                };
            }
        }
        if (visualExplain) {
            face.classList.remove('thinking');
            setPersona('thinking');
            if (visualExplain.topic) {
                state.lastContext.lastSearchTopic = visualExplain.topic;
                state.lastContext.lastOpenableUrl = `https://www.google.com/search?q=${encodeURIComponent(visualExplain.topic)}`;
            }
            const result = await explainWithImage({
                userText: visualExplain.userText,
                apiKey: state.geminiKey,
                textModel: state.selectedModel,
                imagePrompt: visualExplain.imagePrompt,
                explanationPrompt: visualExplain.explanationPrompt,
                imageOptions: { model: state.imageModel, imageEngine: state.imageEngine, comfyuiBaseUrl: state.comfyuiBaseUrl, comfyuiCheckpoint: state.comfyuiCheckpoint },
            });
            state.lastContext.lastDesignDataUrl = result?.image?.dataUrl || '';
            if (result?.image?.dataUrl) {
                renderActionInSidePanel({
                    action: 'design',
                    tool_params: {
                        dataUrl: result.image.dataUrl,
                        source: 'gemini image',
                        prompt: visualExplain.imagePrompt || visualExplain.userText || ''
                    },
                    text: result?.text || 'Visual ready.'
                });
            }
            const visualReply = result?.partialFailure?.imageFailed
                ? mergeTextParts(result?.text || 'Explanation ready.', 'The image part failed, but the explanation is ready.')
                : (result?.text || 'Visual ready.');
            await quickReply(visualReply, 'happy');
            return;
        }

        if (isReturnToCalendarVoiceRequest(cmd)) {
            face.classList.remove('thinking');
            try {
                const result = await forceOpenCalendarOverview(state.activeCalendarViewRequest || { label: 'upcoming', view: 'week' });
                await passiveReply('', 'happy', result?.extraHtml || '');
            } catch (error) {
                console.warn('Return to calendar failed:', error?.message || error);
                await quickReply(error?.message || 'Could not return to the calendar right now.', 'sad');
            }
            return;
        }

        const calendarFocusDayRequest = getCalendarFocusDayVoiceRequest(cmd);
        if (calendarFocusDayRequest) {
            face.classList.remove('thinking');
            try {
                const result = await focusCalendarDaySelection(calendarFocusDayRequest.dayNumber, {
                    toggle: false,
                    anchorDate: calendarFocusDayRequest.anchorDate
                });
                const overview = await refreshOpenCalendarPanel();
                await passiveReply('', result.ok ? 'happy' : 'thinking', overview?.extraHtml || '');
            } catch (error) {
                console.warn('Calendar day focus failed:', error?.message || error);
                await quickReply(error?.message || 'Could not focus that day in your calendar.', 'sad');
            }
            return;
        }

        const calendarTimeSlotRequest = getCalendarTimeSlotVoiceRequest(cmd);
        if (calendarTimeSlotRequest) {
            face.classList.remove('thinking');
            try {
                const result = await focusCalendarHourSelection(calendarTimeSlotRequest.hour);
                const overview = await refreshOpenCalendarPanel();
                await passiveReply(result.text, result.ok ? 'happy' : 'thinking', overview?.extraHtml || '');
            } catch (error) {
                console.warn('Calendar time slot focus failed:', error?.message || error);
                await quickReply(error?.message || 'Could not focus that time slot in your calendar.', 'sad');
            }
            return;
        }

        if (isCloseCalendarVoiceRequest(cmd)) {
            face.classList.remove('thinking');
            if (closeCalendarPanel()) {
                await quickReply('Calendar closed.', 'happy');
            } else {
                await quickReply('Calendar is already closed.', 'happy');
            }
            return;
        }

        const calendarDeleteRequest = getCalendarDeleteVoiceRequest(cmd);
        if (calendarDeleteRequest) {
            face.classList.remove('thinking');
            try {
                const result = await deleteCalendarEventByTitle(calendarDeleteRequest.titleQuery);
                const overview = await refreshOpenCalendarPanel();
                await quickReply(result.text, result.ok ? 'happy' : 'thinking', overview?.extraHtml || '');
            } catch (error) {
                console.warn('Calendar delete failed:', error?.message || error);
                await quickReply(error?.message || 'Could not delete that calendar event.', 'sad');
            }
            return;
        }

        const calendarBulkDeleteRequest = getCalendarBulkDeleteVoiceRequest(cmd);
        if (calendarBulkDeleteRequest) {
            face.classList.remove('thinking');
            try {
                const result = await deleteCalendarEventsInRange(calendarBulkDeleteRequest);
                const overview = await refreshOpenCalendarPanel();
                await quickReply(result.text, result.ok ? 'happy' : 'thinking', overview?.extraHtml || '');
            } catch (error) {
                console.warn('Calendar bulk delete failed:', error?.message || error);
                await quickReply(error?.message || 'Could not erase those calendar events.', 'sad');
            }
            return;
        }

        const calendarMoveRequest = getCalendarMoveVoiceRequest(cmd);
        if (calendarMoveRequest) {
            face.classList.remove('thinking');
            if (calendarMoveRequest.needsScheduleInfo) {
                await quickReply(calendarMoveRequest.message, 'happy');
                return;
            }
            try {
                const result = await moveCalendarEventByTitle(calendarMoveRequest.titleQuery, calendarMoveRequest.startDate);
                const overview = await refreshOpenCalendarPanel();
                await quickReply(result.text, result.ok ? 'happy' : 'thinking', overview?.extraHtml || '');
            } catch (error) {
                console.warn('Calendar move failed:', error?.message || error);
                await quickReply(error?.message || 'Could not move that calendar event.', 'sad');
            }
            return;
        }

        const calendarMoveDayRequest = getCalendarMoveDayVoiceRequest(cmd);
        if (calendarMoveDayRequest) {
            face.classList.remove('thinking');
            try {
                const result = await moveCalendarEventsToOtherDay(calendarMoveDayRequest);
                const overview = await refreshOpenCalendarPanel();
                await quickReply(result.text, result.ok ? 'happy' : 'thinking', overview?.extraHtml || '');
            } catch (error) {
                console.warn('Calendar day move failed:', error?.message || error);
                await quickReply(error?.message || 'Could not move those events to the new day.', 'sad');
            }
            return;
        }

        const calendarSyncRequest = getCalendarSyncVoiceRequest(cmd);
        if (calendarSyncRequest) {
            face.classList.remove('thinking');
            try {
                const syncResult = await syncCalendars(calendarSyncRequest.direction);
                const overview = await showCalendarOverview({ label: 'upcoming' });
                const reply = [syncResult?.text, overview?.text]
                    .filter(Boolean)
                    .join(' ');
                await quickReply(reply, syncResult?.ok ? 'happy' : 'thinking', overview?.extraHtml || '');
            } catch (error) {
                console.warn('Calendar sync failed:', error?.message || error);
                await quickReply(error?.message || 'Could not sync calendars right now.', 'sad');
            }
            return;
        }

        if (isOpenGoogleCalendarVoiceRequest(cmd)) {
            face.classList.remove('thinking');
            const calendarUrl = openGoogleCalendarHome();
            await quickReply('Opening Google Calendar in a new tab.', 'happy', `<br><a href="${calendarUrl}" target="_blank" class="action-link blue">📅 OPEN GOOGLE CALENDAR</a>`);
            return;
        }

        const pendingCalendarFollowUp = resolvePendingCalendarFollowUp(cmd);
        if (pendingCalendarFollowUp) {
            face.classList.remove('thinking');
            if (pendingCalendarFollowUp.cancelled) {
                await quickReply(pendingCalendarFollowUp.message, 'happy');
                return;
            }
            if (pendingCalendarFollowUp.needsScheduleInfo) {
                if (pendingCalendarFollowUp.focusDayNumber) {
                    try {
                        await focusCalendarDaySelection(pendingCalendarFollowUp.focusDayNumber, {
                            toggle: false,
                            anchorDate: pendingCalendarFollowUp.focusAnchorDate
                        });
                    } catch (error) {
                        console.warn('Calendar follow-up day focus failed:', error?.message || error);
                    }
                }
                const overview = await refreshOpenCalendarPanel();
                await quickReply(pendingCalendarFollowUp.message, 'happy', overview?.extraHtml || '');
                return;
            }

            const result = await actionHandlers.calendar({ text: '', event_details: pendingCalendarFollowUp.event_details, tool_params: {} }, state);
                const overview = await refreshOpenCalendarPanel() || await forceOpenCalendarOverview({
                    label: 'event day',
                    view: 'month',
                    anchorDate: pendingCalendarFollowUp.event_details?.start,
                    selectedDate: formatCalendarDateKey(pendingCalendarFollowUp.event_details?.start || new Date())
                }).catch(() => null);
            const reply = pendingCalendarFollowUp.completionMessage
                ? mergeTextParts(result?.text || 'Event added.', pendingCalendarFollowUp.completionMessage)
                : (result?.text || 'Event added.');
            await quickReply(reply, 'happy', overview?.extraHtml || result?.extraHtml || '');
            return;
        }

        const pendingProfileFollowUp = resolvePendingProfileFollowUp(cmd);
        if (pendingProfileFollowUp) {
            face.classList.remove('thinking');
            if (pendingProfileFollowUp.cancelled) {
                await quickReply(pendingProfileFollowUp.message, 'happy');
                return;
            }
            await quickReply(pendingProfileFollowUp.message, 'happy');
            return;
        }

        const calendarCmd = getDirectCalendarVoiceRequest(cmd);
        if (calendarCmd) {
            face.classList.remove('thinking');
            if (calendarCmd.needsScheduleInfo) {
                state.pendingCalendarDraft = calendarCmd.pendingDraft || null;
                if (calendarCmd.focusDayNumber) {
                    try {
                        await focusCalendarDaySelection(calendarCmd.focusDayNumber, {
                            toggle: false,
                            anchorDate: calendarCmd.focusAnchorDate
                        });
                    } catch (error) {
                        console.warn('Calendar day focus before event creation failed:', error?.message || error);
                    }
                }
                const overview = await refreshOpenCalendarPanel();
                await quickReply(calendarCmd.message, 'happy', overview?.extraHtml || '');
                return;
            }
            state.pendingCalendarDraft = null;
            const result = await actionHandlers.calendar({ text: '', event_details: calendarCmd.event_details, tool_params: {} }, state);
            const overview = await refreshOpenCalendarPanel() || await forceOpenCalendarOverview({
                label: 'event day',
                view: 'month',
                anchorDate: calendarCmd.event_details?.start,
                selectedDate: formatCalendarDateKey(calendarCmd.event_details?.start || new Date())
            }).catch(() => null);
            await quickReply(result?.text || 'Calendar event ready.', 'happy', overview?.extraHtml || result?.extraHtml || '');
            return;
        }

        const pendingNotesFollowUp = resolvePendingNotesFollowUp(cmd);
        if (pendingNotesFollowUp) {
            face.classList.remove('thinking');
            if (pendingNotesFollowUp.cancelled) {
                syncNotesPanelIfVisible(pendingNotesFollowUp.message);
                await quickReply(pendingNotesFollowUp.message, 'happy');
                return;
            }
        if (pendingNotesFollowUp.completed) {
            const finalDraft = pendingNotesFollowUp.draft;
            const saved = addNoteItem(buildSavedNoteContent(finalDraft), {
                source: 'notes-draft',
                noteType: finalDraft.noteType,
                title: finalDraft.title,
                items: finalDraft.items,
                bodyText: String(finalDraft.bodyText || '').trim()
            });
            const hasBodyText = !!String(finalDraft.bodyText || '').trim();
            const spokenItems = formatSpokenList(finalDraft.items);
            const message = saved
                ? (hasBodyText
                    ? 'Note saved. You can say send this note to email it.'
                    : `Okay, I saved the ${finalDraft.noteType} called ${finalDraft.title} with ${spokenItems}.`)
                : 'I could not save that note.';
            syncNotesPanelIfVisible(message, hasBodyText ? String(finalDraft.bodyText || '') : '');
            await quickReply(message, 'happy');
            return;
        }
            syncNotesPanelIfVisible(pendingNotesFollowUp.message);
            await quickReply(pendingNotesFollowUp.message, 'happy');
            return;
        }

        // Unified panel navigation: picture/video/graph/map.
        const panelCmd = getPanelNavigationVoiceCommand(cmd);
        if (panelCmd) {
            face.classList.remove('thinking');
            let msg = '';
            if (panelCmd === 'mediaNext') {
                const ok = openMediaRelative(1);
                const bucket = state.activeMediaBucket;
                const laneItems = getMediaItemsByBucket(bucket);
                const currentInLane = laneItems.findIndex((item) => item?.id === state.mediaItems[state.activeMediaIndex]?.id);
                const num = currentInLane >= 0 ? currentInLane + 1 : state.activeMediaIndex + 1;
                const label = bucket === MEDIA_BUCKET_CREATED ? 'Creation' : 'Shot';
                msg = ok ? `${label} ${num}.` : (bucket === MEDIA_BUCKET_CREATED ? 'No next creation.' : 'No next shot.');
            } else if (panelCmd === 'mediaPrev') {
                const ok = openMediaRelative(-1);
                const bucket = state.activeMediaBucket;
                const laneItems = getMediaItemsByBucket(bucket);
                const currentInLane = laneItems.findIndex((item) => item?.id === state.mediaItems[state.activeMediaIndex]?.id);
                const num = currentInLane >= 0 ? currentInLane + 1 : state.activeMediaIndex + 1;
                const label = bucket === MEDIA_BUCKET_CREATED ? 'Creation' : 'Shot';
                msg = ok ? `${label} ${num}.` : (bucket === MEDIA_BUCKET_CREATED ? 'No previous creation.' : 'No previous shot.');
            } else if (panelCmd === 'mediaOpenCurrentImage') {
                if (canOpenCurrentCreationFromPanel()) {
                    const ok = openCurrentCreationView();
                    msg = ok
                        ? getVerifiedOpenMessage({
                            cmd,
                            target: 'creation-lightbox',
                            visible: isMediaLightboxActuallyVisible('image'),
                            successMessage: 'Opening current creation.'
                        })
                        : 'No creation yet.';
                } else if (mediaLightbox?.classList.contains('active')) {
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: 'media-lightbox-image',
                        visible: isMediaLightboxActuallyVisible('image'),
                        successMessage: 'Picture open.'
                    });
                } else if (state.activeMediaBucket === MEDIA_BUCKET_CREATED) {
                    const ok = openLatestMediaByBucket(MEDIA_BUCKET_CREATED);
                    msg = ok
                        ? getVerifiedOpenMessage({
                            cmd,
                            target: 'creation-lightbox',
                            visible: isMediaLightboxActuallyVisible(),
                            successMessage: 'Opening latest creation.'
                        })
                        : 'No creation yet.';
                } else {
                    const ok = openLatestImageByBucket(MEDIA_BUCKET_SHOTS);
                    msg = ok
                        ? getVerifiedOpenMessage({
                            cmd,
                            target: 'media-lightbox-image',
                            visible: isMediaLightboxActuallyVisible('image'),
                            successMessage: 'Opening latest picture.'
                        })
                        : 'No picture yet.';
                }
            } else if (panelCmd === 'mediaOpenCurrentVideo') {
                if (mediaLightbox?.classList.contains('active') && mediaLightboxVideo?.style.display !== 'none' && mediaLightboxVideo?.src) {
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: 'media-lightbox-video',
                        visible: isMediaLightboxActuallyVisible('video'),
                        successMessage: 'Video clip open.'
                    });
                } else {
                    const ok = openLatestVideoClip();
                    msg = ok
                        ? getVerifiedOpenMessage({
                            cmd,
                            target: 'media-lightbox-video',
                            visible: isMediaLightboxActuallyVisible('video'),
                            successMessage: 'Opening latest video clip.'
                        })
                        : 'No video clip yet.';
                }
            } else if (panelCmd === 'mediaCloseImage') {
                if (mediaLightbox?.classList.contains('active')) {
                    msg = closeMediaLightboxAndVerify(cmd)
                        ? 'Picture closed.'
                        : 'I tried to close the picture, but it stayed open.';
                } else {
                    msg = 'No picture open.';
                }
            } else if (panelCmd === 'mediaBack') {
                closeMediaLightboxAndVerify(cmd);
                const lane = state.activeMediaBucket === MEDIA_BUCKET_CREATED ? 'created' : 'shots';
                toggleMediaGallery(true, lane);
                msg = getVerifiedOpenMessage({
                    cmd,
                    target: 'media-strip',
                    visible: isMediaStripActuallyVisible(),
                    successMessage: 'Gallery open.',
                    details: { lane }
                });
            } else if (panelCmd === 'openVideo') {
                const ok = openLastVideoPanel();
                msg = ok
                    ? getVerifiedOpenMessage({
                        cmd,
                        target: 'youtube-panel',
                        visible: isYouTubePanelActuallyVisible(),
                        successMessage: 'Video open.'
                    })
                    : 'No video yet.';
            } else if (panelCmd === 'closeVideo') {
                if (isVideoPanelVisible()) {
                    closeYouTubePanel();
                    msg = 'Video closed.';
                } else {
                    msg = 'No video open.';
                }
            } else if (panelCmd === 'openChart') {
                const chartData = state.lastContext.lastChartData;
                if (chartData?.labels?.length && chartData?.data?.length) {
                    setMode('chart');
                    renderChart(chartData.labels, chartData.data, chartData.title || 'Data Graph', chartData.type || 'bar');
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: 'chart',
                        visible: isChartActuallyVisible(),
                        successMessage: 'Graph open.'
                    });
                } else {
                    msg = 'No graph yet.';
                }
            } else if (panelCmd === 'closeChart') {
                if (state.currentMode === 'chart') {
                    setMode('core');
                    msg = 'Graph closed.';
                } else {
                    msg = 'No graph open.';
                }
            } else if (panelCmd === 'openMap') {
                if (mapFrame?.src) {
                    setMode('map');
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: 'map',
                        visible: isMapActuallyVisible(),
                        successMessage: 'Map open.'
                    });
                } else if (state.lastContext.lastLocation) {
                    mapFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(state.lastContext.lastLocation)}&output=embed`;
                    setMode('map');
                    msg = getVerifiedOpenMessage({
                        cmd,
                        target: 'map',
                        visible: isMapActuallyVisible(),
                        successMessage: 'Map open.'
                    });
                } else {
                    msg = 'No map yet.';
                }
            } else if (panelCmd === 'closeMap') {
                if (state.currentMode === 'map') {
                    setMode('core');
                    msg = 'Map closed.';
                } else {
                    msg = 'No map open.';
                }
            } else if (panelCmd === 'openCalendar') {
                try {
                    const overview = await refreshOpenCalendarPanel() || await forceOpenCalendarOverview({
                        label: 'upcoming',
                        view: 'month',
                        anchorDate: state.calendarAnchorDate || new Date().toISOString()
                    });
                    if (!isCalendarPanelActuallyVisible()) {
                        const calendarMsg = getVerifiedOpenMessage({
                            cmd,
                            target: 'calendar',
                            visible: false,
                            successMessage: 'Blip Calendar open.'
                        });
                        await quickReply(calendarMsg, 'serious');
                        return;
                    }
                    await passiveReply('', 'happy', overview?.extraHtml || '');
                    return;
                } catch (error) {
                    console.warn('Calendar open fallback failed:', error?.message || error);
                    msg = error?.message || 'Could not open the calendar right now.';
                }
            } else if (panelCmd === 'closeCalendar') {
                if (closeCalendarPanel()) {
                    msg = 'Calendar closed.';
                } else {
                    msg = 'No calendar open.';
                }
            } else if (panelCmd === 'closePanel') {
                const closed = closeCurrentPanel();
                const closeMap = {
                    picture: 'Picture closed.',
                    gallery: 'Gallery closed.',
                    graph: 'Graph closed.',
                    map: 'Map closed.',
                    video: 'Video closed.',
                    calendar: 'Calendar closed.',
                    panel: 'Panel closed.'
                };
                msg = closed ? closeMap[closed] || 'Closed.' : 'Nothing open.';
            }

            if (msg) {
                transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
                state.history.push({ user: cmd, blip: msg });
                if (state.history.length > HISTORY_MAX) state.history.shift();
                try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
                setBlipEmotion('happy');
                setPersona('happy');
                talkBtn.innerText = '🔊 SPEAKING...';
                await speakWithGuard(msg, 'happy');
                return;
            }
        }

        // Voice shortcut: generate design/drawing as an image panel, then user can say "save to creations".
        if (isDesignRequest(cmd)) {
            face.classList.remove('thinking');
            setPersona('thinking');
            const designPrompt = buildDesignPromptFromCommand(cmd);
            const visual = await generateDesignDataUrl(designPrompt);
            const realisticVisual = isSpaceDesignPrompt(designPrompt) || isRealisticDesignPrompt(designPrompt);
            closeAuxiliaryPanelsForDesign();
            state.lastContext.lastDesignDataUrl = visual?.dataUrl || '';
            state.lastContext.lastDesignPrompt = designPrompt;
            renderActionInSidePanel({
                action: 'design',
                tool_params: {
                    dataUrl: visual?.dataUrl || '',
                    source: visual?.source || 'design',
                    prompt: designPrompt
                },
                text: realisticVisual ? 'Image ready.' : 'Design ready.'
            });
            const msg = realisticVisual
                ? 'Image ready. Say "save to media" if you like it.'
                : 'Design ready. Say "save to media" if you like it.';
            transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
            state.history.push({ user: cmd, blip: msg });
            if (state.history.length > HISTORY_MAX) state.history.shift();
            try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
            setBlipEmotion('happy');
            setPersona('happy');
            talkBtn.innerText = '🔊 SPEAKING...';
            await speakWithGuard(msg, 'happy');
            return;
        }

        // Voice shortcuts: YouTube library browsing.
        const ytLibraryBrowseCmd = getYouTubeLibraryBrowseVoiceCommand(cmd);
        if (ytLibraryBrowseCmd) {
            face.classList.remove('thinking');
            const result = browseYouTubeLibrary(ytLibraryBrowseCmd === 'previous' ? -1 : 1);
            const msg = result.message;
            transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
            state.history.push({ user: cmd, blip: msg });
            if (state.history.length > HISTORY_MAX) state.history.shift();
            try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
            setBlipEmotion('happy');
            setPersona('happy');
            talkBtn.innerText = '🔊 SPEAKING...';
            await speakWithGuard(msg, 'happy');
            return;
        }

        const ytTransferRequest = extractYouTubeLibraryTransferRequestFromVoice(cmd);
        if (ytTransferRequest) {
            face.classList.remove('thinking');
            const result = moveSavedYouTubeItemToPlaylist(ytTransferRequest);
            if (result.ok) {
                if (isYouTubeLibraryOnlyPanelOpen()) {
                    renderActionInSidePanel({
                        action: 'youtube',
                        tool_params: { query: state.youtubeLibraryView, libraryOnly: true },
                        text: 'YouTube library.'
                    });
                }
                if (state.currentSidePanelAction === 'youtube' && !isYouTubeLibraryOnlyPanelOpen()) {
                    renderActionInSidePanel({
                        action: 'youtube',
                        tool_params: {
                            videoId: state.lastContext?.lastYoutubeVideoId || null,
                            query: state.lastContext?.lastYoutubeQuery || getCurrentYouTubeTitle(),
                            focusedPlayer: true,
                            mediaView: state.youtubeLibraryView
                        },
                        text: `Playing ${state.lastContext?.lastYoutubeQuery || getCurrentYouTubeTitle()}.`
                    });
                }
            }
            const msg = result.message;
            transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
            state.history.push({ user: cmd, blip: msg });
            if (state.history.length > HISTORY_MAX) state.history.shift();
            try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
            setBlipEmotion(result.ok ? 'happy' : 'serious');
            setPersona(result.ok ? 'happy' : 'serious');
            talkBtn.innerText = '🔊 SPEAKING...';
            await speakWithGuard(msg, result.ok ? 'happy' : 'serious');
            return;
        }

        const ytDeleteTarget = getYouTubeLibraryDeleteVoiceCommand(cmd);
        if (ytDeleteTarget) {
            face.classList.remove('thinking');
            const activeView = getActiveSavedYouTubeViewForVoice();
            const result = deleteSavedYouTubeItemByTitle(ytDeleteTarget, activeView);
            if (result.ok) {
                if (isYouTubeLibraryOnlyPanelOpen()) {
                    renderActionInSidePanel({
                        action: 'youtube',
                        tool_params: { query: activeView, libraryOnly: true },
                        text: 'YouTube library.'
                    });
                }
                if (state.isMediaStripOpen) renderMediaGallery();
            }
            const msg = result.message;
            transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
            state.history.push({ user: cmd, blip: msg });
            if (state.history.length > HISTORY_MAX) state.history.shift();
            try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
            setBlipEmotion(result.ok ? 'happy' : 'serious');
            setPersona(result.ok ? 'happy' : 'serious');
            talkBtn.innerText = '🔊 SPEAKING...';
            await speakWithGuard(msg, result.ok ? 'happy' : 'serious');
            return;
        }

        // Voice shortcuts: YouTube panel controls (unmute, mute, close, pause, play, rewind, next, new video)
        if (await handleYouTubeVoiceShortcut(ytCmd)) {
            return;
        }

        // Voice shortcut: volume control.
        // Generic "volume up/down" controls Blip speech.
        // Explicit "video/youtube/player volume" controls the active YouTube player.
        // While a YouTube player is open, short phrases like "lower it" default to the video (unless user says "blip volume").
        const ytVolSet = getYouTubeVolumeSetCommand(cmd);
        const volCmd = getVolumeVoiceCommand(cmd);
        if (ytVolSet != null || volCmd) {
            face.classList.remove('thinking');
            let msg = '';
            const lowerCmdForVolume = normalizeVoiceTokens(cmd);
            const explicitVideoVolume = /\b(video|youtube|yt|player)\b/.test(lowerCmdForVolume);
            const explicitBlipVolume = /\b(blip|assistant|voice)\b/.test(lowerCmdForVolume) && /\b(volume|vol|sound)\b/.test(lowerCmdForVolume);
            const canAdjustVisibleVideo = isSidePanelVisible() && !!blipYtPlayer;

            const shortAmbiguous = /^(please\s+)?(lower|lower it|turn it down|quieter|softer|louder|raise it|turn it up|higher)(\s+please)?$/.test(lowerCmdForVolume);
            const preferVideoForAmbiguous = canAdjustVisibleVideo && shortAmbiguous && !explicitBlipVolume;

            let ytVolume = null;
            if (canAdjustVisibleVideo && ytVolSet != null) {
                ytVolume = setYouTubeVolume(ytVolSet);
            } else if (canAdjustVisibleVideo && (explicitVideoVolume || preferVideoForAmbiguous) && volCmd) {
                const ytDelta = volCmd === 'down' ? -15 : 10;
                ytVolume = adjustYouTubeVolume(ytDelta);
            }

            if (ytVolume != null) {
                msg = `YouTube volume ${ytVolume}%.`;
            } else if ((explicitVideoVolume || ytVolSet != null) && !explicitBlipVolume) {
                msg = "Can't change video volume now.";
            } else if (volCmd) {
                if (volCmd === 'down') state.speechVolume = Math.max(0.2, state.speechVolume - 0.25);
                else state.speechVolume = Math.min(1, state.speechVolume + 0.05);
                state.speechVolume = Math.round(state.speechVolume * 100) / 100;
                if (speechVolumeInput) speechVolumeInput.value = Math.round(state.speechVolume * 100);
                if (speechVolumeValue) speechVolumeValue.textContent = Math.round(state.speechVolume * 100) + '%';
                try { localStorage.setItem('blip_speech_volume', String(state.speechVolume)); } catch (e) { }
                msg = `Volume ${Math.round(state.speechVolume * 100)}%.`;
            } else {
                msg = "I didn't catch the volume.";
            }

            transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
            state.history.push({ user: cmd, blip: msg });
            if (state.history.length > HISTORY_MAX) state.history.shift();
            try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
            setBlipEmotion('happy');
            setPersona('happy');
            talkBtn.innerText = '🔊 SPEAKING...';
            await speakWithGuard(msg, 'happy');
            return;
        }

        // Voice shortcut: "show me the video" / "play the video" → reopen last YouTube in-panel
        if (wantsToSeeLastVideo(cmd) && state.lastContext.lastYoutubeUrl) {
            face.classList.remove('thinking');
            const opened = openLastVideoPanel();
            const msg = opened
                ? getVerifiedOpenMessage({
                    cmd,
                    target: 'youtube-panel',
                    visible: isYouTubePanelActuallyVisible(),
                    successMessage: 'Opening video.'
                })
                : 'No video yet.';
            transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${msg}`;
            state.history.push({ user: cmd, blip: msg });
            if (state.history.length > HISTORY_MAX) state.history.shift();
            try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(-HISTORY_PERSIST_MAX))); } catch (e) { }
            setBlipEmotion('happy');
            setPersona('happy');
            talkBtn.innerText = '🔊 SPEAKING...';
            await speakWithGuard(msg, 'happy');
            return;
        }

        const reasoningContext = {
            message: cmd,
            history: state.history,
            images,
            apiKey: state.geminiKey,
            model: state.selectedModel,
            mode: '',
            lastMode: state.currentMode,
            recentReminders: (state.timers || []).slice(0, 4).map((timer) => ({
                label: timer?.label || '',
                targetAt: timer?.targetAt || ''
            })),
            recentTasks: (state.history || []).slice(-4).map((entry) => ({
                user: entry?.user || '',
                blip: entry?.blip || ''
            })),
            preferences: {
                idleWeatherLocation: state.idleWeatherLocation || '',
                lastWeatherLocation: state.lastContext?.lastWeatherLocation || '',
                voiceEngine: state.voiceEngine || ''
            }
        };
        const reasoningRoute = classifyReasoningMode(cmd, reasoningContext);
        console.info(`[Blip Reasoning] brain=${reasoningRoute.mode} reason=${reasoningRoute.reason}`);

        if (reasoningRoute.mode === 'fast') {
            const fastResponse = await runFastReasoning(cmd, {
                ...reasoningContext,
                mode: reasoningRoute.audienceMode,
                reason: reasoningRoute.reason
            });
            await executeStructuredAssistantResponse(fastResponse, reasoningRoute);
            return;
        }

        const deepReasoning = await runDeepReasoning(cmd, {
            ...reasoningContext,
            mode: reasoningRoute.audienceMode,
            reason: reasoningRoute.reason
        });
        console.info(`[Blip Reasoning] deep-plan=${deepReasoning.internalPlan.join(' -> ')}`);

        // Optional: keyword-based reasoning loop for audience/demographic/behavior/market questions
        const lowerInput = (cmd || "").toLowerCase();
        const useReasoningLoop =
            deepReasoning.reasonCodes?.includes('market_research') ||
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

                const displayTextRaw = typeof answer === "string" ? answer : (answer?.text || JSON.stringify(answer, null, 2));
                const displayText = toCompactReply(displayTextRaw, BLIP_REPLY_MAX_WORDS);
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
        const deepReasoningBlock = `Reasoning mode: deep.
Chosen because: ${deepReasoning.reason}.
Internal plan:
- ${deepReasoning.internalPlan.join('\n- ')}
Audience guidance: ${deepReasoning.audiencePrompt}
Preferred tools: ${deepReasoning.preferredActions.join(', ') || 'chat'}.

`;
        const reviewedRequest = deepReasoning.reviewedMessage || cmd;
        const intentPrompt = `${contextBlock}${deepReasoningBlock}You are the Intent Interpreter.
Analyze the user's latest request: "${reviewedRequest}".
Use the context above and conversation history so that "another graph", "that place", "same" etc. refer to the last topic (e.g. same city, same chart subject).

Return a simple JSON object: {
  "actions": ["search", "youtube", "map", "chart", "calendar", "weather", "time", "products", "timer", "chat", "none"],
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
        if (Array.isArray(deepReasoning.preferredActions) && deepReasoning.preferredActions.length) {
            intent.actions = [...new Set([...deepReasoning.preferredActions, ...intent.actions])];
        }
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
        const isRecipeFlow =
            isRecipeRequest(cmd) ||
            isRecipeRequest(intent.query) ||
            (Array.isArray(intent.actions) && intent.actions.includes('nutrition'));

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
Deep reasoning review:
- Original request: "${cmd}"
- Reviewed request: "${deepReasoning.reviewedMessage || cmd}"
- Why deep brain was chosen: ${deepReasoning.reason}
- Internal plan:
- ${deepReasoning.internalPlan.join('\n- ')}
- Audience guidance: ${deepReasoning.audiencePrompt}

User Request: "${deepReasoning.reviewedMessage || cmd}"

Research Evidence (this is what you found — bring it into your answer):
"""
${evidence.substring(0, 4000)}
"""

Guide your reply by these values when relevant: ${valuesLine}. Be clear and kind.

TASK: Reply with one ultra-short CONCLUSION (single sentence, max 16 words) with key facts only. Keep it direct. Avoid filler.

Return JSON: { "conclusion": "Short main answer with facts/numbers.", "explanation": "Optional 1–2 sentences.", "chart": { ... } only if user asked for a graph and you have numbers. }

RULES:
1. "conclusion" must contain concrete information (numbers, names, facts) from evidence, in one sentence.
2. Leave "explanation" empty unless user explicitly asks for details.
3. CHARTS: If user asked for a graph and evidence has numbers, add "chart": { "title": "...", "labels": ["Women","Men"], "data": [52, 48], "type": "bar" or "pie" }.
4. If evidence is unrelated, reply naturally — and for simple factual questions (e.g. "capital of X", "when did Y", basic geography or history), you may answer from general knowledge; do not say you don't have that information.
5. NEVER say you don't have the information when the Research Evidence above contains relevant data. If the user said "look for it" or "find it", the system has already run a search — use the evidence.
6. If the audience guidance says kids or senior, simplify the wording while staying accurate.
7. Make the conclusion easy to speak aloud: short words, short clauses, no report tone, no URLs.
8. Do not expose internal plans or chain-of-thought. Give only the final answer.
PERSONA: Calm, warm, quietly curious, and practical.`;

        let synthesisResponse = { emotion: 'happy', text: '' };
        let synthData = null;
        let finalReply = '';
        let finalReplyPlain = '';

        if (isRecipeFlow) {
            finalReplyPlain = await generateRecipeForChat(cmd, intent.query || cmd, evidence);
            finalReply = escapeHtml(finalReplyPlain).replace(/\n/g, '<br>');
            synthesisResponse = { emotion: 'happy', text: finalReplyPlain };
            setBlipEmotion('happy');
        } else {
            synthesisResponse = await askGemini(synthesisPrompt, state.history, images, state.geminiKey, state.selectedModel);
            setBlipEmotion(synthesisResponse.emotion);
            synthData = extractJSON(synthesisResponse.rawResponse);
            let conclusion = synthData?.conclusion || synthData?.text || synthesisResponse.text;
            if (typeof conclusion === 'string' && conclusion.trim().startsWith('{')) {
                const parsedConclusion = extractJSON(conclusion);
                if (parsedConclusion?.text) conclusion = parsedConclusion.text;
                else if (parsedConclusion?.conclusion) conclusion = parsedConclusion.conclusion;
            }
            const compactConclusion = sanitizeBlipReplyText(toCompactReply(conclusion, BLIP_REPLY_MAX_WORDS));
            finalReply = compactConclusion;
            finalReplyPlain = compactConclusion;
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
            const request = buildMapRequest(intent.query, intent.location || '');
            const opened = request ? openMapRequest(request) : { ok: false };
            mapQueryUsed = opened.ok ? opened.label : (intent.query || '');
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

        // Bring findings into main UI only when there is real evidence (not placeholder/noise text).
        const evidenceForUi = String(evidence || '')
            .replace(/\bundefined\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        const noDataEvidenceRe = /^no special data (found|was pulled for this search)\b/i;
        const hasRealEvidence = !!evidenceForUi && !noDataEvidenceRe.test(evidenceForUi);
        const findingsSnippet = hasRealEvidence
            ? evidenceForUi.slice(0, 140).replace(/\s+\S*$/, '') + (evidenceForUi.length > 140 ? '…' : '')
            : '';
        const safeSnippet = findingsSnippet && !/^undefined\s*$/i.test(findingsSnippet.trim()) ? findingsSnippet : '';
        const findingsBlock = (!isRecipeFlow && safeSnippet)
            ? `<div class="blip-findings" aria-label="What I found">📋 <strong>What I found:</strong> ${escapeHtml(safeSnippet)}</div>`
            : '';

        if (isRecipeFlow) {
            const recipeSnapshotText = finalReplyPlain || [finalReplyPlain, safeSnippet].filter(Boolean).join('. ');
            state.lastContext.lastRecipeQuery = intent.query || cmd;
            state.lastContext.lastRecipeText = recipeSnapshotText || finalReplyPlain || state.lastContext.lastRecipeText || '';
        }

        // Render transcript (answer + findings in main UI + link as extra)
        transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${finalReply}${findingsBlock}${extraHtml}`;

        // Side panel: show chart, youtube, or calendar when relevant
        if (chartData && chartData.labels && chartData.data) {
            renderActionInSidePanel({ action: 'chart', tool_params: chartData, text: finalReplyPlain });
        } else if (intent.actions && intent.actions.includes('youtube')) {
            const requestedLibraryView = resolveRequestedYouTubeLibraryView(intent.query || '', cmd, finalReplyPlain);
            if (requestedLibraryView) {
                openSavedMediaLane(requestedLibraryView);
            } else {
                const ytUrl = state.lastContext.lastYoutubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(intent.query || cmd)}`;
                const embedUrl = state.lastContext.lastYoutubeEmbedUrl || null;
                const videoId = state.lastContext.lastYoutubeVideoId || null;
                const searchResults = state.lastContext.lastYoutubeSearchResults || null;
                renderActionInSidePanel({ action: 'youtube', tool_params: { query: intent.query || cmd, url: ytUrl, embedUrl, videoId, searchResults }, text: finalReplyPlain });
            }
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
        if (/\b(show results|open google|search on google|click(?:\s+on)?\s+(?:the\s+)?search\s+google|click\s+google|i\s+(?:do\s*not|don't|dont)\s+see\s+(?:the\s+)?results?)\b/.test(cmd.toLowerCase())) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = extraHtml;
            const firstLink = tempDiv.querySelector('a')?.href;
            if (firstLink) {
                console.log('🚀 Auto-opening search result:', firstLink);
                window.open(firstLink, '_blank');
            }
        }

        talkBtn.innerText = '🔊 SPEAKING...';
        const speechReply = toSpokenReply(finalReplyPlain, isRecipeFlow ? 20 : 22);
        await speak(speechReply || finalReplyPlain, isRecipeFlow ? 'happy' : 'serious');
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
        face.classList.remove('thinking');
        talkBtn.classList.remove('thinking');
        if (state.isActive) {
            startListeningLoop();
        } else {
            talkBtn.classList.remove('listening', 'active');
            talkBtn.innerText = 'Ask Blip';
        }
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
    const allowShortConfirm = state.pendingYouTubeAction === 'unmute' || isYouTubePanelActuallyVisible();
    return /\bun\s*-?\s*mute\b/.test(lower) ||
        /\bturn\s+on\s+(the\s+)?sound\b/.test(lower) ||
        /\b(enable|turn\s+on)\s+audio\b/.test(lower) ||
        /\b(with\s+)?sound\s+on\b/.test(lower) ||
        /\b(sound|audio)\s+on\b/.test(lower) ||
        (allowShortConfirm && /^(ok|yes|play)\s*$/.test(lower));
}

/** Unmute the current YouTube panel player via IFrame API. */
function unmuteYouTubePlayer() {
    // Preferred path: IFrame API player (works reliably when available).
    if (blipYtPlayer && typeof blipYtPlayer.unMute === 'function') {
        try {
            const wasPlaying = getYouTubePlayerState() === 1;
            // Some browsers/policies are finicky; do a short "retry burst".
            const attempt = () => {
                try { if (typeof blipYtPlayer.setVolume === 'function') blipYtPlayer.setVolume(100); } catch (_) {}
                try { blipYtPlayer.unMute(); } catch (_) {}
            };
            const restorePlaybackIfNeeded = () => {
                if (!wasPlaying || !blipYtPlayer || typeof blipYtPlayer.playVideo !== 'function') return;
                try {
                    if (getYouTubePlayerState() === 2) blipYtPlayer.playVideo();
                } catch (_) { }
            };
            attempt();
            setTimeout(restorePlaybackIfNeeded, 60);
            setTimeout(attempt, 180);
            setTimeout(restorePlaybackIfNeeded, 240);
            setTimeout(attempt, 520);
            setTimeout(restorePlaybackIfNeeded, 580);
            return true;
        } catch (e) {
            console.warn('YouTube unmute failed:', e.message);
        }
    }

    // Fallback path: plain iframe embed (no JS API). We can only toggle by rewriting the src.
    const mount = document.getElementById('blip-yt-player');
    const iframe = mount?.querySelector?.('iframe');
    const src = String(iframe?.getAttribute?.('src') || '');
    if (!iframe || !src) return false;
    try {
        const url = new URL(src, window.location.origin);
        url.searchParams.set('mute', '0');
        url.searchParams.set('autoplay', '1');
        iframe.setAttribute('src', url.toString());
        return true;
    } catch (e) {
        return false;
    }
}

function isYouTubePlayerMuted() {
    if (blipYtPlayer && typeof blipYtPlayer.isMuted === 'function') {
        try {
            return !!blipYtPlayer.isMuted();
        } catch (_) { }
    }
    const mount = document.getElementById('blip-yt-player');
    const iframe = mount?.querySelector?.('iframe');
    const src = String(iframe?.getAttribute?.('src') || '');
    if (!src) return null;
    try {
        const url = new URL(src, window.location.origin);
        const muteValue = url.searchParams.get('mute');
        if (muteValue == null) return null;
        return muteValue !== '0';
    } catch (_) {
        return null;
    }
}

/** Mute the current YouTube panel player. */
function muteYouTubePlayer() {
    if (blipYtPlayer && typeof blipYtPlayer.mute === 'function') {
        try { blipYtPlayer.mute(); return true; } catch (e) { console.warn('YouTube mute failed:', e.message); }
    }
    const mount = document.getElementById('blip-yt-player');
    const iframe = mount?.querySelector?.('iframe');
    const src = String(iframe?.getAttribute?.('src') || '');
    if (!iframe || !src) return false;
    try {
        const url = new URL(src, window.location.origin);
        url.searchParams.set('mute', '1');
        iframe.setAttribute('src', url.toString());
        return true;
    } catch (e) {
        return false;
    }
}

function runYouTubeAction(action) {
    switch (action) {
        case 'stop':
            stopYouTubePlayer();
            return true;
        case 'rewind':
            rewindYouTubePlayer();
            return true;
        case 'forward':
            forwardYouTubePlayer();
            return true;
        case 'pause':
            pauseYouTubePlayer();
            return true;
        case 'unmute':
            return !!unmuteYouTubePlayer();
        case 'mute':
            return !!muteYouTubePlayer();
        case 'play':
            playYouTubePlayer();
            return true;
        case 'restart':
            restartYouTubePlayer();
            return true;
        case 'next':
            return nextYouTubeVideo();
        default:
            return false;
    }
}

function getYouTubeActionMessage(action, ok = true) {
    if (!ok) {
        if (action === 'next') return 'No next video.';
        return 'No active video.';
    }
    switch (action) {
        case 'stop': return 'Stopped.';
        case 'rewind': return 'Back 30s.';
        case 'forward': return 'Forward 30s.';
        case 'pause': return 'Paused.';
        case 'unmute': return 'Sound on!';
        case 'mute': return 'Muted.';
        case 'play': return 'Playing.';
        case 'restart': return 'Restarted.';
        case 'next': return 'Next video.';
        default: return 'Done.';
    }
}

/** Close the YouTube side panel and destroy the player. */
function closeYouTubePanel() {
    const sidePanel = document.getElementById('blip-side-panel');
    stopAutoScroll();
    state.youtubeLibraryBrowseIndex = 0;
    state.pendingYouTubeAction = null;
    if (blipYtPlayer) {
        try {
            if (typeof blipYtPlayer.pauseVideo === 'function') blipYtPlayer.pauseVideo();
        } catch (_) { }
    }
    if (sidePanel) {
        sidePanel.innerHTML = '';
        sidePanel.style.display = 'none';
        applyDefaultSidePanelLayout(sidePanel);
        clearSidePanelContext();
    }
    if (blipYtPlayer && typeof blipYtPlayer.destroy === 'function') {
        try { blipYtPlayer.destroy(); } catch (e) {}
        blipYtPlayer = null;
    }
    state.videoBigMode = false;
    syncScenerySuppression();
}

function closeAuxiliaryPanelsForGallery() {
    closeSettingsPanel();
    if (hubContainer) hubContainer.style.display = 'none';
    if (cartContainer) cartContainer.style.display = 'none';
    if (mapContainer) {
        mapContainer.classList.remove('active');
        mapContainer.style.display = 'none';
    }
    if (chartContainer) {
        chartContainer.classList.remove('active', 'reveal');
        chartContainer.style.display = 'none';
    }
    const sidePanel = document.getElementById('blip-side-panel');
    if (sidePanel?.classList.contains('blip-calendar-orb') && sidePanel.style.display !== 'none') {
        sidePanel.style.display = 'none';
        sidePanel.innerHTML = '';
        sidePanel.classList.remove('blip-calendar-orb');
        clearSidePanelContext();
    } else if (isSidePanelVisible()) {
        closeYouTubePanel();
    }
    state.currentMode = 'core';
    document.body.setAttribute('data-mode', 'core');
}

function closeAuxiliaryPanelsForCalendar() {
    closeSettingsPanel();
    if (hubContainer) hubContainer.style.display = 'none';
    if (cartContainer) cartContainer.style.display = 'none';
    if (mediaLightbox?.classList.contains('active')) closeMediaLightbox();
    if (state.isMediaStripOpen) toggleMediaGallery(false);
    if (mapContainer) {
        mapContainer.classList.remove('active');
        mapContainer.style.display = 'none';
    }
    if (chartContainer) {
        chartContainer.classList.remove('active', 'reveal');
        chartContainer.style.display = 'none';
    }
    state.currentMode = 'core';
    document.body.setAttribute('data-mode', 'core');
}

function closeCalendarPanel() {
    const sidePanel = document.getElementById('blip-side-panel');
    state.activeCalendarViewRequest = null;
    if (!sidePanel || sidePanel.style.display === 'none') return false;
    if (!sidePanel.classList.contains('blip-calendar-orb')) return false;
    sidePanel.innerHTML = '';
    sidePanel.style.display = 'none';
    sidePanel.classList.remove('blip-calendar-orb', 'blip-side-panel-centered');
    sidePanel.style.top = '120px';
    sidePanel.style.left = 'auto';
    sidePanel.style.right = '32px';
    sidePanel.style.transform = 'none';
    sidePanel.style.width = '280px';
    sidePanel.style.height = '340px';
    sidePanel.style.padding = '12px';
    sidePanel.style.borderRadius = '12px';
    sidePanel.style.overflow = 'auto';
    sidePanel.style.background = 'rgba(10, 10, 30, 0.96)';
    sidePanel.style.border = '1px solid rgba(99, 102, 241, 0.4)';
    sidePanel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    clearSidePanelContext();
    return true;
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

/** Forward the current video (ahead 30 seconds). */
function forwardYouTubePlayer() {
    if (!blipYtPlayer || typeof blipYtPlayer.getCurrentTime !== 'function' || typeof blipYtPlayer.seekTo !== 'function') return;
    try {
        const t = Number(blipYtPlayer.getCurrentTime()) || 0;
        let next = t + 30;
        if (typeof blipYtPlayer.getDuration === 'function') {
            const duration = Number(blipYtPlayer.getDuration()) || 0;
            if (duration > 0) next = Math.min(duration - 1, next);
        }
        blipYtPlayer.seekTo(Math.max(0, next), true);
    } catch (e) { console.warn('YouTube forward failed:', e.message); }
}

/** Stop playback and reset to start without closing the panel. */
function stopYouTubePlayer() {
    if (!blipYtPlayer) return;
    try {
        if (typeof blipYtPlayer.pauseVideo === 'function') blipYtPlayer.pauseVideo();
        if (typeof blipYtPlayer.seekTo === 'function') blipYtPlayer.seekTo(0, true);
    } catch (e) { console.warn('YouTube stop failed:', e.message); }
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

/**
 * Extract a valid YouTube video ID from a raw id, URL, or free text containing one.
 */
function extractYouTubeVideoId(value) {
    if (!value || typeof value !== 'string') return null;
    const text = value.trim();
    if (!text) return null;

    if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;

    const patterns = [
        /(?:youtube\.com\/watch\?[^#\n\r]*v=)([a-zA-Z0-9_-]{11})/i,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i,
        /\b([a-zA-Z0-9_-]{11})\b/
    ];
    for (const re of patterns) {
        const match = text.match(re);
        if (match && match[1]) return match[1];
    }
    return null;
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

/** Toggle or set big-video mode: video expands while controls stay in a side rail. */
function setVideoBigMode(big) {
    const sidePanel = document.getElementById('blip-side-panel');
    const miniWrap = sidePanel?.querySelector('.blip-mini-wrap');
    const ytLayout = sidePanel?.querySelector('.blip-yt-layout');
    const ytVideo = sidePanel?.querySelector('.blip-yt-video');
    const ytSide = sidePanel?.querySelector('.blip-yt-side');
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
        if (ytLayout) ytLayout.style.gap = '14px';
        if (ytVideo) ytVideo.style.minWidth = '0';
        if (ytSide) ytSide.style.width = 'min(360px, 30vw)';
        if (ytPlayer) {
            ytPlayer.style.height = '100%';
            ytPlayer.style.minHeight = '420px';
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
        sidePanel.style.width = 'min(1120px, calc(100vw - 40px))';
        sidePanel.style.height = 'min(760px, calc(100vh - 52px))';
        sidePanel.style.maxHeight = 'none';
        sidePanel.style.top = '50%';
        sidePanel.style.left = '50%';
        sidePanel.style.right = 'auto';
        sidePanel.style.transform = 'translate(-50%, -50%)';
        sidePanel.style.padding = '14px 14px 10px';
        if (ytLayout) ytLayout.style.gap = '';
        if (ytVideo) ytVideo.style.minWidth = '';
        if (ytSide) ytSide.style.width = '';
        miniWrap.style.width = '';
        miniWrap.style.minWidth = '';
        if (ytPlayer) {
            ytPlayer.style.height = '';
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
    const shouldAnimateScenery = !!state.isActive && !state.softSleepMode;
    const shouldSuppress = !!(state.videoBigMode && state.videoCompanionSize === 'big');
    document.body.classList.toggle('scenery-suppressed', shouldSuppress);
    document.querySelectorAll('.scenery-object').forEach((obj) => {
        const isDecor = obj.dataset.sceneryKind === 'decor';
        obj.classList.toggle('active', !shouldSuppress && (isDecor || shouldAnimateScenery));
    });
    syncIdleAmbience();
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

/** Normalize common speech-to-text command mistakes before intent parsing. */
function normalizeVoiceTokens(cmd) {
    if (!cmd || typeof cmd !== 'string') return '';
    return cmd
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        // Some STT engines append filler like "obey command" / "voice command".
        .replace(/\b(?:obey|a\s*bay|obeying)\s+command\b/g, '')
        .replace(/\b(?:voice\s+)?command\b/g, '')
        .replace(/\bscrool\b/g, 'scroll')
        .replace(/\bscrol\b/g, 'scroll')
        .replace(/\bcamara\b/g, 'camera')
        .replace(/\bgalery\b/g, 'gallery')
        .replace(/\bfotos\b/g, 'photos')
        .replace(/\bfoto\b/g, 'photo')
        .replace(/\bcount\s*down\b/g, 'countdown')
        .replace(/\bdown\s+counter\b/g, 'countdown')
        .replace(/\bcounter\s+down\b/g, 'countdown')
        .replace(/\bglases\b/g, 'glasses')
        .replace(/\balaram\b/g, 'alarm')
        .replace(/\bslip\b/g, 'sleep')
        .replace(/\bsllep\b/g, 'sleep')
        .replace(/\bmountain\s+view\b/g, 'month view')
        .replace(/\bmountan\s+view\b/g, 'month view')
        .replace(/\bmont\s+view\b/g, 'month view')
        .replace(/\bclothes\s+gallery\b/g, 'close gallery')
        .replace(/\bclothes\s+creations\b/g, 'close creations')
        .replace(/\bclothes\s+creation\b/g, 'close creation')
        .replace(/\bclothes\s+calendar\b/g, 'close calendar')
        .replace(/\bclothes\s+shopping\s+cart\b/g, 'close shopping cart')
        .replace(/\bclothes\s+cart\b/g, 'close cart')
        .replace(/\bclothes\b(?=\s+(?:the\s+)?(?:gallery|media|creations?|calendar|schedule|agenda|picture|photo|image|video|youtube|panel|window|display|map|chart|design|cart|shopping\s+cart)\b)/g, 'close')
        // Many STT engines transcribe "close" as "clothes" even without a noun ("clothes", "clothes it").
        .replace(/\bclothes\b/g, 'close')
        .replace(/\s+/g, ' ')
        .trim();
}

function getDirectTimerVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd).replace(/\bcounter\b/g, 'countdown');
    const unitMs = {
        s: 1000, sec: 1000, secs: 1000, second: 1000, seconds: 1000,
        m: 60000, min: 60000, mins: 60000, minute: 60000, minutes: 60000,
        h: 3600000, hr: 3600000, hrs: 3600000, hour: 3600000, hours: 3600000
    };
    const cleanTimerLabel = (raw) => {
        const cleaned = sanitizeVoiceQuery(String(raw || '')
            .replace(/\b(?:set|start|create|make|put|place|timer|countdown|alarm|reminder|for|please|blip|hey)\b/g, ' ')
            .replace(/\s+/g, ' '))
            .trim();
        if (!cleaned) return 'Timer';
        if (/^(?:a|an|the|my|timer|countdown)$/.test(cleaned)) return 'Timer';
        return toTitleWords(cleaned).slice(0, 48);
    };

    const labelPatterns = [
        { re: /\b(?:set|start|create|make|put|place)\s+(?:a\s+)?(?:timer|countdown)\s+for\s+(.+?)\s+for\s+(\d{1,4})(?:\s*)(seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h)\b/, amountIndex: 2, unitIndex: 3, labelIndex: 1 },
        { re: /\b(?:set|start|create|make|put|place)\s+(?:a\s+)?(?:timer|countdown)(?:\s+for)?\s+(.+?)\s+(\d{1,4})(?:\s*)(seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h)\b/, amountIndex: 2, unitIndex: 3, labelIndex: 1 },
        { re: /\b(?:set|start|create|make|put|place)\s+(?:a\s+)?(?:timer|countdown)\s+for\s+(\d{1,4})(?:\s*)(seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h)\s+(?:for\s+)?(.+)$/, amountIndex: 1, unitIndex: 2, labelIndex: 3 },
        { re: /\b(?:timer|countdown)\s+for\s+(.+?)\s+for\s+(\d{1,4})(?:\s*)(seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h)\b/, amountIndex: 2, unitIndex: 3, labelIndex: 1 },
        { re: /\b(.+?)\s+(\d{1,4})(?:\s*)(seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h)\s+(?:timer|countdown)\b/, amountIndex: 2, unitIndex: 3, labelIndex: 1 },
        { re: /\b(\d{1,4})(?:\s*)(seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h)\s+(?:timer|countdown)\s+(?:for\s+)?(.+)$/, amountIndex: 1, unitIndex: 2, labelIndex: 3 }
    ];
    const plainPatterns = [
        { re: /\b(?:set|start|create|make|put|place)\s+(?:a\s+)?(?:timer|countdown)(?:\s+for)?\s+(\d{1,4})(?:\s*)(seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h)\b/, amountIndex: 1, unitIndex: 2 },
        { re: /\b(?:timer|countdown)\s+(?:for\s+)?(\d{1,4})(?:\s*)(seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h)\b/, amountIndex: 1, unitIndex: 2 },
        { re: /\b(\d{1,4})(?:\s*)(seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h)\s+(?:timer|countdown)\b/, amountIndex: 1, unitIndex: 2 }
    ];

    let match = null;
    let amountIndex = 1;
    let unitIndex = 2;
    let label = 'Timer';
    for (const pattern of labelPatterns) {
        match = lower.match(pattern.re);
        if (!match) continue;
        amountIndex = pattern.amountIndex;
        unitIndex = pattern.unitIndex;
        label = cleanTimerLabel(match[pattern.labelIndex]);
        break;
    }
    if (!match) {
        for (const pattern of plainPatterns) {
            match = lower.match(pattern.re);
            if (!match) continue;
            amountIndex = pattern.amountIndex;
            unitIndex = pattern.unitIndex;
            break;
        }
    }
    if (!match) return null;
    const amount = Number(match[amountIndex]);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const rawUnit = String(match[unitIndex] || '').toLowerCase();
    const normalizedUnit = rawUnit.replace(/[^a-z]/g, '');
    const msPerUnit = unitMs[normalizedUnit];
    if (!msPerUnit) return null;
    const ms = amount * msPerUnit;
    if (!Number.isFinite(ms) || ms <= 0) return null;

    const prettyUnit = msPerUnit === 1000
        ? (amount === 1 ? 'second' : 'seconds')
        : msPerUnit === 60000
            ? (amount === 1 ? 'minute' : 'minutes')
            : (amount === 1 ? 'hour' : 'hours');
    return { ms, amount, prettyUnit, label };
}

function formatDirectAlarmWhen(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'that time';
    const now = new Date();
    const sameDay = now.getFullYear() === date.getFullYear()
        && now.getMonth() === date.getMonth()
        && now.getDate() === date.getDate();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = tomorrow.getFullYear() === date.getFullYear()
        && tomorrow.getMonth() === date.getMonth()
        && tomorrow.getDate() === date.getDate();
    const timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (sameDay) return `${timeLabel} today`;
    if (isTomorrow) return `${timeLabel} tomorrow`;
    return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function getDirectAlarmVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    const currentAlarmIntent = /\b(alarm|reminder)\b/.test(lower) || /\bremind me\b/.test(lower) || /\bwake me\b/.test(lower);
    const previousUser = String(state.history?.[state.history.length - 1]?.user || '');
    const previousBlip = String(state.history?.[state.history.length - 1]?.blip || '');
    const previousQuery = String(state.lastContext?.lastUserQuery || '');
    const followUpAlarmIntent = [previousUser, previousBlip, previousQuery].some((value) => /\b(alarm|reminder)\b/.test(normalizeVoiceTokens(value)) || /\bremind me\b/.test(normalizeVoiceTokens(value)) || /\bwake me\b/.test(normalizeVoiceTokens(value)));
    if (!currentAlarmIntent && !followUpAlarmIntent) return null;

    const parsedTime = parseVoiceTimeFromText(lower);
    let parsedDate = parseVoiceDateFromText(lower);
    if (!parsedDate && parsedTime) {
        parsedDate = new Date();
        parsedDate.setHours(parsedTime.hours, parsedTime.minutes ?? 0, 0, 0);
    }
    if (!parsedDate) return null;

    const now = Date.now();
    let dueAt = parsedDate.getTime();
    if (!Number.isFinite(dueAt)) return null;
    const hasMeridian = /\b(am|pm)\b/.test(lower);
    if (dueAt <= now && !hasMeridian && Number.isFinite(parsedTime?.hours) && parsedTime.hours >= 1 && parsedTime.hours <= 11) {
        const eveningCandidate = dueAt + (12 * 60 * 60 * 1000);
        if (eveningCandidate > now) dueAt = eveningCandidate;
    }
    const explicitlyPinnedToday = /\btoday\b/.test(lower) || /\btomorrow\b/.test(lower) || /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(lower) || /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(lower);
    if (dueAt <= now && !explicitlyPinnedToday) {
        dueAt += 24 * 60 * 60 * 1000;
    }
    if (dueAt <= now) return null;

    const labelMatch = lower.match(/\b(?:for|about)\s+(.+?)(?:\s+at\s+|\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b|$)/);
    const rawLabel = sanitizeVoiceQuery(labelMatch?.[1] || '')
        .replace(/^(?:an?\s+)?(?:alarm|reminder)\s+/, '')
        .replace(/^(?:me\s+)?to\s+/, '')
        .trim();
    const label = rawLabel ? toTitleWords(rawLabel).slice(0, 48) : 'Alarm';
    return {
        label,
        dueAt,
        ms: dueAt - now,
        whenText: formatDirectAlarmWhen(new Date(dueAt))
    };
}

function getReminderCancelVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    if (!/\b(cancel|delete|remove|clear|erase|trash|stop)\b/.test(lower)) return null;
    if (!/\b(alarm|alarms|reminder|reminders|timer|timers|countdown|countdowns)\b/.test(lower)) return null;

    if (/\b(all|every)\s+(alarm|alarms|reminder|reminders|timer|timers|countdown|countdowns)\b/.test(lower) ||
        /\b(clear|delete|remove|erase|trash)\s+(?:all\s+|my\s+all\s+)?(alarm|alarms|reminder|reminders|timer|timers|countdown|countdowns)\b/.test(lower)) {
        return { action: 'clearAll' };
    }

    const labelMatch = lower.match(/\b(?:for|about|called|named)\s+(.+)$/);
    const query = sanitizeVoiceQuery(labelMatch?.[1] || '');
    if (query) return { action: 'cancelMatch', query };

    return { action: 'cancelNext' };
}

function getHubVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    const hubNoun = '(?:hub)';
    if (/\b(close|hide|dismiss|exit)\s+(the\s+)?hub\b/.test(lower)) return { action: 'close' };
    if (/\b(open|go to|enter)\s+(the\s+)?hub\b/.test(lower)) return { action: 'open' };
    if (new RegExp(`\\b(clear|empty|wipe|reset|erase|trash|delete|remove)\\s+(?:the\\s+)?${hubNoun}\\b`).test(lower)) return { action: 'clear' };
    if (/\b(show|review|read|list)\s+(?:me\s+)?(?:the\s+)?hub\b/.test(lower) ||
        /\bwhat(?:'s| is)\s+(?:in|inside)\s+(?:the\s+)?hub\b/.test(lower)) return { action: 'review' };
    if (/\b(save|store|keep)\s+(this|that|it|current)\b[\s\w]{0,18}\b(to|in)\s+(?:the\s+)?hub\b/.test(lower)) return { action: 'saveCurrent' };

    const removeMatch = lower.match(new RegExp(`\\b(?:remove|delete|drop|erase|trash)\\s+(.+?)(?:\\s+from)?\\s+(?:the\\s+)?${hubNoun}\\b`));
    if (removeMatch) {
        const query = sanitizeVoiceQuery(removeMatch[1] || '')
            .replace(/^(?:the\s+)?/, '')
            .replace(/^(?:item|note|link|photo|image)\s+/, '')
            .trim();
        if (!query || /^(?:it|this|that|one|item|note|link|photo|image|last|latest|newest)$/.test(query)) {
            return { action: 'removeLatest' };
        }
        return { action: 'removeMatch', query };
    }

    const notePatterns = [
        /^(?:please\s+)?(?:save|add|put|store|remember)\s+(?:note\s+)?(?:to|in)\s+(?:the\s+)?hub[:\s,-]*(.+)$/,
        /^(?:please\s+)?(?:save|add|put|store|remember)\s+(.+?)\s+(?:to|in)\s+(?:the\s+)?hub$/
    ];
    for (const re of notePatterns) {
        const match = lower.match(re);
        const note = sanitizeVoiceQuery(match?.[1] || '');
        if (!note) continue;
        if (/^(?:this|that|it|current)$/.test(note)) return { action: 'saveCurrent' };
        return { action: 'saveNote', note };
    }
    return null;
}

function getNotesVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    const raw = sanitizeVoiceQuery(cmd);
    const notesNoun = '(?:notes?|note\\s+pad|notepad|notes?\\s+tool|notes?\\s+client)';
    const draftStartPatterns = [
        /^(?:hey\s+blip\s+)?(?:(?:please|can|could|would|will)\s+you\s+)?(?:please\s+)?(?:take|create|make|start)\s+(?:a\s+)?note(?:\s+for\s+(.+))?$/i,
        /^(?:hey\s+blip\s+)?(?:(?:please|can|could|would|will)\s+you\s+)?(?:please\s+)?take\s+note(?:\s+for\s+(.+))?$/i,
        /^(?:hey\s+blip\s+)?(?:(?:please|can|could|would|will)\s+you\s+)?(?:please\s+)?(?:take|create|make|start)\s+(?:some\s+)?notes$/i
    ];

    // If notes pad is already open, bare "notes" can mean close (STT sometimes drops the verb).
    if (isSidePanelVisible() && state.currentSidePanelAction === 'notes' && /^(?:notes?|note\s+pad|notepad)$/.test(lower)) {
        return { action: 'close' };
    }

    // Accept singular too ("close note") even though the panel is "notes".
    if (/\b(close|hide|dismiss|exit)\s+(?:the\s+)?note\b/.test(lower)) return { action: 'close' };
    if (new RegExp(`\\b(close|hide|dismiss|exit)\\s+(?:the\\s+)?${notesNoun}\\b`).test(lower)) return { action: 'close' };
    for (const re of draftStartPatterns) {
        const match = raw.match(re);
        if (match) {
            const descriptor = sanitizeVoiceQuery(match[1] || '');
            return { action: 'startDraft', descriptor };
        }
    }
    if (/^(?:take\s+notes|open\s+notes|show\s+notes|notes)$/.test(lower) ||
        /^show\s+me\s+notes$/.test(lower) ||
        /^show\s+me\s+my\s+notes$/.test(lower) ||
        new RegExp(`\\b(open|show|read|review|list)\\s+(?:me\\s+)?(?:my\\s+|the\\s+)?${notesNoun}\\b`).test(lower) ||
        (/\b(open|show|read|review|list|check|view)\b/.test(lower) && /\b(notes?|note\s+pad|notepad|notes?\s+tool|notes?\s+client)\b/.test(lower)) ||
        /\bwhat(?:'s| is)\s+in\s+(?:my\s+)?notes\b/.test(lower)) return { action: 'open' };
    if (new RegExp(`\\b(clear|empty|wipe|reset|erase|delete|remove)\\s+(?:my\\s+|the\\s+)?${notesNoun}\\b`).test(lower)) return { action: 'clear' };
    if (/\b(delete|remove|erase)\s+(?:the\s+)?(?:last|latest)\s+note\b/.test(lower)) return { action: 'removeLatest' };

    const removeMatch = lower.match(/\b(?:delete|remove|erase)\s+note\s+(?:about|called|named)?\s*(.+)$/);
    if (removeMatch) {
        const query = sanitizeVoiceQuery(removeMatch[1] || '');
        if (query) return { action: 'removeMatch', query };
    }

    const notePatterns = [
        /^(?:please\s+)?take\s+(?:a\s+)?note[:\s,-]*(.+)$/i,
        /^(?:please\s+)?take\s+(?:a\s+)?note\s+for\s+(.+)$/i,
        /^(?:please\s+)?save\s+(?:a\s+)?note[:\s,-]*(.+)$/i,
        /^(?:please\s+)?add\s+(?:a\s+)?note[:\s,-]*(.+)$/i,
        /^(?:please\s+)?note\s+that[:\s,-]*(.+)$/i,
        /^(?:please\s+)?write\s+(?:this\s+)?down[:\s,-]*(.+)$/i
    ];
    for (const re of notePatterns) {
        const match = raw.match(re);
        const note = sanitizeVoiceQuery(match?.[1] || '');
        if (note) return { action: 'saveNote', note };
    }

    return null;
}

function getMemoryVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    if (/^(?:setup|start|open|edit)\s+(?:my\s+)?(?:memory|profile)$/i.test(lower) ||
        /\b(?:setup|start|edit)\s+(?:my\s+)?memory\b/.test(lower)) return { action: 'start' };
    if (/\bwhat\s+do\s+you\s+remember\s+about\s+me\b/.test(lower) ||
        /\bshow\s+(?:me\s+)?(?:my\s+)?(?:memory|profile)\b/.test(lower)) return { action: 'review' };
    return null;
}

function getCartVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    const cartNoun = '(?:sh+opp?ing\\s+cart|shopping\\s+cart|shoping\\s+cart|cart)';
    // If cart is already open, bare "cart" often means close (verb dropped).
    if (new RegExp(`^(?:the\\s+)?${cartNoun}$`).test(lower)) return state.currentMode === 'cart' ? 'close' : 'open';
    if (new RegExp(`\\b(?:open|show|go to|enter|take me to|bring up)\\s+(?:me\\s+)?(?:the\\s+|my\\s+)?${cartNoun}\\b`).test(lower)) return 'open';
    if (new RegExp(`\\b(clear|empty|wipe|reset)\\s+(?:the\\s+)?${cartNoun}\\b`).test(lower)) return { action: 'clear' };
    if (new RegExp(`\\b(close|hide|dismiss|exit)\\s+(?:the\\s+)?${cartNoun}\\b`).test(lower)) return 'close';
    // When cart is open, "close products/items" should close the cart panel.
    if (state.currentMode === 'cart' && /\b(close|hide|dismiss|exit)\s+(?:the\s+)?(?:products?|items?)\b/.test(lower)) return 'close';
    if (new RegExp(`\\b(?:show|open|preview)\\s+(?:me\\s+)?(?:the\\s+)?${cartNoun}\\s+images?\\b`).test(lower) ||
        new RegExp(`\\bshow\\s+(?:me\\s+)?images?\\s+(?:in|from)\\s+(?:the\\s+)?${cartNoun}\\b`).test(lower)) return { action: 'showImages' };
    if (new RegExp(`\\b(review|read|list)\\s+(?:me\\s+)?(?:the\\s+)?${cartNoun}\\b`).test(lower) ||
        new RegExp(`\\bwhat(?:'s| is)\\s+(?:in|inside)\\s+(?:the\\s+)?${cartNoun}\\b`).test(lower)) return 'review';
    if (new RegExp(`\\b(save|add|put|store|keep)\\s*(?:this|that|it|these|those|products?)?\\b[\\s\\w]{0,18}\\b(to|in)\\s+(?:the\\s+)?${cartNoun}\\b`).test(lower) ||
        new RegExp(`\\badd\\s+(?:these\\s+)?products?\\s+to\\s+(?:the\\s+)?${cartNoun}\\b`).test(lower)) return 'saveCurrent';
    if ((/\b(skip(?:\s+item)?|next\s+(?:item|product))\b/.test(lower)) &&
        (state.currentMode === 'cart' || mediaLightbox?.style.display === 'flex')) return { action: 'nextItem' };
    if ((/\b(previous|back|last)\s+(?:item|product)\b/.test(lower) || /\bgo\s+back\b/.test(lower)) &&
        (state.currentMode === 'cart' || mediaLightbox?.style.display === 'flex')) return { action: 'prevItem' };
    if ((/\b(?:show|preview|open)\s+(?:this|current)\s+(?:item|product|image)?\b/.test(lower) || /\bshow\s+it\b/.test(lower)) &&
        (state.currentMode === 'cart' || mediaLightbox?.style.display === 'flex')) return { action: 'showCurrent' };
    if ((/\b(?:buy|choose|get|open)\s+(?:this|current)\s+(?:item|product)?\b/.test(lower) || /\bbuy\s+it\b/.test(lower)) &&
        (state.currentMode === 'cart' || mediaLightbox?.style.display === 'flex')) return { action: 'buyCurrent' };
    const removeMatch = lower.match(new RegExp(`\\b(?:remove|delete|drop)\\s+(.+?)(?:\\s+from)?\\s+(?:the\\s+)?${cartNoun}\\b`));
    if (removeMatch) {
        const query = sanitizeVoiceQuery(removeMatch[1] || '')
            .replace(/^(?:the\s+)?/, '')
            .replace(/^(?:item|product)\s+/, '')
            .trim();
        if (!query || /^(?:it|this|that|one|item|product|last|latest|newest)$/.test(query)) {
            return { action: 'removeLatest' };
        }
        return { action: 'removeMatch', query };
    }
    return null;
}

function isAmazonOnlyProductRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = normalizeVoiceTokens(cmd);
    return /\bamazon\b/.test(lower) && /\b(find|show|search|look|recommend|suggest|buy|purchase|shopping|shop|best|product|products)\b/.test(lower);
}

function getDirectWeatherVoiceLocation(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    const cleanupLocation = (value) => sanitizeVoiceQuery(String(value || '')
        .replace(/^(?:here|there)\s+(?:in|for|at)\s+/i, '')
        .replace(/^(?:weather|forecast)\s+/i, '')
        .replace(/^(?:today|tomorrow|right now|now|currently|this morning|this afternoon|this evening|tonight)\s+(?:in|for|at)\s+/i, '')
        .replace(/^(?:here|there)\s+/i, '')
        .replace(/^(?:today|tomorrow|right now|now|currently|this morning|this afternoon|this evening|tonight)\s+/i, '')
        .replace(/\s+(?:today|tomorrow|right now|now|currently|tonight)$/i, '')
        .trim());
    const patterns = [
        /^(?:what(?:'s| is)\s+the\s+weather(?:\s+like)?|weather|forecast)(?:\s+(?:in|for|at|around))\s+(.+)$/,
        /^(?:what(?:'s| is)\s+the\s+weather(?:\s+like)?|weather|forecast)(?:\s+(?:here|there))?(?:\s+(?:in|for|at|around))\s+(.+)$/,
        /^(?:weather|forecast)\s+(.+)$/,
        /^(?:tell me|show me|give me)\s+(?:the\s+)?(?:weather|forecast)(?:\s+(?:in|for))\s+(.+)$/,
        /^(?:is it|will it be)\s+(?:sunny|rainy|raining|hot|cold|warm|snowing|windy)\s+in\s+(.+)$/,
        /^(?:can you\s+)?(?:check|tell me|show me|give me)\s+(?:the\s+)?(?:weather|forecast)(?:\s+(?:today|tomorrow|right now|now|currently|tonight))?(?:\s+(?:in|for|at))\s+(.+)$/,
        /^(?:can you\s+)?check(?:\s+the)?\s+(?:weather|forecast)\s+(.+)$/,
        /^(?:can you\s+)?check\s+(.+?)\s+(?:weather|forecast)\b$/,
        /^(?:please\s+)?(?:check|show|tell me)\s+weather\s+(?:in|for|at)\s+(.+)$/
    ];
    for (const re of patterns) {
        const match = lower.match(re);
        const location = cleanupLocation(match?.[1] || '');
        if (!location) continue;
        if (/^(?:weather|forecast|there|here|today|tomorrow)$/.test(location)) continue;
        return location;
    }
    return null;
}

function isGenericWeatherVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    return /^(?:what(?:'s| is)\s+the\s+weather(?:\s+like)?|weather|forecast|tell me the weather|show me the weather|give me the weather)(?:\s+please)?$/.test(lower);
}

function getDirectWeatherSceneDemo(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    if (!/\b(?:video|videos|youtube|movie|film|watch)\b/.test(lower) &&
        /^(?:can you\s+)?(?:show|load|test|try|preview|use|switch to|make)?\s*(?:me\s+)?(?:the\s+)?iranian\s+(?:animation|weather|mode|scene)\b/.test(lower)) {
        return 'rainy';
    }
    const match = lower.match(/\b(?:load|show|test|try|preview|use|switch to|make)\s+(?:me\s+)?(?:the\s+)?(sunny|cloudy|rainy|windy|night)\s*(?:animation|weather|mode|scene)?\b|\b(?:can you\s+)?(?:show|load|test|try|preview)\s+(?:me\s+)?(?:the\s+)?(sunny|cloudy|rainy|windy|night)\b/);
    const scene = match?.[1] || match?.[2] || '';
    return ['sunny', 'cloudy', 'rainy', 'windy', 'night'].includes(scene) ? scene : null;
}

function getWeatherSceneShowcaseCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    if (/\b(?:stop|close|end|cancel|exit|hide)\s+(?:the\s+)?(?:weather\s+)?(?:animation|animations|weather\s+showcase|showcase|weather\s+demo|demo)\b/.test(lower)) {
        return 'stop';
    }
    if (/\b(?:shuffle|cycle|show|load|preview|play)\s+(?:me\s+)?(?:all\s+)?(?:the\s+)?weather\s+(?:animation|animations|modes|scenes)\b/.test(lower) ||
        /\bshow\s+(?:me\s+)?all\s+weather\s+(?:animation|animations|modes|scenes)\b/.test(lower)) {
        return 'start';
    }
    return null;
}

function isDirectTimeVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = normalizeVoiceTokens(cmd);
    return /^(?:what(?:'s| is)\s+the\s+time|what\s+time\s+is\s+it|current\s+time|time\s+now|tell\s+me\s+the\s+time)(?:\s+please)?$/.test(lower);
}

function isDirectDateVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = normalizeVoiceTokens(cmd);
    return /^(?:what\s+day\s+is\s+(?:it\s+)?today|what(?:'s| is)\s+today(?:'s)?\s+date|what\s+date\s+is\s+today)(?:\s+please)?$/.test(lower);
}

function getOpenLinkVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    if (/^(?:please\s+)?(?:open|show|launch|go\s+to)\s+(?:the\s+)?(?:last|latest)?\s*(?:link|result|page|website)(?:\s+please)?$/.test(lower)) {
        return 'openLatestLink';
    }
    return null;
}

function isBrainResetVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = normalizeVoiceTokens(cmd);
    return /\b(?:refresh|reset|clear|clean)\s+(?:your\s+|the\s+)?(?:brain|memory|context|gemini\s+brain)\b/.test(lower) ||
        /\benglish\s+only\b/.test(lower);
}

function getDirectProductVoiceQuery(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    if (/\b(?:sh+opp?ing\s+cart|shopping\s+cart|shoping\s+cart|cart)\b/.test(lower)) return null;
    const productIntent = /\b(product|products|buy|purchase|shopping|shop|recommend|suggest|best|amazon)\b/;
    if (!productIntent.test(lower)) return null;

    let query = lower
        .replace(/^(?:please\s+)?(?:find|show|search(?:\s+for)?|look(?:\s+for)?|recommend|suggest|buy|shop\s+for)\s+(?:me\s+)?/, '')
        .replace(/^(?:what(?:'s| is)\s+)?(?:the\s+)?best\s+/, '')
        .replace(/\b(?:on|from|at)\s+amazon\b/g, '')
        .replace(/\bamazon\b/g, '')
        .replace(/\b(?:product|products)\b/g, '')
        .replace(/\b(?:to buy|for sale|shopping)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!query || /^(?:something|anything|it|that|this)$/.test(query)) return null;
    return query;
}

function parseVoiceDateFromText(text) {
    const lower = normalizeVoiceTokens(text);
    const now = new Date();
    let target = parseMonthDayReferenceFromText(lower) || new Date(now);
    let matchedDate = false;

    if (parseMonthDayReferenceFromText(lower)) {
        matchedDate = true;
    }

    if (!matchedDate && /\btomorrow\b/.test(lower)) {
        target.setDate(target.getDate() + 1);
        matchedDate = true;
    } else if (!matchedDate && /\btoday\b/.test(lower)) {
        matchedDate = true;
    } else if (!matchedDate) {
        const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const weekdayMatch = lower.match(/\b(?:on\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
        if (weekdayMatch) {
            const wanted = weekdays.indexOf(weekdayMatch[1]);
            const current = target.getDay();
            let offset = (wanted - current + 7) % 7;
            if (offset === 0) offset = 7;
            target.setDate(target.getDate() + offset);
            matchedDate = true;
        } else {
            const isoMatch = lower.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
            if (isoMatch) {
                target = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
                matchedDate = !Number.isNaN(target.getTime());
            } else {
                const dayNumber = parseCalendarDayNumberFromText(lower);
                if (dayNumber) {
                    const reference = getCalendarReferenceDate();
                    target = new Date(reference.getFullYear(), reference.getMonth(), dayNumber);
                    matchedDate = !Number.isNaN(target.getTime()) && target.getMonth() === reference.getMonth();
                }
            }
        }
    }

    if (!matchedDate) return null;

    const parsedTime = parseVoiceTimeFromText(lower);
    const hours = parsedTime?.hours;
    const minutes = parsedTime?.minutes ?? 0;
    if (!Number.isFinite(hours) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    target.setHours(hours, minutes, 0, 0);
    return target;
}

function parseVoiceTimeFromText(text) {
    const lower = normalizeVoiceTokens(text);
    const meridianMatch = lower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
    if (meridianMatch) {
        const rawHour = Number(meridianMatch[1] || meridianMatch[4]);
        const rawMinute = Number(meridianMatch[2] || meridianMatch[5] || 0);
        const meridian = meridianMatch[3] || meridianMatch[6];
        let hours = rawHour % 12;
        if (meridian === 'pm') hours += 12;
        return { hours, minutes: rawMinute };
    }

    const twentyFourHourMatch = lower.match(/\bat\s+(\d{1,2}):(\d{2})\b|\b(\d{1,2}):(\d{2})\b/);
    if (twentyFourHourMatch) {
        return {
            hours: Number(twentyFourHourMatch[1] || twentyFourHourMatch[3]),
            minutes: Number(twentyFourHourMatch[2] || twentyFourHourMatch[4] || 0)
        };
    }
    return null;
}

function isGenericCalendarDraftTitle(title) {
    return !String(title || '').trim() || /^event$/i.test(String(title || '').trim());
}

function buildCalendarEventTitleFromText(text) {
    const lower = normalizeVoiceTokens(text);
    return toTitleWords(
        sanitizeVoiceQuery(lower
            .replace(/^(?:please\s+)?(?:add|create|make|schedule|set|put|book|save)\s+/, '')
            .replace(/\bremind\s+me\s+to\b/g, '')
            .replace(/\b(?:in|on|to)\s+(?:my\s+)?calendar\b/g, '')
            .replace(/\b(calendar|event|meeting|appointment|reminder)\b/g, '')
            .replace(/\b(today|tomorrow)\b/g, '')
            .replace(/\bday\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+of\s+(?:january|february|march|april|may|june|july|august|september|october|november|december))?\b/g, '')
            .replace(/\b(?:the\s+)?\d{1,2}(?:st|nd|rd|th)(?:\s+of\s+(?:january|february|march|april|may|june|july|august|september|october|november|december))?\b/g, '')
            .replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?\b/g, '')
            .replace(/\bon\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/g, '')
            .replace(/\b(20\d{2})-(\d{2})-(\d{2})\b/g, '')
            .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/g, '')
            .replace(/\bfor\s+\d{1,3}\s*(?:minutes?|mins?|hours?|hrs?)\b/g, '')
            .replace(/^(?:to|for)\s+/g, '')
            .replace(/\s+/g, ' ')
        )
    ) || 'Event';
}

function buildCalendarTitleFromFollowUp(text) {
    const title = toTitleWords(sanitizeVoiceQuery(normalizeVoiceTokens(text)));
    return title || 'Event';
}

function parseCalendarReminderChoice(text) {
    const lower = normalizeVoiceTokens(text);
    if (/^(?:no|nope|none|no reminder|without reminder|don't remind me|do not remind me)$/.test(lower)) {
        return { minutes: 0, reply: 'No reminder.' };
    }
    if (/^(?:yes|yeah|yep|sure|ok|okay|please do)$/.test(lower)) {
        return { minutes: 60, reply: 'I will place a reminder 1 hour before the event.' };
    }
    const customMatch = lower.match(/\b(\d{1,3})\s*(minutes?|mins?|hours?|hrs?|hr)\s*(?:before|earlier|ahead)\b/);
    if (customMatch) {
        const amount = Number(customMatch[1]);
        const unit = customMatch[2];
        if (Number.isFinite(amount) && amount > 0) {
            const minutes = /hour|hr/.test(unit) ? amount * 60 : amount;
            const label = minutes % 60 === 0
                ? `${minutes / 60} hour${minutes === 60 ? '' : 's'}`
                : `${minutes} minute${minutes === 1 ? '' : 's'}`;
            return { minutes, reply: `I will place a reminder ${label} before the event.` };
        }
    }
    return null;
}

function buildCalendarReminderFollowUpText(details = {}) {
    const reminderMinutes = Number(details.reminderMinutes || 0);
    if (!Number.isFinite(reminderMinutes) || reminderMinutes <= 0) return '';
    const label = reminderMinutes % 60 === 0
        ? `${reminderMinutes / 60} hour${reminderMinutes === 60 ? '' : 's'}`
        : `${reminderMinutes} minute${reminderMinutes === 1 ? '' : 's'}`;
    return ` Reminder set for ${label} before the event.`;
}

function formatPendingCalendarDraftPrompt(draft) {
    if (draft?.stage === 'awaiting_title') return 'What is the event?';
    if (draft?.stage === 'awaiting_reminder') return 'Do you want a reminder? Say yes, no, or for example 30 minutes before.';
    const title = draft?.title || 'Event';
    if (draft?.anchorDate) {
        const when = new Date(draft.anchorDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric'
        });
        return `What time for ${title} on ${when}?`;
    }
    return `What day and time for ${title}?`;
}

function resolvePendingCalendarFollowUp(cmd) {
    const draft = state.pendingCalendarDraft;
    if (!draft) return null;
    const lower = normalizeVoiceTokens(cmd);
    if (/^(?:cancel|never mind|nevermind|forget it|stop)$/.test(lower)) {
        state.pendingCalendarDraft = null;
        return { cancelled: true, message: 'Calendar draft cancelled.' };
    }

    if (draft.stage === 'awaiting_title') {
        const title = buildCalendarTitleFromFollowUp(cmd);
        if (isGenericCalendarDraftTitle(title)) {
            return {
                needsScheduleInfo: true,
                message: 'What is the event?'
            };
        }
        const hasScheduledTime = !!(draft.start && draft.end);
        state.pendingCalendarDraft = {
            ...draft,
            title,
            stage: hasScheduledTime ? 'awaiting_reminder' : 'awaiting_time'
        };
        return {
            needsScheduleInfo: true,
            message: formatPendingCalendarDraftPrompt(state.pendingCalendarDraft)
        };
    }

    if (draft.stage === 'awaiting_reminder') {
        const reminder = parseCalendarReminderChoice(lower);
        if (!reminder) {
            return {
                needsScheduleInfo: true,
                message: formatPendingCalendarDraftPrompt(draft)
            };
        }
        state.pendingCalendarDraft = null;
        return {
            event_details: {
                title: draft.title || 'Event',
                start: draft.start,
                end: draft.end,
                reminderMinutes: reminder.minutes
            },
            completionMessage: reminder.reply
        };
    }

    const explicitDateTime = parseVoiceDateFromText(lower);
    if (explicitDateTime) {
        const endDate = new Date(explicitDateTime.getTime() + (draft.durationMs || 60 * 60 * 1000));
        if (isGenericCalendarDraftTitle(draft.title)) {
            state.pendingCalendarDraft = {
                ...draft,
                anchorDate: startOfCalendarDay(explicitDateTime).toISOString(),
                start: explicitDateTime.toISOString(),
                end: endDate.toISOString(),
                stage: 'awaiting_title'
            };
            return {
                needsScheduleInfo: true,
                focusDayNumber: explicitDateTime.getDate(),
                focusAnchorDate: explicitDateTime.toISOString(),
                message: formatPendingCalendarDraftPrompt(state.pendingCalendarDraft)
            };
        }
        state.pendingCalendarDraft = {
            ...draft,
            anchorDate: startOfCalendarDay(explicitDateTime).toISOString(),
            start: explicitDateTime.toISOString(),
            end: endDate.toISOString(),
            stage: 'awaiting_reminder'
        };
        return {
            needsScheduleInfo: true,
            focusDayNumber: explicitDateTime.getDate(),
            focusAnchorDate: explicitDateTime.toISOString(),
            message: formatPendingCalendarDraftPrompt(state.pendingCalendarDraft)
        };
    }

    const explicitDate = getCalendarDateFromCommand(lower, draft.anchorDate ? { anchorDate: draft.anchorDate } : (state.activeCalendarViewRequest || { anchorDate: state.calendarAnchorDate }));
    const timeOnly = parseVoiceTimeFromText(lower);
    const anchorDate = explicitDate ? startOfCalendarDay(explicitDate) : (draft.anchorDate ? startOfCalendarDay(draft.anchorDate) : null);

    if (anchorDate && timeOnly) {
        const start = new Date(anchorDate);
        start.setHours(timeOnly.hours, timeOnly.minutes, 0, 0);
        const end = new Date(start.getTime() + (draft.durationMs || 60 * 60 * 1000));
        if (isGenericCalendarDraftTitle(draft.title)) {
            state.pendingCalendarDraft = {
                ...draft,
                anchorDate: startOfCalendarDay(start).toISOString(),
                start: start.toISOString(),
                end: end.toISOString(),
                stage: 'awaiting_title'
            };
            return {
                needsScheduleInfo: true,
                focusDayNumber: start.getDate(),
                focusAnchorDate: start.toISOString(),
                message: formatPendingCalendarDraftPrompt(state.pendingCalendarDraft)
            };
        }
        state.pendingCalendarDraft = {
            ...draft,
            anchorDate: startOfCalendarDay(start).toISOString(),
            start: start.toISOString(),
            end: end.toISOString(),
            stage: 'awaiting_reminder'
        };
        return {
            needsScheduleInfo: true,
            focusDayNumber: start.getDate(),
            focusAnchorDate: start.toISOString(),
            message: formatPendingCalendarDraftPrompt(state.pendingCalendarDraft)
        };
    }

    if (explicitDate && !timeOnly) {
        state.pendingCalendarDraft = {
            ...draft,
            anchorDate: startOfCalendarDay(explicitDate).toISOString(),
            stage: 'awaiting_time'
        };
        return {
            needsScheduleInfo: true,
            focusDayNumber: explicitDate.getDate(),
            focusAnchorDate: explicitDate.toISOString(),
            message: formatPendingCalendarDraftPrompt(state.pendingCalendarDraft)
        };
    }

    if (!explicitDate && timeOnly && !draft.anchorDate) {
        return {
            needsScheduleInfo: true,
            message: `I have the time. ${formatPendingCalendarDraftPrompt(draft)}`
        };
    }

    return null;
}

function getDirectCalendarVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    if (!/\b(calendar|schedule|event|meeting|appointment|reminder|remind me)\b/.test(lower)) return null;
    if (/^(?:can you\s+)?(?:please\s+)?(?:show|open|display|view|list|tell me|give me|check|see|what(?:'s| is))\b/.test(lower) ||
        /\b(?:my\s+schedule|my\s+calendar|my\s+events|agenda)\b/.test(lower)) {
        return null;
    }
    if (!/^(?:please\s+)?(?:add|create|make|schedule|set|put|book|save)\b/.test(lower) &&
        !/\bremind\s+me\s+to\b/.test(lower)) {
        return null;
    }

    const startDate = parseVoiceDateFromText(lower);
    if (!startDate) {
        const focusDayNumber = parseCalendarDayNumberFromText(lower);
        const explicitMonthDay = parseMonthDayReferenceFromText(lower);
        const selectedDate = getSelectedCalendarDate(state.activeCalendarViewRequest || {});
        const resolvedAnchorDate = explicitMonthDay
            || (focusDayNumber ? resolveCalendarSelectedDate(focusDayNumber, state.activeCalendarViewRequest || { anchorDate: state.calendarAnchorDate }) : null)
            || selectedDate
            || null;
        const promptDayNumber = resolvedAnchorDate?.getDate() || explicitMonthDay?.getDate() || focusDayNumber || null;
        const draftTitle = buildCalendarEventTitleFromText(lower);
        const pendingDraft = {
            title: draftTitle,
            anchorDate: resolvedAnchorDate ? startOfCalendarDay(resolvedAnchorDate).toISOString() : '',
            durationMs: 60 * 60 * 1000,
            stage: isGenericCalendarDraftTitle(draftTitle) ? 'awaiting_title' : 'awaiting_time'
        };
        return {
            needsScheduleInfo: true,
            focusDayNumber: promptDayNumber,
            focusAnchorDate: resolvedAnchorDate?.toISOString() || '',
            pendingDraft,
            message: formatPendingCalendarDraftPrompt(pendingDraft)
        };
    }

    let durationMs = 60 * 60 * 1000;
    const durationMatch = lower.match(/\bfor\s+(\d{1,3})\s*(minutes?|mins?|hours?|hrs?)\b/);
    if (durationMatch) {
        const amount = Number(durationMatch[1]);
        const unit = durationMatch[2];
        if (Number.isFinite(amount) && amount > 0) {
            durationMs = /hour|hr/.test(unit) ? amount * 60 * 60 * 1000 : amount * 60 * 1000;
        }
    }
    const endDate = new Date(startDate.getTime() + durationMs);

    const title = buildCalendarEventTitleFromText(lower);
    if (isGenericCalendarDraftTitle(title)) {
        const pendingDraft = {
            title,
            anchorDate: startOfCalendarDay(startDate).toISOString(),
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            durationMs,
            stage: 'awaiting_title'
        };
        return {
            needsScheduleInfo: true,
            focusDayNumber: startDate.getDate(),
            focusAnchorDate: startDate.toISOString(),
            pendingDraft,
            message: formatPendingCalendarDraftPrompt(pendingDraft)
        };
    }

    const displayTime = startDate.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    return {
        event_details: {
            title,
            start: startDate.toISOString(),
            end: endDate.toISOString()
        },
        displayTime
    };
}

function isOpenGoogleCalendarVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    return /^(?:can you\s+)?(?:please\s+)?(?:open|show|display|launch|view|go to|bring up|take me to)\s+(?:my\s+)?google\s+calendar(?:\s+(?:app|page))?$/.test(lower) ||
        /^(?:google\s+calendar)(?:\s+(?:app|page))?$/.test(lower);
}

function openGoogleCalendarHome() {
    const url = 'https://calendar.google.com/calendar/u/0/r';
    try {
        window.open(url, '_blank', 'noopener');
    } catch (_) {
        // Ignore popup failures; the user still gets the link in Blip's reply.
    }
    addToHub('link', '📅 Google Calendar', { url });
    return url;
}

function getCalendarAgendaVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    // "Open item N" / "show first item" etc. = creations panel, not calendar.
    if (/\b(?:open|show|view)\s+item\s+\d{1,3}\b/.test(lower)) return null;
    if (/\b(?:open|show|view)\s+(?:the\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+item\b/.test(lower)) return null;
    // Any "item"/"items" phrase without explicit calendar words belongs to creations/cart flows, not calendar.
    if (/\bitems?\b/.test(lower) && !/\b(calendar|schedule|events?|agenda)\b/.test(lower)) return null;
    const hasCalendarIntent = /\b(calendar|schedule|events?|agenda)\b/.test(lower);
    const directCalendarOpenIntent = /^(?:can you\s+)?(?:please\s+)?open\s+(?:(?:my|the)\s+)?(?:calendar|schedule|agenda|events?)$/.test(lower);
    const conversationalCalendarOpenIntent = /\b(?:open|show|view|check)\b[\s\w]{0,24}\b(?:calendar|schedule|agenda|events?)\b/.test(lower);
    const explicitViewMatch = lower.match(/\b(day|week|month)\s+view\b/);
    const directDateOpenIntent = /\b(show|display|view)\b/.test(lower) && (Boolean(parseCalendarDayNumberFromText(lower)) || Boolean(parseMonthDayReferenceFromText(lower)));
    if (!hasCalendarIntent && !explicitViewMatch && !directDateOpenIntent && !directCalendarOpenIntent && !conversationalCalendarOpenIntent) return null;
    if (!explicitViewMatch && !directCalendarOpenIntent && !conversationalCalendarOpenIntent && !/\b(open|show|display|view|what(?:'s| is)|list|tell me|give me|see|check|my)\b/.test(lower)) return null;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dayAfterTomorrowStart = new Date(tomorrowStart);
    dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 1);
    const monthEnd = new Date(todayStart);
    monthEnd.setDate(monthEnd.getDate() + 30);
    const requestedView = explicitViewMatch?.[1] || (/\bmonth\b/.test(lower) ? 'month' : /\bday\b/.test(lower) ? 'day' : /\bweek\b/.test(lower) ? 'week' : '');
    const requestedDay = parseDayOnlyRange(lower);
    const explicitCommandDate = getCalendarDateFromCommand(lower, state.activeCalendarViewRequest || { anchorDate: state.calendarAnchorDate });

    if (!explicitViewMatch && explicitCommandDate && /\b(show|display|view)\b/.test(lower) && !(/\bweek\b|\bmonth\b/.test(lower))) {
        const anchor = startOfCalendarDay(explicitCommandDate);
        const nextDay = new Date(anchor);
        nextDay.setDate(nextDay.getDate() + 1);
        return {
            label: anchor.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
            view: 'day',
            anchorDate: anchor.toISOString(),
            timeMin: anchor.toISOString(),
            timeMax: nextDay.toISOString(),
            maxResults: 24,
            autoJump: false
        };
    }

    if (requestedView === 'month') {
        return {
            label: 'month',
            view: 'month',
            anchorDate: explicitCommandDate?.toISOString() || requestedDay?.start?.toISOString() || todayStart.toISOString(),
            timeMin: todayStart.toISOString(),
            timeMax: monthEnd.toISOString(),
            maxResults: 60
        };
    }
    if (requestedView === 'day') {
        const anchor = explicitCommandDate || requestedDay?.start || getSelectedCalendarDate(state.activeCalendarViewRequest || {}) || todayStart;
        const nextDay = new Date(anchor);
        nextDay.setDate(nextDay.getDate() + 1);
        return {
            label: requestedDay?.label || 'today',
            view: 'day',
            anchorDate: anchor.toISOString(),
            timeMin: anchor.toISOString(),
            timeMax: nextDay.toISOString(),
            maxResults: 24,
            autoJump: false
        };
    }
    if (requestedView === 'week') {
        const anchor = explicitCommandDate || requestedDay?.start || todayStart;
        const weekEnd = new Date(anchor);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return {
            label: requestedDay?.label || 'this week',
            view: 'week',
            anchorDate: anchor.toISOString(),
            timeMin: anchor.toISOString(),
            timeMax: weekEnd.toISOString(),
            maxResults: 40
        };
    }

    if (/\btomorrow\b/.test(lower)) {
        return {
            label: 'tomorrow',
            view: 'day',
            anchorDate: tomorrowStart.toISOString(),
            timeMin: tomorrowStart.toISOString(),
            timeMax: dayAfterTomorrowStart.toISOString(),
            maxResults: 12,
            autoJump: false
        };
    }
    if (/\btoday\b/.test(lower)) {
        return {
            label: 'today',
            view: 'day',
            anchorDate: todayStart.toISOString(),
            timeMin: todayStart.toISOString(),
            timeMax: tomorrowStart.toISOString(),
            maxResults: 12,
            autoJump: false
        };
    }
    if (/\bthis week\b|\bweekly\b/.test(lower)) {
        const weekEnd = new Date(todayStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return {
            label: 'this week',
            view: 'week',
            anchorDate: todayStart.toISOString(),
            timeMin: todayStart.toISOString(),
            timeMax: weekEnd.toISOString(),
            maxResults: 16
        };
    }
    return {
        label: 'upcoming',
        view: 'month',
        anchorDate: todayStart.toISOString(),
        timeMin: now.toISOString(),
        timeMax: monthEnd.toISOString(),
        maxResults: 18
    };
}

function getCalendarFocusDayVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    if (/\bopen\s+item\s+(\d{1,3})\b/.test(lower) || /\b(?:show|view)\s+item\s+(\d{1,3})\b/.test(lower)) return null;
    if (/\b(?:open|show|view)\s+(?:the\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+item\b/.test(lower)) return null;
    if (/\bitems?\b/.test(lower) && !/\b(calendar|schedule|events?|agenda)\b/.test(lower)) return null;
    const explicitDate = parseMonthDayReferenceFromText(lower);
    const looseDayMatch = lower.match(/\b(?:go to|goto|focus|open)(?:\s+me)?\s+(?:day\s+|the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/);
    const dayNumber = Number(looseDayMatch?.[1] || parseCalendarDayNumberFromText(lower) || 0);
    if (!dayNumber && !explicitDate) return null;
    if (!/\b(go to|goto|focus|open)\b/.test(lower)) return null;
    if (explicitDate) {
        return {
            dayNumber: explicitDate.getDate(),
            anchorDate: explicitDate.toISOString()
        };
    }
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) return null;
    return { dayNumber };
}

function isReturnToCalendarVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    return /\b(go\s+back|back|return|take\s+me\s+back|bring\s+me\s+back)\s+(?:to\s+)?(?:the\s+)?calendar\b/.test(lower) ||
        /^(?:calendar|back\s+to\s+calendar)$/.test(lower);
}

function parseCalendarHourFromText(text) {
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(text));
    const meridiemMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
    if (meridiemMatch) {
        let hour = Number(meridiemMatch[1]);
        if (!Number.isInteger(hour) || hour < 1 || hour > 12) return null;
        const meridiem = meridiemMatch[3];
        if (meridiem === 'am') {
            if (hour === 12) hour = 0;
        } else if (hour !== 12) {
            hour += 12;
        }
        return hour;
    }
    const twentyFourHourMatch = lower.match(/\b(\d{1,2}):(\d{2})\b/);
    if (twentyFourHourMatch) {
        const hour = Number(twentyFourHourMatch[1]);
        return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
    }
    const slotMatch = lower.match(/\b(?:slot|hour|time)\s+(\d{1,2})\b|\bchoose\s+(\d{1,2})\b|\bselect\s+(\d{1,2})\b/);
    const slotHour = Number(slotMatch?.[1] || slotMatch?.[2] || slotMatch?.[3] || 0);
    return Number.isInteger(slotHour) && slotHour >= 0 && slotHour <= 23 ? slotHour : null;
}

function getCalendarTimeSlotVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    if (!state.activeCalendarViewRequest && !/\bcalendar\b/.test(lower)) return null;
    if (!/\b(slot|time|hour|choose|select|focus)\b/.test(lower) && !/\b(?:am|pm)\b/.test(lower) && !/\b\d{1,2}:\d{2}\b/.test(lower)) return null;
    const hour = parseCalendarHourFromText(lower);
    if (!Number.isInteger(hour)) return null;
    return { hour };
}

function getCalendarSyncVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    if (!/\bsync\b/.test(lower)) return null;
    if (!/\bcalendar\b/.test(lower)) return null;

    if (/\bsync\s+(?:my\s+)?google\s+calendar\s+to\s+blip\b|\bsync\s+google\s+calendar\s+into\s+blip\b|\bimport\s+(?:my\s+)?google\s+calendar\b/.test(lower)) {
        return { direction: 'google_to_blip' };
    }
    if (/\bsync\s+(?:my\s+)?blip\s+calendar\s+to\s+google\b|\bsync\s+blip\s+calendar\s+into\s+google\b|\bpush\s+(?:my\s+)?blip\s+calendar\s+to\s+google\b/.test(lower)) {
        return { direction: 'blip_to_google' };
    }
    if (/\bsync\s+calendars\b|\bsync\s+(?:my\s+)?calendar(s)?\b/.test(lower)) {
        return { direction: 'both' };
    }
    return null;
}

function isCloseCalendarVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    return /^(?:hey\s+blip\s+)?(?:(?:please|can|could|would|will)\s+you\s+)?(?:close|hide|dismiss|exit)\s+(?:my\s+|the\s+)?(?:calendar|schedule|agenda)(?:\s+please)?$/.test(lower);
}

function getCalendarDeleteVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    if (/\b(?:photo|photos|picture|pictures|shot|shots|snapshot|snapshots|image|images|media|music|videos?)\b/.test(lower)) return null;
    const match = lower.match(/^(?:please\s+)?(?:delete|remove|cancel)\s+(.+?)(?:\s+(?:from|in)\s+(?:my\s+)?calendar)?$/);
    if (!match?.[1]) return null;
    if (/^(?:calendar|my calendar|schedule|event|events)$/.test(match[1].trim())) return null;
    return { titleQuery: match[1].trim() };
}

function getCalendarMoveVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    const match = lower.match(/^(?:please\s+)?(?:move|reschedule|change)\s+(.+?)\s+(?:to|for)\s+(.+)$/);
    if (!match?.[1] || !match?.[2]) return null;
    if (/^(?:calendar|my calendar|schedule|event|events)$/.test(match[1].trim())) return null;
    const startDate = parseVoiceDateFromText(match[2].trim());
    if (!startDate) {
        return {
            titleQuery: match[1].trim(),
            needsScheduleInfo: true,
            message: 'Tell me the new day and time, for example: move piano practice to tomorrow at 6 PM.'
        };
    }
    return {
        titleQuery: match[1].trim(),
        startDate
    };
}

function getCalendarBulkDeleteVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    if (!/^(?:please\s+)?(?:delete|erase|remove|clear|cancel)\s+events?\b/.test(lower)) return null;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    if (/\b(?:this\s+day|today)\b/.test(lower)) {
        return { label: 'today', timeMin: todayStart.toISOString(), timeMax: tomorrowStart.toISOString() };
    }
    if (/\b(?:this\s+week|all\s+this\s+week)\b/.test(lower)) {
        return { label: 'this week', timeMin: todayStart.toISOString(), timeMax: weekEnd.toISOString() };
    }
    return null;
}

function getCalendarMoveDayVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    const match = lower.match(/^(?:please\s+)?(?:move|change|shift)\s+events?\s+(?:from|on)\s+(.+?)\s+(?:to)\s+(.+)$/);
    if (!match?.[1] || !match?.[2]) return null;

    const sourceText = match[1].trim();
    const targetText = match[2].trim();
    const source = parseDayOnlyRange(sourceText);
    const target = parseDayOnlyRange(targetText);
    if (!source || !target) return null;

    return {
        sourceLabel: source.label,
        sourceTimeMin: source.start.toISOString(),
        sourceTimeMax: source.end.toISOString(),
        targetDayStart: target.start
    };
}

function parseDayOnlyRange(text) {
    const lower = normalizeVoiceTokens(text);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (/\btoday\b|\bthis day\b/.test(lower)) {
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { label: 'today', start, end };
    }
    if (/\btomorrow\b/.test(lower)) {
        start.setDate(start.getDate() + 1);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { label: 'tomorrow', start, end };
    }
    const weekdayMatch = lower.match(/\b(?:on\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
    if (weekdayMatch) {
        const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const wanted = weekdays.indexOf(weekdayMatch[1]);
        const current = start.getDay();
        let offset = (wanted - current + 7) % 7;
        if (offset === 0) offset = 7;
        start.setDate(start.getDate() + offset);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { label: weekdayMatch[1], start, end };
    }
    const isoMatch = lower.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (isoMatch) {
        const isoStart = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
        if (Number.isNaN(isoStart.getTime())) return null;
        const end = new Date(isoStart);
        end.setDate(end.getDate() + 1);
        return { label: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`, start: isoStart, end };
    }
    return null;
}

function formatCalendarEventDate(value) {
    if (!value) return 'Time TBD';
    const parsed = parseCalendarEventValue(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function summarizeCalendarEvents(events, label) {
    if (!Array.isArray(events) || events.length === 0) {
        return `I do not see any ${label} events in your Google Calendar.`;
    }
    const items = events
        .slice(0, 5)
        .map((event) => {
            const startValue = event?.start?.dateTime || event?.start?.date;
            const when = event?.start?.date ? formatCalendarEventDate(`${startValue}T09:00:00`) : formatCalendarEventDate(startValue);
            return `${event?.summary || 'Untitled'} on ${when}`;
        });
    return `Here are your ${label} events: ${items.join(' · ')}.`;
}

function parseCalendarEventValue(value, fallbackHour = 9) {
    if (!value) return new Date(NaN);
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return new Date(`${value}T${String(fallbackHour).padStart(2, '0')}:00:00`);
    }
    return new Date(value);
}

function startOfCalendarDay(value) {
    const date = normalizeCalendarAnchorDate(value);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addCalendarDays(value, days) {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
}

function addCalendarMonths(value, months) {
    const date = new Date(value);
    date.setMonth(date.getMonth() + months);
    return date;
}

function startOfCalendarWeek(value) {
    const start = startOfCalendarDay(value);
    start.setDate(start.getDate() - start.getDay());
    return start;
}

function startOfCalendarMonth(value) {
    const date = normalizeCalendarAnchorDate(value);
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameCalendarDay(left, right) {
    return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
}

function formatCalendarClock(value) {
    const parsed = parseCalendarEventValue(value);
    if (Number.isNaN(parsed.getTime())) return 'Time TBD';
    return parsed.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
}

function formatCalendarEventTimeRange(event) {
    const startRaw = event?.start?.dateTime || event?.start?.date || event?.start;
    const endRaw = event?.end?.dateTime || event?.end?.date || event?.end;
    if (!startRaw) return 'Time TBD';
    const isAllDay = typeof startRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startRaw);
    if (isAllDay) return 'All day';
    if (!endRaw) return formatCalendarClock(startRaw);
    return `${formatCalendarClock(startRaw)} - ${formatCalendarClock(endRaw)}`;
}

function getCalendarPanelState(request = {}) {
    const explicitMode = 'month';
    const label = String(request.label || '').trim().toLowerCase();
    const mode = explicitMode;
    const anchorDate = normalizeCalendarAnchorDate(request.anchorDate || request.timeMin || state.calendarAnchorDate || new Date());
    const monthStart = startOfCalendarMonth(anchorDate);
    const gridStart = startOfCalendarWeek(monthStart);
    const gridEnd = addCalendarDays(gridStart, 42);
    return {
        view: 'month',
        anchorDate,
        visibleStart: gridStart,
        visibleEnd: gridEnd,
        fetchStart: gridStart,
        fetchEnd: gridEnd,
        title: anchorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        subtitle: anchorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        label: request.label || 'month'
    };
}

function shiftCalendarViewRequest(request = {}, direction = 0) {
    const panelState = getCalendarPanelState(request);
    const step = Number(direction) || 0;
    if (!step) {
        return {
            ...request,
            anchorDate: new Date().toISOString(),
            view: 'month'
        };
    }
    const nextAnchor = addCalendarMonths(panelState.anchorDate, step);
    return {
        ...request,
        anchorDate: nextAnchor.toISOString(),
        view: 'month'
    };
}

function formatCalendarDateKey(value) {
    const date = startOfCalendarDay(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getSelectedCalendarDate(request = {}, panelState = getCalendarPanelState(request)) {
    const raw = request.selectedDate || request.focusDate || '';
    if (!raw) {
        const fallback = startOfCalendarDay(request.anchorDate || panelState.anchorDate);
        return fallback >= panelState.visibleStart && fallback < panelState.visibleEnd ? fallback : null;
    }
    const parsed = startOfCalendarDay(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    if (parsed < panelState.visibleStart || parsed >= panelState.visibleEnd) return null;
    return parsed;
}

function resolveCalendarSelectedDate(dayNumber, request = {}) {
    const normalizedDay = Number(dayNumber);
    if (!Number.isInteger(normalizedDay) || normalizedDay < 1 || normalizedDay > 31) return null;

    const baseAnchor = normalizeCalendarAnchorDate(request.anchorDate || state.calendarAnchorDate || new Date());
    const selected = new Date(baseAnchor.getFullYear(), baseAnchor.getMonth(), normalizedDay);
    if (Number.isNaN(selected.getTime())) return null;
    if (selected.getMonth() !== baseAnchor.getMonth()) return null;
    return selected;
}

function getCalendarReferenceDate() {
    return normalizeCalendarAnchorDate(
        state.activeCalendarViewRequest?.anchorDate
        || state.calendarAnchorDate
        || new Date()
    );
}

function parseCalendarDayWordFromText(text) {
    const lower = normalizeVoiceTokens(text);
    const dayWords = {
        one: 1, first: 1,
        two: 2, second: 2,
        three: 3, third: 3,
        four: 4, fourth: 4,
        five: 5, fifth: 5,
        six: 6, sixth: 6,
        seven: 7, seventh: 7,
        eight: 8, eighth: 8,
        nine: 9, ninth: 9,
        ten: 10, tenth: 10,
        eleven: 11, eleventh: 11,
        twelve: 12, twelfth: 12,
        thirteen: 13, thirteenth: 13,
        fourteen: 14, fourteenth: 14,
        fifteen: 15, fifteenth: 15,
        sixteen: 16, sixteenth: 16,
        seventeen: 17, seventeenth: 17,
        eighteen: 18, eighteenth: 18,
        nineteen: 19, nineteenth: 19,
        twenty: 20, twentieth: 20,
        'twenty one': 21, 'twenty first': 21,
        'twenty two': 22, 'twenty second': 22,
        'twenty three': 23, 'twenty third': 23,
        'twenty four': 24, 'twenty fourth': 24,
        'twenty five': 25, 'twenty fifth': 25,
        'twenty six': 26, 'twenty sixth': 26,
        'twenty seven': 27, 'twenty seventh': 27,
        'twenty eight': 28, 'twenty eighth': 28,
        'twenty nine': 29, 'twenty ninth': 29,
        thirty: 30, thirtieth: 30,
        'thirty one': 31, 'thirty first': 31
    };
    const compact = lower.replace(/-/g, ' ');
    for (const [phrase, day] of Object.entries(dayWords)) {
        const re = new RegExp(`\\b(?:day\\s+|the\\s+)?${phrase}\\b`);
        if (re.test(compact)) return day;
    }
    return null;
}

function parseCalendarDayNumberFromText(text) {
    const lower = normalizeVoiceTokens(text);
    const match = lower.match(/\bday\s+(\d{1,2})(?:st|nd|rd|th)?\b|\b(?:the\s+)?(\d{1,2})(st|nd|rd|th)\b/);
    const dayNumber = Number(match?.[1] || match?.[2] || parseCalendarDayWordFromText(lower) || 0);
    return Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= 31 ? dayNumber : null;
}

function getCalendarDateFromCommand(text, request = {}) {
    const explicitDate = parseMonthDayReferenceFromText(text);
    if (explicitDate) return explicitDate;
    const parsedDate = parseVoiceDateFromText(text);
    if (parsedDate) return parsedDate;
    const dayNumber = parseCalendarDayNumberFromText(text);
    if (dayNumber) {
        return resolveCalendarSelectedDate(dayNumber, request);
    }
    return null;
}

function parseMonthDayReferenceFromText(text) {
    const lower = normalizeVoiceTokens(text);
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const firstPattern = lower.match(/\bday\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
    const secondPattern = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
    const thirdPattern = lower.match(/\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)(?:\s+of)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
    const dayNumber = Number(firstPattern?.[1] || secondPattern?.[2] || thirdPattern?.[1] || 0);
    const monthName = firstPattern?.[2] || secondPattern?.[1] || thirdPattern?.[2] || '';
    const monthIndex = months.indexOf(monthName);
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31 || monthIndex < 0) return null;

    const now = new Date();
    const year = now.getFullYear();
    const date = new Date(year, monthIndex, dayNumber);
    if (Number.isNaN(date.getTime()) || date.getMonth() !== monthIndex) return null;
    return date;
}

function createEmptyLastContext() {
    return {
        lastUserQuery: '',
        lastChartTitle: '',
        lastChartData: null,
        lastYoutubeUrl: null,
        lastYoutubeEmbedUrl: null,
        lastYoutubeVideoId: null,
        lastYoutubeSearchResults: null,
        lastYoutubeQuery: null,
        lastYoutubeSearchIndex: 0,
        lastLocation: '',
        lastSearchTopic: '',
        lastIntentActions: [],
        lastProductLinks: [],
        lastProductPreviewDataUrl: '',
        lastProductRetailer: '',
        lastRecipeQuery: '',
        lastRecipeText: '',
        lastDesignDataUrl: '',
        lastDesignPrompt: '',
        lastWeather: null,
        lastWeatherLocation: ''
    };
}

function resetBlipConversationMemory() {
    state.history = [];
    state.lastContext = createEmptyLastContext();
    state.pendingCalendarDraft = null;
    contextAgent.reset();
    try { localStorage.removeItem(HISTORY_STORAGE_KEY); } catch (e) { }
}

async function focusCalendarDaySelection(dayNumber, options = {}) {
    const baseRequest = state.activeCalendarViewRequest || {
        label: 'month',
        view: 'month',
        anchorDate: state.calendarAnchorDate
    };
    const selectionRequest = options.anchorDate ? { ...baseRequest, anchorDate: options.anchorDate } : baseRequest;
    const selectedDate = resolveCalendarSelectedDate(dayNumber, selectionRequest);
    if (!selectedDate) {
        return { ok: false, text: `Day ${dayNumber} is not available in this month.` };
    }

    const selectedKey = formatCalendarDateKey(selectedDate);
    const shouldToggle = options.toggle === true;
    const nextSelectedDate = shouldToggle && baseRequest.selectedDate === selectedKey ? '' : selectedKey;
    const nextRequest = {
        ...selectionRequest,
        view: 'month',
        anchorDate: selectedDate.toISOString(),
        selectedDate: nextSelectedDate,
        selectedHour: ''
    };

    await showCalendarOverview(nextRequest);
    return {
        ok: true,
        text: nextSelectedDate
            ? `Focused day ${dayNumber} in your calendar.`
            : `Collapsed day ${dayNumber}.`
    };
}

async function focusCalendarHourSelection(hour, options = {}) {
    const normalizedHour = Number(hour);
    if (!Number.isInteger(normalizedHour) || normalizedHour < 0 || normalizedHour > 23) {
        return { ok: false, text: 'That time slot is not available.' };
    }
    const baseRequest = state.activeCalendarViewRequest || {
        label: 'month',
        view: 'month',
        anchorDate: state.calendarAnchorDate || new Date().toISOString()
    };
    const selectedDate = getSelectedCalendarDate(baseRequest) || startOfCalendarDay(baseRequest.anchorDate || new Date());
    const nextRequest = {
        ...baseRequest,
        view: 'month',
        anchorDate: selectedDate.toISOString(),
        selectedDate: formatCalendarDateKey(selectedDate),
        selectedHour: normalizedHour
    };
    await showCalendarOverview(nextRequest);
    return {
        ok: true,
        text: `Focused ${new Date(2000, 0, 1, normalizedHour).toLocaleTimeString('en-US', { hour: 'numeric' })} on ${selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`
    };
}

function getEventsForCalendarDay(events, dayDate) {
    return (Array.isArray(events) ? events : [])
        .filter((event) => {
            const start = parseCalendarEventValue(event?.start?.dateTime || event?.start?.date || event?.start);
            return !Number.isNaN(start.getTime()) && isSameCalendarDay(start, dayDate);
        })
        .sort((left, right) => parseCalendarEventValue(left?.start?.dateTime || left?.start?.date || left?.start).getTime() - parseCalendarEventValue(right?.start?.dateTime || right?.start?.date || right?.start).getTime());
}

function buildCalendarEventPill(event, compact = false) {
    const sourceLabel = event?.source === 'pending' ? 'Pending' : 'Synced';
    return `<div class="blip-calendar-event${compact ? ' compact' : ''}" data-calendar-event-id="${escapeHtml(String(event?.id || ''))}">
        <button type="button" class="blip-calendar-event-delete" data-calendar-delete-event="${escapeHtml(String(event?.id || ''))}" aria-label="Delete ${escapeHtml(event?.summary || 'calendar event')}" title="Delete event">×</button>
        <div class="blip-calendar-event-time">${escapeHtml(formatCalendarEventTimeRange(event))}</div>
        <div class="blip-calendar-event-title">${escapeHtml(event?.summary || 'Untitled')}</div>
        <div class="blip-calendar-event-meta">${escapeHtml(sourceLabel)}</div>
    </div>`;
}

function buildExpandedCalendarDayHtml(day, dayEvents) {
    return `<div class="blip-calendar-day-expanded">
        <div class="blip-calendar-day-expanded-head">
            <div class="blip-calendar-day-expanded-title">${day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <div class="blip-calendar-day-expanded-copy">${dayEvents.length ? `${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : 'No events on this day'}</div>
        </div>
        <div class="blip-calendar-day-expanded-list">
            ${dayEvents.length
                ? dayEvents.map((event) => buildCalendarEventPill(event)).join('')
                : '<div class="blip-calendar-empty">No events</div>'}
        </div>
    </div>`;
}

function buildCalendarSelectedDayTimelineHtml(events, panelState, selectedDay, selectedHour = null) {
    const dayEvents = getEventsForCalendarDay(events, selectedDay);
    const allDayEvents = dayEvents.filter((event) => {
        const startRaw = event?.start?.dateTime || event?.start?.date || event?.start;
        return typeof startRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startRaw);
    });
    const timedEvents = dayEvents.filter((event) => !allDayEvents.includes(event));
    const hourRows = Array.from({ length: 24 }, (_, hour) => {
        const eventsAtHour = timedEvents.filter((event) => {
            const start = parseCalendarEventValue(event?.start?.dateTime || event?.start?.date || event?.start);
            return start.getHours() === hour;
        });
        const hourLabel = new Date(2000, 0, 1, hour).toLocaleTimeString('en-US', {
            hour: 'numeric'
        });
        const isSelectedHour = Number.isInteger(selectedHour) && selectedHour === hour;
        return `<div class="blip-calendar-hour-row${isSelectedHour ? ' is-selected' : ''}" data-calendar-hour="${hour}">
            <div class="blip-calendar-hour-label">${hourLabel}</div>
            <div class="blip-calendar-hour-content">
                ${eventsAtHour.length
                    ? eventsAtHour.map((event) => buildCalendarEventPill(event)).join('')
                    : '<div class="blip-calendar-hour-empty"></div>'}
            </div>
        </div>`;
    }).join('');
    return `
        <div class="blip-calendar-day-view">
            <div class="blip-calendar-day-banner">
                <div class="blip-calendar-day-banner-title">${selectedDay.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                <div class="blip-calendar-day-banner-date">${selectedDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</div>
            </div>
            ${allDayEvents.length ? `<div class="blip-calendar-all-day">
                <div class="blip-calendar-all-day-title">All day</div>
                <div class="blip-calendar-day-list">${allDayEvents.map((event) => buildCalendarEventPill(event)).join('')}</div>
            </div>` : ''}
            <div class="blip-calendar-day-hours">
                ${hourRows}
            </div>
        </div>
    `;
}

function buildCalendarMonthHtml(events, panelState) {
    const days = Array.from({ length: 42 }, (_, index) => addCalendarDays(panelState.visibleStart, index));
    const selectedDay = getSelectedCalendarDate(state.activeCalendarViewRequest || {}, panelState);
    const selectedHour = Number.isInteger(state.activeCalendarViewRequest?.selectedHour)
        ? state.activeCalendarViewRequest.selectedHour
        : null;
    return `
        <div class="blip-calendar-weekdays">
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => `<div class="blip-calendar-weekday-label">${label}</div>`).join('')}
        </div>
        <div class="blip-calendar-month-grid">
            ${days.map((day) => {
                const dayEvents = getEventsForCalendarDay(events, day);
                const isCurrentMonth = day.getMonth() === panelState.anchorDate.getMonth();
                const isToday = isSameCalendarDay(day, new Date());
                const isSelected = selectedDay ? isSameCalendarDay(day, selectedDay) : false;
                const visibleEvents = dayEvents.slice(0, 3);
                const overflowCount = Math.max(0, dayEvents.length - visibleEvents.length);
                return `<section class="blip-calendar-month-cell${isCurrentMonth ? '' : ' is-muted'}${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}" data-calendar-select-day="${formatCalendarDateKey(day)}">
                    <div class="blip-calendar-month-date">${day.getDate()}</div>
                    <div class="blip-calendar-month-events">
                        ${visibleEvents.map((event) => buildCalendarEventPill(event, true)).join('') || '<div class="blip-calendar-empty small">No events</div>'}
                        ${overflowCount ? `<div class="blip-calendar-more">+${overflowCount} more</div>` : ''}
                    </div>
                </section>`;
            }).join('')}
        </div>
        ${selectedDay ? buildCalendarSelectedDayTimelineHtml(events, panelState, selectedDay, selectedHour) : ''}
    `;
}

function buildCalendarAgendaHtml(events, calendarUrl, request = {}) {
    const pendingCount = (state.pendingCalendarEvents || []).length;
    const pendingDeleteCount = (state.pendingCalendarDeletes || []).length;
    const authState = getGoogleCalendarAuthState();
    const panelState = getCalendarPanelState(request);
    const eventList = Array.isArray(events) ? events : [];
    const bodyHtml = buildCalendarMonthHtml(eventList, panelState);
    const statusBits = [
        authState.connected ? 'Google sync active.' : 'Local mode active.',
        pendingCount ? `${pendingCount} pending add${pendingCount === 1 ? '' : 's'}.` : '',
        pendingDeleteCount ? `${pendingDeleteCount} pending delete${pendingDeleteCount === 1 ? '' : 's'}.` : ''
    ].filter(Boolean).join(' ');

    return `
        <div class="blip-calendar-shell">
            <div class="blip-calendar-topbar">
                <div>
                    <div class="blip-calendar-kicker">Blip Calendar</div>
                    <div class="blip-calendar-title">${escapeHtml(panelState.title)}</div>
                    <div class="blip-calendar-subtitle">${escapeHtml(panelState.subtitle)}</div>
                </div>
                <div class="blip-calendar-topbar-actions">
                    <button type="button" class="blip-calendar-nav-btn" data-calendar-nav="prev" aria-label="Previous range">←</button>
                    <button type="button" class="blip-calendar-nav-btn" data-calendar-nav="today">Today</button>
                    <button type="button" class="blip-calendar-nav-btn" data-calendar-nav="next" aria-label="Next range">→</button>
                </div>
            </div>
            <div class="blip-calendar-toolbar">
                <div class="blip-calendar-view-switch" aria-label="Calendar mode">
                    <div class="blip-calendar-view-pill is-active">Month</div>
                </div>
                <a href="${calendarUrl}" target="_blank" class="blip-calendar-google-link">Open Google</a>
            </div>
            <div class="blip-calendar-status${authState.connected ? ' connected' : ''}">${escapeHtml(statusBits || 'Calendar ready.')}</div>
            <div class="blip-calendar-body" data-calendar-view-mode="${panelState.view}">
                ${bodyHtml}
            </div>
        </div>
    `;
}

function getCachedCalendarEvents(request = {}) {
    const timeMin = request.timeMin ? new Date(request.timeMin).getTime() : null;
    const timeMax = request.timeMax ? new Date(request.timeMax).getTime() : null;
    return (state.calendarCache || []).filter((event) => {
        const start = parseCalendarEventValue(event.start).getTime();
        if (Number.isNaN(start)) return false;
        if (timeMin && start < timeMin) return false;
        if (timeMax && start > timeMax) return false;
        return true;
    });
}

function getCalendarEventsInRange(timeMin, timeMax) {
    return getCachedCalendarEvents({ timeMin, timeMax });
}

function getNextUpcomingCalendarEvent(fromValue = new Date()) {
    const fromTime = normalizeCalendarAnchorDate(fromValue).getTime();
    return (state.calendarCache || [])
        .map(normalizeCachedCalendarEvent)
        .filter((event) => parseCalendarEventValue(event.start).getTime() >= fromTime)
        .sort((left, right) => parseCalendarEventValue(left.start).getTime() - parseCalendarEventValue(right.start).getTime())[0] || null;
}

async function ensureGoogleCalendarConnected(options = {}) {
    const authState = getGoogleCalendarAuthState();
    if (authState.connected) return true;
    if (!authState.backendConfigured && !state.googleCalendarClientId.trim()) return false;
    if (options.allowPrompt !== true) return false;

    try {
        await connectGoogleCalendar();
        return true;
    } catch (error) {
        if (!options.silent) {
            console.warn('Automatic Google Calendar reconnect failed:', error?.message || error);
        }
        return false;
    }
}

async function syncPendingCalendarDeletes() {
    const authState = getGoogleCalendarAuthState();
    if (!authState.connected || !(state.pendingCalendarDeletes || []).length) return 0;

    let deleted = 0;
    for (const pendingDelete of state.pendingCalendarDeletes.map(normalizePendingCalendarDelete).filter(Boolean)) {
        try {
            await deleteGoogleCalendarEvent(pendingDelete.id);
            clearPendingCalendarDeleteById(pendingDelete.id);
            deleted += 1;
        } catch (error) {
            if (error?.code === 'calendar_auth_required') break;
            if (/not\s+found/i.test(error?.message || '')) {
                clearPendingCalendarDeleteById(pendingDelete.id);
                deleted += 1;
                continue;
            }
            console.warn('Pending calendar delete sync failed:', error?.message || error);
        }
    }

    return deleted;
}

async function syncPendingCalendarEvents() {
    const authState = getGoogleCalendarAuthState();
    if (!authState.connected || !(state.pendingCalendarEvents || []).length) return 0;

    const synced = [];
    for (const pendingEvent of state.pendingCalendarEvents) {
        try {
            const created = await createGoogleCalendarEvent({
                title: pendingEvent.summary,
                description: pendingEvent.description || '',
                start: pendingEvent.start,
                end: pendingEvent.end,
                reminderMinutes: pendingEvent.reminderMinutes || 0
            });
            synced.push({
                ...created,
                id: created?.id || pendingEvent.id
            });
            removePendingCalendarEventById(pendingEvent.id);
        } catch (error) {
            if (error?.code === 'calendar_auth_required') break;
            console.warn('Pending calendar sync failed:', error?.message || error);
        }
    }

    if (synced.length) {
        mergeCalendarCache(synced.map((event) => ({
            id: event.id,
            summary: event.summary,
            start: event?.start?.dateTime || event?.start?.date,
            end: event?.end?.dateTime || event?.end?.date,
            htmlLink: event.htmlLink,
            source: 'google'
        })));
    }

    return synced.length;
}

async function syncGoogleCalendarIntoBlip(options = {}) {
    const authState = getGoogleCalendarAuthState();
    if (!authState.connected) {
        return {
            ok: false,
            message: 'Google Calendar is not connected. Press Connect Calendar in Settings first.'
        };
    }

    const timeMin = options.timeMin || (() => {
        const start = new Date();
        start.setDate(start.getDate() - 30);
        return start.toISOString();
    })();
    const timeMax = options.timeMax || (() => {
        const end = new Date();
        end.setDate(end.getDate() + 180);
        return end.toISOString();
    })();

    const events = await listGoogleCalendarEvents({
        timeMin,
        timeMax,
        maxResults: Math.max(60, Number(options.maxResults) || 200)
    });

    mergeCalendarCache(events.map((event) => ({
        id: event.id,
        summary: event.summary,
        start: event?.start?.dateTime || event?.start?.date,
        end: event?.end?.dateTime || event?.end?.date,
        htmlLink: event.htmlLink,
        source: 'google'
    })));

    return {
        ok: true,
        count: events.length,
        message: events.length
            ? `Synced ${events.length} Google Calendar events into Blip Calendar.`
            : 'Google Calendar synced. No upcoming events found.'
    };
}

async function syncCalendars(direction = 'both') {
    const messages = [];
    let ok = false;
    const authState = getGoogleCalendarAuthState();

    if (authState.connected) {
        try {
            const deleted = await syncPendingCalendarDeletes();
            if (deleted) {
                messages.push(`Removed ${deleted} queued Google Calendar delete${deleted === 1 ? '' : 's'}.`);
                ok = true;
            }
        } catch (error) {
            messages.push(error?.message || 'Could not finish queued calendar deletions.');
        }
    }

    if (direction === 'google_to_blip' || direction === 'both') {
        try {
            const imported = await syncGoogleCalendarIntoBlip();
            messages.push(imported.message);
            ok = ok || imported.ok;
        } catch (error) {
            messages.push(error?.message || 'Could not sync Google Calendar into Blip.');
        }
    }

    if (direction === 'blip_to_google' || direction === 'both') {
        const nextAuthState = getGoogleCalendarAuthState();
        if (!nextAuthState.connected) {
            messages.push('Google Calendar is not connected, so pending Blip events could not sync yet.');
        } else {
            try {
                const synced = await syncPendingCalendarEvents();
                messages.push(synced
                    ? `Synced ${synced} Blip event${synced === 1 ? '' : 's'} to Google Calendar.`
                    : 'No pending Blip events needed syncing to Google Calendar.');
                ok = true;
            } catch (error) {
                messages.push(error?.message || 'Could not sync Blip Calendar to Google.');
            }
        }
    }

    return {
        ok,
        text: messages.join(' ')
    };
}

async function deleteCalendarEventByTitle(titleQuery) {
    const matches = findCalendarEventsByTitle(titleQuery);
    if (!matches.length) {
        return { ok: false, text: `I could not find a calendar event called ${toTitleWords(titleQuery)}.` };
    }
    if (matches.length > 1) {
        return { ok: false, text: `I found multiple events matching ${toTitleWords(titleQuery)}. Say the full event name.` };
    }

    return deleteCalendarEventById(matches[0].id);
}

async function deleteCalendarEventById(eventId) {
    const event = (state.calendarCache || []).find((entry) => entry?.id === eventId);
    if (!event) {
        return { ok: false, text: 'I could not find that calendar event.' };
    }
    if (event.source === 'pending') {
        removePendingCalendarEventById(event.id);
        return { ok: true, text: `Deleted ${event.summary} from Blip Calendar.` };
    }

    if (!getGoogleCalendarAuthState().connected) {
        queuePendingCalendarDelete(event);
        return { ok: true, text: `Removed ${event.summary} from Blip Calendar. I will delete it from Google when sync is back.` };
    }

    await deleteGoogleCalendarEvent(event.id);
    clearPendingCalendarDeleteById(event.id);
    removeCalendarEventFromCache(event.id);
    return { ok: true, text: `Deleted ${event.summary} from your calendar.` };
}

async function moveCalendarEventByTitle(titleQuery, startDate) {
    const matches = findCalendarEventsByTitle(titleQuery);
    if (!matches.length) {
        return { ok: false, text: `I could not find a calendar event called ${toTitleWords(titleQuery)}.` };
    }
    if (matches.length > 1) {
        return { ok: false, text: `I found multiple events matching ${toTitleWords(titleQuery)}. Say the full event name.` };
    }

    const event = matches[0];
    const oldStart = new Date(event.start);
    const oldEnd = new Date(event.end || event.start);
    const durationMs = Math.max(30 * 60 * 1000, oldEnd.getTime() - oldStart.getTime() || 60 * 60 * 1000);
    const nextEnd = new Date(startDate.getTime() + durationMs);

    if (event.source === 'pending') {
        updatePendingCalendarEventById(event.id, {
            start: startDate.toISOString(),
            end: nextEnd.toISOString()
        });
        return { ok: true, text: `Moved ${event.summary} to ${formatCalendarEventDate(startDate.toISOString())}.` };
    }

    if (!getGoogleCalendarAuthState().connected) {
        return { ok: false, text: `I found ${event.summary}, but I need Google Calendar connected to move synced events.` };
    }

    const updated = await updateGoogleCalendarEvent(event.id, {
        title: event.summary,
        start: startDate.toISOString(),
        end: nextEnd.toISOString()
    });
    upsertCalendarEventInCache({
        id: updated?.id || event.id,
        summary: updated?.summary || event.summary,
        start: updated?.start?.dateTime || updated?.start?.date || startDate.toISOString(),
        end: updated?.end?.dateTime || updated?.end?.date || nextEnd.toISOString(),
        htmlLink: updated?.htmlLink || event.htmlLink || '',
        source: 'google'
    });
    return { ok: true, text: `Moved ${event.summary} to ${formatCalendarEventDate(startDate.toISOString())}.` };
}

async function deleteCalendarEventsInRange(request) {
    const matches = getCalendarEventsInRange(request.timeMin, request.timeMax);
    if (!matches.length) {
        return { ok: false, text: `I did not find any events for ${request.label}.` };
    }

    let deleted = 0;
    let queuedDeletes = 0;
    for (const event of matches) {
        if (event.source === 'pending') {
            removePendingCalendarEventById(event.id);
            deleted += 1;
            continue;
        }
        if (!getGoogleCalendarAuthState().connected) {
            queuePendingCalendarDelete(event);
            deleted += 1;
            queuedDeletes += 1;
            continue;
        }
        await deleteGoogleCalendarEvent(event.id);
        clearPendingCalendarDeleteById(event.id);
        removeCalendarEventFromCache(event.id);
        deleted += 1;
    }

    if (!deleted) {
        return { ok: false, text: `I found events for ${request.label}, but I need Google Calendar connected to remove synced ones.` };
    }
    return {
        ok: true,
        text: queuedDeletes
            ? `Removed ${deleted} event${deleted === 1 ? '' : 's'} for ${request.label}. ${queuedDeletes} Google delete${queuedDeletes === 1 ? '' : 's'} will finish on the next sync.`
            : `Deleted ${deleted} event${deleted === 1 ? '' : 's'} for ${request.label}.`
    };
}

async function moveCalendarEventsToOtherDay(request) {
    const matches = getCalendarEventsInRange(request.sourceTimeMin, request.sourceTimeMax);
    if (!matches.length) {
        return { ok: false, text: `I did not find any events on ${request.sourceLabel}.` };
    }

    let moved = 0;
    for (const event of matches) {
        const oldStart = new Date(event.start);
        const oldEnd = new Date(event.end || event.start);
        if (Number.isNaN(oldStart.getTime())) continue;

        const nextStart = new Date(request.targetDayStart);
        nextStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
        const durationMs = Math.max(30 * 60 * 1000, oldEnd.getTime() - oldStart.getTime() || 60 * 60 * 1000);
        const nextEnd = new Date(nextStart.getTime() + durationMs);

        if (event.source === 'pending') {
            updatePendingCalendarEventById(event.id, {
                start: nextStart.toISOString(),
                end: nextEnd.toISOString()
            });
            moved += 1;
            continue;
        }
        if (!getGoogleCalendarAuthState().connected) {
            continue;
        }
        const updated = await updateGoogleCalendarEvent(event.id, {
            title: event.summary,
            start: nextStart.toISOString(),
            end: nextEnd.toISOString()
        });
        upsertCalendarEventInCache({
            id: updated?.id || event.id,
            summary: updated?.summary || event.summary,
            start: updated?.start?.dateTime || updated?.start?.date || nextStart.toISOString(),
            end: updated?.end?.dateTime || updated?.end?.date || nextEnd.toISOString(),
            htmlLink: updated?.htmlLink || event.htmlLink || '',
            source: 'google'
        });
        moved += 1;
    }

    if (!moved) {
        return { ok: false, text: `I found events on ${request.sourceLabel}, but I need Google Calendar connected to move synced ones.` };
    }
    return { ok: true, text: `Moved ${moved} event${moved === 1 ? '' : 's'} from ${request.sourceLabel} to the new day, keeping the same time.` };
}

async function showCalendarOverview(request = { label: 'upcoming' }) {
    closeAuxiliaryPanelsForCalendar();
    const panelState = getCalendarPanelState(request);
    const panelRequest = {
        ...request,
        view: panelState.view,
        anchorDate: panelState.anchorDate.toISOString(),
        timeMin: panelState.fetchStart.toISOString(),
        timeMax: panelState.fetchEnd.toISOString(),
        maxResults: request.maxResults || (panelState.view === 'month' ? 200 : 120)
    };
    state.activeCalendarViewRequest = panelRequest;
    setCalendarDisplayMode(panelState.view);
    setCalendarAnchorDate(panelState.anchorDate);
    const calendarUrl = 'https://calendar.google.com/calendar/u/0/r';
    const initiallyConnected = await ensureGoogleCalendarConnected({ silent: true });
    const authState = getGoogleCalendarAuthState();

    if (!initiallyConnected || !authState.connected) {
        const cachedEvents = getCachedCalendarEvents(panelRequest);
        const pendingCount = (state.pendingCalendarEvents || []).length;
        const cachedHtml = buildCalendarAgendaHtml(cachedEvents, calendarUrl, panelRequest);
        const cachedMessage = cachedEvents.length
            ? 'Blip Calendar open.'
            : `Blip Calendar open.${pendingCount ? ` ${pendingCount} pending event${pendingCount === 1 ? '' : 's'} waiting to sync.` : ''}`;
        renderActionInSidePanel({
            action: 'calendarAgenda',
            tool_params: {
                title: 'Blip Calendar',
                html: cachedHtml
            },
            text: cachedMessage
        });
        return {
            text: cachedMessage,
            extraHtml: `<br>${cachedHtml}`
        };
    }

    try {
        await syncPendingCalendarDeletes();
        await syncPendingCalendarEvents();
        const events = await listGoogleCalendarEvents(panelRequest);
        mergeCalendarCache(events.map((event) => ({
            id: event.id,
            summary: event.summary,
            start: event?.start?.dateTime || event?.start?.date,
            end: event?.end?.dateTime || event?.end?.date,
            htmlLink: event.htmlLink,
            source: 'google'
        })));
        let visibleEvents = getCachedCalendarEvents(panelRequest);
        if (!visibleEvents.length) {
            const extendedStart = new Date(panelState.fetchStart);
            extendedStart.setDate(extendedStart.getDate() - 30);
            const extendedEnd = new Date(panelState.fetchEnd);
            extendedEnd.setDate(extendedEnd.getDate() + 180);
            await syncGoogleCalendarIntoBlip({
                timeMin: extendedStart.toISOString(),
                timeMax: extendedEnd.toISOString(),
                maxResults: 240
            }).catch((syncError) => {
                console.warn('Extended Google Calendar import failed:', syncError?.message || syncError);
            });
            visibleEvents = getCachedCalendarEvents(panelRequest);
        }
        if (!visibleEvents.length && panelState.view !== 'day' && request.autoJump !== false) {
            const nextEvent = getNextUpcomingCalendarEvent(panelState.fetchStart);
            if (nextEvent) {
                return showCalendarOverview({
                    ...panelRequest,
                    anchorDate: nextEvent.start,
                    autoJump: false
                });
            }
        }
        const summary = 'Blip Calendar open.';
        renderActionInSidePanel({
            action: 'calendarAgenda',
            tool_params: {
                title: `Blip Calendar`,
                html: buildCalendarAgendaHtml(visibleEvents, calendarUrl, panelRequest)
            },
            text: summary
        });
        return {
            text: summary,
            extraHtml: `<br>${buildCalendarAgendaHtml(visibleEvents, calendarUrl, panelRequest)}`
        };
    } catch (error) {
        if (error?.code === 'calendar_auth_required') {
            const reconnected = await ensureGoogleCalendarConnected({ silent: true });
            if (reconnected) {
                await syncPendingCalendarDeletes();
                await syncPendingCalendarEvents();
                const events = await listGoogleCalendarEvents(panelRequest);
                mergeCalendarCache(events.map((event) => ({
                    id: event.id,
                    summary: event.summary,
                    start: event?.start?.dateTime || event?.start?.date,
                    end: event?.end?.dateTime || event?.end?.date,
                    htmlLink: event.htmlLink,
                    source: 'google'
                })));
                let visibleEvents = getCachedCalendarEvents(panelRequest);
                if (!visibleEvents.length) {
                    const extendedStart = new Date(panelState.fetchStart);
                    extendedStart.setDate(extendedStart.getDate() - 30);
                    const extendedEnd = new Date(panelState.fetchEnd);
                    extendedEnd.setDate(extendedEnd.getDate() + 180);
                    await syncGoogleCalendarIntoBlip({
                        timeMin: extendedStart.toISOString(),
                        timeMax: extendedEnd.toISOString(),
                        maxResults: 240
                    }).catch((syncError) => {
                        console.warn('Extended Google Calendar import failed:', syncError?.message || syncError);
                    });
                    visibleEvents = getCachedCalendarEvents(panelRequest);
                }
                if (!visibleEvents.length && panelState.view !== 'day' && request.autoJump !== false) {
                    const nextEvent = getNextUpcomingCalendarEvent(panelState.fetchStart);
                    if (nextEvent) {
                        return showCalendarOverview({
                            ...panelRequest,
                            anchorDate: nextEvent.start,
                            autoJump: false
                        });
                    }
                }
                const summary = 'Blip Calendar open.';
                renderActionInSidePanel({
                    action: 'calendarAgenda',
                    tool_params: {
                        title: `Blip Calendar`,
                        html: buildCalendarAgendaHtml(visibleEvents, calendarUrl, panelRequest)
                    },
                    text: summary
                });
                return {
                    text: summary,
                    extraHtml: `<br>${buildCalendarAgendaHtml(visibleEvents, calendarUrl, panelRequest)}`
                };
            }
            const cachedEvents = getCachedCalendarEvents(panelRequest);
            renderActionInSidePanel({
                action: 'calendarAgenda',
                tool_params: {
                    title: 'Blip Calendar',
                    html: buildCalendarAgendaHtml(cachedEvents, calendarUrl, panelRequest)
                },
                text: 'Showing your Blip Calendar.'
            });
            return {
                text: cachedEvents.length
                    ? 'Blip Calendar open.'
                    : 'Blip Calendar open. Google session expired, so press Connect Calendar again in Settings.',
                extraHtml: `<br>${buildCalendarAgendaHtml(cachedEvents, calendarUrl, panelRequest)}`
            };
        }
        throw error;
    }
}

async function forceOpenCalendarOverview(request = { label: 'upcoming' }) {
    try {
        return await showCalendarOverview(request);
    } catch (error) {
        console.warn('Force-open calendar fallback used:', error?.message || error);
        closeAuxiliaryPanelsForCalendar();
        const panelState = getCalendarPanelState(request);
        const panelRequest = {
            ...request,
            view: panelState.view,
            anchorDate: panelState.anchorDate.toISOString(),
            timeMin: panelState.fetchStart.toISOString(),
            timeMax: panelState.fetchEnd.toISOString(),
            maxResults: request.maxResults || (panelState.view === 'month' ? 200 : 120)
        };
        state.activeCalendarViewRequest = panelRequest;
        setCalendarDisplayMode(panelState.view);
        setCalendarAnchorDate(panelState.anchorDate);
        const calendarUrl = 'https://calendar.google.com/calendar/u/0/r';
        const cachedEvents = getCachedCalendarEvents(panelRequest);
        const pendingCount = (state.pendingCalendarEvents || []).length;
        const html = buildCalendarAgendaHtml(cachedEvents, calendarUrl, panelRequest);
        const text = cachedEvents.length
            ? 'Blip Calendar open.'
            : `Blip Calendar open.${pendingCount ? ` ${pendingCount} pending event${pendingCount === 1 ? '' : 's'} waiting to sync.` : ''}`;
        renderActionInSidePanel({
            action: 'calendarAgenda',
            tool_params: {
                title: 'Blip Calendar',
                html
            },
            text
        });
        return {
            text,
            extraHtml: `<br>${html}`
        };
    }
}

async function refreshOpenCalendarPanel() {
    const sidePanel = document.getElementById('blip-side-panel');
    if (!sidePanel || sidePanel.style.display === 'none') return null;
    if (!sidePanel.classList.contains('blip-calendar-orb')) return null;
    const request = state.activeCalendarViewRequest || { label: 'upcoming' };
    return showCalendarOverview(request);
}

function getPersonalizationVoiceCommand(cmd) {
    if (!ENABLE_BLIP_PERSONALIZATION) return null;
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    const colors = 'white|blue|green|amber|purple|pink|cyan';
    const auraColors = 'default|blue|green|gold|pink|purple|cyan';

    if (/\b(reset|default)\s+(?:style|look|personalization|appearance)\b/.test(lower)) {
        return { action: 'reset' };
    }

    if (/\b(remove|no)\s+(?:the\s+)?hat\b|\bhat\s+off\b/.test(lower)) {
        return { action: 'hat', value: 'none' };
    }
    const hatMatch = lower.match(/\b(?:wear|put(?:\s+on)?|add|set|use|show|give\s+yourself)\s+(?:a|an|some|the)?\s*(cap|beanie|crown|hat)\b|\bhat\s+(cap|beanie|crown)\b/);
    if (hatMatch) {
        const style = hatMatch[1] || hatMatch[2] || 'cap';
        return { action: 'hat', value: style === 'hat' ? 'cap' : style };
    }

    if (/\b(remove|no)\s+(?:the\s+)?glasses\b|\bglasses\s+off\b|\bvisor\s+off\b/.test(lower)) {
        return { action: 'glasses', value: 'none' };
    }
    const glassesMatch = lower.match(/\b(?:wear|put(?:\s+on)?|add|set|use|show|give\s+yourself)\s+(?:a|an|some|the)?\s*(round\s+glasses|glasses|visor)\b|\bglasses\s+(round|visor)\b/);
    if (glassesMatch) {
        const style = (glassesMatch[1] || glassesMatch[2] || '').includes('visor') ? 'visor' : 'round';
        return { action: 'glasses', value: style };
    }

    const eyeExplicitRe = new RegExp(`\\b(?:set|change|make|turn)\\s+(?:the\\s+)?(?:color|colour)(?:\\s+of\\s+(?:your\\s+)?)?eyes?\\s*(?:to\\s+)?(${colors})\\b|\\b(?:set|change|make|turn)\\s+(?:your\\s+)?eyes?(?:\\s+(?:color|colour))?\\s*(?:to\\s+)?(${colors})\\b|\\beyes?\\s+(?:color\\s+)?(${colors})\\b`);
    const eyeMatch = lower.match(eyeExplicitRe);
    if (eyeMatch) {
        const value = eyeMatch[1] || eyeMatch[2] || eyeMatch[3];
        if (value) return { action: 'eyeColor', value };
    }
    const eyeIntent = /\b(eye|eyes)\b/.test(lower) && /\b(color|colour|set|change|make|turn)\b/.test(lower);
    if (eyeIntent) return { action: 'eyeColorPrompt' };

    const auraColorRe = new RegExp(`\\b(?:set|change|make)\\s+(?:your\\s+)?aura\\s+(?:color\\s+)?(?:to\\s+)?(${auraColors})\\b|\\baura\\s+(?:color\\s+)?(${auraColors})\\b`);
    const auraMatch = lower.match(auraColorRe);
    if (auraMatch) {
        const value = auraMatch[1] || auraMatch[2];
        if (value) return { action: 'auraColor', value };
    }
    const auraIntent = /\baura\b/.test(lower) && /\b(color|colour|set|change|make)\b/.test(lower);
    if (auraIntent) return { action: 'auraColorPrompt' };

    return null;
}

function getDirectSaveVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    if (!/\b(save|store|keep|remember)\b/.test(lower)) return null;
    if (/\b(?:playlist|favorites?)\b/.test(lower) && /\b(?:video|youtube|yt|song|music|it|this|that)\b/.test(lower)) return null;
    const isPronounSave = /\b(save|store|keep|remember)\s+(it|this|that)\b/.test(lower);

    if (/\b(recipe|meal)\b/.test(lower)) return 'saveRecipe';
    if (/\b(map|location|place|route|direction)\b/.test(lower)) return 'saveMap';
    if (/\b(to|in)\s+(media|gallery|photos?|pictures?|images?|shots?)\b/.test(lower)) return 'savePhoto';
    if (/\b(to|in)\s+creations?\b/.test(lower)) return 'saveCreation';
    if (/\b(graph|chart|design|drawing|creation|art)\b/.test(lower)) return 'saveCreation';
    if (/\b(photo|picture|image|snapshot|shot|camera)\b/.test(lower)) return 'savePhoto';

    // Context-based fallback for short commands like "save it".
    if (isPronounSave) {
        if (state.currentMode === 'map' || mapFrame?.src || state.lastContext?.lastLocation) return 'saveMap';
        if (state.currentMode === 'chart') return 'saveCreation';
        if (canSaveCurrentImageFromPanel()) return 'savePhoto';
        const sidePanel = document.getElementById('blip-side-panel');
        if (sidePanel && sidePanel.style.display !== 'none') return 'saveCreation';
        if (state.currentMode === 'vision' || state.cameraStream || state.pendingImage) return 'savePhoto';
    }
    return null;
}

function getYouTubeSaveVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    if (!/\b(save|store|keep|remember|add)\b/.test(lower)) return null;

    const explicitVideoSave = /\b(video|youtube|yt|song|music|playlist|favorites?|later)\b/.test(lower);
    const pronounSave = /\b(save|store|keep|remember|add)\s+(it|this|that)\b/.test(lower);
    if (!explicitVideoSave && !(pronounSave && isVideoPanelVisible())) return null;

    const categoryPlaylist = resolveVideoPlaylistFromVoice(lower);
    if (categoryPlaylist) {
        return { action: 'saveVideoPlaylist', playlistName: categoryPlaylist };
    }

    if (/\bplaylist\b/.test(lower)) {
        const namedPatterns = [
            /\bplaylist(?:\s+called|\s+named)\s+(.+?)(?:\s+(?:and|then)\s+(?:save|store|keep|add|put|play|open|watch)\b[\s\S]*)?$/i,
            /\b(?:to|in)\s+(?:my\s+)?playlist\s+(.+?)(?:\s+(?:and|then)\s+(?:save|store|keep|add|put|play|open|watch)\b[\s\S]*)?$/i,
            /\b(?:to|in)\s+(?:my\s+)?(.+?)\s+playlist\b/
        ];
        for (const re of namedPatterns) {
            const match = lower.match(re);
            if (!match?.[1]) continue;
            const playlistName = normalizeVideoPlaylistName(match[1]);
            return { action: 'saveVideoPlaylist', playlistName };
        }
        return { action: 'saveVideoPlaylist', playlistName: DEFAULT_VIDEO_PLAYLIST };
    }

    if (pronounSave && isVideoPanelVisible()) {
        return { action: 'saveVideoPlaylist', playlistName: DEFAULT_VIDEO_PLAYLIST };
    }

    return null;
}

function sanitizeVoiceQuery(text) {
    return String(text || '')
        .replace(/^(?:hey\s+)?blip\s+/, '')
        .replace(/^[\s:,\-]+/, '')
        .replace(/[\s.,!?]+$/, '')
        .trim();
}

function toTitleWords(text) {
    return String(text || '')
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function parseMapRouteFromText(text) {
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(text));
    if (!lower) return null;
    const routePatterns = [
        /\b(?:route|directions?|navigation)\s+(?:from\s+)?(.+?)\s+to\s+(.+)$/,
        /\b(?:map|maps|navigate|navigation|drive|driving|walk|walking)\s+(?:from\s+)?(.+?)\s+to\s+(.+)$/,
        /^from\s+(.+?)\s+to\s+(.+)$/
    ];
    for (const re of routePatterns) {
        const match = lower.match(re);
        if (!match?.[1] || !match?.[2]) continue;
        const from = sanitizeVoiceQuery(match[1].replace(/\s+(?:on|in)\s+(?:the\s+)?map[s]?$/, ''));
        const to = sanitizeVoiceQuery(match[2].replace(/\s+(?:on|in)\s+(?:the\s+)?map[s]?$/, ''));
        if (!from || !to) continue;
        if (/^(?:here|there|it|map|maps)$/.test(from) || /^(?:here|there|it|map|maps)$/.test(to)) continue;
        return { type: 'route', from, to, label: `${toTitleWords(from)} to ${toTitleWords(to)}` };
    }
    return null;
}

function buildMapRequest(query = '', location = '') {
    const rawQuery = sanitizeVoiceQuery(query);
    const rawLocation = sanitizeVoiceQuery(location);
    const route = parseMapRouteFromText(`${rawQuery} ${rawLocation}`.trim());
    if (route) return route;
    const merged = sanitizeVoiceQuery([rawQuery, rawLocation].filter(Boolean).join(' in '));
    if (!merged) return null;
    return { type: 'search', query: merged, label: toTitleWords(merged) };
}

function openMapRequest(request) {
    if (!request || !mapFrame) return { ok: false, type: 'search', label: '', url: '' };
    setMode('map');
    document.body.classList.add('projecting-visual');

    if (request.type === 'route' && request.from && request.to) {
        const fromEnc = encodeURIComponent(request.from);
        const toEnc = encodeURIComponent(request.to);
        const embedUrl = `https://www.google.com/maps?output=embed&saddr=${fromEnc}&daddr=${toEnc}`;
        const routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${fromEnc}&destination=${toEnc}`;
        mapFrame.src = embedUrl;
        state.lastContext.lastLocation = `${request.from} to ${request.to}`;
        state.lastContext.lastOpenableUrl = routeUrl;
        addToHub('link', `🧭 Route: ${request.from} → ${request.to}`, { url: routeUrl });
        return { ok: true, type: 'route', label: `${request.from} to ${request.to}`, url: routeUrl };
    }

    const query = sanitizeVoiceQuery(request.query || request.label || '');
    if (!query) return { ok: false, type: 'search', label: '', url: '' };
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    mapFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    state.lastContext.lastLocation = query;
    state.lastContext.lastOpenableUrl = mapsUrl;
    addToHub('link', `🌍 Map: ${query}`, { url: mapsUrl });
    return { ok: true, type: 'search', label: query, url: mapsUrl };
}

/** Parse direct map request with query or route, e.g. "show map of madrid", "route from A to B". */
function getDirectMapVoiceRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    if (!lower) return null;
    if (/\b(close|hide|dismiss|exit)\s+(the\s+)?map\b/.test(lower)) return null;
    if (getCalendarAgendaVoiceRequest(lower) || getCalendarFocusDayVoiceRequest(lower) || isReturnToCalendarVoiceRequest(lower)) return null;

    const route = parseMapRouteFromText(lower);
    if (route && /\b(map|route|directions?|navigate|navigation|drive|walking|walk)\b/.test(lower)) {
        return route;
    }

    const patterns = [
        /^(?:open|show|view|display|search|find|locate|see)\s+(?:me\s+)?(?:a\s+)?map\s+(?:of|for|to|in|near)\s+(.+)$/,
        /^map\s+(?:of|for|to|in|near)\s+(.+)$/,
        /^(?:open|show|view|display)\s+map\s+(.+)$/
    ];
    for (const re of patterns) {
        const match = lower.match(re);
        if (!match?.[1]) continue;
        const query = sanitizeVoiceQuery(match[1]);
        if (!query) continue;
        if (/^(?:map|maps|the map|it|there|here|now|please|thanks|thank you)$/.test(query)) continue;
        return buildMapRequest(query);
    }
    return null;
}

/** Parse direct YouTube/video request with topic, e.g. "play video about turtles". */
function getDirectYouTubeVoiceQuery(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    if (!lower) return null;
    if (/^(?:please\s+)?take\s+note\b/.test(lower) ||
        /^(?:please\s+)?(?:save|add|write)\s+(?:a\s+)?note\b/.test(lower) ||
        /^(?:please\s+)?note\s+that\b/.test(lower)) return null;

    const controlOnly = /\b(mute|unmute|pause|resume|stop|rewind|forward|skip|next|restart|close|hide|dismiss|volume|fullscreen|full\s*screen|bigger|smaller)\b/;
    if (controlOnly.test(lower) && !/\b(about|of|for|on)\b/.test(lower)) return null;

    const patterns = [
        /^(?:find|search|look(?:\s+for)?|play|open|show|watch)\s+(?:me\s+)?(?:a\s+)?(?:youtube\s+)?video\s+(?:about|of|for|on)\s+(.+)$/,
        /\b(?:youtube|yt|video)\s+(?:about|of|for|on)\s+(.+)$/,
        /^(?:play|watch|show|open)\s+(.+?)\s+on\s+(?:youtube|yt)\b/,
        /^(?:youtube|yt)\s+(.+)$/
    ];
    for (const re of patterns) {
        const match = lower.match(re);
        if (!match?.[1]) continue;
        const cleaned = String(match[1] || '')
            .replace(/\b(?:and|then)\s+(?:un\s*-?\s*mute|sound\s+on|audio\s+on)\b[\s\S]*$/i, '')
            .replace(/\b(?:with\s+)?sound\s+on\b[\s\S]*$/i, '')
            .trim();
        const query = sanitizeVoiceQuery(cleaned);
        if (!query) continue;
        if (/^(?:video|youtube|yt|it|something|anything|please|thanks|thank you)$/.test(query)) continue;
        return query;
    }
    return null;
}

/** Parse quick local numeric chart requests, e.g. "chart apples 10 pears 30". */
function getInlineChartVoiceData(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    if (!/\b(chart|graph)\b/.test(lower)) return null;
    if (!/\d/.test(lower)) return null;
    if (/^(?:open|show|view)\s+(?:the\s+)?(?:chart|graph)\s*$/.test(lower)) return null;

    const stopwords = new Set([
        'chart', 'graph', 'make', 'create', 'show', 'open', 'display', 'view', 'of', 'for', 'about', 'with',
        'and', 'or', 'vs', 'versus', 'value', 'values', 'data', 'number', 'numbers', 'please', 'me', 'the',
        'a', 'an', 'to', 'in', 'on', 'my', 'your', 'is', 'are', 'pie', 'bar', 'line'
    ]);
    const pairs = [];
    const seen = new Set();

    const pushPair = (rawLabel, rawValue) => {
        const key = String(rawLabel || '').toLowerCase().trim();
        if (!key || stopwords.has(key) || key.length < 2) return;
        if (seen.has(key)) return;
        const value = Number(rawValue);
        if (!Number.isFinite(value)) return;
        seen.add(key);
        pairs.push({ label: toTitleWords(key), value });
    };

    let match;
    const labelNumRe = /\b([a-z][a-z0-9_-]{1,20})\s*(?:is|are|=|:)?\s*(\d+(?:\.\d+)?)\b/g;
    while ((match = labelNumRe.exec(lower))) pushPair(match[1], match[2]);
    if (pairs.length < 2) {
        const numLabelRe = /\b(\d+(?:\.\d+)?)\s*([a-z][a-z0-9_-]{1,20})\b/g;
        while ((match = numLabelRe.exec(lower))) pushPair(match[2], match[1]);
    }
    if (pairs.length < 2) return null;

    const top = pairs.slice(0, 6);
    const labels = top.map((item) => item.label);
    const data = top.map((item) => item.value);
    const sum = data.reduce((acc, n) => acc + n, 0);
    const wantsPie = /\bpie\b/.test(lower) || /%/.test(lower) || (sum >= 95 && sum <= 105);
    const titleMatch = lower.match(/\b(?:chart|graph)\s+(?:of|for|about)\s+(.+)$/);
    let title = titleMatch?.[1] ? sanitizeVoiceQuery(titleMatch[1]) : '';
    if (!title) title = 'Voice Chart';
    title = toTitleWords(title).slice(0, 64);
    return { labels, data, type: wantsPie ? 'pie' : 'bar', title };
}

function getDirectVisualExplainRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    if (!lower) return null;
    if (/^(?:can\s+you\s+)?(?:show|find|get|open)\s+(?:me\s+)?(?:a|an)?\s*(?:picture|photo|image|portrait)\s+(?:of|for)\s+/.test(lower)) return null;
    if (/^(?:i\s+want\s+to\s+see|let\s+me\s+see)\s+(?:a|an)?\s*(?:picture|photo|image)\s+(?:of|for)\s+/.test(lower)) return null;
    if (/\bportrait\s+of\b/.test(lower)) return null;
    const scienceDiagramIntent = /\b(graph|chart|diagram|visual)\b/.test(lower) &&
        /\b(trajectory|trajectories|orbit|orbits|moves|motion|movement|path|paths|solar system|planet|planets)\b/.test(lower);
    if (!scienceDiagramIntent && /\b(video|youtube|map|chart|graph|camera|photo|gallery|weather|time|product|products)\b/.test(lower)) return null;

    const patterns = [
        { re: /^(?:please\s+)?show\s+me\s+how\s+(.+)$/, mode: 'how' },
        { re: /^(?:please\s+)?explain\s+how\s+(.+?)\s+(?:with|using)\s+(?:an?\s+)?(?:image|diagram|picture|illustration|visual)\b/, mode: 'how' },
        { re: /^(?:please\s+)?show\s+me\s+(?:an?\s+)?(?:image|diagram|picture|illustration|visual)\s+(?:of|for)\s+(.+)$/, mode: 'visual' },
        { re: /^(?:please\s+)?(?:draw|illustrate|visualize)\s+(.+)$/, mode: 'visual' },
        { re: /^(?:please\s+)?(?:can\s+you\s+)?(?:create|make|generate)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture|illustration|diagram)\s+(?:of|for)\s+(.+)$/, mode: 'visual' },
        { re: /^(?:please\s+)?what\s+does\s+(.+?)\s+look\s+like$/, mode: 'visual' },
        { re: /^(?:please\s+)?(?:create|make|show)\s+(?:me\s+)?(?:a\s+)?(?:graph|chart|diagram|visual)\s+(?:of|for)\s+(.+)$/, mode: 'visual' }
    ];

    for (const pattern of patterns) {
        const match = lower.match(pattern.re);
        const topic = sanitizeVoiceQuery(match?.[1] || '');
        if (!topic) continue;
        if (/^(?:it|this|that|something|anything|please|thanks|thank you)$/.test(topic)) continue;

        const userText = pattern.mode === 'how' ? `Explain how ${topic}` : `Explain ${topic}`;
        const imagePrompt = pattern.mode === 'how'
            ? `Educational labeled diagram showing how ${topic}. Clean infographic style, clear arrows, clear labels, high contrast, no text paragraphs.`
            : `Educational illustration of ${topic}. Clean infographic style, labeled parts if relevant, high contrast, easy to understand.`;
        const scienceImagePrompt = /\b(solar system|planet|planets|orbit|orbits|trajectory|trajectories)\b/.test(topic)
            ? `Educational space diagram of ${topic}. Show accurate orbital paths, directional motion, clean spacing, dark space background, believable planet differences, and absolutely no text, labels, captions, or writing anywhere in the image. No cartoon characters, no people.`
            : imagePrompt;

        return {
            topic,
            userText,
            explanationPrompt: userText,
            imagePrompt: scienceImagePrompt,
        };
    }

    return null;
}

function getDirectImageLookupRequest(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    if (!lower) return null;
    if (/\b(?:last|latest|current|my\s+last|my\s+latest|this)\s+(?:picture|photo|image|portrait|snapshot|shot)\b/.test(lower)) {
        return null;
    }
    const patterns = [
        /^(?:can\s+you\s+)?(?:show|find|get|open)\s+(?:me\s+)?(?:a|an)?\s*(?:picture|photo|image|portrait)\s+(?:of|for)\s+(.+)$/,
        /^(?:can\s+you\s+)?(?:show|find|get|open)\s+(?:me\s+)?(.+?)'?s\s+(?:picture|photo|image|portrait)$/,
        /^(?:can\s+you\s+)?(?:show|find|get|open)\s+(?:me\s+)?(.+?)\s+(?:picture|photo|image|portrait)$/ ,
        /^(?:i\s+want\s+to\s+see|let\s+me\s+see)\s+(?:a|an)?\s*(?:picture|photo|image)\s+(?:of|for)\s+(.+)$/,
        /^(?:who\s+is|what\s+does)\s+(.+?)\s+look\s+like$/
    ];
    for (const pattern of patterns) {
        const match = lower.match(pattern);
        const subject = sanitizeVoiceQuery(match?.[1] || '');
        if (!subject) continue;
        if (/^(?:it|this|that|one|something|someone|last|latest|current|my\s+last|my\s+latest)$/.test(subject)) continue;
        return { query: toTitleWords(subject).trim() };
    }
    return null;
}

function getDirectMakeImageRequest(cmd, lastTopic = '') {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd));
    if (!lower) return null;
    const patterns = [
        /^(?:please\s+)?(?:can\s+you\s+)?(?:create|make|generate|draw|illustrate)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture|illustration|diagram)\s+(?:of|for)\s+(.+)$/,
        /^(?:please\s+)?(?:create|make|generate|draw|illustrate)\s+(.+)$/
    ];
    for (const re of patterns) {
        const match = lower.match(re);
        const subject = sanitizeVoiceQuery(match?.[1] || '');
        if (!subject) continue;
        if (/^(?:it|this|that|please|thanks|thank you)$/.test(subject)) {
            const topic = sanitizeVoiceQuery(lastTopic || '');
            if (!topic) continue;
            return { imagePrompt: `A high quality image of ${topic}.` };
        }
        return { imagePrompt: `A high quality image of ${subject}.` };
    }
    return null;
}

/** Voice command parser for shell/system-like controls (sleep/wake/scroll/size). */
function getSystemVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    const trimmed = lower.replace(/^(?:hey\s+)?blip[,\s]+/, '').trim();
    const trimmedForSleep = trimmed.replace(/^(?:please|just|ok(?:ay)?|now)\s+/, '').replace(/\s+(?:please|now)\s*$/, '').trim();
    if (/^(?:sleep|sleep\s+blip|blip\s+sleep)$/.test(trimmedForSleep)) return 'sleepHelp';
    if (/^(?:go\s+back\s+to\s+sleep|go\s+to\s+sleep)(?:\s+blip)?$/.test(trimmedForSleep)) return 'sleep';
    const wakePhrase = parseWakePhrase(lower);
    if (wakePhrase.matched && !wakePhrase.command) return 'wake';
    let stripped = trimmed;
    let prev = '';
    while (stripped && stripped !== prev) {
        prev = stripped;
        stripped = stripped
            .replace(/^(?:please|just|ok(?:ay)?|now)\s+/, '')
            .replace(/^(?:can|could|would|will)\s+you\s+/, '')
            .replace(/^(?:you\s+can)\s+/, '')
            .trim();
    }
    stripped = stripped.replace(/\s+(?:please|now)\s*$/, '').trim();
    const systemCandidate = stripped.replace(/^play\s+/, '').trim();
    const sleepPhrase = '(?:go\\s+back\\s+to\\s+sleep|go\\s+to\\s+sleep)';
    const condensedSleep = systemCandidate.replace(/\bsleep\b/g, 'sleep').replace(/\s+/g, ' ').trim();
    const wantsScrollDown =
        /\bscroll\b[\s\w]{0,28}\bdown\b/.test(trimmed) ||
        /\b(?:go|move|page)\s+down\b/.test(trimmed) ||
        /\bscroll\s+(?:a\s+bit\s+|a\s+little\s+|more\s+)?(?:lower|below)\b/.test(trimmed) ||
        /^(?:down|lower)\s+please$/.test(stripped) ||
        /^(?:scroll|move|go|page)\s+(?:a\s+bit\s+|a\s+little\s+|more\s+)?down(?:\s+please)?$/.test(stripped);
    const wantsScrollUp =
        /\bscroll\b[\s\w]{0,28}\bup\b/.test(trimmed) ||
        /\b(?:go|move|page)\s+up\b/.test(trimmed) ||
        /\bscroll\s+(?:a\s+bit\s+|a\s+little\s+|more\s+)?(?:higher|above)\b/.test(trimmed) ||
        /^(?:up|higher)\s+please$/.test(stripped) ||
        /^(?:scroll|move|go|page)\s+(?:a\s+bit\s+|a\s+little\s+|more\s+)?up(?:\s+please)?$/.test(stripped);
    const wakeIntent = /^(?:wake(?:\s+up)?)(?:\s+blip)?$/.test(stripped) ||
        /^(?:wake(?:\s+up)?)(?:\s+blip)?$/.test(systemCandidate) ||
        /^(?:blip\s+)?wake(?:\s+up)?$/.test(lower) ||
        /^(?:hey|hi|okay|ok)\s+blip\s+wake(?:\s+up)?$/.test(lower);
    const sleepIntent = new RegExp(`^(?:${sleepPhrase})(?:\\s+blip)?$`).test(stripped) ||
        new RegExp(`^(?:${sleepPhrase})(?:\\s+blip)?$`).test(systemCandidate) ||
        /^(?:go\s+to\s+sleep\s+blip|go\s+back\s+to\s+sleep\s+blip)$/.test(condensedSleep);
    const sleepPromptIntent = /\byou(?:'re|\s+are)\s+not\s+(?:sleeping|asleep)\b/.test(trimmed) ||
        /\bwhy\s+are\s+you\s+not\s+(?:sleeping|asleep)\b/.test(trimmed);
    const politeSleepIntent = new RegExp(`\\b(?:can|could|would|will)\\s+(?:you|blip|it)\\b[\\s\\w]{0,20}\\b${sleepPhrase}\\b`).test(trimmed) ||
        new RegExp(`\\b(?:you|blip|it)\\b[\\s\\w]{0,12}\\b(?:can|could|would|will)\\b[\\s\\w]{0,12}\\b${sleepPhrase}\\b`).test(trimmed);
    const embeddedSleepIntent = new RegExp(`\\b${sleepPhrase}\\b`).test(trimmed) && !/\b(?:wake|awake|waking)\b/.test(trimmed);
    const stopScrollIntent = /\b(stop|pause|enough|halt|cancel)\s+(the\s+)?scroll(?:ing)?\b/.test(trimmed) ||
        /\bstop\s+going\s+(up|down)\b/.test(trimmed) ||
        /\bstop\s+moving\b/.test(trimmed);
    const closeAlertIntent = /\b(close|hide|dismiss|exit|stop|silence|turn\s+off|shut\s+off|cancel)\s+(the\s+)?(alarm|alert|reminder|timer)(?:\s+(page|screen|panel|window|sound|ring(?:ing)?))?\b/.test(trimmed) ||
        /\b(alarm|alert|reminder|timer)\s+(off|stop|close|silent|silence)\b/.test(stripped) ||
        /\bturn\s+(the\s+)?(alarm|alert|reminder|timer)\s+off\b/.test(trimmed) ||
        /\bshut\s+(the\s+)?(alarm|alert|reminder|timer)\s+off\b/.test(trimmed) ||
        /\bstop\s+(the\s+)?ring(?:ing)?\b/.test(trimmed) ||
        ((!!state.activeAlert || !!state.alertDisplay) && /^(?:stop(?:\s+it)?|turn\s+it\s+off|shut\s+it\s+off|silence(?:\s+it)?|make\s+it\s+stop|enough|quiet)$/i.test(stripped));
    const anythingOpen = !!(
        mediaLightbox?.classList.contains('active') ||
        state.isMediaStripOpen ||
        state.pendingImage ||
        isSidePanelVisible() ||
        isSettingsPanelOpen() ||
        state.currentMode !== 'core'
    );

    if (/\b(close|hide|exit|dismiss)\s+(everything|all(?:\s+panels?)?|all\s+windows?)\b/.test(trimmed) && /\b(go to sleep|sleep(?:\s+mode)?)\b/.test(trimmed)) return 'closeAllSleep';
    if (/\b(close|hide|exit|dismiss)\s+(?:them\s+)?(?:it\s+)?(?:everything|all(?:\s+panels?)?|all\s+windows?)\b/.test(trimmed)) return 'closeAll';
    if (anythingOpen && /^(?:everything|all|all\s+of\s+it|them\s+all)$/i.test(stripped)) return 'closeAll';
    if (closeAlertIntent) return 'closeAlert';
    if (stopScrollIntent) return 'stopScroll';
    if (wakeIntent) return 'wake';
    if (/^(?:sleep|sleep\s+blip|blip\s+sleep)$/.test(stripped)) return 'sleepHelp';
    if (sleepIntent || sleepPromptIntent || politeSleepIntent || embeddedSleepIntent) return 'sleep';
    if (wantsScrollDown && !wantsScrollUp) return 'scrollDown';
    if (wantsScrollUp && !wantsScrollDown) return 'scrollUp';
    if (/^(?:make|set)\s+(?:you|your)?\s*size\s+(?:bigger|larger|big|up)\b|^(?:size\s+(?:up|bigger|larger)|grow|be\s+bigger|bigger|larger)\b/.test(trimmed)) return 'sizeUp';
    if (/^(?:make|set)\s+(?:you|your)?\s*size\s+(?:smaller|small|down)\b|^(?:size\s+(?:down|smaller)|shrink|be\s+smaller|smaller)\b/.test(trimmed)) return 'sizeDown';
    if (/^(?:reset|normal(?:ize)?)\s+(?:you|your)?\s*size\b|^(?:size\s+(?:normal|default)|default\s+size)\b/.test(trimmed)) return 'sizeReset';

    return null;
}

/** Voice command parser for camera controls. */
function getCameraVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    const photoIntentRe = /\b(snap|snapshot|capture|take)\s+(a\s+)?(photo|picture|pic|image|shot|snapshot)\b|\btake\s+(the\s+)?(photo|picture|pic)\b|\bcapture\s+(this|that|it)\b/;
    const recordIntentRe = /\b(record|film|shoot|capture|take|make|start|begin)\b[\s\w]{0,24}\b(video|clip|recording)\b|\b(start|begin)\s+(the\s+)?(recording|filming)\b|\b(record|film|shoot)\s+(this|that|it)\b|\brecord\s+(this\s+)?(recipe|cake|lesson|tutorial)\b|\btake\s+(a\s+)?video\b/;
    const stopRecordIntentRe = /\b(stop|end|finish|save)\s+(the\s+)?(recording|clip|camera\s+video|filming)\b|\bstop\s+(recording|filming)\b|\b(done|finished)\s+(recording|filming)\b|\bsave\s+(this\s+)?(recording|clip)\b/;
    if (/\b(recipe|meal)\b/.test(lower) && /\b(snapshot|snap|capture|save|store|keep)\b/.test(lower)) return null;
    if (/\b(open|start|enable|show|turn on|activate|activa|activar)\s+(the\s+)?(camera|camara|vision|eyes?)\b/.test(lower) ||
        /\b(turn|switch)\s+(the\s+)?(camera|camara|vision)\s+on\b/.test(lower) ||
        /^camera\s+on$/.test(lower) ||
        /^camara\s+on$/.test(lower) ||
        /^activate\s+(the\s+)?(camera|camara)$/.test(lower) ||
        /\bopen\s+(my\s+)?eyes\b/.test(lower)) return 'open';
    if (/\b(close|stop|disable|hide|turn off|deactivate)\s+(the\s+)?(camera|camara|vision|eyes?)\b/.test(lower) ||
        /\b(turn|switch)\s+(the\s+)?(camera|camara|vision)\s+off\b/.test(lower) ||
        /^camera\s+off$/.test(lower) ||
        /^camara\s+off$/.test(lower) ||
        /^deactivate\s+(the\s+)?(camera|camara)$/.test(lower) ||
        /\bclose\s+(my\s+)?eyes\b/.test(lower)) return 'close';
    if (photoIntentRe.test(lower) ||
        /^snap$/.test(lower) ||
        /^snapshot$/.test(lower) ||
        /\btake\s+photo\b/.test(lower) ||
        /\btake\s+picture\b/.test(lower) ||
        /\btake\s+pic\b/.test(lower) ||
        /\btake\s+(a\s+)?snapshot\b/.test(lower) ||
        /\bcapture\s+(a\s+)?snapshot\b/.test(lower)) return 'snap';
    if (recordIntentRe.test(lower)) return 'videoStart';
    if (stopRecordIntentRe.test(lower)) return 'videoStop';
    if (/\b(save|store|keep)\s+(this\s+)?(photo|picture|pic|image|shot|snapshot)\b/.test(lower)) return 'save';
    return null;
}

function getSettingsVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    if (/\b(open|show|display|launch|view)\s+(?:the\s+|my\s+)?settings\b/.test(lower)) return 'open';
    if (/\b(close|hide|dismiss|exit)\s+(?:the\s+|my\s+)?settings\b/.test(lower)) return 'close';
    return null;
}

function getChatVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    if (/\b(open|show|display|launch|view|bring\s+up)\s+(?:the\s+|my\s+)?chat\b/.test(lower) ||
        /\bopen\s+(?:the\s+)?chat\s+box\b/.test(lower)) return 'open';
    if (/\b(close|hide|dismiss|exit)\s+(?:the\s+|my\s+)?chat\b/.test(lower) ||
        /\bclose\s+(?:the\s+)?chat\s+box\b/.test(lower)) return 'close';
    return null;
}

function getLearningGamesVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    const simpleAnswerRe = /^(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|\d{1,2})$/;
    const wantsMathGame = /\b(math|number|numbers)\b/.test(lower) && /\b(game|games)\b/.test(lower);
    const answerWords = {
        zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
        twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
        seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20
    };
    const parseAnswerValue = (value) => {
        const cleaned = sanitizeVoiceQuery(String(value || '')).toLowerCase();
        if (!cleaned) return null;
        if (/^\d{1,2}$/.test(cleaned)) {
            const n = Number(cleaned);
            return Number.isFinite(n) ? n : null;
        }
        return Number.isFinite(answerWords[cleaned]) ? answerWords[cleaned] : null;
    };
    const gamesNoun = '(?:learning\\s+games|learning\\s+game|kids\\s+games|math\\s+games|games|game\\s+panel)';
    // If games is already open, bare "game/games" often means close (verb dropped).
    if (state.currentMode === 'games' && /^(?:game|games|learning\s+game|learning\s+games|math\s+game|math\s+games)$/.test(lower)) {
        return { action: 'close' };
    }
    if (/^(?:the\s+)?(?:learning\s+games|learning\s+game|kids\s+games|math\s+games|games)$/.test(lower)) return { action: 'open' };
    if ((wantsMathGame && /\b(start|play|open|launch|begin|do)\b/.test(lower)) ||
        /\b(start|play|open|launch|begin)\s+(?:the\s+)?math\s+games?\b/.test(lower) ||
        /^(?:math\s+games?|play\s+math|do\s+math)$/.test(lower) ||
        (state.currentMode === 'games' && /\b(start|play|begin)\b/.test(lower) && /\bmath\b/.test(lower))) return { action: 'startMath' };
    // Accept "close game" too (singular).
    if (/\b(close|hide|dismiss|exit)\s+(?:the\s+|my\s+)?game\b/.test(lower)) return { action: 'close' };
    if (new RegExp(`\\b(close|hide|dismiss|exit)\\s+(?:the\\s+|my\\s+)?${gamesNoun}\\b`).test(lower)) return { action: 'close' };
    if (new RegExp(`\\b(open|show|display|launch|view|bring\\s+up|play|start)\\s+(?:the\\s+|my\\s+)?${gamesNoun}\\b`).test(lower)) return { action: 'open' };
    if ((/^(?:next|another)$/.test(lower) || /\b(next|another)\s+(?:question|one|round|game)?\b/.test(lower)) &&
        state.currentMode === 'games' && state.mathGame.started) return { action: 'nextMath' };
    if (state.currentMode === 'games' && state.mathGame.started && !state.mathGame.answered) {
        const answerMatch = lower.match(/\b(?:guess|my\s+guess\s+is|my\s+answer\s+is|the\s+answer\s+is|answer\s+(?:to\s+the\s+quiz\s+)?is|i\s+think\s+it(?:'s| is)?|it(?:'s| is)|i\s+say|i\s+choose|choose|pick|option)\s+(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|\d{1,2})\b/);
        const answerValue = parseAnswerValue(answerMatch?.[1] || '');
        if (Number.isFinite(answerValue)) return { action: 'answerMath', value: answerValue };
        if (simpleAnswerRe.test(lower)) {
            const simpleValue = parseAnswerValue(lower);
            if (Number.isFinite(simpleValue)) return { action: 'answerMath', value: simpleValue };
        }
    }
    return null;
}

/** Voice command parser for saved creations (graphs/designs/drawings). */
function getCreationGalleryVoiceCommand(cmd) {
    if (!CREATIONS_TOOL_ENABLED) return null;
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    const creationSurfaceActive = isCreationsPanelOpen()
        || canOpenCurrentCreationFromPanel()
        || (mediaLightbox?.classList.contains?.('active') && state.activeMediaBucket === MEDIA_BUCKET_CREATED);
    if (/\b(?:photos?|fotos?|pictures?|shots?|snapshots?)\b/.test(lower) && !/\bcreations?\b/.test(lower)) return null;
    const namedOpenMatch = lower.match(/^(?:open|show|view)\s+(.+)$/);
    if (namedOpenMatch) {
        const query = normalizeCreationVoiceLabel(
            namedOpenMatch[1]
                .replace(/\b(?:the|my|saved)\b/g, ' ')
                .replace(/\b(?:creation|creations|design|designs|drawing|drawings|graph|graphs|chart|charts|art|image|images|picture|pictures|item|items|link|links)\b/g, ' ')
                .replace(/\b(?:inside|from|in)\s+creations?\b/g, ' ')
        );
        if (query && !/^\d{1,3}$/.test(query) && !/^(?:latest|last|newest|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)$/.test(query)) {
            const match = findCreationMatchByQuery(query);
            if (match?.id) {
                return {
                    action: 'openMatch',
                    id: match.id,
                    title: match.title || normalizeCreationTitle(query, 'Creation')
                };
            }
        }
    }
    // Explicit "open/show item N" → open creation by index (avoid calendar taking it).
    const openItemNum = lower.match(/\b(?:open|show|view)\s+item\s+(\d{1,3})\b/);
    if (openItemNum) {
        const n = Number(openItemNum[1]);
        if (Number.isFinite(n) && n > 0) return { action: 'openIndex', index: n };
    }
    // "Open (the) first/second/... item" → open creation by index (calendar uses "first" = day 1 otherwise).
    const ordinalToNum = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12 };
    const openOrdinalItem = lower.match(/\b(?:open|show|view)\s+(?:the\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+item\b/);
    if (openOrdinalItem) {
        const n = ordinalToNum[openOrdinalItem[1]];
        if (Number.isFinite(n) && n > 0) return { action: 'openIndex', index: n };
    }
    const createdNouns = '(?:creation|design|drawing|graph|chart|art|item)';
    const createdGalleryNouns = '(creations?|creation|past\\s+creations|saved\\s+designs?|saved\\s+drawings?|saved\\s+graphs?|past\\s+designs?|old\\s+designs?|design\\s+gallery|drawing\\s+gallery|graph\\s+gallery|creative\\s+gallery)';
    const openVerbAnyRe = /\b(open|show|display|launch|view|go\s+to|bring\s+up)\b/;
    const closeVerbAnyRe = /\b(close|hide|exit|dismiss)\b/;
    const deleteVerbAnyRe = /\b(delete|remove|erase|trash|clear)\b/;
    const openIndexDigitRe = new RegExp(`\\b(open|show|view|expand|zoom)\\s+(?:me\\s+)?(?:the\\s+)?${createdNouns}\\s*(?:number|#)?\\s*(\\d{1,3})\\b`);
    const openIndexWordRe = new RegExp(`\\b(open|show|view|expand|zoom)\\s+(?:me\\s+)?(?:the\\s+)?${createdNouns}\\s*(?:number\\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\\b`);
    const openLatestRe = new RegExp(`\\b(open|show|view|expand|zoom)\\s+(?:the\\s+)?last\\s+${createdNouns}\\b`);
    const deleteIndexDigitRe = new RegExp(`\\b(delete|remove|erase|trash|clear)\\s+(?:me\\s+)?(?:the\\s+)?${createdNouns}\\s*(?:number|#)?\\s*(\\d{1,3})\\b`);
    const deleteIndexWordRe = new RegExp(`\\b(delete|remove|erase|trash|clear)\\s+(?:me\\s+)?(?:the\\s+)?${createdNouns}\\s*(?:number\\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\\b`);
    const deleteLatestRe = new RegExp(`\\b(delete|remove|erase|trash)\\s+(?:the\\s+)?(?:last|latest)\\s+${createdNouns}\\b`);
    const deleteCurrentRe = new RegExp(`\\b(delete|remove|erase|trash)\\s+(?:the\\s+)?(?:current|this)\\s+${createdNouns}\\b`);
        const clearCreationsRe = new RegExp(`\\b(delete|remove|erase|trash|clear)\\b[\\s\\w]{0,16}\\b(?:all|every|entire|whole)\\s+${createdGalleryNouns}\\b`);
        const saveRecipeRe = /\b(?:save|store|keep)\s+(?:this\s+|the\s+)?(?:recipe|meal)\b|\b(?:snapshot|snap|capture)\s+(?:(?:this|the)\s+)?(?:recipe|meal)\b|\b(?:take|make)\s+(?:a\s+)?(?:snapshot|snap|capture)\s+of\s+(?:this\s+|the\s+)?(?:recipe|meal)\b/;
        const saveMapRe = /\b(?:save|store|keep|remember)\b[\s\w]{0,28}\b(?:map|location|place)\b|\b(?:snapshot|snap|capture)\s+(?:of\s+)?(?:the\s+)?map\b/;
        const saveToCreationsRe = /\b(save|store|keep)\b[\s\w]{0,24}\b(to|in)\s+creations?\b/;
        const saveRe = new RegExp(`\\b(save|store|keep)\\s+(?:this\\s+)?${createdNouns}\\b|\\bsave\\s+(?:the\\s+)?${createdNouns}\\b`);

    const wordToNum = {
        one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
        seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12
    };

    if (saveRecipeRe.test(lower)) return 'saveRecipe';
    if (saveMapRe.test(lower)) return 'saveMap';
    if (saveToCreationsRe.test(lower)) return 'saveCurrent';
    if (saveRe.test(lower)) return 'saveCurrent';
    const digitMatch = lower.match(openIndexDigitRe);
    if (digitMatch) {
        const n = Number(digitMatch[2]);
        if (Number.isFinite(n) && n > 0) return { action: 'openIndex', index: n };
    }
    const wordMatch = lower.match(openIndexWordRe);
    if (wordMatch) {
        const n = wordToNum[wordMatch[2]];
        if (Number.isFinite(n) && n > 0) return { action: 'openIndex', index: n };
    }
    const deleteDigitMatch = lower.match(deleteIndexDigitRe);
    if (deleteDigitMatch) {
        const n = Number(deleteDigitMatch[2]);
        if (Number.isFinite(n) && n > 0) return { action: 'deleteIndex', index: n };
    }
    const deleteWordMatch = lower.match(deleteIndexWordRe);
    if (deleteWordMatch) {
        const n = wordToNum[deleteWordMatch[2]];
        if (Number.isFinite(n) && n > 0) return { action: 'deleteIndex', index: n };
    }
    if (openLatestRe.test(lower)) return 'expandLatest';
    if (deleteLatestRe.test(lower)) return 'deleteLatest';
    if (deleteCurrentRe.test(lower)) return 'deleteCurrent';
    if (clearCreationsRe.test(lower) && deleteVerbAnyRe.test(lower)) return 'clear';
    // Bare "creations" toggles the creations lane. STT often drops the verb.
    if (/^(?:creations?)$/.test(lower)) {
        return isCreationsPanelOpen() ? 'close' : 'open';
    }

    if ((openVerbAnyRe.test(lower) && new RegExp(`\\b${createdGalleryNouns}\\b`).test(lower)) ||
        /\b(open|show|view)\b[\s\w]{0,24}\bcreations?\b/.test(lower) ||
        /^open\s+creations?$/.test(lower) ||
        /^show\s+creations?$/.test(lower) ||
        /^can\s+you\s+open\s+my\s+creations?$/.test(lower) ||
        /^show\s+past\s+creations$/.test(lower)) return 'open';
    if ((closeVerbAnyRe.test(lower) && new RegExp(`\\b${createdGalleryNouns}\\b`).test(lower)) ||
        /\b(close|hide|exit|dismiss)\b[\s\w]{0,24}\bcreations?\b/.test(lower) ||
        /^(?:hey\s+blip\s+)?(?:(?:please|can|could|would|will)\s+you\s+)?(?:close|hide|dismiss|exit)\s+(?:my\s+|the\s+)?(?:creations|design\s+gallery|drawing\s+gallery|graph\s+gallery)(?:\s+please)?$/.test(lower) ||
        /^close\s+creations?$/.test(lower) ||
        /^hide\s+creations?$/.test(lower) ||
        /^(?:please\s+)?close\s+(?:the\s+)?creation\s*$/.test(lower) ||
        /^(?:please\s+)?hide\s+(?:the\s+)?creation\s*$/.test(lower)) return 'close';
    if (creationSurfaceActive && /^(?:please\s+)?(?:close|hide|dismiss|exit)(?:\s+(?:it|this|that|this\s+one))?(?:\s+please)?$/.test(lower)) return 'close';
    return null;
}

function getMediaUndoVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string' || !state.lastMediaUndo) return null;
    const lower = normalizeVoiceTokens(cmd);
    if (/^(?:please\s+)?(?:undo|undo\s+delete|undo\s+that|undo\s+last\s+delete|restore|restore\s+it|restore\s+that|bring\s+(?:it|that)\s+back)(?:\s+please)?$/.test(lower)) {
        return 'undoDelete';
    }
    if (/\b(?:undo|restore)\b[\s\w]{0,12}\b(?:delete|removal)\b/.test(lower)) return 'undoDelete';
    return null;
}

function getUnnamedMediaReferenceVoiceReply(cmd) {
    if (!cmd || typeof cmd !== 'string') return '';
    const lower = normalizeVoiceTokens(cmd);
    const inMediaContext = state.isMediaStripOpen || isYouTubeLibraryVoiceContextOpen() || mediaLightbox?.classList.contains?.('active');
    if (!inMediaContext) return '';
    if (!/^(?:(?:it|this|that)(?:\s+one)?\s+(?:does\s+not|doesnt|doesn't)\s+have\s+(?:a\s+)?name|(?:it|this|that)(?:\s+one)?\s+has\s+no\s+name|no\s+name|without\s+(?:a\s+)?name)(?:\s+please)?$/.test(lower)) {
        return '';
    }

    const lane = normalizeMediaLane(state.mediaStripLane);
    if (lane === 'music' || lane === 'videos' || isYouTubeLibraryVoiceContextOpen()) {
        const view = getActiveSavedYouTubeViewForVoice();
        const items = getSavedYouTubeItemsByView(view);
        const currentIndex = items.length ? normalizeYouTubeLibraryBrowseIndex(state.youtubeLibraryBrowseIndex, items) + 1 : 1;
        return `Use the number tag. Say "delete ${currentIndex}" or "delete this".`;
    }
    if (lane === 'created') {
        return 'Use the number tag. Say "delete 1" or "delete this creation".';
    }
    return 'Use the number tag. Say "delete 1" or "delete this photo".';
}

function extractVoiceNumberList(text = '') {
    const lower = normalizeVoiceTokens(text)
        .replace(/\btoo\b/g, ' two ')
        .replace(/\bto\b/g, ' two ')
        .replace(/\bfor\b/g, ' four ');
    const words = {
        one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
        seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12
    };
    const matches = [];
    lower.replace(/\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g, (_, token) => {
        const numeric = /^\d+$/.test(token) ? Number(token) : words[token];
        if (Number.isFinite(numeric) && numeric > 0) matches.push(numeric);
        return _;
    });
    return [...new Set(matches)];
}

function getMultiIndexDeleteVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    if (!/\b(delete|remove|erase|trash|clear)\b/.test(lower)) return null;
    if (!/\b(?:numbers?|tags?|photos?|fotos?|pictures?|shots?|snapshots?|songs?|tracks?|music|videos?|creations?)\b/.test(lower)) return null;
    const indexes = extractVoiceNumberList(lower);
    if (indexes.length < 2) return null;
    return indexes;
}

/** Voice command parser for media gallery controls. */
function getMediaGalleryVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    if (resolveYouTubeLibraryViewFromVoice(lower)) return null;
    const inPhotosContext = state.isMediaStripOpen && normalizeMediaLane(state.mediaStripLane) === 'shots';
    const photoWordsRe = /\b(?:photos?|fotos?|pictures?|shots?|snapshots?|images?)\b/;
    const ordinalWordsRe = /^(?:latest|last|newest|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)$/;
    const namedPhotoOpenMatch = lower.match(/^(?:open|show|view)\s+(.+)$/);
    if (namedPhotoOpenMatch && (photoWordsRe.test(lower) || inPhotosContext)) {
        const query = normalizePhotoVoiceLabel(
            namedPhotoOpenMatch[1]
                .replace(/\b(?:the|my|saved)\b/g, ' ')
                .replace(/\b(?:photo|photos|foto|fotos|picture|pictures|shot|shots|snapshot|snapshots|image|images|item|items)\b/g, ' ')
                .replace(/\b(?:inside|from|in)\s+(?:photos?|fotos?)\b/g, ' ')
                .replace(/^(?:called|named|titled)\s+/, ' ')
        );
        if (query && !/^\d{1,3}$/.test(query) && !ordinalWordsRe.test(query)) {
            const match = findPhotoMatchByQuery(query);
            if (match?.id) {
                return {
                    action: 'openMatch',
                    id: match.id,
                    title: normalizePhotoTitle(match.title || '', match)
                };
            }
        }
    }
    const namedPhotoDeleteMatch = lower.match(/^(?:delete|remove|erase|trash|clear)\s+(.+)$/);
    if (namedPhotoDeleteMatch && (photoWordsRe.test(lower) || inPhotosContext)) {
        const query = normalizePhotoVoiceLabel(
            namedPhotoDeleteMatch[1]
                .replace(/\b(?:the|my|saved)\b/g, ' ')
                .replace(/\b(?:photo|photos|foto|fotos|picture|pictures|shot|shots|snapshot|snapshots|image|images|item|items)\b/g, ' ')
                .replace(/\b(?:inside|from|in)\s+(?:photos?|fotos?)\b/g, ' ')
                .replace(/^(?:called|named|titled)\s+/, ' ')
        );
        if (query && !/^\d{1,3}$/.test(query) && !ordinalWordsRe.test(query)) {
            const match = findPhotoMatchByQuery(query);
            if (match?.id) {
                return {
                    action: 'deleteMatch',
                    id: match.id,
                    title: normalizePhotoTitle(match.title || '', match)
                };
            }
        }
    }
    // User preference: avoid the standalone word "gallery" (it collides/confuses with other “galleries”).
    // Keep "media" as the primary noun; still accept "media gallery" but not bare "gallery".
    const mediaWordRe = /\b(media\s+gallery|media|photos?|fotos?|pictures?|snapshots?|shots?)\b/;
    const recordingsWordRe = /\b(recordings?|video\s+clips?|clips?)\b/;
    const politePrefixRe = /^(?:hey\s+blip\s+)?(?:(?:please|can|could|would|will)\s+you\s+)?(?:please\s+)?/;
    const openVerbStartRe = new RegExp(`${politePrefixRe.source}(open|show|display|launch|view|browse|go\\s+to|bring\\s+up|pull\\s+up|take\\s+me\\s+to)\\b`);
    const closeVerbStartRe = new RegExp(`${politePrefixRe.source}(close|hide|exit|dismiss)\\b`);
    const deleteVerbAnyRe = /\b(delete|remove|erase|trash|clear)\b/;
    const mediaDeleteNouns = '(media|item|file|photo|foto|picture|image|snapshot|shot|video|clip|recording|song|track|music)';
    const expandRe = /\b(expand|enlarge|zoom|maximize|open)\s+(it|this|photo|picture|image|snapshot|(?:the\s+)?last\s+(photo|picture|image|snapshot|shot))\b/;
    const expandLastImageRe = /\b(expand|enlarge|zoom|maximize|open)\s+(?:the\s+)?(?:last|latest)\s+(photo|picture|image|snapshot|shot)\b/;
    const makeLastImageBigRe = /\b(?:make|show|open|view)\s+(?:me\s+)?(?:the\s+)?(?:last|latest)\s+(photo|picture|image|snapshot|shot)\s+(big|bigger|large|larger)\b/;
    const openLastRe = /\b(open|show|view)\s+(?:me\s+)?(?:the\s+)?(?:last|latest)\s+(photo|picture|image|snapshot|shot)\b/;
    const openVideoRe = /\b(open|show|view|play)\s+(?:me\s+)?(?:the\s+)?(?:last|latest|my)\s+(video|clip)\b/;
    const makeLastVideoBigRe = /\b(?:make|show|open|view|play)\s+(?:me\s+)?(?:the\s+)?(?:last|latest|my)\s+(video|clip)\s+(big|bigger|large|larger)\b/;
    const rotateRightRe = /\b(?:correct|fix|rotate|turn)\s+(?:the\s+)?(?:last|latest|current)?\s*(photo|picture|image|snapshot|shot)\s*(?:to\s+the\s+)?(?:right|clockwise)?\b|^(?:rotate|turn)(?:\s+(?:it|this))?(?:\s+(?:right|clockwise))?$|^(?:correct|fix)(?:\s+(?:it|this))?$/;
    const rotateLeftRe = /\b(?:rotate|turn)\s+(?:the\s+)?(?:last|latest|current)?\s*(photo|picture|image|snapshot|shot)\s*(?:to\s+the\s+)?left\b|\brotate\s+left\b|^(?:rotate|turn)(?:\s+(?:it|this))?\s+left$/;
    const rotateAgainRe = /\b(?:rotate|turn)\s+(?:it\s+)?again\b|\bone\s+more\s+rotation\b|\brotate\s+(?:it\s+)?one\s+more\s+time\b|\bturn\s+(?:it\s+)?one\s+more\s+time\b/;
    const brightenAgainRe = /\b(?:brighten|brightness)\s+(?:it\s+)?again\b|\bone\s+more\s+brightness\b|\bmake\s+(?:it\s+)?brighter\s+again\b/;
    const brightenRe = /\b(?:brighten|brightness\s+up|more\s+brightness|lighter|make\s+(?:it|the\s+photo|the\s+picture|the\s+image)\s+brighter)\b|^(?:brighten|brighter|lighter|brightness)$/;
    const darkenRe = /\b(?:darken|less\s+brightness|lower\s+brightness|dimmer|make\s+(?:it|the\s+photo|the\s+picture|the\s+image)\s+darker)\b|^(?:darken|darker|dimmer)$/;
    const undoEditsRe = /\b(?:undo|revert)\s+(?:the\s+)?(?:last\s+)?(?:edit|edits|change|changes)\b|^(?:undo|revert)(?:\s+it)?$/;
    const resetPhotoRe = /\b(?:reset|restore)\s+(?:the\s+)?(?:photo|picture|image|snapshot|shot)(?:\s+edits)?\b|\bgo\s+back\s+to\s+(?:the\s+)?original\b|\boriginal\s+photo\b/;
    const cropRe = /\b(?:crop|trim)\s+(?:the\s+)?(?:photo|picture|image|snapshot|shot|it)\b/;
    const sharePhotoRe = /^(?:please\s+)?(?:share|send|copy)\s+(?:this|the|current|open)?\s*(?:photo|foto|picture|image|snapshot|shot|it)?(?:\s+please)?$/;
    const downloadPhotoRe = /^(?:please\s+)?(?:download|export)\s+(?:this|the|current|open)?\s*(?:photo|foto|picture|image|snapshot|shot|it)?(?:\s+please)?$/;
    const wallpaperPhotoRe = /^(?:please\s+)?(?:set|make|use)\s+(?:this|the|current|open)?\s*(?:photo|foto|picture|image|snapshot|shot|it)\s+(?:as\s+)?(?:my\s+)?wallpaper(?:\s+please)?$/;
    const openLatestMediaRe = /\b(open|show|view)\s+(?:me\s+)?(?:the\s+)?(?:last|latest)\s+(media|item|file)\b/;
    const openRecordingRe = /\b(open|show|view|play)\s+(?:me\s+)?(?:the\s+)?(?:last|latest)\s+(recording|recorded\s+video|video\s+recording)\b/;
    const openIndexDigitRe = /\b(open|show|view|expand|zoom)\s+(?:me\s+)?(?:the\s+)?(?:shot|photo|foto|picture|image|snapshot)?\s*(?:number|#)\s*(\d{1,3})\b|\b(open|show|view|expand|zoom)\s+(?:me\s+)?(?:the\s+)?(?:shot|photo|foto|picture|image|snapshot)\s+(\d{1,3})\b/;
    const openIndexWordRe = /\b(open|show|view|expand|zoom)\s+(?:me\s+)?(?:the\s+)?(?:shot|photo|foto|picture|image|snapshot)?\s*(?:number\s+)?(one|two|to|too|three|four|for|five|six|seven|eight|nine|ten|eleven|twelve)\b/;
    const deleteIndexDigitRe = new RegExp(`\\b(delete|remove|erase|trash|clear)\\s+(?:me\\s+)?(?:the\\s+)?${mediaDeleteNouns}\\s*(?:number|#)?\\s*(\\d{1,3})\\b`);
    const deleteIndexWordRe = new RegExp(`\\b(delete|remove|erase|trash|clear)\\s+(?:me\\s+)?(?:the\\s+)?${mediaDeleteNouns}\\s*(?:number\\s+)?(one|two|to|too|three|four|for|five|six|seven|eight|nine|ten|eleven|twelve)\\b`);
    const deleteLatestRe = new RegExp(`\\b(delete|remove|erase|trash)\\s+(?:the\\s+)?(?:last|latest)\\s+${mediaDeleteNouns}\\b`);
    const deleteCurrentRe = new RegExp(`\\b(delete|remove|erase|trash|clear)\\s+(?:the\\s+)?(?:(?:current|this|that)(?:\\s+one|\\s+item)?(?:\\s+${mediaDeleteNouns})?|(?:current|this|that)\\s+${mediaDeleteNouns})\\b`);
    const clearMediaRe = /\b(delete|remove|erase|trash|clear)\b[\s\w]{0,16}\b(?:all|every|entire|whole)\s+(media|gallery|photos?|fotos?|pictures?|snapshots?|shots?|videos?|clips?)\b/;
    const showThemRe = /\b(show|open|view)\s+(them|those|pictures?|photos?|fotos?|snapshots?|shots)\b/;
    const showCollectionRe = /\b(show|open|view|display)\b(?:\s+me)?(?:\s+the)?(?:\s+(all|any|my|these|those|last))?(?:\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve))?\s+(photos?|fotos?|pictures?|snapshots?|shots?|gallery)\b/;
    const showRecordingsCollectionRe = /\b(show|open|view|display)\b(?:\s+me)?(?:\s+the)?(?:\s+(all|any|my|these|those|last|latest))?\s+(recordings?|video\s+clips?|clips?)\b/;

    const wordToNum = {
        one: 1, two: 2, to: 2, too: 2, three: 3, four: 4, for: 4, five: 5, six: 6,
        seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12
    };
    const openIndexDigitMatch = lower.match(openIndexDigitRe);
    if (openIndexDigitMatch) {
        const n = Number(openIndexDigitMatch[2] || openIndexDigitMatch[4]);
        if (Number.isFinite(n) && n > 0) return { action: 'openIndex', index: n };
    }
    const openIndexWordMatch = lower.match(openIndexWordRe);
    if (openIndexWordMatch) {
        const n = wordToNum[openIndexWordMatch[2]];
        if (Number.isFinite(n) && n > 0) return { action: 'openIndex', index: n };
    }
    const deleteIndexDigitMatch = lower.match(deleteIndexDigitRe);
    if (deleteIndexDigitMatch) {
        const n = Number(deleteIndexDigitMatch[2]);
        if (Number.isFinite(n) && n > 0) return { action: 'deleteIndex', index: n };
    }
    const deleteIndexWordMatch = lower.match(deleteIndexWordRe);
    if (deleteIndexWordMatch) {
        const n = wordToNum[deleteIndexWordMatch[2]];
        if (Number.isFinite(n) && n > 0) return { action: 'deleteIndex', index: n };
    }
    if (expandLastImageRe.test(lower) || makeLastImageBigRe.test(lower) || openLastRe.test(lower)) return { action: 'openLatestImage' };
    if (expandRe.test(lower)) return 'expandLatest';
    if (showRecordingsCollectionRe.test(lower)) return { action: 'openRecordings' };
    if (openLatestMediaRe.test(lower)) return { action: 'openLatestMedia' };
    if (makeLastVideoBigRe.test(lower)) return { action: 'openLatestVideo' };
    if (openRecordingRe.test(lower)) return { action: 'openLatestVideo' };
    if (openVideoRe.test(lower)) return { action: 'openLatestVideo' };
    if (rotateLeftRe.test(lower)) return { action: 'rotateCurrentImage', delta: -90 };
    if (rotateAgainRe.test(lower)) return { action: 'rotateCurrentImage', delta: 90 };
    if (rotateRightRe.test(lower)) return { action: 'rotateCurrentImage', delta: 90 };
    if (brightenAgainRe.test(lower)) return { action: 'adjustCurrentImageBrightness', delta: 0.35 };
    if (brightenRe.test(lower)) return { action: 'adjustCurrentImageBrightness', delta: 0.35 };
    if (darkenRe.test(lower)) return { action: 'adjustCurrentImageBrightness', delta: -0.35 };
    if (undoEditsRe.test(lower)) return { action: 'undoCurrentImageEdits' };
    if (resetPhotoRe.test(lower)) return { action: 'resetCurrentImageEdits' };
    if (cropRe.test(lower)) return { action: 'cropCurrentImageUnsupported' };
    if (sharePhotoRe.test(lower)) return { action: 'shareCurrentImage' };
    if (downloadPhotoRe.test(lower)) return { action: 'downloadCurrentImage' };
    if (wallpaperPhotoRe.test(lower)) return { action: 'wallpaperCurrentImage' };
    if (deleteLatestRe.test(lower)) return 'deleteLatest';
    if (deleteCurrentRe.test(lower)) return 'deleteCurrent';
    if (clearMediaRe.test(lower) && deleteVerbAnyRe.test(lower)) return 'clear';
    if (showThemRe.test(lower)) return 'open';
    if (showCollectionRe.test(lower)) return 'open';

    // If the gallery/lightbox is already open, bare nouns like "media" / "gallery" / "photos"
    // are treated as a close intent (STT often drops the verb).
    if ((state.isMediaStripOpen || mediaLightbox?.classList.contains?.('active')) &&
        /^(?:media(?:\s+gallery)?|photos?|fotos?|pictures?|shots?|snapshots?)$/.test(lower)) {
        return 'close';
    }
    if (openVerbStartRe.test(lower) && recordingsWordRe.test(lower)) return { action: 'openRecordings' };

    if ((openVerbStartRe.test(lower) && mediaWordRe.test(lower)) ||
        /^(?:hey\s+blip\s+)?(?:(?:please|can|could|would|will)\s+you\s+)?(?:let\s+me\s+see|show\s+me)\s+(?:the\s+)?(media\s+gallery|gallery|media|photos?|fotos?|pictures?|snapshots?|shots?)$/.test(lower) ||
        /^(?:hey\s+blip\s+)?(?:(?:please|can|could|would|will)\s+you\s+)?(?:open|show|display|browse|pull\s+up)\s+(?:the\s+)?media\s+gallery$/.test(lower) ||
        /^(?:hey\s+blip\s+)?(?:(?:please|can|could|would|will)\s+you\s+)?open\s+my\s+(media|gallery|photos?|fotos?|pictures?|snapshots?|shots?)$/.test(lower) ||
        /^(?:hey\s+blip\s+)?(?:(?:please|can|could|would|will)\s+you\s+)?show\s+me\s+my\s+(media|gallery|photos?|fotos?|pictures?|snapshots?|shots?)$/.test(lower) ||
        // No bare "open gallery" matcher (media is the canonical term).
        /^show\s+my\s+(photos?|fotos?|pictures?|snapshots?)$/.test(lower)) return 'open';
    // Close the current lightbox item (singular). If user says plural ("photos", "pictures", "shots"),
    // they almost always mean the gallery/strip, not the single lightbox.
    const wantsCloseVerb = closeVerbStartRe.test(lower) || /\b(close|hide|exit|dismiss)\b/.test(lower);
    const mentionsGallery = /\b(?:gallery|media)\b/.test(lower);
    const mentionsPluralCollection = /\b(?:photos|fotos|pictures|shots|snapshots)\b/.test(lower);
    const mentionsSingularItem = /\b(?:photo|foto|picture|image|shot|snapshot)\b/.test(lower);
    if (wantsCloseVerb && mentionsSingularItem && !mentionsGallery && !mentionsPluralCollection) return { action: 'mediaCloseImage' };

    if ((wantsCloseVerb && (mediaWordRe.test(lower) || recordingsWordRe.test(lower) || mentionsPluralCollection || mentionsGallery)) ||
        /^close\s+media$/.test(lower) ||
        /^close\s+(?:photos?|fotos?)$/.test(lower) ||
        /^hide\s+media$/.test(lower)) return 'close';
    return null;
}

/** Voice command parser for panel navigation across media/video/graph/map. */
function getPanelNavigationVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    // Let dedicated quick-open handlers own indexed item commands like "open photo 1".
    if (/\b(?:open|show|view|play)\s+(?:the\s+)?(?:photo|foto|picture|shot|snapshot)\s+(?:number\s+|#\s*)?(?:\d{1,3}|one|two|to|too|three|four|for|five|six|seven|eight|nine|ten|eleven|twelve)\b/.test(lower)) {
        return null;
    }
    // Never treat "open/show creation(s)" as calendar — creations panel wins.
    if (/\b(?:open|show|view)\b[\s\w]{0,24}\bcreations?\b/.test(lower)) return null;
    // In gallery/lightbox, bare "next" / "previous" / "change" advance without needing to say "item" or "picture".
    if (state.isMediaStripOpen || (mediaLightbox?.classList.contains?.('active'))) {
        if (/^(?:next|forward)(?:\s+one)?\s*$/.test(lower)) return 'mediaNext';
        if (/^(?:previous|prev|back)(?:\s+one)?\s*$/.test(lower)) return 'mediaPrev';
        if (/\bchange\s+(?:to\s+)?(?:next|the\s+next\s+one)\b/.test(lower) || /^change\s+(?:photo|picture|image|video|clip)\s*$/.test(lower)) return 'mediaNext';
        if (/\bchange\s+(?:to\s+)?(?:previous|prev|the\s+previous\s+one)\b/.test(lower)) return 'mediaPrev';
    }
    const closeLikeVerb = '(?:close|hide|exit|dismiss|clear|remove|delete)';
    const mediaNouns = '(picture|photo|image|shot|snapshot|design|drawing|creation|graph|chart|item|one)s?';
    const mediaExpandImageRe = /\b(make|show|open|view|expand|enlarge|zoom|maximize|blow\s+up)\s+(?:me\s+)?(?:the\s+)?(?:it|this|this\s+one|that|picture|photo|image|shot|snapshot)\s*(?:big|bigger|large|larger|full(?:\s+screen)?)?\b|\b(?:big|bigger|large|larger|full(?:\s+screen)?)\s+(?:picture|photo|image|shot|snapshot)\b|\bmake\s+(?:the\s+)?(?:picture|photo|image|shot|snapshot|it)\s+full(?:\s+screen)?\b/;
    const creationExpandImageRe = /\b(make|show|open|view|expand|enlarge|zoom|maximize)\s+(?:me\s+)?(?:the\s+)?(?:it|this|this\s+one|that|creation|design|drawing|art)\s*(?:big|bigger|large|larger)?\b|\b(?:big|bigger|large|larger)\s+(?:creation|design|drawing|art)\b/;
    const mediaExpandVideoRe = /\b(make|show|open|view|expand|enlarge|zoom|maximize)\s+(?:me\s+)?(?:the\s+)?(?:it|this|this\s+one|that|video|clip|recording)\s*(?:big|bigger|large|larger)?\b|\b(?:big|bigger|large|larger)\s+(?:video|clip|recording)\b/;

    if (new RegExp(`\\b(next|forward)\\s+${mediaNouns}\\b`).test(lower)) return 'mediaNext';
    if (new RegExp(`\\b(previous|prev|back|last)\\s+${mediaNouns}\\b`).test(lower)) return 'mediaPrev';
    if (canOpenCurrentCreationFromPanel() && creationExpandImageRe.test(lower)) return 'mediaOpenCurrentImage';
    if ((mediaLightbox?.classList.contains('active') || state.isMediaStripOpen) && mediaExpandVideoRe.test(lower)) return 'mediaOpenCurrentVideo';
    if ((mediaLightbox?.classList.contains('active') || state.isMediaStripOpen) && mediaExpandImageRe.test(lower)) return 'mediaOpenCurrentImage';
    if (new RegExp(`\\b${closeLikeVerb}\\s+(the\\s+)?${mediaNouns}\\b`).test(lower)) return 'mediaCloseImage';
    if ((mediaLightbox?.classList.contains('active') || state.isMediaStripOpen) &&
        new RegExp(`\\b${closeLikeVerb}\\s+(the\\s+)?(it|this\\s+one)\\b`).test(lower)) return 'mediaCloseImage';
    if (/\b(back|return)\s+(to\s+)?(gallery|media)\b/.test(lower)) return 'mediaBack';

    if (/^(?:please\s+)?(open|show|view|resume)\s+(the\s+)?(video|youtube)(?:\s+please)?\s*$/.test(lower)) return 'openVideo';
    if (/^(?:please\s+)?(close|hide|exit|dismiss|clear|remove|delete)\s+(the\s+)?(video|youtube)(?:\s+please)?\s*$/.test(lower)) return 'closeVideo';
    if (/^(?:please\s+)?(open|show|view)\s+(the\s+)?(graph|chart|design)(?:\s+please)?\s*$/.test(lower)) return 'openChart';
    if (/^(?:please\s+)?(close|hide|exit|dismiss|clear|remove|delete)\s+(the\s+)?(graph|chart|design)(?:\s+please)?\s*$/.test(lower)) return 'closeChart';
    if (/^(?:please\s+)?(open|show|view)\s+(the\s+)?map(?:\s+please)?\s*$/.test(lower)) return 'openMap';
    if (/^(?:please\s+)?(close|hide|exit|dismiss|clear|remove|delete)\s+(the\s+)?map(?:\s+please)?\s*$/.test(lower)) return 'closeMap';
    if (/^(?:please\s+)?(open|show|view)\s+(?:(?:the|my)\s+)?(calendar|schedule|agenda|events?)(?:\s+please)?\s*$/.test(lower) ||
        /\b(?:open|show|view)\b[\s\w]{0,24}\b(?:calendar|schedule|agenda|events?)\b/.test(lower)) return 'openCalendar';
    if (/^(?:please\s+)?(close|hide|exit|dismiss|clear|remove|delete)\s+(?:(?:the|my)\s+)?(calendar|schedule|agenda)(?:\s+please)?\s*$/.test(lower)) return 'closeCalendar';
    if (/\b(close|hide|exit|dismiss|clear|remove|delete)\s+(the\s+)?(panel|window|display)\b/.test(lower)) return 'closePanel';

    // Fallback: short close intents like "close", "close it", "dismiss this"
    // should close the currently visible surface (lightbox → gallery → chart/map → panels).
    const anythingClosable = !!(
        mediaLightbox?.classList.contains?.('active') ||
        state.isMediaStripOpen ||
        state.currentMode !== 'core' ||
        isSettingsPanelOpen?.() ||
        isSidePanelVisible?.() ||
        state.pendingImage
    );
    if (anythingClosable && /^(?:please\s+)?(?:close|hide|exit|dismiss)(?:\s+(?:it|this|that))?\s*$/.test(lower)) return 'closePanel';

    return null;
}

/** True if the user is giving a YouTube panel control command (mute, close, pause, etc.). */
function getYouTubeVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    if (/\bcalendar\b/.test(lower)) return null;
    const libraryView = resolveYouTubeLibraryViewFromVoice(lower);
    if (libraryView === 'Music') return 'openMusic';
    if (libraryView === 'Videos') return 'openVideos';
    const youtubePanelOpen = isSidePanelVisible() && (
        state.currentSidePanelAction === 'youtube' ||
        !!blipYtPlayer
    );
    if (/^(?:please\s+)?(?:open|show|browse|view|pull\s+up|bring\s+up)(?:\s+the)?\s+youtube(?:\s+(?:library|menu|list))?(?:\s+please)?$/.test(lower) ||
        /^(?:please\s+)?youtube(?:\s+(?:library|menu|list))?(?:\s+please)?$/.test(lower)) return 'openYouTube';
    if (/^(?:please\s+)?(?:pause|pause\s+(?:the\s+)?(?:video|youtube|player|it))(?:\s+please)?$/.test(lower)) return 'pause';
    if (/^(?:please\s+)?(?:play|resume|play\s+(?:the\s+)?(?:video|youtube|player|it)|resume\s+(?:the\s+)?(?:video|youtube|player|it))(?:\s+please)?$/.test(lower)) return 'play';
    if (/^(?:please\s+)?(?:stop|stop\s+(?:the\s+)?(?:video|youtube|player|it))(?:\s+please)?$/.test(lower)) return 'stop';
    if (/^(?:please\s+)?open\s+music(?:\s+please)?$/.test(lower) || /^(?:please\s+)?show\s+music(?:\s+please)?$/.test(lower)) return 'openMusic';
    if (/^(?:please\s+)?open\s+videos?(?:\s+please)?$/.test(lower) || /^(?:please\s+)?show\s+videos?(?:\s+please)?$/.test(lower)) return 'openVideos';
    if (youtubePanelOpen && /\b(?:switch|change|go|move|set)\s+(?:to\s+)?music\b/.test(lower)) return 'openMusic';
    if (youtubePanelOpen && /\b(?:switch|change|go|move|set)\s+(?:to\s+)?videos?\b/.test(lower)) return 'openVideos';
    if ((state.pendingYouTubeAction === 'unmute' || youtubePanelOpen) && /^(ok|yes|play)\s*$/.test(lower)) return 'unmute';
    if (/\bun\s*-?\s*mute\b/.test(lower) ||
        /\bsound\s+on\b/.test(lower) ||
        /\baudio\s+on\b/.test(lower) ||
        /\bturn\s+on\s+(the\s+)?sound\b/.test(lower) ||
        /\b(with\s+)?sound\s+on\b/.test(lower)) return 'unmute';
    if (/\bmute\b/.test(lower) || /\bturn\s+off\s+(the\s+)?sound\b/.test(lower) || /\bsound\s+off\b/.test(lower)) return 'mute';
    if (/^(?:please\s+)?(?:close|hide|dismiss)\s+(?:the\s+)?(?:video|panel)(?:\s+again)?(?:\s+please)?$/.test(lower) ||
        /^(?:please\s+)?(?:exit|done)\s+(?:with\s+)?(?:the\s+)?video(?:\s+again)?(?:\s+please)?$/.test(lower) ||
        /^(?:please\s+)?(?:close|hide|dismiss)\s+it(?:\s+again)?(?:\s+please)?$/.test(lower)) return 'close';
    if (/^(?:please\s+)?(?:skip|next(?:\s+(?:video|one))?|another\s+video|different\s+video)(?:\s+please)?$/.test(lower)) return 'next';
    if (/^(?:please\s+)?(?:new\s+video|change\s+(?:subject|video|topic))(?:\s+please)?$/.test(lower)) return 'new';
    if (/\b(start\s+over|from\s+the\s+beginning|restart)\b/.test(lower)) return 'restart';
    if (/\b(big(ger)?|large)\s+blip\b/.test(lower) ||
        /\bmake\s+blip\s+(bigger|larger|big)\b/.test(lower) ||
        /\benlarge\s+blip\b/.test(lower)) return 'blipBig';
    if (/\b(small(er)?|mini)\s+blip\b/.test(lower) ||
        /\bmake\s+blip\s+(smaller|small|mini)\b/.test(lower) ||
        /\bshrink\s+blip\b/.test(lower)) return 'blipSmall';
    if (/\bmake\s+(?:the\s+)?video\s+big\b/.test(lower) ||
        /\b(make\s+)?(the\s+)?video\s+bigger\b/.test(lower) ||
        /\bbigger\s+video\b/.test(lower) ||
        /\bexpand\s+(the\s+)?video\b/.test(lower) ||
        /\benlarge\s+(the\s+)?video\b/.test(lower) ||
        /\blarge\s+video\b/.test(lower) ||
        /\bvideo\s+big\b/.test(lower) ||
        /\bfull\s*screen\b/.test(lower) ||
        /\bfullscreen\b/.test(lower) ||
        /\bfull\s+view\b/.test(lower) ||
        /\bmaximize\s+(the\s+)?video\b/.test(lower) ||
        /\bcinema\s+mode\b/.test(lower)) return 'videoBig';
    if (youtubePanelOpen && (
        /\bmake\s+it\s+(big|bigger|large|larger)\b/.test(lower) ||
        /\bshow\s+it\s+(big|bigger|large|larger)\b/.test(lower) ||
        /\bopen\s+it\s+(big|bigger|large|larger)\b/.test(lower) ||
        /\b(enlarge|expand|maximize|fullscreen|full\s*screen|zoom\s+in)\b/.test(lower)
    )) return 'videoBig';
    if (/\b(make\s+)?(the\s+)?video\s+smaller\b/.test(lower) ||
        /\bsmall(er)?\s+video\b/.test(lower) ||
        /\bvideo\s+small\b/.test(lower) ||
        /\bexit\s+(full\s*screen|fullscreen|full\s+view)\b/.test(lower) ||
        /\bnormal\s+view\b/.test(lower) ||
        /\bdefault\s+view\b/.test(lower)) return 'videoSmall';
    if (youtubePanelOpen && (
        /\bmake\s+it\s+(small|smaller|normal)\b/.test(lower) ||
        /\bshow\s+it\s+(small|smaller|normal)\b/.test(lower) ||
        /\b(shrink|reduce|zoom\s+out)\b/.test(lower)
    )) return 'videoSmall';
    if (/\brewind\b/.test(lower) || /\bgo\s+back\b/.test(lower) || /\breplay\b/.test(lower)) return 'rewind';
    if (/\bforward\b/.test(lower) || /\bskip\s+ahead\b/.test(lower) || /\bfast\s*forward\b/.test(lower) || /\bgo\s+forward\b/.test(lower)) return 'forward';
    return null;
}

function getYouTubeLibraryBrowseVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string' || !isYouTubeLibraryVoiceContextOpen()) return null;
    const lower = normalizeVoiceTokens(cmd);
    if (isYouTubeLibraryOnlyPanelOpen()) {
        if (/^(?:please\s+)?(?:next|next\s+one|next\s+video|go\s+next|move\s+down)(?:\s+please)?$/.test(lower)) return 'next';
        if (/^(?:please\s+)?(?:previous|prev|back|last|previous\s+one|go\s+back|move\s+up)(?:\s+please)?$/.test(lower)) return 'previous';
    }
    if (/^(?:please\s+)?(?:scroll|move|go|browse)\s+down(?:\s+please)?$/.test(lower) ||
        /^(?:please\s+)?(?:scroll|browse)\s+(?:the\s+)?(?:youtube\s+)?(?:list|library)\s+down(?:\s+please)?$/.test(lower)) return 'next';
    if (/^(?:please\s+)?(?:scroll|move|go|browse)\s+up(?:\s+please)?$/.test(lower) ||
        /^(?:please\s+)?(?:scroll|browse)\s+(?:the\s+)?(?:youtube\s+)?(?:list|library)\s+up(?:\s+please)?$/.test(lower)) return 'previous';
    return null;
}

function getYouTubeLibraryDeleteVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string' || !isYouTubeLibraryVoiceContextOpen()) return null;
    return extractYouTubeLibraryDeleteTargetFromVoice(cmd);
}

/** Blip speech volume voice command: 'volume down' (25% down) or 'volume up' (5% up). */
function getVolumeVoiceCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
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
    if (typeof window.onYouTubeIframeAPIReady !== 'function') {
        window.onYouTubeIframeAPIReady = function () {
            const callbacks = Array.isArray(window.blipYtReadyCallbacks) ? [...window.blipYtReadyCallbacks] : [];
            window.blipYtReadyCallbacks = [];
            callbacks.forEach((cb) => {
                try { cb(); } catch (error) { console.warn('YouTube ready callback failed:', error?.message || error); }
            });
        };
    }
}

function renderYouTubeIframeFallback(videoId) {
    const fallback = document.getElementById('blip-yt-player');
    if (!fallback || !videoId) return;
    const wantsSoundOn = state.pendingYouTubeAction === 'unmute' || state.pendingYouTubeAction === 'play';
    fallback.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${wantsSoundOn ? '0' : '1'}&playsinline=1&rel=0" width="100%" height="200" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" style="border:none;border-radius:12px;"></iframe>`;
    if (wantsSoundOn) state.pendingYouTubeAction = null;
}

function mountYouTubePlayer(videoId) {
    if (!videoId) return;
    ensureYouTubeAPI(() => {
        const mountNode = document.getElementById('blip-yt-player');
        if (!mountNode) return;
        try {
            blipYtPlayer = new window.YT.Player('blip-yt-player', {
                videoId,
                playerVars: {
                    autoplay: 1,
                    mute: 1,
                    playsinline: 1,
                    enablejsapi: 1,
                    rel: 0,
                    modestbranding: 1,
                    origin: window.location.origin
                },
                events: {
                    onReady: (e) => {
                        try { e.target.playVideo(); } catch (_) {}
                        if (state.pendingYouTubeAction) {
                            const pending = state.pendingYouTubeAction;
                            state.pendingYouTubeAction = null;
                            setTimeout(() => {
                                runYouTubeAction(pending);
                            }, 140);
                        }
                    },
                    onError: (event) => {
                        console.warn('YouTube player error:', event?.data);
                        renderYouTubeIframeFallback(videoId);
                    }
                }
            });
        } catch (error) {
            console.warn('YT.Player failed, using fallback iframe:', error?.message || error);
            renderYouTubeIframeFallback(videoId);
        }
    });
}

// Mount a controllable YouTube player without a Data API key by using the
// IFrame API "search playlist" mode. This enables voice commands like unmute/mute/pause/play.
function mountYouTubeSearchPlayer(query = '') {
    const q = String(query || '').trim();
    if (!q) return;
    ensureYouTubeAPI(() => {
        const mountNode = document.getElementById('blip-yt-player');
        if (!mountNode) return;
        try {
            blipYtPlayer = new window.YT.Player('blip-yt-player', {
                playerVars: {
                    listType: 'search',
                    list: q,
                    autoplay: 1,
                    mute: 1,
                    playsinline: 1,
                    enablejsapi: 1,
                    rel: 0,
                    modestbranding: 1,
                    origin: window.location.origin
                },
                events: {
                    onReady: (e) => {
                        try { e.target.playVideo(); } catch (_) {}
                        if (state.pendingYouTubeAction) {
                            const pending = state.pendingYouTubeAction;
                            state.pendingYouTubeAction = null;
                            setTimeout(() => {
                                runYouTubeAction(pending);
                            }, 140);
                        }
                    },
                    onError: (event) => {
                        console.warn('YouTube player error:', event?.data);
                        // Fall back to a plain iframe search embed (still playable, but no JS control).
                        const fallback = document.getElementById('blip-yt-player');
                        if (!fallback) return;
                        const wantsSoundOn = state.pendingYouTubeAction === 'unmute' || state.pendingYouTubeAction === 'play';
                        const src = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(q)}&autoplay=1&mute=${wantsSoundOn ? '0' : '1'}&playsinline=1&rel=0`;
                        fallback.innerHTML = `<iframe src="${src}" width="100%" height="200" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" style="border:none;border-radius:12px;"></iframe>`;
                        if (wantsSoundOn) state.pendingYouTubeAction = null;
                    }
                }
            });
        } catch (error) {
            console.warn('YT.Player search mode failed:', error?.message || error);
            const fallback = document.getElementById('blip-yt-player');
            if (!fallback) return;
            const wantsSoundOn = state.pendingYouTubeAction === 'unmute' || state.pendingYouTubeAction === 'play';
            const src = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(q)}&autoplay=1&mute=${wantsSoundOn ? '0' : '1'}&playsinline=1&rel=0`;
            fallback.innerHTML = `<iframe src="${src}" width="100%" height="200" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" style="border:none;border-radius:12px;"></iframe>`;
            if (wantsSoundOn) state.pendingYouTubeAction = null;
        }
    });
}

/** True when the user is asking to see the last video again (e.g. "show me the video", "play the video"). */
function wantsToSeeLastVideo(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = normalizeVoiceTokens(cmd);
    return /\b(show|play|open)\s+(me\s+)?(the\s+)?video\b/.test(lower) ||
        /\b(show|play)\s+it\s+again\b/.test(lower) ||
        /\b(show|play)\s+(the\s+)?video\s+again\b/.test(lower) ||
        /\bwhere'?s?\s+(the\s+)?video\b/.test(lower) ||
        /\bopen\s+(the\s+)?video\b/.test(lower);
}

/** True when the user is asking to see the graph again (e.g. "I don't see the graph", "show it again"). */
function wantsToSeeLastGraph(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = normalizeVoiceTokens(cmd);
    return /\b(don't|do not|can't|cannot)\s+see\s+(the\s+)?graph\b/.test(lower) ||
        /\b(show|send)\s+(me\s+)?(the\s+)?graph\s+again\b/.test(lower) ||
        /\b(show|send)\s+it\s+again\b/.test(lower) ||
        /\bwhere'?s?\s+(the\s+)?graph\b/.test(lower) ||
        /\bwhere\s+is\s+(the\s+)?graph\b/.test(lower) ||
        /\b(graph|it)\s+didn't\s+show\b/.test(lower) ||
        /\b(graph|it)\s+did\s+not\s+show\b/.test(lower) ||
        /\b(graph\s+is\s+)?(missing|not\s+there)\b/.test(lower);
}

/** True when user asks to re-open media because they can't see it. */
function wantsToSeeMediaAgain(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = normalizeVoiceTokens(cmd);
    if (/\b(video|youtube|graph|chart|map|calendar)\b/.test(lower)) return false;
    return /\b(where\b.*\b(open|show|put)\b.*\b(it|them|those)\b)/.test(lower) ||
        /\b(can't|cannot|don't|do not)\s+see\s+(the\s+)?gallery\b/.test(lower) ||
        /\b(can't|cannot|don't|do not)\s+see\s+(it|them|those|pictures?|photos?|snapshots?|shots?)\b/.test(lower) ||
        /\b(show|open)\s+(it|them|those)\b/.test(lower) ||
        /\bshow\s+(me\s+)?(any|some)\s+(photo|picture|snapshot|shot)s?\b/.test(lower) ||
        /^show\s+(me\s+)?(the\s+)?(pictures?|photos?|snapshots?|shots?|gallery)\b/.test(lower) ||
        /\bshow\s+them\s+to\s+me\b/.test(lower) ||
        /\bshow\s+me\s+.*\b(display|screen)\b/.test(lower);
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

function toCompactReply(text, maxWords = BLIP_REPLY_MAX_WORDS) {
    if (!text || typeof text !== 'string') return '';
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    let first = normalized.split(/(?<=[.!?])\s+/)[0]?.trim() || normalized;
    const words = first.split(' ').filter(Boolean);
    if (words.length > maxWords) first = words.slice(0, maxWords).join(' ');
    if (!/[.!?]$/.test(first)) first += '.';
    return first;
}

function toSpokenReply(text, maxWords = 22) {
    if (!text || typeof text !== 'string') return '';
    const cleaned = sanitizeBlipReplyText(String(text)
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/\[[^\]]+\]\([^)]+\)/g, '')
        .replace(/[*_`#>]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim());
    if (!cleaned) return '';
    let spoken = cleaned
        .split(/(?<=[.!?])\s+/)
        .slice(0, 2)
        .join(' ')
        .trim();
    const words = spoken.split(' ').filter(Boolean);
    if (words.length > maxWords) {
        spoken = words.slice(0, maxWords).join(' ');
    }
    spoken = spoken.replace(/\s+,/g, ',').replace(/\s+\./g, '.').trim();
    if (!/[.!?]$/.test(spoken)) spoken += '.';
    return spoken;
}

function sanitizeBlipReplyText(text = '') {
    return String(text || '')
        .replace(/^(?:happy|curious|serious|sad|angry|confident|gentle|playful|sleepy|surprised)\s+(?=[A-Z]|okay\b|ok\b|alright\b|i\b|let\b)/i, '')
        .replace(/\s+/g, ' ')
        .trim();
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
            if (isGeminiQuotaError(e)) {
                switchAwayFromGeminiVoice('auto-quota');
            }
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

async function speakWithGuard(text, emotion = 'serious') {
    state.lastSpeechStartedAt = Date.now();
    state.lastSpokenText = String(text || '').trim();
    syncScenerySuppression();
    try {
        await speak(text, emotion);
    } catch (e) {
        console.warn('Speech guard fallback:', e.message);
        speech.isSpeaking = false;
        speech.stopSpeaking?.();
        animateMouth(0);
    } finally {
        state.lastSpeechStartedAt = 0;
        state.lastSpokenFinishedAt = Date.now();
        syncScenerySuppression();
    }
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
    if (blipStage) {
        blipStage.setAttribute('data-emotion', p.emotion || 'serious');
    }
    if (faceContainer) {
        faceContainer.setAttribute('data-emotion', p.emotion || 'serious');
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
    syncScenerySuppression();
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

function getReplyPersonaKey(emotion = 'happy') {
    if (emotion === 'sleepy') return 'sleepy';
    return Object.prototype.hasOwnProperty.call(PERSONAS, emotion) ? emotion : 'happy';
}

function resumeListeningAfterEmotionShowcase(delay = 0) {
    if (emotionShowcaseResumeTimer) {
        clearTimeout(emotionShowcaseResumeTimer);
        emotionShowcaseResumeTimer = null;
    }
    emotionShowcaseResumeTimer = setTimeout(() => {
        if (state.emotionShowcaseActive || speech.isSpeaking || state.isThinking) {
            resumeListeningAfterEmotionShowcase(180);
            return;
        }
        emotionShowcaseResumeTimer = null;
        if (!state.isActive || state.softSleepMode || state.activeAlert) return;
        setRestingEyes(false);
        setPersona('listening');
        talkBtn.classList.add('active');
        talkBtn.classList.remove('thinking');
        talkBtn.innerText = 'Ask Blip';
        startListeningLoop();
    }, delay);
}

function resumeListeningAfterWake(delay = 0) {
    if (emotionShowcaseResumeTimer) {
        clearTimeout(emotionShowcaseResumeTimer);
        emotionShowcaseResumeTimer = null;
    }
    emotionShowcaseResumeTimer = setTimeout(() => {
        if (speech.isSpeaking || state.isThinking) {
            resumeListeningAfterWake(180);
            return;
        }
        emotionShowcaseResumeTimer = null;
        if (!state.isActive || state.softSleepMode || state.activeAlert) return;
        setRestingEyes(false);
        setPersona('listening');
        talkBtn.classList.add('active');
        talkBtn.classList.remove('thinking');
        talkBtn.innerText = 'Ask Blip';
        startListeningLoop();
    }, delay);
}

function spawnHappyBirds(count = 5) {
    const container = document.getElementById('floating-symbols');
    if (!container) return;
    for (let i = 0; i < count; i++) {
        const bird = document.createElement('div');
        bird.className = 'blip-bird';
        bird.textContent = '🕊';
        bird.style.left = `${18 + Math.random() * 58}%`;
        bird.style.top = `${18 + Math.random() * 28}%`;
        bird.style.animationDelay = `${i * 0.12}s`;
        bird.style.animationDuration = `${2.6 + Math.random() * 0.8}s`;
        container.appendChild(bird);
        setTimeout(() => bird.remove(), 4200);
    }
}

function triggerEmotionShowcase(emotion) {
    if (!faceContainer || !blipStage) return;
    if (emotionShowcaseTimer) {
        clearTimeout(emotionShowcaseTimer);
        emotionShowcaseTimer = null;
    }
    state.emotionShowcaseActive = true;
    blipStage.removeAttribute('data-emotion-showcase');
    faceContainer.removeAttribute('data-emotion-showcase');
    void faceContainer.offsetWidth;
    blipStage.setAttribute('data-emotion-showcase', emotion);
    faceContainer.setAttribute('data-emotion-showcase', emotion);
    if (emotion === 'happy') {
        triggerWakeRainbowBurst();
        spawnHappyBirds(6);
    } else if (emotion === 'angry') {
        setFaceAnimation('face-anim-shake');
    } else if (emotion === 'sad') {
        setFaceAnimation('face-anim-float');
    } else if (emotion === 'serious') {
        setFaceAnimation('face-anim-glow');
    }
    emotionShowcaseTimer = setTimeout(() => {
        blipStage?.removeAttribute('data-emotion-showcase');
        if (faceContainer) faceContainer.removeAttribute('data-emotion-showcase');
        setFaceAnimation(null);
        state.emotionShowcaseActive = false;
        resumeListeningAfterEmotionShowcase(80);
        emotionShowcaseTimer = null;
    }, 4200);
}

function getEmotionShowcaseCommand(cmd) {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeVoiceTokens(cmd);
    const emotionMap = {
        happy: 'happy',
        happiness: 'happy',
        sad: 'sad',
        sadness: 'sad',
        angry: 'angry',
        mad: 'angry',
        serious: 'serious'
    };
    const match = lower.match(/\b(?:show|be|look|go|turn)\s+(?:me\s+)?(?:your\s+)?(happy|happiness|sad|sadness|angry|mad|serious)\b|\b(?:show\s+me\s+)?(?:your\s+)?(happy|happiness|sad|sadness|angry|mad|serious)\s+(?:mode|face|emotion)\b/);
    const raw = match?.[1] || match?.[2] || '';
    return emotionMap[raw] || null;
}

function triggerWakeRainbowBurst() {
    if (!faceFrame) return;
    if (wakeRainbowTimer) clearTimeout(wakeRainbowTimer);
    faceFrame.classList.remove('wake-rainbow');
    void faceFrame.offsetWidth;
    faceFrame.classList.add('wake-rainbow');
    playWakeChime();
    wakeRainbowTimer = setTimeout(() => {
        faceFrame?.classList.remove('wake-rainbow');
        wakeRainbowTimer = null;
    }, 2500);
}

function setRestingEyes(isResting) {
    if (!face) return;
    face.classList.toggle('resting-eyes', !!isResting);
    if (isResting) {
        // Remove blink inline styles so sleep CSS stays stable.
        face.querySelectorAll('.eye').forEach((eye) => {
            eye.style.height = '';
            eye.style.top = '';
        });
        startDreamThoughts();
    } else {
        stopDreamThoughts();
    }
}

function spawnDreamThought() {
    if (!dreamThoughts || !face?.classList.contains('resting-eyes')) return;
    const text = SLEEP_DREAM_QUOTES[Math.floor(Math.random() * SLEEP_DREAM_QUOTES.length)];
    const chip = document.createElement('span');
    chip.className = 'dream-thought';
    chip.textContent = text;
    const delay = Math.random() * 0.28;
    const duration = 15 + Math.random() * 3.2;
    const driftX = Math.floor(Math.random() * 44) - 22;
    const driftY = -(178 + Math.floor(Math.random() * 38));
    const faceRect = face?.getBoundingClientRect?.();
    const stageRect = dreamThoughts.getBoundingClientRect();
    let startLeft = stageRect.width * 0.5;
    let startTop = stageRect.height * 0.26;
    if (faceRect && stageRect.width > 0 && stageRect.height > 0) {
        startLeft = (faceRect.left - stageRect.left) + (faceRect.width * 0.36);
        startTop = (faceRect.top - stageRect.top) + (faceRect.height * 0.27);
    }
    startLeft += Math.floor(Math.random() * 34) - 17;
    startTop += Math.floor(Math.random() * 16) - 8;
    chip.style.left = `${startLeft}px`;
    chip.style.top = `${startTop}px`;
    chip.style.setProperty('--dream-drift-x', `${driftX}px`);
    chip.style.setProperty('--dream-drift-y', `${driftY}px`);
    chip.style.setProperty('--dream-delay', `${delay}s`);
    chip.style.setProperty('--dream-dur', `${duration.toFixed(2)}s`);
    dreamThoughts.appendChild(chip);
    setTimeout(() => chip.remove(), Math.ceil(duration * 1000) + 500);
}

function startDreamThoughts() {
    if (!dreamThoughts) return;
    stopDreamThoughts();
    spawnDreamThought();
    state.sleepDreamInterval = setInterval(() => {
        if (!face?.classList.contains('resting-eyes')) {
            stopDreamThoughts();
            return;
        }
        spawnDreamThought();
    }, 8000);
}

function stopDreamThoughts() {
    if (state.sleepDreamInterval) {
        clearInterval(state.sleepDreamInterval);
        state.sleepDreamInterval = null;
    }
    if (dreamThoughts) dreamThoughts.innerHTML = '';
}

// Deprecated: Alias for backward compatibility
function setEmotion(e) {
    // Find a persona that matches this emotion or fallback to idle
    const found = Object.keys(PERSONAS).find(k => PERSONAS[k].emotion === e);
    setPersona(found || 'idle');
}

function triggerRandomIdle() {
    // Only idle if app is active but NOT thinking, NOT speaking, and NOT already emotional
    if (!state.isActive || state.softSleepMode || face?.classList.contains('resting-eyes') || state.isThinking || speech.isSpeaking || state.currentEmotion !== 'serious') return;

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

function registerExtraSceneryObjects() {
    const layer = document.querySelector('.scenery-layer');
    const faceArea = document.getElementById('face-area');
    if (!layer || !faceArea) return;
    let outerLayer = faceArea.querySelector('.outer-scenery-layer');
    if (!outerLayer) {
        outerLayer = document.createElement('div');
        outerLayer.className = 'outer-scenery-layer';
        faceArea.appendChild(outerLayer);
    }

    layer.querySelectorAll('.scenery-object').forEach((obj) => obj.remove());
    outerLayer.querySelectorAll('.scenery-object').forEach((obj) => obj.remove());
    CAPABILITY_SCENERY_OBJECTS.forEach((item, index) => {
        const obj = document.createElement('div');
        obj.id = item.id;
        obj.className = 'scenery-object';
        obj.textContent = item.emoji;
        obj.dataset.capability = item.label;
        obj.dataset.orbitSize = item.size;
        obj.dataset.orbitOrder = String(index);
        layer.appendChild(obj);
    });
    DECORATIVE_SCENERY_OBJECTS.forEach((item, index) => {
        const obj = document.createElement('div');
        obj.id = item.id;
        obj.className = 'scenery-object scenery-object-decor';
        if (item.emoji) obj.textContent = item.emoji;
        obj.dataset.capability = item.label;
        obj.dataset.sceneryKind = 'decor';
        obj.dataset.decorType = item.decorType || '';
        obj.dataset.orbitSize = item.size;
        obj.dataset.radiusBoost = String(item.radiusBoost || 0);
        obj.dataset.orbitDuration = String(item.duration || 0);
        obj.dataset.orbitDirection = item.direction || 'normal';
        obj.dataset.orbitDelay = item.delay || '0s';
        obj.dataset.orbitPhase = String(item.phase ?? (300 + (index * 24)));
        outerLayer.appendChild(obj);
    });
}

/**
 * 🪐 Capability Orbit: keeps Blip's feature artifacts rotating like planets.
 */
function startSceneryDirector() {
    const objects = Array.from(document.querySelectorAll('.scenery-object'));
    if (objects.length === 0) return;
    const decorativeObjects = objects.filter((obj) => obj.dataset.sceneryKind === 'decor');
    const capabilityObjects = objects.filter((obj) => obj.dataset.sceneryKind !== 'decor');
    const outerLayer = document.querySelector('.outer-scenery-layer');
    const faceArea = document.getElementById('face-area');
    const core = face?.querySelector('.face-core');
    const coreRect = core?.getBoundingClientRect();
    const frameRect = faceFrame?.getBoundingClientRect();
    const faceRect = face?.getBoundingClientRect();
    if (outerLayer && faceArea && frameRect) {
        const areaRect = faceArea.getBoundingClientRect();
        const outerSize = Math.max(frameRect.width, frameRect.height, faceRect?.width || 0, faceRect?.height || 0) + 240;
        outerLayer.style.width = `${outerSize}px`;
        outerLayer.style.height = `${outerSize}px`;
        outerLayer.style.left = `${(frameRect.left - areaRect.left) + (frameRect.width / 2)}px`;
        outerLayer.style.top = `${(frameRect.top - areaRect.top) + (frameRect.height / 2)}px`;
    }
    const minOrbitRadius = coreRect
        ? Math.max(CAPABILITY_MIN_ORBIT_RADIUS_PX, Math.round((coreRect.width / 2) + 14))
        : CAPABILITY_MIN_ORBIT_RADIUS_PX;
    const maxOrbitRadius = frameRect
        ? Math.max(minOrbitRadius, Math.floor((Math.min(frameRect.width, frameRect.height) / 2) - CAPABILITY_ORBIT_PADDING_PX))
        : minOrbitRadius + (CAPABILITY_MIN_RING_GAP_PX * Math.max(0, capabilityObjects.length - 1));
    const maxCapabilityOrbitRadius = decorativeObjects.length
        ? Math.max(minOrbitRadius, maxOrbitRadius - 26)
        : maxOrbitRadius;
    const sortedObjects = capabilityObjects.slice()
        .sort((a, b) => Number.parseInt(a.dataset.orbitOrder || '0', 10) - Number.parseInt(b.dataset.orbitOrder || '0', 10));
    const availableRange = Math.max(0, maxCapabilityOrbitRadius - minOrbitRadius);
    const requiredRange = CAPABILITY_MIN_RING_GAP_PX * Math.max(0, sortedObjects.length - 1);
    const ringGap = sortedObjects.length > 1
        ? (availableRange >= requiredRange
            ? CAPABILITY_MIN_RING_GAP_PX
            : availableRange / (sortedObjects.length - 1))
        : 0;
    const orbitDuration = CAPABILITY_BASE_ORBIT_DURATION_SEC * CAPABILITY_ORBIT_SLOWDOWN;

    sortedObjects.forEach((obj, index) => {
        const customSize = obj.dataset.orbitSize;
        if (customSize) obj.style.fontSize = customSize;
        const radius = minOrbitRadius + (index * ringGap);
        const phase = (360 / sortedObjects.length) * index;
        obj.style.setProperty('--artifact-orbit-radius', `${radius}px`);
        obj.style.setProperty('--artifact-phase', `${phase}deg`);
        obj.style.animationDuration = `${orbitDuration}s`;
        obj.style.animationDirection = 'normal';
        obj.style.animationDelay = '0s';
        obj.classList.add('active');
    });

    decorativeObjects.forEach((obj, index) => {
        const customSize = obj.dataset.orbitSize;
        if (customSize) obj.style.fontSize = customSize;
        const requestedRadiusBoost = Number.parseFloat(obj.dataset.radiusBoost || '0') || 0;
        const decorativeBaseRadius = frameRect
            ? Math.round(Math.max(frameRect.width, frameRect.height) / 2) + 34
            : maxCapabilityOrbitRadius + 34;
        const radius = decorativeBaseRadius + requestedRadiusBoost + (index * 8);
        const phase = Number.parseFloat(obj.dataset.orbitPhase || '0') || (312 + (index * 20));
        const duration = Number.parseFloat(obj.dataset.orbitDuration || '0') || Math.max(orbitDuration * 2, orbitDuration + 20);
        obj.style.setProperty('--artifact-orbit-radius', `${radius}px`);
        obj.style.setProperty('--artifact-phase', `${phase}deg`);
        obj.style.animationDuration = `${duration}s`;
        obj.style.animationDirection = obj.dataset.orbitDirection || 'normal';
        obj.style.animationDelay = obj.dataset.orbitDelay || '0s';
        obj.classList.add('active');
    });

    syncScenerySuppression();
}

/**
 * 🚲 Living Scenery: Multi-Object Eye Tracking Logic
 * Makes Blip's pupils follow the closest moving capability artifact.
 */
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

        const objects = document.querySelectorAll('.scenery-object.active');
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
    updateVoiceEngineStatus();
}

function setBlipTimer(text, ms, dueAt = null) {
    const safeMs = Math.max(500, Number(ms) || 0);
    const targetTime = Number.isFinite(dueAt) ? Number(dueAt) : (Date.now() + safeMs);
    console.log(`⏰ Timer set for ${safeMs}ms: ${text}`);
    const timerId = setTimeout(async () => {
        // Wake up Blip if he's resting
        if (!state.isActive) {
            state.isActive = true;
        }

        const alertText = `Excuse me Pablo! I have a reminder for you: ${text}`;
        stopListening();
        dismissActiveAlert({ resumeListening: false, clearVisual: true });
        const alertId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        executeTimerFire(state, { text, timerId, alertId }, { renderActionInSidePanel });
        showAlertDisplay(text, 45000);
        state.isThinking = false;
        document.body.classList.remove('thinking-mode');
        face.classList.remove('thinking', 'listening');
        faceFrame?.classList.remove('listening-glow');
        talkBtn.classList.remove('thinking', 'listening');
        talkBtn.classList.add('active');
        talkBtn.innerText = 'Alarm';
        setPersona('warning');
        setRestingEyes(false);
        renderCountdownDisplay();
        updateTimerCorner();
        startAlarmSoundLoop();
        try {
            await speak(alertText, 'serious');
        } finally {
            state.timers = state.timers.filter(t => t.id !== timerId);
            persistTimers();
            if (state.activeAlert?.id === alertId) {
                state.activeAlert.autoClearTimer = setTimeout(() => {
                    if (state.activeAlert?.id === alertId) dismissActiveAlert({ resumeListening: false, clearVisual: true });
                }, 45000);
            }
            if (state.isActive && !state.activeAlert) startListeningLoop();
        }
    }, safeMs);

    const timerEntry = { id: timerId, text, time: targetTime };
    state.timers.push(timerEntry);
    persistTimers();
    renderCountdownDisplay();
    return timerEntry;
}

function scheduleCalendarEventReminder(details = {}) {
    const reminderMinutes = Math.max(0, Number(details.reminderMinutes || 0) || 0);
    if (!reminderMinutes) {
        return { scheduled: false, reason: 'none' };
    }
    const startTime = new Date(details.start).getTime();
    if (!Number.isFinite(startTime)) {
        return { scheduled: false, reason: 'invalid_start' };
    }
    const dueAt = startTime - (reminderMinutes * 60 * 1000);
    if (dueAt <= Date.now() + 5000) {
        return { scheduled: false, reason: 'too_late' };
    }
    setBlipTimer(details.title || details.summary || 'Calendar event', dueAt - Date.now(), dueAt);
    return { scheduled: true, dueAt, minutes: reminderMinutes };
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

function isCalendarDateLike(value) {
    const raw = String(value || '').trim();
    if (!raw) return false;
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return true;
    return /^\d{8}T\d{6}Z?$/.test(raw);
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
function bindCalendarPanelControls(sidePanel) {
    sidePanel.querySelector('.blip-calendar-orb-close')?.addEventListener('click', () => {
        closeCalendarPanel();
    });

    sidePanel.querySelectorAll('[data-calendar-nav]').forEach((button) => {
        button.addEventListener('click', async () => {
            const nav = button.getAttribute('data-calendar-nav');
            const baseRequest = state.activeCalendarViewRequest || { label: 'upcoming' };
            const nextRequest = nav === 'today'
                ? shiftCalendarViewRequest(baseRequest, 0)
                : shiftCalendarViewRequest(baseRequest, nav === 'prev' ? -1 : 1);
            try {
                await showCalendarOverview(nextRequest);
            } catch (error) {
                console.warn('Calendar navigation failed:', error?.message || error);
            }
        });
    });

    sidePanel.querySelectorAll('[data-calendar-select-day]').forEach((node) => {
        node.addEventListener('click', async () => {
            const dateKey = node.getAttribute('data-calendar-select-day');
            if (!dateKey) return;
            try {
                const selectedDate = startOfCalendarDay(dateKey);
                if (Number.isNaN(selectedDate.getTime())) return;
                const selectedKey = formatCalendarDateKey(selectedDate);
                const baseRequest = state.activeCalendarViewRequest || { label: 'month', anchorDate: selectedDate.toISOString() };
                const nextSelectedDate = baseRequest.selectedDate === selectedKey ? '' : selectedKey;
                await showCalendarOverview({
                    ...baseRequest,
                    view: 'month',
                    anchorDate: selectedDate.toISOString(),
                    selectedDate: nextSelectedDate,
                    selectedHour: ''
                });
            } catch (error) {
                console.warn('Calendar day selection failed:', error?.message || error);
            }
        });
    });

    sidePanel.querySelectorAll('[data-calendar-hour]').forEach((node) => {
        node.addEventListener('click', async () => {
            const hour = Number(node.getAttribute('data-calendar-hour') || -1);
            if (!Number.isInteger(hour) || hour < 0 || hour > 23) return;
            try {
                await focusCalendarHourSelection(hour);
            } catch (error) {
                console.warn('Calendar hour selection failed:', error?.message || error);
            }
        });
    });

    sidePanel.querySelectorAll('[data-calendar-delete-event]').forEach((button) => {
        button.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const eventId = button.getAttribute('data-calendar-delete-event');
            if (!eventId) return;
            try {
                const result = await deleteCalendarEventById(eventId);
                if (transcriptText && result?.text) transcriptText.innerText = result.text;
                if (result?.ok) await refreshOpenCalendarPanel();
            } catch (error) {
                console.warn('Calendar click delete failed:', error?.message || error);
                if (transcriptText) transcriptText.innerText = error?.message || 'Could not delete that calendar event.';
            }
        });
    });
}

function buildCreationsPanelHtml() {
    const items = getMediaItemsByBucket(MEDIA_BUCKET_CREATED);
    if (!items.length) {
        return '<div class="blip-panel-empty">No creations yet. Say "save to creations".</div>';
    }
    return `
        <div class="blip-creations-list blip-panel-scroll">
            ${items.map((item, index) => `
                <div class="blip-creations-item">
                    <button
                        type="button"
                        class="blip-creations-open"
                        data-creation-open="${escapeHtml(String(item?.id || ''))}">
                        <span class="blip-creations-index">#${index + 1}</span>
                        <span class="blip-creations-copy">
                            <span class="blip-creations-title">${escapeHtml(String(item?.title || `Creation ${index + 1}`))}</span>
                            <span class="blip-creations-meta">${escapeHtml(formatMediaDateLabel(item))}</span>
                        </span>
                    </button>
                    <button
                        type="button"
                        class="blip-creations-delete"
                        data-creation-delete="${escapeHtml(String(item?.id || ''))}"
                        aria-label="Delete ${escapeHtml(String(item?.title || `Creation ${index + 1}`))}">
                        Delete
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

function formatGmailMessageDate(message = {}) {
    const rawValue = message?.internalDate || message?.date || '';
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function getGmailPreviewText(message = {}) {
    return String(
        message?.snippet
        || message?.bodyText
        || message?.subject
        || ''
    ).replace(/\s+/g, ' ').trim();
}

function resetGmailComposeDraft(nextDraft = {}) {
    state.gmailComposeDraft = {
        to: String(nextDraft?.to || '').trim(),
        subject: String(nextDraft?.subject || '').trim(),
        text: String(nextDraft?.text || '').trim()
    };
}

function formatLatestNoteForEmail(note = null) {
    if (!note) return null;
    const title = String(note?.data?.title || 'Blip note').trim() || 'Blip note';
    const items = Array.isArray(note?.data?.items) ? note.data.items.filter(Boolean) : [];
    const body = items.length
        ? `${title}\n\n${items.map((item) => `- ${item}`).join('\n')}`
        : String(note?.content || '').trim();
    if (!body) return null;
    return {
        kind: 'note',
        subject: title,
        text: body
    };
}

function formatYouTubeShareForEmail() {
    const url = String(state.lastContext?.lastYoutubeUrl || '').trim();
    if (!url) return null;
    const title = String(getCurrentYouTubeTitle?.() || state.lastContext?.lastYoutubeQuery || 'YouTube link').trim() || 'YouTube link';
    return {
        kind: 'youtube',
        subject: title,
        text: `${title}\n\n${url}`
    };
}

function formatComposeDraftForEmail(draft = {}) {
    const text = String(draft?.text || '').trim();
    if (!text) return null;
    return {
        kind: 'draft',
        subject: String(draft?.subject || 'Blip email').trim() || 'Blip email',
        text
    };
}

function getPreferredCalendarSharePayload() {
    const selectedDate = getSelectedCalendarDate(state.activeCalendarViewRequest || {});
    const selectedKey = selectedDate ? formatCalendarDateKey(selectedDate) : '';
    const visibleEvents = (state.calendarCache || [])
        .filter((event) => {
            if (!event) return false;
            if (!selectedKey) return true;
            const startRaw = event?.start?.dateTime || event?.start?.date || event?.start;
            if (!startRaw) return false;
            return formatCalendarDateKey(startRaw) === selectedKey;
        })
        .sort((left, right) => new Date(left?.start?.dateTime || left?.start?.date || left?.start || 0) - new Date(right?.start?.dateTime || right?.start?.date || right?.start || 0));

    const event = visibleEvents[0] || (state.calendarCache || [])[0] || null;
    if (event?.summary) {
        const dateLine = `${formatCalendarEventDate(event?.start?.dateTime || event?.start?.date || event?.start)} · ${formatCalendarEventTimeRange(event)}`;
        return {
            kind: 'calendar',
            subject: `Calendar: ${event.summary}`,
            text: `${event.summary}\n${dateLine}`
        };
    }
    if (selectedDate) {
        const label = selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        return {
            kind: 'calendar',
            subject: `Calendar date: ${label}`,
            text: label
        };
    }
    return null;
}

async function buildEmailPayloadFromContext(request = {}) {
    const shareType = String(request.shareType || 'auto').trim().toLowerCase();
    const requestedSubject = String(request.subject || '').trim();
    const latestNote = getNoteItems()[0] || null;

    const usePayload = async (payloadFactory) => {
        const payload = typeof payloadFactory === 'function' ? await payloadFactory() : payloadFactory;
        if (!payload) return null;
        return {
            to: String(request.recipient || '').trim(),
            subject: requestedSubject || payload.subject || 'Blip message',
            text: String(payload.text || '').trim(),
            attachments: Array.isArray(payload.attachments) ? payload.attachments : []
        };
    };

    if (shareType === 'note') return usePayload(formatLatestNoteForEmail(latestNote));
    if (shareType === 'youtube' || shareType === 'video' || shareType === 'link') return usePayload(formatYouTubeShareForEmail());
    if (shareType === 'photo' || shareType === 'foto' || shareType === 'picture' || shareType === 'image') return usePayload(() => getEmailPhotoAttachmentPayload());
    if (shareType === 'date' || shareType === 'calendar' || shareType === 'event') return usePayload(getPreferredCalendarSharePayload());

    if (state.currentSidePanelAction === 'gmail') {
        const payload = await usePayload(formatComposeDraftForEmail(state.gmailComposeDraft));
        if (payload) return payload;
    }
    if (isMediaLightboxActuallyVisible('image') || normalizeMediaLane(state.mediaStripLane) === 'shots') {
        const payload = await usePayload(() => getEmailPhotoAttachmentPayload().catch(() => null));
        if (payload) return payload;
    }
    if (state.currentSidePanelAction === 'notes' || state.pendingNotesDraft || latestNote) {
        const payload = await usePayload(formatLatestNoteForEmail(latestNote));
        if (payload) return payload;
    }
    if (state.currentSidePanelAction === 'youtube' || state.lastContext?.lastYoutubeUrl) {
        const payload = await usePayload(formatYouTubeShareForEmail());
        if (payload) return payload;
    }
    if (state.currentSidePanelAction === 'calendarAgenda' || state.activeCalendarViewRequest || (state.calendarCache || []).length) {
        const payload = await usePayload(getPreferredCalendarSharePayload());
        if (payload) return payload;
    }

    return null;
}

async function ensureGmailProfileLoaded() {
    const authState = getGoogleGmailAuthState();
    if (!authState.connected) return null;
    try {
        const profile = await getGoogleGmailProfile();
        state.gmailProfile = profile || null;
        return state.gmailProfile;
    } catch (error) {
        console.warn('Gmail profile load failed:', error?.message || error);
        throw error;
    }
}

async function loadGmailInboxState(options = {}) {
    const authState = getGoogleGmailAuthState();
    if (!authState.connected) {
        throw new Error('Google Gmail is not connected. Press Connect Gmail in Settings first.');
    }

    const profile = await ensureGmailProfileLoaded();
    const messages = await listGoogleGmailMessages({ maxResults: Number(options.maxResults) || 12 });
    state.gmailMessages = Array.isArray(messages) ? messages : [];

    const requestedId = String(options.selectId || '').trim();
    const fallbackId = requestedId
        || state.gmailSelectedMessageId
        || state.gmailMessages[0]?.id
        || '';
    state.gmailSelectedMessageId = fallbackId;

    if (fallbackId) {
        try {
            state.gmailSelectedMessage = await getGoogleGmailMessage(fallbackId);
        } catch (error) {
            console.warn('Gmail message load failed:', error?.message || error);
            state.gmailSelectedMessage = null;
        }
    } else {
        state.gmailSelectedMessage = null;
    }

    return {
        profile,
        messages: state.gmailMessages,
        selectedMessage: state.gmailSelectedMessage
    };
}

function buildGmailPanelHtml(toolParams = {}) {
    const authState = toolParams.authState || getGoogleGmailAuthState();
    const messages = Array.isArray(toolParams.messages) ? toolParams.messages : [];
    const selectedMessage = toolParams.selectedMessage || null;
    const composeDraft = toolParams.composeDraft || state.gmailComposeDraft || { to: '', subject: '', text: '' };
    const profile = toolParams.profile || state.gmailProfile || null;
    const selectedId = String(selectedMessage?.id || state.gmailSelectedMessageId || '');
    const bodyText = getGmailPreviewText(selectedMessage);

    return `
        <div class="blip-gmail-shell">
            <div class="blip-gmail-toolbar">
                <div class="blip-gmail-status${authState.connected ? ' connected' : ' warning'}">
                    ${escapeHtml(
                        authState.connected
                            ? (profile?.email ? `Connected as ${profile.email}` : 'Gmail connected.')
                            : 'Connect Gmail in Settings first.'
                    )}
                </div>
                <div class="blip-gmail-toolbar-actions">
                    <button type="button" class="action-link outline" data-gmail-refresh>Refresh</button>
                    <button type="button" class="action-link outline" data-gmail-compose-clear>New Email</button>
                </div>
            </div>
            <div class="blip-gmail-layout">
                <div class="blip-gmail-list blip-panel-scroll">
                    ${messages.length ? messages.map((message, index) => `
                        <button
                            type="button"
                            class="blip-gmail-message${String(message?.id || '') === selectedId ? ' is-active' : ''}"
                            data-gmail-open="${escapeHtml(String(message?.id || ''))}">
                            <div class="blip-gmail-message-head">
                                <span class="blip-gmail-index">#${index + 1}</span>
                                <span class="blip-gmail-from">${escapeHtml(String(message?.from || 'Unknown sender'))}</span>
                                <span class="blip-gmail-date">${escapeHtml(formatGmailMessageDate(message))}</span>
                            </div>
                            <div class="blip-gmail-subject">${escapeHtml(String(message?.subject || '(No subject)'))}</div>
                            <div class="blip-gmail-snippet">${escapeHtml(getGmailPreviewText(message) || 'No preview available.')}</div>
                        </button>
                    `).join('') : '<div class="blip-panel-empty">No Gmail messages loaded yet.</div>'}
                </div>
                <div class="blip-gmail-detail">
                    <div class="blip-gmail-compose blip-panel-card">
                        <div class="blip-gmail-compose-title">Compose</div>
                        <input type="email" data-gmail-to class="blip-gmail-input" placeholder="To" value="${escapeHtml(String(composeDraft.to || ''))}">
                        <input type="text" data-gmail-subject class="blip-gmail-input" placeholder="Subject" value="${escapeHtml(String(composeDraft.subject || ''))}">
                        <textarea data-gmail-body class="blip-gmail-textarea" placeholder="Write your message...">${escapeHtml(String(composeDraft.text || ''))}</textarea>
                        <div class="blip-gmail-compose-actions">
                            <button type="button" class="action-link outline" data-gmail-send>Send</button>
                        </div>
                    </div>
                    <div class="blip-gmail-reader blip-panel-card">
                        <div class="blip-gmail-reader-kicker">Inbox</div>
                        ${selectedMessage ? `
                            <div class="blip-gmail-reader-subject">${escapeHtml(String(selectedMessage.subject || '(No subject)'))}</div>
                            <div class="blip-gmail-reader-meta">${escapeHtml(String(selectedMessage.from || 'Unknown sender'))}${selectedMessage?.date ? ` · ${escapeHtml(String(selectedMessage.date))}` : ''}</div>
                            <div class="blip-gmail-reader-body blip-panel-scroll">${escapeHtml(bodyText || 'No body text available.')}</div>
                        ` : '<div class="blip-panel-empty">Pick an email on the left, or say "read email 1".</div>'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function openGmailInboxPanel(options = {}) {
    const authState = getGoogleGmailAuthState();
    if (!authState.connected) {
        throw new Error('Google Gmail is not connected. Press Connect Gmail in Settings first.');
    }

    await loadGmailInboxState({
        maxResults: Number(options.maxResults) || 12,
        selectId: options.selectId || ''
    });

    renderActionInSidePanel({
        action: 'gmail',
        tool_params: {
            authState: getGoogleGmailAuthState(),
            profile: state.gmailProfile,
            messages: state.gmailMessages,
            selectedMessage: state.gmailSelectedMessage,
            composeDraft: state.gmailComposeDraft
        },
        text: options.summary || (state.gmailMessages.length
            ? `Inbox open. ${state.gmailMessages.length} message${state.gmailMessages.length === 1 ? '' : 's'} loaded.`
            : 'Inbox open.')
    });

    if (!isSidePanelActuallyVisible('gmail')) {
        throw new Error('I tried to open Gmail, but the window did not appear.');
    }
}

async function openGmailMessageByIndex(index) {
    const list = Array.isArray(state.gmailMessages) && state.gmailMessages.length
        ? state.gmailMessages
        : await listGoogleGmailMessages({ maxResults: 12 });
    state.gmailMessages = Array.isArray(list) ? list : [];
    const target = state.gmailMessages[index - 1];
    if (!target?.id) {
        return { ok: false, text: `I could not find email ${index}.` };
    }
    state.gmailSelectedMessageId = target.id;
    state.gmailSelectedMessage = await getGoogleGmailMessage(target.id);
    await openGmailInboxPanel({
        selectId: target.id,
        summary: `Opened email ${index}.`
    });
    return { ok: true, text: `Opened email ${index}.` };
}

async function sendCurrentGmailDraft(draft = {}) {
    const to = String(draft?.to || '').trim();
    const subject = String(draft?.subject || '').trim();
    const text = String(draft?.text || '').trim();
    if (!to || !text) {
        return { ok: false, text: 'Need at least To and Message before I can send the email.' };
    }
    await sendGoogleGmailMessage({ to, subject, text });
    resetGmailComposeDraft();
    await openGmailInboxPanel({ summary: `Gmail accepted the email for ${to}.` });
    return { ok: true, text: `Gmail accepted the email for ${to}.` };
}

function bindCreationsPanelControls(sidePanel) {
    sidePanel.querySelectorAll('[data-creation-open]').forEach((button) => {
        button.addEventListener('click', () => {
            const itemId = button.getAttribute('data-creation-open');
            if (!itemId) return;
            const ok = openMediaById(itemId);
            if (transcriptText) transcriptText.innerText = ok ? 'Opening creation.' : 'I could not open that creation.';
        });
    });

    sidePanel.querySelectorAll('[data-creation-delete]').forEach((button) => {
        button.addEventListener('click', () => {
            const itemId = button.getAttribute('data-creation-delete');
            if (!itemId) return;
            const removed = removeMediaById(itemId);
            const msg = removed ? 'Creation deleted.' : 'Could not delete that creation.';
            if (transcriptText) transcriptText.innerText = msg;
            openCreationsPanel(msg);
        });
    });
}

function bindGmailPanelControls(sidePanel) {
    const syncDraftFromInputs = () => {
        const toInput = sidePanel.querySelector('[data-gmail-to]');
        const subjectInput = sidePanel.querySelector('[data-gmail-subject]');
        const bodyInput = sidePanel.querySelector('[data-gmail-body]');
        resetGmailComposeDraft({
            to: toInput?.value || '',
            subject: subjectInput?.value || '',
            text: bodyInput?.value || ''
        });
    };

    sidePanel.querySelectorAll('[data-gmail-to], [data-gmail-subject], [data-gmail-body]').forEach((input) => {
        input.addEventListener('input', syncDraftFromInputs);
        input.addEventListener('change', syncDraftFromInputs);
    });

    sidePanel.querySelectorAll('[data-gmail-open]').forEach((button) => {
        button.addEventListener('click', async () => {
            const messageId = button.getAttribute('data-gmail-open');
            if (!messageId) return;
            syncDraftFromInputs();
            try {
                state.gmailSelectedMessageId = messageId;
                state.gmailSelectedMessage = await getGoogleGmailMessage(messageId);
                await openGmailInboxPanel({ selectId: messageId, summary: 'Email open.' });
                if (transcriptText) transcriptText.innerText = 'Email open.';
            } catch (error) {
                console.warn('Open Gmail message failed:', error?.message || error);
                if (transcriptText) transcriptText.innerText = error?.message || 'Could not open that email.';
            }
        });
    });

    sidePanel.querySelector('[data-gmail-refresh]')?.addEventListener('click', async () => {
        syncDraftFromInputs();
        try {
            await openGmailInboxPanel({ summary: 'Inbox refreshed.' });
            if (transcriptText) transcriptText.innerText = 'Inbox refreshed.';
        } catch (error) {
            console.warn('Refresh Gmail inbox failed:', error?.message || error);
            if (transcriptText) transcriptText.innerText = error?.message || 'Could not refresh Gmail.';
        }
    });

    sidePanel.querySelector('[data-gmail-compose-clear]')?.addEventListener('click', async () => {
        resetGmailComposeDraft();
        await openGmailInboxPanel({ summary: 'New email ready.' });
        if (transcriptText) transcriptText.innerText = 'New email ready.';
    });

    sidePanel.querySelector('[data-gmail-send]')?.addEventListener('click', async () => {
        const toInput = sidePanel.querySelector('[data-gmail-to]');
        const subjectInput = sidePanel.querySelector('[data-gmail-subject]');
        const bodyInput = sidePanel.querySelector('[data-gmail-body]');
        resetGmailComposeDraft({
            to: toInput?.value || '',
            subject: subjectInput?.value || '',
            text: bodyInput?.value || ''
        });
        try {
            const result = await sendCurrentGmailDraft(state.gmailComposeDraft);
            if (transcriptText) transcriptText.innerText = result.text;
        } catch (error) {
            console.warn('Send Gmail from panel failed:', error?.message || error);
            if (transcriptText) transcriptText.innerText = error?.message || 'Could not send that email.';
        }
    });
}

// ── UI: SIDE PANEL RENDER (timer, notes, youtube, chart, etc.) ─────────────────
function renderActionInSidePanel(parsedResponse) {
    const { tool_params = {}, text = '' } = parsedResponse;
    const action = String(parsedResponse?.action || '').trim().toLowerCase();
    if (action === 'none' || !action) return;
    if (action !== 'timer') stopTimerPanelTicker();
    state.currentSidePanelAction = action;
    state.currentSidePanelVisualUrl = '';
    document.body.classList.toggle('blip-gmail-panel-open', action === 'gmail');
    document.body.classList.toggle('blip-telegram-panel-open', action === 'telegram');

    let sidePanel = document.getElementById('blip-side-panel');
    if (!sidePanel) {
        sidePanel = document.createElement('div');
        sidePanel.id = 'blip-side-panel';
        sidePanel.style.position = 'fixed';
        sidePanel.style.zIndex = '1000';
        sidePanel.style.color = '#e5eefc';
        sidePanel.style.fontFamily = 'Inter, sans-serif';
        document.body.appendChild(sidePanel);
    }
    applyDefaultSidePanelLayout(sidePanel, action);
    if (action === 'gmail') {
        applyGmailSidePanelLayout(sidePanel);
    } else if (action === 'telegram') {
        applyTelegramSidePanelLayout(sidePanel);
    } else if (isWideWorkspaceAction(action)) {
        applyWorkspaceSidePanelLayout(sidePanel, action);
    }
    if (action === 'calendarAgenda') {
        sidePanel.classList.add('blip-side-panel-centered');
        sidePanel.style.top = '50%';
        sidePanel.style.left = '50%';
        sidePanel.style.right = 'auto';
        sidePanel.style.transform = 'translate(-50%, -50%)';
        sidePanel.style.width = 'min(520px, calc(100vw - 120px))';
        sidePanel.style.height = 'min(680px, calc(100vh - 140px))';
    }
    sidePanel.style.display = panelUsesFlexColumnLayout(action) ? 'flex' : 'block';

    if (sidePanelChart) {
        sidePanelChart.destroy();
        sidePanelChart = null;
    }

    if (action === 'calendarAgenda') {
        sidePanel.classList.add('blip-calendar-orb');
        state.currentSidePanelVisualUrl = '';
        sidePanel.style.width = 'min(980px, calc(100vw - 36px))';
        sidePanel.style.height = 'min(760px, calc(100vh - 48px))';
        sidePanel.style.padding = '0';
        sidePanel.style.borderRadius = '32px';
        sidePanel.style.overflow = 'hidden';
        sidePanel.style.background = '';
        sidePanel.style.border = '';
        sidePanel.style.boxShadow = '';
        sidePanel.innerHTML = `
            <button type="button" aria-label="Close panel" class="blip-calendar-orb-close">×</button>
            <div class="blip-calendar-orb-inner">
                <div class="blip-calendar-orb-body">${tool_params.html || '<p style="margin:8px 0 0 0; color:#a0a0b8;">No calendar items ready yet.</p>'}</div>
            </div>
        `;
        bindCalendarPanelControls(sidePanel);
        sidePanel.style.display = 'block';
        return;
    }

    const title = (action && action.length) ? action.charAt(0).toUpperCase() + action.slice(1) : 'Panel';
    const summaryText = getSidePanelSummaryText(text);
    sidePanel.innerHTML = buildSidePanelHeaderHtml({
        title: `${title} Panel`,
        summary: summaryText,
        kicker: 'Tool'
    });

    switch (action) {
        case 'creations': {
            if (!CREATIONS_TOOL_ENABLED) {
                sidePanel.innerHTML = '';
                sidePanel.style.display = 'none';
                clearSidePanelContext();
                break;
            }
            const items = getMediaItemsByBucket(MEDIA_BUCKET_CREATED);
            sidePanel.innerHTML = `
                ${buildSidePanelHeaderHtml({
                    title: 'Creations',
                    summary: items.length
                        ? `Say "open creation 1" or "delete creation 1". ${items.length} saved item${items.length === 1 ? '' : 's'}.`
                        : 'Say "save to creations" from an image, map, graph, or design.'
                })}
                ${buildCreationsPanelHtml()}
            `;
            bindCreationsPanelControls(sidePanel);
            break;
        }
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

                const saveBtn = document.createElement('button');
                saveBtn.type = 'button';
                saveBtn.className = 'action-link outline';
                saveBtn.textContent = '💾 Save To Media';
                saveBtn.onclick = () => {
                    const saved = saveCurrentCreationToGallery();
                    if (transcriptText) transcriptText.innerText = saved ? 'Saved to media.' : getMediaPersistFailureMessage('No graph or design open.');
                };
                sidePanel.appendChild(saveBtn);
            }
            break;
        case 'timer': {
            const focusId = Number.isFinite(Number(tool_params.focusId)) ? Number(tool_params.focusId) : null;
            if (Number.isFinite(focusId)) sidePanel.dataset.timerFocusId = String(focusId);
            sidePanel.innerHTML = `
                ${buildSidePanelHeaderHtml({
                    title: 'Reminder Panel',
                    summary: summaryText,
                    kicker: 'Focus'
                })}
                <div id="blip-timer-panel-body"></div>
            `;
            sidePanel.querySelector('button[aria-label="Close panel"]')?.addEventListener('click', () => {
                sidePanel.style.display = 'none';
                clearSidePanelContext();
            });
            startTimerPanelTicker({ focusId });
            break;
        }
        case 'design':
        case 'drawing': {
            state.designPanelZoomed = false;
            const visualUrl = tool_params.imageUrl || tool_params.url || tool_params.dataUrl || '';
            if (typeof visualUrl === 'string' && visualUrl) {
                state.currentSidePanelVisualUrl = visualUrl;
                if (visualUrl.startsWith('data:image/')) state.lastContext.lastDesignDataUrl = visualUrl;
                const img = document.createElement('img');
                img.src = visualUrl;
                img.alt = 'Blip design';
                img.className = 'blip-panel-visual';
                sidePanel.appendChild(img);

                const designPrompt = String(tool_params.prompt || state.lastContext?.lastDesignPrompt || '');
                if (shouldShowSolarSystemLegend(designPrompt)) {
                    appendSolarSystemLegend(sidePanel);
                }

                if (visualUrl.startsWith('data:image/')) {
                    const saveBtn = document.createElement('button');
                    saveBtn.type = 'button';
                    saveBtn.className = 'action-link outline';
                    saveBtn.textContent = '💾 Save To Media';
                    saveBtn.onclick = () => {
                        const saved = addCreationToGallery(visualUrl, action, {
                            title: normalizeCreationTitle(tool_params.title || tool_params.prompt || state.lastContext?.lastDesignPrompt || action, 'Design')
                        });
                        if (saved) toggleMediaGallery(true, 'shots');
                        if (transcriptText) transcriptText.innerText = saved ? 'Saved to media.' : getMediaPersistFailureMessage('No image to save.');
                    };
                    sidePanel.appendChild(saveBtn);
                }
            } else {
                state.currentSidePanelVisualUrl = '';
                sidePanel.innerHTML += '<p class="blip-panel-empty">No design image to show yet.</p>';
            }
            break;
        }
        case 'image': {
            const visualUrl = tool_params.imageUrl || tool_params.url || '';
            if (typeof visualUrl === 'string' && visualUrl) {
                state.currentSidePanelVisualUrl = visualUrl;
                const fallbackImageUrls = Array.isArray(tool_params.fallbackImageUrls)
                    ? tool_params.fallbackImageUrls.filter((url) => typeof url === 'string' && url.trim())
                    : [];
                const img = document.createElement('img');
                const imageCandidates = [visualUrl, ...fallbackImageUrls]
                    .filter(Boolean)
                    .filter((url, index, arr) => arr.indexOf(url) === index);
                let imageCandidateIndex = 0;
                const loadCandidate = () => {
                    const nextUrl = imageCandidates[imageCandidateIndex] || '';
                    if (!nextUrl) return false;
                    img.src = nextUrl;
                    state.currentSidePanelVisualUrl = nextUrl;
                    return true;
                };
                img.addEventListener('error', () => {
                    imageCandidateIndex += 1;
                    if (!loadCandidate()) {
                        img.style.display = 'none';
                        if (!sidePanel.querySelector('.image-panel-fallback-note')) {
                            const note = document.createElement('p');
                            note.className = 'image-panel-fallback-note';
                            note.classList.add('blip-panel-empty');
                            note.textContent = 'Direct image preview failed, but you can still open the image source below.';
                            sidePanel.appendChild(note);
                        }
                    }
                });
                img.alt = escapeHtml(String(tool_params.title || 'Blip image result'));
                img.className = 'blip-panel-visual';
                sidePanel.appendChild(img);
                loadCandidate();

                const buttonRow = document.createElement('div');
                buttonRow.className = 'blip-panel-button-row';
                const saveBtn = document.createElement('button');
                saveBtn.type = 'button';
                saveBtn.className = 'action-link outline';
                saveBtn.textContent = '💾 Save To Media';
                saveBtn.onclick = () => {
                    const saved = saveLatestPhotoToGallery();
                    if (transcriptText) transcriptText.innerText = saved ? 'Image saved to media.' : getMediaPersistFailureMessage('No image to save.');
                };
                buttonRow.appendChild(saveBtn);

                sidePanel.appendChild(buttonRow);

                if (tool_params.sourceUrl) {
                    const sourceLink = document.createElement('a');
                    sourceLink.href = tool_params.sourceUrl;
                    sourceLink.target = '_blank';
                    sourceLink.rel = 'noopener';
                    sourceLink.className = 'action-link blue';
                    sourceLink.textContent = '🖼 Open image source';
                    const sourceRow = document.createElement('div');
                    sourceRow.className = 'blip-panel-button-row';
                    sourceRow.appendChild(sourceLink);
                    sidePanel.appendChild(sourceRow);
                }
            } else {
                sidePanel.innerHTML += '<p class="blip-panel-empty">No image to show yet.</p>';
            }
            break;
        }
        // YouTube: Muted autoplay is the only zero-click option (browser policy). Sound via "Blip, unmute" (one verbal confirmation → JS unmute). Full sound autoplay without gesture is blocked.
        case 'youtube': {
            let videoId = tool_params.videoId || null;
            if (!videoId && tool_params.embedUrl) {
                const m = tool_params.embedUrl.match(/\/embed\/([^?&]+)/);
                if (m) videoId = m[1];
            }
            const searchUrl = tool_params.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(tool_params.query || '')}`;
            const isLibraryOnly = tool_params && (tool_params.libraryOnly === true || tool_params.mode === 'library');
            const isFocusedPlayer = tool_params && (tool_params.focusedPlayer === true || tool_params.mode === 'focused-player');
            const focusedMediaView = tool_params?.mediaView === 'Videos' ? 'Videos' : 'Music';
            if (blipYtPlayer && blipYtPlayer.destroy) {
                try { blipYtPlayer.destroy(); } catch (e) {}
                blipYtPlayer = null;
            }
            // Library-only mode should show playlists without auto-playing anything.
            if (isLibraryOnly) {
                sidePanel.dataset.youtubeLibraryOnly = '1';
                sidePanel.style.width = 'min(1120px, calc(100vw - 40px))';
                sidePanel.style.height = 'min(760px, calc(100vh - 52px))';
                sidePanel.style.overflow = 'hidden';
                sidePanel.innerHTML = `
                    ${buildSidePanelHeaderHtml({
                        title: 'YouTube',
                        summary: `Mode: ${escapeHtml(tool_params.query || state.youtubeLibraryView || 'Music')}. Saved from YouTube.`,
                        kicker: 'YouTube'
                    })}
                    ${buildYouTubeShellHtml(buildYouTubeLibraryHtml({ simple: true }), 'library')}
                `;
                sidePanel.querySelector('button[aria-label="Close panel"]')?.addEventListener('click', () => {
                    closeYouTubePanel();
                });
                sidePanel.querySelectorAll('[data-yt-library]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const next = btn.getAttribute('data-yt-library') || 'Music';
                        state.youtubeLibraryView = next === 'Videos' ? 'Videos' : 'Music';
                        state.youtubeLibraryBrowseIndex = 0;
                        try { localStorage.setItem('blip_youtube_library_view', state.youtubeLibraryView); } catch (_) { }
                        renderActionInSidePanel({ action: 'youtube', tool_params: { ...tool_params, query: state.youtubeLibraryView, libraryOnly: true }, text });
                    });
                });
                sidePanel.querySelectorAll('[data-yt-playlist]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const name = btn.getAttribute('data-yt-playlist') || '';
                        const result = playSavedYouTubePlaylist(name);
                        if (transcriptText) transcriptText.innerText = result.ok ? result.message : result.message;
                    });
                });
                sidePanel.querySelectorAll('[data-yt-play-video]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const vid = btn.getAttribute('data-yt-play-video') || '';
                        const rawIndex = Number(btn.getAttribute('data-yt-index'));
                        state.youtubeLibraryBrowseIndex = Number.isFinite(rawIndex) ? rawIndex : state.youtubeLibraryBrowseIndex;
                        syncYouTubeLibraryBrowseSelection({ scrollIntoView: false });
                        if (!vid) return;
                        renderActionInSidePanel({
                            action: 'youtube',
                            tool_params: { videoId: vid, query: 'Saved video', focusedPlayer: true, mediaView: state.youtubeLibraryView },
                            text: 'Playing saved video.'
                        });
                    });
                });
                sidePanel.querySelector('[data-yt-export]')?.addEventListener('click', () => {
                    const ok = exportYouTubePlaylists();
                    if (transcriptText) transcriptText.innerText = ok ? 'Playlists exported.' : 'Could not export playlists.';
                });
                sidePanel.querySelector('[data-yt-import]')?.addEventListener('click', async () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'application/json,.json';
                    input.onchange = async () => {
                        const file = input.files?.[0];
                        const result = await importYouTubePlaylistsFromFile(file);
                        if (transcriptText) transcriptText.innerText = result.message;
                        renderActionInSidePanel({ action: 'youtube', tool_params: { ...tool_params, libraryOnly: true }, text });
                    };
                    input.click();
                });
                sidePanel.querySelector('[data-yt-delete]')?.addEventListener('click', () => {
                    const target = prompt('Delete which playlist? (type the name)');
                    if (!target) return;
                    const result = deleteYouTubePlaylistByName(target);
                    if (transcriptText) transcriptText.innerText = result.message;
                    renderActionInSidePanel({ action: 'youtube', tool_params: { ...tool_params, libraryOnly: true }, text });
                });
                sidePanel.querySelector('[data-yt-rename]')?.addEventListener('click', () => {
                    const from = prompt('Rename which playlist? (current name)');
                    if (!from) return;
                    const to = prompt('New playlist name?');
                    if (!to) return;
                    const result = renameYouTubePlaylist(from, to);
                    if (transcriptText) transcriptText.innerText = result.message;
                    renderActionInSidePanel({ action: 'youtube', tool_params: { ...tool_params, libraryOnly: true }, text });
                });
                syncYouTubeLibraryBrowseSelection({ scrollIntoView: false });
                break;
            }

            // Show an in-panel player whenever we have either a concrete videoId
            // or a query we can load via YT.Player search mode.
            if (videoId || tool_params.query) {
                state.videoBigMode = false;
                sidePanel.classList.remove('blip-video-big');
                syncScenerySuppression();
                const currentVideoLabel = escapeHtml(String(tool_params.query || 'Video'));
                const playerTools = isFocusedPlayer
                    ? `
                        <div class="blip-yt-save-row">
                            <button type="button" id="blip-yt-unmute-btn" class="action-link outline" aria-label="Unmute video">🔊 Unmute</button>
                            <button type="button" id="blip-yt-back-media-btn" class="action-link outline" aria-label="Back to Media">🖼 Media</button>
                        </div>
                    `
                    : `
                        <div class="blip-yt-save-row">
                            <button type="button" id="blip-yt-unmute-btn" class="action-link outline" aria-label="Unmute video">🔊 Unmute</button>
                            <button type="button" id="blip-yt-save-current-btn" class="action-link outline" aria-label="Save to Favorites">❤️ Favorites</button>
                        </div>
                    `;
                sidePanel.innerHTML = `
                    ${buildSidePanelHeaderHtml({
                        title: isFocusedPlayer ? focusedMediaView : 'YouTube',
                        summary: '',
                        kicker: isFocusedPlayer ? 'Media' : 'YouTube',
                        controls: `
                            <button type="button" aria-label="Full video" id="blip-video-big-btn" class="blip-panel-mini-btn">⛶ Full</button>
                        `
                    })}
                    ${buildYouTubeShellHtml(`
                        <div class="blip-yt-layout">
                            <div class="blip-yt-video">
                                <div class="blip-yt-now">
                                    <div class="blip-yt-now-kicker">${isFocusedPlayer ? 'Saved in Media' : 'Now Playing'}</div>
                                    <div class="blip-yt-now-title">${currentVideoLabel}</div>
                                </div>
                                <div id="blip-yt-player" class="blip-yt-player"></div>
                            </div>
                            <div class="blip-yt-side">
                                ${playerTools}
                                ${isFocusedPlayer ? '' : buildYouTubeLibraryHtml({ compact: true })}
                                <div class="blip-mini-wrap" aria-hidden="true"></div>
                            </div>
                        </div>
                    `, isFocusedPlayer ? 'focus' : 'player')}
                `;
                sidePanel.querySelector('button[aria-label="Close panel"]')?.addEventListener('click', () => {
                    closeYouTubePanel();
                });
                document.getElementById('blip-video-big-btn')?.addEventListener('click', () => {
                    setVideoBigMode(!state.videoBigMode);
                });
                document.getElementById('blip-yt-save-current-btn')?.addEventListener('click', () => {
                    const result = saveCurrentYouTubeToPlaylist(DEFAULT_VIDEO_PLAYLIST);
                    if (transcriptText) transcriptText.innerText = result.ok
                        ? (result.duplicate ? `Already in ${DEFAULT_VIDEO_PLAYLIST}.` : `Saved to ${DEFAULT_VIDEO_PLAYLIST}.`)
                        : 'No video to save.';
                });
                document.getElementById('blip-yt-unmute-btn')?.addEventListener('click', () => {
                    const ok = unmuteYouTubePlayer();
                    if (transcriptText) transcriptText.innerText = ok ? 'Sound on!' : 'No active video.';
                });
                document.getElementById('blip-yt-back-media-btn')?.addEventListener('click', () => {
                    closeYouTubePanel();
                    toggleMediaGallery(true, focusedMediaView === 'Videos' ? 'videos' : 'music');
                });
                document.getElementById('blip-yt-player')?.addEventListener('click', () => {
                    // A click is a guaranteed user gesture; use it to unmute.
                    unmuteYouTubePlayer();
                });
                sidePanel.querySelectorAll('[data-yt-library]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const next = btn.getAttribute('data-yt-library') || 'Music';
                        state.youtubeLibraryView = next === 'Videos' ? 'Videos' : 'Music';
                        state.youtubeLibraryBrowseIndex = 0;
                        try { localStorage.setItem('blip_youtube_library_view', state.youtubeLibraryView); } catch (_) { }
                        renderActionInSidePanel({ action: 'youtube', tool_params, text });
                    });
                });
                sidePanel.querySelectorAll('[data-yt-playlist]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const name = btn.getAttribute('data-yt-playlist') || '';
                        const result = playSavedYouTubePlaylist(name);
                        if (transcriptText) transcriptText.innerText = result.ok ? result.message : result.message;
                    });
                });
                sidePanel.querySelectorAll('[data-yt-play-video]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const vid = btn.getAttribute('data-yt-play-video') || '';
                        const rawIndex = Number(btn.getAttribute('data-yt-index'));
                        state.youtubeLibraryBrowseIndex = Number.isFinite(rawIndex) ? rawIndex : state.youtubeLibraryBrowseIndex;
                        if (!vid) return;
                        renderActionInSidePanel({
                            action: 'youtube',
                            tool_params: { videoId: vid, query: 'Saved video', focusedPlayer: true, mediaView: state.youtubeLibraryView },
                            text: 'Playing saved video.'
                        });
                    });
                });
                sidePanel.querySelector('[data-yt-export]')?.addEventListener('click', () => {
                    const ok = exportYouTubePlaylists();
                    if (transcriptText) transcriptText.innerText = ok ? 'Playlists exported.' : 'Could not export playlists.';
                });
                sidePanel.querySelector('[data-yt-import]')?.addEventListener('click', async () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'application/json,.json';
                    input.onchange = async () => {
                        const file = input.files?.[0];
                        const result = await importYouTubePlaylistsFromFile(file);
                        if (transcriptText) transcriptText.innerText = result.message;
                        renderActionInSidePanel({ action: 'youtube', tool_params, text });
                    };
                    input.click();
                });
                sidePanel.querySelector('[data-yt-delete]')?.addEventListener('click', () => {
                    const target = prompt('Delete which playlist? (type the name)');
                    if (!target) return;
                    const result = deleteYouTubePlaylistByName(target);
                    if (transcriptText) transcriptText.innerText = result.message;
                    renderActionInSidePanel({ action: 'youtube', tool_params, text });
                });
                sidePanel.querySelector('[data-yt-rename]')?.addEventListener('click', () => {
                    const from = prompt('Rename which playlist? (current name)');
                    if (!from) return;
                    const to = prompt('New playlist name?');
                    if (!to) return;
                    const result = renameYouTubePlaylist(from, to);
                    if (transcriptText) transcriptText.innerText = result.message;
                    renderActionInSidePanel({ action: 'youtube', tool_params, text });
                });
                if (videoId) mountYouTubePlayer(videoId);
                else mountYouTubeSearchPlayer(tool_params.query || '');
                if (isFocusedPlayer) {
                    requestAnimationFrame(() => {
                        if (!state.videoBigMode) setVideoBigMode(true);
                    });
                }
            } else {
                sidePanel.innerHTML = `
                    ${buildSidePanelHeaderHtml({
                        title: `YouTube: ${tool_params.query || 'search'}`,
                        summary: 'Add a YouTube API key in Settings to play the right video here, or open search manually below.',
                        kicker: 'YouTube'
                    })}
                    ${buildYouTubeShellHtml(`
                        <div class="blip-yt-search-home">
                            <div class="blip-panel-button-row">
                                <a href="${searchUrl}" target="_blank" rel="noopener" id="blip-yt-link" class="action-link red">🎬 Open YouTube search</a>
                            </div>
                            ${buildYouTubeLibraryHtml()}
                        </div>
                    `, 'search')}
                `;
                sidePanel.querySelector('button')?.addEventListener('click', () => {
                    sidePanel.style.display = 'none';
                    clearSidePanelContext();
                });
                sidePanel.querySelectorAll('[data-yt-library]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const next = btn.getAttribute('data-yt-library') || 'Music';
                        state.youtubeLibraryView = next === 'Videos' ? 'Videos' : 'Music';
                        state.youtubeLibraryBrowseIndex = 0;
                        try { localStorage.setItem('blip_youtube_library_view', state.youtubeLibraryView); } catch (_) { }
                        renderActionInSidePanel({ action: 'youtube', tool_params, text });
                    });
                });
                sidePanel.querySelectorAll('[data-yt-playlist]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const name = btn.getAttribute('data-yt-playlist') || '';
                        const result = playSavedYouTubePlaylist(name);
                        if (transcriptText) transcriptText.innerText = result.ok ? result.message : result.message;
                    });
                });
                sidePanel.querySelector('[data-yt-export]')?.addEventListener('click', () => {
                    const ok = exportYouTubePlaylists();
                    if (transcriptText) transcriptText.innerText = ok ? 'Playlists exported.' : 'Could not export playlists.';
                });
                sidePanel.querySelector('[data-yt-import]')?.addEventListener('click', async () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'application/json,.json';
                    input.onchange = async () => {
                        const file = input.files?.[0];
                        const result = await importYouTubePlaylistsFromFile(file);
                        if (transcriptText) transcriptText.innerText = result.message;
                        renderActionInSidePanel({ action: 'youtube', tool_params, text });
                    };
                    input.click();
                });
                sidePanel.querySelector('[data-yt-delete]')?.addEventListener('click', () => {
                    const target = prompt('Delete which playlist? (type the name)');
                    if (!target) return;
                    const result = deleteYouTubePlaylistByName(target);
                    if (transcriptText) transcriptText.innerText = result.message;
                    renderActionInSidePanel({ action: 'youtube', tool_params, text });
                });
                sidePanel.querySelector('[data-yt-rename]')?.addEventListener('click', () => {
                    const from = prompt('Rename which playlist? (current name)');
                    if (!from) return;
                    const to = prompt('New playlist name?');
                    if (!to) return;
                    const result = renameYouTubePlaylist(from, to);
                    if (transcriptText) transcriptText.innerText = result.message;
                    renderActionInSidePanel({ action: 'youtube', tool_params, text });
                });
            }
            break;
        }
        case 'products': {
            const links = Array.isArray(tool_params.links) ? tool_params.links : [];
            const previewDataUrl = typeof tool_params.previewDataUrl === 'string' ? tool_params.previewDataUrl : '';
            sidePanel.innerHTML = buildSidePanelHeaderHtml({
                title: 'Products Panel',
                summary: summaryText || 'Pick one to open or save them to your cart.',
                kicker: 'Shop'
            });
            if (previewDataUrl) {
                const img = document.createElement('img');
                img.src = previewDataUrl;
                img.alt = String(tool_params.query || 'Product preview');
                img.className = 'blip-panel-preview';
                sidePanel.appendChild(img);
            }
            if (!links.length) {
                sidePanel.innerHTML += '<p class="blip-panel-empty">No products ready yet.</p>';
                break;
            }
            const list = document.createElement('div');
            list.className = 'blip-products-list blip-panel-scroll';
            links.forEach((item) => {
                const card = document.createElement('div');
                card.className = 'blip-panel-card blip-products-card';
                card.innerHTML = `
                    <strong class="blip-products-name">${escapeHtml(item.name || 'Product')}</strong>
                    <div class="blip-products-retailer">${escapeHtml(item.retailer || 'store')}</div>
                    <div class="blip-products-actions">
                        <a href="${item.url}" target="_blank" rel="noopener" class="action-link orange">Open</a>
                        <button type="button" class="action-link outline add-cart-btn">Save to Cart</button>
                    </div>
                `;
                card.querySelector('.add-cart-btn')?.addEventListener('click', () => {
                    const ok = addToCart({
                        ...item,
                        imageUrl: String(item?.imageUrl || previewDataUrl || '')
                    });
                    if (transcriptText) transcriptText.innerText = ok ? 'Saved to cart.' : 'Could not save to cart.';
                });
                list.appendChild(card);
            });
            const bulkSaveBtn = document.createElement('button');
            bulkSaveBtn.type = 'button';
            bulkSaveBtn.className = 'action-link outline';
            bulkSaveBtn.textContent = '🛒 Save All To Cart';
            bulkSaveBtn.onclick = () => {
                const saved = saveProductLinksToCart(links, { previewDataUrl });
                if (transcriptText) transcriptText.innerText = saved ? `Saved ${saved} products to cart.` : 'No products saved.';
            };
            sidePanel.appendChild(list);
            sidePanel.appendChild(bulkSaveBtn);
            break;
        }
        case 'gmail': {
            sidePanel.innerHTML = `
                ${buildSidePanelHeaderHtml({
                    title: 'Email',
                    summary: summaryText || 'Read your inbox or compose a new email.',
                    kicker: 'Mail'
                })}
                ${emailFeature.buildGmailPanelHtml(tool_params)}
            `;
            emailFeature.bindGmailPanelControls(sidePanel);
            break;
        }
        case 'telegram': {
            sidePanel.innerHTML = `
                ${buildSidePanelHeaderHtml({
                    title: 'Telegram',
                    summary: summaryText || 'Send a quick message or your latest photo.',
                    kicker: 'Telegram'
                })}
                ${telegramFeature.buildTelegramPanelHtml(tool_params)}
            `;
            telegramFeature.bindTelegramPanelControls(sidePanel);
            break;
        }
        case 'notes': {
            const notes = Array.isArray(tool_params.notes) ? tool_params.notes : [];
            const prefill = String(tool_params.prefill || '');
            const draft = tool_params.draft && typeof tool_params.draft === 'object' ? tool_params.draft : null;
            sidePanel.innerHTML = `
                ${buildSidePanelHeaderHtml({
                    title: 'Take Notes',
                    summary: summaryText,
                    kicker: 'Notes'
                })}
                ${draft ? `
                    <div class="blip-panel-card blip-notes-draft">
                        <div class="blip-notes-draft-label">Draft</div>
                        <div class="blip-notes-draft-title">${escapeHtml(String(draft.title || 'Note'))}</div>
                        <div class="blip-notes-draft-meta">${escapeHtml(String(draft.noteType || 'note'))}</div>
                        ${draft.stage === 'awaiting_freeform'
                            ? '<div class="blip-notes-draft-items">Listening for your note…</div>'
                            : (Array.isArray(draft.items) && draft.items.length
                                ? `<div class="blip-notes-draft-items">${escapeHtml(draft.items.join(', '))}</div>`
                                : '<div class="blip-notes-draft-items">Waiting for items…</div>')}
                    </div>
                ` : ''}
                <textarea data-notes-input class="blip-notes-input" placeholder="Write a note for Blip...">${escapeHtml(prefill)}</textarea>
                <div class="blip-notes-actions">
                    <button type="button" data-notes-save class="action-link outline">Save Note</button>
                    <button type="button" data-notes-clear class="action-link outline">Clear Notes</button>
                </div>
                <div class="blip-notes-list blip-panel-scroll">
                    ${notes.length ? notes.map((item) => `
                        <div class="blip-panel-card blip-notes-entry">
                            <div class="blip-notes-text">${Array.isArray(item?.data?.items) && item.data.items.length ? `
                                <div class="blip-notes-entry-title">${escapeHtml(String(item?.data?.title || item.content || 'Note'))}</div>
                                <div>${escapeHtml(String(item.data.items.join(', ')))}</div>
                            ` : escapeHtml(String(item.content || ''))}</div>
                            <div class="blip-notes-entry-footer">
                                <span class="blip-notes-timestamp">${escapeHtml(String(item.timestamp || ''))}</span>
                                <button type="button" data-note-remove="${escapeHtml(String(item.id))}" class="action-link outline">Delete</button>
                            </div>
                        </div>
                    `).join('') : '<div class="blip-panel-empty">No notes yet. Say "take note" or write one above.</div>'}
                </div>
            `;

            sidePanel.querySelector('[data-notes-save]')?.addEventListener('click', () => {
                const input = sidePanel.querySelector('[data-notes-input]');
                const value = String(input?.value || '').trim();
                if (!value) {
                    if (transcriptText) transcriptText.innerText = 'Write a note first.';
                    return;
                }
                addNoteItem(value, { source: 'notes-panel' });
                if (transcriptText) transcriptText.innerText = 'Note saved.';
                openNotesPanel('Note saved.');
            });

            sidePanel.querySelector('[data-notes-clear]')?.addEventListener('click', () => {
                const removedCount = clearNotes();
                if (transcriptText) transcriptText.innerText = removedCount ? `Cleared ${removedCount} note${removedCount === 1 ? '' : 's'}.` : 'No notes to clear.';
                openNotesPanel(removedCount ? `Cleared ${removedCount} note${removedCount === 1 ? '' : 's'}.` : 'No notes to clear.');
            });

            sidePanel.querySelectorAll('[data-note-remove]').forEach((button) => {
                button.addEventListener('click', () => {
                    const itemId = button.getAttribute('data-note-remove');
                    if (!itemId) return;
                    const removed = removeHubItem(itemId);
                    if (transcriptText) transcriptText.innerText = removed ? 'Note deleted.' : 'Could not delete that note.';
                    openNotesPanel(removed ? 'Note deleted.' : 'Could not delete that note.');
                });
            });
            break;
        }
        default:
            sidePanel.innerHTML += '<p class="blip-panel-empty">Handling action...</p>';
    }

    sidePanel.querySelector('button[aria-label="Close panel"]')?.addEventListener('click', () => {
        sidePanel.style.display = 'none';
        if (sidePanelChart) {
            sidePanelChart.destroy();
            sidePanelChart = null;
        }
        clearSidePanelContext();
    });

    if (action === 'gmail') {
        applyGmailSidePanelLayout(sidePanel);
    } else if (action === 'telegram') {
        applyTelegramSidePanelLayout(sidePanel);
    }
    ensureWorkspaceDock(sidePanel, action);
    sidePanel.style.display = panelUsesFlexColumnLayout(action) ? 'flex' : 'block';
}

// Start Audio Visualizer (Minimal)
if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx || !meterLevel) return;

        const ctx = new AudioCtx();
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
}

// Init on load
window.addEventListener('DOMContentLoaded', init);
