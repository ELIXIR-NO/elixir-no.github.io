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

test('incumbent keeps its slot unless a challenger beats it by the hysteresis margin', () => {
    const evergreens = ['a', 'b', 'c', 'd', 'e'].map(s => ({src: `/data/slides/${s}.png`, alt: s.toUpperCase(), caption: 'c', evergreen: true}));
    const incumbent = {src: '/data/slides/2026-inc.png', alt: 'Inc', caption: 'c', sourceArticle: 'news/2026/inc'};
    // budget = 6 - 5 evergreens = 1 bot slot. incumbent eff = 0.5 * 1.15 = 0.575.
    const near = selectSlides({current: [...evergreens, incumbent], candidates: [cand('news/2026/inc', 'inc', 0.5), cand('news/2026/new', 'new', 0.55)]});
    assert.equal(near.slides.at(-1).sourceArticle, 'news/2026/inc'); // 0.55 < 0.575 -> incumbent stays
    const beats = selectSlides({current: [...evergreens, incumbent], candidates: [cand('news/2026/inc', 'inc', 0.5), cand('news/2026/new', 'new', 0.58)]});
    assert.equal(beats.slides.at(-1).sourceArticle, 'news/2026/new'); // 0.58 > 0.575 -> challenger wins
});

test('swap cap admits the top 2 fresh and backfills freed slots from displaced incumbents', () => {
    const incs = [1, 2, 3, 4, 5].map(i => ({src: `/data/slides/2026-i${i}.png`, alt: `I${i}`, caption: 'c', sourceArticle: `news/2026/i${i}`}));
    const incCands = [1, 2, 3, 4, 5].map(i => cand(`news/2026/i${i}`, `i${i}`, 0.5 - i * 0.01)); // i1 highest .49 .. i5 .45
    const fresh = ['a', 'b', 'c', 'd', 'e'].map((s, i) => cand(`news/2026/${s}`, s, 0.9 - i * 0.05)); // a .9 .. e .7 (all outrank incumbents)
    const {slides} = selectSlides({current: incs, candidates: [...incCands, ...fresh]});
    const news = slides.filter(s => s._candidate).map(s => s.sourceArticle).sort();
    assert.deepEqual(news, ['news/2026/a', 'news/2026/b']); // only top-2 fresh admitted
    const survivors = slides.filter(s => s.sourceArticle && !s._candidate).map(s => s.sourceArticle);
    assert.equal(survivors.length, 4); // 4 slots backfilled from incumbents
    assert.ok(!survivors.includes('news/2026/i5')); // lowest-scored incumbent dropped
});

test('the swap cap keeps the two highest-scored fresh, not any two', () => {
    const candidates = ['a', 'b', 'c', 'd'].map((s, i) => cand(`news/2026/${s}`, s, 1 - i * 0.1)); // a highest
    const {slides} = selectSlides({current: [], candidates});
    const news = slides.filter(s => s._candidate).map(s => s.sourceArticle).sort();
    assert.deepEqual(news, ['news/2026/a', 'news/2026/b']); // top two by score, not c/d
});

test('retains an untracked (CMS-added) current entry and tags it evergreen', () => {
    const current = [
        {src: '/data/slides/nels.png', alt: 'NeLS', caption: 'c', evergreen: true},
        {src: '/data/slides/human-added.png', alt: 'Human highlight', caption: 'Added via CMS'},
    ];
    const {slides} = selectSlides({current, candidates: []});
    const human = slides.find(s => s.src === '/data/slides/human-added.png');
    assert.ok(human, 'untracked entry must survive');
    assert.equal(human.evergreen, true, 'untracked entry must be tagged evergreen');
});
