function extractPerson(utterance = '') {
  const match = utterance.match(/\b(?:to|for|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (match) return match[1];

  const directAddressMatch = utterance.match(/^(?:email|mail|gmail|message|telegram|text)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
  return directAddressMatch ? directAddressMatch[1] : null;
}

function extractQuotedText(utterance = '') {
  const match = utterance.match(/"([^"]+)"/);
  return match ? match[1] : null;
}

function extractDuration(utterance = '') {
  const minuteMatch = utterance.match(/\b(\d{1,3})\s*(minutes?|mins?)\b/i);
  if (minuteMatch) return { value: Number(minuteMatch[1]), unit: 'minutes' };

  const secondMatch = utterance.match(/\b(\d{1,4})\s*(seconds?|secs?)\b/i);
  if (secondMatch) return { value: Number(secondMatch[1]), unit: 'seconds' };

  return null;
}

function extractDateReference(utterance = '') {
  const lower = utterance.toLowerCase();
  if (lower.includes('tomorrow morning')) return 'tomorrow_morning';
  if (lower.includes('tomorrow')) return 'tomorrow';
  if (lower.includes('today')) return 'today';
  if (lower.includes('yesterday')) return 'yesterday';
  return null;
}

export function createEntityExtractor() {
  function extract(utterance = '') {
    const text = String(utterance || '').trim();
    const lower = text.toLowerCase();
    const entities = {};

    const recipient = extractPerson(text);
    if (recipient) entities.recipient = recipient;

    const quotedText = extractQuotedText(text);
    if (quotedText) {
      if (/\b(?:message|telegram|text)\b/i.test(text)) entities.message = quotedText;
      else if (/\b(?:email|mail|gmail)\b/i.test(text)) entities.body = quotedText;
      else entities.quoted_text = quotedText;
    }

    const duration = extractDuration(text);
    if (duration) entities.duration = duration;

    const date_reference = extractDateReference(text);
    if (date_reference) entities.date_reference = date_reference;

    if (/\bweather in\b/i.test(text)) {
      entities.location = text.replace(/^.*weather in\s+/i, '').trim();
    }

    if (/\bsubject\b/i.test(lower)) {
      const subject = text.replace(/^.*subject\s+/i, '').trim();
      if (subject) entities.subject = subject;
    }

    if (/\bsearch youtube for\b/i.test(lower)) {
      entities.query = text.replace(/^.*search youtube for\s+/i, '').trim();
    } else if (/\bfind\b.+\bnote\b/i.test(lower)) {
      entities.query = text.replace(/^.*find\s+/i, '').replace(/\s+note.*$/i, '').trim() || text;
    }

    if (/\bemail instead\b/i.test(lower)) entities.channel_switch = 'gmail';
    if (/\btelegram instead\b/i.test(lower)) entities.channel_switch = 'telegram';

    if (/\b(second|2nd)\b/.test(lower)) entities.ordinal = 2;
    if (/\b(first|1st)\b/.test(lower)) entities.ordinal = 1;

    if (/\bhim\b/.test(lower)) entities.pronoun = 'him';
    if (/\bher\b/.test(lower)) entities.pronoun = 'her';
    if (/\bit\b/.test(lower)) entities.object_pronoun = 'it';

    return entities;
  }

  return { extract };
}
