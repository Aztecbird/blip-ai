import test from 'node:test';
import assert from 'node:assert/strict';

import {
    isCorrectionIntentUtterance,
    isImproveDraftIntent,
    isRecipientNoiseOnly,
    isSubjectSlotNoiseOnly,
    parseEmailDraftFollowUp,
    parseEmailStatusFollowUp
} from '../src/services/voiceDialog/emailFollowUpParse.js';

test('parseEmailDraftFollowUp recognizes cancel and append', () => {
    assert.equal(parseEmailDraftFollowUp('never mind').action, 'cancelDraft');
    assert.equal(parseEmailDraftFollowUp('add see you soon').action, 'appendMessage');
    assert.equal(parseEmailDraftFollowUp('add see you soon').text, 'see you soon');
    assert.equal(parseEmailDraftFollowUp('okay you can send it').action, 'sendDraft');
    assert.equal(parseEmailDraftFollowUp('really').action, 'sendDraft');
    assert.equal(parseEmailDraftFollowUp('no you send it').action, 'sendDraft');
    assert.equal(parseEmailDraftFollowUp('ya send it').action, 'sendDraft');
    assert.equal(parseEmailDraftFollowUp('send it for me').action, 'sendDraft');
    assert.equal(parseEmailDraftFollowUp('undo').action, 'undoDraft');
});

test('parseEmailDraftFollowUp does not treat to send as recipient update', () => {
    const u = parseEmailDraftFollowUp('to send');
    assert.notEqual(u?.action, 'updateRecipient');
});

test('isRecipientNoiseOnly flags command words only', () => {
    assert.equal(isRecipientNoiseOnly('send'), true);
    assert.equal(isRecipientNoiseOnly('to send'), true);
    assert.equal(isRecipientNoiseOnly('make'), true);
    assert.equal(isRecipientNoiseOnly('make it'), true);
    assert.equal(isRecipientNoiseOnly('know'), true);
    assert.equal(isRecipientNoiseOnly('you know'), true);
    assert.equal(isRecipientNoiseOnly('mom'), false);
    assert.equal(isRecipientNoiseOnly('a@b.co'), false);
});

test('parseEmailDraftFollowUp recognizes clear recipient', () => {
    assert.equal(parseEmailDraftFollowUp('go to recipient and delete').action, 'clearRecipient');
    assert.equal(parseEmailDraftFollowUp('clear recipient').action, 'clearRecipient');
});

test('parseEmailStatusFollowUp recognizes is email sent questions', () => {
    assert.equal(parseEmailStatusFollowUp('is the email sent')?.action, 'statusCheck');
    assert.equal(parseEmailStatusFollowUp('ist email sent wow')?.action, 'statusCheck');
    assert.equal(parseEmailStatusFollowUp('did the email send')?.action, 'statusCheck');
    assert.equal(parseEmailStatusFollowUp('has it been sent')?.action, 'statusCheck');
    assert.equal(parseEmailStatusFollowUp('random words'), null);
});

test('parseEmailDraftFollowUp treats improve mail as polish not recipient', () => {
    assert.equal(parseEmailDraftFollowUp('can you improve the mail a little bit').action, 'improveDraft');
    assert.equal(parseEmailDraftFollowUp('improve the email').action, 'improveDraft');
    assert.equal(parseEmailDraftFollowUp('please polish the message').action, 'improveDraft');
    assert.equal(isImproveDraftIntent('to improve the mail'), true);
    assert.equal(parseEmailDraftFollowUp('to mom').action, 'updateRecipient');
});

test('yes improve it and correct are not subject lines', () => {
    assert.equal(parseEmailDraftFollowUp('yes improve it').action, 'improveDraft');
    assert.equal(parseEmailDraftFollowUp('improve it').action, 'improveDraft');
    assert.equal(parseEmailDraftFollowUp('polish the subject').action, 'improveDraft');
    assert.equal(parseEmailDraftFollowUp('correct').action, 'requestCorrection');
    assert.equal(parseEmailDraftFollowUp('correct it').action, 'requestCorrection');
    assert.equal(parseEmailDraftFollowUp('please correct it').action, 'requestCorrection');
    assert.equal(parseEmailDraftFollowUp('can you correct it').action, 'requestCorrection');
    assert.equal(parseEmailDraftFollowUp('that is correct').action, 'confirmDraft');
    assert.equal(isSubjectSlotNoiseOnly('yes improve it'), true);
    assert.equal(isSubjectSlotNoiseOnly('correct it'), true);
    assert.equal(isSubjectSlotNoiseOnly('dinner tomorrow'), false);
    assert.equal(isCorrectionIntentUtterance('correct it'), true);
    assert.equal(isCorrectionIntentUtterance('subject dinner'), false);
});

test('parseEmailDraftFollowUp subject shorthand still works', () => {
    const u = parseEmailDraftFollowUp('subject dinner');
    assert.equal(u?.action, 'updateSubject');
    assert.equal(u?.subject, 'dinner');
});
