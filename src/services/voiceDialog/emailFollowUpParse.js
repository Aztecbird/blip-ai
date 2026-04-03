import { extractRecipientReference, extractSpokenEmailAddress } from '../gmailVoice.js';
import { normalizeVoiceUtterance } from './utterance.js';

/** Single-word (or "to send"-style) mistakes that must never become the To field. */
const EMAIL_RECIPIENT_NOISE_WORDS = new Set([
    'send', 'sends', 'sending', 'sent', 'mail', 'email', 'emails', 'gmail', 'inbox', 'draft', 'drafts',
    'telegram',
    'subject', 'subjects', 'message', 'messages', 'body', 'to', 'from', 'cc', 'bcc',
    'yes', 'no', 'ok', 'okay', 'yeah', 'yep', 'sure', 'please', 'thanks', 'thank',
    'cancel', 'stop', 'undo', 'skip', 'next', 'previous', 'confirm', 'correction',
    'hi', 'hello', 'hey', 'open', 'close', 'read', 'write', 'compose',
    // Verbs / fillers often mis-heard as the recipient (e.g. "make" from "make it about…")
    'make', 'makes', 'making', 'made', 'put', 'puts', 'say', 'says', 'said', 'tell', 'tells',
    'get', 'gets', 'got', 'give', 'gives', 'add', 'adds', 'use', 'uses', 'set', 'sets',
    // Pronouns / fillers — never a mailbox by themselves
    'it', 'this', 'that', 'these', 'those', 'not', 'so', 'well', 'um', 'uh',
    'i', 'just', 'you', 'we',
    // Conversational scraps ("…you know…" → ASR often leaves "know")
    'know', 'knows', 'maybe', 'right', 'guess'
]);

/**
 * True when the string is only a mail UI command, not a person or address.
 * Real addresses containing @ are never treated as noise.
 */
export function isRecipientNoiseOnly(text = '') {
    const raw = String(text || '').trim();
    if (!raw) return true;
    if (raw.includes('@')) return false;
    const t = normalizeVoiceUtterance(raw);
    const parts = t.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return EMAIL_RECIPIENT_NOISE_WORDS.has(parts[0]);
    if (parts.length === 2 && parts[0] === 'to' && EMAIL_RECIPIENT_NOISE_WORDS.has(parts[1])) return true;
    // "make it", "put it", "make a …" — fragment of a sentence, not a person
    if (parts.length === 2) {
        const [a, b] = parts;
        if ((a === 'make' && ['it', 'a', 'the', 'this', 'that', 'an'].includes(b))
            || (a === 'put' && ['it', 'this', 'that', 'a', 'the'].includes(b))
            || (a === 'get' && ['it', 'this', 'that'].includes(b))
            || (a === 'you' && b === 'know')) {
            return true;
        }
    }
    // ASR: “no I just send it” / “go send it” scraps — every token is UI filler, not a name
    if (parts.length >= 2 && parts.every((p) => EMAIL_RECIPIENT_NOISE_WORDS.has(p))) {
        return true;
    }
    return false;
}

/** User wants wording polished, not a new recipient (e.g. “can you improve the mail a little bit”). */
export function isImproveDraftIntent(lower = '') {
    const t = String(lower || '').trim();
    if (!t) return false;
    const hasMailTarget = /\b(?:mail|email|message|draft|letter|text)\b/.test(t);
    // “yes improve it” / “ok polish the subject” — no need to say “email” once compose is open
    if (/\b(?:improve|polish|rewrite|rephrase|refine|fix\s+up)\s+(?:it|this|that|them)\b/.test(t)) return true;
    if (/\b(?:improve|polish|rewrite|rephrase|refine)\s+(?:the\s+)?(?:subject|subject line)\b/.test(t)) return true;
    if (/^(?:yes|yeah|yep|ok|okay|sure)[,\s]+(?:improve|polish|rewrite|rephrase|refine)\b/.test(t)) return true;
    if (/\b(?:improve|polish|rewrite|rephrase|refine|fix\s+up)\b/.test(t) && hasMailTarget) return true;
    if (/\b(?:make\s+the\s+(?:mail|email|message|draft)\s+(?:better|sound\s+better|clearer))\b/.test(t)) return true;
    if (/\b(?:make\s+it\s+(?:better|clearer))\b/.test(t) && hasMailTarget) return true;
    return false;
}

/**
 * User wants to change recipient/subject/body — not a literal subject line.
 * Matches ASR variants like “please correct it” that must not fill the Subject field.
 */
