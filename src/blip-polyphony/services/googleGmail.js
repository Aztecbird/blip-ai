const BACKEND_BASE = (() => {
    try {
        const custom = window.localStorage?.getItem('blip_gmail_backend_url');
        if (custom) return custom.replace(/\/$/, '');
        return '/api/gmail';
    } catch (_) {
        return '/api/gmail';
    }
})();

let authStateListener = () => {};
let backendConfigured = false;
let backendConnected = false;
let connectedEmail = '';

function emitAuthState() {
    authStateListener(getGoogleGmailAuthState());
}

async function fetchBackend(path = '', options = {}) {
    return fetch(`${BACKEND_BASE}${path}`, options);
}

function getBackendOrigin() {
    try {
        return new URL(BACKEND_BASE, window.location.origin).origin;
    } catch (_) {
        return window.location.origin;
    }
}

function gmailAuthError(message = 'Google Gmail is not connected.') {
    const error = new Error(message);
    error.code = 'gmail_auth_required';
    return error;
}

async function refreshBackendStatus() {
    try {
        const response = await fetchBackend('/status', { cache: 'no-store' });
        if (!response.ok) throw new Error('Backend status unavailable.');
        const data = await response.json();
        backendConfigured = Boolean(data?.backendConfigured);
        backendConnected = Boolean(data?.connected);
        connectedEmail = String(data?.email || '').trim();
        emitAuthState();
        return data;
    } catch (_) {
        backendConfigured = false;
        backendConnected = false;
        connectedEmail = '';
        emitAuthState();
        return null;
    }
}

export async function initGoogleGmail() {
    await refreshBackendStatus();
    return getGoogleGmailAuthState();
}

export function onGoogleGmailAuthStateChange(listener) {
    authStateListener = typeof listener === 'function' ? listener : () => {};
    emitAuthState();
}

export function getGoogleGmailAuthState() {
    return {
        backendConfigured,
        connected: backendConnected,
        email: connectedEmail
    };
}

export async function connectGoogleGmail() {
    const backendStatus = await refreshBackendStatus();
    if (!backendStatus?.backendConfigured) {
        throw new Error('Start the Gmail backend first.');
    }

    const popup = window.open(
        `${BACKEND_BASE}/auth/start`,
        'blip-google-gmail-auth',
        'popup=yes,width=520,height=720,menubar=no,toolbar=no,status=no,resizable=yes,scrollbars=yes'
    );

    if (!popup) {
        throw new Error('Popup blocked. Allow popups and press Connect Gmail again.');
    }

    return new Promise((resolve, reject) => {
        const backendOrigin = getBackendOrigin();
        let settled = false;

        const cleanup = () => {
            window.removeEventListener('message', onMessage);
            clearInterval(pollTimer);
        };

        const finish = async (success, errorMessage) => {
            if (settled) return;
            settled = true;
            cleanup();
            await refreshBackendStatus();
            if (success && backendConnected) {
                resolve(getGoogleGmailAuthState());
                return;
            }
            reject(new Error(errorMessage || 'Google Gmail connection cancelled.'));
        };

        const onMessage = (event) => {
            if (event.origin !== backendOrigin) return;
            if (event.data?.type !== 'blip-google-gmail-auth') return;
            finish(Boolean(event.data?.success), event.data?.message);
        };

        const pollTimer = window.setInterval(() => {
            if (!popup || popup.closed) {
                finish(backendConnected, backendConnected ? '' : 'Google Gmail connection cancelled.');
            }
        }, 500);

        window.addEventListener('message', onMessage);
    });
}

export async function disconnectGoogleGmail() {
    const backendStatus = await refreshBackendStatus();
    if (!backendStatus?.backendConfigured) return;
    await fetchBackend('/disconnect', { method: 'POST' });
    backendConnected = false;
    connectedEmail = '';
    emitAuthState();
}

export async function getGoogleGmailProfile() {
    const backendStatus = await refreshBackendStatus();
    if (!backendStatus?.backendConfigured || !backendConnected) throw gmailAuthError();

    const response = await fetchBackend('/profile', { cache: 'no-store' });
    if (response.status === 401 || response.status === 403) {
        backendConnected = false;
        connectedEmail = '';
        emitAuthState();
        throw gmailAuthError('Google Gmail session expired.');
    }
    if (!response.ok) {
        let message = 'Could not load Gmail profile.';
        try {
            const errorData = await response.json();
            message = errorData?.error || errorData?.message || message;
        } catch (_) {}
        throw new Error(message);
    }
    const data = await response.json();
    connectedEmail = String(data?.email || '').trim();
    emitAuthState();
    return data;
}

export async function listGoogleGmailMessages(options = {}) {
    const backendStatus = await refreshBackendStatus();
    if (!backendStatus?.backendConfigured || !backendConnected) throw gmailAuthError();

    const params = new URLSearchParams({
        maxResults: String(Math.max(1, Math.min(50, Number(options.maxResults) || 12)))
    });
    if (options.q) params.set('q', String(options.q).trim());
    if (Array.isArray(options.labelIds)) {
        options.labelIds.filter(Boolean).forEach((labelId) => params.append('labelIds', String(labelId)));
    }

    const response = await fetchBackend(`/messages?${params.toString()}`, { cache: 'no-store' });
    if (response.status === 401 || response.status === 403) {
        backendConnected = false;
        connectedEmail = '';
        emitAuthState();
        throw gmailAuthError('Google Gmail session expired.');
    }
    if (!response.ok) {
        let message = 'Could not load Gmail messages.';
        try {
            const errorData = await response.json();
            message = errorData?.error || errorData?.message || message;
        } catch (_) {}
        throw new Error(message);
    }
    const data = await response.json();
    return Array.isArray(data?.messages) ? data.messages : [];
}

export async function getGoogleGmailMessage(messageId) {
    const normalizedId = String(messageId || '').trim();
    if (!normalizedId) throw new Error('Missing Gmail message id.');
    const backendStatus = await refreshBackendStatus();
    if (!backendStatus?.backendConfigured || !backendConnected) throw gmailAuthError();

    const response = await fetchBackend(`/messages/${encodeURIComponent(normalizedId)}`, { cache: 'no-store' });
    if (response.status === 401 || response.status === 403) {
        backendConnected = false;
        connectedEmail = '';
        emitAuthState();
        throw gmailAuthError('Google Gmail session expired.');
    }
    if (!response.ok) {
        let message = 'Could not load Gmail message.';
        try {
            const errorData = await response.json();
            message = errorData?.error || errorData?.message || message;
        } catch (_) {}
        throw new Error(message);
    }
    const data = await response.json();
    return data?.message || null;
}

export async function sendGoogleGmailMessage(details = {}) {
    const backendStatus = await refreshBackendStatus();
    if (!backendStatus?.backendConfigured || !backendConnected) throw gmailAuthError();

    const response = await fetchBackend('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            to: String(details.to || '').trim(),
            cc: String(details.cc || '').trim(),
            bcc: String(details.bcc || '').trim(),
            subject: String(details.subject || '').trim(),
            text: String(details.text || '').trim(),
            html: String(details.html || '').trim(),
            attachments: Array.isArray(details.attachments) ? details.attachments : []
        })
    });

    if (response.status === 401 || response.status === 403) {
        backendConnected = false;
        connectedEmail = '';
        emitAuthState();
        throw gmailAuthError('Google Gmail session expired.');
    }
    if (!response.ok) {
        let message = 'Could not send Gmail message.';
        try {
            const errorData = await response.json();
            message = errorData?.error || errorData?.message || message;
        } catch (_) {}
        throw new Error(message);
    }
    return response.json();
}
