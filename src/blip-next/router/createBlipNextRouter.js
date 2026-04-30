import { createIntentClassifier } from '../parsers/intentClassifier.js';
import { createEntityExtractor } from '../parsers/entityExtractor.js';
import { createGmailParser } from '../parsers/tools/gmailParser.js';
import { createTelegramParser } from '../parsers/tools/telegramParser.js';
import { createTimerParser } from '../parsers/tools/timerParser.js';
import { createArcadeParser } from '../parsers/tools/arcadeParser.js';
import { createWorkflowComposer } from '../planning/workflowComposer.js';
import { createReferenceResolver } from '../resolution/referenceResolver.js';
import { createRepairHandler } from '../repair/repairHandler.js';
import { createConfirmationPolicy } from '../planning/confirmationPolicy.js';
import { createConversationState, deriveStateFromEnvelope, applyMemoryPatch } from '../state/conversationState.js';
import { runDeterministicPass } from '../rules/deterministicRouter.js';
import { validateEnvelope } from '../validation/validateEnvelope.js';

function detectToolCandidates(utterance = '', entities = {}, state = {}) {
  const lower = String(utterance || '').toLowerCase();
  const tools = new Set();

  if (/\b(gmail|email|mail)\b/.test(lower) || entities.channel_switch === 'gmail') tools.add('gmail');
  if (/\btelegram\b/.test(lower) || /\bmessage\b/.test(lower) || entities.channel_switch === 'telegram') tools.add('telegram');
  if (/\btimer\b/.test(lower) || entities.duration) tools.add('timer');
  if (/\bweather\b/.test(lower)) tools.add('weather');
  if (/\byoutube\b/.test(lower)) tools.add('youtube');
  if (/\bnote\b/.test(lower)) tools.add('notes');
  if (/\bcamera\b/.test(lower)) tools.add('camera');
  if (/\b(calendar|google\s*calendar|arcade)\b/.test(lower)) tools.add('arcade');

  if ((/\bfind\b/.test(lower) && /\bemail\b/.test(lower)) || (/\bnote\b/.test(lower) && /\bemail\b/.test(lower))) {
    tools.add('notes');
    tools.add('gmail');
  }

  if (/\byoutube\b/.test(lower) && /\btelegram\b/.test(lower)) {
    tools.add('youtube');
    tools.add('telegram');
  }

  if (/\bweather\b/.test(lower) && /\bremind\b/.test(lower)) {
    tools.add('weather');
    tools.add('timer');
  }

  if (tools.size === 0 && state.working_memory?.active_tool) tools.add(state.working_memory.active_tool);

  return Array.from(tools);
}

function buildEnvelope(base = {}) {
  return {
    intent_type: base.intent_type || 'conversation.reply',
    conversation_frame: base.conversation_frame || 'free_conversation',
    tool_targets: base.tool_targets || [],
    confidence: Number(base.confidence || 0),
    extracted_entities: base.extracted_entities || {},
    shared_objects_in: base.shared_objects_in || [],
    shared_objects_out: base.shared_objects_out || [],
    requires_confirmation: Boolean(base.requires_confirmation),
    risk_level: base.risk_level || 'low',
    repairable_fields: base.repairable_fields || [],
    execution_plan: base.execution_plan || null,
    follow_up_needed: Boolean(base.follow_up_needed),
    clarification_question: base.clarification_question || null,
    response_style: base.response_style || 'brief',
    turn_policy: base.turn_policy || 'respond_only',
    validation_errors: base.validation_errors || [],
    action: base.action || null,
    parser_source: base.parser_source || 'composed',
  };
}

function chooseResponseStyle(frame = 'free_conversation', fallback = 'brief') {
  if (frame === 'emotional_moment') return 'chatty';
  if (frame === 'urgent_or_safety') return 'urgent';
  if (frame === 'confirmation') return 'confirming';
  if (frame === 'correction' || frame === 'follow_up') return 'clarifying';
  return fallback;
}

function deriveTurnPolicy({ frame, confirmationRequired, clarificationQuestion, toolTargets }) {
  if (frame === 'correction') return 'repair_existing_state';
  if (clarificationQuestion) return 'respond_and_ask';
  if (confirmationRequired) return 'ask_before_acting';
  if (toolTargets.length > 0 && frame !== 'free_conversation' && frame !== 'emotional_moment') return 'respond_and_act';
  if (frame === 'unsupported_request') return 'route_to_fallback';
  return 'respond_only';
}

