import {
    FLAGSHIP_TOPICS, DEMOTE_TOPICS, CANDIDATE_POOL,
    NEWS_HALFLIFE_DAYS, EVENT_DECAY_DAYS,
} from './constants.mjs';

const DAY = 86_400_000;

function haystack(a) {
    return `${a.title} ${a.summary} ${(a.tags || []).join(' ')}`.toLowerCase();
}

export function topicsOf(a) {
    const h = haystack(a);
    return FLAGSHIP_TOPICS.filter(t => t.re.test(h)).map(t => t.re.source);
}

function editorial(a) {
    const h = haystack(a);
    let w = 0;
    for (const t of FLAGSHIP_TOPICS) if (t.re.test(h)) w = Math.max(w, t.weight);
    for (const t of DEMOTE_TOPICS) if (t.re.test(h)) w += t.weight;
    return w;
}

function recency(a, now) {
    if (!a.date) return 0.2; // dateless (e.g. some funding) rely on editorial weight
    const ageDays = (now - a.date) / DAY;
    if (a.collection === 'events') {
        if (ageDays < 0) {
            // upcoming: rises as the date approaches, capped
            return Math.min(1, 1 - Math.min(1, -ageDays / 90));
        }
        return Math.exp(-ageDays / EVENT_DECAY_DAYS); // dies fast after the date
    }
    if (ageDays < 0) return 1; // future-dated news treated as brand new
    return Math.pow(0.5, ageDays / NEWS_HALFLIFE_DAYS);
}

// Combined score: recency/lifecycle weighted, plus editorial topic weight.
export function scoreArticle(a, now) {
    return recency(a, now) + 0.6 * editorial(a);
}

export function rankCandidates(articles, now) {
    const scored = articles
        .filter(a => a.coverAbsPath)
        .map(a => ({...a, score: scoreArticle(a, now), topics: topicsOf(a)}))
        .sort((x, y) =>
            y.score - x.score ||
            (y.date?.getTime() || 0) - (x.date?.getTime() || 0) ||
            x.slug.localeCompare(y.slug));

    const topicCount = new Map();
    const kept = [];
    for (const a of scored) {
        const primary = a.topics[0];
        if (primary) {
            const n = topicCount.get(primary) || 0;
            if (n >= 2) continue; // anti-repeat floor
            topicCount.set(primary, n + 1);
        }
        kept.push(a);
        if (kept.length >= CANDIDATE_POOL) break;
    }
    return kept;
}
