import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {collect, readCurrent, usableCover, usableCandidate} from './collect-candidates.mjs';
import {resolveArticle} from './frontmatter.mjs';
import {SLIDES_DIR} from './constants.mjs';

const goodCandidate = {
    title: 'A perfectly ordinary headline',
    summary: 'A summary that says something else entirely.',
    coverAbsPath: path.join(SLIDES_DIR, 'nels.png'),
    coverExt: 'png',
};

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

test('usableCandidate accepts a well-formed article', () => {
    assert.equal(usableCandidate(goodCandidate), true);
});

test('usableCandidate rejects an article whose summary repeats its title', () => {
    // The fallback caption is the summary and the fallback alt is the title, so
    // an article like this would produce alt === caption and fail the gate.
    assert.equal(usableCandidate({...goodCandidate, summary: goodCandidate.title}), false);
});

test('usableCandidate rejects a cover whose extension disagrees with its bytes', () => {
    assert.equal(usableCandidate({...goodCandidate, coverExt: 'jpg'}), false);
});

test('no article in the repo would produce a caption identical to its alt', () => {
    const {candidates} = collect(new Date(Date.UTC(2026, 6, 15)));
    assert.ok(candidates.every(c => c.title.trim() !== c.summary.trim()));
});

test('every candidate has a non-empty summary (fallback caption needs it)', () => {
    const {candidates} = collect(new Date(Date.UTC(2026, 6, 15)));
    assert.ok(candidates.length > 0);
    assert.ok(candidates.every(c => c.summary && c.summary.trim()), 'no candidate may have an empty summary');
});
