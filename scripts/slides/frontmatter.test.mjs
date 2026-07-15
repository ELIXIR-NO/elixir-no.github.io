import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listArticles, resolveArticle, withCover} from './frontmatter.mjs';

test('lists real news articles with parsed fields', () => {
    const all = listArticles();
    const eosc = resolveArticle('news/2025/eosc-entrust-workshop');
    assert.ok(eosc, 'eosc-entrust-workshop resolves');
    assert.equal(eosc.title, 'EOSC-ENTRUST workshop hosted by ELIXIR Norway');
    assert.equal(eosc.date.getUTCFullYear(), 2025);
    assert.ok(eosc.coverAbsPath.endsWith('.jpeg'));
    assert.equal(eosc.coverExt, 'jpeg');
    assert.ok(all.length > 20);
});

test('withCover drops articles without a cover image', () => {
    const covered = withCover(listArticles());
    assert.ok(covered.every(a => a.coverAbsPath));
});
