const KOKORO_URL = 'http://127.0.0.1:8765';

function createTimeoutSignal(timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return {
        signal: controller.signal,
        clear() {
            clearTimeout(timeoutId);
        }
    };
}

class SpeechService {
    constructor() {
        this.synth = window.speechSynthesis;
        this.SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.AudioContextClass = window.AudioContext || window.webkitAudioContext || null;
        this.recognition = null;
        this.voices = [];
        this.isSpeaking = false;
        this.kokoroOnline = false;
        this.kokoroVoice = 'af_sarah'; // default
        this._audioCtx = null;
        this._activeAudioSource = null;
        this._activeCleanup = null;
        this._activeUtterance = null;
    }

    // 🎙️ Initialize AudioContext on user gesture
    initAudio() {
        if (!this.AudioContextClass) return null;
        if (!this._audioCtx) this._audioCtx = new this.AudioContextClass();
        if (this._audioCtx.state === 'suspended') {
            this._audioCtx.resume().catch?.(() => { });
        }
        return this._audioCtx;
    }

    /**
     * Must be awaited before playing decoded audio (Gemini TTS, Kokoro) after any async gap.
     * Otherwise the context often stays suspended and playback is silent.
     */
    async ensureAudioReady() {
        if (!this.AudioContextClass) return null;
        if (!this._audioCtx) this._audioCtx = new this.AudioContextClass();
        try {
            if (this._audioCtx.state === 'suspended') {
                await this._audioCtx.resume();
            }
        } catch (e) {
            console.warn('AudioContext resume failed:', e);
        }
        return this._audioCtx;
    }

    async init() {
        console.log('🎤 Initializing Speech Service...');
        if (!this.synth || typeof this.synth.getVoices !== 'function') {
            console.warn('Browser speech synthesis is unavailable.');
            this.voices = [];
            this.checkKokoroStatus();
            return [];
        }
        // Load browser voices with a timeout
        const browserVoices = await new Promise((resolve) => {
            let resolved = false;
            const cleanup = () => {
                if ('onvoiceschanged' in this.synth) this.synth.onvoiceschanged = null;
            };
            const load = () => {
                if (resolved) return;
                const v = this.synth.getVoices();
                if (v.length > 0) {
                    resolved = true;
                    cleanup();
                    resolve(v);
                }
            };

            // Wait up to 2.5 seconds for voices
            setTimeout(() => {
                if (!resolved) {
                    console.warn('🕒 Browser voices timeout. Proceeding with empty list.');
                    resolved = true;
                    cleanup();
                    resolve([]);
                }
            }, 2500);

            if ('onvoiceschanged' in this.synth) this.synth.onvoiceschanged = load;
            load();
        });

        this.voices = browserVoices;
        // Check Kokoro in background
        this.checkKokoroStatus();

        return browserVoices;
    }

    /** Pick a nicer-sounding browser voice when available (Google, Samantha, Daniel, etc.). */
    getPreferredVoice() {
        const en = this.voices.filter((v) => v.lang && v.lang.startsWith('en'));
        if (!en.length) return null;
        const prefer = ['Google', 'Samantha', 'Daniel', 'Karen', 'Microsoft', 'Fiona', 'Alex', 'Moira', 'Victoria', 'Kate', 'Google US', 'Microsoft Zira'];
        for (const p of prefer) {
            const v = en.find((x) => x.name && x.name.includes(p));
            if (v) return v;
        }
        return en.find((v) => v.lang.startsWith('en-US')) || en[0];
    }

    async checkKokoroStatus() {
        const timeout = createTimeoutSignal(3000);
        try {
            const res = await fetch(`${KOKORO_URL}/health`, { signal: timeout.signal });
            const wasOffline = !this.kokoroOnline;
            this.kokoroOnline = res.ok;
            // If Kokoro just came online, pre-warm the model silently
            if (res.ok && wasOffline) this._warmUp();
        } catch {
            this.kokoroOnline = false;
        } finally {
            timeout.clear();
        }
        return this.kokoroOnline;
    }

