import test from 'node:test';
import assert from 'node:assert/strict';

import Orchestrator from '../src/blip-polyphony/core/orchestrator.js';
import ToolAgent from '../src/blip-polyphony/agents/action/tool_agent.js';

test('polyphony pipeline carries input through planning, tool, memory, bridge, and expression', async () => {
    const orchestrator = new Orchestrator();
    const calls = [];

    orchestrator.registerAgent('deterministic', {
        async process() {
            calls.push('deterministic');
        }
    });
    orchestrator.registerAgent('perception', {
        async process(capsule) {
            calls.push('perception');
            capsule.perception.confidence = 0.72;
        }
    });
    orchestrator.registerAgent('planning', {
        async process(capsule) {
            calls.push('planning');
            capsule.plan.push({
                step_id: 's1',
                action: 'compose',
                tool: 'telegram',
                status: 'pending',
                confirmed: true,
                params: { text: 'hello' }
            });
        }
    });
    orchestrator.registerAgent('tool', new ToolAgent({
        appHandlers: {
            telegram: async (action, params) => {
                calls.push(`tool:${action}`);
                return { ok: true, text: params.text };
            }
        }
    }));
    orchestrator.registerAgent('memory', {
        async process() {
            calls.push('memory');
        }
    });
    orchestrator.registerAgent('bridge', {
        async process() {
            calls.push('bridge');
        }
    });
    orchestrator.registerAgent('expression', {
        async process(capsule) {
            calls.push('expression');
            capsule.response = 'Handled.';
        }
    });

    const capsule = await orchestrator.process('message Ana hello', { origin: 'voice' });

    assert.equal(capsule.status, 'completed');
    assert.equal(capsule.results.length, 1);
    assert.equal(capsule.response, 'Handled.');
    assert.deepEqual(calls, ['deterministic', 'perception', 'planning', 'tool:compose', 'memory', 'bridge', 'expression']);
});

test('tool agent maps calendar and telegram without no_implementation', () => {
    const agent = new ToolAgent();

    assert.equal(agent.mapToArcadeTool('calendar'), 'GoogleCalendar.CreateEvent');
    assert.deepEqual(agent.mapToArcadeTool('telegram'), {
        type: 'local',
        handler: 'sendTelegramMessage',
        description: 'Routes to legacy Telegram handler in main.js'
    });
});
