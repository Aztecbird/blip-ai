/**
 * Ear training UI logic.
 * - Builds the panel state machine (menu -> interval/harmony)
 * - Delegates audio to earTrainingAudio
 * - Delegates question generation to earTrainingExercises
 *
 * Designed so later we can add voice mode:
 * - `controller.submitAnswer(answerId)` can be called by voice recognition.
 */

import { createEarTrainingAudio } from './earTrainingAudio.js';
import { generateNextIntervalQuestion, generateNextHarmonyQuestion } from './earTrainingExercises.js';

const UI_IDS = {
    menuIntervalsBtn: 'ear-training-btn-intervals',
    menuHarmonyBtn: 'ear-training-btn-harmony',
    modeLabel: 'ear-training-mode-label',
    tutorialEl: 'ear-training-tutorial',
    promptEl: 'ear-training-prompt',
    scoreEl: 'ear-training-score',
    optionsWrap: 'ear-training-options',
    feedbackEl: 'ear-training-feedback',
    replayBtn: 'ear-training-replay-btn',
    nextBtn: 'ear-training-next-btn',
    menuWrap: 'ear-training-menu-wrap',
    exerciseWrap: 'ear-training-exercise-wrap'
};

function byId(root, id) {
    return root ? root.querySelector(`#${id}`) : null;
}

function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function updateScoreText(scoreState, mode) {
    const correct = scoreState?.correct || 0;
    const total = scoreState?.total || 0;
    return `Score: ${correct} / ${total}`;
}

function clearElement(el) {
    if (!el) return;
    el.innerHTML = '';
}

