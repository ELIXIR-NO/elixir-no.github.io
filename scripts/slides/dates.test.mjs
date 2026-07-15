import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseArticleDate} from './dates.mjs';

test('parses full and abbreviated English month dates', () => {
    assert.equal(parseArticleDate('September 17, 2025').toISOString(), '2025-09-17T00:00:00.000Z');
    assert.equal(parseArticleDate('Apr 16, 2026').toISOString(), '2026-04-16T00:00:00.000Z');
    assert.equal(parseArticleDate('Sept 1, 2024').toISOString(), '2024-09-01T00:00:00.000Z');
});

test('returns null for unparseable input', () => {
    assert.equal(parseArticleDate('2025-09-17'), null);
    assert.equal(parseArticleDate('someday'), null);
    assert.equal(parseArticleDate(''), null);
    assert.equal(parseArticleDate(undefined), null);
});
