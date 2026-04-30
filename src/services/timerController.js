import { executeTimerFire } from './timerFireEffect.js';

function formatDurationText(ms) {
    const safeMs = Math.max(1, Number(ms) || 0);
    if (safeMs >= 60000) {
        const minutes = Math.round(safeMs / 60000);
        return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }
    const seconds = Math.max(1, Math.round(safeMs / 1000));
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
}

export function createTimerController(deps = {}) {
    const {
        state,
        storageKey,
        normalizeVoiceTokens = (value) => String(value || '').trim().toLowerCase(),
        localStorageRef = typeof localStorage !== 'undefined' ? localStorage : null,
        documentRef = typeof document !== 'undefined' ? document : null,
        renderActionInSidePanel,
        clearSidePanelContext,
        renderCountdownDisplay,
        updateTimerCorner,
        syncTimerSidePanel,
        clearAlertDisplay,
        showAlertDisplay,
        stopListening,
        speak,
        startAlarmSoundLoop,
        stopAlarmSoundLoop,
        setPersona,
        setRestingEyes,
        startListeningLoop,
        animateMouth,
        speech,
        face,
        faceFrame,
        talkBtn,
    } = deps;

    function getUpcomingTimersSorted() {
        const now = Date.now();
        return (state.timers || [])
            .filter((t) => t && Number.isFinite(t.time) && t.time > now)
            .sort((a, b) => a.time - b.time);
    }

    function getNextTimerDue() {
        if (!Array.isArray(state.timers) || state.timers.length === 0) return null;
        const now = Date.now();
        let next = null;
        for (const t of state.timers) {
            if (!t || !Number.isFinite(t.time) || t.time <= now) continue;
            if (!next || t.time < next.time) next = t;
        }
        return next;
    }

    function persistTimers() {
        try {
            const now = Date.now();
            const payload = (state.timers || [])
                .filter((t) => t && Number.isFinite(t.time) && t.time > now)
                .map((t) => ({
                    text: String(t.text || 'Timer'),
                    time: Number(t.time)
                }));
            localStorageRef?.setItem(storageKey, JSON.stringify(payload));
        } catch (error) {
            console.warn('Timer persistence failed:', error?.message || error);
        }
        const nextReminder = getNextTimerDue();
        state.lastScheduledReminder = nextReminder
            ? { id: nextReminder.id, text: nextReminder.text, time: nextReminder.time }
            : null;
        updateTimerCorner?.();
        renderCountdownDisplay?.();
        syncTimerSidePanel?.();
    }

    function cancelScheduledTimerById(timerId) {
        if (!Array.isArray(state.timers) || !state.timers.length) return null;
        const idx = state.timers.findIndex((timer) => timer?.id === timerId);
        if (idx < 0) return null;
        const [removed] = state.timers.splice(idx, 1);
        try { clearTimeout(timerId); } catch (_) { }
        persistTimers();
        renderCountdownDisplay?.();
        return removed || null;
    }

    function cancelNextScheduledTimer() {
        const next = getNextTimerDue();
        if (!next) return null;
        return cancelScheduledTimerById(next.id);
    }

    function cancelMatchingScheduledTimer(query = '') {
        const needle = normalizeVoiceTokens(String(query || ''));
        if (!needle) return cancelNextScheduledTimer();
        const match = getUpcomingTimersSorted().find((timer) =>
            normalizeVoiceTokens(String(timer?.text || '')).includes(needle)
        );
        if (!match) return null;
        return cancelScheduledTimerById(match.id);
    }

    function clearAllScheduledTimers() {
        const timers = Array.isArray(state.timers) ? [...state.timers] : [];
        if (!timers.length) return 0;
        timers.forEach((timer) => {
            try { clearTimeout(timer?.id); } catch (_) { }
        });
        state.timers = [];
        persistTimers();
        renderCountdownDisplay?.();
        return timers.length;
    }

    function restorePersistedTimers() {
        try {
            const raw = localStorageRef?.getItem(storageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length === 0) return;
            const now = Date.now();
            parsed.forEach((item) => {
                const text = String(item?.text || 'Timer');
                const dueAt = Number(item?.time || 0);
                if (!Number.isFinite(dueAt)) return;
                const ms = Math.max(500, dueAt - now);
                setTimer(text, ms, dueAt);
            });
        } catch (error) {
            console.warn('Timer restore failed:', error?.message || error);
        }
    }

    function dismissActiveAlert(options = {}) {
        const { resumeListening = true, clearVisual = false } = options;
        const activeAlert = state.activeAlert;
        if (activeAlert?.autoClearTimer) clearTimeout(activeAlert.autoClearTimer);
        state.activeAlert = null;
        stopAlarmSoundLoop?.();
        if (clearVisual) clearAlertDisplay?.();
        const nextReminder = getNextTimerDue();
        if (!nextReminder) state.lastScheduledReminder = null;
        updateTimerCorner?.();
        renderCountdownDisplay?.();
        syncTimerSidePanel?.();
        if (!nextReminder) {
            const sidePanel = documentRef?.getElementById('blip-side-panel');
            if (sidePanel && sidePanel.style.display !== 'none' && state.currentSidePanelAction === 'timer') {
                sidePanel.style.display = 'none';
                clearSidePanelContext?.();
            }
        }
        if (!activeAlert) return false;

        speech?.stopSpeaking?.();
        if (speech) speech.isSpeaking = false;
        state.lastSpeechStartedAt = 0;
        animateMouth?.(0);

        if (resumeListening && state.isActive && !state.isThinking && !state.softSleepMode) {
            talkBtn?.classList.remove('thinking', 'listening');
            talkBtn?.classList.add('active');
            if (talkBtn) talkBtn.innerText = 'Ask Blip';
            setPersona?.('listening');
            setRestingEyes?.(false);
            startListeningLoop?.();
        }
        return true;
    }

    function setTimer(text, ms, dueAt = null) {
        const safeMs = Math.max(500, Number(ms) || 0);
        const targetTime = Number.isFinite(dueAt) ? Number(dueAt) : (Date.now() + safeMs);
        console.log(`Timer set for ${safeMs}ms: ${text}`);
        const timerId = setTimeout(async () => {
            if (!state.isActive) state.isActive = true;

            const alertText = `Excuse me Pablo! I have a reminder for you: ${text}`;
            stopListening?.();
            dismissActiveAlert({ resumeListening: false, clearVisual: true });
            const alertId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            executeTimerFire(state, { text, timerId, alertId }, { renderActionInSidePanel });
            showAlertDisplay?.(text, 45000);
            state.isThinking = false;
            documentRef?.body?.classList.remove('thinking-mode');
            face?.classList.remove('thinking', 'listening');
            faceFrame?.classList.remove('listening-glow');
            talkBtn?.classList.remove('thinking', 'listening');
            talkBtn?.classList.add('active');
            if (talkBtn) talkBtn.innerText = 'Alarm';
            setPersona?.('warning');
            setRestingEyes?.(false);
            renderCountdownDisplay?.();
            updateTimerCorner?.();
            startAlarmSoundLoop?.();
            try {
                await speak?.(alertText, 'serious');
            } finally {
                state.timers = state.timers.filter(t => t.id !== timerId);
                persistTimers();
                if (state.activeAlert?.id === alertId) {
                    state.activeAlert.autoClearTimer = setTimeout(() => {
                        if (state.activeAlert?.id === alertId) dismissActiveAlert({ resumeListening: false, clearVisual: true });
                    }, 45000);
                }
                if (state.isActive && !state.activeAlert) startListeningLoop?.();
            }
        }, safeMs);

        const timerEntry = { id: timerId, text, time: targetTime };
        state.timers.push(timerEntry);
        persistTimers();
        renderCountdownDisplay?.();
        return timerEntry;
    }

    function handleTimerAction(request = {}) {
        const ms = Number(request.ms ?? request.tool_params?.ms ?? request.value_ms ?? 0);
        const label = String(request.label || request.tool_params?.label || 'Timer');
        if (!Number.isFinite(ms) || ms <= 0) {
            return { ok: false, text: "I can't set a timer for 0 seconds!" };
        }
        setTimer(label, ms, request.dueAt ?? request.tool_params?.dueAt ?? null);
        const durationText = formatDurationText(ms);
        const reply = (typeof request.text === 'string' && request.text.trim())
            ? request.text.trim()
            : label === 'Timer'
                ? `OK! I've set a timer for ${durationText}.`
                : `OK! I've set a timer for ${label} for ${durationText}.`;
        return { ok: true, text: reply };
    }

    return {
        cancelMatchingScheduledTimer,
        cancelNextScheduledTimer,
        cancelScheduledTimerById,
        clearAllScheduledTimers,
        dismissActiveAlert,
        getNextTimerDue,
        getUpcomingTimersSorted,
        handleTimerAction,
        persistTimers,
        restorePersistedTimers,
        setTimer,
    };
}
