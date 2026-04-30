const MONTHS = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
];

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function normalizeCalendarVoiceText(text = '') {
    return String(text || '')
        .toLowerCase()
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function startOfDay(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseCalendarDayNumberReference(text = '') {
    const lower = normalizeCalendarVoiceText(text);
    const dayMatch = lower.match(
        /\b(?:day\s+(\d{1,2})|the\s+(\d{1,2})(?:st|nd|rd|th)|(\d{1,2})(?:st|nd|rd|th))\b/i
    );
    const dayNumber = dayMatch
        ? parseInt(dayMatch[1] || dayMatch[2] || dayMatch[3], 10)
        : null;
    return Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= 31 ? dayNumber : null;
}

export function parseCalendarMonthDayReference(text = '', referenceDate = new Date()) {
    const lower = normalizeCalendarVoiceText(text);
    const monthPattern = MONTHS.join('|');
    const monthFirst = lower.match(new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i'));
    const dayFirst = lower.match(new RegExp(`\\b(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+of)?\\s+(${monthPattern})\\b`, 'i'));
    const day = Number(monthFirst?.[2] || dayFirst?.[1] || 0);
    const monthName = monthFirst?.[1] || dayFirst?.[2] || '';
    const monthIndex = MONTHS.indexOf(monthName);
    if (!Number.isInteger(day) || day < 1 || day > 31 || monthIndex < 0) return null;

    const base = referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime()) ? referenceDate : new Date();
    const resolved = new Date(base.getFullYear(), monthIndex, day);
    if (Number.isNaN(resolved.getTime()) || resolved.getMonth() !== monthIndex) return null;
    return startOfDay(resolved);
}

export function parseCalendarRelativeWeekdayReference(text = '', referenceDate = new Date()) {
    const lower = normalizeCalendarVoiceText(text);
    const match = lower.match(/\b(?:this|next|on)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
    if (!match?.[1]) return null;

    const base = startOfDay(referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime()) ? referenceDate : new Date());
    const wanted = WEEKDAYS.indexOf(match[1]);
    if (wanted < 0) return null;

    let offset = (wanted - base.getDay() + 7) % 7;
    if (offset === 0 || /\bnext\s+/.test(lower)) offset += 7;
    const resolved = new Date(base);
    resolved.setDate(base.getDate() + offset);
    return resolved;
}

export function parseCalendarVoiceDateReference(text = '', options = {}) {
    const referenceDate = options.referenceDate instanceof Date && !Number.isNaN(options.referenceDate.getTime())
        ? options.referenceDate
        : new Date();

    const monthDay = parseCalendarMonthDayReference(text, referenceDate);
    if (monthDay) return monthDay;

    const relativeWeekday = parseCalendarRelativeWeekdayReference(text, referenceDate);
    if (relativeWeekday) return relativeWeekday;

    const dayNumber = parseCalendarDayNumberReference(text);
    if (dayNumber) {
        const resolved = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), dayNumber);
        if (!Number.isNaN(resolved.getTime()) && resolved.getMonth() === referenceDate.getMonth()) {
            return startOfDay(resolved);
        }
    }

    return null;
}
