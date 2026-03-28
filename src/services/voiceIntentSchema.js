import { buildGeminiUrl, DEFAULT_GEMINI_MODEL, extractCandidateParts, postGeminiJson } from './geminiCore.js';
import { normalizeCommandText } from './textParsing.js';

export const VOICE_INTENT_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        family: {
            type: 'string',
            enum: ['gmail', 'telegram', 'carecam', 'message', 'general', 'none']
        },
        action: {
            type: 'string',
            enum: [
                'none',
                'clarify',
                'compose',
                'sendDirect',
                'openPanel',
                'close',
                'sharePhoto',
                'sendPhoto',
                'sendText',
                'review',
                'improveDraft',
                'start_carecam',
                'stop_carecam',
                'request_help',
                'start_and_send_help',
                'urgent_help',
                'clear_help'
            ]
        },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        needsClarification: { type: 'boolean' },
        clarificationPrompt: { type: 'string' },
        draft: {
            type: 'object',
            additionalProperties: false,
            properties: {
                to: { type: 'string' },
                recipientQuery: { type: 'string' },
                subject: { type: 'string' },
                text: { type: 'string' },
                chatId: { type: 'string' }
            },
            required: ['to', 'recipientQuery', 'subject', 'text', 'chatId']
        }
    },
    required: ['family', 'action', 'confidence', 'needsClarification', 'clarificationPrompt', 'draft']
};

const ALLOWED_FAMILIES = new Set(['gmail', 'telegram', 'carecam', 'message', 'general', 'none']);
const ALLOWED_ACTIONS = new Set([
    'none',
    'clarify',
    'compose',
    'sendDirect',
    'openPanel',
    'close',
    'sharePhoto',
    'sendPhoto',
    'sendText',
    'review',
    'improveDraft',
    'start_carecam',
    'stop_carecam',
    'request_help',
    'start_and_send_help',
    'urgent_help',
    'clear_help'
]);

function clampConfidence(value = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    if (numeric < 0) return 0;
    if (numeric > 1) return 1;
    return numeric;
}

function cleanText(value = '') {
    return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeDraft(draft = {}) {
    return {
        to: cleanText(draft.to || ''),
        recipientQuery: cleanText(draft.recipientQuery || ''),
        subject: cleanText(draft.subject || ''),
        text: cleanText(draft.text || ''),
        chatId: cleanText(draft.chatId || '')
    };
}

export function normalizeStructuredVoiceIntent(intent = {}) {
    const family = ALLOWED_FAMILIES.has(intent.family) ? intent.family : 'none';
    const action = ALLOWED_ACTIONS.has(intent.action) ? intent.action : 'none';
    const clarificationPrompt = cleanText(intent.clarificationPrompt || '');
    return {
        family,
        action,
        confidence: clampConfidence(intent.confidence),
        needsClarification: Boolean(intent.needsClarification),
        clarificationPrompt,
        draft: normalizeDraft(intent.draft),
    };
}

export function buildVoiceIntentPrompt(command = '', context = {}) {
    return [
        'Classify the user utterance into a single structured voice intent.',
        'Prefer the user\'s current panel context when the utterance is ambiguous.',
        'If you cannot confidently choose a family/action, set needsClarification=true and write a short clarificationPrompt.',
        'Only output JSON that matches the schema.',
        '',
        `utterance: ${JSON.stringify(String(command || ''))}`,
        `context: ${JSON.stringify({
            activePanel: String(context.activePanel || ''),
            gmailFlow: Boolean(context.gmailFlow),
            telegramFlow: Boolean(context.telegramFlow),
            pendingEmailReview: Boolean(context.pendingEmailReview),
            pendingTelegramReview: Boolean(context.pendingTelegramReview),
            careCamActive: Boolean(context.careCamActive),
            lastMessagingFocus: String(context.lastMessagingFocus || ''),
            hasGmailDraft: Boolean(context.hasGmailDraft),
            hasTelegramDraft: Boolean(context.hasTelegramDraft),
            gmailHasBody: Boolean(context.gmailHasBody),
            telegramHasBody: Boolean(context.telegramHasBody),
        })}`,
    ].join('\n');
}

function parseStructuredVoiceIntentResponse(data = {}) {
    const rawText = extractCandidateParts(data)?.[0]?.text ?? '';
    if (!rawText) return null;
    const trimmed = String(rawText).trim();
    const jsonText = trimmed.startsWith('```')
        ? trimmed.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
        : trimmed;
    const parsed = JSON.parse(jsonText);
    return normalizeStructuredVoiceIntent(parsed);
}

export async function resolveStructuredVoiceIntent(command = '', context = {}, options = {}) {
    const apiKey = String(options.apiKey || '').trim();
    const model = options.model || DEFAULT_GEMINI_MODEL;
    const url = buildGeminiUrl(model, apiKey);
    const body = {
        system_instruction: {
            parts: [{
                text: [
                    'You are a voice intent parser for Blip.',
                    'Return one JSON object matching the provided schema.',
                    'Do not add markdown or explanation.',
                    'Keep clarification prompts short and spoken-friendly.',
                    'If the utterance is a clear command, set needsClarification=false.',
                    'When lastMessagingFocus is gmail or telegram and the user is vague about sending or composing (no explicit channel name), prefer that family unless the words clearly mean the other channel.',
                    'When hasGmailDraft and hasTelegramDraft are both true and the user asks to send without naming Gmail or Telegram, set family message, action clarify, needsClarification true, and ask which draft to send in one short question.',
                ].join(' ')
            }]
        },
        contents: [{
            role: 'user',
            parts: [{ text: buildVoiceIntentPrompt(command, context) }]
        }],
        generationConfig: {
            temperature: 0,
            max_output_tokens: 256,
            responseMimeType: 'application/json',
            responseSchema: VOICE_INTENT_SCHEMA,
        }
    };

    const data = await postGeminiJson(url, body, 12000);
    return parseStructuredVoiceIntentResponse(data);
}
