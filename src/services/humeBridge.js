const DEFAULT_API_BASE = '/api/hume';
const DEFAULT_WS_URL = 'wss://api.hume.ai/v0/evi/chat';
const DEFAULT_TIME_SLICE_MS = 100;

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = String(reader.result || '');
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function getSupportedMimeType() {
    const preferred = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4'
    ];
    const MediaRecorderCtor = window.MediaRecorder;
    if (!MediaRecorderCtor?.isTypeSupported) return '';
    return preferred.find((mime) => MediaRecorderCtor.isTypeSupported(mime)) || '';
}

function normalizeHumeEvent(message = {}) {
    const type = String(message?.type || message?.message_type || '').trim().toLowerCase();

    if (type === 'user_message') {
        return {
            type: 'user_expression',
            transcript: String(
                message?.message?.content
                || message?.text
                || message?.transcript
                || message?.user_message?.content
                || ''
            ).trim(),
            emotionFeatures: message?.emotion_features || message?.models?.prosody?.scores || {},
            raw: message
        };
    }

    if (type === 'assistant_message') {
        return {
            type: 'assistant_message',
            text: String(message?.message?.content || message?.text || '').trim(),
            raw: message
        };
    }

    if (type === 'assistant_end') {
        return {
            type: 'assistant_end',
            raw: message
        };
    }

    return {
        type: type || 'unknown',
        raw: message
    };
}

export function createHumeBridge(options = {}) {
    const apiBase = String(options.apiBase || DEFAULT_API_BASE).replace(/\/$/, '');
    const fetchImpl = options.fetchImpl || fetch.bind(globalThis);
    const mediaDevices = options.mediaDevices || navigator.mediaDevices;
    const MediaRecorderCtor = options.MediaRecorderCtor || window.MediaRecorder;
    const WebSocketCtor = options.WebSocketCtor || window.WebSocket;

    let socket = null;
    let recorder = null;
    let stream = null;
    let started = false;

    function emitStatus(status, extra = {}) {
        options.onStatus?.({
            status,
            ...extra
        });
    }

    async function getSession() {
        const response = await fetchImpl(`${apiBase}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.message || `Hume token request failed (${response.status}).`);
        }
        return response.json();
    }

    async function start(optionsForStart = {}) {
        if (started) return true;
        if (!mediaDevices?.getUserMedia) {
            emitStatus('fallback', { reason: 'browser-mic-unavailable' });
            return false;
        }
        if (!MediaRecorderCtor) {
            emitStatus('fallback', { reason: 'browser-recorder-unavailable' });
            return false;
        }

        emitStatus('connecting');
        const session = await getSession();
        const accessToken = String(session?.accessToken || '').trim();
        const configId = String(optionsForStart.configId || session?.configId || '').trim();
        if (!accessToken) throw new Error('Hume access token missing from backend response.');

        const url = new URL(String(session?.websocketUrl || DEFAULT_WS_URL));
        url.searchParams.set('access_token', accessToken);
        if (configId) url.searchParams.set('config_id', configId);

        stream = optionsForStart.stream || await mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        socket = new WebSocketCtor(url.toString());

        await new Promise((resolve, reject) => {
            let settled = false;
            socket.onopen = () => {
                settled = true;
                resolve();
            };
            socket.onerror = () => {
                if (settled) return;
                settled = true;
                reject(new Error('Could not open the Hume websocket.'));
            };
        });

        const mimeType = getSupportedMimeType();
        recorder = mimeType
            ? new MediaRecorderCtor(stream, { mimeType })
            : new MediaRecorderCtor(stream);

        recorder.ondataavailable = async (event) => {
            if (!event.data || event.data.size === 0) return;
            if (!socket || socket.readyState !== WebSocket.OPEN) return;
            try {
                const base64 = await blobToBase64(event.data);
                socket.send(JSON.stringify({
                    type: 'audio_input',
                    // Hume's websocket currently accepts base64-encoded audio chunks.
                    // If the live API payload differs in your account version, adapt only here.
                    data: base64
                }));
            } catch (error) {
                emitStatus('fallback', { reason: error?.message || 'audio-encode-failed' });
            }
        };

        socket.onmessage = (event) => {
            try {
                const parsed = JSON.parse(String(event.data || '{}'));
                options.onEvent?.(normalizeHumeEvent(parsed));
            } catch (_) {
                options.onEvent?.({
                    type: 'unknown',
                    raw: event.data
                });
            }
        };

        socket.onclose = () => {
            socket = null;
            emitStatus(started ? 'fallback' : 'off', { reason: 'socket-closed' });
        };

        recorder.start(Number(optionsForStart.timeSliceMs || DEFAULT_TIME_SLICE_MS));
        started = true;
        emitStatus('listening');
        return true;
    }

    function stop() {
        started = false;
        if (recorder && recorder.state !== 'inactive') {
            try { recorder.stop(); } catch (_) { }
        }
        recorder = null;
        if (socket && socket.readyState <= WebSocket.OPEN) {
            try { socket.close(); } catch (_) { }
        }
        socket = null;
        if (stream) {
            try { stream.getTracks().forEach((track) => track.stop()); } catch (_) { }
        }
        stream = null;
        emitStatus('off');
    }

    return {
        start,
        stop,
        isRunning() {
            return started;
        }
    };
}
