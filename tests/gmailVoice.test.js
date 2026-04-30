import test from 'node:test';
import assert from 'node:assert/strict';

import {
    extractSpokenEmailAddress,
    extractGmailCheckContactRequest,
    extractGmailListContactsRequest,
    extractGmailSaveContactRequest,
    extractGmailDirectSendRequest,
    extractGmailNoteSubjectRequest,
    extractGmailShareRecipientRequest,
    getGmailVoiceCommand
} from '../src/services/gmailVoice.js';

test('getGmailVoiceCommand understands Gmail auth and inbox commands', () => {
    assert.deepEqual(getGmailVoiceCommand('connect gmail'), { action: 'connect' });
    assert.deepEqual(getGmailVoiceCommand('disconnect email'), { action: 'disconnect' });
    assert.deepEqual(getGmailVoiceCommand('check my email'), { action: 'openInbox' });
    assert.deepEqual(getGmailVoiceCommand('open mail'), { action: 'openInbox' });
    assert.deepEqual(getGmailVoiceCommand('open sent'), { action: 'openSent' });
    assert.deepEqual(getGmailVoiceCommand('refresh sent folder'), { action: 'refreshSent' });
    assert.deepEqual(getGmailVoiceCommand('can you open mail so i can verify it'), { action: 'openInbox' });
    assert.deepEqual(getGmailVoiceCommand('can you open now the mail tool so i can see if you send it'), { action: 'openInbox' });
    assert.deepEqual(getGmailVoiceCommand('can you open the email client so i can verify it'), { action: 'openInbox' });
    assert.deepEqual(getGmailVoiceCommand('save this as a draft and open the email tool'), { action: 'openDraft' });
    assert.deepEqual(
        getGmailVoiceCommand('can you save this as a draft and open the email tool'),
        { action: 'openDraft' }
    );
    assert.deepEqual(
        getGmailVoiceCommand('please save this as a draft and open the gmail tool'),
        { action: 'openDraft' }
    );
    assert.deepEqual(getGmailVoiceCommand('fill email with draft'), { action: 'openDraft' });
    assert.deepEqual(getGmailVoiceCommand('fill the email tool with the draft'), { action: 'openDraft' });
    assert.deepEqual(getGmailVoiceCommand('close inbox'), { action: 'close' });
    assert.deepEqual(getGmailVoiceCommand('can you send an email'), { action: 'compose' });
    assert.deepEqual(getGmailVoiceCommand('i want to send an email'), { action: 'compose' });
    assert.deepEqual(getGmailVoiceCommand('who do you know in email'), { action: 'listContacts' });
    assert.deepEqual(getGmailVoiceCommand('do you have pablo sanchez email'), {
        action: 'checkContact',
        alias: 'pablo sanchez'
    });
    assert.deepEqual(getGmailVoiceCommand('save aztec bird at mac.com as my daughter'), {
        action: 'saveContact',
        recipient: 'aztecbird@mac.com',
        recipientQuery: 'aztec bird at mac.com',
        alias: 'my daughter'
    });
});

test('getGmailVoiceCommand parses read email indexes', () => {
    assert.deepEqual(getGmailVoiceCommand('read email 3'), { action: 'readIndex', index: 3 });
    assert.deepEqual(getGmailVoiceCommand('open message two'), { action: 'readIndex', index: 2 });
});

test('extractGmailDirectSendRequest pulls out send details', () => {
    assert.deepEqual(
        extractGmailDirectSendRequest('send email to joyandart@gmail.com subject hello message how are you'),
        {
            to: 'joyandart@gmail.com',
            subject: 'hello',
            text: 'how are you'
        }
    );
    assert.deepEqual(
        extractGmailDirectSendRequest('send email to aztec bird at mac.com subject hello message how are you'),
        {
            to: 'aztecbird@mac.com',
            recipientQuery: '',
            subject: 'hello',
            text: 'how are you'
        }
    );
    assert.deepEqual(
        extractGmailDirectSendRequest('send email to my daughter subject hello message how are you'),
        {
            to: '',
            recipientQuery: 'my daughter',
            subject: 'hello',
            text: 'how are you'
        }
    );
    assert.deepEqual(
        extractGmailDirectSendRequest('draft email to my daughter with the message do not forget your training tomorrow'),
        {
            to: '',
            recipientQuery: 'my daughter',
            subject: '',
            text: 'do not forget your training tomorrow'
        }
    );
});

