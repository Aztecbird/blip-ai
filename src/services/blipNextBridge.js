import { createBlipNextRouter, createConversationState } from '../blip-next/index.js';

const FOLLOW_UP_RE = /^(?:yes|yeah|yep|no|nope|ok|okay|send|send it|go ahead|the second one|the first one|tomorrow instead|not that|change that|email instead|telegram instead|cancel it)\b/i;
const CONFIRM_REPLY_RE = /^(?:send|send it|yes|yeah|yep|ok|okay|go ahead|do it|no|nope|cancel|cancel it)\b/i;
const DISCARD_DRAFT_RE = /\b(?:forget|discard|drop|cancel|clear|delete|remove)\b.*\b(?:draft|message|email)\b|\b(?:cancel|forget)\s+it\b/i;
const EXPLICIT_NEW_COMMAND_RE = /\b(?:telegram|email|gmail|notes?|timer|youtube|weather|photo|video|camera)\b/i;
const NAVIGATION_PANEL_RE = /^(?:open|show|view|close|hide|dismiss|exit)\s+(?:my\s+)?(?:telegram|email|gmail|inbox|photos?|media|gallery|games?|notes?|calendar|map|chart|hub|student\s+desk|cart|youtube)\b/i;
const NAVIGATION_SHORTCUT_RE = /^(?:photos?|media|gallery|games?|notes?|telegram|email|gmail|youtube)\b$/i;
const MESSAGING_HINT_RE = /\b(?:send|share|telegram|email|gmail|message|draft|recipient|subject|caption)\b/i;

function normalizeText(value = '') {
    return String(value || '').trim().toLowerCase();
}

function hasEmailDraft(appState = {}) {
    const draft = appState.gmailComposeDraft || {};
    return !!(
        String(draft.to || '').trim()
        || String(draft.subject || '').trim()
        || String(draft.text || '').trim()
    );
}

function hasTelegramDraft(appState = {}) {
    const draft = appState.telegramDraft || {};
    return !!String(draft.text || '').trim();
}

function toRecipientDraft(entities = {}) {
    const recipient = String(entities.recipient || '').trim();
    if (!recipient) return { to: '', recipientQuery: '' };
    return recipient.includes('@')
        ? { to: recipient, recipientQuery: '' }
        : { to: '', recipientQuery: recipient };
}

function selectNoteText(appState = {}, referenceLabel = '') {
    const notes = Array.isArray(appState.hubItems)
        ? appState.hubItems.filter((item) => item?.type === 'note' && String(item?.content || '').trim())
        : [];
    if (!notes.length) return '';
    if (!referenceLabel) return String(notes[0]?.content || '').trim();

    const lowerReference = normalizeText(referenceLabel);
    const match = notes.find((item) => normalizeText(item.content).includes(lowerReference));
    return String(match?.content || notes[0]?.content || '').trim();
}

export function shouldTryBlipNextRoute(command = '', appState = {}) {
    const lower = normalizeText(command);
    if (!lower) return false;

    if (FOLLOW_UP_RE.test(lower)) return true;
    if (appState.pendingEmailReview || appState.pendingTelegramReview) return true;
    if (appState.blipNextConversationState?.working_memory?.active_workflow && lower.split(/\s+/).length <= 6) return true;

    return /\b(?:gmail|email|mail|telegram|message|timer|youtube|note|notes)\b/.test(lower);
}

