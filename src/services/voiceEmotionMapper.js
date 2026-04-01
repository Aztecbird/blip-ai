const DEFAULT_SIGNALS = Object.freeze({
    calm: 0,
    stress: 0,
    urgency: 0,
    hesitation: 0,
    joy: 0,
    frustration: 0,
    tiredness: 0,
    softness: 0
});

const CUE_ALIASES = Object.freeze({
    calm: ['calm', 'contentment', 'relief', 'peace', 'serenity'],
    stress: ['stress', 'distress', 'anxiety', 'fear', 'nervousness'],
    urgency: ['urgency', 'determination', 'excitement', 'surprise'],
    hesitation: ['hesitation', 'awkwardness', 'confusion', 'uncertainty', 'doubt', 'contemplation'],
    joy: ['joy', 'amusement', 'happiness', 'delight', 'triumph'],
    frustration: ['frustration', 'annoyance', 'anger', 'irritation'],
    tiredness: ['tiredness', 'fatigue', 'boredom', 'sleepiness'],
    softness: ['softness', 'tenderness', 'sadness', 'calm', 'relief']
});

function clamp01(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.min(1, Math.max(0, number));
}

function normalizeEmotionMap(raw = {}) {
    if (!raw || typeof raw !== 'object') return {};

    if (Array.isArray(raw)) {
        return raw.reduce((acc, item) => {
            const key = String(item?.name || item?.label || item?.emotion || '').trim().toLowerCase();
            if (!key) return acc;
            acc[key] = clamp01(item?.score ?? item?.value ?? item?.confidence ?? 0);
            return acc;
        }, {});
    }

    return Object.entries(raw).reduce((acc, [key, value]) => {
        const safeKey = String(key || '').trim().toLowerCase();
        if (!safeKey) return acc;
        acc[safeKey] = clamp01(value?.score ?? value?.value ?? value?.confidence ?? value);
        return acc;
    }, {});
}

export function extractHumeEmotionFeatures(event = {}) {
    return normalizeEmotionMap(
        event.emotionFeatures
        || event.emotion_features
        || event.models?.prosody?.scores
        || event.models?.prosody?.emotions
        || event.prosody?.scores
        || event.emotions
        || event.scores
    );
}

function scoreCue(features = {}, aliases = []) {
    if (!aliases.length) return 0;
    let best = 0;
    aliases.forEach((alias) => {
        const value = clamp01(features[alias]);
        if (value > best) best = value;
    });
    return best;
}

function buildBehavior(signals = {}, recommendedMode = 'neutral') {
    if (recommendedMode === 'efficient_assistant') {
        return {
            replyPacing: 'faster',
            replyLength: 'short',
            replySoftness: 0.18,
            shouldConfirmActions: false,
            faceEmotion: 'focused'
        };
    }
    if (recommendedMode === 'gentle_support') {
        return {
            replyPacing: 'slower',
            replyLength: 'normal',
            replySoftness: 0.72,
            shouldConfirmActions: true,
            faceEmotion: 'serious'
        };
    }
    if (recommendedMode === 'careful_confirmation') {
        return {
            replyPacing: 'slower',
            replyLength: 'short',
            replySoftness: 0.58,
            shouldConfirmActions: true,
            faceEmotion: 'serious'
        };
    }
    if (recommendedMode === 'playful_light') {
        return {
            replyPacing: 'steady',
            replyLength: 'normal',
            replySoftness: 0.34,
            shouldConfirmActions: false,
            faceEmotion: 'playful'
        };
    }
    if (recommendedMode === 'calm_companion') {
        return {
            replyPacing: 'steady',
            replyLength: 'normal',
            replySoftness: 0.48,
            shouldConfirmActions: false,
            faceEmotion: 'serious'
        };
    }

    return {
        replyPacing: 'steady',
        replyLength: 'normal',
        replySoftness: 0.32,
        shouldConfirmActions: false,
        faceEmotion: 'serious'
    };
}

export function mapVoiceEmotionSignals(event = {}) {
    const features = extractHumeEmotionFeatures(event);
    const transcript = String(event.transcript || event.text || '').trim();
    const signals = Object.keys(DEFAULT_SIGNALS).reduce((acc, cue) => {
        acc[cue] = scoreCue(features, CUE_ALIASES[cue] || []);
        return acc;
    }, { ...DEFAULT_SIGNALS });

    if (signals.tiredness > 0.5) {
        signals.softness = clamp01(Math.max(signals.softness, signals.tiredness * 0.7));
    }
    if (signals.frustration > 0.45) {
        signals.stress = clamp01(Math.max(signals.stress, signals.frustration * 0.72));
    }

    let recommendedMode = 'neutral';
    if (signals.urgency >= 0.58 && signals.hesitation <= 0.42) {
        recommendedMode = 'efficient_assistant';
    } else if (signals.frustration >= 0.52 || (signals.stress >= 0.56 && signals.hesitation >= 0.36)) {
        recommendedMode = 'careful_confirmation';
    } else if (signals.hesitation >= 0.48 && signals.softness >= 0.32) {
        recommendedMode = 'gentle_support';
    } else if (signals.joy >= 0.55 && signals.frustration <= 0.34) {
        recommendedMode = 'playful_light';
    } else if (signals.calm >= 0.5 && signals.urgency < 0.35 && signals.stress < 0.35) {
        recommendedMode = 'calm_companion';
    }

    const confidence = Math.max(...Object.values(signals));

    return {
        source: 'hume',
        transcript,
        rawEmotionFeatures: features,
        signals,
        recommendedMode,
        confidence,
        behavior: buildBehavior(signals, recommendedMode)
    };
}

export function getNeutralVoiceEmotionMap() {
    return {
        source: 'none',
        transcript: '',
        rawEmotionFeatures: {},
        signals: { ...DEFAULT_SIGNALS },
        recommendedMode: 'neutral',
        confidence: 0,
        behavior: buildBehavior(DEFAULT_SIGNALS, 'neutral')
    };
}
