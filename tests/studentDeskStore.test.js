import test from 'node:test';
import assert from 'node:assert/strict';

import {
    normalizeStudentDeskItem,
    normalizeStudentDeskItems
} from '../src/services/studentDeskStore.js';

test('normalizeStudentDeskItem preserves content and metadata', () => {
    const item = normalizeStudentDeskItem({
        id: 123,
        type: 'link',
        content: 'Homework notes',
        data: { url: 'https://example.com' },
        timestamp: '08:30'
    });

    assert.equal(item.id, '123');
    assert.equal(item.type, 'link');
    assert.equal(item.content, 'Homework notes');
    assert.equal(item.data.url, 'https://example.com');
    assert.equal(item.timestamp, '08:30');
});

test('normalizeStudentDeskItems filters empty items and caps the list', () => {
    const items = normalizeStudentDeskItems([
        { id: 'a', type: 'note', content: 'First note' },
        { id: 'b', type: 'note', content: 'Second note' },
        { id: 'c', type: 'image', content: '', data: { url: 'https://example.com/image.jpg' } },
        null
    ]);

    assert.equal(items.length, 3);
    assert.equal(items[0].content, 'First note');
    assert.equal(items[1].content, 'Second note');
    assert.equal(items[2].data.url, 'https://example.com/image.jpg');
});