function buildConversationSeed(appState = {}) {
    const previous = appState.blipNextConversationState || createConversationState();
    const activeTool = String(appState.currentSidePanelAction || '').trim() || previous.working_memory?.active_tool || null;
    const currentDraft = activeTool === 'gmail'
        ? appState.gmailComposeDraft || null
        : activeTool === 'telegram'
            ? appState.telegramDraft || null
            : previous.working_memory?.current_draft || null;
    const currentRecipient = activeTool === 'gmail'
        ? String(appState.gmailComposeDraft?.to || '').trim() || previous.working_memory?.current_recipient || null
        : activeTool === 'telegram'
            ? String(appState.telegramDraft?.chatId || '').trim() || previous.working_memory?.current_recipient || null
            : previous.working_memory?.current_recipient || null;
    const pendingConfirmation = appState.pendingEmailReview
        ? {
            workflow_id: 'gmail-review',
            action_label: 'send',
            tool: 'gmail',
            risk_level: 'high'
        }
        : appState.pendingTelegramReview
            ? {
                workflow_id: 'telegram-review',
                action_label: 'send',
                tool: 'telegram',
                risk_level: 'high'
            }
            : previous.working_memory?.pending_confirmation || null;

    return {
        ...previous,
        working_memory: {
            ...previous.working_memory,
            active_tool: activeTool,
            active_workflow: previous.working_memory?.active_workflow || (appState.pendingEmailReview ? 'gmail-review' : appState.pendingTelegramReview ? 'telegram-review' : null),
            pending_confirmation: pendingConfirmation,
            last_open_panel: String(appState.currentSidePanelAction || '').trim() || previous.working_memory?.last_open_panel || null,
            current_draft: currentDraft,
            current_recipient: currentRecipient,
            current_subject: String(appState.gmailComposeDraft?.subject || '').trim() || previous.working_memory?.current_subject || null,
            last_person_reference: previous.working_memory?.last_person_reference || currentRecipient,
            last_location_reference: String(appState.lastContext?.lastLocation || '').trim() || previous.working_memory?.last_location_reference || null,
            last_search_results: previous.working_memory?.last_search_results || [],
        }
    };
}

