function normalizeTelegramVoiceText(value = '') {
    return String(value || '')
        .toLowerCase()
        .replace(/[^\w\s@.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function getTelegramVoiceCommand(command = '') {
    const lower = normalizeTelegramVoiceText(command);
    if (!lower) return null;
    if (/\b(?:email|gmail|mail)\b/.test(lower) && !/\btelegram\b/.test(lower)) return null;

    const politePrefix = '(?:(?:i\\s+want\\s+(?:you\\s+)?to|can\\s+you|could\\s+you|will\\s+you|please)\\s+)?';
    const sendOrDraftAction = (verb = 'send', draft = {}) => ({
        action: verb === 'send' ? 'sendDirect' : 'compose',
        draft
    });

    // Do not treat bare "send it to …" as Telegram: that phrase is used for Gmail drafts.
    // Photo shares must name the media, or say telegram (e.g. "send it to joy on telegram").
    const naturalPhotoTargetMatch = lower.match(
        new RegExp(`^${politePrefix}(?:send|share)\\s+(?:this|the|current|open)?\\s*(?:photo|picture|image|snapshot|shot)\\s+(?:to|for)\\s+(.+)$`)
    );
    if (naturalPhotoTargetMatch?.[1]) {
        return {
            action: 'sharePhoto',
            quickSend: lower.includes('send ') || lower.startsWith('send'),
            draft: { chatId: String(naturalPhotoTargetMatch[1] || '').trim() }
        };
    }

    const sendItToTelegramPhotoMatch = lower.match(
        new RegExp(`^${politePrefix}(?:send|share)\\s+it\\s+(?:to|for)\\s+(.+?)\\s+(?:on|in)\\s+telegram$`)
    );
    if (sendItToTelegramPhotoMatch?.[1]) {
        return {
            action: 'sharePhoto',
            quickSend: lower.includes('send ') || lower.startsWith('send'),
            draft: { chatId: String(sendItToTelegramPhotoMatch[1] || '').trim() }
        };
    }

    if (
        new RegExp(`^${politePrefix}(?:send|share)\\s+(?:(?:this|the|latest|last|current|open)\\s+)?(?:photo|picture|image|snapshot|shot)(?:\\s+on|\\s+in|\\s+via|\\s+with)?\\s+telegram$`).test(lower)
        || /^(?:telegram)\s+(?:latest|last|current|this|the)\s+(?:photo|picture|image|snapshot|shot)$/.test(lower)
    ) {
        return {
            action: 'sharePhoto',
            quickSend: lower.includes('send ') || lower.startsWith('send'),
            draft: { chatId: '' }
        };
    }

    const explicitTelegramPhotoTargetMatch = lower.match(
        new RegExp(`^${politePrefix}(?:send|share)\\s+(?:this|the|latest|last|current|open)?\\s*(?:photo|picture|image|snapshot|shot|it)\\s+(?:on|in|via|with)\\s+telegram\\s+(?:to|for)\\s+(.+)$`)
    );
    if (explicitTelegramPhotoTargetMatch?.[1]) {
        return {
            action: 'sharePhoto',
            quickSend: lower.includes('send ') || lower.startsWith('send'),
            draft: { chatId: String(explicitTelegramPhotoTargetMatch[1] || '').trim() }
        };
    }

    const conversationalTelegramPhotoTargetMatch = lower.match(
        /(?:^|.*\b)(?:send|share)\s+(?:this|the|latest|last|current|open)?\s*(?:photo|picture|image|snapshot|shot|it)\s+(?:on|in|via|with)\s+telegram\s+(?:to|for)\s+(.+)$/
    );
    if (conversationalTelegramPhotoTargetMatch?.[1]) {
        return {
            action: 'sharePhoto',
            quickSend: lower.includes('send ') || lower.startsWith('send'),
            draft: { chatId: String(conversationalTelegramPhotoTargetMatch[1] || '').trim() }
        };
    }

    if (/^(?:open|show|check|view)\s+(?:telegram|telegram messages|my telegram)$/.test(lower)) {
        return { action: 'openPanel' };
    }

    if (/^(?:close|hide|dismiss|exit)\s+telegram$/.test(lower)) {
        return { action: 'close' };
    }

    if (/^(?:send|run)\s+(?:a\s+)?telegram\s+test$/.test(lower)) {
        return { action: 'sendTest' };
    }

    if (
        /^(?:send|share)\s+(?:this|the|a)?\s*(?:photo|picture|image)(?:\s+(?:on|to|via|with))?\s+telegram(?:\s+(?:to|for)\s+.+)?$/.test(lower)
        || /^(?:telegram)\s+(?:this|the)\s+(?:photo|picture|image)(?:\s+(?:to|for)\s+.+)?$/.test(lower)
    ) {
        const targetMatch = lower.match(/(?:\s+(?:to|for)\s+)(.+)$/);
        return {
            action: 'sharePhoto',
            quickSend: lower.includes('send ') || lower.startsWith('send'),
            draft: { chatId: String(targetMatch?.[1] || '').trim() }
        };
    }

    const targetedMatch = lower.match(
        new RegExp(`^${politePrefix}(send|write|compose)(?:\\s+(?:a|the))?\\s+telegram(?:\\s+message)?\\s+(?:to|for)\\s+(.+?)(?:\\s+(?:saying|that\\s+says|message|with)\\s+(.+))?$`)
    );
    if (targetedMatch?.[1]) {
        return sendOrDraftAction(String(targetedMatch[1] || '').trim(), {
            chatId: String(targetedMatch[2] || '').trim(),
            text: String(targetedMatch[3] || '').trim()
        });
    }

    const reversedTargetedMatch = lower.match(
        new RegExp(`^${politePrefix}(send|write|compose)(?:\\s+(?:a|the))?\\s+(?:message\\s+)?(?:to|for)\\s+(.+?)\\s+(?:in|on|via|with)\\s+telegram(?:\\s+(?:a|the)\\s+message?)?(?:\\s+(?:saying|that\\s+says|message|with)\\s+(.+))?$`)
    );
    if (reversedTargetedMatch?.[1]) {
        return sendOrDraftAction(String(reversedTargetedMatch[1] || '').trim(), {
            chatId: String(reversedTargetedMatch[2] || '').trim(),
            text: String(reversedTargetedMatch[3] || '').trim()
        });
    }

    const conversationalTargetOnlyMatch = lower.match(
        /(?:^|.*\b)(?:send|write|compose)\b.*\btelegram\b.*\b(?:to|for)\s+(.+)$/
    );
    if (conversationalTargetOnlyMatch?.[1]) {
        return {
            action: 'compose',
            draft: {
                chatId: String(conversationalTargetOnlyMatch[1] || '').trim(),
                text: ''
            }
        };
    }

    const directMatch = lower.match(
        new RegExp(`^${politePrefix}(send|write|compose)(?:\\s+(?:a|the))?\\s+telegram(?:\\s+message)?(?:\\s+(?:saying|that\\s+says|message|with))?\\s+(.+)$`)
    ) || lower.match(/^(?:telegram\s+message)\s+(.+)$/);
    if (directMatch?.[1]) {
        const verb = directMatch.length > 2 ? String(directMatch[1] || '').trim() : 'send';
        const text = directMatch.length > 2 ? String(directMatch[2] || '').trim() : String(directMatch[1] || '').trim();
        return sendOrDraftAction(verb, { text });
    }

    if (
        new RegExp(`^${politePrefix}(?:send|write|compose)(?:\\s+(?:a|the))?\\s+telegram(?:\\s+message)?$`).test(lower)
        || /^(?:i\s+need\s+to|help\s+me)\s+(?:send|write|compose)(?:\s+(?:a|the))?\s+telegram(?:\s+message)?$/.test(lower)
    ) {
        return { action: 'compose', draft: { chatId: '', text: '' } };
    }

    return null;
}
