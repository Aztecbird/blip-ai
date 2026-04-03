import { getToolCapability } from '../tools/capabilities.js';

function createStep(id, config = {}) {
  return {
    id,
    type: config.type || 'tool_action',
    tool: config.tool,
    action: config.action,
    status: config.status || 'ready',
    consumes: config.consumes || [],
    produces: config.produces || [],
    input: config.input || {},
    output: config.output || {},
    requires_confirmation: Boolean(config.requires_confirmation),
  };
}

function singleToolPlan(tool, action, entities, confirmation) {
  return {
    id: `${tool}-${action}-workflow`,
    summary: `${tool} ${action}`,
    steps: [
      createStep(`${tool}-${action}-1`, {
        tool,
        action,
        consumes: Object.keys(entities),
        produces: getToolCapability(tool)?.produces || [],
        input: entities,
        requires_confirmation: confirmation.required,
      }),
    ],
    shared_objects: [],
    next_step_id: `${tool}-${action}-1`,
  };
}

export function createWorkflowComposer() {
  function compose({ utterance = '', toolCandidates = [], entities = {}, confirmation = { required: false } }) {
    const lower = String(utterance || '').toLowerCase();

    if (toolCandidates.length === 0) return null;

    if (toolCandidates.length === 1) {
      const [tool] = toolCandidates;
      const action = tool === 'timer' ? 'set' : tool === 'weather' ? 'lookup' : tool === 'gmail' ? 'draft' : tool === 'telegram' ? 'draft' : 'run';
      return singleToolPlan(tool, action, entities, confirmation);
    }

    if (toolCandidates.includes('notes') && toolCandidates.includes('gmail')) {
      return {
        id: 'notes-to-gmail-workflow',
        summary: 'Find a note and draft an email with it',
        steps: [
          createStep('notes-find', {
            tool: 'notes',
            action: 'find',
            consumes: ['query'],
            produces: ['text_note'],
            input: { query: entities.query || entities.reference_item || 'last note' },
          }),
          createStep('gmail-draft', {
            tool: 'gmail',
            action: 'draft',
            consumes: ['text_note', 'recipient'],
            produces: ['email_draft'],
            input: { recipient: entities.recipient || null, subject: entities.subject || '', body_from: 'notes-find.text_note' },
            requires_confirmation: true,
          }),
          createStep('gmail-send-review', {
            type: 'confirmation',
            tool: 'gmail',
            action: 'send',
            status: 'blocked',
            consumes: ['email_draft'],
            produces: [],
            input: { review: true },
            requires_confirmation: true,
          }),
        ],
        shared_objects: [],
        next_step_id: 'notes-find',
      };
    }

    if (toolCandidates.includes('youtube') && toolCandidates.includes('telegram')) {
      return {
        id: 'youtube-to-telegram-workflow',
        summary: 'Search YouTube and send the result over Telegram',
        steps: [
          createStep('youtube-search', {
            tool: 'youtube',
            action: 'search',
            consumes: ['query'],
            produces: ['video_link', 'title'],
            input: { query: entities.query || utterance },
          }),
          createStep('telegram-draft', {
            tool: 'telegram',
            action: 'draft',
            consumes: ['recipient', 'video_link', 'title'],
            produces: ['telegram_draft'],
            input: { recipient: entities.recipient || null, body_from: 'youtube-search.video_link' },
            requires_confirmation: true,
          }),
          createStep('telegram-send-review', {
            type: 'confirmation',
            tool: 'telegram',
            action: 'send',
            status: 'blocked',
            consumes: ['telegram_draft'],
            produces: [],
            input: { review: true },
            requires_confirmation: true,
          }),
        ],
        shared_objects: [],
        next_step_id: 'youtube-search',
      };
    }

    if (toolCandidates.includes('weather') && toolCandidates.includes('timer')) {
      return {
        id: 'weather-to-reminder-workflow',
        summary: 'Check weather and follow up later',
        steps: [
          createStep('weather-lookup', {
            tool: 'weather',
            action: 'lookup',
            consumes: ['location', 'date_reference'],
            produces: ['forecast', 'condition'],
            input: { location: entities.location || null, when: entities.date_reference || 'today' },
          }),
          createStep('timer-follow-up', {
            tool: 'timer',
            action: 'set',
            consumes: ['duration'],
            produces: ['timer_state'],
            input: { duration: entities.duration || { value: 1, unit: 'day' }, label: 'Weather follow-up' },
          }),
        ],
        shared_objects: [],
        next_step_id: 'weather-lookup',
      };
    }

    return singleToolPlan(toolCandidates[0], 'run', entities, confirmation);
  }

  return { compose };
}
