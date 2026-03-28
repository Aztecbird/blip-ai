import test from 'node:test';
import assert from 'node:assert/strict';

import { getStudentDeskVoiceCommand } from '../src/services/studentDeskVoice.js';

test('getStudentDeskVoiceCommand understands open and close phrasing', () => {
    assert.deepEqual(
        getStudentDeskVoiceCommand('open student desk'),
        { action: 'open' }
    );
    assert.deepEqual(
        getStudentDeskVoiceCommand('close desk'),
        { action: 'close' }
    );
});

test('getStudentDeskVoiceCommand understands homework save and review phrasing', () => {
    assert.deepEqual(
        getStudentDeskVoiceCommand('save this homework to desk'),
        { action: 'saveCurrent' }
    );
    assert.deepEqual(
        getStudentDeskVoiceCommand('review study desk'),
        { action: 'review' }
    );
});

test('getStudentDeskVoiceCommand understands note and clear phrasing', () => {
    assert.deepEqual(
        getStudentDeskVoiceCommand('put my math note in student desk: revise fractions'),
        { action: 'saveNote', note: 'revise fractions' }
    );
    assert.deepEqual(
        getStudentDeskVoiceCommand('PLEASE, save this to the student desk!!'),
        { action: 'saveCurrent' }
    );
    assert.deepEqual(
        getStudentDeskVoiceCommand('clear the student desk'),
        { action: 'clear' }
    );
});
