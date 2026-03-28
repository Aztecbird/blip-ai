import { generateWithPrompt } from '../../services/geminiText.js';
import {
    recordConversationAction,
    setToolBranchState
} from '../../services/toolConversation.js';

/**
 * True when the user is clarifying they have not dictated the real message yet (not the message body).
 * Matches ASR-normalized text where apostrophes became spaces (e.g. "haven t").
 */
export function isTelegramMetaNoMessageUtterance(command = '') {
    const lower = String(command || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!lower) return false;
    return (
        /\b(haven|didn)\s+t\s+told\s+you\s+(the\s+)?(message|text)\b/.test(lower)
        || /\bhavent\s+told\s+you\s+(the\s+)?(message|text)\b/.test(lower)
        || /\b(haven|didn)\s+t\s+given\s+you\s+(the\s+)?(message|text)\b/.test(lower)
        || /\bnot\s+(the\s+)?(real\s+)?(message|text)\s+yet\b/.test(lower)
        || /^i\s+(still\s+)?need\s+to\s+(give|tell)\s+you\s+(the\s+)?(message|text)\b/.test(lower)
    );
}

export function parseTelegramFollowUp(command = '') {
    const lower = String(command || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!lower) return null;
    if (/\b(?:email|gmail|mail)\b/.test(lower) && !/\btelegram\b/.test(lower)) return null;
    /** Anchored send commands (same family as Gmail strong-send; must not match long message bodies). */
    const telegramStrongSendRe =
        /^(?:send|send\s+it|send\s+now|go\s+ahead|go\s+on|go\s+send(?:\s+it)?|go\s+on\s+send(?:\s+it)?|go\s+ahead(?:\s+and)?\s+send(?:\s+it)?|now\s+send(?:\s+it)?|please\s+send(?:\s+it)?|yeah\s+send(?:\s+it)?|yep\s+send(?:\s+it)?|yup\s+send(?:\s+it)?|ok\s+send(?:\s+it)?|okay\s+send(?:\s+it)?|just\s+send(?:\s+it)?|do\s+it|mail\s+it|ship\s+it|fire\s+it\s+off)$/;
    const sendApprovalPhrases = new Set([
        'yes',
        'send',
        'send message',
        'send the message',
        'send this message',
        'send that message',
        'send it in telegram',
        'send message in telegram',
        'send the message in telegram',
        'send this message in telegram',
        'send that message in telegram',
        'send it',
        'send now',
        'go ahead',
        'go on',
        'okay send',
        'ok send',
        'please send',
        'perfect',
        'perfect send',
        'perfect scent',
        'ready',
        'done',
        'good',
        'great',
        'scent'
    ]);
    const reviewWordRe = /\b(review|read|check|look at|show me|open it|open message|see it|inspect it|view it)\b/;
    const improveWordRe = /\b(improve|edit|fix|revise|change|make it better|make it clearer|polish|tweak|friendlier|warmer|more friendly|more polite|more formal|shorter|clearer|nicer|better)\b/;
    if (reviewWordRe.test(lower) && improveWordRe.test(lower)) {
        return { action: 'improveDraft' };
    }
    if (reviewWordRe.test(lower)) {
        return { action: 'review' };
    }
    if (improveWordRe.test(lower)) {
        return { action: 'improveDraft' };
    }
    if (
        sendApprovalPhrases.has(lower)
        || telegramStrongSendRe.test(lower)
        || /^(?:ok|okay|alright)[,\s]+(?:(?:you|ya)\s+)?can\s+send(?:\s+it)?$/.test(lower)
        || /^(?:you|ya)\s+can\s+send(?:\s+it)?$/.test(lower)
        || /^(?:send|share)\s+(?:it|that|this)?\s+in\s+telegram$/.test(lower)
    ) {
        return { action: 'sendText' };
    }
    if (
        /^(?:send|share)\s+(?:(?:the|this|that|latest|last|current|open)\s+)?(?:photo|picture|image)(?:\s+now)?$/.test(lower)
        || /^(?:send|share)\s+latest\s+(?:photo|picture|image)(?:\s+now)?$/.test(lower)
    ) {
        return { action: 'sendPhoto' };
    }
    if (/^(?:clear|reset|start over|never mind|nevermind|forget it|cancel)$/.test(lower)) {
        return { action: 'clear' };
    }
    return { action: 'updateText', text: String(command || '').trim() };
}