export function isCorrectionIntentUtterance(text = '') {
    const t = normalizeVoiceUtterance(text);
    if (!t) return false;
    if (
        /^(?:no|not yet|change it|correct it|needs changes?|fix it|actually change that)$/.test(t)
        || /^(?:correct|fix)(?:\s+it)?$/.test(t)
        || /^(?:please\s+|can\s+you\s+|could\s+you\s+)?(?:correct|fix|change)\s+it(?:\s+please)?$/.test(t)
        || /^(?:i\s+want\s+to\s+|i\s+need\s+to\s+)(?:correct|fix|change)\s+it$/.test(t)
    ) {
        return true;
    }
    return false;
}

/** Not a real subject line — UI words or correction fragments mistaken for a title. */
export function isSubjectSlotNoiseOnly(text = '') {
    const t = normalizeVoiceUtterance(text);
    if (!t) return true;
    if (t === 'subject' || t === 'subjects' || t === 'the subject' || t === 'a subject' || t === 'subject line') return true;
    if (/^(?:yes|no|ok|okay|yeah|yep|sure)\s+(?:improve|polish|rewrite|fix)\b/.test(t)) return true;
    if (isCorrectionIntentUtterance(t)) return true;
    return false;
}

/**
 * Whole-utterance “send now” commands for Gmail draft follow-up (normalized text).
 * Kept strict (anchored) so short phrases win over accidental message text.
 */
function matchesStrongEmailSendDraftPatterns(lower = '') {
    const t = String(lower || '').trim();
    if (!t) return false;
    return (
        /^(?:send|send\s+it|send\s+now|send\s+that|send\s+the\s+email|send\s+this\s+email|yes\s+send|please\s+send|go\s+ahead|do\s+it|mail\s+it|mail\s+this|ship\s+it|fire\s+it\s+off)$/.test(t)
        || /^(?:please\s+)?go\s+ahead(?:\s+and)?\s+send(?:\s+it)?$/.test(t)
        || /^(?:go|now)\s+send(?:\s+it)?$/.test(t)
        || /^go\s+on\s+send(?:\s+it)?$/.test(t)
        || /^(?:please\s+)?go\s+(?:on\s+)?send(?:\s+it)?$/.test(t)
        || /^(?:you|ya)\s+can\s+send(?:\s+it)?$/.test(t)
        || /^(?:you|ya)\s+may\s+send(?:\s+it)?$/.test(t)
        || /^(?:ok|okay|alright)[,\s]+(?:(?:you|ya)\s+)?can\s+send(?:\s+it)?$/.test(t)
        || /^alright[,]?\s+send(?:\s+it)?$/.test(t)
        || /^okay[,]?\s+send(?:\s+it)?$/.test(t)
        || /^ok[,]?\s+send(?:\s+it)?$/.test(t)
        || /^just\s+send(?:\s+it)?$/.test(t)
        || /^(?:no\s+)?you\s+send(?:\s+it)?$/.test(t)
        || /^(?:no\s+)?ya\s+send(?:\s+it)?$/.test(t)
        || /^(?:no\s+)?you\s+can\s+send(?:\s+it)?$/.test(t)
        || /^send\s+it\s+(?:yourself|for\s+me)$/.test(t)
        || /^(?:yeah|yep|yup)\s+send(?:\s+it)?$/.test(t)
        || /^(?:really|yes\s+really|for\s+real|definitely|absolutely)$/.test(t)
        // ASR mis-hears around “send” as a person name
        || /^(?:no\s+)?i\s+just\s+send(?:\s+it)?$/.test(t)
        || /^no\s+just\s+send(?:\s+it)?$/.test(t)
        || /^i\s+just\s+send(?:\s+it)?$/.test(t)
        || /^(?:and\s+)?just\s+send(?:\s+it)?$/.test(t)
    );
}

/** True when the utterance is a strong send command (excludes “… in telegram”). */
export function isStrongEmailSendDraftCommand(text = '') {
    const lower = normalizeVoiceUtterance(text);
    if (!lower || /\btelegram\b/.test(lower)) return false;
    return matchesStrongEmailSendDraftPatterns(lower);
}

export function isGmailSendAffirmation(text = '') {
    const t = normalizeVoiceUtterance(text);
    if (!t) return false;
    if (matchesStrongEmailSendDraftPatterns(t)) return true;
    return (
        /^(?:yes|yeah|yep|ok|okay|sure|perfect|exactly|affirmative)$/.test(t)
        || /^(?:yes|yeah|yep|ok|okay|sure|perfect)\s+(?:send|send\s+it|go\s+ahead|go\s+ahead\s+and\s+send)$/.test(t)
        || /^(?:yes|yeah|yep|ok|okay|sure|perfect)\s+(?:you\s+)?can\s+send(?:\s+it)?$/.test(t)
    );
}