export function createBlipNextBridge(env = {}) {
    const router = env.router || createBlipNextRouter();

    function looksLikeExplicitNewCommand(command = '') {
        const text = normalizeText(command);
        if (!text) return false;
        if (CONFIRM_REPLY_RE.test(text) && text.split(/\s+/).length <= 3) return false;
        if (!EXPLICIT_NEW_COMMAND_RE.test(text)) return false;
        return text.split(/\s+/).length >= 4;
    }

    function isNavigationOrPanelCommand(command = '') {
        const text = normalizeText(command);
        if (!text) return false;
        return NAVIGATION_PANEL_RE.test(text) || NAVIGATION_SHORTCUT_RE.test(text);
    }

    function looksLikeGeneralConversation(command = '') {
        const text = normalizeText(command);
        if (!text) return false;
        if (MESSAGING_HINT_RE.test(text)) return false;
        if (CONFIRM_REPLY_RE.test(text)) return false;
        const words = text.split(/\s+/).filter(Boolean);
        return words.length >= 4;
    }

    function clearPendingDraftState(appState = {}) {
        appState.pendingEmailReview = false;
        appState.pendingTelegramReview = false;
        if (appState.gmailComposeDraft && typeof appState.gmailComposeDraft === 'object') {
            appState.gmailComposeDraft.to = '';
            appState.gmailComposeDraft.recipientQuery = '';
            appState.gmailComposeDraft.subject = '';
            appState.gmailComposeDraft.text = '';
            appState.gmailComposeDraft.attachments = [];
        }
        if (appState.telegramDraft && typeof appState.telegramDraft === 'object') {
            appState.telegramDraft.chatId = '';
            appState.telegramDraft.text = '';
        }
        if (appState.blipNextConversationState?.working_memory) {
            appState.blipNextConversationState.working_memory.pending_confirmation = null;
            appState.blipNextConversationState.working_memory.active_workflow = null;
        }
    }

    async function handOffToPendingFlow(command = '', appState = {}, route = {}) {
        const activeTool = route?.state?.working_memory?.active_tool || appState.currentSidePanelAction || '';

        if ((activeTool === 'telegram' || appState.pendingTelegramReview || hasTelegramDraft(appState)) && env.telegramFeature?.handlePendingVoiceFollowUp) {
            const handled = await env.telegramFeature.handlePendingVoiceFollowUp(command);
            if (handled) return true;
        }

        if ((activeTool === 'gmail' || appState.pendingEmailReview || hasEmailDraft(appState)) && env.emailFeature?.handlePendingVoiceFollowUp) {
            const handled = await env.emailFeature.handlePendingVoiceFollowUp(command);
            if (handled) return true;
        }

        return false;
    }

    async function handle(command = '', appState = {}) {
        const route = await router.routeTurn(command, buildConversationSeed(appState));
        const envelope = route.envelope || {};
        appState.blipNextConversationState = route.state;

        const hasPendingInteraction = Boolean(
            appState.pendingEmailReview ||
            appState.pendingTelegramReview ||
            appState.blipNextConversationState?.working_memory?.pending_confirmation ||
            appState.blipNextConversationState?.working_memory?.active_workflow
        );
        const commandText = normalizeText(command);
        if (hasPendingInteraction && looksLikeGeneralConversation(commandText)) {
            clearPendingDraftState(appState);
            // User moved back to regular conversation; do not keep them stuck in a prompted flow.
            return { handled: false, route };
        }
        if (hasPendingInteraction && isNavigationOrPanelCommand(commandText)) {
            clearPendingDraftState(appState);
            return { handled: false, route };
        }
        if (hasPendingInteraction && looksLikeExplicitNewCommand(commandText)) {
            clearPendingDraftState(appState);
            // User started a fresh command; allow normal command stack to handle it.
            return { handled: false, route };
        }
        if (hasPendingInteraction && DISCARD_DRAFT_RE.test(commandText)) {
            clearPendingDraftState(appState);
            // Let legacy handlers process follow-up actions like "open notes".
            if (/\bnotes?\b/.test(commandText)) return { handled: false, route };
            await env.quickReply?.('Okay, I dropped that draft.', 'happy');
            return { handled: true, route };
        }

        if (hasPendingReview && CONFIRM_REPLY_RE.test(commandText)) {
            const delegated = await handOffToPendingFlow(command, appState, route);
            if (delegated) return { handled: true, route };
        }

        if (Array.isArray(envelope.validation_errors) && envelope.validation_errors.includes('A pending confirmation exists and should be resolved first.')) {
            await env.quickReply?.('I still need your answer on the current draft. Say send, yes, or no.', 'happy');
            return { handled: true, route };
        }

        if (envelope.clarification_question) {
            await env.quickReply?.(envelope.clarification_question, 'happy');
            return { handled: true, route };
        }

        if (['confirmation', 'follow_up', 'correction'].includes(envelope.conversation_frame)) {
            const delegated = await handOffToPendingFlow(command, appState, route);
            if (delegated) return { handled: true, route };

            if (envelope.conversation_frame === 'correction') {
                await env.quickReply?.('Okay. What should I change?', 'happy');
                return { handled: true, route };
            }

            return { handled: false, route };
        }

        if (envelope.intent_type === 'timer.set') {
            const duration = envelope.extracted_entities?.duration || {};
            const unit = String(duration.unit || 'minutes');
            const value = Number(duration.value || 0);
            const multiplier = unit.startsWith('second') ? 1000 : 60000;
            const result = await env.runTimer?.({
                text: '',
                tool_params: {
                    ms: value * multiplier,
                    label: 'Timer'
                }
            });
            await env.quickReply?.(result?.text || 'Timer set.', 'happy', result?.extraHtml || '');
            return { handled: true, route };
        }

        if (envelope.intent_type === 'gmail.open') {
            await env.emailFeature?.handleVoiceCommand?.({ action: 'openInbox' });
            return { handled: true, route };
        }

        if (envelope.tool_targets?.includes('gmail')) {
            const entities = envelope.extracted_entities || {};
            const recipientDraft = toRecipientDraft(entities);
            const text = String(entities.body || entities.message || '').trim();

            await env.emailFeature?.handleVoiceCommand?.({
                action: 'compose',
                draft: {
                    to: recipientDraft.to,
                    recipientQuery: recipientDraft.recipientQuery,
                    subject: String(entities.subject || '').trim(),
                    text,
                    attachments: []
                }
            });
            return { handled: true, route };
        }

        if (envelope.tool_targets?.includes('telegram')) {
            const entities = envelope.extracted_entities || {};
            const text = String(entities.message || entities.body || entities.reference_item || '').trim();
            await env.telegramFeature?.handleVoiceCommand?.({
                action: 'compose',
                draft: {
                    chatId: String(entities.recipient || '').trim(),
                    text
                }
            });
            return { handled: true, route };
        }

        if (envelope.intent_type === 'workflow.compose' && envelope.tool_targets?.includes('notes') && envelope.tool_targets?.includes('gmail')) {
            const entities = envelope.extracted_entities || {};
            const recipientDraft = toRecipientDraft(entities);
            const noteText = selectNoteText(appState, entities.reference_item || entities.query || '');
            if (!noteText) {
                await env.quickReply?.('I could not find that note yet.', 'sad');
                return { handled: true, route };
            }

            await env.emailFeature?.handleVoiceCommand?.({
                action: 'compose',
                draft: {
                    to: recipientDraft.to,
                    recipientQuery: recipientDraft.recipientQuery,
                    subject: String(entities.subject || 'Note from Blip').trim(),
                    text: noteText,
                    attachments: []
                }
            });
            return { handled: true, route };
        }

        return { handled: false, route };
    }

    return { handle, router };
}
