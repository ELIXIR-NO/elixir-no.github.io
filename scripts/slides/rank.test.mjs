import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scoreArticle, rankCandidates} from './rank.mjs';

const now = new Date(Date.UTC(2026, 6, 15));
const mk = (o) => ({collection: 'news', slug: o.slug, title: o.title ?? '', summary: '', tags: [], date: o.date, coverAbsPath: '/x.png', ...o});

test('recent flagship news outranks an old routine notice', () => {
    const flagship = mk({slug: 'gdi-go-live', title: 'GDI infrastructure go-live', date: new Date(Date.UTC(2026, 6, 1))});
    const routine = mk({slug: 'maint', title: 'Scheduled maintenance window', date: new Date(Date.UTC(2026, 6, 10))});
    assert.ok(scoreArticle(flagship, now) > scoreArticle(routine, now));
});

test('a past event decays below a fresh news item', () => {
    const pastEvent = mk({collection: 'events', slug: 'old-workshop', title: 'Workshop', date: new Date(Date.UTC(2026, 4, 1))});
    const freshNews = mk({slug: 'news', title: 'Infrastructure update', date: new Date(Date.UTC(2026, 6, 12))});
    assert.ok(scoreArticle(freshNews, now) > scoreArticle(pastEvent, now));
});

test('anti-repeat caps flagship topic at 2', () => {
    const arts = [1, 2, 3, 4].map(i => mk({collection: 'events', slug: `all-hands-${i}`, title: 'ELIXIR All Hands', date: new Date(Date.UTC(2026, 6, i))}));
    const ranked = rankCandidates(arts, now);
    assert.equal(ranked.filter(a => /all hands/.test(a.title.toLowerCase())).length, 2);
});