export function mountEarTrainingGame(rootEl, options = {}) {
    if (!rootEl) return null;

    const audio = createEarTrainingAudio();
    const speakLine = typeof options.speakLine === 'function' ? options.speakLine : null;
    let question = null;
    let mode = null; // 'interval'|'harmony'
    let answered = false;
    let playing = false;

    const stats = {
        intervals: {
            correct: 0,
            total: 0,
            intervalsWrongCounts: {}
        },
        harmony: {
            correct: 0,
            total: 0,
            harmonyWrongCounts: {}
        }
    };

    const els = {
        menuIntervalsBtn: byId(rootEl, UI_IDS.menuIntervalsBtn),
        menuHarmonyBtn: byId(rootEl, UI_IDS.menuHarmonyBtn),
        modeLabel: byId(rootEl, UI_IDS.modeLabel),
        tutorialEl: byId(rootEl, UI_IDS.tutorialEl),
        promptEl: byId(rootEl, UI_IDS.promptEl),
        scoreEl: byId(rootEl, UI_IDS.scoreEl),
        optionsWrap: byId(rootEl, UI_IDS.optionsWrap),
        feedbackEl: byId(rootEl, UI_IDS.feedbackEl),
        replayBtn: byId(rootEl, UI_IDS.replayBtn),
        nextBtn: byId(rootEl, UI_IDS.nextBtn),
        menuWrap: byId(rootEl, UI_IDS.menuWrap),
        exerciseWrap: byId(rootEl, UI_IDS.exerciseWrap)
    };

    function setMode(nextMode) {
        mode = nextMode;
        answered = false;
        question = null;
        playing = false;

        if (els.menuWrap) els.menuWrap.style.display = 'none';
        if (els.exerciseWrap) els.exerciseWrap.style.display = 'block';
        if (els.modeLabel) els.modeLabel.textContent = nextMode === 'interval' ? 'Intervals' : 'Harmony';
        if (els.tutorialEl) {
            els.tutorialEl.textContent = nextMode === 'interval'
                ? 'Blip will play two notes. Listen and choose the interval.'
                : 'Blip will play a triad. Listen and choose major or minor.';
        }

        // Reset UI bits
        if (els.feedbackEl) {
            els.feedbackEl.textContent = '';
            els.feedbackEl.className = 'ear-training-feedback';
        }
        if (els.nextBtn) els.nextBtn.disabled = true;
        if (els.replayBtn) els.replayBtn.disabled = false;
        clearElement(els.optionsWrap);
        updateScoreUI();
    }

    function resetToMenu({ resetStats = false } = {}) {
        if (resetStats) {
            stats.intervals = { correct: 0, total: 0, intervalsWrongCounts: {} };
            stats.harmony = { correct: 0, total: 0, harmonyWrongCounts: {} };
        }
        mode = null;
        answered = false;
        question = null;
        playing = false;

        if (els.menuWrap) els.menuWrap.style.display = 'block';
        if (els.exerciseWrap) els.exerciseWrap.style.display = 'none';
        if (els.modeLabel) els.modeLabel.textContent = 'Intervals';
        if (els.tutorialEl) els.tutorialEl.textContent = '';

        if (els.feedbackEl) {
            els.feedbackEl.textContent = '';
            els.feedbackEl.className = 'ear-training-feedback';
        }
        if (els.nextBtn) els.nextBtn.disabled = true;
        if (els.replayBtn) els.replayBtn.disabled = false;
        clearElement(els.optionsWrap);
        updateScoreUI();
    }

    function updateScoreUI() {
        const s = mode === 'interval' ? stats.intervals : stats.harmony;
        if (els.scoreEl) {
            els.scoreEl.textContent = updateScoreText(s, mode);
        }
    }

    function setFeedback(text, kind) {
        if (!els.feedbackEl) return;
        els.feedbackEl.textContent = text || '';
        els.feedbackEl.className = 'ear-training-feedback' + (kind ? ` ear-training-feedback--${kind}` : '');
    }

    function disableOptions(disabled) {
        if (!els.optionsWrap) return;
        const btns = els.optionsWrap.querySelectorAll('button[data-answer-id]');
        btns.forEach((b) => { b.disabled = Boolean(disabled); });
    }

    function buildOptions(questionObj) {
        clearElement(els.optionsWrap);
        if (!questionObj?.options?.length) return;

        for (const opt of questionObj.options) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ear-training-option-btn';
            btn.textContent = opt.label;
            btn.dataset.answerId = String(opt.id);
            btn.addEventListener('click', () => {
                if (playing) return;
                if (answered) return;
                submitAnswer(String(opt.id));
            });
            els.optionsWrap.appendChild(btn);
        }
    }

    function getAnswerLabel(answerId) {
        if (!question) return answerId;
        const opt = question.options.find((o) => String(o.id) === String(answerId));
        if (opt) return opt.label;
        return answerId;
    }

    async function playQuestion(q) {
        if (!q) return;
        playing = true;
        answered = false;
        if (els.nextBtn) els.nextBtn.disabled = true;
        if (els.replayBtn) els.replayBtn.disabled = true;
        disableOptions(true);
        setFeedback('', '');

        await audio.init();
        if (q.mode === 'interval') {
            await audio.playIntervalExercise(q.exercise);
        } else {
            await audio.playHarmonyExercise(q.exercise);
        }

        playing = false;
        // Students can answer now
        if (els.replayBtn) els.replayBtn.disabled = false;
        disableOptions(false);
    }

    function computeStatsUpdateForWrong(correctAnswerId) {
        if (mode === 'interval') {
            stats.intervals.intervalsWrongCounts = stats.intervals.intervalsWrongCounts || {};
            stats.intervals.intervalsWrongCounts[correctAnswerId] = (stats.intervals.intervalsWrongCounts[correctAnswerId] || 0) + 1;
        } else {
            stats.harmony.harmonyWrongCounts = stats.harmony.harmonyWrongCounts || {};
            stats.harmony.harmonyWrongCounts[correctAnswerId] = (stats.harmony.harmonyWrongCounts[correctAnswerId] || 0) + 1;
        }
    }

    async function submitAnswer(answerId) {
        if (!question) return;
        if (playing) return;
        if (answered) return;

        answered = true;

        const isCorrect = String(answerId) === String(question.correctAnswerId);
        const correctLabel = getAnswerLabel(question.correctAnswerId);

        // Update score (total always increments per attempt)
        const s = mode === 'interval' ? stats.intervals : stats.harmony;
        s.total += 1;
        if (isCorrect) s.correct += 1;
        else computeStatsUpdateForWrong(question.correctAnswerId);

        updateScoreUI();
        disableOptions(true);

        if (isCorrect) {
            setFeedback('Correct!', 'correct');
            if (typeof speakLine === 'function') {
                await speakLine('Correct. Nice work.', 'happy');
            }
        } else {
            const message = `Not quite. It was ${correctLabel}. Try this one.`;
            setFeedback(message, 'wrong');
            if (typeof speakLine === 'function') {
                await speakLine(message, 'gentle');
            }
        }

        if (els.nextBtn) els.nextBtn.disabled = false;
        if (els.replayBtn) els.replayBtn.disabled = false;
    }

    function nextQuestion() {
        if (mode === 'interval') {
            question = generateNextIntervalQuestion(stats.intervals);
        } else {
            question = generateNextHarmonyQuestion(stats.harmony);
        }

        if (els.promptEl) els.promptEl.textContent = question.prompt;
        buildOptions(question);
        if (typeof speakLine === 'function') {
            void speakLine(
                mode === 'interval'
                    ? `What interval is this?`
                    : 'What harmony is this?',
                'curious'
            );
        }

        // Immediately play the new question (Next is clicked by the student).
        // Audio is initialized from this user gesture path.
        void playQuestion(question);
    }

    function replayCurrent() {
        if (!question) return;
        if (playing) return;
        void playQuestion(question);
    }

    function startMode(nextMode) {
        if (nextMode !== 'interval' && nextMode !== 'harmony') return;
        setMode(nextMode);
        if (typeof speakLine === 'function') {
            void speakLine(
                nextMode === 'interval'
                    ? 'I will play two notes. Tell me the interval.'
                    : 'I will play a triad. Tell me if it is major or minor.',
                'curious'
            );
        }
        nextQuestion();
    }

    // Event handlers (menu)
    if (els.menuIntervalsBtn) {
        els.menuIntervalsBtn.addEventListener('click', () => {
            setMode('interval');
            // Generate and play first question
            nextQuestion();
        });
    }

    if (els.menuHarmonyBtn) {
        els.menuHarmonyBtn.addEventListener('click', () => {
            setMode('harmony');
            nextQuestion();
        });
    }

    // Event handlers (controls)
    if (els.replayBtn) {
        els.replayBtn.addEventListener('click', () => {
            replayCurrent();
        });
    }

    if (els.nextBtn) {
        els.nextBtn.addEventListener('click', () => {
            if (playing) return;
            nextQuestion();
        });
    }

    // Start with menu visible
    if (els.menuWrap) els.menuWrap.style.display = 'block';
    if (els.exerciseWrap) els.exerciseWrap.style.display = 'none';
    if (els.nextBtn) els.nextBtn.disabled = true;

    return {
        /**
         * Voice mode integration point:
         * voice can call this with the correct `answerId`.
         */
        submitAnswer,
        getExpectedAnswerId: () => question?.correctAnswerId || null,
        getCurrentMode: () => mode,
        resetToMenu,
        startInterval: () => startMode('interval'),
        startHarmony: () => startMode('harmony'),
        replay: replayCurrent,
        next: nextQuestion
    };
}
