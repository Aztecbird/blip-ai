/**
 * Rule-first task / reminder parser for Blip.
 * Uses the Date passed as `now` for wall-clock math in the **local timezone**
 * of the runtime (browser or Node). Output `dueAt` is ISO-8601 UTC.
 * A future `timezone` option can replace local getters with an IANA zone.
 */

const DEFAULT_MORNING_HOUR = 9;
const DEFAULT_EVENING_HOUR = 18;
const DEFAULT_NIGHT_HOUR = 21;

const WEEK_INDEX = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
};

const MONTH_INDEX = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
    may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
    sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
};

function cleanText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

function clampConfidence(x) {
    const n = Number(x);
    if (!Number.isFinite(n)) return 0;
    return Math.min(1, Math.max(0, n));
}

function pad2(n) {
    return String(n).padStart(2, '0');
}

function toTimeString(hour, minute) {
    return `${pad2(hour)}:${pad2(minute)}`;
}

function dateToIsoUtc(d) {
    try {
        if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
        return d.toISOString();
    } catch (_) {
        return null;
    }
}

/** Start of local calendar day for `d`. */
function startOfLocalDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addLocalDays(d, days) {
    const x = new Date(d.getTime());
    x.setDate(x.getDate() + days);
    return x;
}

/**
 * Next occurrence of weekday (0–6) at hour|minute on or after `now`.
 * If `allowToday` and today's slot still in the future, use today.
 */
function nextWeekdayAt(now, weekday, hour, minute) {
    const cur = now.getDay();
    let delta = (weekday - cur + 7) % 7;
    const candidate = addLocalDays(startOfLocalDay(now), delta);
    candidate.setHours(hour, minute, 0, 0);
    if (delta === 0 && candidate.getTime() <= now.getTime()) {
        candidate.setDate(candidate.getDate() + 7);
    }
    return candidate;
}

function nextDailyAt(now, hour, minute) {
    const base = startOfLocalDay(now);
    base.setHours(hour, minute, 0, 0);
    if (base.getTime() <= now.getTime()) {
        base.setDate(base.getDate() + 1);
    }
    return base;
}

/**
 * Parse "at 9", "9 am", "9pm", "9 tonight", "21:30".
 * Returns { hour, minute, isPmHint } or null.
 */
function parseTimeFragment(text, opts = {}) {
    const t = String(text || '').trim().toLowerCase();
    const tonight = /\btonight\b/.test(t);

    let m = t.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i);
    if (m) {
        let h = Number(m[1]);
        const min = m[2] != null ? Number(m[2]) : 0;
        const ap = m[3].replace(/\./g, '').toLowerCase();
        if (!Number.isFinite(h) || !Number.isFinite(min) || min > 59) return null;
        if (ap.startsWith('p') && h < 12) h += 12;
        if (ap.startsWith('a') && h === 12) h = 0;
        return { hour: h, minute: min, isPmHint: ap.startsWith('p') };
    }

    m = t.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\b/);
    if (m) {
        let h = Number(m[1]);
        const min = m[2] != null ? Number(m[2]) : 0;
        if (!Number.isFinite(h) || !Number.isFinite(min) || min > 59) return null;
        if (tonight) {
            if (h < 12) h += 12;
            return { hour: h, minute: min, isPmHint: true };
        }
        if (h < 12 && opts.preferPm === true) {
            return { hour: h + 12, minute: min, isPmHint: true };
        }
        return { hour: h, minute: min, isPmHint: false };
    }

    return null;
}

/**
 * Extract first time match from string; remove matched span from working copy via callback.
 */
function extractTimeFromString(lower, notes) {
    const patterns = [
        /\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\b/i,
        /\b(?:at\s+)\d{1,2}(?::\d{2})?\b(?!\s*(?:a\.?m\.?|p\.?m\.?))/i,
        /\b\d{1,2}\s+tonight\b/i
    ];
    for (const re of patterns) {
        const m = lower.match(re);
        if (m) {
            const parsed = parseTimeFragment(m[0], { preferPm: /\btonight\b/.test(m[0]) });
            if (parsed) return { parsed, match: m[0] };
        }
    }
    const loose = lower.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\b/);
    if (loose) {
        const parsed = parseTimeFragment(loose[0], {});
        if (parsed) return { parsed, match: loose[0] };
    }
    notes.push('No explicit time found. Defaulted to 09:00.');
    return { parsed: { hour: DEFAULT_MORNING_HOUR, minute: 0, isPmHint: false }, match: '' };
}

