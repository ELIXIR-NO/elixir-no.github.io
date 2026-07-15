import {MAX_SLIDES, HYSTERESIS_MARGIN, MAX_SWAPS} from './constants.mjs';

const botFilename = c => `${c.year ?? '0000'}-${c.slug}.${c.coverExt}`;
const pick = s => ({src: s.src, alt: s.alt ?? null, caption: s.caption ?? null});
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
    const budget = Math.max(0, MAX_SLIDES - evergreens.length);

    const botIncumbents = current.filter(s => s.sourceArticle && s.evergreen !== true);
    const incumbentRefs = new Set(botIncumbents.map(s => s.sourceArticle));
    const fresh = candidates.filter(c => !incumbentRefs.has(c.ref));

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
    const chosenRefs = new Set(chosen.map(p => p.ref));
    const survivors = botIncumbents.filter(s => chosenRefs.has(s.sourceArticle));
    const news = chosen
        .filter(p => !p.isInc)
        .map(p => ({
            src: `/data/slides/${botFilename(p.cand)}`,
            alt: null, caption: null, sourceArticle: p.cand.ref, _candidate: p.cand,
        }));

    const slides = [...evergreens, ...survivors, ...news];
    return {slides, changed: !sameSeq(current, slides)};
}
