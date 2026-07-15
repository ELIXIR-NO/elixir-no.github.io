import fs from 'node:fs';
import {SLIDES_JSON} from './constants.mjs';
import {listArticles, resolveArticle, withCover} from './frontmatter.mjs';
import {rankCandidates, scoreArticle, topicsOf} from './rank.mjs';

export function readCurrent() {
    return JSON.parse(fs.readFileSync(SLIDES_JSON, 'utf8'));
}

function toCandidate(a) {
    return {
        id: a.ref, ref: a.ref, collection: a.collection, year: a.year, slug: a.slug,
        title: a.title, summary: a.summary,
        date: a.date ? a.date.toISOString() : null,
        coverAbsPath: a.coverAbsPath, coverExt: a.coverExt,
        topics: a.topics ?? topicsOf(a), score: a.score,
    };
}

export function collect(now = new Date()) {
    const current = readCurrent();
    const ranked = rankCandidates(withCover(listArticles()), now);
    const byRef = new Map(ranked.map(a => [a.ref, a]));
    for (const s of current) {
        if (s.sourceArticle && !byRef.has(s.sourceArticle)) {
            const a = resolveArticle(s.sourceArticle);
            if (a && a.coverAbsPath) byRef.set(a.ref, {...a, score: scoreArticle(a, now), topics: topicsOf(a)});
        }
    }
    return {current, candidates: [...byRef.values()].map(toCandidate)};
}

if (import.meta.url === `file://${process.argv[1]}`) {
    process.stdout.write(JSON.stringify(collect(), null, 2) + '\n');
}
