import test from 'node:test';
import assert from 'node:assert/strict';

import { createCompanionStateAdapter } from '../src/services/companionStateAdapter.js';
import { getNeutralVoiceEmotionMap, mapVoiceEmotionSignals } from '../src/services/voiceEmotionMapper.js';

test('mapVoiceEmotionSignals turns urgency-heavy payloads into efficient assistant mode', () => {
    const mapped = mapVoiceEmotionSignals({
        emotionFeatures: {
            urgency: 0.82,
            determination: 0.61,
            confusion: 0.14
        }
    });

    assert.equal(mapped.recommendedMode, 'efficient_assistant');
    assert.equal(mapped.behavior.replyPacing, 'faster');
    assert.equal(mapped.behavior.replyLength, 'short');
});

test('mapVoiceEmotionSignals treats hesitant and soft delivery as gentle support', () => {
    const mapped = mapVoiceEmotionSignals({
        emotionFeatures: {
            uncertainty: 0.72,
            hesitation: 0.66,
            calm: 0.58
        }
    });

    assert.equal(mapped.recommendedMode, 'gentle_support');
    assert.equal(mapped.behavior.shouldConfirmActions, true);
});

test('companion state adapter smooths spikes instead of flipping fully on one event', () => {
    const adapter = createCompanionStateAdapter({ blend: 0.3 });
    const neutral = getNeutralVoiceEmotionMap();

    adapter.merge({
        ...neutral,
        source: 'hume',
        signals: {
            ...neutral.signals,
            frustration: 1
        },
        recommendedMode: 'careful_confirmation',
        confidence: 1,
        behavior: {
            ...neutral.behavior,
            shouldConfirmActions: true
        }
    }, { now: 1000, status: 'active' });

    const snapshot = adapter.getSnapshot(1000);
    assert.equal(snapshot.mode, 'careful_confirmation');
    assert.ok(snapshot.signals.frustration < 0.4);
    assert.equal(snapshot.behavior.shouldConfirmActions, true);
});
