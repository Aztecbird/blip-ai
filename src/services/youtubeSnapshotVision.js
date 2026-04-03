export function captureCurrentYouTubeFrame(options = {}) {
    const doc = options.documentRef || globalThis.document;
    if (!doc?.getElementById) {
        return { ok: false, code: 'capture_unavailable', message: 'Frame capture is unavailable in this context.' };
    }

    const host = doc.getElementById(options.hostId || 'blip-yt-player');
    if (!host) return { ok: false, code: 'no_video', message: 'No YouTube video host found.' };

    const videoEl = host.querySelector?.('video');
    if (!videoEl) {
        if (host.querySelector?.('iframe')) {
            return {
                ok: false,
                code: 'cross_origin_blocked',
                message: 'I cannot inspect this YouTube frame because browser security blocks frame capture from embedded video.'
            };
        }
        return { ok: false, code: 'no_video', message: 'No playable video element found.' };
    }

    const width = Number(videoEl.videoWidth || 0);
    const height = Number(videoEl.videoHeight || 0);
    if (!width || !height) {
        return { ok: false, code: 'no_video', message: 'Video is not ready for capture yet.' };
    }

    const canvas = doc.createElement?.('canvas');
    if (!canvas?.getContext) {
        return { ok: false, code: 'capture_unavailable', message: 'Canvas capture is unavailable.' };
    }
    canvas.width = width;
    canvas.height = height;

    try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return { ok: false, code: 'capture_unavailable', message: 'Canvas context is unavailable.' };
        ctx.drawImage(videoEl, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        if (!dataUrl || !dataUrl.startsWith('data:image/')) {
            return { ok: false, code: 'invalid_image', message: 'Captured frame is invalid.' };
        }
        const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '').trim();
        if (!base64) return { ok: false, code: 'invalid_image', message: 'Captured frame was empty.' };
        return { ok: true, image: { data: base64, mimeType: 'image/jpeg' } };
    } catch (error) {
        const message = String(error?.message || '').toLowerCase();
        if (error?.name === 'SecurityError' || message.includes('tainted')) {
            return {
                ok: false,
                code: 'cross_origin_blocked',
                message: 'I cannot inspect this YouTube frame because browser security blocks frame capture from embedded video.'
            };
        }
        return { ok: false, code: 'capture_failed', message: 'I could not capture the current frame.' };
    }
}

export async function analyzeYouTubeSnapshot(options = {}) {
    const image = options.image || null;
    const question = String(options.question || 'Describe what is visible in this frame.').trim();
    const apiKey = String(options.apiKey || '').trim();
    const model = String(options.model || '').trim();
    const askFn = options.askFn || (await import('./geminiText.js')).askGemini;

    if (!image?.data) {
        throw new Error('No frame image available.');
    }
    if (!apiKey) {
        throw new Error('Vision model unavailable. Add your API key in Settings.');
    }

    const prompt = [
        'Analyze this single video frame and answer the user question.',
        'Rules:',
        '- Only describe visible evidence.',
        '- Do not guess details that are not visible.',
        '- If text is too small or unclear, explicitly say it is unreadable.',
        '- If the frame is unclear, say you are uncertain.',
        '- Keep the answer short and voice-friendly (1-2 sentences max).',
        '',
        `User question: ${question}`
    ].join('\n');

    const result = await askFn(
        prompt,
        [],
        [{ data: String(image.data || ''), mimeType: String(image.mimeType || 'image/jpeg') }],
        apiKey,
        model
    );

    const text = String(result?.text || '').trim();
    return text || 'I can see the frame, but it is not clear enough to answer confidently.';
}

export function createSnapshotViewState(prev = {}) {
    return {
        zoom: Number(prev?.zoom) > 1 ? Number(prev.zoom) : 1,
        panX: Number.isFinite(Number(prev?.panX)) ? Math.max(-1, Math.min(1, Number(prev.panX))) : 0,
        panY: Number.isFinite(Number(prev?.panY)) ? Math.max(-1, Math.min(1, Number(prev.panY))) : 0,
    };
}

export function updateSnapshotViewState(prev = {}, action = '') {
    const next = createSnapshotViewState(prev);
    const panStep = Math.max(0.06, 0.18 / next.zoom);
    if (action === 'zoomIn') next.zoom = Math.min(5, Number((next.zoom * 1.35).toFixed(3)));
    if (action === 'zoomOut') next.zoom = Math.max(1, Number((next.zoom / 1.35).toFixed(3)));
    if (action === 'zoomReset') {
        next.zoom = 1;
        next.panX = 0;
        next.panY = 0;
    }
    if (action === 'panLeft') next.panX = Math.max(-1, Number((next.panX - panStep).toFixed(3)));
    if (action === 'panRight') next.panX = Math.min(1, Number((next.panX + panStep).toFixed(3)));
    if (action === 'panUp') next.panY = Math.max(-1, Number((next.panY - panStep).toFixed(3)));
    if (action === 'panDown') next.panY = Math.min(1, Number((next.panY + panStep).toFixed(3)));
    return next;
}

export async function buildSnapshotViewImage(image = {}, view = {}, options = {}) {
    const data = String(image?.data || '').trim();
    if (!data) return null;
    const state = createSnapshotViewState(view);
    if (state.zoom <= 1.0001 && Math.abs(state.panX) < 0.001 && Math.abs(state.panY) < 0.001) {
        return { data, mimeType: String(image?.mimeType || 'image/jpeg') };
    }

    const doc = options.documentRef || globalThis.document;
    if (!doc?.createElement) return { data, mimeType: String(image?.mimeType || 'image/jpeg') };

    const inputDataUrl = `data:${String(image?.mimeType || 'image/jpeg')};base64,${data}`;
    const img = new Image();
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = inputDataUrl;
    });

    const w = Number(img.naturalWidth || img.width || 0);
    const h = Number(img.naturalHeight || img.height || 0);
    if (!w || !h) return { data, mimeType: String(image?.mimeType || 'image/jpeg') };

    const srcW = Math.max(1, w / state.zoom);
    const srcH = Math.max(1, h / state.zoom);
    const maxDx = (w - srcW) / 2;
    const maxDy = (h - srcH) / 2;
    const centerX = (w / 2) + (state.panX * maxDx);
    const centerY = (h / 2) + (state.panY * maxDy);
    const sx = Math.max(0, Math.min(w - srcW, centerX - (srcW / 2)));
    const sy = Math.max(0, Math.min(h - srcH, centerY - (srcH / 2)));

    const canvas = doc.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { data, mimeType: String(image?.mimeType || 'image/jpeg') };
    ctx.drawImage(img, sx, sy, srcW, srcH, 0, 0, w, h);
    const out = canvas.toDataURL('image/jpeg', 0.92).replace(/^data:image\/jpeg;base64,/, '').trim();
    return { data: out || data, mimeType: 'image/jpeg' };
}
