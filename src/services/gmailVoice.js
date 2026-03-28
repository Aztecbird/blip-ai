import { normalizeVoiceCommandText } from './textParsing.js';

function normalizeText(value = '') {
    let s = normalizeVoiceCommandText(value)
        .replace(/\b(i\s+)wanna\b/g, '$1want to')
        .replace(/\b(i\s+)gonna\b/g, '$1going to')
        .replace(/\be-mail\b/g, 'email');
    // ASR: "send and email" for "send an email"
    s = s.replace(/\b(send|write|compose)\s+and\s+email\b/g, '$1 an email');
    // ASR: "i want send email" missing "to"
    s = s.replace(/\b(i\s+want|i\s+need)\s+(send|write|compose)\s+(an?\s+)?email\b/g, '$1 to $2 $3email');
    return s
        .replace(/[^\w\s@.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isValidEmail(value = '') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function cleanRecipientReference(fragment = '') {
    let s = String(fragment || '')
        .toLowerCase()
        .replace(/[!?,'"()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\.+$/g, '')
        .trim()
        .replace(/^(?:send|mail|email)\s+(?:it|this|that)\s+(?:to\s+)?/g, '')
        .replace(/^(?:send|mail|email)\s+to\s+/g, '')
        .replace(/^(?:to\s+)?is\s+/g, '')
        .replace(/^(?:to\s+)?(?:(?:the\s+)?(?:mail|email)\s+)+/, '')
        .replace(/\s+(?:please|pls|thanks|thank you|for me|now)\s*$/g, '')
        .trim();

    // ASR often merges "no / I / just / send it" into a bogus recipient fragment.
    const sendOnlyWhole = /^(?:no\s+)?(?:i\s+)?just\s+send(?:\s+it)?$/;
    if (sendOnlyWhole.test(s)) return '';
    if (/^no\s+just\s+send(?:\s+it)?$/.test(s)) return '';
    if (/^i\s+just\s+send(?:\s+it)?$/.test(s)) return '';
    if (/^(?:and\s+)?just\s+send(?:\s+it)?$/.test(s)) return '';
    if (/^send(?:\s+it)?$/.test(s)) return '';
    if (/^go\s+(?:on\s+)?send(?:\s+it)?$/.test(s)) return '';
    if (/^now\s+send(?:\s+it)?$/.test(s)) return '';

    let prev;
    do {
        prev = s;
        s = s
            .replace(/^(?:no\s+)?(?:i\s+)?just\s+send(?:\s+it)?(?:\s+to\s+)?/, '')
            .replace(/^no\s+just\s+send(?:\s+it)?(?:\s+to\s+)?/, '')
            .replace(/^i\s+just\s+send(?:\s+it)?(?:\s+to\s+)?/, '')
            .replace(/^(?:and\s+)?just\s+send(?:\s+it)?(?:\s+to\s+)?/, '')
            .replace(/^(?:please\s+)?go\s+(?:on\s+)?send(?:\s+it)?(?:\s+to\s+)?/, '')
            .replace(/^now\s+send(?:\s+it)?(?:\s+to\s+)?/, '')
            .trim();
    } while (s !== prev);

    s = s
        .replace(/\s+(?:no\s+)?(?:i\s+)?just\s+send(?:\s+it)?$/, '')
        .replace(/\s+(?:and\s+)?just\s+send(?:\s+it)?$/, '')
        .replace(/\s+just\s+send(?:\s+it)?$/, '')
        .trim();

    return s;
}

export function extractSpokenEmailAddress(fragment = '') {
    const cleaned = cleanRecipientReference(fragment)
        .replace(/^(?:no\s+)?(?:the\s+)?recipient(?:\s+is|\s+to)?\s+/g, '')
        .replace(/^(?:in\s+)?(?:the\s+)?address(?:\s+is)?\s+/g, '')
        .replace(/^this\s+/g, '')
        .trim();

    const normalizeCandidate = (value = '') => String(value || '')
        .toLowerCase()
        .replace(/\s+(?:dot|point|period)\s+/g, '.')
        .replace(/\s+at\s+/g, '@')
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9@._+-]/g, '')
        .trim();

    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (tokens.length > 1) {
        for (let start = 0; start < tokens.length; start += 1) {
            for (let end = start + 1; end <= Math.min(tokens.length, start + 8); end += 1) {
                const candidate = normalizeCandidate(tokens.slice(start, end).join(' '));
                if (isValidEmail(candidate)) return candidate;
            }
        }
    }

    const direct = normalizeCandidate(cleaned);
    if (isValidEmail(direct)) return direct;

    return '';
}

export function extractRecipientReference(fragment = '') {
    return cleanRecipientReference(fragment);
}

function wordToNumber(token = '') {
    const map = {
        one: 1,
        two: 2,
        to: 2,
        too: 2,
        three: 3,
        four: 4,
        for: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
        eleven: 11,
        twelve: 12
    };
    if (/^\d+$/.test(token)) return Number(token);
    return map[token] || 0;
}

export function extractGmailDirectSendRequest(command = '') {
    const lower = normalizeText(command);
    const directMatch = lower.match(/^(?:send|draft|write|compose)\s+(?:an?\s+)?email\s+to\s+([^\s]+@[\w.-]+\.\w+)(?:\s+(?:with\s+)?subject\s+(.+?))?(?:\s+(?:(?:with\s+(?:the\s+)?)?(?:message|body)|saying|that says|saying that)\s+(.+))?$/);
    if (directMatch) {
        return {
            to: String(directMatch[1] || '').trim(),
            subject: String(directMatch[2] || '').trim(),
            text: String(directMatch[3] || '').trim()
        };
    }

    const spokenMatch = lower.match(/^(?:send|draft|write|compose)\s+(?:an?\s+)?email(?:\s+from\s+.+?)?\s+to\s+(.+?)(?:\s+(?:with\s+)?subject\s+(.+?))?(?:\s+(?:(?:with\s+(?:the\s+)?)?(?:message|body)|saying|that says|saying that)\s+(.+))?$/);
    if (!spokenMatch) return null;
    const recipientQuery = extractRecipientReference(spokenMatch[1] || '');
    const recipient = extractSpokenEmailAddress(recipientQuery);
    if (!recipient && !recipientQuery) return null;
    return {
        to: recipient,
        recipientQuery: recipient ? '' : recipientQuery,
        subject: String(spokenMatch[2] || '').trim(),
        text: String(spokenMatch[3] || '').trim()
    };
}

export function extractGmailShareRecipientRequest(command = '') {
    const lower = normalizeText(command);
    if (/\btelegram\b/.test(lower)) return null;
    const prefixMatch = lower.match(/^(?:send|email|mail|share)\s+(.+)$/);
    if (!prefixMatch) return null;

    let rest = String(prefixMatch[1] || '').trim();
    let shareType = 'auto';
    let subject = '';

    const explicitTypeMatch = rest.match(/^(?:this\s+)?(note|email|message|video|youtube|link|photo|foto|picture|image|date|calendar|event)\b/);
    if (explicitTypeMatch) {
        shareType = String(explicitTypeMatch[1] || '').trim() || 'auto';
        rest = rest.slice(explicitTypeMatch[0].length).trim();
    } else {
        const pronounMatch = rest.match(/^(this|it|that)\b/);
        if (!pronounMatch) return null;
        rest = rest.slice(pronounMatch[0].length).trim();
        rest = rest.replace(/^(?:note|email|message|video|youtube|link|photo|foto|picture|image|date|calendar|event)\b/, '').trim();
    }

    // Commands like "send photo in email" should stay in the email flow,
    // not treat "in email" as if it were the recipient.
    rest = rest
        .replace(/^(?:in|on|via|with)\s+(?:the\s+)?(?:email|mail|gmail)\b/, '')
        .replace(/\b(?:in|on|via|with)\s+(?:the\s+)?(?:email|mail|gmail)\b$/, '')
        .trim();

    const subjectMatch = rest.match(/\bsubject\s+(.+)$/);
    if (subjectMatch) {
        subject = String(subjectMatch[1] || '').trim();
        rest = rest.slice(0, subjectMatch.index).trim();
    }

    rest = rest.replace(/^from\s+.+?(?=\s+to\s+|$)/, '').trim();

    let recipient = '';
    let recipientQuery = '';
    if (/^to\s+/.test(rest)) {
        recipientQuery = extractRecipientReference(rest.replace(/^to\s+/, ''));
        recipient = extractSpokenEmailAddress(recipientQuery);
    } else if (rest) {
        recipientQuery = extractRecipientReference(rest);
        recipient = extractSpokenEmailAddress(recipientQuery);
    }

    // Bare "send it" / "share that" with no thing to share, no recipient, no subject — not a new
    // context share (prevents shareCurrent from re-opening compose when the user means send/confirm).
    if (
        shareType === 'auto'
        && !recipient
        && !recipientQuery
        && !subject
        && !String(rest || '').trim()
    ) {
        return null;
    }

    return {
        recipient,
        recipientQuery: recipient ? '' : recipientQuery,
        shareType,
        subject,
        quickSend: lower.includes('send ') || lower.startsWith('send')
    };
}

/** Spoken left-hand side means “use the address in the To field / current draft.” */
function isSaveContactDraftReference(fragment = '') {
    const t = String(fragment || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    return /^(?:this|the)\s+(?:recipient|address|email|to\s+field)$/.test(t)
        || /^this\s+to$/.test(t);
}

export function extractGmailSaveContactRequest(command = '') {
    const lower = normalizeText(command);
    const match = lower.match(/^(?:save|remember|store)\s+(.+?)\s+as\s+(.+)$/);
    if (!match) return null;
    const alias = String(match[2] || '').trim();
    if (!alias) return null;
    const leftRaw = String(match[1] || '').trim();
    if (isSaveContactDraftReference(leftRaw)) {
        return {
            recipient: '',
            recipientQuery: '',
            alias
        };
    }
    return {
        recipient: extractSpokenEmailAddress(leftRaw),
        recipientQuery: extractRecipientReference(leftRaw),
        alias
    };
}

export function extractGmailClearContactsRequest(command = '') {
    const lower = normalizeText(command);
    if (
        /^(?:clear|reset|erase)\s+(?:my\s+)?(?:saved\s+)?(?:email\s+|mail\s+)?contacts$/.test(lower)
        || /^(?:clear|reset|erase)\s+(?:my\s+)?(?:saved\s+)?(?:email\s+|mail\s+)?addresses$/.test(lower)
        || /^(?:clear|reset)\s+(?:my\s+)?(?:email\s+)?contact\s+list$/.test(lower)
        || /^(?:forget|remove|delete)\s+(?:all\s+)?(?:my\s+)?(?:saved\s+)?(?:email\s+|mail\s+)?(?:contacts|addresses)$/.test(lower)
    ) {
        return { action: 'clearContacts' };
    }
    return null;
}

export function extractGmailListContactsRequest(command = '') {
    const lower = normalizeText(command);
    if (
        /^(?:who\s+do\s+you\s+know\s+in\s+(?:email|mail))$/.test(lower)
        || /^(?:show|list|read|tell\s+me)\s+(?:my\s+)?(?:email|mail)\s+(?:contacts|addresses|people)$/.test(lower)
        || /^(?:what|which)\s+(?:email|mail)\s+(?:contacts|addresses)\s+do\s+you\s+know$/.test(lower)
    ) {
        return { action: 'listContacts' };
    }
    return null;
}

export function extractGmailCheckContactRequest(command = '') {
    const lower = normalizeText(command);
    const patterns = [
        /^(?:do\s+you\s+have|do\s+you\s+know|have\s+you\s+got)\s+(.+?)\s+(?:email|mail|address)$/,
        /^(?:what\s+is|what\s+s|whats|tell\s+me)\s+(.+?)\s+(?:email|mail|address)$/,
        /^(?:do\s+you\s+have|do\s+you\s+know)\s+(?:the\s+)?(?:email|mail|address)\s+(?:for\s+)?(.+)$/,
        /^(?:have|know)\s+(.+?)\s+(?:email|mail|address)$/
    ];

    for (const pattern of patterns) {
        const match = lower.match(pattern);
        if (!match) continue;
        const alias = extractRecipientReference(match[1] || '');
        if (!alias) return null;
        return { action: 'checkContact', alias };
    }

    return null;
}

/**
 * Email subject line only: "subject is …" / "subject: …".
 * Also "note subject is …" — speech often inserts "note" before "subject is …"; that is not compose-from-note.
 */
export function extractGmailSubjectLineOnly(command = '') {
    const lower = normalizeText(command);
    const misheardNote = lower.match(/^note\s+subject\s+is\s+(.+)$/);
    if (misheardNote) {
        const subject = String(misheardNote[1] || '').trim();
        return subject ? { subject } : null;
    }
    // Require "is" or ":" so "subject shopping list" (compose-from-note) is not grabbed here
    const direct = lower.match(/^subject\s*(?:is|:)\s+(.+)$/);
    if (direct) {
        const subject = String(direct[1] || '').trim();
        return subject ? { subject } : null;
    }
    return null;
}

export function extractGmailNoteSubjectRequest(command = '') {
    const lower = normalizeText(command);
    // "note subject is …" is handled by extractGmailSubjectLineOnly (email subject), not a saved note
    if (/^note\s+subject\s+is\s+/.test(lower)) {
        return null;
    }
    // Require "note subject …" (without "is" right after) for compose-from-note
    const noteSubjectLine = lower.match(/^note\s+subject\s+(.+)$/);
    if (noteSubjectLine) {
        return { subject: String(noteSubjectLine[1] || '').trim() };
    }
    const noteSubject = lower.match(/^(?:send|email|mail|share)\s+(?:this\s+)?note\s+subject\s+(.+)$/);
    if (noteSubject) {
        return { subject: String(noteSubject[1] || '').trim() };
    }
    return null;
}

export function extractGmailSendStatusRequest(command = '') {
    const lower = normalizeText(command);
    if (
        /^(?:did\s+you\s+send(?:\s+it)?|was\s+it\s+sent|did\s+that\s+send)$/.test(lower)
        || /^(?:how\s+can\s+i\s+confirm|how\s+do\s+i\s+confirm|can\s+you\s+confirm|can\s+you\s+verify)\b/.test(lower)
        || /^(?:open|show)\s+(?:sent|sent\s+mail|sent\s+folder)$/.test(lower)
    ) {
        return { action: 'sendStatus' };
    }
    return null;
}

export function getGmailVoiceCommand(command = '') {
    const lower = normalizeText(command);
    if (!lower) return null;

    // Put saved-draft → Email UI handoff BEFORE generic "open + email tool" (openInbox), which only loads inbox
    // and leaves compose empty when the draft lived in conversation / lastGmailDraft.
    const strictOpenDraftHandoff = (
        /^(?:save|keep|store|use|show|open|load|fill)\b[\s\w]{0,40}\bdrafts?\b[\s\w]{0,40}\b(?:email|mail|inbox|tool|client)\b/.test(lower)
        || /^(?:fill|load)\s+(?:the\s+)?(?:email|mail)(?:\s+tool|\s+client)?\s+with\s+(?:the\s+)?drafts?$/.test(lower)
        || /^(?:open|show)\s+(?:the\s+)?drafts?(?:\s+in|\s+inside)?\s+(?:the\s+)?(?:email|mail)(?:\s+tool|\s+client)?$/.test(lower)
        || /^(?:(?:can you|could you|please|will you)\s+)?(?:save|keep|store)\s+this\s+as\s+(?:a\s+)?drafts?(?:\s+and\s+open\s+(?:the\s+)?(?:email|mail|gmail)(?:\s+tool|\s+client)?)?$/.test(lower)
    );
    const naturalOpenDraftHandoff = (
        /\bdrafts?\b/.test(lower)
        && /\b(?:email|mail|gmail)\b/.test(lower)
        && !/^send\s+(?:an?\s+)?email\s+to\s+/.test(lower)
        && (
            (
                /\b(?:save|keep|store)\b/.test(lower)
                && /\b(?:this|that|it)\b/.test(lower)
                && /\bas\b/.test(lower)
                && /\b(?:open|show|load|fill)\b/.test(lower)
            )
            || (
                /\bfill\b/.test(lower)
                && /\bdrafts?\b/.test(lower)
            )
            || (
                /\b(?:open|show|load|restore|apply|sync)\b/.test(lower)
                && /\bdrafts?\b/.test(lower)
                && /\b(?:tool|panel|client|composer|inbox)\b/.test(lower)
            )
        )
    );
    if (strictOpenDraftHandoff || naturalOpenDraftHandoff) {
        return { action: 'openDraft' };
    }

    if (/^(?:connect|sign in to|login to|log in to|link)\s+(?:my\s+)?(?:gmail|google mail|email)$/.test(lower)) {
        return { action: 'connect' };
    }
    if (/^(?:disconnect|sign out of|logout of|log out of|unlink)\s+(?:my\s+)?(?:gmail|google mail|email)$/.test(lower)) {
        return { action: 'disconnect' };
    }
    const readMatch = lower.match(/^(?:open|read|show|view)\s+(?:the\s+)?(?:email|message)\s+(\d{1,2}|one|two|to|too|three|four|for|five|six|seven|eight|nine|ten|eleven|twelve)$/);
    if (readMatch) {
        const index = wordToNumber(readMatch[1]);
        if (index > 0) return { action: 'readIndex', index };
    }

    if (
        /^(?:open|show|check|read|view)\s+(?:my\s+)?(?:gmail|email|mail|inbox)$/.test(lower)
        || /^(?:check\s+my\s+email|check\s+email)$/.test(lower)
        || /^(?:can\s+you\s+)?(?:please\s+)?(?:open|show|check|view)\s+(?:my\s+)?(?:gmail|email|mail|inbox)\b/.test(lower)
        || (/\b(?:open|show|check|view)\b/.test(lower) && /\b(?:gmail|email|mail|inbox|mail tool|email tool|mail client|email client)\b/.test(lower))
    ) {
        if (/\b(?:verify|verify it|check|read|show me|see|look at|list)\b/.test(lower) || /\binbox\b/.test(lower)) {
            return { action: 'openInbox' };
        }
        return { action: 'openEmail' };
    }
    if (
        /^(?:open|show|check|read|view)\s+(?:my\s+)?sent(?:\s+mail|\s+emails?|\s+folder)?$/.test(lower)
        || /^(?:can\s+you\s+)?(?:please\s+)?(?:open|show|check|view)\s+(?:my\s+)?sent(?:\s+mail|\s+emails?|\s+folder)?\b/.test(lower)
    ) {
        return { action: 'openSent' };
    }
    if (
        /^(?:close|hide|dismiss|exit)\s+(?:my\s+)?(?:gmail|google\s+mail|email|mail|inbox|sent|draft|drafts)$/.test(lower)
        || /^(?:close|hide|dismiss|exit)\s+(?:my\s+)?(?:sent\s+mail|sent\s+emails?|sent\s+folder)$/.test(lower)
    ) {
        return { action: 'close' };
    }
    if (/^(?:refresh|reload)\s+(?:my\s+)?(?:gmail|email|mail|inbox)$/.test(lower)) {
        return { action: 'refreshInbox' };
    }
    if (/^(?:refresh|reload)\s+(?:my\s+)?sent(?:\s+mail|\s+emails?|\s+folder)?$/.test(lower)) {
        return { action: 'refreshSent' };
    }
    const tail = '(?:\\s+(?:please|thanks|thank you|now|already|ok|okay))?';
    if (
        new RegExp(`^(?:compose|write)\\s+(?:an?\\s+)?email${tail}$`).test(lower)
        || new RegExp(`^(?:send)\\s+(?:an?\\s+)?email${tail}$`).test(lower)
        || new RegExp(`^(?:i\\s+want\\s+to|i\\s+need\\s+to|i\\s+would\\s+like\\s+to|help\\s+me)\\s+(?:send|write|compose)\\s+(?:an?\\s+)?email${tail}$`).test(lower)
        || new RegExp(`^(?:can\\s+you|could\\s+you|will\\s+you|please)\\s+(?:send|write|compose)\\s+(?:an?\\s+)?email${tail}$`).test(lower)
        || new RegExp(`^(?:can\\s+i|could\\s+i|may\\s+i)\\s+(?:to\\s+)?(?:send|write|compose)\\s+(?:an?\\s+)?email${tail}$`).test(lower)
    ) {
        return { action: 'compose' };
    }

    const needToEmail = lower.match(/^(?:i\s+need\s+to|i\s+want\s+to)\s+email\s+(.+)$/);
    if (needToEmail) {
        const recipientQuery = extractRecipientReference(needToEmail[1] || '');
        const to = extractSpokenEmailAddress(recipientQuery);
        if (to || recipientQuery) {
            return {
                action: 'compose',
                draft: {
                    to: to,
                    recipientQuery: to ? '' : recipientQuery,
                    subject: '',
                    text: ''
                }
            };
        }
    }

    const bareEmailTo = lower.match(/^email\s+(.+)$/);
    if (bareEmailTo) {
        const tail = String(bareEmailTo[1] || '').trim();
        if (tail && !/^(please|thanks|thank you|now|ok|okay|blip)$/i.test(tail)) {
            const recipientQuery = extractRecipientReference(tail);
            const to = extractSpokenEmailAddress(recipientQuery);
            if (to || recipientQuery) {
                return {
                    action: 'compose',
                    draft: {
                        to: to,
                        recipientQuery: to ? '' : recipientQuery,
                        subject: '',
                        text: ''
                    }
                };
            }
        }
    }

    const listContacts = extractGmailListContactsRequest(lower);
    if (listContacts) return listContacts;

    const checkContact = extractGmailCheckContactRequest(lower);
    if (checkContact?.alias) return checkContact;

    const clearContacts = extractGmailClearContactsRequest(lower);
    if (clearContacts?.action === 'clearContacts') return clearContacts;

    const saveContact = extractGmailSaveContactRequest(lower);
    if (saveContact?.alias) {
        return { action: 'saveContact', ...saveContact };
    }

    const directSend = extractGmailDirectSendRequest(lower);
    if (directSend?.to || directSend?.recipientQuery) {
        if (directSend.subject || directSend.text) {
            return { action: 'sendDirect', ...directSend };
        }
        return { action: 'compose', draft: directSend };
    }

    const shareRequest = extractGmailShareRecipientRequest(lower);
    const hasShareTarget = Boolean(
        shareRequest
        && (
            shareRequest.recipient
            || shareRequest.recipientQuery
            || shareRequest.subject
            || (shareRequest.shareType && shareRequest.shareType !== 'auto')
        )
    );
    if (hasShareTarget) {
        return { action: 'shareCurrent', ...shareRequest };
    }

    const subjectLineOnly = extractGmailSubjectLineOnly(lower);
    if (subjectLineOnly?.subject) {
        return { action: 'setSubject', subject: subjectLineOnly.subject };
    }

    const noteSubject = extractGmailNoteSubjectRequest(lower);
    if (noteSubject?.subject) {
        return { action: 'composeLatestNote', ...noteSubject };
    }

    const sendStatus = extractGmailSendStatusRequest(lower);
    if (sendStatus) return sendStatus;

    // Short mailbox phrases (voice-first panel)
    if (/^(?:inbox|my inbox)$/.test(lower)) return { action: 'openInbox' };
    if (/^(?:sent|my sent|sent folder)$/.test(lower)) return { action: 'openSent' };
    if (
        /^(?:show\s+me\s+)?(?:the\s+)?(?:email\s+)?list$/.test(lower)
        || /^show\s+(?:my\s+)?(?:mail|email)$/.test(lower)
    ) {
        return { action: 'openInbox' };
    }

    return null;
}
