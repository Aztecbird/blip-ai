const KOKORO_URL = 'http://127.0.0.1:8765';

class SpeechService {
    constructor() {
        this.synth = window.speechSynthesis;
        this.SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = null;
        this.voices = [];
        this.isSpeaking = false;
        this.kokoroOnline = false;
        this.kokoroVoice = 'af_sarah'; // default
        this._audioCtx = null;
    }

    // 🎙️ Initialize AudioContext on user gesture
    initAudio() {
        if (!this._audioCtx) {
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this._audioCtx.state === 'suspended') {
            this._audioCtx.resume();
        }
    }

    async init() {
        console.log('🎤 Initializing Speech Service...');
        // Load browser voices with a timeout
        const browserVoices = await new Promise((resolve) => {
            let resolved = false;
            const load = () => {
                if (resolved) return;
                const v = this.synth.getVoices();
                if (v.length > 0) {
                    resolved = true;
                    resolve(v);
                }
            };

            // Wait up to 2.5 seconds for voices
            setTimeout(() => {
                if (!resolved) {
                    console.warn('🕒 Browser voices timeout. Proceeding with empty list.');
                    resolved = true;
                    resolve([]);
                }
            }, 2500);

            this.synth.onvoiceschanged = load;
            load();
        });

        this.voices = browserVoices;
        // Check Kokoro in background
        this.checkKokoroStatus();

        return browserVoices;
    }

    async checkKokoroStatus() {
        try {
            const res = await fetch(`${KOKORO_URL}/health`, { signal: AbortSignal.timeout(3000) });
            const wasOffline = !this.kokoroOnline;
            this.kokoroOnline = res.ok;
            // If Kokoro just came online, pre-warm the model silently
            if (res.ok && wasOffline) this._warmUp();
        } catch {
            this.kokoroOnline = false;
        }
        return this.kokoroOnline;
    }

    // Silent warm-up: triggers model load in background before first real speech
    async _warmUp() {
        console.log('🔥 Warming up Kokoro model (may take ~30s first time)...');
        try {
            await fetch(`${KOKORO_URL}/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'ready', voice: this.kokoroVoice, speed: 1.0 }),
                signal: AbortSignal.timeout(90000)  // 90s for model download + load
            });
            console.log('✅ Kokoro model warmed up!');
        } catch (e) {
            console.warn('⚠️ Kokoro warm-up timed out — will retry on first speech:', e.message);
        }
    }

    setKokoroVoice(voice) {
        this.kokoroVoice = voice;
    }

    // ── KOKORO TTS ─────────────────────────────────────────────────────────────
    async _speakKokoro(text, options = {}) {
        const res = await fetch(`${KOKORO_URL}/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                voice: this.kokoroVoice,
                speed: options.rate || 1.0
            }),
            signal: AbortSignal.timeout(90000)  // 90s — first call loads the model
        });

        if (!res.ok) throw new Error(`Kokoro error ${res.status}`);

        const arrayBuffer = await res.arrayBuffer();

        // Play via AudioContext
        if (!this._audioCtx) this._audioCtx = new AudioContext();
        const audioBuffer = await this._audioCtx.decodeAudioData(arrayBuffer);

        return new Promise((resolve) => {
            const source = this._audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this._audioCtx.destination);

            // Animate mouth while speaking
            const interval = setInterval(() => {
                if (options.onBoundary) options.onBoundary(0.3 + Math.random() * 0.6);
            }, 70);

            source.onended = () => {
                clearInterval(interval);
                if (options.onBoundary) options.onBoundary(0);
                this.isSpeaking = false;
                resolve();
            };

            source.start(0);
        });
    }

    // ── BROWSER TTS FALLBACK ───────────────────────────────────────────────────
    _speakBrowser(text, options = {}) {
        return new Promise((resolve) => {
            this.synth.cancel();

            const utter = new SpeechSynthesisUtterance(text);
            if (options.voice) utter.voice = options.voice;
            utter.pitch = options.pitch || 1;
            utter.rate = options.rate || 1;

            const interval = setInterval(() => {
                if (options.onBoundary) options.onBoundary(0.3 + Math.random() * 0.6);
            }, 70);

            // Safety timeout (Chrome bug)
            const safetyTimeout = setTimeout(() => {
                console.warn('Browser speech safety timeout fired');
                this.isSpeaking = false;
                clearInterval(interval);
                resolve();
            }, (text.length * 100) + 2000);

            utter.onend = () => {
                clearTimeout(safetyTimeout);
                clearInterval(interval);
                this.isSpeaking = false;
                if (options.onBoundary) options.onBoundary(0);
                resolve();
            };

            this.synth.speak(utter);
            window._latestUtter = utter;
        });
    }

    // ── MAIN SPEAK — tries Kokoro first, falls back to browser ────────────────
    speak(text, options = {}) {
        this.isSpeaking = true;

        if (this.kokoroOnline) {
            console.log('🎙️ Using Kokoro TTS');
            return this._speakKokoro(text, options).catch((err) => {
                console.warn('Kokoro failed, falling back to browser TTS:', err);
                this.kokoroOnline = false;  // mark offline until next check
                return this._speakBrowser(text, options);
            });
        }

        console.log('🔊 Using browser TTS (Kokoro offline)');
        return this._speakBrowser(text, options);
    }

    async playBase64Audio(base64Data, options = {}) {
        this.isSpeaking = true;
        this.initAudio(); // Ensure context is ready

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const audioBuffer = await this._audioCtx.decodeAudioData(bytes.buffer);

        return new Promise((resolve) => {
            const source = this._audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this._audioCtx.destination);

            const interval = setInterval(() => {
                if (options.onBoundary) options.onBoundary(0.3 + Math.random() * 0.6);
            }, 70);

            source.onended = () => {
                clearInterval(interval);
                if (options.onBoundary) options.onBoundary(0);
                this.isSpeaking = false;
                resolve();
            };

            source.start(0);
        });
    }

    // ── SPEECH RECOGNITION ────────────────────────────────────────────────────
    startListening(onResult, onEnd, onError) {
        if (!this.SR) return null;

        if (this.recognition) {
            try { this.recognition.stop(); } catch (e) { }
        }

        this.recognition = new this.SR();
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = true;
        this.recognition.continuous = false;

        this.recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            onResult({
                text: result[0].transcript,
                isFinal: result.isFinal
            });
        };

        this.recognition.onend = onEnd;
        this.recognition.onerror = onError;

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
