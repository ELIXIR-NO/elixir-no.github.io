import fs from 'node:fs';
import {SLIDES_JSON, MIN_IMG_WIDTH, MIN_ASPECT, MAX_IMG_BYTES} from './constants.mjs';
import {listArticles, resolveArticle, withCover} from './frontmatter.mjs';
import {rankCandidates, scoreArticle, topicsOf} from './rank.mjs';
import {probeImage} from './image-probe.mjs';

export function readCurrent() {
    return JSON.parse(fs.readFileSync(SLIDES_JSON, 'utf8'));
}

// A fresh candidate's cover becomes a bot-created slide image, so it must pass
// the same quality gates the validator enforces on bot images. Filtering here
// keeps selection from ever picking an unusable cover (e.g. a raw portrait phone
// photo), which would otherwise abort every run. Incumbents are unaffected:
// their image was already copied and validated when the slide was created.
export function usableCover(a) {
    if (!a.coverAbsPath) return false;
    try {
        const img = probeImage(a.coverAbsPath);
        return img.width >= MIN_IMG_WIDTH
            && img.width / img.height >= MIN_ASPECT
            && img.bytes <= MAX_IMG_BYTES;
    } catch {
        return false;
    }
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
    const ranked = rankCandidates(withCover(listArticles()).filter(usableCover), now);
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
