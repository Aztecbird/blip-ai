import { BLIP_TOOLS } from '../types.js';

function clean(text = '') {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

function extractTimerMinutes(text = '') {
  const m = text.match(/\b(?:for\s+)?(\d{1,3})\s*(?:minutes|min)\b/i);
  if (!m) return null;
  return Number(m[1]);
}

function detectTone(text = '') {
  const t = clean(text).toLowerCase();
  if (/\b(quick|hurry|fast|asap|now)\b/.test(t)) return 'urgent';
  if (/\b(sad|upset|worried|scared|anxious)\b/.test(t)) return 'stressed';
  if (/\b(fun|play|joke|haha)\b/.test(t)) return 'playful';
  return 'neutral';
}

export function createIntentInterpreter(options = {}) {
  const ruleParsers = Array.isArray(options.ruleParsers) ? options.ruleParsers : [];
  const reasoningParser = typeof options.reasoningParser === 'function' ? options.reasoningParser : null;

  function parseRules(utterance, context = {}) {
    const text = clean(utterance);
    const lower = text.toLowerCase();

    for (const parser of ruleParsers) {
      const parsed = parser(text, context);
      if (parsed) return parsed;
    }

    if (/^close everything\b/.test(lower)) {
      return {
        intent: 'close_all',
        tool: BLIP_TOOLS.SYSTEM,
        entities: {},
        ambiguous: false,
        confidence: 0.95,
        source: 'rules',
      };
    }

    if (/^close\b/.test(lower)) {
      return {
        intent: 'close_active',
        tool: BLIP_TOOLS.SYSTEM,
        entities: {},
        ambiguous: true,
        confidence: 0.56,
        source: 'rules',
      };
    }

    if (/set timer\b/.test(lower)) {
      const minutes = extractTimerMinutes(text);
      return {
        intent: 'timer_set',
        tool: BLIP_TOOLS.TIMER,
        entities: { minutes },
        ambiguous: !minutes,
        confidence: minutes ? 0.92 : 0.45,
        source: 'rules',
      };
    }

    if (/\b(open|show).*\bcalendar\b/.test(lower)) {
      const when = /\btomorrow\b/.test(lower) ? 'tomorrow' : '';
      return {
        intent: 'calendar_open',
        tool: BLIP_TOOLS.CALENDAR,
        entities: { when },
        ambiguous: false,
        confidence: 0.88,
        source: 'rules',
      };
    }

    if (/\b(take|save|write).*\bnote\b/.test(lower)) {
      return {
        intent: 'note_create',
        tool: BLIP_TOOLS.NOTES,
        entities: {},
        ambiguous: false,
        confidence: 0.82,
        source: 'rules',
      };
    }

    if (/\b(video|youtube)\b/.test(lower)) {
      return {
        intent: 'youtube_search',
        tool: BLIP_TOOLS.YOUTUBE,
        entities: { topic: text.replace(/^.*\bfor\b/i, '').trim() },
        ambiguous: false,
        confidence: 0.74,
        source: 'rules',
      };
    }

    if (/\b(send|tell|message)\b/.test(lower)) {
      return {
        intent: 'message_send',
        tool: BLIP_TOOLS.TELEGRAM,
        entities: {},
        ambiguous: true,
        confidence: 0.55,
        source: 'rules',
      };
    }

    return {
      intent: 'chat',
      tool: BLIP_TOOLS.CHAT,
      entities: {},
      ambiguous: false,
      confidence: 0.65,
      source: 'fallback',
    };
  }

  async function interpret(utterance = '', context = {}) {
    const text = clean(utterance);
    const followUp = context.followUp || null;
    const ruleResult = parseRules(text, context);
    const userTone = detectTone(text);

    if (!reasoningParser || (!ruleResult.ambiguous && ruleResult.confidence >= 0.7)) {
      return { ...ruleResult, userTone, followUp };
    }

    const aiResult = await reasoningParser({
      utterance: text,
      context,
      fallback: ruleResult,
      userTone,
    });
    if (!aiResult) return { ...ruleResult, userTone, followUp };

    return {
      ...ruleResult,
      ...aiResult,
      userTone,
      source: aiResult.source || 'reasoning',
      followUp,
    };
  }

  return { interpret, parseRules };
}
