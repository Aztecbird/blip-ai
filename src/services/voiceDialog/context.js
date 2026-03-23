/**
 * Read-only snapshot of UI / flow state for intent routing (expand for timers, notes, media).
 */
export function getVoiceRoutingContext(state = {}) {
    return {
        activePanel: state.currentSidePanelAction || '',
        gmailFlow: Boolean(state.pendingEmailReview) || state.currentSidePanelAction === 'gmail',
        telegramFlow: Boolean(state.pendingTelegramReview) || state.currentSidePanelAction === 'telegram',
        youtubeActive: Boolean(state.lastContext?.lastYoutubeUrl)
    };
}
