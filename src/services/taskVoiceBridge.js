/**
 * Connects parseTaskCommand() to Blip timers (voice path).
 * Pure helper + side-effects via callbacks — keeps main.js thin.
 */

import { parseTaskCommand } from './taskParser.js';

const MIN_CONFIDENCE = {
    create_task: 0.5,
    list_tasks: 0.55,
    list_tasks_today: 0.55,
    delete_task: 0.55,
    complete_task: 0.4,
    unknown: 1
};

function formatDueReply(iso, now) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const isTomorrow = d.getFullYear() === tomorrow.getFullYear()
        && d.getMonth() === tomorrow.getMonth()
        && d.getDate() === tomorrow.getDate();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const isToday = d.getFullYear() === today.getFullYear()
        && d.getMonth() === today.getMonth()
        && d.getDate() === today.getDate();
    const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    if (isToday) return `today at ${timeStr}`;
    if (isTomorrow) return `tomorrow at ${timeStr}`;
    return `${d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} at ${timeStr}`;
}

function upcomingInLocalDay(timers, dayStart, dayEnd) {
    return (timers || []).filter((t) => {
        const ts = Number(t?.time || 0);
        return Number.isFinite(ts) && ts >= dayStart && ts <= dayEnd;
    });
}

/**
 * @param {string} utterance
 * @param {object} ctx
 * @param {Date} [ctx.now]
 * @param {() => Array<{ id: *, text: string, time: number }>} ctx.getUpcomingTimersSorted
 * @param {(text: string, ms: number, dueAt?: number) => void} ctx.setBlipTimer
 * @param {(ref: string) => *} ctx.cancelMatchingScheduledTimer
 * @param {(id: *) => *} [ctx.cancelScheduledTimerById]
 * @returns {{ handled: boolean, text?: string, mood?: string, taskParse?: object }}
 */
export function tryHandleTaskVoiceCommand(utterance, ctx = {}) {
    const now = ctx.now instanceof Date ? ctx.now : new Date();
    const parsed = parseTaskCommand(utterance, now);
    const min = MIN_CONFIDENCE[parsed.intent] ?? 0.55;
    if (parsed.intent === 'unknown' || parsed.confidence < min) {
        return { handled: false, taskParse: parsed };
    }

    const getTimers = typeof ctx.getUpcomingTimersSorted === 'function'
        ? ctx.getUpcomingTimersSorted
        : () => [];

    if (parsed.intent === 'list_tasks_today') {
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
        const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
        const todays = upcomingInLocalDay(getTimers(), dayStart, dayEnd);
        const n = todays.length;
        const text = n === 0
            ? 'You have no reminders scheduled for today.'
            : `You have ${n} task${n === 1 ? '' : 's'} today.`;
        return { handled: true, text, mood: 'happy', taskParse: parsed };
    }

    if (parsed.intent === 'list_tasks') {
        const upcoming = getTimers().filter((t) => Number(t?.time) > Date.now());
        const n = upcoming.length;
        const text = n === 0
            ? 'You have no upcoming reminders.'
            : `You have ${n} upcoming reminder${n === 1 ? '' : 's'}.`;
        return { handled: true, text, mood: 'happy', taskParse: parsed };
    }

    if (parsed.intent === 'delete_task' || parsed.intent === 'complete_task') {
        const ref = String(parsed.referenceText || '').trim();
        if (!ref) {
            const verb = parsed.intent === 'delete_task' ? 'remove' : 'complete';
            return {
                handled: true,
                text: `Say which reminder to ${verb}, for example the title or topic.`,
                mood: 'serious',
                taskParse: parsed
            };
        }
        const removed = ctx.cancelMatchingScheduledTimer(ref);
        if (!removed) {
            return {
                handled: true,
                text: 'I could not find a matching upcoming reminder.',
                mood: 'serious',
                taskParse: parsed
            };
        }
        const text = parsed.intent === 'delete_task'
            ? 'Okay, I removed that reminder.'
            : 'I marked that task done.';
        return { handled: true, text, mood: 'happy', taskParse: parsed };
    }

    if (parsed.intent === 'create_task') {
        const dueMs = Date.parse(parsed.dueAt || '');
        if (!Number.isFinite(dueMs)) {
            return {
                handled: true,
                text: 'I could not understand that date or time.',
                mood: 'serious',
                taskParse: parsed
            };
        }
        const ms = dueMs - now.getTime();
        if (ms < 30 * 1000) {
            return {
                handled: true,
                text: 'That time is too soon; try at least half a minute from now.',
                mood: 'serious',
                taskParse: parsed
            };
        }
        const title = String(parsed.title || 'Reminder').trim() || 'Reminder';
        ctx.setBlipTimer(title, ms, dueMs);
        let text = `Okay, I will remind you ${formatDueReply(parsed.dueAt, now)}.`;
        if (parsed.recurrence) {
            text += ' First of the repeating schedule is set.';
        }
        return { handled: true, text, mood: 'happy', taskParse: parsed };
    }

    return { handled: false, taskParse: parsed };
}

export { parseTaskCommand };
