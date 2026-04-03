import test from 'node:test';
import assert from 'node:assert/strict';

import { createBlipNextRouter, createConversationState } from '../src/blip-next/index.js';

test('deterministic parser handles timer commands directly', async () => {
  const router = createBlipNextRouter();
  const result = await router.routeTurn('set a timer for 8 minutes');

  assert.equal(result.envelope.intent_type, 'timer.set');
  assert.deepEqual(result.envelope.tool_targets, ['timer']);
  assert.equal(result.envelope.turn_policy, 'respond_and_act');
  assert.equal(result.envelope.requires_confirmation, false);
});

test('gmail parser requires confirmation for outbound email actions', async () => {
  const router = createBlipNextRouter();
  const result = await router.routeTurn('email Natasha "I am running late"');

  assert.equal(result.envelope.intent_type, 'gmail.draft');
  assert.deepEqual(result.envelope.tool_targets, ['gmail']);
  assert.equal(result.envelope.extracted_entities.recipient, 'Natasha');
  assert.equal(result.envelope.requires_confirmation, true);
  assert.equal(result.envelope.turn_policy, 'ask_before_acting');
});

test('follow-up resolves ordinal references from search results', async () => {
  const router = createBlipNextRouter();
  const state = createConversationState({
    working_memory: {
      active_workflow: 'youtube-to-telegram-workflow',
      last_search_results: [
        { id: 'r1', type: 'video_link', label: 'First result' },
        { id: 'r2', type: 'video_link', label: 'Second result' },
      ],
    },
  });

  const result = await router.routeTurn('the second one', state);

  assert.equal(result.envelope.conversation_frame, 'follow_up');
  assert.equal(result.envelope.extracted_entities.reference_item, 'Second result');
});

test('repair handler converts tomorrow instead into repair flow', async () => {
  const router = createBlipNextRouter();
  const state = createConversationState({
    working_memory: {
      active_tool: 'calendar',
      active_workflow: 'calendar-create-workflow',
    },
  });

  const result = await router.routeTurn('tomorrow instead', state);

  assert.equal(result.envelope.intent_type, 'repair.apply');
  assert.equal(result.envelope.turn_policy, 'repair_existing_state');
  assert.equal(result.envelope.extracted_entities.date_reference, 'tomorrow');
});

test('workflow composer creates notes to gmail plan', async () => {
  const router = createBlipNextRouter();
  const result = await router.routeTurn('find that note and email it to Natasha');

  assert.equal(result.envelope.intent_type, 'workflow.compose');
  assert.deepEqual(result.envelope.tool_targets, ['gmail', 'notes']);
  assert.equal(result.envelope.execution_plan.id, 'notes-to-gmail-workflow');
  assert.equal(result.envelope.requires_confirmation, true);
});

test('validator blocks direct action while confirmation is pending', async () => {
  const router = createBlipNextRouter();
  const state = createConversationState({
    state: 'waiting_confirmation',
    working_memory: {
      pending_confirmation: {
        workflow_id: 'gmail-draft-workflow',
        action_label: 'send',
        tool: 'gmail',
        risk_level: 'high',
      },
    },
  });

  const result = await router.routeTurn('email Teo "hello"', state);

  assert.ok(result.envelope.validation_errors.includes('A pending confirmation exists and should be resolved first.'));
});

test('telegram parser accepts "my telegram" as default recipient target', async () => {
  const router = createBlipNextRouter();
  const result = await router.routeTurn('send photo one to my telegram');

  assert.equal(result.envelope.intent_type, 'telegram.send');
  assert.deepEqual(result.envelope.tool_targets, ['telegram']);
  assert.equal(result.envelope.clarification_question, null);
  assert.equal(result.envelope.extracted_entities.recipient || null, null);
});
