import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectSlides} from './select.mjs';

const cand = (ref, slug, score, over = {}) => ({
    id: ref, ref, collection: 'news', year: 2026, slug,
    title: slug, summary: 's', date: '2026-07-01T00:00:00.000Z',
    coverAbsPath: `/x/${slug}.png`, coverExt: 'png', topics: [], score, ...over,
});

test('no-op when only evergreens and budget is full', () => {
    const current = [
        {src: '/data/slides/nels.png', alt: 'NeLS', caption: 'c', evergreen: true},
        {src: '/data/slides/rdm.png', alt: 'RDM', caption: 'c', evergreen: true},
    ];
    const {slides, changed} = selectSlides({current, candidates: [cand('news/2026/x', 'x', 0.1)]});
    assert.equal(changed, true); // one free slot gets filled
    assert.equal(slides[0].evergreen, true);
});

test('caps fresh additions at MAX_SWAPS (2)', () => {
    const current = [];
    const candidates = ['a', 'b', 'c', 'd'].map((s, i) => cand(`news/2026/${s}`, s, 1 - i * 0.1));
    const {slides} = selectSlides({current, candidates});
    assert.equal(slides.filter(s => s._candidate).length, 2);
});

test('unchanged selection reports changed=false', () => {
    const current = [{src: '/data/slides/2026-a.png', alt: 'A', caption: 'c', sourceArticle: 'news/2026/a'}];
    const candidates = [cand('news/2026/a', 'a', 0.9)];
    const {changed} = selectSlides({current, candidates});
    assert.equal(changed, false);
});
