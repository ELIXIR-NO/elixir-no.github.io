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
    const evergreens = current
        .filter(s => s.evergreen === true || !s.sourceArticle)
        .map(s => (s.evergreen === true ? s : {...s, evergreen: true}));
    if (evergreens.length > MAX_SLIDES)
        return {
            slides: current, changed: false, budget: 0,
            blocked: `${evergreens.length} pinned slides exceed the ${MAX_SLIDES} slot limit; unpin one`,
        };
    const budget = MAX_SLIDES - evergreens.length;

    const botIncumbents = current.filter(s => s.sourceArticle && s.evergreen !== true);
    // Every ref already on screen is spoken for, including one held by a pin
    // that also carries a sourceArticle. Otherwise the article would be picked
    // again and shown twice under two filenames.
    const claimedRefs = new Set(current.filter(s => s.sourceArticle).map(s => s.sourceArticle));
    const claimedSrcs = new Set(current.map(s => s.src));
    const fresh = candidates.filter(c => !claimedRefs.has(c.ref) && !claimedSrcs.has(botSrc(c)));

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
    return {slides, changed: !sameSeq(current, slides), budget};
}
