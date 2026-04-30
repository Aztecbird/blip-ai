function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function nextWeekdayAt(now, weekday, hour, minute) {
  const base = startOfLocalDay(now);
  const cur = base.getDay();
  let delta = (weekday - cur + 7) % 7;
  const candidate = new Date(base.getTime());
  candidate.setDate(candidate.getDate() + delta);
  candidate.setHours(hour, minute, 0, 0);
  if (delta === 0 && candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 7);
  }
  return candidate;
}

function parseTimeFromText(text = '') {
  const lower = String(text || '').toLowerCase();
  const match = lower.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const ap = match[3].replace(/\./g, '').toLowerCase();
  if (ap.startsWith('p') && hour < 12) hour += 12;
  if (ap.startsWith('a') && hour === 12) hour = 0;
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute > 59) return null;
  return { hour, minute };
}

function parseDateFromText(text = '', entities = {}) {
  const lower = String(text || '').toLowerCase();
  const now = new Date();

  const explicit = parseMonthDayReferenceFromText(lower);
  if (explicit) return explicit;

  if (entities.date_reference === 'today' || /\btoday\b/.test(lower)) {
    return startOfLocalDay(now);
  }
  if (entities.date_reference === 'tomorrow' || /\btomorrow\b/.test(lower)) {
    const d = startOfLocalDay(now);
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (/\byesterday\b/.test(lower)) {
    const d = startOfLocalDay(now);
    d.setDate(d.getDate() - 1);
    return d;
  }

  const weekdayMatch = lower.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (weekdayMatch) {
    const names = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    return nextWeekdayAt(now, names[weekdayMatch[1]], 9, 0);
  }

  return null;
}

function parseMonthDayReferenceFromText(lower = '') {
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const firstPattern = lower.match(/\bday\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
  const secondPattern = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  const thirdPattern = lower.match(/\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)(?:\s+of)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
  const dayNumber = Number(firstPattern?.[1] || secondPattern?.[2] || thirdPattern?.[1] || 0);
  const monthName = firstPattern?.[2] || secondPattern?.[1] || thirdPattern?.[2] || '';
  const monthIndex = months.indexOf(monthName);
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31 || monthIndex < 0) return null;

  const now = new Date();
  const year = now.getFullYear();
  const date = new Date(year, monthIndex, dayNumber);
  if (Number.isNaN(date.getTime()) || date.getMonth() !== monthIndex) return null;
  return date;
}

function extractTitleFromText(text = '') {
  let cleaned = String(text || '').toLowerCase();
  cleaned = cleaned.replace(/\b(?:place|put|add|create|schedule|book|set|make)\b/g, ' ');
  cleaned = cleaned.replace(/\b(?:in|on|to|for|my|the|a|an)\b/g, ' ');
  cleaned = cleaned.replace(/\b(?:calendar|event|meeting|appointment|agenda)\b/g, ' ');
  cleaned = cleaned.replace(/\b(?:today|tomorrow|yesterday|tonight)\b/g, ' ');
  cleaned = cleaned.replace(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g, ' ');
  cleaned = cleaned.replace(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/g, ' ');
  cleaned = cleaned.replace(/\b\d{1,2}(?:st|nd|rd|th)?\b/g, ' ');
  cleaned = cleaned.replace(/\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\b/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (!cleaned) return '';
  return cleaned.replace(/^\w/, (c) => c.toUpperCase());
}

function buildListInput(utterance, entities) {
  const now = new Date();
  const date = parseDateFromText(utterance, entities);
  if (date) {
    return {
      timeMin: startOfLocalDay(date).toISOString(),
      timeMax: endOfLocalDay(date).toISOString(),
      maxResults: 8,
      singleEvents: true,
      orderBy: 'startTime',
    };
  }
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    maxResults: 8,
    singleEvents: true,
    orderBy: 'startTime',
  };
}

function buildCreateInput(utterance, entities) {
  const time = parseTimeFromText(utterance);
  const date = parseDateFromText(utterance, entities);
  const title = entities.quoted_text || entities.subject || entities.body || extractTitleFromText(utterance);

  if (!date || !time || !title) {
    return {
      input: null,
      missing: {
        date: !date,
        time: !time,
        title: !title,
      },
    };
  }

  const start = new Date(date.getTime());
  start.setHours(time.hour, time.minute, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  return {
    input: {
      summary: title,
      start: start.toISOString(),
      end: end.toISOString(),
    },
    missing: null,
  };
}

export function createArcadeParser() {
  function parse({ utterance = '', entities = {}, frame = 'direct_command' }) {
    const lower = String(utterance || '').toLowerCase();
    if (!/\b(calendar|schedule|event|meeting|agenda)\b/.test(lower)) return null;

    const isDelete = /\b(delete|remove|cancel)\b/.test(lower);
    const isCreate = /\b(create|add|schedule|book|set|send|place|put)\b/.test(lower);
    const action = isDelete ? 'delete' : isCreate ? 'create' : 'list';

    let tool_name = 'GoogleCalendar.ListEvents';
    let input_data = {};
    let clarification_question = null;

    if (action === 'list') {
      tool_name = 'GoogleCalendar.ListEvents';
      input_data = buildListInput(utterance, entities);
    } else if (action === 'create') {
      tool_name = 'GoogleCalendar.CreateEvent';
      const built = buildCreateInput(utterance, entities);
      input_data = built.input || {};
      if (built.missing) {
        if (built.missing.title) {
          clarification_question = 'What should the event be called?';
        } else if (built.missing.date || built.missing.time) {
          clarification_question = 'What day and time should I schedule it for?';
        }
      }
    } else if (action === 'delete') {
      tool_name = 'GoogleCalendar.DeleteEvent';
      clarification_question = 'Which event should I delete?';
    }

    return {
      tool: 'arcade',
      intent_type: `calendar.${action}`,
      conversation_frame: frame,
      confidence: 0.82,
      extracted_entities: {
        tool_name,
        input_data,
      },
      shared_objects_out: [],
      repairable_fields: ['tool_name', 'inputs'],
      follow_up_needed: Boolean(clarification_question),
      clarification_question,
      action,
    };
  }

  return { parse };
}
