import { normalizeVoiceCommandText } from './textParsing.js';
import { parseBlipIntent } from './blipIntent.js';
import { getGmailVoiceCommand } from './gmailVoice.js';
import { parseNaturalMessageFlow } from './messageFlow.js';
import { getTelegramVoiceCommand } from './telegramVoice.js';
import { isStrongEmailSendDraftCommand } from './voiceDialog/emailFollowUpParse.js';
import { getVoiceRoutingContext } from './voiceDialog/context.js';
import { resolveStructuredVoiceIntent } from './voiceIntentSchema.js';
import {
    getCachedStructuredVoiceIntent,
    setCachedStructuredVoiceIntent,
    shouldCacheStructuredVoiceIntent
} from './voiceRoutingCache.js';
import { buildMessagingDraftSnapshot } from './messagingDraftSnapshot.js';
import { getVoiceMessagingFocus } from './voiceSession.js';

function buildStructuredVoiceIntentContext(state = {}, baseRoute = {}) {
    const drafts = buildMessagingDraftSnapshot(state);
    return {
        activePanel: String(state.currentSidePanelAction || ''),
        gmailFlow: Boolean(baseRoute.routingContext?.gmailFlow),
        telegramFlow: Boolean(baseRoute.routingContext?.telegramFlow),
        pendingEmailReview: Boolean(state.pendingEmailReview),
        pendingTelegramReview: Boolean(state.pendingTelegramReview),
        careCamActive: Boolean(state.careCamRunning || state.careCamViewerMode || state.careCamSessionId),
        lastMessagingFocus: getVoiceMessagingFocus(state) || '',
        hasGmailDraft: drafts.gmail.hasDraft,
        hasTelegramDraft: drafts.telegram.hasDraft,
        gmailHasBody: drafts.gmail.hasBody,
        telegramHasBody: drafts.telegram.hasBody,
    };
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

function isBareSendAffirmation(lower = '') {
    if (!lower) return false;
    return /^(?:send|send it|send now|please send|go ahead and send|go ahead|go on)$/.test(lower);
}

function isBareSendRoutingCommand(command = '', normalized = '') {
    const norm = String(normalized || '').trim();
    if (isBareSendAffirmation(norm)) return true;
    return isStrongEmailSendDraftCommand(command);
}

/**
 * Routes bare “send” / strong-send phrases to Gmail or Telegram without always preferring Gmail
 * when both drafts exist (uses short-lived messaging focus from voiceSession).
 */
function resolveBareSendRoute(command = '', normalized = '', state = {}, routingContext = {}, messagingDrafts = null) {
    if (!isBareSendRoutingCommand(command, normalized)) return null;

    const drafts = messagingDrafts || buildMessagingDraftSnapshot(state);
    const gmailDraft = drafts.gmail.hasDraft;
    const telegramDraft = drafts.telegram.hasDraft;
    const panel = String(state.currentSidePanelAction || '');
    const gf = Boolean(routingContext.gmailFlow);
    const tf = Boolean(routingContext.telegramFlow);

    if (panel === 'gmail' && (gf || gmailDraft)) {
        return { family: 'gmail', action: 'sendDirect', confidence: 0.92 };
    }
    if (panel === 'telegram' && (tf || telegramDraft)) {
        return { family: 'telegram', action: 'sendDirect', confidence: 0.92 };
    }

    if (gmailDraft && !telegramDraft) {
        return { family: 'gmail', action: 'sendDirect', confidence: 0.9 };
    }
    if (telegramDraft && !gmailDraft) {
        return { family: 'telegram', action: 'sendDirect', confidence: 0.9 };
    }

    if (gmailDraft && telegramDraft) {
        const focus = getVoiceMessagingFocus(state);
        if (focus === 'gmail') return { family: 'gmail', action: 'sendDirect', confidence: 0.86 };
        if (focus === 'telegram') return { family: 'telegram', action: 'sendDirect', confidence: 0.86 };
        return {
            family: 'message',
            action: 'clarify',
            confidence: 0.48,
            needsClarification: true,
            clarificationPrompt: 'Do you want to send the Gmail draft or the Telegram message?'
        };
    }

    if (gf && tf) {
        const focus = getVoiceMessagingFocus(state);
        if (focus === 'gmail') return { family: 'gmail', action: 'sendDirect', confidence: 0.78 };
        if (focus === 'telegram') return { family: 'telegram', action: 'sendDirect', confidence: 0.78 };
        return {
            family: 'message',
            action: 'clarify',
            confidence: 0.42,
            needsClarification: true,
            clarificationPrompt: 'Do you want Gmail or Telegram?'
        };
    }

    if (gf) return { family: 'gmail', action: 'sendDirect', confidence: 0.82 };
    if (tf) return { family: 'telegram', action: 'sendDirect', confidence: 0.82 };

    return null;
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

    const messagingDrafts = buildMessagingDraftSnapshot(state);
    const hasVoiceEmailDraft = messagingDrafts.gmail.hasDraft;
    const hasVoiceTelegramDraft = messagingDrafts.telegram.hasDraft;
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
    } else {
        const bareSend = resolveBareSendRoute(command, normalized, state, routingContext, messagingDrafts);
        if (bareSend) {
            family = bareSend.family;
            action = bareSend.action;
            confidence = bareSend.confidence;
            needsClarification = Boolean(bareSend.needsClarification);
            clarificationPrompt = bareSend.clarificationPrompt || '';
        } else if (isGenericMessagingPrompt(normalized)) {
            family = 'message';
            action = 'clarify';
            confidence = 0.35;
            needsClarification = true;
            clarificationPrompt = buildClarificationPrompt(normalized, routingContext, state);
        }
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
        hasVoiceTelegramDraft,
        messagingDrafts,
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

function finalizeStructuredVoiceRoute(baseRoute, structuredIntent) {
    if (!structuredIntent) return baseRoute;
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

    const cachedIntent = getCachedStructuredVoiceIntent(state, normalized);
    if (cachedIntent) {
        return finalizeStructuredVoiceRoute(baseRoute, cachedIntent);
    }

    try {
        const structuredIntent = await resolveStructuredVoiceIntent(
            command,
            buildStructuredVoiceIntentContext(state, baseRoute),
            {
                apiKey,
                model: options.model,
            }
        );

        if (!structuredIntent) {
            return baseRoute;
        }

        const resolved = finalizeStructuredVoiceRoute(baseRoute, structuredIntent);
        if (shouldCacheStructuredVoiceIntent(structuredIntent)) {
            setCachedStructuredVoiceIntent(state, normalized, structuredIntent);
        }
        return resolved;
    } catch (error) {
        console.warn('Structured voice intent parsing failed:', error?.message || error);
        return baseRoute;
    }
}