export function canConfirmTelegramSend({
    pendingTelegramReview = false,
    currentSidePanelAction = '',
    isTelegramPanelVisible = false,
} = {}) {
    return Boolean(pendingTelegramReview && currentSidePanelAction === 'telegram' && isTelegramPanelVisible);
}

export function createTelegramFeature(env = {}) {
    const {
        state,
        transcriptText,
        elements = {},
        services = {},
        helpers = {},
    } = env;

    const {
        openTelegramBtn,
        sendTelegramTestBtn,
        telegramAuthStatus,
    } = elements;

    const {
        getTelegramAuthState,
        initTelegram,
        onTelegramAuthStateChange,
        sendTelegramMessage,
        sendTelegramPhoto,
        sendTelegramTest,
    } = services;

    const {
        escapeHtml,
        renderActionInSidePanel,
        isSidePanelActuallyVisible,
        closeSidePanel,
        quickReply,
        getEmailPhotoAttachmentPayload,
    } = helpers;

    function normalizeTelegramChatId(value = '') {
        return String(value || '').trim();
    }

    function normalizeTelegramAlias(value = '') {
        return String(value || '')
            .toLowerCase()
            .replace(/[^\w\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function getTelegramTargetLabel(chatId = '', authState = getTelegramAuthState()) {
        const customChatId = normalizeTelegramChatId(chatId);
        if (customChatId) {
            const aliasNames = Array.isArray(authState.aliasNames) ? authState.aliasNames : [];
            const normalizedTarget = normalizeTelegramAlias(customChatId);
            if (aliasNames.some((alias) => normalizeTelegramAlias(alias) === normalizedTarget)) {
                return `Alias ${customChatId}`;
            }
            return `Custom chat ${customChatId}`;
        }
        return authState.chatIdPreview ? `Default chat ${authState.chatIdPreview}` : 'Default Telegram chat';
    }

    function buildTelegramAliasHelp(authState = getTelegramAuthState()) {
        const aliasNames = Array.isArray(authState.aliasNames) ? authState.aliasNames : [];
        if (!aliasNames.length) return 'Use a chat id or leave this blank to send to the default chat.';
        const preview = aliasNames.slice(0, 4).join(', ');
        const moreCount = Math.max(0, aliasNames.length - 4);
        return moreCount > 0
            ? `Use a chat id or alias like ${preview}, and ${moreCount} more. Leave blank for the default chat.`
            : `Use a chat id or alias like ${preview}. Leave blank for the default chat.`;
    }

    function formatTelegramAuthStatus(authState = getTelegramAuthState()) {
        if (authState.backendConfigured) {
            return {
                text: authState.chatIdPreview
                    ? `Telegram ready for chat ${authState.chatIdPreview}.`
                    : 'Telegram backend ready.',
                tone: 'connected'
            };
        }
        return {
            text: 'Start the Telegram backend and add TELEGRAM_BOT_TOKEN plus TELEGRAM_CHAT_ID.',
            tone: 'warning'
        };
    }

    function updateTelegramAuthUi(authState = getTelegramAuthState()) {
        if (telegramAuthStatus) {
            const status = formatTelegramAuthStatus(authState);
            telegramAuthStatus.textContent = status.text;
            telegramAuthStatus.classList.remove('connected', 'warning');
            if (status.tone) telegramAuthStatus.classList.add(status.tone);
        }

        if (openTelegramBtn) {
            openTelegramBtn.disabled = !authState.backendConfigured;
        }
        if (sendTelegramTestBtn) {
            sendTelegramTestBtn.disabled = !authState.backendConfigured;
        }
    }

    function resetTelegramDraft(nextDraft = {}) {
        state.telegramDraft = {
            chatId: normalizeTelegramChatId(nextDraft?.chatId),
            text: String(nextDraft?.text || '').trim()
        };
        state.pendingTelegramReview = Boolean(state.telegramDraft.chatId || state.telegramDraft.text);
        setToolBranchState(state, 'telegram', {
            currentTask: 'edit draft',
            currentIntent: {
                family: 'telegram',
                action: 'compose',
                confidence: 0.9
            },
            activePanel: 'telegram',
            panelStack: ['telegram'],
            draft: { ...state.telegramDraft },
            note: state.pendingTelegramReview ? 'Telegram draft updated.' : 'Telegram draft cleared.'
        });
    }

    function clearTelegramDraft(options = {}) {
        const keepChatId = Boolean(options?.keepChatId);
        state.telegramDraft = {
            chatId: keepChatId ? normalizeTelegramChatId(state.telegramDraft?.chatId) : '',
            text: ''
        };
        state.pendingTelegramReview = false;
        setToolBranchState(state, 'telegram', {
            currentTask: 'clear draft',
            currentIntent: {
                family: 'telegram',
                action: 'openPanel',
                confidence: 0.8
            },
            activePanel: 'telegram',
            panelStack: ['telegram'],
            draft: { ...state.telegramDraft },
            note: 'Telegram draft cleared.'
        });
    }

    function buildLastTelegramStatusText() {
        const last = state.lastTelegramSendResult || null;
        if (!last) return '';
        if (!last.ok) return last.message ? `Last Telegram issue: ${last.message}` : 'Last Telegram send failed.';
        const targetSuffix = last.chatId ? ` to ${last.chatId}` : '';
        if (last.kind === 'photo') {
            return `Last Telegram photo sent${targetSuffix}.`;
        }
        return `Last Telegram message sent${targetSuffix}.`;
    }

    function cleanTelegramRewriteText(value = '') {
        return String(value || '')
            .replace(/```(?:text)?/gi, '')
            .replace(/```/g, '')
            .replace(/^["'“”]+|["'“”]+$/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async function applyTelegramDraftImprovement(command = '') {
        const draftText = String(state.telegramDraft?.text || '').trim();
        if (!draftText) {
            await quickReply('There is no message yet. Tell me the message first.', 'happy');
            return true;
        }

        const instruction = String(command || '').trim() || 'make it clearer and friendlier';
        const systemPrompt = [
            'You rewrite short Telegram messages.',
            'Keep the same meaning.',
            'Make the message sound natural, concise, and human.',
            'If the user asks for friendly wording, make it warmer and more polite.',
            'Return only the rewritten message text. No quotes, no markdown, no explanation.'
        ].join(' ');
        const userPrompt = `Current message:\n${draftText}\n\nRewrite instruction:\n${instruction}`;

        let nextText = '';
        try {
            if (state.geminiKey) {
                const raw = await generateWithPrompt(systemPrompt, userPrompt, state.geminiKey, state.selectedModel);
                nextText = cleanTelegramRewriteText(raw);
            }
        } catch (error) {
            console.warn('Telegram draft improvement failed:', error?.message || error);
        }

        if (!nextText) {
            const friendlyPrompt = /friendlier|more friendly|warmer|more polite|nicer/i.test(instruction);
            const base = draftText
                .replace(/^can you\s+/i, '')
                .replace(/^could you\s+/i, '')
                .replace(/^please\s+/i, '')
                .replace(/\s+please\.?$/i, '')
                .trim();
            nextText = friendlyPrompt
                ? `Could you ${base.replace(/^(?:review|check|look at|read)\s+the\s+/i, '')}`.replace(/\s+/g, ' ').trim()
                : base;
        }

        if (!nextText) nextText = draftText;
        state.telegramDraft = {
            chatId: normalizeTelegramChatId(state.telegramDraft?.chatId),
            text: nextText
        };
        state.pendingTelegramReview = true;
        await openTelegramPanel({ summary: 'Telegram message improved. Review the new version.' });
        await quickReply(`I improved the message: ${nextText}`, 'happy');
        return true;
    }

    function buildTelegramPanelHtml(toolParams = {}) {
        const authState = toolParams.authState || getTelegramAuthState();
        const draft = toolParams.draft || state.telegramDraft || { chatId: '', text: '' };
        const lastStatusText = buildLastTelegramStatusText();
        const customChatId = normalizeTelegramChatId(draft?.chatId);
        return `
            <div class="blip-telegram-shell">
                <div class="blip-telegram-toolbar blip-telegram-toolbar--voice">
                    <div class="blip-telegram-status${authState.backendConfigured ? ' connected' : ' warning'}">
                        ${escapeHtml(
                            authState.backendConfigured
                                ? (authState.chatIdPreview ? `Connected to chat ${authState.chatIdPreview}` : 'Telegram backend ready.')
                                : 'Telegram backend not ready yet.'
                        )}
                    </div>
                    <p class="blip-telegram-voice-cheatsheet">Say: <span class="blip-telegram-voice-kw">send</span> · <span class="blip-telegram-voice-kw">send photo</span> · <span class="blip-telegram-voice-kw">clear</span> · <span class="blip-telegram-voice-kw">telegram test</span> · <span class="blip-telegram-voice-kw">scroll down</span></p>
                </div>
                <div class="blip-telegram-card blip-panel-card">
                    <div class="blip-telegram-title">Message</div>
                    <div class="blip-telegram-chat-row blip-telegram-chat-row--compact">
                        <span class="blip-telegram-chat-label">To</span>
                        <span class="blip-telegram-chat-value">${escapeHtml(getTelegramTargetLabel(customChatId, authState))}</span>
                    </div>
                    ${lastStatusText ? `<div class="blip-telegram-send-status">${escapeHtml(lastStatusText)}</div>` : ''}
                    <label class="blip-telegram-slot">
                        <span class="blip-telegram-slot-label">Chat id or alias</span>
                        <input
                            data-telegram-chat-id
                            class="blip-telegram-input"
                            type="text"
                            placeholder="e.g. joy or numeric id — or leave default"
                            value="${escapeHtml(customChatId)}"
                        >
                        <span class="blip-telegram-slot-help">${escapeHtml(buildTelegramAliasHelp(authState))}</span>
                    </label>
                    <label class="blip-telegram-slot">
                        <span class="blip-telegram-slot-label">Message</span>
                        <textarea data-telegram-text class="blip-telegram-textarea" placeholder="Dictate or type…">${escapeHtml(String(draft?.text || ''))}</textarea>
                    </label>
                    <p class="blip-telegram-photo-note blip-telegram-photo-note--compact">Optional caption above applies to <strong>send photo</strong> (uses latest Media photo).</p>
                    <div class="blip-telegram-hints" aria-label="Example phrases">
                        <span class="blip-telegram-hint">tell Joy I’m outside</span>
                        <span class="blip-telegram-hint">message Joy on telegram</span>
                    </div>
                </div>
            </div>
        `;
    }

    async function openTelegramPanel(options = {}) {
        renderActionInSidePanel({
            action: 'telegram',
            tool_params: {
                authState: getTelegramAuthState(),
                draft: state.telegramDraft
            },
            text: options.summary || 'Telegram is open. Your message is ready to review.'
        });
        setToolBranchState(state, 'telegram', {
            currentTask: 'review draft',
            currentIntent: {
                family: 'telegram',
                action: 'compose',
                confidence: 0.9
            },
            activePanel: 'telegram',
            panelStack: ['telegram'],
            draft: { ...state.telegramDraft },
            note: String(options.summary || 'Telegram is open. Your message is ready to review.').trim()
        });

        if (!isSidePanelActuallyVisible('telegram')) {
            throw new Error('I tried to open Telegram, but the window did not appear.');
        }
    }

    function friendlyTelegramSendError(err) {
        const raw = String(err?.message || err || '').trim();
        if (/chat not found|chat_id is empty|missing telegram chat/i.test(raw)) {
            return 'Telegram could not find that chat. Set Chat id or alias in the panel, or fix TELEGRAM_CHAT_ID / aliases in your backend .env, and make sure that user has started the bot.';
        }
        return raw || 'Could not send Telegram message.';
    }

    async function sendCurrentTelegramText() {
        await initTelegram();
        const authState = getTelegramAuthState();
        const chatId = normalizeTelegramChatId(state.telegramDraft?.chatId);
        const text = String(state.telegramDraft?.text || '').trim();
        if (!text) {
            state.lastTelegramSendResult = {
                ok: false,
                kind: 'text',
                message: 'Need a message before I can send Telegram.'
            };
            return { ok: false, text: 'Need a message before I can send Telegram.' };
        }
        if (!chatId && !authState.hasChatId) {
            const hint = 'Say who should get this — for example send telegram to Mom — or type a chat id in the panel. You also need TELEGRAM_CHAT_ID in the backend if you rely on the default chat.';
            state.lastTelegramSendResult = { ok: false, kind: 'text', message: hint };
            return { ok: false, text: hint };
        }

        try {
            await sendTelegramMessage({ chatId, text });
        } catch (err) {
            const msg = friendlyTelegramSendError(err);
            state.lastTelegramSendResult = { ok: false, kind: 'text', message: msg };
            return { ok: false, text: msg };
        }

        state.lastTelegramSendResult = { ok: true, kind: 'text', chatId };
        clearTelegramDraft({ keepChatId: true });
        recordConversationAction(state, {
            tool: 'telegram',
            action_type: 'telegram_sent',
            target_object: chatId || 'default-chat',
            previous_state: { chatId, text },
            new_state: { chatId, text: '' },
            undo_strategy: 'compensating_followup',
            undo_window: 'session',
            user_visible_summary: `Sent Telegram message${chatId ? ` to ${chatId}` : ''}`
        });
        await openTelegramPanel({ summary: 'Telegram message sent.' });
        return { ok: true, text: 'Telegram message sent.' };
    }

    async function sendTelegramDraftDirect(draft = {}) {
        await initTelegram();
        const authState = getTelegramAuthState();
        const chatId = normalizeTelegramChatId(draft?.chatId);
        const text = String(draft?.text || '').trim();
        if (!text) {
            return { ok: false, text: 'Need a message before I can send Telegram.' };
        }
        if (!chatId && !authState.hasChatId) {
            return {
                ok: false,
                text: 'Say who should get this or set Chat id in the panel, and TELEGRAM_CHAT_ID in the backend for a default.',
            };
        }

        try {
            await sendTelegramMessage({ chatId, text });
        } catch (err) {
            return { ok: false, text: friendlyTelegramSendError(err) };
        }

        state.lastTelegramSendResult = { ok: true, kind: 'text', chatId };
        resetTelegramDraft({ chatId, text: '' });
        state.pendingTelegramReview = false;
        recordConversationAction(state, {
            tool: 'telegram',
            action_type: 'telegram_sent',
            target_object: chatId || 'default-chat',
            previous_state: { chatId, text },
            new_state: { chatId, text: '' },
            undo_strategy: 'compensating_followup',
            undo_window: 'session',
            user_visible_summary: `Sent Telegram message${chatId ? ` to ${chatId}` : ''}`
        });
        return { ok: true, text: 'Telegram message sent.' };
    }

    async function sendLatestTelegramPhoto(options = {}) {
        const payload = await getEmailPhotoAttachmentPayload();
        const attachment = Array.isArray(payload?.attachments) ? payload.attachments[0] : null;
        if (!attachment?.contentBase64) {
            throw new Error('Open a photo first or save one in Media.');
        }

        await sendTelegramPhoto({
            chatId: normalizeTelegramChatId(state.telegramDraft?.chatId),
            caption: String(state.telegramDraft?.text || '').trim(),
            photoBase64: `data:${attachment.mimeType || 'image/png'};base64,${attachment.contentBase64}`,
            filename: String(attachment.filename || 'blip-photo.png')
        });
        state.lastTelegramSendResult = {
            ok: true,
            kind: 'photo',
            chatId: normalizeTelegramChatId(state.telegramDraft?.chatId)
        };
        recordConversationAction(state, {
            tool: 'telegram',
            action_type: 'telegram_photo_sent',
            target_object: normalizeTelegramChatId(state.telegramDraft?.chatId) || 'default-chat',
            previous_state: {
                chatId: normalizeTelegramChatId(state.telegramDraft?.chatId),
                caption: String(state.telegramDraft?.text || '').trim()
            },
            new_state: { sent: true },
            undo_strategy: 'compensating_followup',
            undo_window: 'session',
            user_visible_summary: 'Sent Telegram photo'
        });
        clearTelegramDraft({ keepChatId: true });
        if (!options.silent) {
            await openTelegramPanel({ summary: 'Telegram photo sent.' });
        }
        return { ok: true, text: 'Telegram photo sent.' };
    }

    function bindTelegramPanelControls(sidePanel) {
        const syncDraftFromInputs = () => {
            const chatIdInput = sidePanel.querySelector('[data-telegram-chat-id]');
            const textInput = sidePanel.querySelector('[data-telegram-text]');
            resetTelegramDraft({
                chatId: chatIdInput?.value || '',
                text: textInput?.value || ''
            });
        };

        sidePanel.querySelector('[data-telegram-chat-id]')?.addEventListener('input', syncDraftFromInputs);
        sidePanel.querySelector('[data-telegram-chat-id]')?.addEventListener('change', syncDraftFromInputs);
        sidePanel.querySelector('[data-telegram-text]')?.addEventListener('input', syncDraftFromInputs);
        sidePanel.querySelector('[data-telegram-text]')?.addEventListener('change', syncDraftFromInputs);
    }

    async function handlePendingVoiceFollowUp(command = '') {
        if (!state.pendingTelegramReview && state.currentSidePanelAction !== 'telegram') return false;
        const followUp = parseTelegramFollowUp(command);
        if (!followUp) return false;

        if (followUp.action === 'sendText') {
            const result = await sendCurrentTelegramText();
            await quickReply(result.text, result.ok ? 'happy' : 'sad');
            return true;
        }

        if (followUp.action === 'sendPhoto') {
            try {
                const result = await sendLatestTelegramPhoto();
                await quickReply(result.text, 'happy');
            } catch (err) {
                await quickReply(friendlyTelegramSendError(err), 'sad');
            }
            return true;
        }

        if (followUp.action === 'clear') {
            clearTelegramDraft();
            await openTelegramPanel({ summary: 'Telegram cleared.' });
            await quickReply('Telegram cleared.', 'happy');
            return true;
        }

        if (followUp.action === 'review') {
            const draftText = String(state.telegramDraft?.text || '').trim();
            await openTelegramPanel({ summary: draftText ? 'Telegram is open. Review the current message.' : 'Telegram is open. What should the message say?' });
            state.pendingTelegramReview = true;
            await quickReply(
                draftText
                    ? `Here is the current message: ${draftText}. Tell me what to improve, or say send.`
                    : 'Telegram is open. What should the message say?',
                'happy'
            );
            return true;
        }

        if (followUp.action === 'improveDraft') {
            return applyTelegramDraftImprovement(command);
        }

        if (followUp.action === 'updateText') {
            if (isTelegramMetaNoMessageUtterance(followUp.text || command)) {
                await openTelegramPanel({ summary: 'Telegram is open. Dictate your message.' });
                await quickReply(
                    'Go ahead — say the message you want to send. When it looks right, say send.',
                    'happy'
                );
                return true;
            }
        }

        resetTelegramDraft({
            chatId: normalizeTelegramChatId(state.telegramDraft?.chatId),
            text: followUp.text || '',
        });
        await openTelegramPanel({ summary: 'Telegram is open. Your message is ready to review.' });
        await quickReply('Telegram is open. Your message is ready to review. Say send when you want me to send it.', 'happy');
        return true;
    }

    async function handleVoiceCommand(telegramCmd = {}) {
        if (telegramCmd.action === 'close') {
            state.pendingTelegramReview = false;
            const didClose = state.currentSidePanelAction === 'telegram' ? !!closeSidePanel() : false;
            await quickReply(didClose ? 'Telegram closed.' : 'Telegram was not open.', 'happy');
            return;
        }

        if (telegramCmd.action === 'sendTest') {
            await sendTelegramTest();
            state.lastTelegramSendResult = { ok: true, kind: 'text' };
            await quickReply('Telegram test sent.', 'happy');
            return;
        }

        if (telegramCmd.action === 'sharePhoto') {
            resetTelegramDraft(telegramCmd.draft || state.telegramDraft || {});
            
            if (telegramCmd.quickSend) {
                try {
                    const result = await sendLatestTelegramPhoto({ silent: true });
                    await quickReply(result.text, result.ok ? 'happy' : 'sad');
                } catch (err) {
                    await quickReply(friendlyTelegramSendError(err), 'sad');
                }
                return;
            }

            await openTelegramPanel({ summary: 'Telegram photo ready.' });
            state.pendingTelegramReview = true;
            await quickReply('Telegram is open. Add an optional caption, then say send photo.', 'happy');
            return;
        }

        if (telegramCmd.action === 'sendDirect') {
            const result = await sendTelegramDraftDirect(telegramCmd.draft || {});
            await quickReply(result.text, result.ok ? 'happy' : 'sad');
            return;
        }

        if (telegramCmd.action === 'compose' || telegramCmd.action === 'openPanel') {
            resetTelegramDraft(telegramCmd.draft || {});
            await openTelegramPanel({ summary: 'Telegram is open. Your message is ready to review.' });
            const hasText = !!String(state.telegramDraft?.text || '').trim();
            state.pendingTelegramReview = true;
            await quickReply(
                hasText
                    ? 'Telegram is open. Your message is ready to review. Say send when you want me to send it.'
                    : 'Telegram is open. What should the message say?',
                'happy'
            );
        }
    }

    function bindSettingsControls() {
        if (openTelegramBtn) {
            openTelegramBtn.onclick = async () => {
                try {
                    await openTelegramPanel({ summary: 'Telegram is open. Your message is ready to review.' });
                    if (transcriptText) transcriptText.innerText = 'Telegram is open. Your message is ready to review.';
                } catch (error) {
                    console.warn('Open Telegram failed:', error?.message || error);
                    if (transcriptText) transcriptText.innerText = error?.message || 'Could not open Telegram.';
                } finally {
                    updateTelegramAuthUi();
                }
            };
        }

        if (sendTelegramTestBtn) {
            sendTelegramTestBtn.onclick = async () => {
                try {
                    await sendTelegramTest();
                    state.lastTelegramSendResult = { ok: true, kind: 'text' };
                    if (transcriptText) transcriptText.innerText = 'Telegram test sent.';
                } catch (error) {
                    console.warn('Telegram test failed:', error?.message || error);
                    if (transcriptText) transcriptText.innerText = error?.message || 'Could not send Telegram test.';
                } finally {
                    updateTelegramAuthUi();
                }
            };
        }
    }

    async function initBackend() {
        await initTelegram();
        onTelegramAuthStateChange((authState) => {
            updateTelegramAuthUi(authState);
        });
        updateTelegramAuthUi();
    }

    return {
        updateTelegramAuthUi,
        bindSettingsControls,
        initBackend,
        buildTelegramPanelHtml,
        bindTelegramPanelControls,
        handleVoiceCommand,
        handlePendingVoiceFollowUp,
        openPanel: openTelegramPanel,
        sendCurrentText: sendCurrentTelegramText,
        sendLatestPhoto: sendLatestTelegramPhoto,
        resetDraft: resetTelegramDraft,
        closePanel: () => {
            state.pendingTelegramReview = false;
            return true;
        },
    };
}
