import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collect, readCurrent, usableCover} from './collect-candidates.mjs';
import {resolveArticle} from './frontmatter.mjs';

test('collect returns current slides and a ranked candidate pool', () => {
    const {current, candidates} = collect(new Date(Date.UTC(2026, 6, 15)));
    assert.ok(Array.isArray(current) && current.length >= 1);
    assert.ok(candidates.length >= 1 && candidates.length <= 12);
    for (const c of candidates) {
        assert.equal(c.id, c.ref);
        assert.ok(c.coverAbsPath, 'candidate has a cover');
        assert.equal(typeof c.score, 'number');
    }
});

test('readCurrent parses slides.json', () => {
    assert.ok(Array.isArray(readCurrent()));
});

test('usableCover rejects a raw portrait/oversized cover and accepts a good one', () => {
    const badArt = resolveArticle('news/2026/elixir-norway-all-hands'); // 3888x5184, 24.9MB
    const goodArt = resolveArticle('news/2025/eosc-entrust-workshop');  // landscape, small
    assert.equal(usableCover(badArt), false);
    assert.equal(usableCover(goodArt), true);
});

test('collect excludes candidates whose cover fails the quality gates', () => {
    const {candidates} = collect(new Date(Date.UTC(2026, 6, 15)));
    assert.ok(!candidates.some(c => c.ref === 'news/2026/elixir-norway-all-hands'));
});

test('a bootstrapped sourceArticle ref is always present in candidates', () => {
    const {candidates} = collect(new Date(Date.UTC(2026, 6, 15)));
    assert.ok(candidates.some(c => c.ref === 'news/2025/eosc-entrust-workshop'),
        'eosc-entrust (a tagged sourceArticle) must be scored and included');
});
