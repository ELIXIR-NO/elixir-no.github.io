import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cleanEntry, referencedBasenames, staleBotFiles} from './apply-slides.mjs';

test('cleanEntry strips transient fields', () => {
    const e = cleanEntry({src: '/data/slides/2026-x.png', alt: 'A', caption: 'C', sourceArticle: 'news/2026/x', _candidate: {}, _new: true});
    assert.deepEqual(e, {src: '/data/slides/2026-x.png', alt: 'A', caption: 'C', sourceArticle: 'news/2026/x'});
});

test('staleBotFiles only targets bot-named unreferenced files', () => {
    const referenced = referencedBasenames([{src: '/data/slides/news-2026-keep.png'}, {src: '/data/slides/nels.png'}]);
    const existing = ['news-2026-keep.png', 'events-2025-drop.jpeg', 'nels.png', 'rdm-promotion.png'];
    assert.deepEqual(staleBotFiles(existing, referenced), ['events-2025-drop.jpeg']);
});

test('staleBotFiles spares a CMS upload that merely starts with a year', () => {
    // The CMS names uploads by slugifying the alt text, so "2025 All Hands"
    // becomes 2025-all-hands.png. That must never look bot-owned.
    assert.deepEqual(staleBotFiles(['2025-all-hands.png'], new Set()), []);
});
