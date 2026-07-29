import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {
    cleanEntry, collect, fallbackText, listArticles, parseArticleDate, probeImage,
    properNounsOk, rankCandidates, readCurrent, referencedBasenames, resolveArticle,
    scoreArticle, selectSlides, SLIDES_DIR, staleBotFiles, usableCandidate,
    usableCover, validateSlides, withCover, writeCaptions,
} from './slides.js';

// ========================================================================
// dates
// ========================================================================

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

// ========================================================================
// image-probe
// ========================================================================

test('reads PNG dimensions and format', () => {
    const r = probeImage(path.join(SLIDES_DIR, 'nels.png'));
    assert.equal(r.format, 'png');
    assert.ok(r.width > 100 && r.height > 100);
    assert.ok(r.bytes > 0);
});

test('reads JPEG dimensions', () => {
    const r = probeImage(path.join(SLIDES_DIR, 'elixir-no-all-hands-2025.jpg'));
    assert.equal(r.format, 'jpeg');
    assert.ok(r.width > 100 && r.height > 100);
});

test('throws on a non-image', () => {
    assert.throws(() => probeImage(path.join(SLIDES_DIR, '..', 'slides.json')));
});

// ========================================================================
// frontmatter
// ========================================================================

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

// ========================================================================
// rank
// ========================================================================

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

// ========================================================================
// validate-slides
// ========================================================================

const ok = {src: '/data/slides/nels.png', alt: 'NeLS landing page', caption: 'The Norwegian e-Infrastructure for Life Sciences.', evergreen: true};

test('flags empty slide set', () => {
    const v = validateSlides([], {slidesDir: SLIDES_DIR});
    assert.ok(v.some(m => /count/i.test(m)));
});

test('flags a bad src and a too-long caption', () => {
    const v = validateSlides([
        {src: '/data/slides/BAD NAME.png', alt: 'a', caption: 'c', evergreen: true},
        {...ok, caption: 'x'.repeat(400)},
    ], {slidesDir: SLIDES_DIR});
    assert.ok(v.some(m => /src/i.test(m)));
    assert.ok(v.some(m => /caption/i.test(m)));
});

test('accepts a valid evergreen slide backed by a real image', () => {
    const v = validateSlides([ok], {slidesDir: SLIDES_DIR});
    assert.deepEqual(v, []);
});

test('grandfathers a large legacy-named evergreen image (quality gates are bot-only)', () => {
    const bigLegacy = {
        src: '/data/slides/elixir-no-all-hands-2025.jpg',
        alt: 'Group photo for ELIXIR Norway All Hands 2025',
        caption: "This year's ELIXIR Norway All Hands was organised physically in Ås!",
        evergreen: true,
    };
    // 3.37MB and a legacy filename (no <year>- prefix) → exempt from size/width/aspect.
    assert.deepEqual(validateSlides([bigLegacy], {slidesDir: SLIDES_DIR}), []);
});

test('rejects two slides naming the same article', () => {
    const v = validateSlides([
        {...ok, evergreen: undefined, sourceArticle: 'news/2026/a'},
        {...ok, src: '/data/slides/rdm-promotion.png', evergreen: undefined, sourceArticle: 'news/2026/a'},
    ], {slidesDir: SLIDES_DIR});
    assert.ok(v.some(m => /duplicate sourceArticle/i.test(m)), v.join('; '));
});

test('rejects a sourceArticle that is not a ref string', () => {
    const v = validateSlides([{...ok, evergreen: undefined, sourceArticle: {ref: 'news/2026/a'}}],
        {slidesDir: SLIDES_DIR});
    assert.ok(v.some(m => /sourceArticle/i.test(m)), v.join('; '));
});

test('rejects a slide carrying both ownership tags', () => {
    const v = validateSlides([{...ok, sourceArticle: 'news/2026/x'}], {slidesDir: SLIDES_DIR});
    assert.ok(v.some(m => /both/i.test(m)), v.join('; '));
});

test('still enforces quality gates on a bot-named image (guard is not a blanket exemption)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slides-validate-'));
    try {
        // The 3.37MB image copied under a bot-style name (BOT_FILE_RE matches),
        // so the size gate must fire even though the same bytes are exempt under
        // the legacy filename.
        fs.copyFileSync(path.join(SLIDES_DIR, 'elixir-no-all-hands-2025.jpg'), path.join(dir, 'news-2025-all-hands.jpg'));
        const slide = {
            src: '/data/slides/news-2025-all-hands.jpg',
            alt: 'A group photo',
            caption: 'A caption about the meeting.',
            sourceArticle: 'news/2025/all-hands',
        };
        const violations = validateSlides([slide], {slidesDir: dir});
        assert.ok(violations.some(m => /file too large/.test(m)), violations.join('; '));
    } finally {
        fs.rmSync(dir, {recursive: true, force: true});
    }
});

