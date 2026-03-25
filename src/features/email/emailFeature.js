import { extractRecipientReference, extractSpokenEmailAddress } from '../../services/gmailVoice.js';
import { generateWithPrompt } from '../../services/geminiText.js';
import {
    isCorrectionIntentUtterance,
    isRecipientNoiseOnly,
    isSubjectSlotNoiseOnly,
    parseEmailDraftFollowUp,
    parseEmailStatusFollowUp
} from '../../services/voiceDialog/emailFollowUpParse.js';
import { normalizeVoiceUtterance } from '../../services/voiceDialog/utterance.js';
import {
    buildGmailVoiceReplyDraft,
    getGmailPanelPlaceholder,
    getGmailPanelStagePrompt,
    getGmailPanelStageTitle,
    getGmailVoicePills
} from '../../services/voiceDialog/gmailPrompts.js';

export function createEmailFeature(env = {}) {
    const {
        state,
        transcriptText,
        elements = {},
        services = {},
        helpers = {},
    } = env;

    const {
        connectGoogleGmail,
        disconnectGoogleGmail,
        getGoogleGmailAuthState,
        getGoogleGmailMessage,
        getGoogleGmailProfile,
        initGoogleGmail,
        listGoogleGmailMessages,
        onGoogleGmailAuthStateChange,
        sendGoogleGmailMessage,
    } = services;

    const {
        escapeHtml,
        renderActionInSidePanel,
        isSidePanelActuallyVisible,
        closeSidePanel,
        quickReply,
        getNoteItems,
        getEmailPhotoAttachmentPayload,
        isMediaLightboxActuallyVisible,
        normalizeMediaLane,
        getSelectedCalendarDate,
        formatCalendarDateKey,
        formatCalendarEventDate,
        formatCalendarEventTimeRange,
        getCurrentYouTubeTitle,
        playEmailSendConfirm,
        persistEmailContacts,
    } = helpers;

    const {
        connectGmailBtn,
        openGmailInboxBtn,
        disconnectGmailBtn,
        gmailAuthStatus,
    } = elements;

    function formatGmailMessageDate(message = {}) {
        const rawValue = message?.internalDate || message?.date || '';
        const parsed = new Date(rawValue);
        if (Number.isNaN(parsed.getTime())) return '';
        return parsed.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    function getGmailPreviewText(message = {}) {
        return String(
            message?.snippet
            || message?.bodyText
            || message?.subject
            || ''
        ).replace(/\s+/g, ' ').trim();
    }

    function formatGmailAuthStatus(authState = getGoogleGmailAuthState()) {
        if (authState.backendConfigured && authState.connected) {
            return {
                text: authState.email
                    ? `Backend Gmail connected as ${authState.email}.`
                    : 'Backend Gmail connected.',
                tone: 'connected'
            };
        }
        if (authState.backendConfigured) {
            return {
                text: 'Backend Gmail ready. Press Connect Gmail to sign in.',
                tone: 'warning'
            };
        }
        return {
            text: 'Start the Gmail backend first, then press Connect Gmail.',
            tone: 'warning'
        };
    }

    function updateGmailAuthUi(authState = getGoogleGmailAuthState()) {
        if (gmailAuthStatus) {
            const status = formatGmailAuthStatus(authState);
            gmailAuthStatus.textContent = status.text;
            gmailAuthStatus.classList.remove('connected', 'warning');
            if (status.tone) gmailAuthStatus.classList.add(status.tone);
        }

        if (connectGmailBtn) {
            connectGmailBtn.disabled = !authState.backendConfigured;
            connectGmailBtn.textContent = authState.connected ? 'Reconnect Gmail' : 'Connect Gmail';
        }

        if (openGmailInboxBtn) openGmailInboxBtn.disabled = !authState.connected;
        if (disconnectGmailBtn) disconnectGmailBtn.disabled = !authState.connected;
    }

    function getDefaultSenderEmail() {
        return String(
            state.gmailProfile?.email
            || getGoogleGmailAuthState()?.email
            || ''
        ).trim();
    }

    function normalizeEmailContactAlias(value = '') {
        return String(value || '')
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^(?:as|for|to)\s+/, '')
            .trim();
    }

    function getEmailContactLabel(value = '') {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function saveEmailContact(alias = '', email = '') {
        const key = normalizeEmailContactAlias(alias);
        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!key || !normalizedEmail) return false;
        state.emailContacts = {
            ...(state.emailContacts || {}),
            [key]: normalizedEmail
        };
        persistEmailContacts?.();
        return true;
    }

    function resolveEmailRecipient(recipient = '', recipientQuery = '') {
        const direct = String(recipient || '').trim().toLowerCase();
        if (direct) {
            if (isRecipientNoiseOnly(direct)) return '';
            return direct;
        }
        const query = normalizeEmailContactAlias(recipientQuery);
        if (!query) return '';
        if (state.emailContacts?.[query]) return String(state.emailContacts[query] || '').trim().toLowerCase();
        return '';
    }

    function resolveRecipientInput(input = '') {
        const raw = String(input || '').trim();
        if (!raw) return { recipient: '', recipientQuery: '' };
        if (isRecipientNoiseOnly(raw)) return { recipient: '', recipientQuery: '' };
        const recipient = extractSpokenEmailAddress(raw);
        const recipientQuery = recipient ? '' : extractRecipientReference(raw);
        if (!recipient && recipientQuery && isRecipientNoiseOnly(recipientQuery)) {
            return { recipient: '', recipientQuery: '' };
        }
        return { recipient, recipientQuery };
    }

    function hasMeaningfulRecipientFields(draft = {}) {
        const to = String(draft?.to || '').trim();
        const rq = String(draft?.recipientQuery || '').trim();
        if (to.includes('@')) return true;
        if (to && !isRecipientNoiseOnly(to)) return true;
        if (rq && !isRecipientNoiseOnly(rq)) return true;
        if (rq && resolveEmailRecipient('', rq)) return true;
        return false;
    }

    function buildUnknownRecipientReply(recipientQuery = '') {
        const label = getEmailContactLabel(recipientQuery);
        return label
            ? `I do not know ${label} yet. Tell me the email address once, or say save someone@example.com as ${label}.`
            : 'I need the email address first.';
    }

    function resolveRecipientForSave(request = {}) {
        const directRecipient = String(request?.recipient || '').trim().toLowerCase();
        if (directRecipient) return directRecipient;
        const inlineRecipient = extractSpokenEmailAddress(request?.recipientQuery || '');
        if (inlineRecipient) return inlineRecipient;
        const draftRecipient = String(state.gmailComposeDraft?.to || '').trim().toLowerCase();
        if (draftRecipient) return draftRecipient;
        return '';
    }

    function buildEmailContactsReply() {
        const contacts = Object.entries(state.emailContacts || {})
            .filter(([alias, email]) => String(alias || '').trim() && String(email || '').trim())
            .sort((left, right) => left[0].localeCompare(right[0]));
        if (!contacts.length) return 'I do not have any saved email contacts yet.';
        const spokenList = contacts
            .slice(0, 6)
            .map(([alias, email]) => `${getEmailContactLabel(alias)} is ${email}`)
            .join('. ');
        const moreCount = Math.max(0, contacts.length - 6);
        return moreCount > 0
            ? `I know these email contacts: ${spokenList}. And ${moreCount} more.`
            : `I know these email contacts: ${spokenList}.`;
    }

    function buildKnownContactReply(alias = '') {
        const query = normalizeEmailContactAlias(alias);
        const email = query ? String(state.emailContacts?.[query] || '').trim() : '';
        const label = getEmailContactLabel(alias);
        if (!email) {
            return label
                ? `I do not know ${label} yet. Say save someone@example.com as ${label}.`
                : 'I do not have that email contact saved yet.';
        }
        return label
            ? `I know ${label} as ${email}.`
            : `I know that email as ${email}.`;
    }

    function buildLastSendStatusReply() {
        const last = state.lastGmailSendResult || null;
        if (!last) return 'I do not have a recent email send to verify yet.';
        if (!last.ok) {
            return last.message
                ? `The last email did not go through. ${last.message}`
                : 'The last email did not go through.';
        }
        const recipient = String(last.to || '').trim();
        if (last.verified) {
            return recipient
                ? `I verified the last email in Sent for ${recipient}.`
                : 'I verified the last email in Sent.';
        }
        return recipient
            ? `Gmail accepted the last email for ${recipient}, but I could not verify it in Sent yet.`
            : 'Gmail accepted the last email, but I could not verify it in Sent yet.';
    }

    function normalizeGmailMailbox(value = '') {
        return String(value || '').toLowerCase() === 'sent' ? 'sent' : 'inbox';
    }

    function getGmailMailboxLabel(mailbox = '') {
        return normalizeGmailMailbox(mailbox) === 'sent' ? 'Sent' : 'Inbox';
    }

    function getGmailMailboxLabelIds(mailbox = '') {
        return normalizeGmailMailbox(mailbox) === 'sent' ? ['SENT'] : ['INBOX'];
    }

    function cloneEmailDraft(draft = {}) {
        return {
            to: String(draft?.to || '').trim(),
            recipientQuery: String(draft?.recipientQuery || '').trim(),
            subject: String(draft?.subject || '').trim(),
            subjectSkipped: !!draft?.subjectSkipped,
            text: String(draft?.text || '').trim(),
            attachments: Array.isArray(draft?.attachments) ? [...draft.attachments] : []
        };
    }

    function hasMeaningfulDraft(draft = {}) {
        return !!(
            String(draft?.to || '').trim()
            || String(draft?.recipientQuery || '').trim()
            || String(draft?.subject || '').trim()
            || !!draft?.subjectSkipped
            || String(draft?.text || '').trim()
            || (Array.isArray(draft?.attachments) && draft.attachments.length)
        );
    }

    function resetGmailComposeDraft(nextDraft = {}) {
        const resolvedRecipient = resolveEmailRecipient(nextDraft?.to || '', nextDraft?.recipientQuery || '');
        let to = String(resolvedRecipient || nextDraft?.to || '').trim();
        let recipientQuery = String(nextDraft?.recipientQuery || '').trim();
        if (to && isRecipientNoiseOnly(to)) to = '';
        if (recipientQuery && isRecipientNoiseOnly(recipientQuery)) recipientQuery = '';
        state.gmailComposeDraft = {
            to,
            recipientQuery,
            subject: String(nextDraft?.subject || '').trim(),
            subjectSkipped: !!nextDraft?.subjectSkipped,
            text: String(nextDraft?.text || '').trim(),
            attachments: Array.isArray(nextDraft?.attachments) ? nextDraft.attachments : []
        };
        if (hasMeaningfulDraft(state.gmailComposeDraft)) {
            state.lastGmailDraft = cloneEmailDraft(state.gmailComposeDraft);
        }
    }

    function clearPendingEmailReview() {
        state.pendingEmailReview = null;
    }

    function getEmailDraftStage(draft = state.gmailComposeDraft || {}) {
        if (!hasMeaningfulRecipientFields(draft)) return 'awaitingRecipient';
        if (!String(draft?.subject || '').trim() && !draft?.subjectSkipped) return 'awaitingSubject';
        if (!String(draft?.text || '').trim()) return 'awaitingMessage';
        return 'awaitingApproval';
    }

    function buildDraftReviewReply(draft = state.gmailComposeDraft || {}, stage = getEmailDraftStage(draft)) {
        const offerPolish = !!(state.pendingEmailReview?.offerPolish && stage === 'awaitingApproval');
        return buildGmailVoiceReplyDraft(stage, draft, {
            getEmailContactLabel,
            getDefaultSenderEmail,
            offerPolish
        });
    }

    async function openDraftForReview(draft = {}, options = {}) {
        resetGmailComposeDraft(draft);
        const stage = getEmailDraftStage(state.gmailComposeDraft);
        state.pendingEmailReview = {
            stage,
            source: String(options.source || 'email').trim() || 'email'
        };
        await openGmailInboxPanel({ summary: options.summary || 'Email draft ready.' });
        return buildDraftReviewReply(state.gmailComposeDraft, stage);
    }

    async function reopenSavedDraft(options = {}) {
        const activeDraft = hasMeaningfulDraft(state.gmailComposeDraft) ? cloneEmailDraft(state.gmailComposeDraft) : null;
        const rememberedDraft = hasMeaningfulDraft(state.lastGmailDraft) ? cloneEmailDraft(state.lastGmailDraft) : null;
        const fallbackDraft = activeDraft || rememberedDraft;
        if (!fallbackDraft) {
            const payload = await buildEmailPayloadFromContext({ shareType: 'auto' }).catch(() => null);
            if (payload) {
                return openDraftForReview(payload, {
                    summary: options.summary || 'Email draft ready.',
                    source: options.source || 'reopen-draft'
                });
            }
            return 'I do not have an email draft ready yet.';
        }
        return openDraftForReview(fallbackDraft, {
            summary: options.summary || 'Email draft ready.',
            source: options.source || 'reopen-draft'
        });
    }

    function pushUndoDraftSnapshot() {
        if (!hasMeaningfulDraft(state.gmailComposeDraft)) return;
        const stack = Array.isArray(state.gmailDraftUndoStack) ? state.gmailDraftUndoStack : [];
        stack.push(cloneEmailDraft(state.gmailComposeDraft));
        while (stack.length > 8) stack.shift();
        state.gmailDraftUndoStack = stack;
    }

    async function applyDraftUpdate(partial = {}, summary = 'Email draft updated.') {
        pushUndoDraftSnapshot();
        const prevStage = state.pendingEmailReview?.stage;
        resetGmailComposeDraft({
            ...state.gmailComposeDraft,
            ...partial,
            attachments: Array.isArray(partial.attachments) ? partial.attachments : state.gmailComposeDraft.attachments,
            subjectSkipped: typeof partial.subjectSkipped === 'boolean'
                ? partial.subjectSkipped
                : !!state.gmailComposeDraft.subjectSkipped
        });
        const nextStage = getEmailDraftStage(state.gmailComposeDraft);
        let offerPolish = false;
        if (prevStage === 'awaitingMessage' && nextStage === 'awaitingApproval') {
            offerPolish = true;
        } else if (nextStage === 'awaitingApproval') {
            offerPolish = !!state.pendingEmailReview?.offerPolish;
        }
        state.pendingEmailReview = {
            ...(state.pendingEmailReview || {}),
            stage: nextStage,
            offerPolish
        };
        await openGmailInboxPanel({ summary });
        return buildDraftReviewReply(state.gmailComposeDraft, nextStage);
    }

    function parseJsonObjectFromModel(raw = '') {
        let s = String(raw || '').trim();
        const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fence) s = fence[1].trim();
        const brace = s.match(/\{[\s\S]*\}/);
        if (!brace) throw new Error('No JSON object in model output');
        return JSON.parse(brace[0]);
    }

    async function applyDraftPolishWithGemini() {
        const draft = state.gmailComposeDraft || {};
        const subject = String(draft.subject || '').trim();
        const text = String(draft.text || '').trim();
        if (!subject && !text) {
            await quickReply('There’s nothing to polish yet. Add a subject or message, or say who should receive it.', 'happy');
            return true;
        }
        try {
            const raw = await generateWithPrompt(
                'You improve short email drafts. Reply with ONLY a JSON object: {"subject":"...","text":"..."}. Use the same language as the draft. Keep the same meaning; make wording clearer and more natural. You may slightly adjust tone (friendlier, more formal, or warmer) if it helps. If the body was empty but the subject clearly implies a short note, add a brief polite body line. Plain text only, no markdown. Do not add recipient lines.',
                `Subject: ${subject || '(none)'}\nBody:\n${text || '(empty)'}`,
                state.geminiKey || ''
            );
            const parsed = parseJsonObjectFromModel(raw);
            const nextSubject = typeof parsed.subject === 'string' ? parsed.subject.trim() : subject;
            const nextText = typeof parsed.text === 'string' ? parsed.text.trim() : text;
            const reply = await applyDraftUpdate({
                subject: nextSubject,
                text: nextText,
                subjectSkipped: nextSubject ? false : !!draft.subjectSkipped
            }, 'Polished your draft.');
            if (state.pendingEmailReview) {
                state.pendingEmailReview = { ...state.pendingEmailReview, offerPolish: false };
            }
            await quickReply(reply, 'happy');
        } catch (err) {
            console.warn('applyDraftPolishWithGemini', err);
            await quickReply('I couldn’t polish that just now. Try again in a moment.', 'sad');
        }
        return true;
    }

    async function handlePendingVoiceFollowUp(command = '') {
        const followUp = parseEmailDraftFollowUp(command);
        const statusFollowUp = parseEmailStatusFollowUp(command);
        const inGmailContext = !!(state.pendingEmailReview || state.currentSidePanelAction === 'gmail');

        const pendingPolish = state.pendingEmailReview;
        if (
            followUp
            && inGmailContext
            && pendingPolish?.stage === 'awaitingApproval'
            && pendingPolish?.offerPolish
        ) {
            const lower = normalizeVoiceUtterance(command);
            if (followUp.action === 'improveDraft' || /^(yes|yeah|yep|ok|okay|sure|please|go ahead)$/.test(lower)) {
                state.pendingEmailReview = { ...pendingPolish, offerPolish: false };
                return applyDraftPolishWithGemini();
            }
            if (/^(no|nope|no thanks|skip|not now)$/.test(lower)) {
                state.pendingEmailReview = { ...pendingPolish, offerPolish: false };
                await quickReply('Okay. Say send when you want it to go, or tell me what to change.', 'happy');
                return true;
            }
        }

        if (inGmailContext && followUp?.action === 'cancelDraft') {
            clearPendingEmailReview();
            state.gmailDraftUndoStack = [];
            resetGmailComposeDraft({ to: '', subject: '', text: '', attachments: [] });
            try {
                await openGmailInboxPanel({ summary: 'Draft cleared.' });
            } catch (_) { /* panel optional */ }
            await quickReply('Okay, I cleared that draft.', 'happy');
            return true;
        }

        if (inGmailContext && followUp?.action === 'appendMessage' && followUp.text) {
            const prev = String(state.gmailComposeDraft?.text || '').trim();
            const next = prev ? `${prev} ${followUp.text}` : followUp.text;
            const reply = await applyDraftUpdate({ text: next }, 'Added to your message.');
            await quickReply(reply, 'happy');
            return true;
        }

        if (inGmailContext && followUp?.action === 'undoDraft') {
            const stack = Array.isArray(state.gmailDraftUndoStack) ? state.gmailDraftUndoStack : [];
            const prev = stack.pop();
            state.gmailDraftUndoStack = stack;
            if (!prev) {
                await quickReply('Nothing to undo yet.', 'happy');
                return true;
            }
            resetGmailComposeDraft(prev);
            const nextStage = getEmailDraftStage(state.gmailComposeDraft);
            state.pendingEmailReview = {
                ...(state.pendingEmailReview || {}),
                stage: nextStage
            };
            try {
                await openGmailInboxPanel({ summary: 'Draft restored.' });
            } catch (_) { /* panel optional */ }
            await quickReply('Okay, I took that back.', 'happy');
            return true;
        }

        if (inGmailContext && followUp?.action === 'improveDraft') {
            return applyDraftPolishWithGemini();
        }

        if (inGmailContext && followUp?.action === 'requestCorrection' && state.pendingEmailReview) {
            state.pendingEmailReview = { ...state.pendingEmailReview, stage: 'awaitingCorrection' };
            await quickReply('Okay. Tell me recipient, subject, or message.', 'happy');
            return true;
        }

        if (!followUp) {
            if (state.pendingEmailReview || state.currentSidePanelAction === 'gmail') {
                if (statusFollowUp?.action === 'statusCheck') {
                    if (state.lastGmailSendResult) {
                        try {
                            await openGmailInboxPanel({ summary: 'Email status open.' });
                        } catch (_) {
                            /* Keep voice reply deterministic even if panel refresh fails */
                        }
                        await quickReply(buildLastSendStatusReply(), 'happy');
                        return true;
                    }
                    if (state.pendingEmailReview) {
                        await quickReply('The draft is still open. Say send when you want me to send it, or say correct.', 'happy');
                        return true;
                    }
                }
                const inlineRecipient = resolveRecipientInput(command);
                if (inlineRecipient.recipient || inlineRecipient.recipientQuery) {
                    const reply = await applyDraftUpdate({
                        to: inlineRecipient.recipient,
                        recipientQuery: inlineRecipient.recipientQuery
                    }, inlineRecipient.recipient ? 'Recipient updated.' : 'Recipient noted.');
                    await quickReply(reply, 'happy');
                    return true;
                }
                await quickReply('Email is open. Say send, change recipient, change subject, or change message.', 'happy');
                return true;
            }
            return false;
        }
        const pending = state.pendingEmailReview;
        const rememberedDraft = hasMeaningfulDraft(state.lastGmailDraft) ? cloneEmailDraft(state.lastGmailDraft) : null;

        if (!pending) {
            if (state.currentSidePanelAction !== 'gmail') {
                if (!rememberedDraft) return false;

                if (statusFollowUp?.action === 'statusCheck' && state.lastGmailSendResult) {
                    try {
                        await openGmailInboxPanel({ summary: 'Email status open.' });
                    } catch (_) {
                        /* Keep voice reply deterministic even if panel refresh fails */
                    }
                    await quickReply(buildLastSendStatusReply(), 'happy');
                    return true;
                }

                if (followUp.action === 'confirmDraft' || followUp.action === 'sendDraft') {
                    resetGmailComposeDraft(rememberedDraft);
                    if (followUp.action === 'sendDraft') {
                        const result = await sendCurrentGmailDraft(state.gmailComposeDraft);
                        await quickReply(result.text, result.ok ? 'happy' : 'sad');
                        return true;
                    }
                    state.pendingEmailReview = {
                        stage: 'awaitingSendDecision',
                        source: 'email'
                    };
                    try {
                        await openGmailInboxPanel({ summary: 'Draft restored. Say send when you want it to go.' });
                    } catch (_) {
                        /* The reply below still keeps the flow deterministic. */
                    }
                    await quickReply(buildDraftReviewReply(state.gmailComposeDraft, 'awaitingSendDecision'), 'happy');
                    return true;
                }

                return false;
            }
            const hasDraftContent = !!String(state.gmailComposeDraft?.to || '').trim()
                || !!String(state.gmailComposeDraft?.recipientQuery || '').trim()
                || !!String(state.gmailComposeDraft?.subject || '').trim()
                || !!String(state.gmailComposeDraft?.text || '').trim();
            if (!hasDraftContent) return false;
            const inlineRecipient = resolveRecipientInput(command);

            if (statusFollowUp?.action === 'statusCheck') {
                if (state.lastGmailSendResult) {
                    try {
                        await openGmailInboxPanel({ summary: 'Email status open.' });
                    } catch (_) {
                        /* Keep voice reply deterministic even if panel refresh fails */
                    }
                    await quickReply(buildLastSendStatusReply(), 'happy');
                    return true;
                }
                await quickReply('The draft is open. Say send when you want me to send it, or say correct.', 'happy');
                return true;
            }

            if (followUp.action === 'clearRecipient') {
                const reply = await applyDraftUpdate({ to: '', recipientQuery: '' }, 'Recipient cleared.');
                await quickReply(reply, 'happy');
                return true;
            }

            if (followUp.action === 'sendDraft') {
                const result = await sendCurrentGmailDraft(state.gmailComposeDraft);
                await quickReply(result.text, result.ok ? 'happy' : 'sad');
                return true;
            }
            if (followUp.action === 'confirmDraft') {
                state.pendingEmailReview = {
                    stage: 'awaitingSendDecision',
                    source: 'email'
                };
                await quickReply(buildDraftReviewReply(state.gmailComposeDraft, 'awaitingSendDecision'), 'happy');
                return true;
            }
            if (followUp.action === 'updateRecipient' && (followUp.recipient || followUp.recipientQuery)) {
                const reply = await applyDraftUpdate({
                    to: followUp.recipient || '',
                    recipientQuery: followUp.recipientQuery || ''
                }, followUp.recipient ? 'Recipient updated.' : 'Recipient noted.');
                await quickReply(reply, 'happy');
                return true;
            }
            if (followUp.action === 'updateSubject' && followUp.subject) {
                const reply = await applyDraftUpdate({ subject: followUp.subject, subjectSkipped: false }, 'Subject updated.');
                await quickReply(reply, 'happy');
                return true;
            }
            if (followUp.action === 'skipSubject') {
                const reply = await applyDraftUpdate({ subject: '', subjectSkipped: true }, 'Okay. No subject.');
                await quickReply(reply, 'happy');
                return true;
            }
            if (followUp.action === 'promptSubjectChoice') {
                await quickReply('Okay. Do you want a subject? Say subject and then the title, or say no subject.', 'happy');
                return true;
            }
            if (followUp.action === 'updateMessage' && followUp.text) {
                const reply = await applyDraftUpdate({ text: followUp.text }, 'Message updated.');
                await quickReply(reply, 'happy');
                return true;
            }
            if (inlineRecipient.recipient || inlineRecipient.recipientQuery) {
                const reply = await applyDraftUpdate({
                    to: inlineRecipient.recipient,
                    recipientQuery: inlineRecipient.recipientQuery
                }, inlineRecipient.recipient ? 'Recipient updated.' : 'Recipient noted.');
                await quickReply(reply, 'happy');
                return true;
            }
            return false;
        }

        if (followUp.action === 'clearRecipient') {
            const reply = await applyDraftUpdate({ to: '', recipientQuery: '' }, 'Recipient cleared.');
            await quickReply(reply, 'happy');
            return true;
        }

        if (pending.stage === 'awaitingRecipient') {
            if (followUp.action === 'sendDraft' || followUp.action === 'confirmDraft') {
                await quickReply(
                    'I still need a real recipient first. Say an email address or a name I know — not “send.”',
                    'happy'
                );
                return true;
            }
            const resolved = followUp.action === 'updateRecipient'
                ? { recipient: followUp.recipient || '', recipientQuery: followUp.recipientQuery || '' }
                : resolveRecipientInput(command);
            if (!resolved.recipient && !resolved.recipientQuery) {
                await quickReply('Please tell me who to send it to — an email or a saved contact name.', 'happy');
                return true;
            }
            const reply = await applyDraftUpdate({
                to: resolved.recipient,
                recipientQuery: resolved.recipientQuery
            }, resolved.recipient ? 'Recipient updated.' : 'Recipient noted.');
            await quickReply(reply, 'happy');
            return true;
        }

        // "Send" / "really" while on subject or message step must send (or confirm), not become field text
        if (
            (followUp.action === 'sendDraft' || followUp.action === 'confirmDraft')
            && (pending.stage === 'awaitingSubject' || pending.stage === 'awaitingMessage')
        ) {
            if (followUp.action === 'sendDraft') {
                const result = await sendCurrentGmailDraft(state.gmailComposeDraft);
                await quickReply(result.text, result.ok ? 'happy' : 'sad');
                return true;
            }
            state.pendingEmailReview = { ...pending, stage: 'awaitingSendDecision' };
            try {
                await openGmailInboxPanel({ summary: 'Draft looks good. Say send when you want it to go.' });
            } catch (_) { /* panel optional */ }
            await quickReply(buildDraftReviewReply(state.gmailComposeDraft, 'awaitingSendDecision'), 'happy');
            return true;
        }

        if (pending.stage === 'awaitingSubject') {
            if (followUp.action === 'promptSubjectChoice') {
                await quickReply('Okay. Do you want a subject? Say subject and then the title, or say no subject.', 'happy');
                return true;
            }
            if (followUp.action === 'skipSubject') {
                const reply = await applyDraftUpdate({ subject: '', subjectSkipped: true }, 'Okay. No subject.');
                await quickReply(reply, 'happy');
                return true;
            }
            const strippedForSubject = String(
                followUp.subject
                || command.replace(/^(?:the\s+)?subject(?:\s+is|\s+to)?\s+/i, '').trim()
            ).trim();
            if (isCorrectionIntentUtterance(strippedForSubject) || isCorrectionIntentUtterance(command)) {
                state.pendingEmailReview = { ...pending, stage: 'awaitingCorrection' };
                await quickReply('Okay. Tell me recipient, subject, or message.', 'happy');
                return true;
            }
            const subject = strippedForSubject;
            if (!subject || isSubjectSlotNoiseOnly(subject)) {
                await quickReply(
                    'Say your subject line — for example “subject is dinner tomorrow” — or say “no subject.” To polish wording, say improve it.',
                    'happy'
                );
                return true;
            }
            const reply = await applyDraftUpdate({ subject, subjectSkipped: false }, 'Subject updated.');
            await quickReply(reply, 'happy');
            return true;
        }

        if (pending.stage === 'awaitingMessage') {
            const text = String(
                followUp.text
                || command.replace(/^(?:the\s+)?(?:message|body)(?:\s+is|\s+to)?\s+/i, '').trim()
            ).trim();
            if (!text) {
                await quickReply('Please tell me the message.', 'happy');
                return true;
            }
            const reply = await applyDraftUpdate({ text }, 'Message updated.');
            await quickReply(reply, 'happy');
            return true;
        }

        if (statusFollowUp?.action === 'statusCheck') {
            if (state.lastGmailSendResult) {
                try {
                    await openGmailInboxPanel({ summary: 'Email status open.' });
                } catch (_) {
                    /* Keep voice reply deterministic even if panel refresh fails */
                }
                await quickReply(buildLastSendStatusReply(), 'happy');
                return true;
            }
            await quickReply('The draft is still open. Say send when you want me to send it, or say correct.', 'happy');
            return true;
        }

        if (followUp.action === 'confirmDraft') {
            state.pendingEmailReview = { ...pending, stage: 'awaitingSendDecision' };
            try {
                await openGmailInboxPanel({ summary: 'Draft looks good. Say send when you want it to go.' });
            } catch (_) {
                /* Panel may fail if disconnected; voice reply still guides the user */
            }
            await quickReply(buildDraftReviewReply(state.gmailComposeDraft, 'awaitingSendDecision'), 'happy');
            return true;
        }

        if (followUp.action === 'sendDraft') {
            const result = await sendCurrentGmailDraft(state.gmailComposeDraft);
            await quickReply(result.text, result.ok ? 'happy' : 'sad');
            return true;
        }

        if (followUp.action === 'requestCorrection') {
            state.pendingEmailReview = { ...pending, stage: 'awaitingCorrection' };
            await quickReply('Okay. Tell me recipient, subject, or message.', 'happy');
            return true;
        }

        if (followUp.action === 'updateRecipient' && (followUp.recipient || followUp.recipientQuery)) {
            const reply = await applyDraftUpdate({
                to: followUp.recipient || '',
                recipientQuery: followUp.recipientQuery || ''
            }, followUp.recipient ? 'Recipient updated.' : 'Recipient noted.');
            await quickReply(reply, 'happy');
            return true;
        }

        if (followUp.action === 'updateSubject' && followUp.subject) {
            const reply = await applyDraftUpdate({ subject: followUp.subject, subjectSkipped: false }, 'Subject updated.');
            await quickReply(reply, 'happy');
            return true;
        }
        if (followUp.action === 'skipSubject') {
            const reply = await applyDraftUpdate({ subject: '', subjectSkipped: true }, 'Okay. No subject.');
            await quickReply(reply, 'happy');
            return true;
        }
        if (followUp.action === 'promptSubjectChoice') {
            await quickReply('Okay. Do you want a subject? Say subject and then the title, or say no subject.', 'happy');
            return true;
        }

        if (followUp.action === 'updateMessage' && followUp.text) {
            const reply = await applyDraftUpdate({ text: followUp.text }, 'Message updated.');
            await quickReply(reply, 'happy');
            return true;
        }

        const inlineRecipient = resolveRecipientInput(command);
        if (inlineRecipient.recipient || inlineRecipient.recipientQuery) {
            const reply = await applyDraftUpdate({
                to: inlineRecipient.recipient,
                recipientQuery: inlineRecipient.recipientQuery
            }, inlineRecipient.recipient ? 'Recipient updated.' : 'Recipient noted.');
            await quickReply(reply, 'happy');
            return true;
        }

        if (pending.stage === 'awaitingCorrection') {
            await quickReply('Tell me recipient, subject, or message so I can update the draft.', 'happy');
            return true;
        }

        await quickReply('Email is open. Say send, change recipient, change subject, or change message.', 'happy');
        return true;
    }

    function formatLatestNoteForEmail(note = null) {
        if (!note) return null;
        const title = String(note?.data?.title || 'Blip note').trim() || 'Blip note';
        const items = Array.isArray(note?.data?.items) ? note.data.items.filter(Boolean) : [];
        const bodyText = String(note?.data?.bodyText || '').trim();
        const body = items.length
            ? `${title}\n\n${items.map((item) => `- ${item}`).join('\n')}`
            : (bodyText || String(note?.content || '').trim());
        if (!body) return null;
        return {
            kind: 'note',
            subject: title,
            text: body
        };
    }

    function formatYouTubeShareForEmail() {
        const url = String(state.lastContext?.lastYoutubeUrl || '').trim();
        if (!url) return null;
        const title = String(getCurrentYouTubeTitle?.() || state.lastContext?.lastYoutubeQuery || 'YouTube link').trim() || 'YouTube link';
        return {
            kind: 'youtube',
            subject: title,
            text: `${title}\n\n${url}`
        };
    }

    function formatComposeDraftForEmail(draft = {}) {
        const text = String(draft?.text || '').trim();
        if (!text) return null;
        return {
            kind: 'draft',
            subject: String(draft?.subject || 'Blip email').trim() || 'Blip email',
            text
        };
    }

    function getPreferredCalendarSharePayload() {
        const selectedDate = getSelectedCalendarDate(state.activeCalendarViewRequest || {});
        const selectedKey = selectedDate ? formatCalendarDateKey(selectedDate) : '';
        const visibleEvents = (state.calendarCache || [])
            .filter((event) => {
                if (!event) return false;
                if (!selectedKey) return true;
                const startRaw = event?.start?.dateTime || event?.start?.date || event?.start;
                if (!startRaw) return false;
                return formatCalendarDateKey(startRaw) === selectedKey;
            })
            .sort((left, right) => new Date(left?.start?.dateTime || left?.start?.date || left?.start || 0) - new Date(right?.start?.dateTime || right?.start?.date || right?.start || 0));

        const event = visibleEvents[0] || (state.calendarCache || [])[0] || null;
        if (event?.summary) {
            const dateLine = `${formatCalendarEventDate(event?.start?.dateTime || event?.start?.date || event?.start)} · ${formatCalendarEventTimeRange(event)}`;
            return {
                kind: 'calendar',
                subject: `Calendar: ${event.summary}`,
                text: `${event.summary}\n${dateLine}`
            };
        }
        if (selectedDate) {
            const label = selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
            return {
                kind: 'calendar',
                subject: `Calendar date: ${label}`,
                text: label
            };
        }
        return null;
    }

    async function buildEmailPayloadFromContext(request = {}) {
        const shareType = String(request.shareType || 'auto').trim().toLowerCase();
        const requestedSubject = String(request.subject || '').trim();
        const latestNote = getNoteItems()[0] || null;

        const usePayload = async (payloadFactory) => {
            const payload = typeof payloadFactory === 'function' ? await payloadFactory() : payloadFactory;
            if (!payload) return null;
            return {
                to: String(resolveEmailRecipient(request.recipient, request.recipientQuery) || request.recipient || '').trim(),
                recipientQuery: String(request.recipientQuery || '').trim(),
                subject: requestedSubject || payload.subject || 'Blip message',
                text: String(payload.text || '').trim(),
                attachments: Array.isArray(payload.attachments) ? payload.attachments : []
            };
        };

        if (shareType === 'note') return usePayload(formatLatestNoteForEmail(latestNote));
        if (shareType === 'youtube' || shareType === 'video' || shareType === 'link') return usePayload(formatYouTubeShareForEmail());
        if (shareType === 'photo' || shareType === 'foto' || shareType === 'picture' || shareType === 'image') return usePayload(() => getEmailPhotoAttachmentPayload());
        if (shareType === 'date' || shareType === 'calendar' || shareType === 'event') return usePayload(getPreferredCalendarSharePayload());

        // Auto mode: infer what to send from the current UI context.
        if (state.currentSidePanelAction === 'gmail') {
            const payload = await usePayload(formatComposeDraftForEmail(state.gmailComposeDraft));
            if (payload) return payload;
        }
        if (isMediaLightboxActuallyVisible('image') || normalizeMediaLane(state.mediaStripLane) === 'shots') {
            const payload = await usePayload(() => getEmailPhotoAttachmentPayload().catch(() => null));
            if (payload) return payload;
        }
        if (state.currentSidePanelAction === 'notes' || state.pendingNotesDraft || latestNote) {
            const payload = await usePayload(formatLatestNoteForEmail(latestNote));
            if (payload) return payload;
        }
        if (state.currentSidePanelAction === 'youtube' || state.lastContext?.lastYoutubeUrl) {
            const payload = await usePayload(formatYouTubeShareForEmail());
            if (payload) return payload;
        }
        if (state.currentSidePanelAction === 'calendarAgenda' || state.activeCalendarViewRequest || (state.calendarCache || []).length) {
            const payload = await usePayload(getPreferredCalendarSharePayload());
            if (payload) return payload;
        }

        return null;
    }

    async function ensureGmailProfileLoaded() {
        const authState = getGoogleGmailAuthState();
        if (!authState.connected) return null;
        try {
            const profile = await getGoogleGmailProfile();
            state.gmailProfile = profile || null;
            return state.gmailProfile;
        } catch (error) {
            console.warn('Gmail profile load failed:', error?.message || error);
            throw error;
        }
    }

    async function loadGmailInboxState(options = {}) {
        const authState = getGoogleGmailAuthState();
        if (!authState.connected) {
            throw new Error('Google Gmail is not connected. Press Connect Gmail in Settings first.');
        }

        const mailbox = normalizeGmailMailbox(options.mailbox || state.gmailMailbox || 'inbox');
        const mailboxChanged = normalizeGmailMailbox(state.gmailMailbox || 'inbox') !== mailbox;
        state.gmailMailbox = mailbox;

        const profile = await ensureGmailProfileLoaded();
        const messages = await listGoogleGmailMessages({
            maxResults: Number(options.maxResults) || 12,
            labelIds: getGmailMailboxLabelIds(mailbox)
        });
        state.gmailMessages = Array.isArray(messages) ? messages : [];

        const requestedId = String(options.selectId || '').trim();
        const fallbackId = requestedId
            || (mailboxChanged ? '' : state.gmailSelectedMessageId)
            || state.gmailMessages[0]?.id
            || '';

        state.gmailSelectedMessageId = fallbackId;

        if (fallbackId) {
            try {
                state.gmailSelectedMessage = await getGoogleGmailMessage(fallbackId);
            } catch (error) {
                console.warn('Gmail message load failed:', error?.message || error);
                state.gmailSelectedMessage = null;
            }
        } else {
            state.gmailSelectedMessage = null;
        }

        return {
            profile,
            messages: state.gmailMessages,
            selectedMessage: state.gmailSelectedMessage
        };
    }

    function buildGmailPanelHtml(toolParams = {}) {
        const authState = toolParams.authState || getGoogleGmailAuthState();
        const messages = Array.isArray(toolParams.messages) ? toolParams.messages : [];
        const selectedMessage = toolParams.selectedMessage || null;
        const composeDraft = toolParams.composeDraft || state.gmailComposeDraft || { to: '', subject: '', text: '' };
        const composeToValue = String(composeDraft.to || composeDraft.recipientQuery || '').trim();
        const composeSubjectValue = String(composeDraft.subject || '').trim();
        const composeMessageValue = String(composeDraft.text || '').trim();
        const attachmentCount = Array.isArray(composeDraft.attachments) ? composeDraft.attachments.length : 0;
        const profile = toolParams.profile || state.gmailProfile || null;
        const selectedId = String(selectedMessage?.id || state.gmailSelectedMessageId || '');
        const bodyText = getGmailPreviewText(selectedMessage);
        const mailbox = normalizeGmailMailbox(toolParams.mailbox || state.gmailMailbox || 'inbox');
        const mailboxLabel = getGmailMailboxLabel(mailbox);
        const stage = state.pendingEmailReview?.stage || getEmailDraftStage(composeDraft);
        const offerPolish = !!state.pendingEmailReview?.offerPolish;
        const sender = getDefaultSenderEmail();
        const latestSend = state.lastGmailSendResult || null;
        const contactEntries = Object.entries(state.emailContacts || {})
            .filter(([alias, email]) => String(alias || '').trim() && String(email || '').trim())
            .sort((left, right) => left[0].localeCompare(right[0]))
            .slice(0, 5);

        const panelStageKey = stage === 'awaitingApproval' ? 'draftReady' : stage;
        const stageTitle = getGmailPanelStageTitle(panelStageKey);
        const stagePrompt = getGmailPanelStagePrompt(panelStageKey, composeDraft, { getEmailContactLabel, offerPolish });
        const pills = getGmailVoicePills(panelStageKey, { offerPolish });
        const pillsHtml = pills.map((p) => `<span class="blip-gmail-voice-pill">${escapeHtml(p)}</span>`).join('');

        const latestSendText = latestSend?.ok
            ? (latestSend.verified
                ? `Last send verified${latestSend.to ? ` for ${latestSend.to}` : ''}.`
                : `Gmail accepted the last send${latestSend.to ? ` for ${latestSend.to}` : ''}, but it is not verified in Sent yet.`)
            : (latestSend?.message ? `Last send issue: ${latestSend.message}` : '');

        return `
            <div class="blip-gmail-shell">
<<<<<<< HEAD
                <div class="blip-gmail-toolbar">
=======
                <div class="blip-gmail-toolbar blip-gmail-toolbar--voice">
>>>>>>> ui-update-final
                    <div class="blip-gmail-status${authState.connected ? ' connected' : ' warning'}">
                        ${escapeHtml(
                            authState.connected
                                ? (profile?.email ? `Connected as ${profile.email}` : 'Gmail connected.')
                                : 'Connect Gmail in Settings first.'
                        )}
                    </div>
<<<<<<< HEAD
                    <div class="blip-gmail-toolbar-actions">
                        <button type="button" class="action-link outline blip-gmail-mailbox-tab${mailbox === 'inbox' ? ' is-active' : ''}" data-gmail-mailbox="inbox">Inbox</button>
                        <button type="button" class="action-link outline blip-gmail-mailbox-tab${mailbox === 'sent' ? ' is-active' : ''}" data-gmail-mailbox="sent">Sent</button>
                        <button type="button" class="action-link outline" data-gmail-refresh>Refresh</button>
                        <button type="button" class="action-link outline" data-gmail-compose-clear>New Email</button>
                    </div>
                </div>
                <div class="blip-gmail-compose-simplified blip-panel-card">
                    <div class="blip-gmail-compose-title">Simple Email</div>
=======
                    <div class="blip-gmail-mailbox-badge" aria-live="polite">${escapeHtml(mailboxLabel)}</div>
                    <p class="blip-gmail-voice-cheatsheet">Say: <span class="blip-gmail-voice-kw">inbox</span> · <span class="blip-gmail-voice-kw">sent</span> · <span class="blip-gmail-voice-kw">refresh email</span> · <span class="blip-gmail-voice-kw">compose email</span> · <span class="blip-gmail-voice-kw">read email 1</span> · <span class="blip-gmail-voice-kw">scroll down</span></p>
                </div>
                <div class="blip-gmail-compose-simplified blip-panel-card">
                    <div class="blip-gmail-compose-title">Compose</div>
>>>>>>> ui-update-final
                    <div class="blip-gmail-draft-state">
                        <div class="blip-gmail-draft-state-label">${escapeHtml(stageTitle)}</div>
                        <div class="blip-gmail-draft-state-prompt">${escapeHtml(stagePrompt)}</div>
                    </div>
                    <div class="blip-gmail-from-row">
                        <span class="blip-gmail-from-label">From</span>
                        <span class="blip-gmail-from-value">${escapeHtml(sender || 'Connect Gmail to load sender')}</span>
                    </div>
                    ${latestSendText ? `<div class="blip-gmail-send-status${latestSend?.ok ? (latestSend.verified ? ' verified' : ' pending') : ' warning'}">${escapeHtml(latestSendText)}</div>` : ''}
                    ${contactEntries.length ? `
<<<<<<< HEAD
                        <div class="blip-gmail-contact-chips">
                            ${contactEntries.map(([alias, email]) => `
=======
                        <div class="blip-gmail-contact-chips blip-gmail-contact-chips--compact">
                            ${contactEntries.slice(0, 4).map(([alias, email]) => `
>>>>>>> ui-update-final
                                <button type="button" class="blip-gmail-contact-chip" data-gmail-contact="${escapeHtml(String(email || ''))}">
                                    <span>${escapeHtml(getEmailContactLabel(alias))}</span>
                                    <small>${escapeHtml(String(email || ''))}</small>
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                    <label class="blip-gmail-slot ${stage === 'awaitingRecipient' ? 'is-active' : ''}">
                        <span class="blip-gmail-slot-label">To Whom</span>
                        <input type="text" data-gmail-to class="blip-gmail-input" placeholder="${escapeHtml(getGmailPanelPlaceholder('to', panelStageKey))}" value="${escapeHtml(composeToValue)}">
                    </label>
                    <label class="blip-gmail-slot ${stage === 'awaitingSubject' ? 'is-active' : ''}">
                        <span class="blip-gmail-slot-label">Subject</span>
                        <input type="text" data-gmail-subject class="blip-gmail-input" placeholder="${escapeHtml(getGmailPanelPlaceholder('subject', panelStageKey))}" value="${escapeHtml(composeSubjectValue)}">
                    </label>
                    <label class="blip-gmail-slot ${stage === 'awaitingMessage' ? 'is-active' : ''}">
                        <span class="blip-gmail-slot-label">Message</span>
                        <textarea data-gmail-body class="blip-gmail-textarea" placeholder="${escapeHtml(getGmailPanelPlaceholder('message', panelStageKey))}">${escapeHtml(composeMessageValue)}</textarea>
                    </label>
                    ${attachmentCount ? `<div class="blip-gmail-send-status pending">${escapeHtml(attachmentCount === 1 ? '1 attachment ready' : `${attachmentCount} attachments ready`)}</div>` : ''}
<<<<<<< HEAD
                    <div class="blip-gmail-voice-hints" aria-label="Things you can say">
                        ${pillsHtml}
                    </div>
                    <div class="blip-gmail-compose-actions">
                        <button type="button" class="action-link outline" data-gmail-send>Send</button>
                    </div>
                </div>
                <div class="blip-gmail-secondary">
                    <div class="blip-gmail-secondary-header">
                        <div class="blip-gmail-reader-kicker">${escapeHtml(mailboxLabel)}</div>
                        <div class="blip-gmail-secondary-copy">Optional mailbox view while you draft.</div>
=======
                    <div class="blip-gmail-voice-hints" aria-label="Things you can say for this step">
                        ${pillsHtml}
                    </div>
                </div>
                <div class="blip-gmail-secondary">
                    <div class="blip-gmail-secondary-header blip-gmail-secondary-header--voice">
                        <div class="blip-gmail-secondary-title">${escapeHtml(mailboxLabel)}</div>
                        <p class="blip-gmail-voice-cheatsheet blip-gmail-voice-cheatsheet--sub">Say <span class="blip-gmail-voice-kw">show my email</span> or tap a row · <span class="blip-gmail-voice-kw">do you have … email</span> for saved contacts</p>
>>>>>>> ui-update-final
                    </div>
                    <div class="blip-gmail-layout blip-gmail-layout-secondary">
                        <div class="blip-gmail-list blip-panel-scroll">
                            ${messages.length ? messages.map((message, index) => `
                                <button
                                    type="button"
                                    class="blip-gmail-message${String(message?.id || '') === selectedId ? ' is-active' : ''}"
                                    data-gmail-open="${escapeHtml(String(message?.id || ''))}">
                                    <div class="blip-gmail-message-head">
                                        <span class="blip-gmail-index">#${index + 1}</span>
                                        <span class="blip-gmail-from">${escapeHtml(String(message?.from || 'Unknown sender'))}</span>
                                        <span class="blip-gmail-date">${escapeHtml(formatGmailMessageDate(message))}</span>
                                    </div>
                                    <div class="blip-gmail-subject">${escapeHtml(String(message?.subject || '(No subject)'))}</div>
                                    <div class="blip-gmail-snippet">${escapeHtml(getGmailPreviewText(message) || 'No preview available.')}</div>
                                </button>
                            `).join('') : `<div class="blip-panel-empty">No ${mailboxLabel.toLowerCase()} messages loaded yet.</div>`}
                        </div>
                        <div class="blip-gmail-reader blip-panel-card">
                            <div class="blip-gmail-reader-kicker">${escapeHtml(mailboxLabel)} Preview</div>
                            ${selectedMessage ? `
                                <div class="blip-gmail-reader-subject">${escapeHtml(String(selectedMessage.subject || '(No subject)'))}</div>
                                <div class="blip-gmail-reader-meta">${escapeHtml(String(selectedMessage.from || 'Unknown sender'))}${selectedMessage?.date ? ` · ${escapeHtml(String(selectedMessage.date))}` : ''}</div>
                                <div class="blip-gmail-reader-body blip-panel-scroll">${escapeHtml(bodyText || 'No body text available.')}</div>
<<<<<<< HEAD
                            ` : '<div class="blip-panel-empty">Pick an email on the left, or say "read email 1".</div>'}
=======
                            ` : '<div class="blip-panel-empty">Pick a message in the list or say “read email 1”.</div>'}
>>>>>>> ui-update-final
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function openGmailInboxPanel(options = {}) {
        const authState = getGoogleGmailAuthState();
        if (!authState.connected) {
            throw new Error('Google Gmail is not connected. Press Connect Gmail in Settings first.');
        }

        const mailbox = normalizeGmailMailbox(options.mailbox || state.gmailMailbox || 'inbox');
        await loadGmailInboxState({
            maxResults: Number(options.maxResults) || 12,
            selectId: options.selectId || '',
            mailbox
        });

        renderActionInSidePanel({
            action: 'gmail',
            tool_params: {
                authState: getGoogleGmailAuthState(),
                profile: state.gmailProfile,
                mailbox,
                messages: state.gmailMessages,
                selectedMessage: state.gmailSelectedMessage,
                composeDraft: state.gmailComposeDraft
            },
            text: options.summary || (state.gmailMessages.length
                ? `${getGmailMailboxLabel(mailbox)} open. ${state.gmailMessages.length} message${state.gmailMessages.length === 1 ? '' : 's'} loaded.`
                : `${getGmailMailboxLabel(mailbox)} open.`)
        });

        if (!isSidePanelActuallyVisible('gmail')) {
            throw new Error('I tried to open Gmail, but the window did not appear.');
        }
    }

    async function openGmailMessageByIndex(index) {
        const list = Array.isArray(state.gmailMessages) && state.gmailMessages.length
            ? state.gmailMessages
            : await listGoogleGmailMessages({ maxResults: 12, labelIds: getGmailMailboxLabelIds(state.gmailMailbox || 'inbox') });

        state.gmailMessages = Array.isArray(list) ? list : [];

        const target = state.gmailMessages[index - 1];
        if (!target?.id) {
            return { ok: false, text: `I could not find email ${index}.` };
        }

        state.gmailSelectedMessageId = target.id;
        state.gmailSelectedMessage = await getGoogleGmailMessage(target.id);

        await openGmailInboxPanel({
            selectId: target.id,
            summary: `Opened email ${index}.`
        });

        return { ok: true, text: `Opened email ${index}.` };
    }

    async function sendCurrentGmailDraft(draft = {}, options = {}) {
        const to = String(resolveEmailRecipient(draft?.to, draft?.recipientQuery) || draft?.to || '').trim();
        const subject = String(draft?.subject || '').trim();
        const text = String(draft?.text || '').trim();
        const attachments = Array.isArray(draft?.attachments) ? draft.attachments : [];

        if (!to || !text) {
            const unknownRecipientReply = draft?.recipientQuery ? buildUnknownRecipientReply(draft.recipientQuery) : '';
            state.lastGmailSendResult = {
                ok: false,
                to,
                subject,
                message: unknownRecipientReply || 'Need at least To and Message before I can send the email.'
            };
            return { ok: false, text: unknownRecipientReply || 'Need at least To and Message before I can send the email.' };
        }

        // Fix: previously the payload could contain attachments, but they were never passed to the backend.
        const sendResult = await sendGoogleGmailMessage({ to, subject, text, attachments });
        const sentId = String(sendResult?.id || '').trim();
        let verified = false;
        if (sentId) {
            try {
                const verifiedMessage = await getGoogleGmailMessage(sentId);
                verified = String(verifiedMessage?.id || '').trim() === sentId;
            } catch (error) {
                console.warn('Gmail sent verification failed:', error?.message || error);
            }
        }
        state.lastGmailSendResult = {
            ok: true,
            to,
            subject,
            id: sentId,
            threadId: String(sendResult?.threadId || '').trim(),
            verified
        };

        clearPendingEmailReview();
        resetGmailComposeDraft();
        if (!options.silent) {
            await openGmailInboxPanel({
                mailbox: 'sent',
                selectId: sentId,
                summary: verified ? `Email sent to ${to}` : `Gmail accepted the email for ${to}`
            });
        }
        return {
            ok: true,
            text: verified
                ? `Email sent to ${to}`
                : `Gmail accepted the email for ${to}, but I could not verify it in Sent yet.`
        };
    }

    function bindGmailPanelControls(sidePanel) {
        const syncDraftFromInputs = () => {
            const toInput = sidePanel.querySelector('[data-gmail-to]');
            const subjectInput = sidePanel.querySelector('[data-gmail-subject]');
            const bodyInput = sidePanel.querySelector('[data-gmail-body]');
            const resolvedRecipient = resolveRecipientInput(toInput?.value || '');
            const subjectValue = String(subjectInput?.value || '').trim();
            resetGmailComposeDraft({
                to: resolvedRecipient.recipient || '',
                recipientQuery: resolvedRecipient.recipientQuery || '',
                subject: subjectValue,
                subjectSkipped: subjectValue ? false : !!state.gmailComposeDraft.subjectSkipped,
                text: bodyInput?.value || '',
                attachments: state.gmailComposeDraft.attachments
            });
        };

        sidePanel.querySelectorAll('[data-gmail-to], [data-gmail-subject], [data-gmail-body]').forEach((input) => {
            input.addEventListener('input', syncDraftFromInputs);
            input.addEventListener('change', syncDraftFromInputs);
        });

        sidePanel.querySelectorAll('[data-gmail-contact]').forEach((button) => {
            button.addEventListener('click', async () => {
                const email = String(button.getAttribute('data-gmail-contact') || '').trim();
                if (!email) return;
                const reply = await applyDraftUpdate({ to: email, recipientQuery: '' }, 'Recipient updated.');
                if (transcriptText) transcriptText.innerText = reply;
            });
        });

<<<<<<< HEAD
        sidePanel.querySelectorAll('[data-gmail-mailbox]').forEach((button) => {
            button.addEventListener('click', async () => {
                const mailbox = normalizeGmailMailbox(button.getAttribute('data-gmail-mailbox') || 'inbox');
                syncDraftFromInputs();
                try {
                    await openGmailInboxPanel({ mailbox, summary: `${getGmailMailboxLabel(mailbox)} open.` });
                    if (transcriptText) transcriptText.innerText = `${getGmailMailboxLabel(mailbox)} open.`;
                } catch (error) {
                    console.warn('Open Gmail mailbox failed:', error?.message || error);
                    if (transcriptText) transcriptText.innerText = error?.message || `Could not open ${mailbox}.`;
                }
            });
        });

=======
>>>>>>> ui-update-final
        sidePanel.querySelectorAll('[data-gmail-open]').forEach((button) => {
            button.addEventListener('click', async () => {
                const messageId = button.getAttribute('data-gmail-open');
                if (!messageId) return;

                syncDraftFromInputs();
                try {
                    state.gmailSelectedMessageId = messageId;
                    state.gmailSelectedMessage = await getGoogleGmailMessage(messageId);
                    await openGmailInboxPanel({ selectId: messageId, summary: 'Email open.' });
                    if (transcriptText) transcriptText.innerText = 'Email open.';
                } catch (error) {
                    console.warn('Open Gmail message failed:', error?.message || error);
                    if (transcriptText) transcriptText.innerText = error?.message || 'Could not open that email.';
                }
            });
        });

<<<<<<< HEAD
        sidePanel.querySelector('[data-gmail-refresh]')?.addEventListener('click', async () => {
            syncDraftFromInputs();
            try {
                await openGmailInboxPanel({ summary: 'Inbox refreshed.' });
                if (transcriptText) transcriptText.innerText = 'Inbox refreshed.';
            } catch (error) {
                console.warn('Refresh Gmail inbox failed:', error?.message || error);
                if (transcriptText) transcriptText.innerText = error?.message || 'Could not refresh Gmail.';
            }
        });

        sidePanel.querySelector('[data-gmail-compose-clear]')?.addEventListener('click', async () => {
            clearPendingEmailReview();
            resetGmailComposeDraft();
            await openGmailInboxPanel({ summary: 'New email ready.' });
            if (transcriptText) transcriptText.innerText = 'New email ready.';
        });

        sidePanel.querySelector('[data-gmail-send]')?.addEventListener('click', async () => {
            const toInput = sidePanel.querySelector('[data-gmail-to]');
            const subjectInput = sidePanel.querySelector('[data-gmail-subject]');
            const bodyInput = sidePanel.querySelector('[data-gmail-body]');
            const resolvedRecipient = resolveRecipientInput(toInput?.value || '');
            const subjectValue = String(subjectInput?.value || '').trim();

            resetGmailComposeDraft({
                to: resolvedRecipient.recipient || '',
                recipientQuery: resolvedRecipient.recipientQuery || '',
                subject: subjectValue,
                subjectSkipped: subjectValue ? false : !!state.gmailComposeDraft.subjectSkipped,
                text: bodyInput?.value || '',
                attachments: state.gmailComposeDraft.attachments
            });

            try {
                const result = await sendCurrentGmailDraft(state.gmailComposeDraft);
                if (transcriptText) transcriptText.innerText = result.text;
                if (result?.ok) {
                    playEmailSendConfirm?.({ delayMs: 140 });
                }
            } catch (error) {
                console.warn('Send Gmail from panel failed:', error?.message || error);
                if (transcriptText) transcriptText.innerText = error?.message || 'Could not send that email.';
            }
        });

=======
>>>>>>> ui-update-final
        requestAnimationFrame(() => {
            const compose = sidePanel.querySelector('.blip-gmail-compose-simplified');
            const bodyEl = sidePanel.querySelector('[data-gmail-body]');
            compose?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            bodyEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
    }

    async function handleVoiceCommand(gmailCmd = {}) {
        if (gmailCmd.action === 'connect') {
            await connectGoogleGmail();
            const profile = await getGoogleGmailProfile();
            state.gmailProfile = profile || null;
            updateGmailAuthUi();
            await quickReply(profile?.email ? `Gmail connected as ${profile.email}.` : 'Gmail connected.', 'happy');
            return;
        }

        if (gmailCmd.action === 'disconnect') {
            clearPendingEmailReview();
            await disconnectGoogleGmail();
            state.gmailProfile = null;
            state.gmailMessages = [];
            state.gmailSelectedMessageId = '';
            state.gmailSelectedMessage = null;
            updateGmailAuthUi();
            await quickReply('Gmail disconnected.', 'happy');
            return;
        }

        if (gmailCmd.action === 'openInbox' || gmailCmd.action === 'refreshInbox') {
            await openGmailInboxPanel({
                mailbox: 'inbox',
                summary: gmailCmd.action === 'refreshInbox' ? 'Inbox refreshed.' : 'Inbox open.'
            });
            updateGmailAuthUi();
            await quickReply(
                gmailCmd.action === 'refreshInbox' ? 'Inbox refreshed.' : 'Inbox open.',
                'happy',
                ''
            );
            return;
        }

        if (gmailCmd.action === 'openSent' || gmailCmd.action === 'refreshSent') {
            await openGmailInboxPanel({
                mailbox: 'sent',
                summary: gmailCmd.action === 'refreshSent' ? 'Sent refreshed.' : 'Sent open.'
            });
            updateGmailAuthUi();
            await quickReply(
                gmailCmd.action === 'refreshSent' ? 'Sent refreshed.' : 'Sent open.',
                'happy',
                ''
            );
            return;
        }

        if (gmailCmd.action === 'openDraft') {
            const reply = await reopenSavedDraft({ summary: 'Email draft ready.', source: 'open-draft' });
            await quickReply(reply, 'happy');
            return;
        }

        if (gmailCmd.action === 'readIndex') {
            const result = await openGmailMessageByIndex(gmailCmd.index);
            await quickReply(result.text, result.ok ? 'happy' : 'sad', '', false);
            return;
        }

        if (gmailCmd.action === 'compose') {
            const reply = await openDraftForReview(gmailCmd.draft || {}, {
                summary: 'Email open — follow the steps: who to send to, subject, then message. Say send when it looks right.',
                source: 'compose'
            });
            await quickReply(reply, 'happy');
            return;
        }

        if (gmailCmd.action === 'listContacts') {
            await quickReply(buildEmailContactsReply(), 'happy');
            return;
        }

        if (gmailCmd.action === 'checkContact') {
            await quickReply(buildKnownContactReply(gmailCmd.alias || ''), 'happy');
            return;
        }

        if (gmailCmd.action === 'saveContact') {
            const alias = getEmailContactLabel(gmailCmd.alias || '');
            const recipient = resolveRecipientForSave(gmailCmd);
            if (!alias || !recipient) {
                await quickReply(
                    'Tell me the address and who to save it as — for example save someone@example.com as my daughter — or put the email in To whom and say save this recipient as my daughter.',
                    'happy'
                );
                return;
            }
            saveEmailContact(alias, recipient);
            await quickReply(`Okay. I will remember ${alias} as ${recipient}.`, 'happy');
            try {
                if (state.currentSidePanelAction === 'gmail' && getGoogleGmailAuthState()?.connected) {
                    await openGmailInboxPanel({ summary: 'Contact saved.' });
                }
            } catch (_) { /* panel optional */ }
            return;
        }

        if (gmailCmd.action === 'clearContacts') {
            state.emailContacts = {};
            persistEmailContacts?.();
            await quickReply('Saved email contacts cleared. Say save someone@example.com as a name when you want to add them again.', 'happy');
            try {
                if (state.currentSidePanelAction === 'gmail' && getGoogleGmailAuthState()?.connected) {
                    await openGmailInboxPanel({ summary: 'Contacts cleared.' });
                }
            } catch (_) { /* panel optional */ }
            return;
        }

        if (gmailCmd.action === 'sendStatus') {
            await quickReply(buildLastSendStatusReply(), 'happy');
            return;
        }

        if (gmailCmd.action === 'setSubject') {
            const authState = getGoogleGmailAuthState();
            if (!authState.connected) {
                await quickReply('Connect Gmail in Settings first, then try again.', 'happy');
                return;
            }
            const subject = String(gmailCmd.subject || '').trim();
            if (!subject) {
                await quickReply('What should the subject be?', 'happy');
                return;
            }
            const reply = await applyDraftUpdate({ subject, subjectSkipped: false }, 'Subject updated.');
            await quickReply(reply, 'happy');
            return;
        }

        if (gmailCmd.action === 'composeLatestNote') {
            const payload = await buildEmailPayloadFromContext({
                shareType: 'note',
                subject: gmailCmd.subject || ''
            });
            if (!payload) {
                await quickReply('I could not find a saved note yet.', 'sad');
                return;
            }
            const reply = await openDraftForReview(payload, { summary: 'Note ready as email.', source: 'note' });
            await quickReply(reply, 'happy');
            return;
        }

        if (gmailCmd.action === 'sendDirect') {
            // Always open the Email panel so To / subject / body are visible; send only after explicit Send or “send”.
            const reply = await openDraftForReview({
                to: gmailCmd.to || '',
                recipientQuery: gmailCmd.recipientQuery || '',
                subject: gmailCmd.subject || '',
                text: gmailCmd.text || '',
                attachments: Array.isArray(gmailCmd.attachments) ? gmailCmd.attachments : []
            }, {
                summary: 'Email draft ready.',
                source: 'direct-send'
            });
            await quickReply(reply, 'happy');
            return;
        }

        if (gmailCmd.action === 'shareCurrent') {
            const payload = await buildEmailPayloadFromContext(gmailCmd);
            if (!payload) {
                await quickReply(
                    'I could not tell what to send. Try: send this note, send this video, send this photo, or send this date.',
                    'sad'
                );
                return;
            }

            const reply = await openDraftForReview(payload, { summary: 'Email draft ready.', source: gmailCmd.shareType || 'auto' });
            await quickReply(reply, 'happy');
            return;
        }

        if (gmailCmd.action === 'close') {
            clearPendingEmailReview();
            const didClose = state.currentSidePanelAction === 'gmail' ? !!closeSidePanel() : false;
            await quickReply(didClose ? 'Gmail closed.' : 'Gmail was not open.', 'happy');
            return;
        }
    }

    function bindSettingsControls() {
        if (connectGmailBtn) {
            connectGmailBtn.onclick = async () => {
                try {
                    await connectGoogleGmail();
                    const profile = await getGoogleGmailProfile();
                    state.gmailProfile = profile || null;
                    if (transcriptText) {
                        transcriptText.innerText = profile?.email
                            ? `Google Gmail connected as ${profile.email}.`
                            : 'Google Gmail connected.';
                    }
                } catch (error) {
                    console.warn('Google Gmail connect failed:', error?.message || error);
                    if (transcriptText) transcriptText.innerText = error?.message || 'Could not connect Google Gmail.';
                } finally {
                    updateGmailAuthUi();
                }
            };
        }

        if (openGmailInboxBtn) {
            openGmailInboxBtn.onclick = async () => {
                try {
                    await openGmailInboxPanel();
                    if (transcriptText) transcriptText.innerText = 'Gmail open.';
                } catch (error) {
                    console.warn('Open Gmail inbox failed:', error?.message || error);
                    if (transcriptText) transcriptText.innerText = error?.message || 'Could not open Gmail.';
                } finally {
                    updateGmailAuthUi();
                }
            };
        }

        if (disconnectGmailBtn) {
            disconnectGmailBtn.onclick = async () => {
                try {
                    clearPendingEmailReview();
                    await disconnectGoogleGmail();
                    state.gmailProfile = null;
                    state.gmailMessages = [];
                    state.gmailSelectedMessageId = '';
                    state.gmailSelectedMessage = null;
                    if (transcriptText) transcriptText.innerText = 'Google Gmail disconnected.';
                } catch (error) {
                    console.warn('Google Gmail disconnect failed:', error?.message || error);
                    if (transcriptText) transcriptText.innerText = error?.message || 'Could not disconnect Google Gmail.';
                } finally {
                    updateGmailAuthUi();
                }
            };
        }
    }

    async function initBackend() {
        await initGoogleGmail();
        onGoogleGmailAuthStateChange((authState) => {
            updateGmailAuthUi(authState);
        });
        updateGmailAuthUi();
    }

    return {
        // UI
        updateGmailAuthUi,
        bindSettingsControls,
        initBackend,

        // Panel
        buildGmailPanelHtml,
        bindGmailPanelControls,

        // Voice
        handleVoiceCommand,
        handlePendingVoiceFollowUp,

        // Actions
        openInboxPanel: openGmailInboxPanel,
        openMessageByIndex: openGmailMessageByIndex,
        sendCurrentDraft: sendCurrentGmailDraft,
        resetComposeDraft: resetGmailComposeDraft,

        // For other parts (optional wiring)
        buildEmailPayloadFromContext,
    };
}