test('extractGmailCheckContactRequest parses named contact lookups', () => {
    assert.deepEqual(
        extractGmailCheckContactRequest('do you have pablo sanchez email'),
        { action: 'checkContact', alias: 'pablo sanchez' }
    );
    assert.deepEqual(
        extractGmailCheckContactRequest('what is my daughter email'),
        { action: 'checkContact', alias: 'my daughter' }
    );
    assert.deepEqual(
        extractGmailCheckContactRequest('do you know the email for pablo sanchez'),
        { action: 'checkContact', alias: 'pablo sanchez' }
    );
});

test('extractSpokenEmailAddress pulls email out of longer natural phrases', () => {
    assert.equal(
        extractSpokenEmailAddress('aztec bird at mac.com please save this mail'),
        'aztecbird@mac.com'
    );
    assert.equal(
        extractSpokenEmailAddress('the mail aztec bird at mac.com please'),
        'aztecbird@mac.com'
    );
    assert.equal(
        extractSpokenEmailAddress('the address is aztec bird at mac.com'),
        'aztecbird@mac.com'
    );
    assert.equal(
        extractSpokenEmailAddress('no the recipient is aztec bird at mac.com'),
        'aztecbird@mac.com'
    );
    assert.equal(
        extractSpokenEmailAddress('send it to is aztec bird at mac.com'),
        'aztecbird@mac.com'
    );
});

test('getGmailVoiceCommand maps direct send phrases', () => {
    assert.deepEqual(
        getGmailVoiceCommand('send email to joyandart@gmail.com subject hello message how are you'),
        {
            action: 'sendDirect',
            to: 'joyandart@gmail.com',
            subject: 'hello',
            text: 'how are you'
        }
    );
    assert.deepEqual(
        getGmailVoiceCommand('send email to my daughter subject hello message how are you'),
        {
            action: 'sendDirect',
            to: '',
            recipientQuery: 'my daughter',
            subject: 'hello',
            text: 'how are you'
        }
    );
    assert.deepEqual(
        getGmailVoiceCommand('send email to my daughter'),
        {
            action: 'compose',
            draft: {
                to: '',
                recipientQuery: 'my daughter',
                subject: '',
                text: ''
            }
        }
    );
    assert.deepEqual(
        getGmailVoiceCommand('draft email to my daughter with the message do not forget your training tomorrow'),
        {
            action: 'sendDirect',
            to: '',
            recipientQuery: 'my daughter',
            subject: '',
            text: 'do not forget your training tomorrow'
        }
    );
    assert.deepEqual(
        getGmailVoiceCommand('send email to joyandart@gmail.com'),
        {
            action: 'compose',
            draft: {
                to: 'joyandart@gmail.com',
                subject: '',
                text: ''
            }
        }
    );
});

test('extractGmailShareRecipientRequest pulls out context-share requests', () => {
    assert.deepEqual(
        extractGmailShareRecipientRequest('send it to aztecbird@mac.com'),
        {
            recipient: 'aztecbird@mac.com',
            recipientQuery: '',
            shareType: 'auto',
            subject: '',
            quickSend: true
        }
    );
    assert.deepEqual(
        extractGmailShareRecipientRequest('send this note'),
        {
            recipient: '',
            recipientQuery: '',
            shareType: 'note',
            subject: '',
            quickSend: true
        }
    );
    assert.deepEqual(
        extractGmailShareRecipientRequest('send this note to aztecbird@mac.com subject shopping'),
        {
            recipient: 'aztecbird@mac.com',
            recipientQuery: '',
            shareType: 'note',
            subject: 'shopping',
            quickSend: true
        }
    );
    assert.deepEqual(
        extractGmailShareRecipientRequest('send that message to aztec bird at mac.com'),
        {
            recipient: 'aztecbird@mac.com',
            recipientQuery: '',
            shareType: 'auto',
            subject: '',
            quickSend: true
        }
    );
    assert.deepEqual(
        extractGmailShareRecipientRequest('send it from my joy and night at gmail.com to aztec bird at mac.com'),
        {
            recipient: 'aztecbird@mac.com',
            recipientQuery: '',
            shareType: 'auto',
            subject: '',
            quickSend: true
        }
    );
    assert.deepEqual(
        extractGmailShareRecipientRequest('send it to the mail aztec bird at mac.com please'),
        {
            recipient: 'aztecbird@mac.com',
            recipientQuery: '',
            shareType: 'auto',
            subject: '',
            quickSend: true
        }
    );
    assert.deepEqual(
        extractGmailShareRecipientRequest('send this note to my daughter'),
        {
            recipient: '',
            recipientQuery: 'my daughter',
            shareType: 'note',
            subject: '',
            quickSend: true
        }
    );
    assert.deepEqual(
        extractGmailShareRecipientRequest('send this youtube link to my daughter'),
        {
            recipient: '',
            recipientQuery: 'my daughter',
            shareType: 'youtube',
            subject: '',
            quickSend: true
        }
    );
    assert.deepEqual(
        extractGmailShareRecipientRequest('send that link in email'),
        {
            recipient: '',
            recipientQuery: '',
            shareType: 'link',
            subject: '',
            quickSend: true
        }
    );
    assert.equal(extractGmailShareRecipientRequest('send this photo in telegram to joy'), null);
});

