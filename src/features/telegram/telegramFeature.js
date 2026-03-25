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
    }

    function clearTelegramDraft(options = {}) {
        const keepChatId = Boolean(options?.keepChatId);
        state.telegramDraft = {
            chatId: keepChatId ? normalizeTelegramChatId(state.telegramDraft?.chatId) : '',
            text: ''
        };
        state.pendingTelegramReview = false;
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

        await sendTelegramMessage({ chatId, text });
        state.lastTelegramSendResult = { ok: true, kind: 'text', chatId };
        clearTelegramDraft({ keepChatId: true });
        await openTelegramPanel({ summary: 'Telegram message sent.' });
        return { ok: true, text: 'Telegram message sent.' };
    }

    async function sendTelegramDraftDirect(draft = {}) {
        const chatId = normalizeTelegramChatId(draft?.chatId);
        const text = String(draft?.text || '').trim();
        if (!text) {
            return { ok: false, text: 'Need a message before I can send Telegram.' };
        }

        await sendTelegramMessage({ chatId, text });
        state.lastTelegramSendResult = { ok: true, kind: 'text', chatId };
        resetTelegramDraft({ chatId, text: '' });
        state.pendingTelegramReview = false;
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
        clearTelegramDraft({ keepChatId: true });
        if (!options.silent) {
            await openTelegramPanel({ summary: 'Telegram photo sent.' });
        }
        return { ok: true, text: 'Telegram photo sent.' };
    }

    function bindTelegramPanelControls(sidePanel) {
>>>>>>> ui-update-final
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

    function parseTelegramFollowUp(command = '') {
        const lower = String(command || '')
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!lower) return null;
        if (/\b(?:email|gmail|mail)\b/.test(lower) && !/\btelegram\b/.test(lower)) return null;
        if (
            /^(?:yes|send|send it|send now|go ahead|go on|okay send|ok send|please send)$/.test(lower)
            || /^(?:ok|okay|alright)[,\s]+(?:(?:you|ya)\s+)?can\s+send(?:\s+it)?$/.test(lower)
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
<<<<<<< HEAD
            await quickReply('Telegram is open. Add an optional caption, then say send photo or press Send Latest Photo.', 'happy');
=======
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
    }

    function bindSettingsControls() {
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
        resetDraft: resetTelegramDraft,
    };
}
