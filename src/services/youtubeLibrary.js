export const DEFAULT_VIDEO_PLAYLIST = 'Favorites';
export const WATCH_LATER_PLAYLIST = 'Watch Later';
export const SUGGESTED_VIDEO_CATEGORIES = ['Watch Later', 'Favorites', 'Music', 'Videos', 'Chill', 'Workout', 'Learn'];

function sanitizePlaylistVoiceQuery(text = '') {
    return String(text || '')
        .replace(/^(?:hey\s+)?blip\s+/i, '')
        .replace(/^[\s:,\-]+/, '')
        .replace(/[\s.,!?]+$/, '')
        .trim();
}

function normalizeVoiceTokens(text = '') {
    return String(text || '')
        .toLowerCase()
        .replace(/[“”]/g, '"')
        .replace(/[’]/g, "'")
        .replace(/[^\w\s%'-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function normalizeVideoPlaylistName(name = '') {
    const cleaned = sanitizePlaylistVoiceQuery(String(name || '')
        .replace(/^(?:my\s+)?playlist(?:\s+called|\s+named)?\s+/i, '')
        .replace(/^(?:called|named)\s+/i, '')
        .replace(/\b(?:and|then)\s+(?:save|store|keep|add|put)\b[\s\S]*$/i, '')
        .replace(/\b(?:and|then)\s+(?:play|open|watch)\b[\s\S]*$/i, '')
        .replace(/\b(?:please|thanks|thank\s+you)\b/gi, '')
    ).replace(/\s+/g, ' ').trim();
    if (!cleaned) return DEFAULT_VIDEO_PLAYLIST;
    return cleaned
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
        .slice(0, 48) || DEFAULT_VIDEO_PLAYLIST;
}

export function resolveVideoPlaylistFromVoice(lower = '') {
    const normalized = normalizeVoiceTokens(lower);
    if (/\b(?:watch\s+later|for\s+later|save\s+for\s+later|add\s+to\s+watch\s+later|save\s+to\s+watch\s+later|later\s+list)\b/.test(normalized)) return WATCH_LATER_PLAYLIST;
    if (/\bfavorites?\b/.test(normalized)) return DEFAULT_VIDEO_PLAYLIST;
    if (/\b(?:music|my\s+music|music\s+list)\b/.test(normalized)) return 'Music';
    if (/\b(?:to|in)\s+(?:my\s+)?videos?\b/.test(normalized) || /\b(?:my\s+videos|videos?\s+list)\b/.test(normalized)) return 'Videos';
    if (/\b(?:chill|chill\s+list|relax)\b/.test(normalized)) return 'Chill';
    if (/\b(?:workout|gym|exercise)\b/.test(normalized)) return 'Workout';
    if (/\b(?:learn|learning|education)\b/.test(normalized)) return 'Learn';
    return null;
}

export function resolveYouTubeLibraryViewFromVoice(text = '') {
    const normalized = normalizeVoiceTokens(text);
    const libraryPrefixRe = /^(?:hey\s+blip\s+)?(?:(?:please|can|could|would|will)\s+you\s+)?(?:please\s+)?(?:(?:open|show|display|browse|view|pull\s+up|bring\s+up)|(?:switch|change|set|move|go)(?:\s+to)?)\s+/;
    const hasLibraryIntent = libraryPrefixRe.test(normalized);
    const target = hasLibraryIntent
        ? normalized
            .replace(libraryPrefixRe, '')
            .replace(/^(?:the\s+)?/, '')
            .replace(/(?:\s+please)?$/, '')
            .trim()
        : normalized;

    if (/^(?:(?:youtube\s+)?music|(?:menu|library|list)(?:\s+of)?\s+(?:youtube\s+)?music|(?:youtube\s+)?music\s+(?:menu|library|list)|youtube\s+music\s+menu)$/.test(target)) {
        return 'Music';
    }
    if (/^(?:(?:youtube\s+)?videos?|(?:menu|library|list)(?:\s+of)?\s+(?:youtube\s+)?videos?|(?:youtube\s+)?videos?\s+(?:menu|library|list)|youtube\s+videos?\s+menu)$/.test(target)) {
        return 'Videos';
    }
    if (/^(?:(?:youtube\s+)?music)\s+to\s+(?:youtube\s+)?videos?$/.test(target)) {
        return 'Videos';
    }
    if (/^(?:(?:youtube\s+)?videos?)\s+to\s+(?:youtube\s+)?music$/.test(target)) {
        return 'Music';
    }
    if (hasLibraryIntent) {
        if (/^(?:(?:my\s+)?saved\s+(?:youtube\s+)?music|(?:youtube\s+)?music\s+that\s+you\s+(?:saved?|save|store|keep)(?:\s+from\s+youtube)?|(?:music|songs?)\s+that\s+you\s+(?:saved?|save|store|keep)(?:\s+from\s+youtube)?)$/.test(target)) {
            return 'Music';
        }
        if (/^(?:(?:my\s+)?saved\s+(?:youtube\s+)?videos?|(?:youtube\s+)?videos?\s+that\s+you\s+(?:saved?|save|store|keep)(?:\s+from\s+youtube)?|videos?\s+that\s+you\s+(?:saved?|save|store|keep)(?:\s+from\s+youtube)?)$/.test(target)) {
            return 'Videos';
        }
    }
    return null;
}

export function extractYouTubeLibraryDeleteTargetFromVoice(text = '') {
    const normalized = normalizeVoiceTokens(text);
    const deletePrefixRe = /^(?:hey\s+blip\s+)?(?:(?:please|can|could|would|will)\s+you\s+)?(?:please\s+)?(?:delete|remove|erase|trash)\s+/;
    if (!deletePrefixRe.test(normalized)) return null;

    const target = normalized
        .replace(deletePrefixRe, '')
        .replace(/^(?:the\s+)?(?:music|videos?|library)\s+/, '')
        .replace(/^(?:the\s+)?(?:saved\s+)?(?:youtube\s+)?(?:song|songs|video|videos|track|tracks|title|item)\s+/, '')
        .replace(/^(?:called|named|titled)\s+/, '')
        .replace(/^(?:song|video|track|item)\s+(?:called|named|titled)\s+/, '')
        .replace(/\b(?:from|in)\s+(?:my\s+)?(?:youtube\s+)?(?:music|videos?|library)\b[\s\S]*$/, '')
        .replace(/(?:\s+please)?$/, '')
        .trim();

    if (!target) return null;
    if (/^(?:number\s+)?\d{1,3}$/.test(target)) return null;
    if (/^(?:music|videos?|library|playlist|it|this|that)$/.test(target)) return null;
    return target;
}

export function extractYouTubeLibraryPlayTargetFromVoice(text = '') {
    const normalized = normalizeVoiceTokens(text);
    const playPrefixRe = /^(?:hey\s+blip\s+)?(?:(?:please|can|could|would|will)\s+you\s+)?(?:please\s+)?(?:play|open|show|watch)\s+/;
    if (!playPrefixRe.test(normalized)) return null;

    const target = normalized
        .replace(playPrefixRe, '')
        .replace(/(?:\s+please)?$/, '')
        .trim();

    if (!target) return null;
    if (/^(?:this|that|it|current|current one|this one|that one)$/.test(target)) {
        return { mode: 'current', title: '', view: null };
    }

    const view = /\b(?:song|track|music)\b/.test(target)
        ? 'Music'
        : /\bvideo\b/.test(target)
            ? 'Videos'
            : null;

    const cleaned = target
        .replace(/^(?:me\s+)?/, '')
        .replace(/^(?:a|an|the|my)\s+/, '')
        .replace(/^(?:saved\s+)?(?:youtube\s+)?(?:song|track|music|video)\s+/, '')
        .replace(/^(?:called|named|titled)\s+/, '')
        .replace(/^(?:song|track|music|video)\s+(?:called|named|titled)\s+/, '')
        .trim();

    if (!cleaned || cleaned === target || /^(?:music|videos?|library|playlist)$/.test(cleaned)) return null;
    return { mode: 'title', title: cleaned, view };
}

export function extractYouTubeLibraryTransferRequestFromVoice(text = '') {
    const normalized = normalizeVoiceTokens(text);
    if (!normalized) return null;
    if (!/\b(?:move|put|switch|transfer|change|should\s+be|belongs?\s+(?:to|in))\b/.test(normalized)) return null;

    const targetMatch = normalized.match(/\b(?:to|in)\s+(?:my\s+)?(watch\s+later|favorites?|music|videos?)\b(?!.*\b(?:to|in)\s+(?:my\s+)?(?:watch\s+later|favorites?|music|videos?)\b)/);
    if (!targetMatch) return null;
    const targetView = resolveVideoPlaylistFromVoice(targetMatch[0]);
    if (!targetView) return null;

    const titlePart = normalized
        .replace(/^(?:hey\s+blip\s+)?(?:(?:please|can|could|would|will)\s+you\s+)?(?:please\s+)?/, '')
        .replace(/\b(?:should\s+be|belongs?\s+(?:to|in))\s+(?:my\s+)?(?:watch\s+later|favorites?|music|videos?)\b[\s\S]*$/, '')
        .replace(/\b(?:move|put|switch|transfer|change)\b\s+/, '')
        .replace(/\b(?:to|in)\s+(?:my\s+)?(?:watch\s+later|favorites?|music|videos?)\b[\s\S]*$/, '')
        .replace(/^(?:the\s+)?(?:saved\s+)?(?:youtube\s+)?/, '')
        .trim();

    if (!titlePart) return null;

    const sourceView = /\b(?:song|track|music)\b/.test(titlePart)
        ? 'Music'
        : /\bvideos?\b/.test(titlePart)
            ? 'Videos'
            : null;

    const numberMatch = titlePart.match(/^(?:the\s+)?(?:saved\s+)?(?:youtube\s+)?(?:song|track|video|item|number|tag)\s+(?:number\s+|tag\s+)?(\d{1,3}|one|two|to|too|three|four|for|five|six|seven|eight|nine|ten|eleven|twelve)\b/);
    if (numberMatch) {
        const wordToNum = {
            one: 1, two: 2, to: 2, too: 2, three: 3, four: 4, for: 4, five: 5, six: 6,
            seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12
        };
        const raw = numberMatch[1];
        const index = /^\d+$/.test(raw) ? Number(raw) : (wordToNum[raw] || NaN);
        if (Number.isFinite(index) && index > 0) {
            return { mode: 'number', index, sourceView, targetView };
        }
    }

    const cleaned = titlePart
        .replace(/\b(?:should\s+be|belongs?)\b/g, ' ')
        .replace(/^(?:the\s+)?(?:saved\s+)?(?:youtube\s+)?(?:song|track|music|video)\s+/, '')
        .replace(/^(?:called|named|titled)\s+/, '')
        .replace(/^(?:song|track|music|video)\s+(?:called|named|titled)\s+/, '')
        .replace(/^(?:it|this|that)\s+/, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned || /^(?:music|videos?|favorites?|watch\s+later|playlist|library)$/.test(cleaned)) return null;
    return { mode: 'title', title: cleaned, sourceView, targetView };
}

export function normalizeYouTubeTitleForMatch(text = '') {
    return normalizeVoiceTokens(text)
        .replace(/\s+-\s+/g, ' ')
        .replace(/\b(?:official|music\s+video|video|audio|lyrics?|lyric|hd|4k|live|visualizer)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function classifyYouTubeContentType(query = '', currentEntry = null) {
    const q = normalizeVoiceTokens(String(query || ''));
    const title = normalizeVoiceTokens(String(currentEntry?.title || ''));
    const channel = normalizeVoiceTokens(String(currentEntry?.channelTitle || ''));
    const categoryId = String(currentEntry?.categoryId || '').trim();
    if (categoryId === '10') return 'music';
    if (/\b(music|song|songs|lofi|lo-fi|beats|playlist|album|ep|track|mix|remix|instrumental)\b/.test(q)) return 'music';
    if (/\b(video|videos|youtube|tutorial|how\s+to|lecture|documentary|interview|review)\b/.test(q)) return 'video';
    if (/\b(official\s+audio|lyrics?|music\s+video|audio)\b/.test(title)) return 'music';
    if (/\bvevo\b/.test(channel) || /vevo$/.test(channel) || /\b-\s*topic\b/.test(channel)) return 'music';
    return 'video';
}

export function resolveAutoPlaylistForYouTube(query = '', currentEntry = null) {
    return classifyYouTubeContentType(query, currentEntry) === 'music' ? 'Music' : 'Videos';
}
