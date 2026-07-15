import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collect, readCurrent} from './collect-candidates.mjs';

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