export function isVideoOpenVoiceRequest(text = '') {
    const t = normalizeVoiceUtterance(text);
    if (!t) return false;
    return (
        /^(?:please\s+)?(?:open|show|view|resume|play)\s+(?:me\s+)?(?:the\s+)?(?:video|youtube|clip|recording)(?:\s+please)?$/.test(t)
        || /^(?:please\s+)?(?:open|show|view|resume|play)\s+(?:me\s+)?(?:the\s+)?(?:last|latest|my)\s+(?:video|clip|recording)(?:\s+please)?$/.test(t)
        || /^(?:please\s+)?(?:open|show|browse|view|pull\s+up|bring\s+up)\s+(?:the\s+)?youtube(?:\s+(?:library|menu|list))?(?:\s+please)?$/.test(t)
    );
}

export function parseEmailOpenChoice(command = '') {
    const t = normalizeVoiceUtterance(command);
    if (!t) return null;
    const hasCreateWord = ['create', 'compose', 'write', 'draft', 'make', 'new'].some((word) => t.includes(word));
    const hasReviewWord = t.includes('review');
    const hasMailWord = ['email', 'mail', 'message', 'inbox', 'list'].some((word) => t.includes(word));
    if (t === 'create' || t === 'compose' || t === 'write' || t === 'draft' || t === 'make') {
        return { action: 'create' };
    }
    if (t === 'review' || t === 'inbox' || t === 'list') {
        return { action: 'review' };
    }
    if (hasCreateWord && hasMailWord) {
        return { action: 'create' };
    }
    if (hasReviewWord && hasMailWord) {
        return { action: 'review' };
    }
    return null;
}

function resolveRecipientFragment(raw = '') {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return { recipient: '', recipientQuery: '' };
    if (isRecipientNoiseOnly(trimmed)) return { recipient: '', recipientQuery: '' };
    const recipient = extractSpokenEmailAddress(trimmed);
    const recipientQuery = recipient ? '' : extractRecipientReference(trimmed);
    if (!recipient && recipientQuery && isRecipientNoiseOnly(recipientQuery)) {
        return { recipient: '', recipientQuery: '' };
    }
    return { recipient, recipientQuery };
}

/**
 * Parses Gmail draft follow-ups from free-form speech.
 * Returns structured actions for emailFeature.handlePendingVoiceFollowUp.
 */
