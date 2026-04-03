import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildYouTubeSnapshotQuestion,
    isYouTubeSnapshotIntent,
    isYouTubeSnapshotCaptureIntent,
    parseYouTubeSnapshotZoomCommand
} from '../src/services/youtubeSnapshotIntent.js';

test('isYouTubeSnapshotIntent detects snapshot and frame analysis phrases', () => {
    assert.equal(isYouTubeSnapshotIntent('take a snapshot'), true);
    assert.equal(isYouTubeSnapshotIntent('what do you see'), true);
    assert.equal(isYouTubeSnapshotIntent('describe this frame'), true);
    assert.equal(isYouTubeSnapshotIntent('read the screen'), true);
    assert.equal(isYouTubeSnapshotIntent('inspect current frame'), true);
    assert.equal(isYouTubeSnapshotIntent("report of why you can't take a picture of the youtube that i put in pause"), true);
});

test('isYouTubeSnapshotCaptureIntent only matches capture-like phrasing', () => {
    assert.equal(isYouTubeSnapshotCaptureIntent('take a snapshot of the video'), true);
    assert.equal(isYouTubeSnapshotCaptureIntent('what do you see'), false);
});

test('isYouTubeSnapshotIntent does not conflict with YouTube control commands', () => {
    assert.equal(isYouTubeSnapshotIntent('play video'), false);
    assert.equal(isYouTubeSnapshotIntent('pause'), false);
    assert.equal(isYouTubeSnapshotIntent('next video'), false);
    assert.equal(isYouTubeSnapshotIntent('search youtube for jazz'), false);
});

test('buildYouTubeSnapshotQuestion provides voice-friendly defaults', () => {
    assert.equal(
        buildYouTubeSnapshotQuestion('take a snapshot'),
        'Describe what is visible in this frame.'
    );
    assert.equal(
        buildYouTubeSnapshotQuestion('read the screen'),
        'Read any visible text on this screen. If unreadable, say so.'
    );
});

test('parseYouTubeSnapshotZoomCommand detects zoom, pan, and analyze actions', () => {
    assert.deepEqual(parseYouTubeSnapshotZoomCommand('zoom in snapshot'), { action: 'zoomIn' });
    assert.deepEqual(parseYouTubeSnapshotZoomCommand('zoom in to the picture'), { action: 'zoomIn' });
    assert.deepEqual(parseYouTubeSnapshotZoomCommand('zoom out snapshot'), { action: 'zoomOut' });
    assert.deepEqual(parseYouTubeSnapshotZoomCommand('move snapshot left'), { action: 'panLeft' });
    assert.deepEqual(parseYouTubeSnapshotZoomCommand('move snapshot right'), { action: 'panRight' });
    assert.deepEqual(parseYouTubeSnapshotZoomCommand('reset snapshot zoom'), { action: 'zoomReset' });
    assert.deepEqual(parseYouTubeSnapshotZoomCommand('analyze this zoomed area'), { action: 'analyzeZoom' });
});