function monthDayFromMatch(m, notes, now) {
    // m groups: (1) month or day, (2) day or month depending pattern
    const g1 = (m[1] || '').toLowerCase();
    const g2 = (m[2] || '').toLowerCase();
    let month;
    let day;
    if (MONTH_INDEX[g1] != null) {
        month = MONTH_INDEX[g1];
        day = Number(g2);
    } else if (MONTH_INDEX[g2] != null) {
        month = MONTH_INDEX[g2];
        day = Number(g1);
    } else {
        return null;
    }
    if (!Number.isFinite(day) || day < 1 || day > 31) {
        notes.push('Date looked invalid; not applied.');
        return null;
    }
    let year = now.getFullYear();
    let candidate = new Date(year, month, day, 0, 0, 0, 0);
    if (candidate < startOfLocalDay(now)) {
        year += 1;
        candidate = new Date(year, month, day, 0, 0, 0, 0);
    }
    if (Number.isNaN(candidate.getTime())) {
        notes.push('Could not resolve calendar date.');
        return null;
    }
    return candidate;
}

function extractDateAnchor(lower, now, notes) {
    if (/\bin\s+\d+\s*(?:minute|hour)/.test(lower)) return { kind: 'relative', match: '' };

    if (/\btoday\b/.test(lower)) {
        const d = startOfLocalDay(now);
        return { kind: 'day', date: d, match: 'today' };
    }
    if (/\btomorrow\b/.test(lower)) {
        const d = addLocalDays(startOfLocalDay(now), 1);
        return { kind: 'day', date: d, match: 'tomorrow' };
    }
    if (/\bthis\s+evening\b/.test(lower) || /\bthis\s+night\b/.test(lower)) {
        const h = DEFAULT_EVENING_HOUR;
        let d = startOfLocalDay(now);
        d.setHours(h, 0, 0, 0);
        if (d.getTime() <= now.getTime()) {
            d = addLocalDays(d, 1);
            notes.push('This evening already passed; used tomorrow evening.');
        }
        return { kind: 'exact', date: d, match: 'this evening' };
    }
    if (/\btonight\b/.test(lower) && !/\b\d{1,2}\s+tonight\b/.test(lower)) {
        const h = DEFAULT_NIGHT_HOUR;
        let d = startOfLocalDay(now);
        d.setHours(h, 0, 0, 0);
        if (d.getTime() <= now.getTime()) {
            d = addLocalDays(d, 1);
            notes.push('Tonight already passed; used tomorrow night.');
        }
        return { kind: 'exact', date: d, match: 'tonight' };
    }

    const onDay = lower.match(/\bon\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    if (onDay) {
        const wd = WEEK_INDEX[onDay[1]];
        notes.push('Weekday without time of day: defaulted to 09:00.');
        const anchor = nextWeekdayAt(now, wd, DEFAULT_MORNING_HOUR, 0);
        return { kind: 'exact', date: anchor, match: onDay[0] };
    }

    const md1 = lower.match(/\b(?:on\s+)?(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
    const md2 = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/i);
    const cal = md1 || md2;
    if (cal) {
        const base = monthDayFromMatch(cal, notes, now);
        if (!base) return { kind: 'none', match: '' };
        return { kind: 'calendar', date: base, match: cal[0] };
    }

    return { kind: 'none', match: '' };
}

function extractRecurrencePrefix(lower, notes) {
    let recurrence = null;
    let stripped = lower;

    const reWeekly = /^every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b\s*/i;
    const mW = stripped.match(reWeekly);
    if (mW) {
        const wd = WEEK_INDEX[mW[1].toLowerCase()];
        recurrence = { type: 'weekly', interval: 1, byWeekday: [wd], time: toTimeString(DEFAULT_MORNING_HOUR, 0) };
        stripped = stripped.slice(mW[0].length);
    } else if (/^every\s+day\b/i.test(stripped)) {
        recurrence = { type: 'daily', interval: 1, time: toTimeString(DEFAULT_MORNING_HOUR, 0) };
        stripped = stripped.replace(/^every\s+day\s*/i, '');
    } else if (/^every\s+morning\b/i.test(stripped)) {
        recurrence = { type: 'daily', interval: 1, time: toTimeString(DEFAULT_MORNING_HOUR, 0) };
        stripped = stripped.replace(/^every\s+morning\s*/i, '');
    } else if (/^every\s+evening\b/i.test(stripped)) {
        recurrence = { type: 'daily', interval: 1, time: toTimeString(DEFAULT_EVENING_HOUR, 0) };
        stripped = stripped.replace(/^every\s+evening\s*/i, '');
    }

    if (!recurrence) return { recurrence: null, lowerRest: stripped };

    let timeMatch = stripped.match(/^\s*(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*/i);
    if (!timeMatch) {
        timeMatch = stripped.match(/\b(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b/i);
    }
    if (timeMatch) {
        const frag = parseTimeFragment(timeMatch[0], {});
        if (frag) {
            recurrence = { ...recurrence, time: toTimeString(frag.hour, frag.minute) };
            const at = timeMatch.index ?? stripped.indexOf(timeMatch[0]);
            if (at === 0 || at === stripped.search(/\S/)) {
                stripped = stripped.slice(at + timeMatch[0].length);
            }
        }
    }

    if (recurrence) {
        notes.push('Recurring rule: scheduling the first occurrence only for now.');
    }

    return { recurrence, lowerRest: stripped.trim() };
}

function extractRelativeDue(lower, now, notes) {
    const relMin = lower.match(/\bin\s+(\d+)\s*minutes?\b/i);
    if (relMin) {
        const n = Number(relMin[1]);
        if (Number.isFinite(n) && n >= 0) {
            const d = new Date(now.getTime() + n * 60 * 1000);
            return { date: d, consumed: relMin[0] };
        }
        notes.push('Invalid minute offset.');
    }
    const relHr = lower.match(/\bin\s+(\d+)\s*hours?\b/i);
    if (relHr) {
        const n = Number(relHr[1]);
        if (Number.isFinite(n) && n >= 0) {
            const d = new Date(now.getTime() + n * 60 * 60 * 1000);
            return { date: d, consumed: relHr[0] };
        }
    }
    return null;
}

function mergeDateAndTime(anchor, timePart, now, notes) {
    if (!anchor) return null;
    if (anchor.kind === 'relative') return null;

    let baseDate;
    if (anchor.kind === 'day') {
        baseDate = new Date(anchor.date);
    } else if (anchor.kind === 'calendar') {
        baseDate = new Date(anchor.date);
    } else if (anchor.kind === 'exact') {
        return new Date(anchor.date);
    } else {
        return null;
    }

    if (!timePart || !timePart.parsed) {
        baseDate.setHours(DEFAULT_MORNING_HOUR, 0, 0, 0);
        return baseDate;
    }

    const { hour, minute } = timePart.parsed;

    if (anchor.kind === 'calendar') {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hour, minute, 0, 0);
        if (d.getTime() <= now.getTime()) {
            notes.push('That date and time have passed; moved to next year.');
            d.setFullYear(d.getFullYear() + 1);
        }
        return d;
    }

    baseDate.setHours(hour, minute, 0, 0);
    if (anchor.kind === 'day' && baseDate.getTime() <= now.getTime()) {
        notes.push('That time already passed today; moved to tomorrow.');
        baseDate.setDate(baseDate.getDate() + 1);
    }
    return baseDate;
}

function stripFillerForTitle(s) {
    return cleanText(
        String(s || '')
            .replace(/^(?:please\s+|can you\s+|could you\s+)/i, '')
            .replace(/\b(?:remind me|reminder to|set\s+(?:a\s+)?reminder\s*(?:for)?|set\s+reminder\s*(?:for)?)\b/gi, '')
            .replace(/\btask\s+for\b/gi, '')
            .replace(/\b(?:the|a|an)\s+reminder\s+(?:for|to)\b/gi, '')
    );
}

function extractTitleFromRemainder(lower, consumedFragments) {
    let t = lower;
    for (const frag of consumedFragments) {
        if (frag) t = t.replace(new RegExp(frag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ');
    }
    t = stripFillerForTitle(t);
    t = t.replace(/\b(?:to|for|about)\s+/i, ' ').trim();
    t = t.replace(/^[\s,:.-]+/, '').trim();
    t = cleanText(t);
    if (!t) return '';
    const stop = t.search(/\b(?:at|on|in|tomorrow|today|every|am\b|pm\b|\d{1,2}:\d{2})\b/i);
    if (stop > 0) t = cleanText(t.slice(0, stop));
    return t;
}

function extractReferencePhrase(lower) {
    const m = lower.match(/\b(?:for|about|to)\s+(?:the\s+)?(.+)$/i);
    if (m && m[1]) return cleanText(m[1].replace(/[.!?]+$/, ''));
    return null;
}

function blankResult(rawText, overrides = {}) {
    return {
        intent: 'unknown',
        confidence: 0,
        action: 'none',
        rawText: cleanText(rawText),
        title: null,
        dueAt: null,
        recurrence: null,
        filters: null,
        referenceText: null,
        errors: [],
        notes: [],
        ...overrides
    };
}

function tryParseListIntent(lower, rawText) {
    const hasTaskWord = /\b(?:tasks?|to-?dos?|reminders?)\b/.test(lower);
    const listCue = /^(?:what|which|show|list|tell me|give me|do i have)\b/.test(lower)
        || /\bshow\s+(?:me\s+)?(?:my\s+)?/.test(lower);

    if (!listCue && !/\bdo i have anything\b/.test(lower)) return null;

    const today = /\btoday\b/.test(lower) || /\btoday'?s\b/.test(lower) || /\banything\s+today\b/.test(lower);
    if (today && (hasTaskWord || /\banything\b/.test(lower))) {
        return {
            intent: 'list_tasks_today',
            action: 'list_today',
            confidence: 0.88,
            filters: { today: true }
        };
    }

    if (hasTaskWord || /\breminders?\b/.test(lower)) {
        return {
            intent: 'list_tasks',
            action: 'list',
            confidence: 0.84,
            filters: { upcoming: true }
        };
    }

    return null;
}

function tryParseDeleteIntent(lower, rawText) {
    if (!/\b(?:delete|remove|cancel)\b/.test(lower)) return null;
    if (!/\b(?:reminder|reminders|task|tasks)\b/.test(lower) && !/\bcancel\s+reminder\b/.test(lower)) return null;

    const ref = extractReferencePhrase(lower);
    return {
        intent: 'delete_task',
        action: 'delete',
        confidence: ref ? 0.86 : 0.62,
        referenceText: ref,
        notes: ref ? [] : ['Could not identify a specific task reference for deletion.']
    };
}

function tryParseCompleteIntent(lower, rawText) {
    const markDone = /\bmark\b.*\b(?:done|complete)\b/.test(lower)
        || /\bcomplete\b.*\b(?:reminder|task)\b/.test(lower)
        || /\b(?:finished|i\s+did)\b.*\b(?:task|reminder)\b/.test(lower);

    if (!markDone) return null;

    const ref = extractReferencePhrase(lower) || extractRefAbout(lower);
    return {
        intent: 'complete_task',
        action: 'complete',
        confidence: ref ? 0.85 : 0.44,
        referenceText: ref,
        notes: ref ? [] : ['No specific task reference; user may need to name the reminder.']
    };
}

function extractRefAbout(lower) {
    const m = lower.match(/\b(?:about|for)\s+(.+)$/i);
    return m ? cleanText(m[1].replace(/[.!?]+$/, '')) : null;
}

function firstDueForRecurrence(recurrence, now, notes) {
    if (!recurrence) return null;
    const [hh, mm] = String(recurrence.time || '09:00').split(':').map(Number);
    if (recurrence.type === 'daily') {
        return nextDailyAt(now, hh, mm);
    }
    if (recurrence.type === 'weekly' && recurrence.byWeekday?.length) {
        const wd = recurrence.byWeekday[0];
        return nextWeekdayAt(now, wd, hh, mm);
    }
    return null;
}

/**
 * Exported API
 */
export function parseTaskCommand(text, now = new Date()) {
    const rawText = cleanText(text);
    const errors = [];
    const notes = [];

    if (!rawText) {
        return blankResult(rawText, { errors: ['Empty input'] });
    }

    const lowerFull = rawText.toLowerCase();

    const listHit = tryParseListIntent(lowerFull, rawText);
    if (listHit) {
        return {
            ...blankResult(rawText),
            ...listHit,
            confidence: clampConfidence(listHit.confidence),
            notes
        };
    }

    const delHit = tryParseDeleteIntent(lowerFull, rawText);
    if (delHit) {
        return {
            ...blankResult(rawText),
            ...delHit,
            confidence: clampConfidence(delHit.confidence),
            notes: [...notes, ...delHit.notes || []]
        };
    }

    const compHit = tryParseCompleteIntent(lowerFull, rawText);
    if (compHit) {
        return {
            ...blankResult(rawText),
            ...compHit,
            confidence: clampConfidence(compHit.confidence),
            notes: [...notes, ...compHit.notes || []]
        };
    }

    const createCue = /\b(?:remind|reminder)\b/.test(lowerFull)
        || /^task\s+for\b/i.test(lowerFull)
        || /^every\s+(?:day|morning|evening|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(lowerFull);

    if (!createCue) {
        return blankResult(rawText, { confidence: 0.12 });
    }

    let lower = lowerFull;
    const consumed = [];

    const { recurrence, lowerRest } = extractRecurrencePrefix(lower, notes);
    lower = lowerRest || lower;
    if (recurrence && !/^remind/.test(lower) && !/^task\s+for/.test(lower)) {
        lower = lower.replace(/^(?:me\s+)?/i, '').trim();
    }

    const rel = extractRelativeDue(lower, now, notes);
    let dueDate = null;
    if (rel) {
        dueDate = rel.date;
        consumed.push(rel.consumed);
    } else if (recurrence) {
        dueDate = firstDueForRecurrence(recurrence, now, notes);
    } else {
        const anchor = extractDateAnchor(lower, now, notes);
        let timePart = extractTimeFromString(lower, notes);
        if (anchor.kind === 'none' && timePart.parsed) {
            let guess = startOfLocalDay(now);
            guess.setHours(timePart.parsed.hour, timePart.parsed.minute, 0, 0);
            if (guess.getTime() <= now.getTime()) {
                guess = addLocalDays(guess, 1);
                notes.push('Date not specified. Assumed next valid occurrence for the given time.');
            }
            dueDate = guess;
            if (timePart.match) consumed.push(timePart.match);
        } else if (anchor.kind === 'calendar') {
            if (timePart.match) consumed.push(timePart.match);
            dueDate = mergeDateAndTime(anchor, timePart, now, notes);
            consumed.push(anchor.match);
        } else if (anchor.kind === 'day') {
            if (timePart.match) consumed.push(timePart.match);
            dueDate = mergeDateAndTime(anchor, timePart, now, notes);
            consumed.push(anchor.match);
        } else if (anchor.kind === 'exact') {
            consumed.push(anchor.match);
            dueDate = anchor.date;
        }
    }

    if (!dueDate) {
        errors.push('Could not resolve a due time.');
        return blankResult(rawText, {
            intent: 'unknown',
            confidence: 0.25,
            errors,
            notes,
            recurrence
        });
    }

    const iso = dateToIsoUtc(dueDate);
    if (!iso) {
        errors.push('Invalid due date');
        return blankResult(rawText, { errors, notes });
    }

    const setRm = lower.match(/\bset\s+(?:a\s+)?reminder\s+for\b/i)?.[0];
    if (setRm) consumed.push(setRm);
    consumed.push(
        lower.match(/\bremind(?:\s+me)?\b/i)?.[0],
        lower.match(/^task\s+for\b/i)?.[0]
    );

    let title = extractTitleFromRemainder(lower, consumed.filter(Boolean));

    if (!title && recurrence) {
        title = extractTitleFromRemainder(lower.replace(/^every\s+[\s\S]+?\b(remind me\s+)?/i, ''), []);
    }

    if (!title) {
        notes.push('Title missing; using generic label.');
        title = 'Reminder';
    }

    let confidence = 0.55;
    if (rel) confidence += 0.12;
    if (title && title !== 'Reminder') confidence += 0.15;
    if (iso) confidence += 0.1;
    if (recurrence) confidence += 0.05;
    confidence = clampConfidence(confidence);

    return {
        intent: 'create_task',
        action: 'create',
        confidence,
        rawText,
        title,
        dueAt: iso,
        recurrence,
        filters: null,
        referenceText: null,
        errors,
        notes
    };
}

export const _taskParserInternals = {
    WEEK_INDEX,
    nextWeekdayAt,
    nextDailyAt,
    parseTimeFragment
};
