/**
 * Ear training exercise generation (intervals + major/minor triads).
 * Keeps quiz logic isolated from audio/UI logic.
 */

export const INTERVALS = [
    { key: 'minor2', label: 'Minor 2nd', semitones: 1 },
    { key: 'major2', label: 'Major 2nd', semitones: 2 },
    { key: 'minor3', label: 'Minor 3rd', semitones: 3 },
    { key: 'major3', label: 'Major 3rd', semitones: 4 },
    { key: 'perfect4', label: 'Perfect 4th', semitones: 5 },
    { key: 'tritone', label: 'Tritone', semitones: 6 },
    { key: 'perfect5', label: 'Perfect 5th', semitones: 7 },
    { key: 'minor6', label: 'Minor 6th', semitones: 8 },
    { key: 'major6', label: 'Major 6th', semitones: 9 },
    { key: 'minor7', label: 'Minor 7th', semitones: 10 },
    { key: 'major7', label: 'Major 7th', semitones: 11 },
    { key: 'octave', label: 'Octave', semitones: 12 }
];

export const HARMONIES = [
    { key: 'major', label: 'Major' },
    { key: 'minor', label: 'Minor' }
];

function randInt(minInclusive, maxInclusive) {
    const a = Math.ceil(minInclusive);
    const b = Math.floor(maxInclusive);
    if (a > b) return a;
    return Math.floor(Math.random() * (b - a + 1)) + a;
}

function pickWeighted(items, weights) {
    const ws = items.map((_, i) => Math.max(0, Number(weights[i]) || 0));
    const total = ws.reduce((s, x) => s + x, 0);
    if (total <= 0) {
        return items[Math.floor(Math.random() * items.length)];
    }
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
        r -= ws[i];
        if (r <= 0) return items[i];
    }
    return items[items.length - 1];
}

function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getWrongCount(wrongCounts, key) {
    if (!wrongCounts || typeof wrongCounts !== 'object') return 0;
    const v = wrongCounts[key];
    return Number.isFinite(Number(v)) ? Number(v) : 0;
}

function pickIntervalWeighted(wrongCounts) {
    // Weight wrong items more often.
    const items = INTERVALS;
    const weights = items.map((it) => 1 + getWrongCount(wrongCounts, it.key) * 3);
    return pickWeighted(items, weights);
}

function pickHarmonyWeighted(wrongCounts) {
    const items = HARMONIES;
    const weights = items.map((it) => 1 + getWrongCount(wrongCounts, it.key) * 4);
    return pickWeighted(items, weights);
}

function pickIntervalDistractors(correctKey, wrongCounts, distractorCount = 3) {
    const correct = INTERVALS.find((i) => i.key === correctKey);
    const others = INTERVALS.filter((i) => i.key !== correctKey);

    // Weighted without replacement.
    const selected = [];
    const remaining = [...others];
    while (selected.length < distractorCount && remaining.length) {
        const weights = remaining.map((it) => 1 + getWrongCount(wrongCounts, it.key) * 2);
        const picked = pickWeighted(remaining, weights);
        selected.push(picked);
        const idx = remaining.findIndex((x) => x.key === picked.key);
        if (idx >= 0) remaining.splice(idx, 1);
    }
    return selected;
}

function chooseRootMidiForInterval(semitones) {
    // Keep notes in a comfortable range (C3..C5-ish).
    // Ensure root + semitones stays <= maxMidi.
    const minRoot = 48; // C3
    const maxRoot = 72 - semitones; // keep up to C5-ish
    const root = randInt(minRoot, Math.max(minRoot, maxRoot));
    return root;
}

function chooseRootMidiForTriad() {
    // Keep chord tones in a comfortable band.
    const minRoot = 48; // C3
    const maxRoot = 60; // ~C4
    return randInt(minRoot, maxRoot);
}

/**
 * @param {{ intervalsWrongCounts?: Object, harmonyWrongCounts?: Object }} stats
 */
export function generateNextIntervalQuestion(stats = {}) {
    const wrongCounts = stats.intervalsWrongCounts || {};
    const correct = pickIntervalWeighted(wrongCounts);

    const rootMidi = chooseRootMidiForInterval(correct.semitones);
    const optionsDistractors = pickIntervalDistractors(correct.key, wrongCounts, 3);
    const optionItems = shuffleInPlace([correct, ...optionsDistractors].map((x) => ({
        id: x.key,
        label: x.label
    })));

    return {
        mode: 'interval',
        correctAnswerId: correct.key,
        prompt: 'Listen to the interval. Which one is it?',
        options: optionItems,
        exercise: {
            type: 'interval',
            rootMidi,
            semitones: correct.semitones
        }
    };
}

/**
 * @param {{ harmonyWrongCounts?: Object, intervalsWrongCounts?: Object }} stats
 */
export function generateNextHarmonyQuestion(stats = {}) {
    const wrongCounts = stats.harmonyWrongCounts || {};
    const correct = pickHarmonyWeighted(wrongCounts);

    const rootMidi = chooseRootMidiForTriad();
    const other = correct.key === 'major' ? 'minor' : 'major';

    const options = shuffleInPlace([
        { id: 'major', label: 'Major' },
        { id: 'minor', label: 'Minor' }
    ]);

    return {
        mode: 'harmony',
        correctAnswerId: correct.key,
        prompt: 'Listen to the triad. Is it Major or Minor?',
        options,
        exercise: {
            type: 'triad',
            rootMidi,
            quality: correct.key
        }
    };
}