// ========================================================================
// collect-candidates
// ========================================================================

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

test('usableCover rejects a raw portrait/oversized cover and accepts a good one', {
    skip: ['news/2026/elixir-norway-all-hands', 'news/2025/eosc-entrust-workshop']
        .some(ref => !resolveArticle(ref)) && 'fixture articles no longer present',
}, () => {
    const badArt = resolveArticle('news/2026/elixir-norway-all-hands'); // 3888x5184, 24.9MB
    const goodArt = resolveArticle('news/2025/eosc-entrust-workshop');  // landscape, small
    assert.equal(usableCover(badArt), false);
    assert.equal(usableCover(goodArt), true);
});

test('collect excludes candidates whose cover fails the quality gates', () => {
    const {candidates} = collect(new Date(Date.UTC(2026, 6, 15)));
    assert.ok(!candidates.some(c => c.ref === 'news/2026/elixir-norway-all-hands'));
});

test('an incumbent that has aged out of the ranked pool is still scored', () => {
    // Hysteresis compares an incumbent against its challengers, so an incumbent
    // missing from the pool would score 0 and be dropped the moment it left the
    // top slots. Driven from a synthetic current: the committed slides.json has
    // no bot-managed entry to exercise this with.
    const aged = 'news/2018/fair-data-management-in-molecular-life-sciences';
    const current = [{src: '/data/slides/x.png', alt: 'X', caption: 'c', sourceArticle: aged}];
    const {candidates} = collect(new Date(Date.UTC(2026, 6, 15)), {current});
    const rescued = candidates.find(c => c.ref === aged);
    assert.ok(rescued, 'an on-screen article must be scored even when it ranks below the pool');
    assert.equal(typeof rescued.score, 'number');
});

test('usableCandidate accepts a well-formed article', () => {
    assert.equal(usableCandidate(goodCandidate), true);
});

test('usableCandidate rejects an article whose summary repeats its title', () => {
    // The fallback caption is the summary and the fallback alt is the title, so
    // an article like this would produce alt === caption and fail the gate.
    assert.equal(usableCandidate({...goodCandidate, summary: goodCandidate.title}), false);
});

test('usableCandidate rejects an article with no summary even when its title is long', () => {
    // A title over MAX_ALT clamps, so alt and caption differ by the ellipsis and
    // the alt-equals-caption rule alone would let this through.
    assert.equal(usableCandidate({...goodCandidate, title: 'T'.repeat(200), summary: ''}), false);
});

