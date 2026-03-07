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
const voiceSelect = document.getElementById('voiceSelect');
const thresholdSlider = document.getElementById('thresholdSlider');
const thresholdVal = document.getElementById('thresholdVal');
const ossStatus = document.getElementById('ollama-status');
const ossText = document.getElementById('status-text');
const kokoroVoiceSelect = document.getElementById('kokoroVoiceSelect');
const kokoroStatusDot = document.getElementById('kokoro-status');
const geminiVoiceSelect = document.getElementById('geminiVoiceSelect');
const voiceEngineSelect = document.getElementById('voiceEngineSelect');
const modelSelect = document.getElementById('modelSelect');
const geminiKeyInput = document.getElementById('geminiKeyInput');
const geminiKeyContainer = document.getElementById('gemini-key-container');

// Vision Elements
const cameraBtn = document.getElementById('cameraBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const visionPreviewContainer = document.getElementById('vision-preview-container');
const visionPreview = document.getElementById('vision-preview');
const clearImageBtn = document.getElementById('clear-image-btn');
const webcamVideo = document.getElementById('webcam-video');
const captureCanvas = document.getElementById('capture-canvas');
const cameraControls = document.getElementById('camera-controls');
const snapBtn = document.getElementById('snapBtn');
const stopCameraBtn = document.getElementById('stopCameraBtn');

// Chart Elements
const chartContainer = document.getElementById('chart-container');
const closeChartBtn = document.getElementById('closeChartBtn');
const downloadChartBtn = document.getElementById('downloadChartBtn');
const currencyChartCanvas = document.getElementById('currencyChart');
let activeChart = null;

// Map Elements
const mapContainer = document.getElementById('map-container');
const closeMapBtn = document.getElementById('closeMapBtn');
const mapFrame = document.getElementById('map-frame');

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
    selectedModel: localStorage.getItem('blip_model') || (isGitHub ? 'gemini-2.5-flash' : 'llama3.2'),
    voiceEngine: localStorage.getItem('blip_voice_engine') || (isGitHub ? 'gemini' : 'kokoro')
};

// ── INITIALIZATION ───────────────────────────────────────────────────────────
async function init() {
    console.log('🚀 Blip V2 initializing...');

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

    // Sensitivity
    thresholdSlider.oninput = (e) => {
        state.sensitivity = parseInt(e.target.value);
        thresholdVal.innerText = `${state.sensitivity}%`;
    };

    // Kokoro voice selector
    kokoroVoiceSelect.onchange = (e) => {
        speech.setKokoroVoice(e.target.value);
    };

    // Initialize UI
    modelSelect.value = state.selectedModel;
    geminiKeyInput.value = state.geminiKey;
    toggleGeminiInput();

    modelSelect.onchange = (e) => {
        state.selectedModel = e.target.value;
        localStorage.setItem('blip_model', state.selectedModel);
        toggleGeminiInput();
        if (!state.selectedModel.startsWith('gemini')) {
            warmUpModel(state.selectedModel);
        }
    };

    geminiKeyInput.oninput = (e) => {
        state.geminiKey = e.target.value.trim();
        localStorage.setItem('blip_gemini_key', state.geminiKey);
    };

    // Initialize Gemini Voice
    const savedGeminiVoice = localStorage.getItem('blip_gemini_voice') || 'Puck';
    geminiVoiceSelect.value = savedGeminiVoice;

    // Voice Engine Handling
    voiceEngineSelect.value = state.voiceEngine;
    updateVoiceToggles();

    voiceEngineSelect.onchange = (e) => {
        state.voiceEngine = e.target.value;
        localStorage.setItem('blip_voice_engine', state.voiceEngine);
        updateVoiceToggles();
        toggleGeminiInput();
    };

    geminiVoiceSelect.onchange = (e) => {
        localStorage.setItem('blip_gemini_voice', e.target.value);
    };

    function updateVoiceToggles() {
        const kItem = document.getElementById('kokoro-voice-item');
        const gItem = document.getElementById('gemini-voice-item');
        if (state.voiceEngine === 'kokoro') {
            kItem.style.display = 'block';
            gItem.style.display = 'none';
        } else if (state.voiceEngine === 'gemini') {
            kItem.style.display = 'none';
            gItem.style.display = 'block';
        } else {
            kItem.style.display = 'none';
            gItem.style.display = 'none';
        }
    }

    function toggleGeminiInput() {
        const needsKey = state.selectedModel.startsWith('gemini') || state.voiceEngine === 'gemini';
        if (needsKey) {
            geminiKeyContainer.style.display = 'block';
        } else {
            geminiKeyContainer.style.display = 'none';
        }
    }

    // Check Kokoro status and update its dot
    updateKokoroStatus();                          // immediate check (async, non-blocking)
    setInterval(updateKokoroStatus, 15000);        // re-check every 15s

    // Check Ollama
    const isOnline = await checkOllamaStatus();
    updateOllamaStatus(isOnline);
    if (isOnline) {
        warmUpModel('llama3.2');
        warmUpModel('llava');
    }

    // Face blinking
    setInterval(() => {
        if (state.currentEmotion === 'surprised') return;
        const eyes = document.querySelectorAll('.eye');
        eyes.forEach(e => e.style.height = '2px');
        setTimeout(() => {
            eyes.forEach(e => e.style.height = '14px');
        }, 150);
    }, 4000);

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

    talkBtn.onclick = toggleApp;

    // Vision Listeners
    cameraBtn.onclick = startCamera;
    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = handleFileUpload;
    clearImageBtn.onclick = clearPendingImage;
    snapBtn.onclick = capturePhoto;
    stopCameraBtn.onclick = stopCamera;

    // Chart Listeners
    closeChartBtn.onclick = () => {
        chartContainer.style.display = 'none';
        if (activeChart) activeChart.destroy();
    };

    downloadChartBtn.onclick = () => {
        const link = document.createElement('a');
        link.download = 'exchange_rate_7_days.png';
        link.href = currencyChartCanvas.toDataURL('image/png');
        link.click();
    };

    // Map Listeners
    closeMapBtn.onclick = () => {
        mapContainer.style.display = 'none';
        mapFrame.src = '';
    };
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

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const base64 = event.target.result.split(',')[1];
        setPendingImage(base64);
        setEmotion('happy');
        transcriptText.innerText = "Got the file! Ask me anything about it.";
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

            meterBox.style.display = 'block';
            setEmotion('happy');
            talkBtn.innerText = '⌛ WAKING UP...';

            await speak("Hello! My name is Blip. How can I help you today?");
            startListeningLoop();
        } catch (err) {
            console.error("Wake up error:", err);
            stopApp();
            transcriptText.innerText = "⚠️ I had trouble waking up. Try again?";
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
    document.body.classList.remove('thinking-mode');
    talkBtn.innerText = '🔴 LISTENING...';
    talkBtn.classList.remove('thinking');
    talkBtn.classList.add('listening');
    faceFrame?.classList.add('listening-glow');
    setEmotion('serious');
    transcriptText.innerHTML = '<span style="color:#f88">🛑 Interrupted. Say "Hey Blip" again.</span>';
    startListeningLoop();
}

