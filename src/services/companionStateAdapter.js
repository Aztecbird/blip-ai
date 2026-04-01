import { getNeutralVoiceEmotionMap } from './voiceEmotionMapper.js';

const DEFAULT_DECAY_RATE = 0.92;
const DEFAULT_BLEND = 0.34;
const DEFAULT_STALE_MS = 9000;

function clamp01(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.min(1, Math.max(0, number));
}

export function getDefaultCompanionSnapshot() {
    const neutral = getNeutralVoiceEmotionMap();
    return {
        status: 'off',
        available: false,
        enabled: false,
        active: false,
        mode: neutral.recommendedMode,
        signals: { ...neutral.signals },
        confidence: 0,
        behavior: { ...neutral.behavior },
        transcript: '',
        lastUpdatedAt: 0,
        fallbackReason: '',
        source: 'none'
    };
}

export function createCompanionStateAdapter(options = {}) {
    const blend = clamp01(options.blend ?? DEFAULT_BLEND);
    const decayRate = clamp01(options.decayRate ?? DEFAULT_DECAY_RATE);
    const staleMs = Math.max(2000, Number(options.staleMs || DEFAULT_STALE_MS));
    let snapshot = getDefaultCompanionSnapshot();

    function updateStatus(status = 'off', extra = {}) {
        snapshot = {
            ...snapshot,
            ...extra,
            status
        };
        return snapshot;
    }

    function decay(now = Date.now()) {
        if (!snapshot.lastUpdatedAt) return snapshot;
        const elapsed = Math.max(0, now - snapshot.lastUpdatedAt);
        const steps = Math.floor(elapsed / 1200);
        if (steps <= 0) {
            if (elapsed > staleMs && snapshot.mode !== 'neutral') {
                snapshot = {
                    ...snapshot,
                    mode: 'neutral',
                    behavior: getNeutralVoiceEmotionMap().behavior
                };
            }
            return snapshot;
        }

        const nextSignals = Object.fromEntries(
            Object.entries(snapshot.signals || {}).map(([key, value]) => [key, clamp01(value * (decayRate ** steps))])
        );
        const confidence = Math.max(0, ...Object.values(nextSignals));
        snapshot = {
            ...snapshot,
            signals: nextSignals,
            confidence,
            lastUpdatedAt: now
        };
        if (confidence < 0.18) {
            snapshot.mode = 'neutral';
            snapshot.behavior = getNeutralVoiceEmotionMap().behavior;
        }
        return snapshot;
    }

    function merge(mapped = {}, meta = {}) {
        const now = Number(meta.now || Date.now());
        decay(now);
        const neutral = getNeutralVoiceEmotionMap();
        const incomingSignals = mapped.signals || neutral.signals;
        const nextSignals = Object.keys(neutral.signals).reduce((acc, key) => {
            const previous = clamp01(snapshot.signals?.[key] ?? 0);
            const incoming = clamp01(incomingSignals[key] ?? 0);
            acc[key] = clamp01(previous + ((incoming - previous) * blend));
            return acc;
        }, {});
        const confidence = Math.max(0, ...Object.values(nextSignals));
        const recommendedMode = confidence >= 0.2
            ? String(mapped.recommendedMode || 'neutral')
            : 'neutral';

        snapshot = {
            ...snapshot,
            status: meta.status || 'active',
            active: true,
            enabled: true,
            source: mapped.source || 'hume',
            transcript: String(mapped.transcript || snapshot.transcript || ''),
            signals: nextSignals,
            mode: recommendedMode,
            confidence,
            behavior: recommendedMode === 'neutral'
                ? neutral.behavior
                : { ...neutral.behavior, ...(mapped.behavior || {}) },
            fallbackReason: '',
            lastUpdatedAt: now
        };
        return snapshot;
    }

    function getSnapshot(now = Date.now()) {
        return decay(now);
    }

    return {
        merge,
        getSnapshot,
        updateStatus,
        reset() {
            snapshot = getDefaultCompanionSnapshot();
            return snapshot;
        }
    };
}