export function createBlipNextRouter(options = {}) {
  const intentClassifier = options.intentClassifier || createIntentClassifier();
  const entityExtractor = options.entityExtractor || createEntityExtractor();
  const gmailParser = options.gmailParser || createGmailParser();
  const telegramParser = options.telegramParser || createTelegramParser();
  const timerParser = options.timerParser || createTimerParser();
  const arcadeParser = options.arcadeParser || createArcadeParser();
  const workflowComposer = options.workflowComposer || createWorkflowComposer();
  const referenceResolver = options.referenceResolver || createReferenceResolver();
  const repairHandler = options.repairHandler || createRepairHandler();
  const confirmationPolicy = options.confirmationPolicy || createConfirmationPolicy();

  async function routeTurn(utterance = '', incomingState = null) {
    let state = incomingState || createConversationState();
    const deterministic = runDeterministicPass(utterance);

    if (deterministic) {
      const validation = validateEnvelope(deterministic, state);
      const envelope = buildEnvelope({ ...deterministic, validation_errors: validation.errors });
      return {
        envelope,
        state: deriveStateFromEnvelope(envelope, state),
        debug: { stage: 'deterministic' },
      };
    }

    const intent = intentClassifier.classify(utterance, state);
    const rawEntities = entityExtractor.extract(utterance);
    rawEntities.raw = utterance;
    const resolvedReferences = referenceResolver.resolve(rawEntities, state);
    const entities = resolvedReferences.entities;
    const repair = repairHandler.parseRepair(utterance, state);
    const toolCandidates = detectToolCandidates(utterance, entities, state);

    if (repair.handled) {
      const repairedEntities = { ...entities, ...repair.patch };
      const toolTargets = repair.patch.channel_switch ? [repair.patch.channel_switch] : toolCandidates;
      const envelope = buildEnvelope({
        intent_type: 'repair.apply',
        conversation_frame: 'correction',
        tool_targets: toolTargets,
        confidence: 0.9,
        extracted_entities: repairedEntities,
        shared_objects_in: [],
        shared_objects_out: [],
        requires_confirmation: false,
        risk_level: 'medium',
        repairable_fields: repair.repair_context.fields,
        execution_plan: null,
        follow_up_needed: false,
        clarification_question: null,
        response_style: chooseResponseStyle('correction'),
        turn_policy: 'repair_existing_state',
      });
      state = applyMemoryPatch(state, { repair_context: repair.repair_context });
      return {
        envelope,
        state: deriveStateFromEnvelope(envelope, state),
        debug: { stage: 'repair', repair, resolvedReferences },
      };
    }

    const parserResults = [
      gmailParser.parse({ utterance, entities, frame: intent.frame }),
      telegramParser.parse({ utterance, entities, frame: intent.frame }),
      timerParser.parse({ utterance, entities, frame: intent.frame }),
      arcadeParser.parse({ utterance, entities, frame: intent.frame }),
    ].filter(Boolean);

    const multiToolRequest = toolCandidates.length > 1;
    const primaryTool = parserResults[0]?.tool || toolCandidates[0] || null;
    const primaryAction = parserResults[0]?.action || (primaryTool === 'weather' ? 'lookup' : 'run');
    const confirmation = primaryTool
      ? confirmationPolicy.decide({ tool: primaryTool, action: primaryAction, entities, state })
      : { required: false, reason: 'Conversation only.', risk_level: 'none' };

    const executionPlan = multiToolRequest
      ? workflowComposer.compose({ utterance, toolCandidates, entities, confirmation })
      : primaryTool
        ? workflowComposer.compose({ utterance, toolCandidates: [primaryTool], entities, confirmation })
        : null;

    const intentType = multiToolRequest
      ? 'workflow.compose'
      : parserResults[0]?.intent_type || (intent.frame === 'free_conversation' ? 'conversation.reply' : 'conversation.route');

    const clarificationQuestion = parserResults.find((item) => item?.clarification_question)?.clarification_question || null;
    const requiresConfirmation = multiToolRequest
      ? Boolean(executionPlan?.steps?.some((step) => step.requires_confirmation))
      : Boolean(confirmation.required);
    const turnPolicy = deriveTurnPolicy({
      frame: intent.frame,
      confirmationRequired: requiresConfirmation,
      clarificationQuestion,
      toolTargets: toolCandidates,
    });

    const mergedEntities = parserResults[0]?.extracted_entities
      ? { ...entities, ...parserResults[0].extracted_entities }
      : entities;

    const envelope = buildEnvelope({
      intent_type: intentType,
      conversation_frame: intent.frame,
      tool_targets: toolCandidates,
      confidence: multiToolRequest ? 0.88 : Math.max(intent.confidence, parserResults[0]?.confidence || 0),
      extracted_entities: mergedEntities,
      shared_objects_in: state.working_memory?.last_search_results || [],
      shared_objects_out: parserResults.flatMap((item) => item.shared_objects_out || []),
      requires_confirmation: requiresConfirmation,
      risk_level: confirmation.risk_level || 'low',
      repairable_fields: multiToolRequest
        ? executionPlan?.steps?.flatMap((step) => step.consumes || []) || []
        : parserResults[0]?.repairable_fields || [],
      execution_plan: executionPlan,
      follow_up_needed: Boolean(clarificationQuestion),
      clarification_question: clarificationQuestion,
      response_style: chooseResponseStyle(intent.frame, intent.response_style),
      turn_policy: turnPolicy,
    });

    const validation = validateEnvelope(envelope, state);
    envelope.validation_errors = validation.errors;

    const nextMemoryPatch = {
      active_tool: toolCandidates[toolCandidates.length - 1] || state.working_memory.active_tool,
      active_workflow: executionPlan?.id || state.working_memory.active_workflow,
      current_recipient: entities.recipient || state.working_memory.current_recipient,
      current_subject: entities.subject || state.working_memory.current_subject,
      last_person_reference: entities.recipient || state.working_memory.last_person_reference,
      last_item_reference: entities.reference_item || state.working_memory.last_item_reference,
      last_location_reference: entities.location || state.working_memory.last_location_reference,
      pending_confirmation: requiresConfirmation && executionPlan
        ? {
            workflow_id: executionPlan.id,
            action_label: primaryAction,
            tool: primaryTool,
            risk_level: confirmation.risk_level,
          }
        : null,
    };

    state = applyMemoryPatch(state, nextMemoryPatch);

    return {
      envelope,
      state: deriveStateFromEnvelope(envelope, state),
      debug: {
        stage: 'composed',
        intent,
        rawEntities,
        resolvedReferences,
        parserResults,
        confirmation,
      },
    };
  }

  return { routeTurn };
}
