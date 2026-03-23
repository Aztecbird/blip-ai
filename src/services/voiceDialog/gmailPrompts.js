/**
 * Human, calm copy for Gmail voice + panel UI. Kept separate from feature wiring.
 */

export function getGmailPanelStageTitle(stage) {
    const map = {
        awaitingRecipient: 'Who is this for?',
        awaitingSubject: 'Subject',
        awaitingMessage: 'Message',
        awaitingSendDecision: 'Ready to send',
        awaitingCorrection: 'What should change?',
        draftReady: 'Review'
    };
    return map[stage] || 'Email draft';
}

export function getGmailPanelStagePrompt(stage, draft, { getEmailContactLabel, offerPolish = false } = {})
{
    const rq = draft?.recipientQuery ? getEmailContactLabel(draft.recipientQuery) : '';
    if (stage === 'awaitingRecipient') {
        return rq
            ? `I heard “${rq}.” What’s the email address, or say save someone@example.com as ${rq}. After the address is in To whom, you can say save this recipient as ${rq}.`
            : 'Who should I send it to? You can say a name or an email.';
    }
    if (stage === 'awaitingSubject') {
        return 'What’s the subject? You can say it normally, or just say “no subject.”';
    }
    if (stage === 'awaitingMessage') {
        return 'What do you want to say? Just say it naturally, or type it below.';
    }
    if (stage === 'awaitingSendDecision') {
        return 'Everything looks ready. Say “send” when you’re ready, or tell me what to change.';
    }
    if (stage === 'draftReady' && offerPolish) {
        return 'Your message is below. Want me to improve wording or change tone? Say yes — or say send to send as-is.';
    }
    if (stage === 'awaitingCorrection') {
        return 'Tell me what to change—the recipient, subject, or message.';
    }
    return 'Review the fields below. Say send when you’re ready.';
}

export function getGmailPanelPlaceholder(field, stage) {
    if (field === 'to') {
        return stage === 'awaitingRecipient' ? 'Name or email' : 'To';
    }
    if (field === 'subject') {
        return stage === 'awaitingSubject' ? 'e.g. Dinner tomorrow' : 'Subject';
    }
    if (field === 'message') {
        return stage === 'awaitingMessage' ? 'Say your message…' : 'Message';
    }
    return '';
}

/** Natural spoken examples for pills (no “command syntax”). */
export function getGmailVoicePills(stage, { offerPolish = false } = {}) {
    if (stage === 'awaitingRecipient') {
        return ['to joy@example.com', 'save this recipient as Mom', 'clear saved email contacts', 'undo'];
    }
    if (stage === 'awaitingSubject') {
        return ['subject dinner', 'no subject', 'note subject shopping list', 'undo'];
    }
    if (stage === 'awaitingMessage') {
        return ['I arrive at 7', 'add see you soon', 'clear recipient', 'undo'];
    }
    if (stage === 'awaitingSendDecision') {
        return ['send', 'go ahead', 'undo'];
    }
    if (stage === 'draftReady' && offerPolish) {
        return ['yes', 'no thanks', 'send', 'improve it'];
    }
    return ['to …', 'subject …', 'message …', 'send', 'clear saved email contacts'];
}

export function buildGmailVoiceReplyDraft(stage, draft, { getEmailContactLabel, getDefaultSenderEmail, offerPolish = false }) {
    const recipient = String(draft?.to || '').trim();
    const recipientQuery = getEmailContactLabel(draft?.recipientQuery || '');
    const sender = getDefaultSenderEmail();
    const attachmentCount = Array.isArray(draft?.attachments) ? draft.attachments.length : 0;
    const attachmentNote = attachmentCount
        ? ` ${attachmentCount === 1 ? 'One attachment is ready.' : `${attachmentCount} attachments are ready.`}`
        : '';

    if (stage === 'awaitingRecipient') {
        return recipientQuery
            ? `Email open.${attachmentNote} I don’t have ${recipientQuery}’s address yet. Share it once, or say save someone@example.com as ${recipientQuery}.`
            : `Email open.${attachmentNote} Who should I send it to? You can say a name or an email.`;
    }
    if (stage === 'awaitingSubject') {
        return recipient
            ? `Email open.${attachmentNote} Sending to ${recipient}. What’s the subject—or say “no subject.”`
            : `Email open.${attachmentNote} What’s the subject? You can say it normally, or “no subject.”`;
    }
    if (stage === 'awaitingMessage') {
        return recipient
            ? `Email open.${attachmentNote} To ${recipient}. ${draft?.subjectSkipped ? 'No subject.' : 'Subject’s set.'} What should the message say?`
            : `Email open.${attachmentNote} What should the message say?`;
    }
    if (stage === 'awaitingSendDecision') {
        return `Okay.${attachmentNote} Say send when you want it to go, or tell me what to change.`;
    }
    if (stage === 'awaitingCorrection') {
        return `Email open.${attachmentNote} What should I change?`;
    }
    if (stage === 'awaitingApproval' || stage === 'draftReady') {
        if (offerPolish) {
            return `Okay.${attachmentNote} Want me to improve the wording or change the tone? Say yes — or say send when you’re ready to send.`;
        }
        return recipient
            ? `Email open.${attachmentNote} To ${recipient}${sender ? ` from ${sender}` : ''}. Does this look right?`
            : `Email open.${attachmentNote} Here’s a draft. Does this look right?`;
    }
    return recipient
        ? `Email open.${attachmentNote} To ${recipient}${sender ? ` from ${sender}` : ''}. Does this look right?`
        : `Email open.${attachmentNote} Here’s a draft. Does this look right?`;
}
