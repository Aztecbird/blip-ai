import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const mainSource = readFileSync(resolve(root, 'src/main.js'), 'utf8');
const requirementsSource = readFileSync(resolve(root, 'REQUIREMENTS.md'), 'utf8');

function indexOfRequired(source, needle) {
    const index = source.indexOf(needle);
    assert.notEqual(index, -1, `Missing required source marker: ${needle}`);
    return index;
}

function countOccurrences(source, needle) {
    return source.split(needle).length - 1;
}

test('runtime requirements document keeps parser and Polyphony safety protocols', () => {
    assert.match(requirementsSource, /Pending draft parsers run first/);
    assert.match(requirementsSource, /Polyphony is optional and should stay off by default/);
    assert.match(requirementsSource, /Polyphony must not intercept pending draft follow-ups/);
    assert.match(requirementsSource, /Parser tests are not enough/);
    assert.match(requirementsSource, /live caller in `src\/main\.js`/);
});

test('pending notes follow-up is handled before Polyphony can intercept', () => {
    const pendingNotesIndex = indexOfRequired(mainSource, 'const pendingNotesFollowUp = resolvePendingNotesFollowUp(cmd);');
    const polyphonyIndex = indexOfRequired(mainSource, 'const capsule = await polyphony.process(cmd, {');

    assert.equal(
        countOccurrences(mainSource, 'const pendingNotesFollowUp = resolvePendingNotesFollowUp(cmd);'),
        1,
        'Pending notes follow-up should have one live priority location.'
    );
    assert.ok(
        pendingNotesIndex < polyphonyIndex,
        'Pending notes follow-up must run before Polyphony so phrases like "save note" cannot be stolen.'
    );
});

test('Polyphony voice interception is guarded by the feature toggle', () => {
    const toggleGuardIndex = indexOfRequired(mainSource, 'if (v2_brain_enabled) {');
    const polyphonyIndex = indexOfRequired(mainSource, 'const capsule = await polyphony.process(cmd, {');

    assert.ok(
        toggleGuardIndex < polyphonyIndex,
        'Polyphony must be behind v2_brain_enabled before calling polyphony.process().'
    );
});

test('new local parsers have live callers in main.js', () => {
    const requiredMarkers = [
        'getStudentDeskVoiceCommand(cmd)',
        'tryHandleTaskVoiceCommand(cmd, {',
        'getCameraDesignTransferCommand(cmd)',
        'advanceFreeformNotesDraft(draft, cmd, lower)',
        'analyzeHomeworkPhoto('
    ];

    for (const marker of requiredMarkers) {
        indexOfRequired(mainSource, marker);
    }
});

