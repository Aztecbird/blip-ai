/**
 * Single read-model for Gmail + Telegram compose fields used by voice routing,
 * Gemini structured context, routing-cache epoch, and main follow-up gates.
 */

export function summarizeGmailDraft(draft = {}) {
    const to = String(draft?.to || '').trim();
    const recipientQuery = String(draft?.recipientQuery || '').trim();
    const subject = String(draft?.subject || '').trim();
    const text = String(draft?.text || '').trim();
    const hasAttachments = Array.isArray(draft?.attachments) && draft.attachments.length > 0;
    const hasAnyContent = Boolean(to || recipientQuery || subject || text || hasAttachments);
    return {
        hasDraft: hasAnyContent,
        hasResolvedTo: Boolean(to),
        hasRecipientSlot: Boolean(to || recipientQuery),
        hasSubject: Boolean(subject),
        hasBody: Boolean(text),
        hasAttachments,
        subjectSkipped: Boolean(draft?.subjectSkipped),
    };
}

export function summarizeTelegramDraft(draft = {}) {
    const chatId = String(draft?.chatId || '').trim();
    const text = String(draft?.text || '').trim();
    const hasAnyContent = Boolean(chatId || text);
    return {
        hasDraft: hasAnyContent,
        hasChatId: Boolean(chatId),
        hasBody: Boolean(text),
    };
}

/**
 * @returns {{
 *   gmail: ReturnType<summarizeGmailDraft>,
 *   telegram: ReturnType<summarizeTelegramDraft>,
 *   hasAnyMessagingDraft: boolean,
 *   hasBothMessagingDrafts: boolean
 * }}
 */
export function buildMessagingDraftSnapshot(state = {}) {
    const gmail = summarizeGmailDraft(state.gmailComposeDraft);
    const telegram = summarizeTelegramDraft(state.telegramDraft);
    return {
        gmail,
        telegram,
        hasAnyMessagingDraft: gmail.hasDraft || telegram.hasDraft,
        hasBothMessagingDrafts: gmail.hasDraft && telegram.hasDraft,
    };
}
