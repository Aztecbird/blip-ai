const CARE_CAM_API_BASE = '/api/care-cam';

function safeUrlWithQuery(url, params = {}) {
    const next = new URL(url, window.location.href);
    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        next.searchParams.set(key, String(value));
    });
    return next.toString();
}

async function requestJson(path, options = {}) {
    const response = await fetch(`${CARE_CAM_API_BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });
    const text = await response.text();
    let payload = {};
    try {
        payload = text ? JSON.parse(text) : {};
    } catch (_) {
        payload = { ok: false, message: text };
    }
    if (!response.ok) {
        const error = new Error(payload?.message || `Care Cam request failed (${response.status})`);
        error.status = response.status;
        error.payload = payload;
        throw error;
    }
    return payload;
}

export function buildCareCamViewerUrl(sessionId) {
    return safeUrlWithQuery(window.location.href, {
        carecam: 'viewer',
        session: sessionId
    });
}

export function getCareCamModeFromUrl() {
    const params = new URLSearchParams(window.location.search || '');
    const carecam = String(params.get('carecam') || '').toLowerCase();
    const sessionId = String(params.get('session') || '').trim();
    if (!sessionId) return { role: 'none', sessionId: '' };
    if (carecam === 'viewer') return { role: 'viewer', sessionId };
    if (carecam === 'host') return { role: 'host', sessionId };
    return { role: 'none', sessionId };
}

export async function createCareCamSession(label = 'Blip Care Cam') {
    return requestJson('/sessions', {
        method: 'POST',
        body: JSON.stringify({ label })
    });
}

export async function getCareCamSessionStatus(sessionId) {
    if (!sessionId) return { ok: false, message: 'Missing session id.' };
    return requestJson(`/sessions/${encodeURIComponent(sessionId)}`, { method: 'GET' });
}

export async function pushCareCamFrame(sessionId, frame = {}) {
    if (!sessionId) return { ok: false, message: 'Missing session id.' };
    return requestJson(`/sessions/${encodeURIComponent(sessionId)}/frame`, {
        method: 'POST',
        body: JSON.stringify(frame)
    });
}

export async function getCareCamFrame(sessionId) {
    if (!sessionId) return { ok: false, message: 'Missing session id.' };
    return requestJson(`/sessions/${encodeURIComponent(sessionId)}/frame`, { method: 'GET' });
}

export async function postCareCamCommand(sessionId, command = {}) {
    if (!sessionId) return { ok: false, message: 'Missing session id.' };
    return requestJson(`/sessions/${encodeURIComponent(sessionId)}/commands`, {
        method: 'POST',
        body: JSON.stringify(command)
    });
}

export async function getCareCamCommands(sessionId, after = 0) {
    if (!sessionId) return { ok: false, message: 'Missing session id.' };
    const qs = after ? `?after=${encodeURIComponent(String(after))}` : '';
    return requestJson(`/sessions/${encodeURIComponent(sessionId)}/commands${qs}`, { method: 'GET' });
}
