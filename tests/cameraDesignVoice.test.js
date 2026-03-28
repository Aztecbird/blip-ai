import test from 'node:test';
import assert from 'node:assert/strict';

import { getCameraDesignTransferCommand } from '../src/services/cameraDesignVoice.js';

test('getCameraDesignTransferCommand understands capture-and-transfer phrasing', () => {
    assert.deepEqual(
        getCameraDesignTransferCommand('take a picture and transfer it to design'),
        { action: 'captureToDesign', title: 'Camera Photo' }
    );
    assert.deepEqual(
        getCameraDesignTransferCommand('capture my homework photo to design'),
        { action: 'captureToDesign', title: 'Homework Photo' }
    );
    assert.equal(getCameraDesignTransferCommand('open design'), null);
});

test('getCameraDesignTransferCommand understands homework read/clear phrasing', () => {
    assert.deepEqual(
        getCameraDesignTransferCommand('make this homework clearer'),
        { action: 'analyzeHomework', title: 'Homework Mind Map' }
    );
    assert.deepEqual(
        getCameraDesignTransferCommand('Read the mind map in design, please!'),
        { action: 'analyzeHomework', title: 'Homework Mind Map' }
    );
});
