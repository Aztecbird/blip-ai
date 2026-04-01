import { createHumeBridge } from './humeBridge.js';
import { createCompanionStateAdapter, getDefaultCompanionSnapshot } from './companionStateAdapter.js';
import { mapVoiceEmotionSignals } from './voiceEmotionMapper.js';

export function createCompanionModeController(options = {}) {
    const adapter = createCompanionStateAdapter();
    let desiredActive = false;
    let pausedForSpeech = false;

    const publishSnapshot = (snapshot = adapter.getSnapshot()) => {
        options.onSnapshot?.(snapshot);
        return snapshot;
    };

    const bridge = createHumeBridge({
        apiBase: options.apiBase,
        onStatus(payload = {}) {
            if (payload.status === 'connecting') {
                publishSnapshot(adapter.updateStatus('connecting', {
                    enabled: true,
                    active: false
                }));
                return;
            }
            if (payload.status === 'listening') {
                publishSnapshot(adapter.updateStatus('listening', {
                    enabled: true,
                    active: true,
                    fallbackReason: ''
                }));
                return;
            }
            if (payload.status === 'fallback') {
                publishSnapshot(adapter.updateStatus('fallback', {
                    enabled: true,
                    active: false,
                    fallbackReason: String(payload.reason || '')
                }));
                return;
            }
            publishSnapshot(adapter.updateStatus('off', {
                active: false
            }));
        },
        onEvent(event = {}) {
            if (event.type !== 'user_expression') return;
            const mapped = mapVoiceEmotionSignals(event);
            publishSnapshot(adapter.merge(mapped, {
                status: mapped.confidence >= 0.2 ? 'active' : 'listening'
            }));
        }
    });

    async function start() {
        if (!options.isEnabled?.()) {
            desiredActive = false;
            publishSnapshot({
                ...getDefaultCompanionSnapshot(),
                enabled: false,
                status: 'off'
            });
            return false;
        }
        if (pausedForSpeech) return false;
        desiredActive = true;
        try {
            return await bridge.start({
                configId: options.getConfigId?.()
            });
        } catch (error) {
            publishSnapshot(adapter.updateStatus('fallback', {
                enabled: true,
                active: false,
                fallbackReason: error?.message || 'hume-start-failed'
            }));
            return false;
        }
    }

    function stop() {
        desiredActive = false;
        bridge.stop();
        publishSnapshot(adapter.updateStatus('off', {
            active: false
        }));
    }

    function pauseForSpeech() {
        pausedForSpeech = true;
        bridge.stop();
        publishSnapshot(adapter.updateStatus('off', {
            active: false
        }));
    }

    async function resumeAfterSpeech() {
        pausedForSpeech = false;
        if (desiredActive) {
            await start();
        }
    }

    return {
        start,
        stop,
        pauseForSpeech,
        resumeAfterSpeech,
        getSnapshot() {
            return adapter.getSnapshot();
        }
    };
}
