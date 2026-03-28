import test from 'node:test';
import assert from 'node:assert/strict';

import {
    canConfirmTelegramSend,
    isTelegramMetaNoMessageUtterance,
    parseTelegramFollowUp
} from '../src/features/telegram/telegramFeature.js';

test('parseTelegramFollowUp keeps improve/edit phrases as review commands', () => {
    assert.deepEqual(parseTelegramFollowUp('improve it'), { action: 'improveDraft' });
    assert.deepEqual(parseTelegramFollowUp('review the message'), { action: 'review' });
    assert.deepEqual(parseTelegramFollowUp('make it clearer'), { action: 'improveDraft' });
    assert.deepEqual(parseTelegramFollowUp('can you review the message and improve it'), { action: 'improveDraft' });
    assert.deepEqual(parseTelegramFollowUp('but it sounds more friendly'), { action: 'improveDraft' });
});

test('parseTelegramFollowUp still recognizes send and clear commands', () => {
    assert.deepEqual(parseTelegramFollowUp('go send it'), { action: 'sendText' });
    assert.deepEqual(parseTelegramFollowUp('now send'), { action: 'sendText' });
    assert.deepEqual(parseTelegramFollowUp('you can send it'), { action: 'sendText' });
    assert.deepEqual(parseTelegramFollowUp('send it'), { action: 'sendText' });
    assert.deepEqual(parseTelegramFollowUp('send message'), { action: 'sendText' });
    assert.deepEqual(parseTelegramFollowUp('send the message'), { action: 'sendText' });
    assert.deepEqual(parseTelegramFollowUp('send it in telegram'), { action: 'sendText' });
    assert.deepEqual(parseTelegramFollowUp('perfect scent'), { action: 'sendText' });
    assert.deepEqual(parseTelegramFollowUp('clear'), { action: 'clear' });
    assert.deepEqual(
        parseTelegramFollowUp('i just bought the perfect microphone and it\'s doing great'),
        { action: 'updateText', text: "i just bought the perfect microphone and it's doing great" }
    );
});

test('isTelegramMetaNoMessageUtterance spots meta phrases not real message bodies', () => {
    assert.equal(isTelegramMetaNoMessageUtterance("I haven't told you the message"), true);
    assert.equal(isTelegramMetaNoMessageUtterance('i havent told you the message'), true);
    assert.equal(isTelegramMetaNoMessageUtterance('i haven t told you the message'), true);
    assert.equal(isTelegramMetaNoMessageUtterance('I love you very much see you soon'), false);
});

test('canConfirmTelegramSend only allows confirmation in true review mode', () => {
    assert.equal(
        canConfirmTelegramSend({
            pendingTelegramReview: false,
            currentSidePanelAction: 'telegram',
            isTelegramPanelVisible: true,
        }),
        false
    );
    assert.equal(
        canConfirmTelegramSend({
            pendingTelegramReview: true,
            currentSidePanelAction: 'telegram',
            isTelegramPanelVisible: true,
        }),
        true
    );
    assert.equal(
        canConfirmTelegramSend({
            pendingTelegramReview: true,
            currentSidePanelAction: 'telegram',
            isTelegramPanelVisible: false,
        }),
        false
    );
    assert.equal(
        canConfirmTelegramSend({
            pendingTelegramReview: true,
            currentSidePanelAction: 'gmail',
            isTelegramPanelVisible: true,
        }),
        false
    );
});