test('usableCandidate rejects a non-string summary instead of throwing', () => {
    // YAML turns an unquoted `summary: 2024` into a number. The bot runs before
    // the build that would reject it, so it must not crash the pipeline.
    for (const summary of [2024, true, ['a'], {a: 1}])
        assert.equal(usableCandidate({...goodCandidate, summary}), false);
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

// ========================================================================
// select
// ========================================================================

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

test('refuses to act on a dual-key entry instead of silently resolving it', () => {
    // Stripping the redundant key would only defer the problem: the ref stops
    // being claimed, and the next run picks the article up again as fresh.
    const current = [
        {src: '/data/slides/eosc.png', alt: 'EOSC', caption: 'c', evergreen: true, sourceArticle: 'news/2026/a'},
    ];
    const {slides, changed, blocked} = selectSlides({current, candidates: [cand('news/2026/a', 'a', 0.9)]});
    assert.ok(blocked, 'ambiguous ownership must be reported, not guessed at');
    assert.equal(changed, false);
    assert.deepEqual(slides, current);
});

test('refuses to act on a sourceArticle that is not a ref string', () => {
    const current = [{src: '/data/slides/x.png', alt: 'X', caption: 'c', sourceArticle: {ref: 'news/2026/a'}}];
    const {blocked, changed} = selectSlides({current, candidates: [cand('news/2026/a', 'a', 0.9)]});
    assert.ok(blocked, 'a non-string ref must be named, not crash the comparator');
    assert.equal(changed, false);
});

test('refuses to act when two incumbents name the same article', () => {
    // Which of the two to keep is the same unanswerable question as a dual-key
    // entry. Picking one silently deletes the other slide and its image.
    const dupes = [
        {src: '/data/slides/news-2026-a.png', alt: 'A', caption: 'c', sourceArticle: 'news/2026/a'},
        {src: '/data/slides/news-2026-a-copy.png', alt: 'A copy', caption: 'c', sourceArticle: 'news/2026/a'},
    ];
    const {slides, changed, blocked} = selectSlides({current: dupes, candidates: [cand('news/2026/a', 'a', 0.9)]});
    assert.ok(blocked);
    assert.equal(changed, false);
    assert.deepEqual(slides, dupes);
});

test('two candidates that would generate one filename cannot both be selected', () => {
    // Same collection, slug and date-year, different refs: reachable because the
    // year comes from the frontmatter date rather than the directory.
    const candidates = [
        cand('news/2025/foo', 'foo', 0.9, {year: 2025}),
        cand('news/2024/foo', 'foo', 0.8, {year: 2025}),
    ];
    const {slides} = selectSlides({current: [], candidates});
    assert.equal(new Set(slides.map(s => s.src)).size, slides.length);
    assert.equal(slides.length, 1);
});

test('reports bot slides dropped for want of a slot rather than claiming a no-op', () => {
    const pins = [1, 2, 3, 4, 5, 6].map(i => ({src: `/data/slides/p${i}.png`, alt: `P${i}`, caption: 'c', evergreen: true}));
    const inc = {src: '/data/slides/news-2026-a.png', alt: 'A', caption: 'c', sourceArticle: 'news/2026/a'};
    const {budget, dropped} = selectSlides({current: [...pins, inc], candidates: [cand('news/2026/a', 'a', 0.9)]});
    assert.equal(budget, 0);
    assert.equal(dropped, 1, 'the purge must be visible to the caller');
});

test('filenames stay unique when two collections share a slug and year', () => {
    const candidates = [
        cand('news/2025/x', 'x', 0.9, {collection: 'news', year: 2025}),
        cand('events/2025/x', 'x', 0.8, {collection: 'events', year: 2025}),
    ];
    const {slides} = selectSlides({current: [], candidates});
    assert.equal(new Set(slides.map(s => s.src)).size, 2);
});

test('skips a candidate whose generated filename is already claimed by a pin', () => {
    const current = [{src: '/data/slides/news-2025-x.png', alt: 'Human pin', caption: 'c', evergreen: true}];
    const {slides} = selectSlides({current, candidates: [cand('news/2025/x', 'x', 0.9, {year: 2025})]});
    assert.equal(slides.length, 1, 'the pin must not be shadowed by a same-named bot slide');
    assert.equal(slides[0].alt, 'Human pin');
});

test('refuses to act when pins alone exceed MAX_SLIDES rather than emitting an invalid set', () => {
    const current = [
        ...Array.from({length: 7}, (_, i) => ({src: `/data/slides/p${i}.png`, alt: `P${i}`, caption: 'c', evergreen: true})),
        {src: '/data/slides/news-2026-a.png', alt: 'A', caption: 'c', sourceArticle: 'news/2026/a'},
    ];
    const {slides, changed, blocked} = selectSlides({current, candidates: [cand('news/2026/a', 'a', 0.9)]});
    assert.ok(blocked, 'over-pinned state must be reported, not written');
    assert.equal(changed, false, 'must not drop the bot slide or write an over-length set');
    assert.equal(slides.length, current.length);
});

test('stamping an untracked entry counts as a change so the tag is written back', () => {
    const current = [
        {src: '/data/slides/nels.png', alt: 'NeLS', caption: 'c', evergreen: true},
        {src: '/data/slides/human-added.png', alt: 'Human highlight', caption: 'Added via CMS'},
    ];
    // src/alt/caption are all identical to current; only the new evergreen tag
    // differs. Reporting no-op here would strand the entry untracked forever.
    const {changed} = selectSlides({current, candidates: []});
    assert.equal(changed, true);
});

// ========================================================================
// caption-agent
// ========================================================================

const newSlide = (id, title, summary) => ({
    src: `/data/slides/2026-${id}.png`, alt: null, caption: null,
    sourceArticle: `news/2026/${id}`,
    _candidate: {id: `news/2026/${id}`, title, summary},
});

test('falls back to summary/title when the agent returns nothing', async () => {
    const s = [newSlide('x', 'GDI go-live', 'ELIXIR Norway deploys GDI infrastructure.')];
    const out = await writeCaptions(s, {runAgent: async () => ''});
    assert.equal(out[0].alt, 'GDI go-live');
    assert.equal(out[0].caption, 'ELIXIR Norway deploys GDI infrastructure.');
});

test('uses valid agent text', async () => {
    const s = [newSlide('x', 'GDI go-live', 'ELIXIR Norway deploys GDI infrastructure.')];
    const agent = async () => JSON.stringify([{id: 'news/2026/x', alt: 'A network diagram', caption: 'ELIXIR Norway deploys GDI infrastructure across Europe.'}]);
    const out = await writeCaptions(s, {runAgent: agent});
    assert.equal(out[0].alt, 'A network diagram');
});

test('rejects hallucinated proper nouns', () => {
    assert.equal(properNounsOk('Written by Jane Doe', {title: 'GDI', summary: 'about gdi'}), false);
    assert.equal(properNounsOk('About the GDI project', {title: 'GDI project', summary: 'the GDI project'}), true);
});

// ========================================================================
// apply-slides
// ========================================================================

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
