function normalizeTelegramVoiceText(value = '') {
    return String(value || '')
        .toLowerCase()
        .replace(/[^\w\s@.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function getTelegramVoiceCommand(command = '') {
    let lower = normalizeTelegramVoiceText(command);
    if (!lower) return null;

    // "… on/to telegram or should I …" — keep the first clause for parsing (avoid `to`+recipient eating `telegram or…`).
    if (/\b(?:on|to|via|with)\s+telegram\s+or\b/.test(lower)) {
        lower = lower.replace(/\s+or\b[\s\S]*$/i, '').replace(/\s+/g, ' ').trim();
    }

    const politePrefix = '(?:(?:i\\s+want\\s+(?:you\\s+)?to|can\\s+you|could\\s+you|will\\s+you|please)\\s+)?';

    // "send me link of video to telegram" — "me" breaks the generic share matcher; handle link-sharing explicitly.
    if (
        /\b(?:send|share)\s+(?:me\s+)?(?:a\s+)?(?:the\s+)?link\b/.test(lower)
        && /\btelegram\b/.test(lower)
    ) {
        const toTail = lower.match(/\btelegram\s+(?:to|for)\s+(.+)$/) || lower.match(/\s+(?:to|for)\s+([^.\s]+(?:\s+[^.\s]+)?)\s+on\s+telegram\b$/);
        return {
            action: 'shareLink',
            quickSend: /\bsend\b/.test(lower) || lower.startsWith('send'),
            draft: { chatId: String(toTail?.[1] || '').replace(/\s+on\s+telegram\s*$/i, '').trim() }
        };
    }

    // Explicit "message in/on telegram" phrasing should stay text-first.
    const explicitMessageInTelegram = lower.match(
        new RegExp(`^${politePrefix}(?:send|write|compose)(?:\\s+(?:a|the))?\\s+(?:message|text)(?:\\s+(?:in|on|via|with))\\s+telegram(?:\\s+(?:to|for)\\s+(.+))?$`)
    );
    if (explicitMessageInTelegram) {
        return { action: 'compose', draft: { chatId: String(explicitMessageInTelegram[1] || '').trim(), text: '' } };
    }

    const sendOrDraftAction = (verb = 'send', draft = {}) => ({
        action: verb === 'send' ? 'sendDirect' : 'compose',
        draft
    });

    const naturalPhotoTargetMatch =
        lower.match(
            new RegExp(`^${politePrefix}(?:send|share)\\s+(?:me\\s+)?(?:this|the|current|open)?\\s*(?:photo|picture|image|snapshot|shot)\\s+(?:to|for)\\s+(.+)$`)
        )
        || lower.match(
            new RegExp(`^${politePrefix}(?:send|share)\\s+(?:me\\s+)?it\\s+(?:to|for)\\s+(.+?)\\s+on\\s+telegram$`)
        );
    if (naturalPhotoTargetMatch?.[1]) {
        return {
            action: 'sharePhoto',
            quickSend: lower.includes('send ') || lower.startsWith('send'),
            draft: { chatId: String(naturalPhotoTargetMatch[1] || '').trim() }
        };
    }

    // Conversational variants:
    // - "can you send a pic my latest picture in telegram"
    // - "send to my telegram the latest picture you took"
    if (
        /(?:send|share)\s+(?:a\s+)?(?:pic|photo|picture|image|snapshot|shot)\b.*\b(?:latest|last|current)\s+(?:pic|photo|picture|image|snapshot|shot)\b.*\b(?:in|on|to|via|with)\s+(?:my\s+)?telegram\b/.test(lower)
        || /^(?:can\s+you\s+)?(?:please\s+)?(?:send|share)\s+(?:a\s+)?(?:pic|photo|picture|image|snapshot|shot)\b.*\b(?:in|on|to|via|with)\s+(?:my\s+)?telegram\b/.test(lower)
        || /^(?:can\s+you\s+)?(?:please\s+)?(?:send|share)\s+(?:to|in|on|via|with)\s+(?:my\s+)?telegram\b.*\b(?:latest|last|current)\s+(?:pic|photo|picture|image|snapshot|shot)\b/.test(lower)
    ) {
        return {
            action: 'sharePhoto',
            quickSend: true,
            draft: { chatId: '' }
        };
    }

    const telegramLatestPhotoShorthand =
        /^(?:telegram)\s+(?:latest|last|current|this|the)\s+(?:photo|picture|image|snapshot|shot)$/.test(lower);
    const photoTelegramMatch = lower.match(
        new RegExp(
            `^${politePrefix}(?:send|share)\\s+(?:me\\s+)?(?:(?:this|that|the|a|my|latest|last|current|open)\\s+)*(?:photo|picture|image|snapshot|shot)(?:\\s+on|\\s+in|\\s+via|\\s+with|\\s+to)(?:\\s+my)?\\s+telegram(?:\\s+(?:to|for)\\s+(.+))?$`
        )
    );
    if (photoTelegramMatch || telegramLatestPhotoShorthand) {
        return {
            action: 'sharePhoto',
            quickSend: lower.includes('send ') || lower.startsWith('send'),
            draft: { chatId: String(photoTelegramMatch?.[1] || '').trim() }
        };
    }

    const videoTelegramMatch = lower.match(
        new RegExp(
            `^${politePrefix}(?:send|share)\\s+(?:me\\s+)?(?:(?:this|that|the|a|my|latest|last|current|open)\\s+)*(?:video|clip|recording)(?:\\s+on|\\s+in|\\s+via|\\s+with|\\s+to)(?:\\s+my)?\\s+telegram(?:\\s+(?:to|for)\\s+(.+))?$`
        )
    );
    if (videoTelegramMatch) {
        return {
            action: 'shareVideo',
            quickSend: lower.includes('send ') || lower.startsWith('send'),
            draft: { chatId: String(videoTelegramMatch?.[1] || '').trim() }
        };
    }

    const naturalVideoTargetMatch = lower.match(
        new RegExp(`^${politePrefix}(?:send|share)\\s+(?:this|the|current|open|latest|last)?\\s*(?:video|clip|recording)(?:\\s+on|\\s+in|\\s+via|\\s+with|\\s+to)?\\s+telegram\\s+(?:to|for)\\s+(.+)$`)
    );
    if (naturalVideoTargetMatch?.[1]) {
        return {
            action: 'shareVideo',
            quickSend: lower.includes('send ') || lower.startsWith('send'),
            draft: { chatId: String(naturalVideoTargetMatch[1] || '').trim() }
        };
    }

    if (
        new RegExp(`^${politePrefix}(?:send|share)\\s+(?:(?:this|the|latest|last|current|open)\\s+)?(?:video|clip|recording)(?:\\s+on|\\s+in|\\s+via|\\s+with|\\s+to)(?:\\s+my)?\\s+telegram$`).test(lower)
        || /^(?:telegram)\s+(?:latest|last|current|this|the)\s+(?:video|clip|recording)$/.test(lower)
    ) {
        return {
            action: 'shareVideo',
            quickSend: lower.includes('send ') || lower.startsWith('send'),
            draft: { chatId: '' }
        };
    }

    const explicitTelegramPhotoTargetMatch = lower.match(
        new RegExp(`^${politePrefix}(?:send|share)\\s+(?:me\\s+)?(?:this|the|latest|last|current|open)?\\s*(?:photo|picture|image|snapshot|shot|it)\\s+(?:on|in|via|with)\\s+(?:my\\s+)?telegram\\s+(?:to|for)\\s+(.+)$`)
    );
    if (explicitTelegramPhotoTargetMatch?.[1]) {
        return {
            action: 'sharePhoto',
            quickSend: lower.includes('send ') || lower.startsWith('send'),
            draft: { chatId: String(explicitTelegramPhotoTargetMatch[1] || '').trim() }
        };
    }

    const conversationalTelegramPhotoTargetMatch = lower.match(
        /(?:^|.*\b)(?:send|share)\s+(?:me\s+)?(?:this|the|latest|last|current|open)?\s*(?:photo|picture|image|snapshot|shot|it)\s+(?:on|in|via|with)\s+(?:my\s+)?telegram\s+(?:to|for)\s+(.+)$/
    );
    if (conversationalTelegramPhotoTargetMatch?.[1]) {
        return {
            action: 'sharePhoto',
            quickSend: lower.includes('send ') || lower.startsWith('send'),
            draft: { chatId: String(conversationalTelegramPhotoTargetMatch[1] || '').trim() }
        };
    }

    // Ambiguous pronoun-only command ("send it to telegram") should be safe:
    // open compose instead of auto-sending whatever context item is currently active.
    if (new RegExp(`^${politePrefix}(?:send|share)\\s+(?:this|it|that)\\s+(?:to|on|in)\\s+telegram$`).test(lower)) {
        return { action: 'compose', draft: { chatId: '', text: '' } };
    }

    const notesMessageShareMatch = lower.match(
        new RegExp(
            `^${politePrefix}(?:send|share)\\s+(?:the\\s+)?(?:following\\s+)?(?:message|text)\\s+(?:in|from)\\s+(?:the\\s+)?notes?\\s+(?:to|on|in|via|with)\\s+(?:my\\s+)?telegram(?:\\s+(?:to|for)\\s+(.+))?$`,
            'i'
        )
    );
    if (notesMessageShareMatch) {
        return {
            action: 'shareNote',
            shareType: 'note',
            quickSend: true,
            draft: { chatId: String(notesMessageShareMatch[1] || '').trim() }
        };
    }

    const shareGenericMatch = lower.match(
        new RegExp(
            `^${politePrefix}(?:send|share|put)\\s+(?:me\\s+)?(?:(?:this|the|that|my)\\s+|(?:a|an)\\s+)?(note|video|link|youtube(?:\\s+link)?|weather|forecast|date|calendar(?:\\s+event)?|event|it|that)\\b(?:\\s+(?:on|in|to|via|with)\\s+(?:my\\s+)?telegram)?(?:\\s+(?:to|for)\\s+(.+))?$`,
            'i'
        )
    );
    if (shareGenericMatch) {
        const type = String(shareGenericMatch[1] || '').trim().toLowerCase();
        const target = String(shareGenericMatch[2] || '').trim();
        if ((type === 'it' || type === 'that') && !/\btelegram\b/.test(lower)) {
            /* "Send it to …" without Telegram — leave for Gmail / router. */
        } else {
            let chatId = target;
            if ((type === 'it' || type === 'that') && /^telegram$/.test(chatId.toLowerCase())) {
                chatId = '';
            }
            const shareTypeMap = {
                note: 'note',
                video: 'video',
                youtube: 'youtube',
                'youtube link': 'youtube',
                link: 'link',
                weather: 'weather',
                forecast: 'weather',
                date: 'date',
                calendar: 'calendar',
                'calendar event': 'calendar',
                event: 'event',
                it: 'auto',
                that: 'auto'
            };
            const shareType = shareTypeMap[type] || 'auto';
            const payload = {
                action: shareType === 'note'
                    ? 'shareNote'
                    : (shareType === 'link' || shareType === 'youtube' ? 'shareLink' : 'shareCurrent'),
                shareType,
                draft: { chatId }
            };
            if (payload.action !== 'compose') {
                payload.quickSend = lower.includes('send ') || lower.startsWith('send');
            }
            return payload;
        }
    }

    if (/^(?:open|show|check|view)\s+(?:telegram|telegram messages|my telegram)$/.test(lower)) {
        return { action: 'openPanel' };
    }

    if (/^(?:close|hide|dismiss|exit)\s+(?:my\s+)?telegram(?:\s+panel)?$/.test(lower)) {
        return { action: 'close' };
    }

    if (
        /^(?:send|run)\s+(?:a\s+)?telegram\s+test$/.test(lower)
        || /^(?:test\s+send|send\s+test)\s+(?:in|on|for)\s+telegram$/.test(lower)
        || /^telegram\s+test\s+send$/.test(lower)
    ) {
        return { action: 'sendTest' };
    }

    if (
        /^(?:send|share)\s+(?:me\s+)?(?:this|the|a)?\s*(?:(?:latest|last|current|open)\s+)*(?:photo|picture|image)(?:\s+(?:on|to|via|with|in))(?:\s+my)?\s+telegram(?:\s+(?:to|for)\s+.+)?$/.test(lower)
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
        || /^telegram\s+(?:send|write|compose)(?:\s+(?:a|the))?\s+message$/.test(lower)
    ) {
        return { action: 'compose', draft: { chatId: '', text: '' } };
    }

    // Probabilistic fallback for noisy ASR:
    // If Telegram is explicitly present, pick the most likely share intent
    // instead of failing with "did not parse clearly".
    const mentionsTelegram = /\btelegram\b/.test(lower);
    const mentionsSendVerb = /\b(send|share|post|forward|put)\b/.test(lower);
    const mentionsPhoto = /\b(pic|photo|picture|image|snapshot|shot)\b/.test(lower);
    const mentionsVideo = /\b(video|clip|recording)\b/.test(lower);
    const mentionsLink = /\b(link|url|youtube)\b/.test(lower);
    const mentionsNote = /\bnotes?\b/.test(lower) || /\bmessage\b.*\bnotes?\b/.test(lower);
    const mentionsCalendar = /\b(calendar|event|date)\b/.test(lower);
    const explicitTarget = lower.match(/\b(?:to|for)\s+([a-z0-9@._-]+(?:\s+[a-z0-9@._-]+)?)$/i)?.[1] || '';

    if (mentionsTelegram && mentionsSendVerb) {
        if (mentionsPhoto) {
            return {
                action: 'sharePhoto',
                quickSend: true,
                draft: { chatId: String(explicitTarget || '').trim() }
            };
        }
        if (mentionsVideo) {
            return {
                action: 'shareVideo',
                quickSend: true,
                draft: { chatId: String(explicitTarget || '').trim() }
            };
        }
        if (mentionsLink) {
            return {
                action: 'shareLink',
                shareType: mentionsLink && /\byoutube\b/.test(lower) ? 'youtube' : 'link',
                quickSend: true,
                draft: { chatId: String(explicitTarget || '').trim() }
            };
        }
        if (mentionsNote) {
            return {
                action: 'shareNote',
                shareType: 'note',
                quickSend: true,
                draft: { chatId: String(explicitTarget || '').trim() }
            };
        }
        if (mentionsCalendar) {
            return {
                action: 'shareCurrent',
                shareType: 'calendar',
                quickSend: true,
                draft: { chatId: String(explicitTarget || '').trim() }
            };
        }
        return {
            action: 'shareCurrent',
            shareType: 'auto',
            quickSend: true,
            draft: { chatId: String(explicitTarget || '').trim() }
        };
    }

    return null;
}
