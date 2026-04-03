import test from 'node:test';
import assert from 'node:assert/strict';

import {
    analyzeYouTubeSnapshot,
    captureCurrentYouTubeFrame,
    createSnapshotViewState,
    updateSnapshotViewState
} from '../src/services/youtubeSnapshotVision.js';

test('captureCurrentYouTubeFrame returns no_video when host missing', () => {
    const result = captureCurrentYouTubeFrame({
        documentRef: { getElementById: () => null }
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'no_video');
});

test('captureCurrentYouTubeFrame returns cross_origin_blocked for iframe host', () => {
    const fakeHost = { querySelector: (sel) => (sel === 'iframe' ? {} : null) };
    const result = captureCurrentYouTubeFrame({
        documentRef: { getElementById: () => fakeHost }
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'cross_origin_blocked');
});

test('analyzeYouTubeSnapshot calls vision flow and returns short text', async () => {
    const answer = await analyzeYouTubeSnapshot({
        image: { data: 'ZmFrZQ==', mimeType: 'image/jpeg' },
        question: 'What books are on the shelf?',
        apiKey: 'key',
        model: 'gemini-2.5-flash',
        askFn: async () => ({ text: 'I can see books, but titles are too small to read.' })
    });
    assert.equal(answer, 'I can see books, but titles are too small to read.');
});

test('analyzeYouTubeSnapshot fails gracefully when image is missing', async () => {
    await assert.rejects(
        () => analyzeYouTubeSnapshot({
            image: null,
            question: 'What do you see?',
            apiKey: 'key',
            model: 'gemini-2.5-flash',
            askFn: async () => ({ text: 'unused' })
        }),
        /No frame image available/
    );
});

test('updateSnapshotViewState adjusts zoom and pan safely', () => {
    const base = createSnapshotViewState();
    const zoomed = updateSnapshotViewState(base, 'zoomIn');
    assert.equal(zoomed.zoom > 1, true);
    const moved = updateSnapshotViewState(zoomed, 'panLeft');
    assert.equal(moved.panX < zoomed.panX, true);
    const reset = updateSnapshotViewState(moved, 'zoomReset');
    assert.equal(reset.zoom, 1);
    assert.equal(reset.panX, 0);
    assert.equal(reset.panY, 0);
});
