const BACKEND_BASE = (() => {
    try {
        const custom = window.localStorage?.getItem('blip_telegram_backend_url');
        if (custom) return custom.replace(/\/$/, '');
        return '/api/telegram';
    } catch (_) {
        return '/api/telegram';
    }
})();

let authStateListener = () => {};
let backendConfigured = false;
let hasBotToken = false;
let hasChatId = false;
let chatIdPreview = '';
let aliasNames = [];

function emitAuthState() {
    authStateListener(getTelegramAuthState());
}

async function fetchBackend(path = '', options = {}) {
    return fetch(`${BACKEND_BASE}${path}`, options);
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
        emitAuthState();
        return getTelegramAuthState();
    } catch (_) {
        backendConfigured = false;
        hasBotToken = false;
        hasChatId = false;
        chatIdPreview = '';
        aliasNames = [];
        emitAuthState();
        return getTelegramAuthState();
    }
}

function telegramConfigError(message = 'Telegram backend is not configured.') {
    const error = new Error(message);
    error.code = 'telegram_not_ready';
    return error;
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
        aliasNames: [...aliasNames]
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
            message = errorData?.error || errorData?.message || message;
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
            message = errorData?.error || errorData?.message || message;
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
            message = errorData?.error || errorData?.message || message;
        } catch (_) {}
        throw new Error(message);
    }
    return response.json();
}
