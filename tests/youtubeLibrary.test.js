import test from 'node:test';
import assert from 'node:assert/strict';

import {
    extractYouTubeLibraryDeleteTargetFromVoice,
    extractYouTubeLibraryPlayTargetFromVoice,
    extractYouTubeLibraryTransferRequestFromVoice,
    normalizeYouTubeTitleForMatch,
    SUGGESTED_VIDEO_CATEGORIES,
    classifyYouTubeContentType,
    resolveAutoPlaylistForYouTube,
    resolveYouTubeLibraryViewFromVoice,
    resolveVideoPlaylistFromVoice
} from '../src/services/youtubeLibrary.js';

test('resolveVideoPlaylistFromVoice maps explicit save-to-videos phrasing to Videos', () => {
    assert.equal(resolveVideoPlaylistFromVoice('save this video to videos'), 'Videos');
    assert.equal(resolveVideoPlaylistFromVoice('add it in my videos'), 'Videos');
});

test('resolveVideoPlaylistFromVoice keeps save-to-music support', () => {
    assert.equal(resolveVideoPlaylistFromVoice('save this song to music'), 'Music');
});

test('resolveYouTubeLibraryViewFromVoice understands menu phrasing for videos and music', () => {
    assert.equal(resolveYouTubeLibraryViewFromVoice('open menu of videos'), 'Videos');
    assert.equal(resolveYouTubeLibraryViewFromVoice('show videos menu'), 'Videos');
    assert.equal(resolveYouTubeLibraryViewFromVoice('open library of music'), 'Music');
    assert.equal(resolveYouTubeLibraryViewFromVoice('open youtube video menu'), 'Videos');
    assert.equal(resolveYouTubeLibraryViewFromVoice('open youtube music menu'), 'Music');
    assert.equal(resolveYouTubeLibraryViewFromVoice('open the videos that you save from youtube'), 'Videos');
    assert.equal(resolveYouTubeLibraryViewFromVoice('show my saved youtube music'), 'Music');
    assert.equal(resolveYouTubeLibraryViewFromVoice('switch to youtube music'), 'Music');
    assert.equal(resolveYouTubeLibraryViewFromVoice('change to youtube videos'), 'Videos');
    assert.equal(resolveYouTubeLibraryViewFromVoice('switch to music'), 'Music');
    assert.equal(resolveYouTubeLibraryViewFromVoice('go to videos'), 'Videos');
    assert.equal(resolveYouTubeLibraryViewFromVoice('change music to videos'), 'Videos');
    assert.equal(resolveYouTubeLibraryViewFromVoice('switch videos to music'), 'Music');
});

test('resolveYouTubeLibraryViewFromVoice does not map bare "video" to the saved Videos library', () => {
    assert.equal(resolveYouTubeLibraryViewFromVoice('open video'), null);
    assert.equal(resolveYouTubeLibraryViewFromVoice('open photos'), null);
    assert.equal(resolveYouTubeLibraryViewFromVoice('open videos'), 'Videos');
    assert.equal(resolveYouTubeLibraryViewFromVoice('open youtube video'), 'Videos');
});

test('extractYouTubeLibraryDeleteTargetFromVoice pulls out saved item titles', () => {
    assert.equal(extractYouTubeLibraryDeleteTargetFromVoice('delete blinding lights'), 'blinding lights');
    assert.equal(extractYouTubeLibraryDeleteTargetFromVoice('please remove the song called espresso'), 'espresso');
    assert.equal(extractYouTubeLibraryDeleteTargetFromVoice('delete the saved youtube video named how to tie a tie'), 'how to tie a tie');
    assert.equal(extractYouTubeLibraryDeleteTargetFromVoice('delete the music called boston'), 'boston');
    assert.equal(extractYouTubeLibraryDeleteTargetFromVoice('delete item 1'), null);
    assert.equal(extractYouTubeLibraryDeleteTargetFromVoice('delete it'), null);
});

test('extractYouTubeLibraryPlayTargetFromVoice pulls out saved play targets', () => {
    assert.deepEqual(extractYouTubeLibraryPlayTargetFromVoice('play a video called jazz please'), {
        mode: 'title',
        title: 'jazz',
        view: 'Videos'
    });
    assert.deepEqual(extractYouTubeLibraryPlayTargetFromVoice('show the song named espresso'), {
        mode: 'title',
        title: 'espresso',
        view: 'Music'
    });
    assert.deepEqual(extractYouTubeLibraryPlayTargetFromVoice('play this'), {
        mode: 'current',
        title: '',
        view: null
    });
});

test('extractYouTubeLibraryTransferRequestFromVoice pulls out move requests', () => {
    assert.deepEqual(extractYouTubeLibraryTransferRequestFromVoice('the video called vangelis should be in music'), {
        mode: 'title',
        title: 'vangelis',
        sourceView: 'Videos',
        targetView: 'Music'
    });
    assert.deepEqual(extractYouTubeLibraryTransferRequestFromVoice('move song 2 to videos'), {
        mode: 'number',
        index: 2,
        sourceView: 'Music',
        targetView: 'Videos'
    });
});

test('normalizeYouTubeTitleForMatch strips noisy video words', () => {
    assert.equal(
        normalizeYouTubeTitleForMatch('Taylor Swift - Love Story (Official Music Video)'),
        'taylor swift love story'
    );
});

test('classifyYouTubeContentType treats music metadata as music', () => {
    const result = classifyYouTubeContentType('taylor swift', {
        title: 'Taylor Swift - Love Story',
        channelTitle: 'TaylorSwiftVEVO'
    });

    assert.equal(result, 'music');
    assert.equal(resolveAutoPlaylistForYouTube('taylor swift', {
        title: 'Taylor Swift - Love Story',
        channelTitle: 'TaylorSwiftVEVO'
    }), 'Music');
});

test('resolveAutoPlaylistForYouTube defaults non-music results to Videos', () => {
    assert.equal(resolveAutoPlaylistForYouTube('how to tie a tie'), 'Videos');
});

test('suggested video categories includes Videos', () => {
    assert.ok(SUGGESTED_VIDEO_CATEGORIES.includes('Videos'));
});
