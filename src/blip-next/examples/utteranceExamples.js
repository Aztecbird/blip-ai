export const utteranceExamples = [
  {
    utterance: 'set a timer for 8 minutes',
    expected: {
      intent_type: 'timer.set',
      tool_targets: ['timer'],
      turn_policy: 'respond_and_act',
      requires_confirmation: false,
    },
  },
  {
    utterance: 'email Natasha that I am running ten minutes late',
    expected: {
      intent_type: 'gmail.draft',
      tool_targets: ['gmail'],
      turn_policy: 'ask_before_acting',
      requires_confirmation: true,
    },
  },
  {
    utterance: 'find that note and email it to Natasha',
    expected: {
      intent_type: 'workflow.compose',
      tool_targets: ['notes', 'gmail'],
      turn_policy: 'ask_before_acting',
      requires_confirmation: true,
    },
  },
  {
    utterance: 'the second one',
    expected: {
      conversation_frame: 'follow_up',
      follow_up_needed: false,
    },
  },
  {
    utterance: 'tomorrow instead',
    expected: {
      conversation_frame: 'correction',
      turn_policy: 'repair_existing_state',
    },
  },
];
