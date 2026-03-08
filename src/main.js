import './style.css'
import { askOllama, checkOllamaStatus, warmUpModel, cancelCurrentRequest } from './services/ollama'
import { askGemini, generateSpeech } from './services/gemini'
import { speech } from './services/speech'
import { web } from './services/web'

// ── DOM ELEMENTS ─────────────────────────────────────────────────────────────
const face = document.getElementById('face');
const faceFrame = document.querySelector('.face-frame');
const mouth = document.getElementById('mouth');
const talkBtn = document.getElementById('talkBtn');
const transcriptText = document.getElementById('transcript');
const meterLevel = document.getElementById('meter-level');
const meterBox = document.querySelector('.mic-meter');
const chatBtn = document.getElementById('chatBtn');
const chatEntry = document.getElementById('chat-entry');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');

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

// Map Elements
const mapContainer = document.getElementById('map-container');
const closeMapBtn = document.getElementById('closeMapBtn');
const mapFrame = document.getElementById('map-frame');

// Settings (Unified)
const gearBtn = document.getElementById('gearBtn');
const underTheHood = document.getElementById('under-the-hood');
const closePanelBtn = document.getElementById('closePanelBtn');
const geminiKeyInput = document.getElementById('geminiKeyInput');
const voiceEngineSelect = document.getElementById('voiceEngineSelect');
const modelSelect = document.getElementById('modelSelect');

// ── APP STATE ────────────────────────────────────────────────────────────────
const isGitHub = window.location.hostname.includes('github.io');

const state = {
    isActive: false,
    isThinking: false,
    sensitivity: 20,
    selectedVoice: null,
    currentEmotion: 'serious',
    history: [],
    timers: [],
    pendingImage: null, // Base64 string
    cameraStream: null,
    geminiKey: localStorage.getItem('blip_gemini_key') || '',
    selectedModel: 'gemini-2.5-flash', // Corrected stable model
    voiceEngine: 'gemini',             // Standardized for V3.1.0
    selectedGeminiVoice: 'Kore',       // Standardized for V3.1.0
    hubItems: JSON.parse(localStorage.getItem('blip_hub')) || [],
    idleBehavior: null, // 'dreamer', 'observer', 'squinter'
    isProjectorMode: false,
    isLiveWatch: false,
    liveInterval: null,
    liveFrames: [] // Queue of last 5 frames [{data, mimeType}]
};
// V4.3.1 - The Sequential Scenery Update

// ── PERSONA CONFIGURATION (V3.4.0) ───────────────────────────────────────────
const PERSONAS = {
    idle: { emoji: "✨", label: "BLIP", color: "#818cf8", emotion: "serious" },
    listening: { emoji: "👂", label: "LISTENING", color: "#f43f5e", emotion: "surprised" },
    thinking: { emoji: "🧠", label: "THINKING", color: "#8b5cf6", emotion: "thinking" },
    happy: { emoji: "😊", label: "HAPPY", color: "#10b981", emotion: "happy" },
    sad: { emoji: "😢", label: "SAD", color: "#64748b", emotion: "sad" },
    warning: { emoji: "⚠️", label: "ALERT", color: "#f59e0b", emotion: "surprised" },
    sleepy: { emoji: "💤", label: "SLEEPY", color: "#334155", emotion: "sleepy" },
    cooking: { emoji: "👨‍🍳", label: "CHEF MODE", color: "#fb923c", emotion: "gentle" },
    study: { emoji: "📚", label: "STUDY MODE", color: "#3b82f6", emotion: "serious" },
    media: { emoji: "🎬", label: "MEDIA", color: "#ef4444", emotion: "excited" },
    advice: { emoji: "💡", label: "ADVISOR", color: "#eab308", emotion: "gentle" }
};

