export function createGmailParser() {
  function parse({ utterance = '', entities = {}, frame = 'direct_command' }) {
    const lower = String(utterance || '').toLowerCase();
    if (!/\b(gmail|email|mail)\b/.test(lower) && entities.channel_switch !== 'gmail') return null;

    const action = /\bsend\b/.test(lower) ? 'send' : /\bopen\b/.test(lower) ? 'open' : 'draft';
    const recipient = entities.recipient || null;
    const subject = entities.subject || '';
    const body = entities.body || entities.message || entities.reference_item || '';
    const missing = [];

    if (action !== 'open' && !recipient) missing.push('recipient');
    if (action !== 'open' && !body && action !== 'send') missing.push('body');

    return {
      tool: 'gmail',
      intent_type: `gmail.${action}`,
      conversation_frame: frame,
      confidence: missing.length ? 0.66 : 0.91,
      extracted_entities: { recipient, subject, body },
      shared_objects_out: body ? [{ id: 'gmail-body', type: 'body_text', label: 'Email body', value: body }] : [],
      repairable_fields: ['recipient', 'subject', 'body'],
      follow_up_needed: missing.length > 0,
      clarification_question: missing.includes('recipient')
        ? 'Who should I send it to?'
        : missing.includes('body')
          ? 'What should the email say?'
          : null,
      action,
    };
  }

  return { parse };
}
