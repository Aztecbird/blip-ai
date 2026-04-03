export function createTelegramParser() {
  function parse({ utterance = '', entities = {}, frame = 'direct_command' }) {
    const lower = String(utterance || '').toLowerCase();
    if (!/\btelegram\b/.test(lower) && entities.channel_switch !== 'telegram' && !/\bmessage\b/.test(lower)) return null;

    const action = /\bsend\b/.test(lower) ? 'send' : /\bopen\b/.test(lower) ? 'open' : 'draft';
    const wantsDefaultTelegram = /\b(?:my|on|to)\s+telegram\b/.test(lower) || /\btelegram\b/.test(lower);
    const recipient = entities.recipient || null;
    const message = entities.message || entities.body || entities.reference_item || '';
    const missing = [];

    if (action !== 'open' && !recipient && !wantsDefaultTelegram) missing.push('recipient');
    if (action !== 'open' && !message && action !== 'send') missing.push('message');

    return {
      tool: 'telegram',
      intent_type: `telegram.${action}`,
      conversation_frame: frame,
      confidence: missing.length ? 0.67 : 0.9,
      extracted_entities: { recipient, message, use_default_telegram_recipient: wantsDefaultTelegram },
      shared_objects_out: message ? [{ id: 'telegram-message', type: 'message_text', label: 'Telegram message', value: message }] : [],
      repairable_fields: ['recipient', 'message', 'attachment'],
      follow_up_needed: missing.length > 0,
      clarification_question: missing.includes('recipient')
        ? 'Who should I send it to on Telegram?'
        : missing.includes('message')
          ? 'What should the message say?'
          : null,
      action,
    };
  }

  return { parse };
}
