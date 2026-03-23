import { isRecipientNoiseOnly } from './voiceDialog/emailFollowUpParse.js';

function cleanText(text = '') {
    return String(text || '').trim().replace(/\s+/g, ' ');
}

function normalizeText(text = '') {
    let value = cleanText(text).toLowerCase();
    value = value.replace(/\b(i\s+)wanna\b/g, '$1want to');
    const replacements = {
        'e-mail': 'email',
        'telegram message': 'telegram',
        'text message': 'telegram',
    };
    Object.entries(replacements).forEach(([from, to]) => {
        value = value.replaceAll(from, to);
    });
    // Match gmailVoice ASR fixes so parseNaturalMessageFlow agrees with getGmailVoiceCommand
    value = value.replace(/\b(send|write|compose)\s+and\s+email\b/g, '$1 an email');
    value = value.replace(/\b(i\s+want|i\s+need)\s+(send|write|compose)\s+(an?\s+)?email\b/g, '$1 to $2 $3email');
    value = value.replace(/[^\w\s@.]/g, ' ').replace(/\s+/g, ' ').trim();
    return value;
}

function extractEmail(text = '') {
    const match = String(text || '').match(/[\w.-]+@[\w.-]+\.\w+/);
    return match ? match[0] : '';
}

function stripLeadingSayTell(message = '') {
    return cleanText(String(message || '')
        .replace(/^(?:tell\s+(?:him|her|them)\s+)/i, '')
        .replace(/^(?:say\s+)/i, '')
        .replace(/^(?:write\s*:?\s*)/i, ''));
}

function parseSubject(text = '') {
    const normalized = normalizeText(text);
    if (/^(?:no subject|skip|empty|none|nothing)$/.test(normalized)) return '';
    const match = String(text || '').match(/(?:subject\s*(?:is|:)?\s*)(.+)$/i);
    return match?.[1] ? cleanText(match[1]) : null;
}

function parseMessageFromCommand(text = '') {
    const patterns = [
        /saying\s+(.+)$/i,
        /message\s+(.+)$/i,
        /tell\s+(?:him|her|them)\s+(.+)$/i,
        /say\s+(.+)$/i,
        /write\s*:?\s*(.+)$/i,
    ];
    for (const pattern of patterns) {
        const match = String(text || '').match(pattern);
        if (match?.[1]) return stripLeadingSayTell(match[1]);
    }
    return '';
}

/** Exported for tests — resolves "… to name@…" / "… to Mom" without mistaking "email to send" for recipient "send". */
export function parseRecipientAfterTo(text = '') {
    const t = cleanText(String(text || ''));
    const re = /\bto\s+([a-zA-Z0-9@._-]+(?:\.[a-zA-Z]{2,})?)/gi;
    let m;
    while ((m = re.exec(t)) !== null) {
        const before = t.slice(0, m.index);
        // Skip infinitive "to" (want to, need to, …) so "I want to send email" is not "to: send"
        if (/\b(?:want|need|going|have|like|supposed)\s+$/i.test(before)) continue;
        const candidate = m[1] ? cleanText(m[1]) : '';
        // "compose email to send" — infinitive, not recipient "send" (but "send email to bob@…" is valid)
        if (
            candidate
            && /^(?:send|sending|mail|email|compose|write|draft)$/i.test(candidate)
            && /\b(?:email|mail|compose|draft|letter)\s+$/i.test(before.trim())
        ) {
            continue;
        }
        if (!candidate) continue;
        if (isRecipientNoiseOnly(candidate)) continue;
        return candidate;
    }
    return '';
}

/** Tell Joy … / Text Joy … — common spoken Telegram fragments */
function parseTellSomeoneMessage(raw = '') {
    const m = String(raw || '').match(/^(?:tell|text)\s+([a-zA-Z0-9@._-]+)\s+(.+)$/i);
    if (!m?.[1] || !m?.[2]) return null;
    return { chatId: cleanText(m[1]), text: stripLeadingSayTell(m[2]) };
}

/**
 * @param {object} [context]
 * @param {string} [context.activePanel] e.g. 'gmail' | 'telegram'
 */
