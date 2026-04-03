function normalize(value = '') {
    return String(value || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const SNAPSHOT_RE = /^(?:please\s+)?(?:take|grab|capture)\s+(?:a\s+)?(?:snapshot|frame|screenshot|screen(?:\s+shot)?)$/;
const ANALYZE_RE = /^(?:please\s+)?(?:analy[sz]e|inspect|describe)\s+(?:this|the|current)?\s*(?:frame|image|screen|snapshot)?$/;
const WHAT_SEE_RE = /^(?:please\s+)?(?:what\s+do\s+you\s+see|what\s+is\s+in\s+(?:this|the)\s+(?:image|frame|screen)|look\s+at\s+this(?:\s+and\s+tell\s+me\s+what\s+s?\s+there)?)$/;
const READ_RE = /^(?:please\s+)?(?:read|read\s+the)\s+(?:text|screen|words?)$/;
const YOUTUBE_PICTURE_RE = /\b(?:take|capture|grab|inspect|analy[sz]e|describe|report)\b[\s\w]{0,40}\b(?:picture|photo|image|snapshot|frame)\b[\s\w]{0,40}\b(?:youtube|video|screen)\b/;
const ZOOM_IN_RE = /^(?:please\s+)?(?:zoom\s+in(?:\s+(?:on|to)(?:\s+the)?)?\s*(?:snapshot|image|picture|photo|frame)?|enlarge\s+(?:snapshot|image|picture|photo|frame)|make\s+(?:the\s+)?(?:snapshot|image|picture|photo)\s+bigger)$/;
const ZOOM_OUT_RE = /^(?:please\s+)?(?:zoom\s+out(?:\s+(?:from|on)(?:\s+the)?)?\s*(?:snapshot|image|picture|photo|frame)?|shrink\s+(?:snapshot|image|picture|photo|frame)|make\s+(?:the\s+)?(?:snapshot|image|picture|photo)\s+smaller)$/;
const ZOOM_RESET_RE = /^(?:please\s+)?(?:reset\s+(?:snapshot\s+)?zoom|reset\s+zoom|normal\s+snapshot)$/;
const PAN_LEFT_RE = /^(?:please\s+)?(?:move|pan)\s+(?:snapshot\s+)?left$/;
const PAN_RIGHT_RE = /^(?:please\s+)?(?:move|pan)\s+(?:snapshot\s+)?right$/;
const PAN_UP_RE = /^(?:please\s+)?(?:move|pan)\s+(?:snapshot\s+)?up$/;
const PAN_DOWN_RE = /^(?:please\s+)?(?:move|pan)\s+(?:snapshot\s+)?down$/;
const ANALYZE_ZOOM_RE = /^(?:please\s+)?(?:analy[sz]e|inspect|describe|read)\s+(?:this\s+)?zoomed\s+(?:area|frame|image|screen)$/;

export function isYouTubeSnapshotIntent(command = '') {
    const lower = normalize(command);
    if (!lower) return false;
    if (YOUTUBE_PICTURE_RE.test(lower)) return true;
    if (SNAPSHOT_RE.test(lower)) return true;
    if (ANALYZE_RE.test(lower)) return true;
    if (WHAT_SEE_RE.test(lower)) return true;
    if (READ_RE.test(lower)) return true;
    return false;
}

export function isYouTubeSnapshotCaptureIntent(command = '') {
    const lower = normalize(command);
    if (!lower) return false;
    return SNAPSHOT_RE.test(lower) || YOUTUBE_PICTURE_RE.test(lower);
}

export function buildYouTubeSnapshotQuestion(command = '') {
    const lower = normalize(command);
    if (!lower || SNAPSHOT_RE.test(lower)) return 'Describe what is visible in this frame.';
    if (READ_RE.test(lower)) return 'Read any visible text on this screen. If unreadable, say so.';
    return String(command || '').trim() || 'Describe what is visible in this frame.';
}

export function parseYouTubeSnapshotZoomCommand(command = '') {
    const lower = normalize(command);
    if (!lower) return null;
    if (ZOOM_IN_RE.test(lower)) return { action: 'zoomIn' };
    if (ZOOM_OUT_RE.test(lower)) return { action: 'zoomOut' };
    if (ZOOM_RESET_RE.test(lower)) return { action: 'zoomReset' };
    if (PAN_LEFT_RE.test(lower)) return { action: 'panLeft' };
    if (PAN_RIGHT_RE.test(lower)) return { action: 'panRight' };
    if (PAN_UP_RE.test(lower)) return { action: 'panUp' };
    if (PAN_DOWN_RE.test(lower)) return { action: 'panDown' };
    if (ANALYZE_ZOOM_RE.test(lower)) return { action: 'analyzeZoom' };
    return null;
}
