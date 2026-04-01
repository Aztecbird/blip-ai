const defaultRules = [
  {
    id: 'low-confidence-confirmation',
    when: ({ interpretedIntent }) => Number(interpretedIntent.confidence || 0) < 0.6,
    apply: (ctx) => ({
      ...ctx,
      confirmationNeeded: true,
      styleHint: 'gentle_confirm',
      signatureLine: 'Quick check before I do that.',
    }),
  },
  {
    id: 'message-summary-before-send',
    when: ({ interpretedIntent }) => interpretedIntent.intent === 'message_send',
    apply: (ctx) => ({
      ...ctx,
      confirmationNeeded: true,
      summaryBeforeAction: true,
    }),
  },
  {
    id: 'emotional-softening',
    when: ({ interpretedIntent }) => interpretedIntent.userTone === 'stressed',
    apply: (ctx) => ({
      ...ctx,
      paceMultiplier: 1.2,
      voiceStyle: 'soft',
      responseLength: 'short',
    }),
  },
  {
    id: 'urgent-concise',
    when: ({ interpretedIntent }) => interpretedIntent.userTone === 'urgent',
    apply: (ctx) => ({
      ...ctx,
      paceMultiplier: 0.8,
      responseLength: 'short',
      confirmationNeeded: Number(interpretedIntent.confidence || 0) < 0.45,
    }),
  },
];

export function createSignatureBehaviorLayer(options = {}) {
  const rules = Array.isArray(options.rules) && options.rules.length ? options.rules : defaultRules;

  function apply(input = {}) {
    let out = {
      ...input,
      confirmationNeeded: Boolean(input.confirmationNeeded),
      summaryBeforeAction: Boolean(input.summaryBeforeAction),
      responseLength: input.responseLength || 'normal',
      paceMultiplier: Number(input.paceMultiplier || 1),
      voiceStyle: input.voiceStyle || 'calm',
      styleHint: input.styleHint || '',
      signatureLine: input.signatureLine || '',
    };

    for (const rule of rules) {
      if (rule.when(out)) out = rule.apply(out);
    }
    return out;
  }

  return { apply };
}