function stopApp() {
    state.isActive = false;
    state.history = []; // Clear context on stop
    clearPendingImage();
    stopCamera(); // Ensure camera is closed
    speech.stopListening();
    window.speechSynthesis.cancel();
    talkBtn.innerText = '▶ START BLIP';
    talkBtn.classList.remove('listening', 'thinking');
    faceFrame?.classList.remove('listening-glow');
    meterBox.style.display = 'none';
    setEmotion('serious');
    transcriptText.innerText = 'Blip is resting.';
}

function startListeningLoop() {
    if (!state.isActive || state.isThinking) return;

    talkBtn.innerText = '🔴 LISTENING...';
    talkBtn.classList.add('listening');
    faceFrame?.classList.add('listening-glow');

    speech.startListening(
        // On Result
        (result) => {
            transcriptText.innerHTML = `<i style="opacity: 0.7;">🎤 ${result.text}</i>`;
            if (result.isFinal) handleCommand(result.text);
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
                transcriptText.innerText = '⚠️ Microphone blocked. Please allow access.';
            }
        }
    );
}

// ── ACTION HANDLERS ──────────────────────────────────────────────────────────
const actionHandlers = {
    weather: async (res, state) => {
        if (!res.tool_params?.location) return { text: res.text };
        const weather = await web.getWeather(res.tool_params.location);
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
            renderCurrencyChart(history.labels, history.rates, `${res.tool_params.from} to ${res.tool_params.to}`);
            extraHtml = `<br><button onclick="document.getElementById('chart-container').style.display='block'" class="action-link purple">📈 VIEW GRAPH</button>`;
        }
        return { text: `${res.text} ${exchange.text}`, extraHtml };
    },

    map: async (res, state) => {
        if (!res.tool_params?.query || !res.tool_params?.location) return { text: res.text };
        const query = encodeURIComponent(`${res.tool_params.query} in ${res.tool_params.location}`);
        mapFrame.src = `https://maps.google.com/maps?q=${query}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
        mapContainer.style.display = 'block';

        const mapsUrl = `https://www.google.com/maps/search/${query}`;
        let extraHtml = `<br><a href="${mapsUrl}" target="_blank" class="action-link green">🌍 OPEN IN GOOGLE MAPS</a>`;

        const searchSummary = await web.getPlaceInfo(res.tool_params.query, res.tool_params.location);
        const finalReply = `${res.text} I have marked them on the map for you. ${searchSummary}`;

        state.history.push({ user: `(System: Map search for ${res.tool_params.query} in ${res.tool_params.location})`, blip: finalReply });
        return { text: finalReply, extraHtml };
    },

    reviews: async (res, state) => {
        if (!res.tool_params?.query || !res.tool_params?.location) return { text: res.text };
        const reviewText = await web.getPlaceReviews(res.tool_params.query, res.tool_params.location);
        state.history.push({ user: `(System: Fetched reviews for ${res.tool_params.query})`, blip: reviewText });
        return { text: `${res.text} ${reviewText}` };
    },

    movies: async (res, state) => {
        if (!res.tool_params?.location) return { text: res.text };
        const moviesText = await web.getMovies(res.tool_params.location);
        state.history.push({ user: `(System: Fetched movies for ${res.tool_params.location})`, blip: moviesText });
        return { text: `${res.text} ${moviesText}` };
    },

    products: async (res, state) => {
        if (!res.tool_params?.query) return { text: res.text };
        const recommendations = res.tool_params.recommendations || [];
        const result = await web.getProducts(res.tool_params.query, recommendations);
        state.history.push({ user: `(System: Products for ${res.tool_params.query})`, blip: result.text });
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
        return { text: res.text, extraHtml: `<br><a href="${url}" target="_blank" class="action-link blue">📅 ADD TO GOOGLE CALENDAR</a>` };
    }
};

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

    try {
        const images = state.pendingImage ? [state.pendingImage] : [];

        let response;
        if (state.selectedModel.startsWith('gemini')) {
            if (!state.geminiKey) {
                response = { emotion: 'sad', text: 'I need your Gemini API key in the settings to use this super brain!', action: 'none' };
            } else {
                response = await askGemini(cmd, state.history, images, state.geminiKey, state.selectedModel);
            }
        } else {
            response = await askOllama(cmd, state.history, images, state.selectedModel);
        }

        let finalReply = response.text;
        let extraHtml = '';

        // Execute specific action handler if it exists
        if (actionHandlers[response.action]) {
            const result = await actionHandlers[response.action](response, state);
            finalReply = result.text;
            extraHtml = result.extraHtml || '';
        }

        // Render transcript with all extra buttons
        transcriptText.innerHTML = `<b>You:</b> ${cmd}<br><b>Blip:</b> ${finalReply}${extraHtml}`;

        // Add to history (regular response)
        if (response.action !== 'weather' && response.action !== 'currency' && response.action !== 'map' && response.action !== 'reviews') {
            state.history.push({ user: cmd, blip: finalReply });
        }
        if (state.history.length > 5) state.history.shift();

        // Clear image after successful response
        if (state.pendingImage) clearPendingImage();

        talkBtn.innerText = '🔊 SPEAKING...';
        await speak(finalReply, response.emotion);
    } catch (error) {
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
        if (!state.geminiKey) {
            console.warn('Gemini key missing for cloud voice, falling back to browser');
            transcriptText.innerHTML += `<br><small style="color:#f59e0b">⚠️ Enter 1234/API Key for Cloud Voice</small>`;
            return speech.speak(text, { ...cfg, onBoundary: animateMouth });
        }
        try {
            console.log('☁️ Using Gemini Cloud Voice');
            const voiceName = geminiVoiceSelect.value || 'Puck';
            const audioData = await generateSpeech(text, state.geminiKey, voiceName);
            return speech.playBase64Audio(audioData, { onBoundary: animateMouth });
        } catch (e) {
            console.warn('Gemini voice failed, falling back:', e.message);
            transcriptText.innerHTML += `<br><small style="color:#ef4444">⚠️ Cloud voice failed: ${e.message}</small>`;
            return speech.speak(text, { ...cfg, onBoundary: animateMouth });
        }
    }

    return speech.speak(text, {
        voice: state.selectedVoice,
        ...cfg,
        onBoundary: (level) => animateMouth(level)
    });
}

function setEmotion(e) {
    state.currentEmotion = e;
    face.className = e;
}

function spawnSymbol(type) {
    const container = document.getElementById('floating-symbols');
    if (!container) return;

    const symbol = document.createElement('div');
    symbol.classList.add('symbol', type);

    const randomX = Math.floor(Math.random() * 80) + 10;
    symbol.style.left = `${randomX}%`;
    symbol.style.bottom = '10%';

    if (type === 'question') symbol.innerText = '???';
    else if (type === 'exclamation') symbol.innerText = '!!!';
    else if (type === 'music') symbol.innerText = '♪';

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

function renderCurrencyChart(labels, data, title) {
    if (activeChart) activeChart.destroy();

    // Default chart.js settings for dark mode
    Chart.defaults.color = '#a0a0b8';
    Chart.defaults.font.family = 'Inter';

    activeChart = new Chart(currencyChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#fff',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
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
