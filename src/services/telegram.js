function readBackendBaseFromStorage() {
    try {
        const custom = window.localStorage?.getItem('blip_telegram_backend_url');
        if (custom) return custom.replace(/\/$/, '');
        const port = String(window.localStorage?.getItem('blip_telegram_backend_port') || '').trim();
        if (/^\d{1,5}$/.test(port)) return `http://127.0.0.1:${port}/api/telegram`;
        return '/api/telegram';
    } catch (_) {
        return '/api/telegram';
    }
}

let backendBase = readBackendBaseFromStorage();

let authStateListener = () => {};
let backendConfigured = false;
let hasBotToken = false;
let hasChatId = false;
let chatIdPreview = '';
let aliasNames = [];
let configuredPort = '';

function emitAuthState() {
    authStateListener(getTelegramAuthState());
}

async function fetchBackend(path = '', options = {}) {
    return fetch(`${backendBase}${path}`, options);
}

function inferPortFromBackendBase(value = '') {
    const src = String(value || '').trim();
    if (!src) return '';
    const match = src.match(/:(\d+)(?:\/|$)/);
    return match?.[1] || '';
}

function normalizeBackendPort(value = '') {
    const n = Number(String(value || '').trim());
    if (!Number.isFinite(n)) return '';
    const int = Math.trunc(n);
    if (int < 1 || int > 65535) return '';
    return String(int);
}

function setBackendBaseFromPort(port = '') {
    const normalizedPort = normalizeBackendPort(port);
    if (!normalizedPort) return;
    backendBase = `http://127.0.0.1:${normalizedPort}/api/telegram`;
    configuredPort = normalizedPort;
    try {
        window.localStorage?.setItem('blip_telegram_backend_url', backendBase);
        window.localStorage?.setItem('blip_telegram_backend_port', normalizedPort);
    } catch (_) {}
}

async function refreshBackendStatus() {
    try {
        const response = await fetchBackend('/status', { cache: 'no-store' });
        if (!response.ok) throw new Error('Telegram backend status unavailable.');
        const data = await response.json();
        backendConfigured = Boolean(data?.backendConfigured);
        hasBotToken = Boolean(data?.hasBotToken);
        hasChatId = Boolean(data?.hasChatId);
        chatIdPreview = String(data?.chatIdPreview || '').trim();
        aliasNames = Array.isArray(data?.aliasNames)
            ? data.aliasNames.map((value) => String(value || '').trim()).filter(Boolean)
            : [];
        configuredPort = String(data?.backendPort || inferPortFromBackendBase(backendBase) || '').trim();
        emitAuthState();
        return getTelegramAuthState();
    } catch (_) {
        backendConfigured = false;
        hasBotToken = false;
        hasChatId = false;
        chatIdPreview = '';
        aliasNames = [];
        configuredPort = String(inferPortFromBackendBase(backendBase) || '').trim();
        emitAuthState();
        return getTelegramAuthState();
    }
}

function telegramConfigError(message = 'Telegram backend is not configured.') {
    const error = new Error(message);
    error.code = 'telegram_not_ready';
    return error;
}

function buildTelegramRequestError(errorData = {}, fallbackMessage = 'Could not send Telegram message.') {
    const raw = String(errorData?.error || errorData?.message || fallbackMessage).trim();
    if (!/chat not found/i.test(raw)) return raw || fallbackMessage;
    return 'Telegram chat not found. In Settings, set a valid numeric chat id (or valid alias mapping), then tap Apply. Also make sure that chat has started your bot with /start.';
}

export async function initTelegram() {
    await refreshBackendStatus();
    return getTelegramAuthState();
}

export function onTelegramAuthStateChange(listener) {
    authStateListener = typeof listener === 'function' ? listener : () => {};
    emitAuthState();
}

export function getTelegramAuthState() {
    return {
        backendConfigured,
        hasBotToken,
        hasChatId,
        chatIdPreview,
        aliasNames: [...aliasNames],
        backendPort: configuredPort || inferPortFromBackendBase(backendBase) || '',
        backendBase
    };
}

export async function sendTelegramMessage(details = {}) {
    const authState = await refreshBackendStatus();
    if (!authState.backendConfigured) {
        throw telegramConfigError('Start the Telegram backend first.');
    }

    const response = await fetchBackend('/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chatId: String(details.chatId || '').trim(),
            text: String(details.text || '').trim()
        })
    });

    if (!response.ok) {
        let message = 'Could not send Telegram message.';
        try {
            const errorData = await response.json();
            message = buildTelegramRequestError(errorData, message);
        } catch (_) {}
        throw new Error(message);
    }

    return response.json();
}

