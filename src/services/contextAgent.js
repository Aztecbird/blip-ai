/**
 * BlipContextAgent — contextual continuity and emotional state management.
 * Not consciousness/self-awareness; frames as: mode, memory, tone, and decision loop
 * driven by real signals (voice, camera, timers, screen mode, recent questions).
 * Lightweight and modular; supports existing Blip architecture.
 */

const RECENT_MAX = 20;
const MODES = ['idle', 'study', 'cooking', 'advice', 'media'];
const TONES = ['calm', 'curious', 'focused', 'cheerful', 'concerned'];
export const TONE_TO_PERSONA = {
    calm: 'idle',
    curious: 'idle',
    focused: 'study',
    cheerful: 'happy',
    concerned: 'warning'
};
const ACTIONS = [
    'switch_mode',
    'suggest_recipe',
    'show_timer',
    'show_youtube',
    'stay_ambient',
    'reduce_motion',
    'ask_followup',
    'one_step_instruction'
];

let agentState = {
    currentMode: 'idle',
    emotionalTone: 'calm',
    recentInteractions: [],
    lastInputs: null,
    environmentSummary: ''
};

/**
 * Observe current inputs (real signals). Call from main after voice, timer, or mode change.
 * @param {object} inputs
 * @param {string} [inputs.voiceTranscript] - Last user command or transcript
 * @param {boolean} [inputs.hasCameraImage] - Whether a photo/image was just sent
 * @param {boolean} [inputs.isLiveWatch] - Camera live observation on
 * @param {Array} [inputs.timers] - Active timers { id, text, time }
 * @param {string} [inputs.screenMode] - currentMode: 'core'|'chart'|'map'|'hub'|'settings'|'vision'
 * @param {Array} [inputs.recentQuestions] - Last 10–20 { user, blip } from history
 */
export function observe(inputs) {
    agentState.lastInputs = {
        voiceTranscript: inputs.voiceTranscript || '',
        hasCameraImage: !!inputs.hasCameraImage,
        isLiveWatch: !!inputs.isLiveWatch,
        timers: Array.isArray(inputs.timers) ? inputs.timers : [],
        screenMode: inputs.screenMode || 'core',
        recentQuestions: Array.isArray(inputs.recentQuestions) ? inputs.recentQuestions.slice(-RECENT_MAX) : []
    };
    if (inputs.voiceTranscript && inputs.voiceTranscript.trim()) {
        agentState.recentInteractions.push({
            at: Date.now(),
            user: (inputs.voiceTranscript || '').slice(0, 200),
            blip: (inputs.lastBlipReply || '').slice(0, 200)
        });
        if (agentState.recentInteractions.length > RECENT_MAX) {
            agentState.recentInteractions.shift();
        }
    }
}

/**
 * Summarize current context for display or debugging.
 */
export function summarizeContext() {
    const i = agentState.lastInputs;
    if (!i) return 'No inputs yet.';
    const parts = [];
    parts.push(`mode=${agentState.currentMode} tone=${agentState.emotionalTone}`);
    if (i.voiceTranscript) parts.push(`last: "${i.voiceTranscript.slice(0, 50)}…"`);
    if (i.timers.length) parts.push(`${i.timers.length} timer(s) active`);
    if (i.isLiveWatch) parts.push('live watch on');
    if (i.hasCameraImage) parts.push('has image');
    parts.push(`screen=${i.screenMode}`);
    agentState.environmentSummary = parts.join(' | ');
    return agentState.environmentSummary;
}

/**
 * Decide next mode, emotion, and action from observed inputs. Rule-based (no LLM).
 * @returns {{ mode?: string, emotion?: string, action?: string, payload?: object }}
 */
export function decide() {
    const i = agentState.lastInputs;
    if (!i) return { action: 'stay_ambient' };

    const lastQ = (i.voiceTranscript || '').toLowerCase();
    const hasTimer = i.timers && i.timers.length > 0;
    const recent = i.recentQuestions || [];

    let mode = agentState.currentMode;
    let emotion = agentState.emotionalTone;
    let action = 'stay_ambient';
    let payload = {};

    // Voice-driven mode and tone (mode = persona key for setPersona)
    if (lastQ.includes('cook') || lastQ.includes('recipe') || lastQ.includes('ingredient')) {
        mode = 'cooking';
        emotion = 'curious';
        action = 'switch_mode';
        payload = { mode: 'cooking' };
    } else if (lastQ.includes('study') || lastQ.includes('homework') || lastQ.includes('focus') || lastQ.includes('learn')) {
        mode = 'study';
        emotion = 'focused';
        action = 'reduce_motion';
        payload = { reduce: true };
    } else if (lastQ.includes('youtube') || lastQ.includes('video') || lastQ.includes('watch') || lastQ.includes('tutorial')) {
        action = 'show_youtube';
        emotion = 'cheerful';
    } else if (lastQ.includes('timer') || lastQ.includes('remind')) {
        if (hasTimer) action = 'show_timer';
        emotion = 'calm';
    } else if (lastQ.includes('advice') || lastQ.includes('should i') || lastQ.includes('what do you think')) {
        mode = 'advice';
        emotion = 'concerned';
        action = 'switch_mode';
        payload = { mode: 'advice' };
    } else if (lastQ.includes('music') || lastQ.includes('play')) {
        mode = 'media';
        emotion = 'cheerful';
        action = 'switch_mode';
        payload = { mode: 'media' };
    } else if (lastQ.includes('how do i') || lastQ.includes('step') || lastQ.includes('instruction')) {
        action = 'one_step_instruction';
        emotion = 'focused';
    } else if (recent.length > 2 && lastQ.length < 5) {
        action = 'ask_followup';
        payload = { hint: 'Short reply might need clarification' };
    }

    // Timer active → suggest showing timer
    if (hasTimer && action === 'stay_ambient') {
        action = 'show_timer';
        payload = { timers: i.timers };
    }

    agentState.currentMode = mode;
    agentState.emotionalTone = emotion;

    return { mode, emotion, action, payload };
}

/**
 * Get current agent state (for UI or debugging).
 */
export function getState() {
    return {
        ...agentState,
        summary: agentState.environmentSummary || summarizeContext()
    };
}

/**
 * Reset agent state (e.g. on app stop).
 */
export function reset() {
    agentState = {
        currentMode: 'idle',
        emotionalTone: 'calm',
        recentInteractions: [],
        lastInputs: null,
        environmentSummary: ''
    };
}

export default {
    observe,
    summarizeContext,
    decide,
    getState,
    reset,
    MODES,
    TONES,
    ACTIONS,
    TONE_TO_PERSONA
};
