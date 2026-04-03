import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getCoreCommandParsingTemperature,
    getStructuredTaskTemperature,
    PARSING_TEMPERATURE_POLICY
} from '../src/services/parsingTemperaturePolicy.js';

test('core command parsing temperature stays near zero by default', () => {
    global.window = { localStorage: { getItem: () => null } };
    assert.equal(getCoreCommandParsingTemperature(), PARSING_TEMPERATURE_POLICY.core_command_default);
});

test('core command parsing temperature is capped even when user setting is high', () => {
    global.window = { localStorage: { getItem: () => '0.4' } };
    assert.equal(getCoreCommandParsingTemperature(), PARSING_TEMPERATURE_POLICY.core_command_cap);
});

test('structured task temperature stays below the old broad parsing ceiling', () => {
    global.window = { localStorage: { getItem: () => '0.5' } };
    assert.equal(getStructuredTaskTemperature(), PARSING_TEMPERATURE_POLICY.structured_task_cap);
});
