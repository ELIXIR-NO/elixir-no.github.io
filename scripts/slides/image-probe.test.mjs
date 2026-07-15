import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {probeImage} from './image-probe.mjs';
import {SLIDES_DIR} from './constants.mjs';

test('reads PNG dimensions and format', () => {
    const r = probeImage(path.join(SLIDES_DIR, 'nels.png'));
    assert.equal(r.format, 'png');
    assert.ok(r.width > 100 && r.height > 100);
    assert.ok(r.bytes > 0);
});

test('reads JPEG dimensions', () => {
    const r = probeImage(path.join(SLIDES_DIR, 'elixir-no-all-hands-2025.jpg'));
    assert.equal(r.format, 'jpeg');
    assert.ok(r.width > 100 && r.height > 100);
});

test('throws on a non-image', () => {
    assert.throws(() => probeImage(path.join(SLIDES_DIR, '..', 'slides.json')));
});