export async function sendTelegramPhoto(details = {}) {
    const authState = await refreshBackendStatus();
    if (!authState.backendConfigured) {
        throw telegramConfigError('Start the Telegram backend first.');
    }

    const response = await fetchBackend('/send-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chatId: String(details.chatId || '').trim(),
            caption: String(details.caption || '').trim(),
            photoUrl: String(details.photoUrl || '').trim(),
            photoBase64: String(details.photoBase64 || '').trim(),
            filename: String(details.filename || '').trim()
        })
    });

    if (!response.ok) {
        let message = 'Could not send Telegram photo.';
        try {
            const errorData = await response.json();
            message = buildTelegramRequestError(errorData, message);
        } catch (_) {}
        throw new Error(message);
    }

    return response.json();
}

export async function sendTelegramVideo(details = {}) {
    const authState = await refreshBackendStatus();
    if (!authState.backendConfigured) {
        throw telegramConfigError('Start the Telegram backend first.');
    }

    const response = await fetchBackend('/send-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chatId: String(details.chatId || '').trim(),
            caption: String(details.caption || '').trim(),
            videoUrl: String(details.videoUrl || '').trim(),
            videoBase64: String(details.videoBase64 || '').trim(),
            filename: String(details.filename || '').trim()
        })
    });

    if (!response.ok) {
        let message = 'Could not send Telegram video.';
        try {
            const errorData = await response.json();
            message = buildTelegramRequestError(errorData, message);
        } catch (_) {}
        throw new Error(message);
    }

    return response.json();
}

export async function sendTelegramTest() {
    const authState = await refreshBackendStatus();
    if (!authState.backendConfigured) {
        throw telegramConfigError('Start the Telegram backend first.');
    }

    const response = await fetchBackend('/send-test', { method: 'POST' });
    if (!response.ok) {
        let message = 'Could not send Telegram test.';
        try {
            const errorData = await response.json();
            message = buildTelegramRequestError(errorData, message);
        } catch (_) {}
        throw new Error(message);
    }
    return response.json();
}

export function getTelegramBackendConfig() {
    let storedPort = '';
    let storedBotToken = '';
    let storedChatId = '';
    let storedChatAliases = '';
    try {
        storedPort = String(window.localStorage?.getItem('blip_telegram_backend_port') || '').trim();
        window.localStorage?.removeItem('blip_telegram_bot_token');
        storedChatId = String(window.localStorage?.getItem('blip_telegram_chat_id') || '').trim();
        storedChatAliases = String(window.localStorage?.getItem('blip_telegram_chat_aliases') || '').trim();
    } catch (_) {
        storedPort = '';
        storedBotToken = '';
        storedChatId = '';
        storedChatAliases = '';
    }
    const currentPort = String(
        storedPort
        || inferPortFromBackendBase(backendBase)
        || '8789'
    ).trim();
    return {
        botToken: storedBotToken,
        chatId: storedChatId,
        chatAliases: storedChatAliases,
        backendPort: currentPort || '8789'
    };
}

export async function saveTelegramBackendConfig(config = {}) {
    const next = {
        botToken: String(config.botToken || '').trim(),
        chatId: String(config.chatId || '').trim(),
        chatAliases: String(config.chatAliases || '').trim(),
        backendPort: normalizeBackendPort(config.backendPort) || '8789'
    };

    try {
        window.localStorage?.removeItem('blip_telegram_bot_token');
        window.localStorage?.setItem('blip_telegram_chat_id', next.chatId);
        window.localStorage?.setItem('blip_telegram_chat_aliases', next.chatAliases);
        window.localStorage?.setItem('blip_telegram_backend_port', next.backendPort);
    } catch (_) {}

    // Keep the frontend target URL in sync with chosen port.
    setBackendBaseFromPort(next.backendPort);

    let configuredViaBackend = false;
    try {
        const response = await fetchBackend('/configure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                botToken: next.botToken,
                chatId: next.chatId,
                chatAliases: next.chatAliases
            })
        });
        configuredViaBackend = response.ok;
    } catch (_) {
        configuredViaBackend = false;
    }

    const authState = await refreshBackendStatus();
    return {
        ok: authState.backendConfigured,
        configuredViaBackend,
        authState
    };
}
