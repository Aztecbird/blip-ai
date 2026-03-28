import { normalizeVoiceCommandText } from './textParsing.js';
import { parseBlipIntent } from './blipIntent.js';
import { getGmailVoiceCommand } from './gmailVoice.js';
import { parseNaturalMessageFlow } from './messageFlow.js';
import { getTelegramVoiceCommand } from './telegramVoice.js';
import { getVoiceRoutingContext } from './voiceDialog/context.js';
import { resolveStructuredVoiceIntent } from './voiceIntentSchema.js';

function hasVoiceDraft(draft = {}) {
    return Boolean(
        String(draft.to || '').trim()
        || String(draft.subject || '').trim()
        || String(draft.text || '').trim()
        || String(draft.chatId || '').trim()
    );
}

function isGenericMessagingPrompt(lower = '') {
    if (!lower) return false;
    return (
        /^(?:send|write|compose|message|text|email|mail|open|show|launch|close|hide|dismiss|exit)\b(?:\s+(?:it|that|this|them|me|a|an|the|message|email|mail|telegram|gmail|inbox|draft|drafts|panel|chat|photo|picture|image|shot|snapshot))*(?:\s+please)?$/.test(lower)
        || /^(?:send|write|compose)\s+(?:a\s+|an\s+|the\s+)?(?:message|email|mail|telegram)\b(?:\s+.*)?$/.test(lower)
        || /^(?:send|write|compose)\s+it(?:\s+.*)?$/.test(lower)
        || /^(?:message|text|email|mail)\s+(?:.+)$/.test(lower) && !/\b(?:gmail|telegram|email|mail|inbox)\b/.test(lower)
    );
}

function buildClarificationPrompt(lower = '', routingContext = {}, state = {}) {
    if (/\b(?:gmail|email|mail|inbox)\b/.test(lower) && /\b(?:telegram|text)\b/.test(lower)) {
        return 'Do you want Gmail or Telegram?';
    }
    if (/\b(?:send|write|compose|message|text)\b/.test(lower) && !/\b(?:gmail|email|mail|telegram)\b/.test(lower)) {
        if (routingContext.gmailFlow || routingContext.telegramFlow || state.currentSidePanelAction === 'gmail' || state.currentSidePanelAction === 'telegram') {
            return 'Do you want me to update the current draft, or start a new one?';
        }
        return 'Do you want Gmail or Telegram?';
    }
    if (/^(?:open|show|launch)\s+(?:it|that|this)\b/.test(lower)) {
        return 'What do you want me to open?';
    }
    return 'Can you say that a different way?';
}

export function buildVoiceRoutingSnapshot(command = '', state = {}) {
    const routingContext = getVoiceRoutingContext(state);
    const normalized = normalizeVoiceCommandText(command);
    const naturalMessageFlow = parseNaturalMessageFlow(command, routingContext);
    const gmailCmd = getGmailVoiceCommand(command);
    const telegramCmd = getTelegramVoiceCommand(command);
    const careCamIntent = parseBlipIntent(command, {
        careCamActive: state.careCamRunning || state.careCamViewerMode || state.careCamSessionId,
        careCamHelpActive: state.careCamFallWatchActive
    });

    const hasVoiceEmailDraft = hasVoiceDraft(state.gmailComposeDraft);
    const hasRecentGmailSend = Boolean(state.currentSidePanelAction === 'gmail' && state.lastGmailSendResult);
    const isFreshGmailComposeIntent = Boolean(
        gmailCmd
        && (
            gmailCmd.action === 'compose'
            || gmailCmd.action === 'sendDirect'
            || gmailCmd.action === 'shareCurrent'
            || gmailCmd.action === 'openDraft'
            || gmailCmd.action === 'openInbox'
            || gmailCmd.action === 'refreshInbox'
            || gmailCmd.action === 'readIndex'
            || gmailCmd.action === 'listContacts'
            || gmailCmd.action === 'saveContact'
            || gmailCmd.action === 'clearContacts'
            || gmailCmd.action === 'setSubject'
            || gmailCmd.action === 'connect'
            || gmailCmd.action === 'disconnect'
            || gmailCmd.action === 'close'
        )
    );
    const shouldHandleEmailDraftVoice = !isFreshGmailComposeIntent && (
        Boolean(state.pendingEmailReview)
        || (state.currentSidePanelAction === 'gmail' && hasVoiceEmailDraft)
        || hasRecentGmailSend
    );

    let family = 'none';
    let action = 'none';
    let confidence = 0.2;
    let needsClarification = false;
    let clarificationPrompt = '';

    if (careCamIntent?.kind === 'carecam' && careCamIntent.action !== 'none') {
        family = 'carecam';
        action = careCamIntent.action;
        confidence = Number(careCamIntent.confidence || 0.9);
    } else if (naturalMessageFlow?.channel === 'gmail' && !gmailCmd) {
        family = 'gmail';
        action = 'compose';
        confidence = 0.62;
    } else if (naturalMessageFlow?.channel === 'telegram' && !telegramCmd) {
        family = 'telegram';
        action = 'compose';
        confidence = 0.62;
    } else if (gmailCmd) {
        family = 'gmail';
        action = gmailCmd.action || 'none';
        confidence = 0.86;
    } else if (telegramCmd) {
        family = 'telegram';
        action = telegramCmd.action || 'none';
        confidence = 0.84;
    } else if (isGenericMessagingPrompt(normalized)) {
        family = 'message';
        action = 'clarify';
        confidence = 0.35;
        needsClarification = true;
        clarificationPrompt = buildClarificationPrompt(normalized, routingContext, state);
    }

    return {
        family,
        action,
        confidence,
        needsClarification,
        clarificationPrompt,
        routingContext,
        naturalMessageFlow,
        gmailCmd,
        telegramCmd,
        careCamIntent,
        hasVoiceEmailDraft,
        hasRecentGmailSend,
        shouldHandleEmailDraftVoice,
        isFreshGmailComposeIntent
    };
}

