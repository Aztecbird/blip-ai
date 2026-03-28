const HUB_API_BASE = '/api/hub';
const LEGACY_STORAGE_KEY = 'blip_hub';
const STORAGE_KEY = 'blip_student_desk';
const MAX_ITEMS = 50;

function hasLocalStorage() {
    return typeof localStorage !== 'undefined';
}

export function normalizeStudentDeskItem(item = {}, index = 0) {
    const safe = item && typeof item === 'object' ? item : {};
    const content = String(safe.content || '').trim();
    const data = safe.data && typeof safe.data === 'object' && !Array.isArray(safe.data) ? safe.data : {};
    return {
        id: String(safe.id || `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`),
        type: String(safe.type || 'note').trim() || 'note',
        content,
        data,
        timestamp: String(safe.timestamp || '').trim() || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
}

export function normalizeStudentDeskItems(items = []) {
    if (!Array.isArray(items)) return [];
    return items
        .filter((item) => item && typeof item === 'object')
        .map((item, index) => normalizeStudentDeskItem(item, index))
        .filter((item) => item.content || item.data?.url)
        .slice(0, MAX_ITEMS);
}

export function readStudentDeskFallbackItems() {
    if (!hasLocalStorage()) return [];
    try {
        const primary = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '[]');
        const items = Array.isArray(primary) && primary.length ? primary : legacy;
        return normalizeStudentDeskItems(items);
    } catch (_) {
        return [];
    }
}

export function writeStudentDeskFallbackItems(items = []) {
    if (!hasLocalStorage()) return [];
    const normalized = normalizeStudentDeskItems(items);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (_) { }
    return normalized;
}

async function readJson(response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch (_) {
        return {};
    }
}

async function requestHub(path, options = {}) {
    const response = await fetch(`${HUB_API_BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });
    const payload = await readJson(response);
    if (!response.ok || payload?.ok === false) {
        const message = payload?.message || response.statusText || 'Hub request failed.';
        throw new Error(message);
    }
    return payload;
}

export async function loadStudentDeskBackendItems() {
    try {
        const payload = await requestHub('/items', { method: 'GET' });
        return normalizeStudentDeskItems(payload.items || []);
    } catch (error) {
        throw error;
    }
}

export async function loadStudentDeskItems() {
    try {
        return await loadStudentDeskBackendItems();
    } catch (_) {
        return readStudentDeskFallbackItems();
    }
}

export async function syncStudentDeskItems(items = []) {
    const normalized = normalizeStudentDeskItems(items);
    try {
        const payload = await requestHub('/import', {
            method: 'POST',
            body: JSON.stringify({ items: normalized })
        });
        writeStudentDeskFallbackItems(payload.items || normalized);
        return normalizeStudentDeskItems(payload.items || normalized);
    } catch (_) {
        return writeStudentDeskFallbackItems(normalized);
    }
}

export async function addStudentDeskItem(item = {}) {
    const normalized = normalizeStudentDeskItem(item);
    try {
        const payload = await requestHub('/items', {
            method: 'POST',
            body: JSON.stringify(normalized)
        });
        const saved = normalizeStudentDeskItem(payload.item || normalized);
        const existing = readStudentDeskFallbackItems();
        const next = [saved, ...existing.filter((entry) => String(entry?.id) !== String(saved.id))].slice(0, MAX_ITEMS);
        writeStudentDeskFallbackItems(next);
        return saved;
    } catch (_) {
        const existing = readStudentDeskFallbackItems();
        const next = [normalized, ...existing.filter((entry) => String(entry?.id) !== String(normalized.id))].slice(0, MAX_ITEMS);
        writeStudentDeskFallbackItems(next);
        return normalized;
    }
}

export async function removeStudentDeskItem(itemId = '') {
    const id = String(itemId || '').trim();
    if (!id) return false;
    try {
        await requestHub(`/items/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (_) { }
    const remaining = readStudentDeskFallbackItems().filter((item) => String(item?.id) !== id);
    writeStudentDeskFallbackItems(remaining);
    return true;
}

export async function clearStudentDeskItems() {
    try {
        await requestHub('/clear', { method: 'POST', body: '{}' });
    } catch (_) { }
    writeStudentDeskFallbackItems([]);
    return true;
}