export function parseNaturalMessageFlow(rawText = '', context = {}) {
    const raw = cleanText(rawText);
    const text = normalizeText(raw);
    if (!text) return null;

    const activePanel = String(context.activePanel || '');

    if (activePanel === 'telegram') {
        const tell = parseTellSomeoneMessage(raw);
        if (tell?.chatId) {
            return {
                channel: 'telegram',
                action: 'compose',
                draft: { chatId: tell.chatId, text: tell.text || '' }
            };
        }
    }

    const gmailTriggers = [
        'send email', 'compose email', 'write email', 'write an email', 'email please',
        'i need to email', 'i want to email', 'can you send an email', 'open draft in email',
        'open gmail', 'email tool', 'mail tool', 'send an email'
    ];
    const telegramTriggers = [
        'send telegram', 'compose telegram', 'send message',
        'telegram', 'message ', 'text someone'
    ];

    const hasGmailIntent = text.includes('email') || gmailTriggers.some((trigger) => text.includes(trigger));
    const messageOnTelegramMatch = raw.match(/\bmessage\s+(\S+)\s+on\s+telegram(?:\s+(.+))?$/i);
    const hasTelegramIntent = !text.includes('email') && (
        Boolean(messageOnTelegramMatch)
        || text.includes('telegram')
        || text.includes('send message')
        || /^message\s+/i.test(text)
        || telegramTriggers.some((trigger) => text.includes(trigger))
    );

    if (hasGmailIntent) {
        // Bare compose intents — must run before draft parsing (avoid mis-parsing "want to" as recipient)
        if (
            /^(?:send|compose|write)\s+(?:an?\s+)?email(?:\s+(?:please|thanks|thank you|now|ok|okay))?$/i.test(text)
            || /^(?:i\s+)?(?:want|need)\s+to\s+(?:send|write|compose)\s+(?:an?\s+)?email(?:\s+(?:please|thanks|thank you|now|ok|okay))?$/i.test(text)
            || /^i\s+would\s+like\s+to\s+(?:send|write|compose)\s+(?:an?\s+)?email(?:\s+(?:please|thanks|thank you|now|ok|okay))?$/i.test(text)
            || /^(?:i\s+)?(?:want|need)\s+(?:send|write|compose)\s+(?:an?\s+)?email(?:\s+(?:please|thanks|thank you|now|ok|okay))?$/i.test(text)
            || /^(?:can\s+i|could\s+i|may\s+i)\s+(?:to\s+)?(?:send|write|compose)\s+(?:an?\s+)?email(?:\s+(?:please|thanks|thank you|now|ok|okay))?$/i.test(text)
        ) {
            return { channel: 'gmail', action: 'compose', draft: { to: '', subject: '', text: '' } };
        }
        if (
            /^(?:open|show|launch)\s+(?:my\s+)?gmail(?:\s+(?:please|thanks))?$/.test(text)
            || /^(?:open|show|launch)\s+(?:the\s+)?(?:email|mail)\s+(?:tool|compose|panel|side\s+panel)(?:\s+(?:please|thanks))?$/.test(text)
        ) {
            return { channel: 'gmail', action: 'compose', draft: { to: '', subject: '', text: '' } };
        }
        let parsedTo = extractEmail(raw) || parseRecipientAfterTo(raw) || '';
        if (parsedTo && isRecipientNoiseOnly(parsedTo)) parsedTo = '';
        const draft = {
            to: parsedTo,
            subject: parseSubject(raw),
            text: parseMessageFromCommand(raw) || ''
        };
        if (!draft.to && /^(?:send|compose|write)\s+(?:an?\s+)?email$/i.test(text)) {
            return { channel: 'gmail', action: 'compose', draft: { to: '', subject: '', text: '' } };
        }
        if (draft.to || draft.subject !== null || draft.text) {
            return {
                channel: 'gmail',
                action: 'compose',
                draft: {
                    to: draft.to,
                    subject: draft.subject == null ? '' : draft.subject,
                    text: draft.text
                }
            };
        }
    }

    if (hasTelegramIntent) {
        let recipient = parseRecipientAfterTo(raw);
        let message = parseMessageFromCommand(raw);

        if (messageOnTelegramMatch?.[1]) {
            recipient = cleanText(messageOnTelegramMatch[1]);
            message = stripLeadingSayTell(messageOnTelegramMatch[2] || message || '');
        }

        if (!recipient && !message) {
            const tell = parseTellSomeoneMessage(raw);
            if (tell) {
                recipient = tell.chatId;
                message = tell.text;
            }
        }

        if (!recipient) {
            const compactMatch = raw.match(/(?:telegram|message)\s+([a-zA-Z0-9._-]+)\s+(.+)/i);
            if (compactMatch?.[1] && compactMatch?.[2]) {
                recipient = cleanText(compactMatch[1]);
                message = stripLeadingSayTell(compactMatch[2]);
            }
        }

        if (!recipient && !message && /^(?:send|write|compose)\s+telegram$/i.test(text)) {
            return { channel: 'telegram', action: 'compose', draft: { chatId: '', text: '' } };
        }

        if (recipient || message) {
            return {
                channel: 'telegram',
                action: 'compose',
                draft: {
                    chatId: recipient,
                    text: message
                }
            };
        }
    }

    return null;
}