test('getGmailVoiceCommand maps context-share phrases', () => {
    assert.deepEqual(
        getGmailVoiceCommand('send it to aztecbird@mac.com'),
        {
            action: 'shareCurrent',
            recipient: 'aztecbird@mac.com',
            recipientQuery: '',
            shareType: 'auto',
            subject: '',
            quickSend: true
        }
    );
    assert.deepEqual(
        getGmailVoiceCommand('send that message to aztec bird at mac.com'),
        {
            action: 'shareCurrent',
            recipient: 'aztecbird@mac.com',
            recipientQuery: '',
            shareType: 'auto',
            subject: '',
            quickSend: true
        }
    );
    assert.deepEqual(
        getGmailVoiceCommand('send it from my joy and night at gmail.com to aztec bird at mac.com'),
        {
            action: 'shareCurrent',
            recipient: 'aztecbird@mac.com',
            recipientQuery: '',
            shareType: 'auto',
            subject: '',
            quickSend: true
        }
    );
    assert.deepEqual(
        getGmailVoiceCommand('send it to the mail aztec bird at mac.com please'),
        {
            action: 'shareCurrent',
            recipient: 'aztecbird@mac.com',
            recipientQuery: '',
            shareType: 'auto',
            subject: '',
            quickSend: true
        }
    );
    assert.deepEqual(
        getGmailVoiceCommand('send this note to my daughter'),
        {
            action: 'shareCurrent',
            recipient: '',
            recipientQuery: 'my daughter',
            shareType: 'note',
            subject: '',
            quickSend: true
        }
    );
    assert.deepEqual(
        getGmailVoiceCommand('send this note'),
        {
            action: 'shareCurrent',
            recipient: '',
            recipientQuery: '',
            shareType: 'note',
            subject: '',
            quickSend: true
        }
    );
    assert.deepEqual(
        getGmailVoiceCommand('email this youtube link to my daughter'),
        {
            action: 'shareCurrent',
            recipient: '',
            recipientQuery: 'my daughter',
            shareType: 'youtube',
            subject: '',
            quickSend: false
        }
    );
});

test('extractGmailSaveContactRequest pulls out save-contact phrases', () => {
    assert.deepEqual(
        extractGmailSaveContactRequest('save aztec bird at mac.com as my daughter'),
        {
            recipient: 'aztecbird@mac.com',
            recipientQuery: 'aztec bird at mac.com',
            alias: 'my daughter'
        }
    );
    assert.deepEqual(
        extractGmailSaveContactRequest('save this email as my daughter'),
        {
            recipient: '',
            recipientQuery: 'this email',
            alias: 'my daughter'
        }
    );
});

test('extractGmailListContactsRequest detects saved-contact list phrases', () => {
    assert.deepEqual(
        extractGmailListContactsRequest('who do you know in email'),
        { action: 'listContacts' }
    );
    assert.deepEqual(
        extractGmailListContactsRequest('show my email contacts'),
        { action: 'listContacts' }
    );
});

test('extractGmailNoteSubjectRequest pulls out note subject phrases', () => {
    assert.deepEqual(
        extractGmailNoteSubjectRequest('subject shopping list'),
        { subject: 'shopping list' }
    );
});

test('getGmailVoiceCommand maps note subject phrases to compose from latest note', () => {
    assert.deepEqual(
        getGmailVoiceCommand('subject shopping list'),
        {
            action: 'composeLatestNote',
            subject: 'shopping list'
        }
    );
});