export function parseEmailDraftFollowUp(command = '') {
    const lower = normalizeVoiceUtterance(command);
    if (!lower) return null;
    if (/\btelegram\b/.test(lower)) return null;

    if (
        // Do not use bare "correct" — it means “I want to change something,” not “confirmed.”
        /^(?:yes|yeah|yep|that s okay|thats okay|looks good|looks perfect|sounds perfect|ok|okay|perfect|exactly|that is okay|that is correct|that sounds perfect|that looks good)$/.test(lower)
        || /^(?:yes|yeah|yep|ok|okay|perfect)\s+(?:can\s+you\s+)?confirm(?:\s+when\s+you\s+send\s+it)?$/.test(lower)
        || /^(?:yes|yeah|yep|ok|okay|sure|perfect)\s+(?:send|send\s+it|go\s+ahead(?:\s+and\s+send)?)$/.test(lower)
    ) {
        return { action: 'confirmDraft' };
    }

    if (matchesStrongEmailSendDraftPatterns(lower)) {
        return { action: 'sendDraft' };
    }

    if (isCorrectionIntentUtterance(lower)) {
        return { action: 'requestCorrection' };
    }

    if (/^(?:never mind|nevermind|forget it|forget that|cancel|stop|let s not|lets not)$/.test(lower)) {
        return { action: 'cancelDraft' };
    }
    if (
        /^(?:undo|scratch that|take that back|oops)$/i.test(lower)
        || /^undo\s+(?:that\s+)?(?:sentence|line|paragraph)\b/i.test(lower)
        || /^undo\s+that\s+edit$/i.test(lower)
        || /^undo\s+the\s+last\s+sentence$/i.test(lower)
    ) {
        return { action: 'undoDraft' };
    }

    if (/^change\s+(?:the\s+)?recipient$/i.test(lower) || /^correct\s+(?:the\s+)?recipient$/i.test(lower)) {
        return { action: 'requestCorrection' };
    }

    if (isImproveDraftIntent(lower)) {
        return { action: 'improveDraft' };
    }

    if (/^(?:no\s+subject|without\s+subject|skip\s+subject|subject\s+not\s+needed|i\s+do\s+not\s+need\s+a\s+subject)$/.test(lower)) {
        return { action: 'skipSubject' };
    }
    if (/\b(?:need|want)\s+a\s+subject\b/.test(lower) || /\bask\s+me\s+if\s+i\s+need\s+a\s+subject\b/.test(lower)) {
        return { action: 'promptSubjectChoice' };
    }

    const subjectAndMessageMatch = lower.match(/^(?:no\s+)?(?:the\s+)?subject\s+and\s+(?:the\s+)?message\s+(?:is|are)\s+(.+)$/);
    if (subjectAndMessageMatch) {
        return { action: 'updateMessage', text: String(subjectAndMessageMatch[1] || '').trim() };
    }

    const addMatch = lower.match(/^add\s+(.+)$/);
    if (addMatch?.[1]) {
        return { action: 'appendMessage', text: String(addMatch[1] || '').trim() };
    }

    if (
        /^(?:clear|delete|erase|remove)\s+(?:the\s+)?(?:recipient|to\s+field|to)$/i.test(lower)
        || /^go\s+to\s+recipient(?:\s+and\s+delete)?$/i.test(lower)
        || /^delete\s+(?:the\s+)?recipient$/i.test(lower)
        || /^clear\s+to$/i.test(lower)
    ) {
        return { action: 'clearRecipient' };
    }

    const recipientMatch = lower.match(/^(?:change|correct|update|set)\s+(?:the\s+)?(?:recipient|email|to)(?:\s+to)?\s+(.+)$/)
        // Avoid "to send" / "to mail" being read as field "to" + value "send"
        || lower.match(/^(?:recipient|email)(?:\s+is|\s+to)?\s+(.+)$/)
        || lower.match(/^to(?:\s+is)?\s+(.+)$/)
        || lower.match(/^(?:send it|send this|mail it)\s+to\s+(.+)$/);
    if (recipientMatch) {
        const resolved = resolveRecipientFragment(recipientMatch[1] || '');
        if (resolved.recipient || resolved.recipientQuery) {
            return {
                action: 'updateRecipient',
                recipient: resolved.recipient,
                recipientQuery: resolved.recipientQuery
            };
        }
    }

    const subjectMatch = lower.match(/^(?:change|correct|update|set)\s+(?:the\s+)?subject(?:\s+to)?\s+(.+)$/)
        || lower.match(/^subject\s*(?:is|:)\s+(.+)$/)
        || lower.match(/^subject\s+line\s+is\s+(.+)$/)
        // Shorthand “subject dinner” — not bare “subject” (that stays raw / noise-filtered in UI)
        || lower.match(/^subject\s+(.+)$/);
    if (subjectMatch) {
        const subj = String(subjectMatch[1] || '').trim();
        if (subj && !isSubjectSlotNoiseOnly(subj)) {
            return { action: 'updateSubject', subject: subj };
        }
    }

    const messageMatch = lower.match(/^(?:change|correct|update|set)\s+(?:the\s+)?(?:message|body)(?:\s+to)?\s+(.+)$/)
        || lower.match(/^(?:message|body)(?:\s+is|\s+to)?\s+(.+)$/);
    if (messageMatch) {
        return { action: 'updateMessage', text: String(messageMatch[1] || '').trim() };
    }

    return { action: 'raw', text: String(command || '').trim() };
}

/**
 * “Did it go?” / “Is the email sent?” style checks (last send result in Gmail flow).
 */
export function parseEmailStatusFollowUp(command = '') {
    const lower = normalizeVoiceUtterance(command);
    if (!lower) return null;

    if (
        /^(?:really|are\s+you\s+sure|sure|prove\s+it|verify\s+it|confirm\s+it)$/.test(lower)
        || /^(?:show\s+me|show\s+me\s+that|show\s+it|show\s+me\s+the\s+email|show\s+me\s+the\s+sent\s+email)$/.test(lower)
        || /^(?:can\s+you\s+show\s+me|can\s+you\s+prove\s+it|can\s+you\s+confirm\s+that)$/.test(lower)
        // “Is the email sent?” / ASR: “ist email sent wow”
        || /^(?:is|ist|was|were)\s+(?:the\s+)?(?:email|mail|it)\s+sent(?:\s+\w+){0,4}$/.test(lower)
        || /^(?:did|does)\s+(?:the\s+)?(?:email|mail|it)\s+(?:send|go\s+through)\b/.test(lower)
        || /^has\s+(?:the\s+)?(?:email|mail|it)\s+been\s+sent\b/.test(lower)
    ) {
        return { action: 'statusCheck' };
    }

    return null;
}
