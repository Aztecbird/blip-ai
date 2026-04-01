/**
 * Connector Service
 * Bridges different features (Email, Telegram, Hub, YouTube) by converting data
 * between their respective formats.
 */

export const Connector = {
    /**
     * Converts a Note from the Hub into an Email payload.
     */
    noteToEmail(note) {
        if (!note) return null;
        return {
            subject: note.data?.title || 'Shared Note',
            text: note.content,
            source: 'note-connector'
        };
    },

    /**
     * Converts a YouTube link/context into an Email payload.
     */
    youtubeToEmail(youtubeContext) {
        if (!youtubeContext?.url) return null;
        return {
            subject: youtubeContext.title || 'YouTube Link',
            text: `${youtubeContext.title || 'Check out this video'}\n\n${youtubeContext.url}`,
            source: 'youtube-connector'
        };
    },

    /**
     * Converts an Email message into a Note for the Hub.
     */
    emailToNote(emailMessage) {
        if (!emailMessage) return null;
        return {
            content: emailMessage.bodyText || emailMessage.snippet || '',
            data: {
                title: emailMessage.subject || 'Email Note',
                source: 'email-connector',
                originalId: emailMessage.id
            }
        };
    },

    /**
     * Converts a Note into a Telegram message.
     */
    noteToTelegram(note) {
        if (!note) return '';
        return `${note.data?.title || 'Note'}:\n${note.content}`;
    },

    /**
     * Converts a YouTube link into a Telegram message.
     */
    youtubeToTelegram(youtubeContext) {
        if (!youtubeContext?.url) return '';
        return `${youtubeContext.title || 'Video'}\n${youtubeContext.url}`;
    }
};
