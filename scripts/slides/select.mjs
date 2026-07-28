import {MAX_SLIDES, HYSTERESIS_MARGIN, MAX_SWAPS} from './constants.mjs';

const botFilename = c => `${c.collection}-${c.year ?? '0000'}-${c.slug}.${c.coverExt}`;
const botSrc = c => `/data/slides/${botFilename(c)}`;
// Ownership keys are part of the comparison: a run whose only effect is
// stamping an untracked entry `evergreen` must still be reported as changed,
// or the tag is never persisted and the entry stays untracked forever.
const pick = s => ({
    src: s.src, alt: s.alt ?? null, caption: s.caption ?? null,
    evergreen: s.evergreen === true, sourceArticle: s.sourceArticle ?? null,
});
const sameSeq = (a, b) =>
    JSON.stringify(a.map(pick)) === JSON.stringify(b.map(pick));

export function selectSlides({current, candidates}) {
    const byRef = new Map(candidates.map(c => [c.ref, c]));
    const scoreOf = ref => byRef.get(ref)?.score ?? 0;

    // Evergreen pins AND untracked entries (e.g. a slide freshly added via the
    // CMS, which has no ownership key yet) are retained in place. Untracked ones
    // are stamped `evergreen: true` so they are protected and self-heal their
    // tag — never dropped. This is the spec's fail-closed rule.
    const halt = reason => ({slides: current, changed: false, budget: 0, dropped: 0, blocked: reason});

    // Which key wins is a guess either way, and guessing defers the problem:
    // dropping sourceArticle unclaims the ref, so the next run picks the same
    // article up again and shows it twice.
    const ambiguous = current.find(s => s.evergreen === true && s.sourceArticle);
    if (ambiguous) return halt(`${ambiguous.src} carries both evergreen and sourceArticle; remove one`);

    const evergreens = current
        .filter(s => s.evergreen === true || !s.sourceArticle)
        .map(s => (s.evergreen === true ? s : {...s, evergreen: true}));
    if (evergreens.length > MAX_SLIDES)
        return halt(`${evergreens.length} pinned slides exceed the ${MAX_SLIDES} slot limit; unpin one`);
    const budget = MAX_SLIDES - evergreens.length;

    // One slide per article and one slide per file. A ref or a filename already
    // spoken for disqualifies whatever comes next, whether that is a second
    // incumbent naming the same article or a candidate whose generated filename
    // collides with a pin or with an earlier candidate this same run.
    const claimedRefs = new Set();
    const claimedSrcs = new Set(current.map(s => s.src));

    const botIncumbents = [];
    for (const s of current) {
        if (!s.sourceArticle || claimedRefs.has(s.sourceArticle)) continue;
        claimedRefs.add(s.sourceArticle);
        botIncumbents.push(s);
    }

    const fresh = [];
    for (const c of candidates) {
        if (claimedRefs.has(c.ref) || claimedSrcs.has(botSrc(c))) continue;
        claimedSrcs.add(botSrc(c));
        fresh.push(c);
    }

    const eff = (ref, isInc) => scoreOf(ref) * (isInc ? 1 + HYSTERESIS_MARGIN : 1);
    const pool = [
        ...botIncumbents.map(s => ({ref: s.sourceArticle, isInc: true, entry: s})),
        ...fresh.map(c => ({ref: c.ref, isInc: false, cand: c})),
    ].sort((x, y) =>
        eff(y.ref, y.isInc) - eff(x.ref, x.isInc) ||
        (y.isInc === x.isInc ? 0 : y.isInc ? 1 : -1) ||
        x.ref.localeCompare(y.ref));

    let chosen = pool.slice(0, budget);

    // Swap cap: at most MAX_SWAPS fresh refs enter per run; backfill from
    // remaining incumbents if we blocked some.
    const freshChosen = chosen.filter(p => !p.isInc);
    if (freshChosen.length > MAX_SWAPS) {
        const allowed = new Set(freshChosen.slice(0, MAX_SWAPS).map(p => p.ref));
        chosen = chosen.filter(p => p.isInc || allowed.has(p.ref));
        const spare = pool.filter(p => p.isInc && !chosen.includes(p));
        while (chosen.length < budget && spare.length) chosen.push(spare.shift());
        chosen = chosen.slice(0, budget);
    }

    // Order: surviving incumbents in current order, then new ones by score.
    // Matched by identity, not by ref: two entries can share a sourceArticle.
    const survivors = botIncumbents.filter(s => chosen.some(p => p.entry === s));
    const news = chosen
        .filter(p => !p.isInc)
        .map(p => ({
            src: botSrc(p.cand),
            alt: null, caption: null, sourceArticle: p.cand.ref, _candidate: p.cand,
        }));

    const slides = [...evergreens, ...survivors, ...news];
    return {
        slides, changed: !sameSeq(current, slides), budget,
        dropped: botIncumbents.length - survivors.length,
    };
}
