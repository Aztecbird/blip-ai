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
        telegramBotTokenInput,
        telegramChatIdInput,
        telegramChatAliasesInput,
        telegramBackendPortInput,
        applyTelegramSettingsBtn,
        copyTelegramEnvBtn,
    } = elements;

    const {
        getTelegramBackendConfig,
        getTelegramAuthState,
        initTelegram,
        onTelegramAuthStateChange,
        saveTelegramBackendConfig,
        sendTelegramMessage,
        sendTelegramPhoto,
        sendTelegramVideo,
        sendTelegramTest,
    } = services;

    const {
        escapeHtml,
        renderActionInSidePanel,
        isSidePanelActuallyVisible,
        closeSidePanel,
        quickReply,
        getEmailPhotoAttachmentPayload,
        getEmailVideoAttachmentPayload,
        buildContextSharePayload,
    } = helpers;

    function normalizeTelegramChatId(value = '') {
        const raw = String(value || '').trim();
        const v = raw.toLowerCase();
        if (/^(?:my|me|self|myself|default|none|null|undefined)$/.test(v)) return '';
        // Common speech filler should never be treated as a literal chat id.
        if (/^(?:telegram|on\s+telegram|in\s+telegram|via\s+telegram|to\s+telegram|my\s+telegram)$/.test(v)) return '';
        // Voice/polycentric routes can pass slightly noisy self-target phrases.
        // Treat these as "send to my default Telegram chat".
        if (/\b(?:my|me|self|myself)\b(?:\s+(?:on|in|via|to))?\s+\btelegram\b/.test(v)) return '';
        if (/^\btelegram\b(?:\s+(?:for|to|on))?\s+\b(?:my|me|self|myself)\b/.test(v)) return '';
        return raw;
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
            openTelegramBtn.disabled = false;
            openTelegramBtn.title = authState.backendConfigured
                ? 'Open Telegram panel'
                : 'Telegram backend not ready yet, but you can still open the panel.';
        }
        if (sendTelegramTestBtn) {
            // Keep this clickable so users always get explicit error feedback.
            sendTelegramTestBtn.disabled = false;
            sendTelegramTestBtn.title = authState.backendConfigured
                ? 'Send Telegram test'
                : 'Telegram backend is not configured yet.';
        }
    }

    function resetTelegramDraft(nextDraft = {}) {
        state.telegramDraft = {
            chatId: normalizeTelegramChatId(nextDraft?.chatId),
            text: String(nextDraft?.text || '').trim()
        };
        state.pendingTelegramReview = Boolean(state.telegramDraft.chatId || state.telegramDraft.text);
    }

    function clearTelegramDraft(options = {}) {
        const keepChatId = Boolean(options?.keepChatId);
        state.telegramDraft = {
            chatId: keepChatId ? normalizeTelegramChatId(state.telegramDraft?.chatId) : '',
            text: ''
        };
        state.pendingTelegramReview = false;
    }

    function validateTelegramSendTarget(chatId = '', authState = getTelegramAuthState()) {
        const normalizedChatId = normalizeTelegramChatId(chatId);
        if (normalizedChatId) {
            return { ok: true, chatId: normalizedChatId };
        }
        if (authState?.hasChatId) {
            return { ok: true, chatId: '' };
        }
        return {
            ok: false,
            text: 'I need a Telegram target first. Open Telegram and set a chat id (or default chat), then say send again.'
        };
    }

    function buildLastTelegramStatusText() {
        const last = state.lastTelegramSendResult || null;
        if (!last) return '';
        if (!last.ok) return last.message ? `Last Telegram issue: ${last.message}` : 'Last Telegram send failed.';
        if (last.kind === 'photo') return 'Last Telegram photo sent.';
        if (last.kind === 'video') return 'Last Telegram video sent.';
        return 'Last Telegram message sent.';
    }

    function buildTelegramPanelHtml(toolParams = {}) {
        const authState = toolParams.authState || getTelegramAuthState();
        const draft = toolParams.draft || state.telegramDraft || { chatId: '', text: '' };
        const lastStatusText = buildLastTelegramStatusText();
        const readyForSend = !!String(draft?.text || '').trim();
        const customChatId = normalizeTelegramChatId(draft?.chatId);
        return `
            <div class="blip-telegram-shell">
                <div class="blip-telegram-toolbar">
                    <div class="blip-telegram-status${authState.backendConfigured ? ' connected' : ' warning'}">
                        ${escapeHtml(
                            authState.backendConfigured
                                ? (authState.chatIdPreview ? `Connected to chat ${authState.chatIdPreview}` : 'Telegram backend ready.')
                                : 'Telegram backend not ready yet.'
                        )}
                    </div>
                    <div class="blip-telegram-toolbar-actions">
                        <button type="button" class="action-link outline" data-telegram-send-test>Send Test</button>
                        <button type="button" class="action-link outline" data-telegram-clear>Clear</button>
                    </div>
                </div>
                <div class="blip-telegram-card blip-panel-card">
                    <div class="blip-telegram-title">Simple Telegram</div>
                    <div class="blip-telegram-chat-row">
                        <span class="blip-telegram-chat-label">Current Target</span>
                        <span class="blip-telegram-chat-value">${escapeHtml(getTelegramTargetLabel(customChatId, authState))}</span>
                    </div>
                    ${lastStatusText ? `<div class="blip-telegram-send-status">${escapeHtml(lastStatusText)}</div>` : ''}
                    <label class="blip-telegram-slot">
                        <span class="blip-telegram-slot-label">Chat ID Override</span>
                        <input
                            data-telegram-chat-id
                            class="blip-telegram-input"
                            type="text"
                            placeholder="Chat id or alias like joy"
                            value="${escapeHtml(customChatId)}"
                        >
                        <span class="blip-telegram-slot-help">${escapeHtml(buildTelegramAliasHelp(authState))}</span>
                    </label>
                    <label class="blip-telegram-slot">
                        <span class="blip-telegram-slot-label">Message</span>
                        <textarea data-telegram-text class="blip-telegram-textarea" placeholder="Type or dictate the message...">${escapeHtml(String(draft?.text || ''))}</textarea>
                    </label>
                    <div class="blip-telegram-photo-note">
                        Blip can also send the latest photo or video from Media with an optional caption from this message box. To send to somebody else, use their chat id or a saved alias here. Telegram bots can only message chats that already started the bot.
                    </div>
                    <div class="blip-telegram-hints">
                        <span class="blip-telegram-hint">open telegram</span>
                        <span class="blip-telegram-hint">send telegram message ...</span>
                        <span class="blip-telegram-hint">send telegram to joy message ...</span>
                        <span class="blip-telegram-hint">send picture to joy</span>
                        <span class="blip-telegram-hint">send this photo on telegram</span>
                        <span class="blip-telegram-hint">send this video on telegram</span>
                    </div>
                    <div class="blip-telegram-actions">
                        <button type="button" class="action-link outline" data-telegram-send-text${readyForSend ? '' : ' disabled'}>Send Message</button>
                        <button type="button" class="action-link outline" data-telegram-send-photo>Send Latest Photo</button>
                        <button type="button" class="action-link outline" data-telegram-send-video>Send Latest Video</button>
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
            text: options.summary || 'Telegram open.'
        });

        if (!isSidePanelActuallyVisible('telegram')) {
            throw new Error('I tried to open Telegram, but the window did not appear.');
        }
    }

    async function sendCurrentTelegramText() {
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
        const authState = getTelegramAuthState();
        const target = validateTelegramSendTarget(chatId, authState);
        if (!target.ok) {
            state.lastTelegramSendResult = {
                ok: false,
                kind: 'text',
                message: target.text
            };
            state.pendingTelegramReview = true;
            return { ok: false, text: target.text };
        }

        try {
            const backendResult = await sendTelegramMessage({ chatId: target.chatId, text });
            const resolvedChatId = normalizeTelegramChatId(backendResult?.chatId || target.chatId);
            state.lastTelegramSendResult = { ok: true, kind: 'text', chatId: resolvedChatId };
            clearTelegramDraft({ keepChatId: true });
            await openTelegramPanel({ summary: 'Telegram message sent.' });
            return { ok: true, text: 'Message sent.' };
        } catch (error) {
            console.warn('Telegram send message failed:', error?.message || error);
            state.lastTelegramSendResult = { ok: false, kind: 'text', message: error?.message || 'Could not send Telegram message.' };
            return { ok: false, text: error?.message || 'Could not send Telegram message.' };
        }
    }

    async function sendTelegramDraftDirect(draft = {}) {
        const chatId = normalizeTelegramChatId(draft?.chatId);
        const text = String(draft?.text || '').trim();
        if (!text) {
            return { ok: false, text: 'Need a message before I can send Telegram.' };
        }
        const authState = getTelegramAuthState();
        const target = validateTelegramSendTarget(chatId, authState);
        if (!target.ok) {
            state.lastTelegramSendResult = { ok: false, kind: 'text', message: target.text };
            state.pendingTelegramReview = true;
            return { ok: false, text: target.text };
        }

        try {
            const backendResult = await sendTelegramMessage({ chatId: target.chatId, text });
            const resolvedChatId = normalizeTelegramChatId(backendResult?.chatId || target.chatId);
            state.lastTelegramSendResult = { ok: true, kind: 'text', chatId: resolvedChatId };
            resetTelegramDraft({ chatId, text: '' });
            state.pendingTelegramReview = false;
            return { ok: true, text: 'Message sent.' };
        } catch (error) {
            console.warn('Telegram direct send failed:', error?.message || error);
            state.lastTelegramSendResult = { ok: false, kind: 'text', message: error?.message || 'Could not send Telegram message.' };
            return { ok: false, text: error?.message || 'Could not send Telegram message.' };
        }
    }

    async function sendLatestTelegramPhoto(options = {}) {
        const payload = await getEmailPhotoAttachmentPayload();
        const attachment = Array.isArray(payload?.attachments) ? payload.attachments[0] : null;
        if (!attachment?.contentBase64) {
            throw new Error('Open a photo first or save one in Media.');
        }

        const authState = getTelegramAuthState();
        const target = validateTelegramSendTarget(state.telegramDraft?.chatId, authState);
        if (!target.ok) {
            state.lastTelegramSendResult = { ok: false, kind: 'photo', message: target.text };
            state.pendingTelegramReview = true;
            return { ok: false, text: target.text };
        }
        const backendResult = await sendTelegramPhoto({
            chatId: target.chatId,
            caption: String(state.telegramDraft?.text || '').trim(),
            photoBase64: `data:${attachment.mimeType || 'image/png'};base64,${attachment.contentBase64}`,
            filename: String(attachment.filename || 'blip-photo.png')
        });
        const resolvedChatId = normalizeTelegramChatId(backendResult?.chatId || target.chatId);
        state.lastTelegramSendResult = {
            ok: true,
            kind: 'photo',
            chatId: resolvedChatId
        };
        clearTelegramDraft({ keepChatId: true });
        if (!options.silent) {
            await openTelegramPanel({ summary: 'Telegram photo sent.' });
        }
        return { ok: true, text: 'Telegram photo sent.' };
    }

    async function sendLatestTelegramVideo(options = {}) {
        const payload = await getEmailVideoAttachmentPayload();
        const attachment = Array.isArray(payload?.attachments) ? payload.attachments[0] : null;
        if (!attachment?.contentBase64) {
            throw new Error('Open a video first or record one in Media.');
        }
        const authState = getTelegramAuthState();
        const target = validateTelegramSendTarget(state.telegramDraft?.chatId, authState);
        if (!target.ok) {
            state.lastTelegramSendResult = { ok: false, kind: 'video', message: target.text };
            state.pendingTelegramReview = true;
            return { ok: false, text: target.text };
        }
        const backendResult = await sendTelegramVideo({
            chatId: target.chatId,
            caption: String(state.telegramDraft?.text || '').trim(),
            videoBase64: `data:${attachment.mimeType || 'video/webm'};base64,${attachment.contentBase64}`,
            filename: String(attachment.filename || 'blip-video.webm')
        });
        const resolvedChatId = normalizeTelegramChatId(backendResult?.chatId || target.chatId);
        state.lastTelegramSendResult = {
            ok: true,
            kind: 'video',
            chatId: resolvedChatId
        };
        clearTelegramDraft({ keepChatId: true });
        if (!options.silent) {
            await openTelegramPanel({ summary: 'Telegram video sent.' });
        }
        return { ok: true, text: 'Telegram video sent.' };
    }

    async function sendTelegramAttachmentPayload(payload = {}, draft = {}, options = {}) {
        const attachment = Array.isArray(payload?.attachments) ? payload.attachments[0] : null;
        if (!attachment?.contentBase64) {
            return { ok: false, text: 'I could not find an attachment to send on Telegram.' };
        }

        const mimeType = String(attachment.mimeType || '').trim().toLowerCase();
        const chatId = normalizeTelegramChatId(draft?.chatId);
        const caption = String(draft?.text || payload?.text || '').trim();
        const authState = getTelegramAuthState();
        const target = validateTelegramSendTarget(chatId, authState);
        if (!target.ok) {
            state.pendingTelegramReview = true;
            return { ok: false, text: target.text };
        }

        if (mimeType.startsWith('image/')) {
            const backendResult = await sendTelegramPhoto({
                chatId: target.chatId,
                caption,
                photoBase64: `data:${attachment.mimeType || 'image/png'};base64,${attachment.contentBase64}`,
                filename: String(attachment.filename || 'blip-photo.png')
            });
            const resolvedChatId = normalizeTelegramChatId(backendResult?.chatId || target.chatId);
            state.lastTelegramSendResult = { ok: true, kind: 'photo', chatId: resolvedChatId };
            clearTelegramDraft({ keepChatId: true });
            if (!options.silent) {
                await openTelegramPanel({ summary: 'Telegram photo sent.' });
            }
            return { ok: true, text: 'Telegram photo sent.' };
        }

        if (mimeType.startsWith('video/')) {
            const backendResult = await sendTelegramVideo({
                chatId: target.chatId,
                caption,
                videoBase64: `data:${attachment.mimeType || 'video/webm'};base64,${attachment.contentBase64}`,
                filename: String(attachment.filename || 'blip-video.webm')
            });
            const resolvedChatId = normalizeTelegramChatId(backendResult?.chatId || target.chatId);
            state.lastTelegramSendResult = { ok: true, kind: 'video', chatId: resolvedChatId };
            clearTelegramDraft({ keepChatId: true });
            if (!options.silent) {
                await openTelegramPanel({ summary: 'Telegram video sent.' });
            }
            return { ok: true, text: 'Telegram video sent.' };
        }

        return { ok: false, text: 'Telegram only supports photo or video attachments in this flow right now.' };
    }

    function bindTelegramPanelControls(sidePanel) {
        const updateSendButtonState = () => {
            const sendButton = sidePanel.querySelector('[data-telegram-send-text]');
            if (!sendButton) return;
            const hasText = !!String(state.telegramDraft?.text || '').trim();
            sendButton.disabled = !hasText;
        };

        const syncDraftFromInputs = () => {
            const chatIdInput = sidePanel.querySelector('[data-telegram-chat-id]');
            const textInput = sidePanel.querySelector('[data-telegram-text]');
            resetTelegramDraft({
                chatId: chatIdInput?.value || '',
                text: textInput?.value || ''
            });
            updateSendButtonState();
        };

        sidePanel.querySelector('[data-telegram-chat-id]')?.addEventListener('input', syncDraftFromInputs);
        sidePanel.querySelector('[data-telegram-chat-id]')?.addEventListener('change', syncDraftFromInputs);
        sidePanel.querySelector('[data-telegram-text]')?.addEventListener('input', syncDraftFromInputs);
        sidePanel.querySelector('[data-telegram-text]')?.addEventListener('change', syncDraftFromInputs);
        updateSendButtonState();

        sidePanel.querySelector('[data-telegram-clear]')?.addEventListener('click', async () => {
            clearTelegramDraft();
            await openTelegramPanel({ summary: 'Telegram cleared.' });
            if (transcriptText) transcriptText.innerText = 'Telegram cleared.';
        });

        sidePanel.querySelector('[data-telegram-send-test]')?.addEventListener('click', async () => {
            try {
                await sendTelegramTest();
                state.lastTelegramSendResult = { ok: true, kind: 'text' };
                await openTelegramPanel({ summary: 'Telegram test sent.' });
                if (transcriptText) transcriptText.innerText = 'Telegram test sent.';
            } catch (error) {
                console.warn('Telegram test failed:', error?.message || error);
                if (transcriptText) transcriptText.innerText = error?.message || 'Could not send Telegram test.';
            }
        });

        sidePanel.querySelector('[data-telegram-send-text]')?.addEventListener('click', async () => {
            syncDraftFromInputs();
            try {
                const result = await sendCurrentTelegramText();
                if (transcriptText) transcriptText.innerText = result.text;
            } catch (error) {
                console.warn('Telegram send message failed:', error?.message || error);
                state.lastTelegramSendResult = { ok: false, kind: 'text', message: error?.message || 'Could not send Telegram message.' };
                if (transcriptText) transcriptText.innerText = error?.message || 'Could not send Telegram message.';
            }
        });

        sidePanel.querySelector('[data-telegram-send-photo]')?.addEventListener('click', async () => {
            syncDraftFromInputs();
            try {
                const result = await sendLatestTelegramPhoto();
                if (transcriptText) transcriptText.innerText = result.text;
            } catch (error) {
                console.warn('Telegram send photo failed:', error?.message || error);
                state.lastTelegramSendResult = { ok: false, kind: 'photo', message: error?.message || 'Could not send Telegram photo.' };
                if (transcriptText) transcriptText.innerText = error?.message || 'Could not send Telegram photo.';
            }
        });
        sidePanel.querySelector('[data-telegram-send-video]')?.addEventListener('click', async () => {
            syncDraftFromInputs();
            try {
                const result = await sendLatestTelegramVideo();
                if (transcriptText) transcriptText.innerText = result.text;
            } catch (error) {
                console.warn('Telegram send video failed:', error?.message || error);
                state.lastTelegramSendResult = { ok: false, kind: 'video', message: error?.message || 'Could not send Telegram video.' };
                if (transcriptText) transcriptText.innerText = error?.message || 'Could not send Telegram video.';
            }
        });
    }

    function parseTelegramFollowUp(command = '') {
        const lower = String(command || '')
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!lower) return null;
        if (/^(?:yes|send|send it|send now|go ahead|okay send|ok send|please send)$/.test(lower)) {
            return { action: 'sendText' };
        }
        if (
            /^(?:send|share)\s+(?:(?:the|this|that|latest|last|current|open)\s+)?(?:photo|picture|image)(?:\s+now)?$/.test(lower)
            || /^(?:send|share)\s+latest\s+(?:photo|picture|image)(?:\s+now)?$/.test(lower)
        ) {
            return { action: 'sendPhoto' };
        }
        if (
            /^(?:send|share)\s+(?:(?:the|this|that|latest|last|current|open)\s+)?(?:video|clip|recording)(?:\s+now)?$/.test(lower)
            || /^(?:send|share)\s+latest\s+(?:video|clip|recording)(?:\s+now)?$/.test(lower)
        ) {
            return { action: 'sendVideo' };
        }
        if (/^(?:clear|reset|start over)$/.test(lower)) {
            return { action: 'clear' };
        }
        return { action: 'updateText', text: String(command || '').trim() };
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
            const result = await sendLatestTelegramPhoto();
            await quickReply(result.text, 'happy');
            return true;
        }
        if (followUp.action === 'sendVideo') {
            const result = await sendLatestTelegramVideo();
            await quickReply(result.text, 'happy');
            return true;
        }

        if (followUp.action === 'clear') {
            clearTelegramDraft();
            await openTelegramPanel({ summary: 'Telegram cleared.' });
            await quickReply('Telegram cleared.', 'happy');
            return true;
        }

        resetTelegramDraft({ text: followUp.text || '' });
        await openTelegramPanel({ summary: 'Telegram draft ready.' });
        await quickReply('Telegram open. Review the message and say send when you want it to go.', 'happy');
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
                const result = await sendLatestTelegramPhoto({ silent: true });
                await quickReply(result.text, result.ok ? 'happy' : 'sad');
                return;
            }

            await openTelegramPanel({ summary: 'Telegram photo ready.' });
            state.pendingTelegramReview = true;
            await quickReply('Telegram is open. Add an optional caption, then say send photo or press Send Latest Photo.', 'happy');
            return;
        }
        if (telegramCmd.action === 'shareVideo') {
            resetTelegramDraft(telegramCmd.draft || state.telegramDraft || {});
            if (telegramCmd.quickSend) {
                const result = await sendLatestTelegramVideo({ silent: true });
                await quickReply(result.text, result.ok ? 'happy' : 'sad');
                return;
            }
            await openTelegramPanel({ summary: 'Telegram video ready.' });
            state.pendingTelegramReview = true;
            await quickReply('Telegram is open. Add an optional caption, then say send video or press Send Latest Video.', 'happy');
            return;
        }

        if (telegramCmd.action === 'sendDirect') {
            const result = await sendTelegramDraftDirect(telegramCmd.draft || {});
            await quickReply(result.text, result.ok ? 'happy' : 'sad');
            return;
        }

        if (telegramCmd.action === 'compose' || telegramCmd.action === 'openPanel') {
            resetTelegramDraft(telegramCmd.draft || {});
            await openTelegramPanel({ summary: 'Telegram open.' });
            const hasText = !!String(state.telegramDraft?.text || '').trim();
            state.pendingTelegramReview = true;
            await quickReply(
                hasText
                    ? 'Telegram is open. Review the message and say send when you are ready.'
                    : 'Telegram is open. What should the message say?',
                'happy'
            );
        }

        if (telegramCmd.action === 'shareNote' || telegramCmd.action === 'shareLink' || telegramCmd.action === 'shareCurrent') {
            const shareTypeMap = {
                shareNote: 'note',
                shareLink: 'link',
                shareCurrent: telegramCmd.shareType || 'auto'
            };
            const shareType = String(shareTypeMap[telegramCmd.action] || 'auto').trim().toLowerCase();
            const payload = typeof buildContextSharePayload === 'function'
                ? await buildContextSharePayload({
                    shareType,
                    subject: telegramCmd.subject || ''
                }).catch(() => null)
                : null;

            if (!payload) {
                const missingLabel = shareType === 'note'
                    ? 'note'
                    : (shareType === 'calendar' || shareType === 'date' || shareType === 'event')
                        ? 'calendar item'
                        : 'shareable item';
                await quickReply(`I couldn't find a ${missingLabel} to share right now.`, 'sad');
                return;
            }

            const draft = {
                ...telegramCmd.draft,
                text: String(payload.text || '').trim()
            };

            // Notes should stay text-first. Do not auto-send carried media context
            // unless the user explicitly asked for a photo/video share command.
            const allowAttachmentForShareType = shareType !== 'note';
            const attachmentList = Array.isArray(payload.attachments) && allowAttachmentForShareType
                ? payload.attachments
                : [];

            if (attachmentList.length > 0) {
                resetTelegramDraft(draft);
                if (telegramCmd.quickSend) {
                    const result = await sendTelegramAttachmentPayload({ ...payload, attachments: attachmentList }, draft, { silent: true });
                    await quickReply(result.text, result.ok ? 'happy' : 'sad');
                    return;
                }

                await openTelegramPanel({ summary: 'Telegram ready to share.' });
                state.pendingTelegramReview = true;
                const attachment = attachmentList[0] || {};
                const mimeType = String(attachment.mimeType || '').toLowerCase();
                const mediaLabel = mimeType.startsWith('image/') ? 'photo' : 'video';
                await quickReply(`Telegram is open. Review the caption, then say send ${mediaLabel} when ready.`, 'happy');
                return;
            }

            if (!draft.text) {
                await quickReply('I found the share target, but there was no message text to send.', 'sad');
                return;
            }

            if (telegramCmd.quickSend) {
                const result = await sendTelegramDraftDirect(draft);
                await quickReply(result.text, result.ok ? 'happy' : 'sad');
            } else {
                resetTelegramDraft(draft);
                await openTelegramPanel({ summary: 'Telegram ready to share.' });
                await quickReply('Telegram is open with your content. Say send when ready.', 'happy');
            }
            return;
        }
    }

    function bindSettingsControls() {
        const copyText = async (value = '') => {
            const text = String(value || '');
            if (!text.trim()) throw new Error('Nothing to copy.');
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return;
            }
            const fallback = document.createElement('textarea');
            fallback.value = text;
            fallback.setAttribute('readonly', 'true');
            fallback.style.position = 'fixed';
            fallback.style.opacity = '0';
            fallback.style.left = '-9999px';
            document.body.appendChild(fallback);
            fallback.select();
            const ok = document.execCommand('copy');
            fallback.remove();
            if (!ok) throw new Error('Clipboard copy failed.');
        };

        const syncTelegramSettingsUi = () => {
            if (typeof getTelegramBackendConfig !== 'function') return;
            const config = getTelegramBackendConfig();
            if (telegramBotTokenInput) telegramBotTokenInput.value = String(config.botToken || '');
            if (telegramChatIdInput) telegramChatIdInput.value = String(config.chatId || '');
            if (telegramChatAliasesInput) telegramChatAliasesInput.value = String(config.chatAliases || '');
            if (telegramBackendPortInput) telegramBackendPortInput.value = String(config.backendPort || '8789');
        };

        syncTelegramSettingsUi();

        if (applyTelegramSettingsBtn) {
            applyTelegramSettingsBtn.onclick = async () => {
                if (typeof saveTelegramBackendConfig !== 'function') return;
                try {
                    const result = await saveTelegramBackendConfig({
                        botToken: telegramBotTokenInput?.value || '',
                        chatId: telegramChatIdInput?.value || '',
                        chatAliases: telegramChatAliasesInput?.value || '',
                        backendPort: telegramBackendPortInput?.value || '8789'
                    });
                    const ready = Boolean(result?.authState?.backendConfigured);
                    const viaBackend = Boolean(result?.configuredViaBackend);
                    syncTelegramSettingsUi();
                    updateTelegramAuthUi(result?.authState || getTelegramAuthState());
                    if (transcriptText) {
                        transcriptText.innerText = ready
                            ? (viaBackend
                                ? 'Telegram settings applied and backend is ready.'
                                : 'Telegram settings saved. Backend was not reachable for live apply, but target URL was updated.')
                            : 'Telegram settings saved, but backend is still not configured.';
                    }
                } catch (error) {
                    console.warn('Apply Telegram settings failed:', error?.message || error);
                    if (transcriptText) transcriptText.innerText = error?.message || 'Could not apply Telegram settings.';
                }
            };
        }

        if (copyTelegramEnvBtn) {
            copyTelegramEnvBtn.onclick = async () => {
                try {
                    const botToken = String(telegramBotTokenInput?.value || '').trim();
                    const chatId = String(telegramChatIdInput?.value || '').trim();
                    const chatAliases = String(telegramChatAliasesInput?.value || '').trim();
                    const backendPort = String(telegramBackendPortInput?.value || '8789').trim();
                    const envBlock = [
                        '# Telegram backend',
                        `TELEGRAM_BOT_TOKEN=${botToken}`,
                        `TELEGRAM_CHAT_ID=${chatId}`,
                        `TELEGRAM_CHAT_ALIASES=${chatAliases}`,
                        `TELEGRAM_BACKEND_PORT=${backendPort || '8789'}`
                    ].join('\n');
                    await copyText(envBlock);
                    if (transcriptText) transcriptText.innerText = 'Telegram .env.local block copied.';
                } catch (error) {
                    console.warn('Copy Telegram env block failed:', error?.message || error);
                    if (transcriptText) transcriptText.innerText = error?.message || 'Could not copy Telegram env block.';
                }
            };
        }

        if (openTelegramBtn) {
            openTelegramBtn.onclick = async () => {
                try {
                    await openTelegramPanel({ summary: 'Telegram open.' });
                    if (transcriptText) transcriptText.innerText = 'Telegram open.';
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
        sendLatestVideo: sendLatestTelegramVideo,
        resetDraft: resetTelegramDraft,
    };
}
