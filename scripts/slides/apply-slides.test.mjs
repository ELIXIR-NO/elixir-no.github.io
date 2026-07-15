import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cleanEntry, referencedBasenames, staleBotFiles} from './apply-slides.mjs';

test('cleanEntry strips transient fields', () => {
    const e = cleanEntry({src: '/data/slides/2026-x.png', alt: 'A', caption: 'C', sourceArticle: 'news/2026/x', _candidate: {}, _new: true});
    assert.deepEqual(e, {src: '/data/slides/2026-x.png', alt: 'A', caption: 'C', sourceArticle: 'news/2026/x'});
});

test('staleBotFiles only targets bot-named unreferenced files', () => {
    const referenced = referencedBasenames([{src: '/data/slides/2026-keep.png'}, {src: '/data/slides/nels.png'}]);
    const existing = ['2026-keep.png', '2025-drop.jpeg', 'nels.png', 'rdm-promotion.png'];
    assert.deepEqual(staleBotFiles(existing, referenced), ['2025-drop.jpeg']);
});