    // Silent warm-up: triggers model load in background before first real speech
    async _warmUp() {
        console.log('🔥 Warming up Kokoro model (may take ~30s first time)...');
        const timeout = createTimeoutSignal(90000);
        try {
            await fetch(`${KOKORO_URL}/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'ready', voice: this.kokoroVoice, speed: 1.0 }),
                signal: timeout.signal // 90s for model download + load
            });
            console.log('✅ Kokoro model warmed up!');
        } catch (e) {
            console.warn('⚠️ Kokoro warm-up timed out — will retry on first speech:', e.message);
        } finally {
            timeout.clear();
        }
    }

    setKokoroVoice(voice) {
        this.kokoroVoice = voice;
    }

    stopSpeaking() {
        try { this.synth?.cancel?.(); } catch (_) { }
        if (this._activeCleanup) {
            try { this._activeCleanup(); } catch (_) { }
        }
        this._activeCleanup = null;
        this._activeAudioSource = null;
        this._activeUtterance = null;
        this.isSpeaking = false;
    }

    // ── KOKORO TTS ─────────────────────────────────────────────────────────────
    async _speakKokoro(text, options = {}) {
        const timeout = createTimeoutSignal(90000);
        let res;
        try {
            res = await fetch(`${KOKORO_URL}/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    voice: this.kokoroVoice,
                    speed: options.rate || 1.0
                }),
                signal: timeout.signal // 90s — first call loads the model
            });
        } finally {
            timeout.clear();
        }

        if (!res.ok) throw new Error(`Kokoro error ${res.status}`);

        const arrayBuffer = await res.arrayBuffer();

        // Play via AudioContext (resume after async fetch — required or output is silent)
        const audioCtx = await this.ensureAudioReady();
        if (!audioCtx) throw new Error('Audio playback is unavailable in this browser.');
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const volume = Math.min(1, Math.max(0, options.volume ?? 1));
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = volume;
        gainNode.connect(audioCtx.destination);

        return new Promise((resolve) => {
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(gainNode);

            // Animate mouth while speaking
            const interval = setInterval(() => {
                if (options.onBoundary) options.onBoundary(0.3 + Math.random() * 0.6);
            }, 70);

            let settled = false;
            const finalize = () => {
                if (settled) return;
                settled = true;
                clearInterval(interval);
                if (options.onBoundary) options.onBoundary(0);
                if (this._activeAudioSource === source) {
                    this._activeAudioSource = null;
                    this._activeCleanup = null;
                }
                this.isSpeaking = false;
                resolve();
            };
            source.onended = finalize;
            this._activeAudioSource = source;
            this._activeUtterance = null;
            this._activeCleanup = () => {
                try { source.stop(); } catch (_) { }
                finalize();
            };

            source.start(0);
        });
    }

    // ── BROWSER TTS FALLBACK ───────────────────────────────────────────────────
    _speakBrowser(text, options = {}) {
        if (!this.synth || typeof window.SpeechSynthesisUtterance !== 'function') {
            return Promise.reject(new Error('Browser speech synthesis is unavailable.'));
        }

        return new Promise((resolve) => {
            this.synth.cancel();

            const utter = new SpeechSynthesisUtterance(text);
            if (options.voice) utter.voice = options.voice;
            utter.pitch = options.pitch || 1;
            utter.rate = options.rate || 1;
            utter.volume = Math.min(1, Math.max(0, options.volume ?? 1));

            const interval = setInterval(() => {
                if (options.onBoundary) options.onBoundary(0.3 + Math.random() * 0.6);
            }, 70);

            // Safety timeout (Chrome bug)
            const safetyTimeout = setTimeout(() => {
                console.warn('Browser speech safety timeout fired');
                finalize();
            }, (text.length * 100) + 2000);

            let settled = false;
            const finalize = () => {
                if (settled) return;
                settled = true;
                clearTimeout(safetyTimeout);
                clearInterval(interval);
                this.isSpeaking = false;
                if (options.onBoundary) options.onBoundary(0);
                if (this._activeUtterance === utter) {
                    this._activeUtterance = null;
                    this._activeCleanup = null;
                }
                resolve();
            };
            utter.onend = finalize;
            this._activeAudioSource = null;
            this._activeUtterance = utter;
            this._activeCleanup = () => {
                try { this.synth.cancel(); } catch (_) { }
                finalize();
            };

            this.synth.speak(utter);
            window._latestUtter = utter;
        });
    }

    // ── MAIN SPEAK — tries Kokoro first, falls back to browser ────────────────
    speak(text, options = {}) {
        this.isSpeaking = true;
        let run;
        if (this.kokoroOnline) {
            console.log('🎙️ Using Kokoro TTS');
            run = this._speakKokoro(text, options).catch((err) => {
                console.warn('Kokoro failed, falling back to browser TTS:', err);
                this.kokoroOnline = false;  // mark offline until next check
                return this._speakBrowser(text, options);
            });
        } else {
            console.log('🔊 Using browser TTS (Kokoro offline)');
            run = this._speakBrowser(text, options);
        }

        return Promise.resolve(run).catch((err) => {
            this.isSpeaking = false;
            if (options.onBoundary) options.onBoundary(0);
            throw err;
        });
    }

    async playBase64Audio(base64Data, options = {}) {
        this.isSpeaking = true;
        try {
            const audioCtx = await this.ensureAudioReady();
            if (!audioCtx) throw new Error('Audio playback is unavailable in this browser.');

            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Gemini TTS v1beta returns raw 16-bit PCM at 24000Hz when responseModalities is AUDIO.
            // We manually convert this to an AudioBuffer because it lacks a WAV header.
            const int16Array = new Int16Array(bytes.buffer);
            const float32Array = new Float32Array(int16Array.length);
            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0; // Normalize to [-1.0, 1.0]
            }

            const sampleRate = 24000;
            const audioBuffer = audioCtx.createBuffer(1, float32Array.length, sampleRate);
            audioBuffer.getChannelData(0).set(float32Array);

            const volume = Math.min(1, Math.max(0, options.volume ?? 1));
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = volume;
            gainNode.connect(audioCtx.destination);

            return await new Promise((resolve, reject) => {
                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(gainNode);

                const interval = setInterval(() => {
                    if (options.onBoundary) options.onBoundary(0.3 + Math.random() * 0.6);
                }, 70);
                let settled = false;
                const finalize = () => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(safetyTimeout);
                    clearInterval(interval);
                    if (options.onBoundary) options.onBoundary(0);
                    if (this._activeAudioSource === source) {
                        this._activeAudioSource = null;
                        this._activeCleanup = null;
                    }
                    this.isSpeaking = false;
                    resolve();
                };
                const safetyTimeout = setTimeout(finalize, Math.max(2000, Math.round((audioBuffer.duration || 0) * 2000)));

                source.onended = finalize;
                this._activeAudioSource = source;
                this._activeUtterance = null;
                this._activeCleanup = () => {
                    try { source.stop(); } catch (_) { }
                    finalize();
                };

                try {
                    source.start(0);
                } catch (e) {
                    clearTimeout(safetyTimeout);
                    clearInterval(interval);
                    if (options.onBoundary) options.onBoundary(0);
                    this.isSpeaking = false;
                    reject(e);
                }
            });
        } catch (e) {
            this.isSpeaking = false;
            if (options.onBoundary) options.onBoundary(0);
            throw e;
        }
    }

    // ── SPEECH RECOGNITION ────────────────────────────────────────────────────
    startListening(onResult, onEnd, onError) {
        if (!this.SR) return null;

        if (this.recognition) {
            try {
                this.recognition.onresult = null;
                this.recognition.onend = null;
                this.recognition.onerror = null;
                this.recognition.stop();
            } catch (e) { }
            this.recognition = null;
        }

        this.recognition = new this.SR();
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = true;
        this.recognition.continuous = false;

        this.recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            onResult({
                text: result[0].transcript,
                isFinal: result.isFinal,
                confidence: Number(result[0].confidence) || 0
            });
        };

        this.recognition.onend = (...args) => {
            if (this.recognition) this.recognition = null;
            onEnd?.(...args);
        };
        this.recognition.onerror = (...args) => {
            if (this.recognition) this.recognition = null;
            onError?.(...args);
        };

        try {
            this.recognition.start();
            return true;
        } catch (e) {
            console.error('Recognition start error', e);
            return false;
        }
    }

    stopListening() {
        if (this.recognition) {
            try { this.recognition.stop(); } catch (e) { }
        }
    }
}

export const speech = new SpeechService();