// ── INITIALIZATION ───────────────────────────────────────────────────────────
async function init() {
    console.log('🚀 Blip V4.3.1 initializing...');

    // Load voices
    const voices = await speech.init();
    voiceSelect.innerHTML = voices
        .filter(v => v.lang.startsWith('en'))
        .map((v, i) => `<option value="${i}">${v.name}</option>`)
        .join('');

    state.selectedVoice = voices[0];
    voiceSelect.onchange = (e) => {
        state.selectedVoice = voices[parseInt(e.target.value)];
    };

    // Kokoro voice selector
    kokoroVoiceSelect.onchange = (e) => {
        speech.setKokoroVoice(e.target.value);
    };

    // Initialize UI
    geminiKeyInput.value = state.geminiKey;

    const saveKey = (e) => {
        state.geminiKey = e.target.value.trim();
        localStorage.setItem('blip_gemini_key', state.geminiKey);
        console.log('🔐 Access Key updated');
    };

    // Persistence Fix: Listen to multiple events to ensure it saves on mobile
    geminiKeyInput.oninput = saveKey;
    geminiKeyInput.onchange = saveKey;
    geminiKeyInput.onblur = saveKey;

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

    // Scenery Orbit (V4.3.1)
    initSceneryOrbit();

    chatBtn.onclick = () => {
        chatEntry.classList.toggle('hidden');
        if (!chatEntry.classList.contains('hidden')) chatInput.focus();
    };

    sendChatBtn.onclick = postChat;
    chatInput.onkeydown = (e) => { if (e.key === 'Enter') postChat(); };

    renderHub();
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
    state.history = []; // Clear context on stop
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
    talkBtn.classList.add('active');

    speech.startListening(
        // On Result
        (result) => {
            transcriptText.innerHTML = `<i style="opacity: 0.7;">🎤 ${result.text}</i>`;
            if (result.isFinal) {
                setPersona('thinking');
                handleCommand(result.text);
            }
        },
        // On End
        () => {
            if (state.isActive && !state.isThinking && !speech.isSpeaking) {
                setTimeout(startListeningLoop, 300);
            }
        },
        // On Error
        (err) => {
            console.warn('Recognition error:', err);
            if (err.error === 'not-allowed') {
                stopApp();
                transcriptText.innerText = '⚠️ Microphone blocked.';
            }
        }
    );
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
        const reviewText = await web.getPlaceReviews(res.tool_params.query, res.tool_params.location);
        addToHub('ai', `⭐ Reviews for ${res.tool_params.query}: ${reviewText.substring(0, 100)}...`);
        state.history.push({ user: `(System: Fetched reviews for ${res.tool_params.query})`, blip: reviewText });
        document.body.classList.add('projecting-visual');
        return { text: `${res.text} ${reviewText}` };
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

    timer: async (res) => {
        if (res.value_ms) setBlipTimer(res.text, res.value_ms);
        return { text: res.text };
    },

    calendar: async (res) => {
        if (!res.event_details) return { text: res.text };
        const url = createGoogleCalendarUrl(res.event_details);
        addToHub('link', `📅 Calendar Event: ${res.event_details.summary}`, { url });
        return { text: res.text, extraHtml: `<br><a href="${url}" target="_blank" class="action-link blue">📅 ADD TO GOOGLE CALENDAR</a>` };
    },

    youtube: async (res) => {
        if (!res.tool_params?.query) return { text: res.text };
        const result = await web.searchYouTube(res.tool_params.query);
        addToHub('link', `🎬 YouTube: ${res.tool_params.query}`, { url: result.url });
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
        const ms = res.tool_params?.ms || 0;
        const label = res.tool_params?.label || 'Timer';
        if (ms <= 0) return { text: "I can't set a timer for 0 seconds!" };

        setTimeout(() => {
            spawnSymbol('🔔');
            speak(`Time is up for your ${label}!`, 'happy');
            alert(`🔔 Blip Timer: ${label} is finished!`);
        }, ms);

        return { text: `OK! I've set a timer for ${label} for ${Math.round(ms / 60000)} minutes.` };
    },

    list: async (res) => {
        const type = res.tool_params?.type || 'todo';
        const action = res.tool_params?.action || 'view';
        const item = res.tool_params?.item;

        const key = `blip_list_${type}`;
        let list = JSON.parse(localStorage.getItem(key)) || [];

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

        // --- STEP 1: INTERPRET INTENT (Context Aware) ---
        console.log("🧠 Step 1: Interpret Intent");
        const intentPrompt = `You are the Intent Interpreter. 
Analyze the user's latest request: "${cmd}".
Use the conversation history for context if the user is referring to previous topics (like countries, data, or graphs).

Return a simple JSON object: {
  "action": "search|weather|chart|timer|list|nutrition|map|youtube|none", 
  "query": "optimized search query based on current and previous context",
  "entities": ["entity1", "entity2"] (e.g. ["Mexico", "Spain"] if those are being compared)
}`;

        const intentResponse = await askGemini(intentPrompt, state.history, [], state.geminiKey, state.selectedModel);
        let intent = extractJSON(intentResponse.text) || { action: 'none', query: cmd, entities: [] };

        // --- STEP 2: DEEP RESEARCH ---
        console.log("📡 Step 2: Researching", intent);
        let evidence = "No special data found.";
        let extraHtml = '';

        // SPECIAL CASE: Deep Demographic Search (V3.6.0)
        if (cmd.toLowerCase().includes('population') || cmd.toLowerCase().includes('demographic')) {
            const research = await web.deepDemographicSearch(intent.query || cmd, intent.entities || []);
            evidence = research.text;
            const standardResult = await actionHandlers.search({ tool_params: { query: intent.query || cmd } }, state);
            extraHtml = standardResult.extraHtml;
        }
        // SPECIAL CASE: Charts require research first
        else if (intent.action === 'chart') {
            const research = await web.search(intent.query || cmd, intent.entities || []);
            evidence = research.text;
        }
        // GENERIC CASE: Action Handlers (Supports 40 Scenarios)
        else if (actionHandlers[intent.action]) {
            const result = await actionHandlers[intent.action]({ tool_params: { ...intent, query: intent.query || cmd } }, state);
            evidence = result.text;
            extraHtml = result.extraHtml || '';
        }
        // FALLBACK: General Search
        else if (intent.action === 'search') {
            const research = await web.search(intent.query || cmd);
            evidence = research.text;
            extraHtml = research.html || '';
        }

        // --- STEP 3: SYNTHESIZE ANSWER ---
        console.log("✍️ Step 3: Synthesizing Final Answer");
        let synthesisPrompt = "";

        if (intent.action === 'chart') {
            synthesisPrompt = `Based on this research: "${evidence.substring(0, 3000)}", 
            extract data for a chart to answer: "${cmd}".
            Return a JSON object: { "text": "natural explanation", "labels": ["label1", "label2"], "data": [value1, value2], "title": "Chart Title", "type": "bar|line|pie" }.
            DO NOT apologize. If data is missing, estimate or provide best available numbers from the research.`;
        } else {
            synthesisPrompt = `Based on the following research evidence: "${evidence.substring(0, 3000)}", 
            generate a final answer for the user's request: "${cmd}".

            CRITICAL DATA RULES:
            1. ENTITY VERIFICATION: Only report data for the EXACT entities requested (e.g., Mexico, Spain). If the evidence discusses other places (e.g., UK, Trinidad), DO NOT report that as the answer.
            2. NO HALLUCINATION: If the evidence does not contain the specific numbers for the requested entities, state clearly that the research didn't return those exact figures yet.
            3. DATA FORMAT: Use Markdown tables for comparisons.
            4. TOTAL POPULATION: Include Total Population, Men/Women counts/percentages, and Median Age if found.
            5. PERSONA: Maintain the "Identity Course" style (insightful, profound) but keep it grounded in the hard facts found in the evidence.`;
        }

        const synthesisResponse = await askGemini(synthesisPrompt, state.history, images, state.geminiKey, state.selectedModel);
        let finalReply = synthesisResponse.text;

        // Specialized Chart Rendering
        if (intent.action === 'chart') {
            const chartData = extractJSON(synthesisResponse.text);
            if (chartData) {
                finalReply = chartData.text || "Here is the data visualization you requested.";
                if (chartData.labels && chartData.data) {
                    setMode('chart');
                    renderChart(chartData.labels, chartData.data, chartData.title || 'Data Graph', chartData.type || 'bar');
                    document.body.classList.add('projecting-visual');
                    extraHtml += `<br><button onclick="setMode('chart')" class="action-link purple">📈 VIEW GRAPH</button>`;
                }
            } else {
                console.warn("Failed to extract chart JSON from synthesis.");
            }
        }

        // Specialized Map Rendering
        if (intent.action === 'map' && intent.query) {
            setMode('map');
            const mapQuery = intent.query && intent.location ? `${intent.query} in ${intent.location}` : intent.query;
            mapFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
            document.body.classList.add('projecting-visual');
            extraHtml += `<br><button onclick="setMode('map')" class="action-link blue">📍 VIEW MAP</button>`;
        }

        // Render transcript
        transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${finalReply}${extraHtml}`;

        // Add to history
        state.history.push({ user: cmd, blip: finalReply });
        if (state.history.length > 25) state.history.shift();

        // Visual Reactions
        spawnSymbol('brain');
        face.classList.remove('thinking');

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
        await speak(finalReply, 'serious');
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
        if (!state.geminiKey && !isGitHub) {
            console.warn('Gemini key missing for cloud voice, falling back to browser');
            transcriptText.innerHTML += `<br><small style="color:#f59e0b">⚠️ Enter 1234/API Key for Cloud Voice</small>`;
            return speech.speak(text, { ...cfg, onBoundary: animateMouth });
        }
        try {
            console.log('☁️ Using Gemini Cloud Voice (Kore)');
            const voiceName = 'Kore';
            const audioData = await generateSpeech(text, state.geminiKey, voiceName);
            return speech.playBase64Audio(audioData, { onBoundary: animateMouth });
        } catch (e) {
            console.warn('Gemini voice failed, falling back:', e.message);
            return speech.speak(text, { ...cfg, onBoundary: animateMouth });
        }
    }

    return speech.speak(text, {
        voice: state.selectedVoice,
        ...cfg,
        onBoundary: (level) => animateMouth(level)
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

    // Sync Face
    if (state.idleBehavior) {
        face.classList.remove(state.idleBehavior);
        state.idleBehavior = null;
    }
    face.className = p.emotion;
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
function startSceneryTracking() {
    const faceFrame = document.querySelector('.face-frame');
    if (!faceFrame) return;

    function update() {
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
    // Google TEMPLATE expects YYYYMMDDTHHMMSS (no dashes or colons)
    const start = details.start.replace(/[-:]/g, '');
    const end = details.end.replace(/[-:]/g, '');
    const title = encodeURIComponent(details.title);
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

    let currentIndex = Math.floor(Math.random() * objects.length);

    function spawnNext() {
        const obj = objects[currentIndex];

        // Show and animate
        obj.classList.add('active');

        // Find animation duration (+ small buffer)
        const duration = 25000; // Average duration for our characters

        setTimeout(() => {
            obj.classList.remove('active');

            // Wait for next character (5-10s random gap)
            const waitTime = 5000 + Math.random() * 5000;

            currentIndex = (currentIndex + 1) % objects.length;
            setTimeout(spawnNext, waitTime);
        }, duration);
    }

    // Initial start after a few seconds
    setTimeout(spawnNext, 3000);
}