function shouldAttemptStructuredVoiceIntent(route = {}, normalized = '') {
    if (!route) return false;
    if (route.needsClarification) return true;
    if (route.family === 'message' && route.action === 'clarify') return true;
    if (!normalized) return false;

    const hasTelegramWord = /\btelegram\b/.test(normalized);
    const hasGmailWord = /\b(?:gmail|email|mail|inbox)\b/.test(normalized);

    if (hasTelegramWord && route.family !== 'telegram') return true;
    if (hasGmailWord && route.family !== 'gmail') return true;

    return route.family === 'none' && route.action === 'none' && /\b(?:send|write|compose|message|email|mail)\b/.test(normalized);
}

function buildStructuredFamilyCommand(intent = {}) {
    const family = intent.family || 'none';
    const action = intent.action || 'none';
    const draft = intent.draft || {};

    if (family === 'gmail') {
        if (action === 'compose' || action === 'sendDirect' || action === 'openPanel' || action === 'review') {
            return {
                action: action === 'review' ? 'openEmail' : action === 'openPanel' ? 'compose' : action,
                draft: {
                    to: String(draft.to || '').trim(),
                    recipientQuery: String(draft.recipientQuery || '').trim(),
                    subject: String(draft.subject || '').trim(),
                    text: String(draft.text || '').trim()
                }
            };
        }
    }

    if (family === 'telegram') {
        if (action === 'compose' || action === 'sendText' || action === 'sendDirect' || action === 'openPanel') {
            return {
                action: action === 'sendText' ? 'sendDirect' : action === 'openPanel' ? 'compose' : action,
                draft: {
                    chatId: String(draft.chatId || '').trim(),
                    text: String(draft.text || '').trim()
                }
            };
        }
    }

    if (family === 'carecam') {
        if (action === 'start_carecam' || action === 'stop_carecam' || action === 'request_help' || action === 'start_and_send_help' || action === 'urgent_help' || action === 'clear_help') {
            return {
                kind: 'carecam',
                action
            };
        }
    }

    return null;
}

function mergeStructuredVoiceIntent(baseRoute = {}, structuredIntent = null) {
    if (!structuredIntent) return baseRoute;

    const family = structuredIntent.family || baseRoute.family;
    const action = structuredIntent.action || baseRoute.action;
    const confidence = Math.max(Number(baseRoute.confidence || 0), Number(structuredIntent.confidence || 0));
    const needsClarification = Boolean(structuredIntent.needsClarification);
    const clarificationPrompt = structuredIntent.clarificationPrompt || baseRoute.clarificationPrompt;
    const structuredCommand = buildStructuredFamilyCommand(structuredIntent);

    return {
        ...baseRoute,
        family,
        action,
        confidence,
        needsClarification,
        clarificationPrompt,
        structuredVoiceIntent: structuredIntent,
        gmailCmd: structuredCommand && family === 'gmail' ? structuredCommand : baseRoute.gmailCmd,
        telegramCmd: structuredCommand && family === 'telegram' ? structuredCommand : baseRoute.telegramCmd,
        careCamIntent: structuredCommand && family === 'carecam'
            ? { kind: 'carecam', action: structuredCommand.action }
            : baseRoute.careCamIntent
    };
}

export async function resolveVoiceRoutingSnapshot(command = '', state = {}, options = {}) {
    const baseRoute = buildVoiceRoutingSnapshot(command, state);
    const normalized = normalizeVoiceCommandText(command);
    if (!shouldAttemptStructuredVoiceIntent(baseRoute, normalized)) {
        return baseRoute;
    }

    const apiKey = String(options.apiKey || state.geminiKey || '').trim();
    if (!apiKey) {
        return baseRoute;
    }

    try {
        const structuredIntent = await resolveStructuredVoiceIntent(command, {
            activePanel: state.currentSidePanelAction || '',
            gmailFlow: Boolean(baseRoute.routingContext?.gmailFlow),
            telegramFlow: Boolean(baseRoute.routingContext?.telegramFlow),
            pendingEmailReview: Boolean(state.pendingEmailReview),
            pendingTelegramReview: Boolean(state.pendingTelegramReview),
            careCamActive: Boolean(state.careCamRunning || state.careCamViewerMode || state.careCamSessionId),
        }, {
            apiKey,
            model: options.model,
        });

        if (!structuredIntent) {
            return baseRoute;
        }

        if (structuredIntent.needsClarification && !structuredIntent.clarificationPrompt) {
            return {
                ...baseRoute,
                structuredVoiceIntent: structuredIntent,
            };
        }

        if (structuredIntent.family === 'none' && structuredIntent.action === 'none') {
            return {
                ...baseRoute,
                structuredVoiceIntent: structuredIntent,
            };
        }

        return mergeStructuredVoiceIntent(baseRoute, structuredIntent);
    } catch (error) {
        console.warn('Structured voice intent parsing failed:', error?.message || error);
        return baseRoute;
    }
}
