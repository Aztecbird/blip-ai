function normalizeText(value = '') {
    return String(value || '')
        .toLowerCase()
        .replace(/[^\w\s@.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isValidEmail(value = '') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function cleanRecipientReference(fragment = '') {
    const lower = String(fragment || '').toLowerCase().trim();
    // Proactively reject phrases that look like structural field commands for the email tool
    if (
        /^(?:(?:can\s+you\s+)?(?:change|correct|update|set|fix|edit)\s+(?:the\s+)?(?:subject|message|body|text|recipient|email|to))\b/.test(lower)
        || /^(?:subject|message|body|text)\s+(?:is|to)\b/.test(lower)
    ) {
        return '';
    }

    return String(fragment || '')
        .toLowerCase()
        .replace(/[!?,'"()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^(?:send|mail|email)\s+(?:it|this|that)\s+(?:to\s+)?/g, '')
        .replace(/^(?:send|mail|email)\s+to\s+/g, '')
        .replace(/^(?:to\s+)?is\s+/g, '')
        .replace(/^(?:to\s+)?(?:(?:the\s+)?(?:mail|email)\s+)+/, '')
        .replace(/\s+(?:please|pls|thanks|thank you|for me|now)\s*$/g, '')
        .trim();
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

    if (/^(?:email|mail|gmail|inbox)$/.test(recipientQuery)) {
        recipientQuery = '';
        recipient = '';
    }

    return {
        recipient,
        recipientQuery: recipient ? '' : recipientQuery,
        shareType,
        subject,
        quickSend: lower.includes('send ') || lower.startsWith('send')
    };
}

export function extractGmailSaveContactRequest(command = '') {
    const lower = normalizeText(command);
    const match = lower.match(/^(?:save|remember|store)\s+(.+?)\s+as\s+(.+)$/);
    if (!match) return null;
    const alias = String(match[2] || '').trim();
    if (!alias) return null;
    return {
        recipient: extractSpokenEmailAddress(match[1] || ''),
        recipientQuery: extractRecipientReference(match[1] || ''),
        alias
    };
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

export function extractGmailNoteSubjectRequest(command = '') {
    const lower = normalizeText(command);
    const directSubject = lower.match(/^(?:(?:email|mail|note)\s+)?subject\s+(.+)$/);
    if (directSubject) {
        return { subject: String(directSubject[1] || '').trim() };
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
        return { action: 'openInbox' };
    }
    if (
        /^(?:open|show|check|read|view)\s+(?:my\s+)?sent(?:\s+mail|\s+emails?|\s+folder)?$/.test(lower)
        || /^(?:can\s+you\s+)?(?:please\s+)?(?:open|show|check|view)\s+(?:my\s+)?sent(?:\s+mail|\s+emails?|\s+folder)?\b/.test(lower)
    ) {
        return { action: 'openSent' };
    }
    if (/^(?:close|hide|dismiss|exit)\s+(?:my\s+)?(?:gmail|email|mail|inbox)$/.test(lower)) {
        return { action: 'close' };
    }
    if (/^(?:refresh|reload)\s+(?:my\s+)?(?:gmail|email|mail|inbox)$/.test(lower)) {
        return { action: 'refreshInbox' };
    }
    if (/^(?:refresh|reload)\s+(?:my\s+)?sent(?:\s+mail|\s+emails?|\s+folder)?$/.test(lower)) {
        return { action: 'refreshSent' };
    }
    if (
        /^(?:compose|write|send|let\s+s\s+send|let's\s+send)\s+(?:an?\s+)?email$/.test(lower)
        || /^(?:i\s+want\s+to|i\s+need\s+to|help\s+me)\s+(?:send|write|compose)\s+(?:an?\s+)?email$/.test(lower)
        || /^(?:can\s+you|could\s+you|will\s+you|please)\s+(?:send|write|compose)\s+(?:an?\s+)?email$/.test(lower)
    ) {
        return { action: 'compose' };
    }

    const listContacts = extractGmailListContactsRequest(lower);
    if (listContacts) return listContacts;

    const checkContact = extractGmailCheckContactRequest(lower);
    if (checkContact?.alias) return checkContact;

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
    if (shareRequest && (shareRequest.recipient || shareRequest.recipientQuery || shareRequest.shareType || shareRequest.subject)) {
        return { action: 'shareCurrent', ...shareRequest };
    }

    if (/\b(?:save|store|keep|put)\b.*\b(?:notes?|hub|notebook)\b/.test(lower)) {
        return { action: 'saveToNotes' };
    }

    const noteSubject = extractGmailNoteSubjectRequest(lower);
    if (noteSubject?.subject) {
        return { action: 'composeLatestNote', ...noteSubject };
    }

    const sendStatus = extractGmailSendStatusRequest(lower);
    if (sendStatus) return sendStatus;

    return null;
}
