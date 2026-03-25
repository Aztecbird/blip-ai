/**
 * Ear training sound generation (Web Audio API).
 * Keeps audio logic isolated from quiz logic.
 */

// Tone types:
// - 'triangle': simple synth (previous default)
// - 'piano': pleasant piano-like synthesis (no external samples needed)
const DEFAULT_TONE = 'piano';

function midiToFreq(midi) {
    const m = Number(midi);
    if (!Number.isFinite(m)) return 440;
    return 440 * Math.pow(2, (m - 69) / 12);
}

function nowMs() {
    return (typeof performance !== 'undefined' ? performance.now() : Date.now());
}

export function createEarTrainingAudio({ masterVolume = 0.18, toneType = DEFAULT_TONE } = {}) {
    let audioCtx = null;
    let masterGain = null;
    let active = [];

    function ensureAudioContext() {
        if (audioCtx) return audioCtx;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error('Web Audio API is not supported in this browser.');

        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = masterVolume;
        masterGain.connect(audioCtx.destination);
        return audioCtx;
    }

    async function init() {
        const ctx = ensureAudioContext();
        if (ctx.state === 'suspended') {
            try { await ctx.resume(); } catch (_) { /* ignore */ }
        }
        return true;
    }

    function stopAll() {
        for (const o of active) {
            const sources = o.sources || [];
            for (const s of sources) {
                try { s.stop(); } catch (_) { /* ignore */ }
            }
        }
        active = [];
    }

    /**
     * Play a single note for durationMs.
     * Uses a short attack/release envelope to avoid clicks.
     */
    function playMidi(midi, durationMs, { volume = 1 } = {}) {
        const ctx = ensureAudioContext();
        const freq = midiToFreq(midi);

        const t0 = ctx.currentTime;
        const dur = Math.max(200, Number(durationMs) || 500) / 1000;
        const sources = [];

        // Master instrument gain (envelope lives here)
        const instGain = ctx.createGain();
        instGain.gain.value = 0.0001;
        instGain.connect(masterGain);

        // Envelope tuned for "not too short"
        const attack = Math.min(0.02, dur * 0.18);
        const release = Math.min(0.25, dur * 0.45);
        const sustainTime = Math.max(attack, dur - release);

        instGain.gain.setValueAtTime(0.0001, t0);
        instGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t0 + attack);
        instGain.gain.setValueAtTime(Math.max(0.0002, volume), t0 + sustainTime);
        instGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

        if (String(toneType) === 'piano') {
            // Slightly inharmonic, filtered harmonics + short hammer noise
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.value = 0.75;
            filter.frequency.setValueAtTime(Math.min(2400, freq * 6), t0);
            filter.frequency.exponentialRampToValueAtTime(900, t0 + dur * 0.75);
            filter.connect(instGain);

            const osc1 = ctx.createOscillator();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(freq, t0);
            osc1.detune.setValueAtTime(-6, t0);

            const osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 2, t0);
            osc2.detune.setValueAtTime(3, t0);

            // Connect oscillators through filter
            osc1.connect(filter);
            osc2.connect(filter);
            sources.push(osc1, osc2);

            // Hammer noise (very short, helps piano attack feel)
            const noiseDur = Math.min(0.035, dur * 0.12);
            const sampleRate = ctx.sampleRate;
            const bufferSize = Math.max(1, Math.floor(sampleRate * noiseDur));
            const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // decaying noise
            }

            const noise = ctx.createBufferSource();
            noise.buffer = noiseBuffer;
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.Q.value = 0.9;
            noiseFilter.frequency.setValueAtTime(Math.min(2500, freq * 2.2), t0);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.35 * volume, t0);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(instGain);
            sources.push(noise);

            // Start/stop
            for (const s of sources) {
                try { s.start(t0); } catch (_) { /* ignore */ }
            }
            for (const s of sources) {
                try { s.stop(t0 + dur); } catch (_) { /* ignore */ }
            }
        } else {
            // Simple synth (triangle/sine/saw) through envelope gain
            const osc = ctx.createOscillator();
            osc.type = String(toneType) || 'triangle';
            osc.frequency.value = freq;
            osc.connect(instGain);
            sources.push(osc);

            try { osc.start(t0); } catch (_) { /* ignore */ }
            try { osc.stop(t0 + dur); } catch (_) { /* ignore */ }
        }

        const entry = { sources, startedAt: nowMs() };
        active.push(entry);

        // Cleanup: scheduled removal so we don't rely on all node events
        const cleanupMs = Math.max(0, dur * 1000 + 30);
        setTimeout(() => {
            active = active.filter((x) => x !== entry);
            try { instGain.disconnect(); } catch (_) { /* ignore */ }
        }, cleanupMs);

        return new Promise((resolve) => {
            setTimeout(resolve, Math.max(0, dur * 1000 + 10));
        });
    }

    async function playIntervalExercise(exercise, { noteDurationMs = 520, gapMs = 90 } = {}) {
        // exercise: { rootMidi, semitones }
        const root = Number(exercise?.rootMidi);
        const semitones = Number(exercise?.semitones);
        if (!Number.isFinite(root) || !Number.isFinite(semitones)) throw new Error('Invalid interval exercise.');

        stopAll();
        await playMidi(root, noteDurationMs, { volume: 1 });
        if (gapMs > 0) await new Promise((r) => setTimeout(r, gapMs));
        await playMidi(root + semitones, noteDurationMs, { volume: 1 });
    }

    async function playHarmonyExercise(exercise, { chordDurationMs = 650 } = {}) {
        // exercise: { rootMidi, quality: 'major'|'minor' }
        const root = Number(exercise?.rootMidi);
        const quality = String(exercise?.quality || '').toLowerCase();
        if (!Number.isFinite(root)) throw new Error('Invalid harmony exercise.');
        if (!['major', 'minor'].includes(quality)) throw new Error('Invalid harmony quality.');

        stopAll();

        const intervals = quality === 'major' ? [0, 4, 7] : [0, 3, 7];
        const notes = intervals.map((s) => root + s);

        const promises = notes.map((m) => playMidi(m, chordDurationMs, { volume: 0.95 }));
        await Promise.all(promises);
    }

    return {
        init,
        stopAll,
        playIntervalExercise,
        playHarmonyExercise
    };
}

