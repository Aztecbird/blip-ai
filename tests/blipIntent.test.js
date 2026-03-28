import test from 'node:test';
import assert from 'node:assert/strict';

import { parseBlipIntent } from '../src/services/blipIntent.js';

test('parseBlipIntent handles care cam help requests and clear responses', () => {
    const request = parseBlipIntent('call for help', {
        careCamActive: true,
        careCamHelpActive: false
    });
    assert.deepEqual(request.action, 'request_help');
    assert.equal(request.kind, 'carecam');

    const send = parseBlipIntent('send message to telegram', {
        careCamActive: true,
        careCamHelpActive: true
    });
    assert.deepEqual(send.action, 'send_help');
    assert.equal(send.kind, 'carecam');

    const startAndSend = parseBlipIntent('send help message', {
        careCamActive: false,
        careCamHelpActive: false
    });
    assert.deepEqual(startAndSend.action, 'start_and_send_help');
    assert.equal(startAndSend.kind, 'carecam');

    const startAndSendAlert = parseBlipIntent('send alert message', {
        careCamActive: false,
        careCamHelpActive: false
    });
    assert.deepEqual(startAndSendAlert.action, 'start_and_send_help');
    assert.equal(startAndSendAlert.kind, 'carecam');

    const startAndSendForHelp = parseBlipIntent('send message for help', {
        careCamActive: false,
        careCamHelpActive: false
    });
    assert.deepEqual(startAndSendForHelp.action, 'start_and_send_help');
    assert.equal(startAndSendForHelp.kind, 'carecam');

    const startAndSendAlt = parseBlipIntent('turn on care cam and send help', {
        careCamActive: false,
        careCamHelpActive: false
    });
    assert.deepEqual(startAndSendAlt.action, 'start_and_send_help');
    assert.equal(startAndSendAlt.kind, 'carecam');

    const blipHelp = parseBlipIntent('blip help', {
        careCamActive: false,
        careCamHelpActive: false
    });
    assert.deepEqual(blipHelp.action, 'start_and_send_help');
    assert.equal(blipHelp.kind, 'carecam');

    const helpBlip = parseBlipIntent('help blip', {
        careCamActive: false,
        careCamHelpActive: false
    });
    assert.deepEqual(helpBlip.action, 'start_and_send_help');
    assert.equal(helpBlip.kind, 'carecam');

    const sendForHelp = parseBlipIntent('send for help', {
        careCamActive: true,
        careCamHelpActive: false
    });
    assert.deepEqual(sendForHelp.action, 'request_help');
    assert.equal(sendForHelp.kind, 'carecam');

    const urgentNo = parseBlipIntent('no, not okay', {
        careCamActive: true,
        careCamHelpActive: true,
        careCamFollowUpPhase: 'check'
    });
    assert.deepEqual(urgentNo.action, 'urgent_help');
    assert.equal(urgentNo.kind, 'carecam');

    const urgentHelp = parseBlipIntent('help', {
        careCamActive: true,
        careCamHelpActive: true,
        careCamFollowUpPhase: 'check'
    });
    assert.deepEqual(urgentHelp.action, 'urgent_help');
    assert.equal(urgentHelp.kind, 'carecam');

    const bareHelp = parseBlipIntent('help', {
        careCamActive: true,
        careCamHelpActive: false
    });
    assert.deepEqual(bareHelp.action, 'start_and_send_help');
    assert.equal(bareHelp.kind, 'carecam');

    const clear = parseBlipIntent("i'm okay", {
        careCamActive: true,
        careCamHelpActive: true
    });
    assert.deepEqual(clear.action, 'clear_help');
    assert.equal(clear.kind, 'carecam');

    const start = parseBlipIntent('turn on care cam', {
        careCamActive: false,
        careCamHelpActive: false
    });
    assert.deepEqual(start.action, 'start_carecam');
    assert.equal(start.kind, 'carecam');

    const stop = parseBlipIntent('turn off care cam', {
        careCamActive: true,
        careCamHelpActive: false
    });
    assert.deepEqual(stop.action, 'stop_carecam');
    assert.equal(stop.kind, 'carecam');
});
