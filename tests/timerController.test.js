import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimerController } from '../src/services/timerController.js';

function createStorageStub() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

function createController() {
  const state = {
    timers: [],
    activeAlert: null,
    lastScheduledReminder: null,
    currentSidePanelAction: '',
    isActive: false,
    isThinking: false,
    softSleepMode: false,
  };
  const storage = createStorageStub();
  const controller = createTimerController({
    state,
    storageKey: 'test_timers',
    localStorageRef: storage,
    normalizeVoiceTokens: (value) => String(value || '').trim().toLowerCase(),
    renderCountdownDisplay: () => {},
    updateTimerCorner: () => {},
    syncTimerSidePanel: () => {},
    stopAlarmSoundLoop: () => {},
    documentRef: { getElementById: () => null },
  });
  return { controller, state, storage };
}

test('timer controller schedules and persists timer actions', () => {
  const { controller, state, storage } = createController();

  const result = controller.handleTimerAction({ tool_params: { ms: 60000, label: 'Tea' } });

  assert.equal(result.ok, true);
  assert.equal(state.timers.length, 1);
  assert.equal(state.timers[0].text, 'Tea');
  assert.match(storage.getItem('test_timers'), /Tea/);

  controller.clearAllScheduledTimers();
});

test('timer controller cancels the next scheduled timer', () => {
  const { controller, state } = createController();
  controller.handleTimerAction({ tool_params: { ms: 60000, label: 'First' } });
  controller.handleTimerAction({ tool_params: { ms: 120000, label: 'Second' } });

  const removed = controller.cancelNextScheduledTimer();

  assert.equal(removed.text, 'First');
  assert.equal(state.timers.length, 1);
  assert.equal(state.timers[0].text, 'Second');

  controller.clearAllScheduledTimers();
});
