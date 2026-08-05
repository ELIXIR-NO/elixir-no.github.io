// The slides pipeline, whole. Sections run in dependency order: constants,
// article reading, ranking, the acceptance rules every producer checks itself
// against, candidate collection, selection, captions, apply, and the refresh
// that drives them. `slides.js <collect|refresh|validate>` is the only entry.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import matter from 'gray-matter';

// ========================================================================
// Constants
// ========================================================================

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SLIDES_JSON = path.join(REPO_ROOT, 'src/data/slides.json');
export const SLIDES_DIR = path.join(REPO_ROOT, 'src/data/slides');
export const CONTENT_DIR = path.join(REPO_ROOT, 'src/content');

export const COLLECTIONS = ['news', 'events', 'funding-and-projects'];

export const MAX_SLIDES = 6;
export const MIN_SLIDES = 1;
export const CANDIDATE_POOL = 12;
export const HYSTERESIS_MARGIN = 0.15; // fraction of score an incumbent gets as a stay bonus
export const MAX_SWAPS = 2;

export const MAX_CAPTION = 280;
export const MAX_ALT = 125;
export const MIN_IMG_WIDTH = 800;
export const MAX_IMG_BYTES = 3_000_000;
export const MIN_ASPECT = 0.9; // width/height must be >= this (landscape-ish)

// Control characters plus the three that break MDX/JSX or shell-quote a caption.
export const ILLEGAL_TEXT_RE = /[\x00-\x1f<>`]/;

export const SRC_RE = /^\/data\/slides\/[a-z0-9-]+\.(png|jpe?g|webp)$/;

// Bot-created images are `<collection>-<year>-<slug>.<ext>`. The collection is
// part of the name because a slug is only unique within its collection: news
// and events both hold `2025/elixir-industry-engagement-day`.
export const BOT_FILE_RE =
    new RegExp(`^(?:${COLLECTIONS.join('|')})-\\d{4}-[a-z0-9-]+\\.(?:png|jpe?g|webp)$`);

// Editorial weighting: matched against lowercased `${title} ${summary} ${tags}`.
export const FLAGSHIP_TOPICS = [
    {re: /\ball hands\b|all-hands/, weight: 1.0},
    {re: /\bgdi\b|genomic data infrastructure/, weight: 0.9},
    {re: /\bfega\b|federated ega/, weight: 0.9},
    {re: /\beosc\b/, weight: 0.8},
    {re: /1\+ ?million genomes|1\+mg|genome of europe|\bgoe\b/, weight: 0.8},
    {re: /infrastructure|hackathon|workshop/, weight: 0.5},
    {re: /training|course|webinar/, weight: 0.4},
];
export const DEMOTE_TOPICS = [
    {re: /scheduled maintenance|maintenance window|downtime/, weight: -1.0},
    {re: /job vacancy|call for|deadline reminder/, weight: -0.4},
];

export const NEWS_HALFLIFE_DAYS = 120; // news/funding recency half-life
export const EVENT_DECAY_DAYS = 21;    // events die ~this fast after their date

// ========================================================================
// Dates
// ========================================================================

const MONTHS = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Article dates are free-text English "Month D, YYYY" (full or abbreviated
// month, optional trailing period on the abbreviation). Returns a UTC-midnight
// Date, or null if the string does not match this exact shape.
export function parseArticleDate(str) {
    if (typeof str !== 'string') return null;
    const m = str.trim().match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/);
    if (!m) return null;
    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    const day = Number(m[2]);
    const year = Number(m[3]);
    if (day < 1 || day > 31) return null;
    const d = new Date(Date.UTC(year, month, day));
    if (d.getUTCMonth() !== month || d.getUTCDate() !== day) return null; // reject e.g. Feb 30
    return d;
}

// ========================================================================
// Image probe
// ========================================================================

function readPng(buf) {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (buf.length < 24 || !sig.every((b, i) => buf[i] === b)) return null;
    return {format: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20)};
}

function readJpeg(buf) {
    if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    let o = 2;
    while (o + 9 < buf.length) {
        if (buf[o] !== 0xff) return null;
        const marker = buf[o + 1];
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {o += 2; continue;}
        const len = buf.readUInt16BE(o + 2);
        const isSOF = marker >= 0xc0 && marker <= 0xcf &&
            marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isSOF) return {format: 'jpeg', height: buf.readUInt16BE(o + 5), width: buf.readUInt16BE(o + 7)};
        o += 2 + len;
    }
    return null;
}

function readWebp(buf) {
    if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' ||
        buf.toString('ascii', 8, 12) !== 'WEBP') return null;
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') {
        return {format: 'webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff};
    }
    if (chunk === 'VP8L') {
        const b = buf.subarray(21);
        return {
            format: 'webp',
            width: 1 + (((b[1] & 0x3f) << 8) | b[0]),
            height: 1 + (((b[3] & 0x0f) << 10) | (b[2] << 2) | ((b[1] & 0xc0) >> 6)),
        };
    }
    if (chunk === 'VP8X') {
        return {
            format: 'webp',
            width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
            height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
        };
    }
    return null;
}

// Reads image dimensions from the file header without any native dependency.
// Throws if the file is missing, empty, or not a valid PNG/JPEG/WebP.
export function probeImage(absPath) {
    const buf = fs.readFileSync(absPath);
    if (buf.length === 0) throw new Error(`empty file: ${absPath}`);
    const r = readPng(buf) || readJpeg(buf) || readWebp(buf);
    if (!r || !r.width || !r.height) throw new Error(`unrecognized or corrupt image: ${absPath}`);
    return {...r, bytes: buf.length};
}

// ========================================================================
// Frontmatter
// ========================================================================

function findEntryDirs(root, rel, out) {
    const abs = path.join(root, rel);
    const entries = fs.readdirSync(abs, {withFileTypes: true});
    if (entries.some(e => e.isFile() && /^index\.mdx?$/i.test(e.name))) {
        out.push(rel);
        return;
    }
    for (const e of entries) {
        if (e.isDirectory()) findEntryDirs(root, path.join(rel, e.name), out);
    }
}

function readArticle(collection, ref) {
    const dir = path.join(CONTENT_DIR, ref);
    const file = ['index.mdx', 'index.md'].map(f => path.join(dir, f)).find(fs.existsSync);
    if (!file) return null;
    const {data} = matter(fs.readFileSync(file, 'utf8'));
    const parts = ref.split('/');
    const slug = parts[parts.length - 1];
    const date = parseArticleDate(data.date);

    let coverAbsPath = null, coverExt = null;
    if (data.cover?.source) {
        const p = path.join(dir, String(data.cover.source).replace(/^\.\//, ''));
        if (fs.existsSync(p)) {
            coverAbsPath = p;
            coverExt = path.extname(p).slice(1).toLowerCase();
        }
    }

    return {
        ref, collection, slug,
        year: date ? date.getUTCFullYear() : (Number(parts[1]) || null),
        title: data.title ?? slug,
        summary: data.summary ?? '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        date, coverAbsPath, coverExt,
    };
}

export function listArticles() {
    const out = [];
    for (const collection of COLLECTIONS) {
        const collRoot = path.join(CONTENT_DIR, collection);
        if (!fs.existsSync(collRoot)) continue;
        const dirs = [];
        for (const child of fs.readdirSync(collRoot, {withFileTypes: true})) {
            if (child.isDirectory()) findEntryDirs(CONTENT_DIR, path.join(collection, child.name), dirs);
        }
        for (const rel of dirs) {
            const a = readArticle(collection, rel);
            if (a) out.push(a);
        }
    }
    return out;
}

export function resolveArticle(ref) {
    const collection = ref.split('/')[0];
    if (!COLLECTIONS.includes(collection)) return null;
    if (!fs.existsSync(path.join(CONTENT_DIR, ref))) return null;
    return readArticle(collection, ref);
}

export function withCover(articles) {
    return articles.filter(a => a.coverAbsPath);
}

// ========================================================================
// Ranking
// ========================================================================

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

// ========================================================================
// Acceptance rules and the validation gate
// ========================================================================

const EXT_FORMAT = {png: 'png', jpg: 'jpeg', jpeg: 'jpeg', webp: 'webp'};

export const extensionMatches = (img, ext) => EXT_FORMAT[ext] === img.format;

// The acceptance rules live here so producers can check themselves against the
// same predicate the gate enforces. `collect-candidates` screens covers with
// imageQualityIssues, `caption-agent` screens model output with textIssues; if
// either drifted from the gate the pipeline would pick work it then rejects.
export function imageQualityIssues({width, height, bytes}) {
    const issues = [];
    if (width < MIN_IMG_WIDTH) issues.push(`width ${width} < ${MIN_IMG_WIDTH}`);
    if (width / height < MIN_ASPECT) issues.push(`not landscape (${width}x${height})`);
    if (bytes > MAX_IMG_BYTES) issues.push(`file too large (${bytes} > ${MAX_IMG_BYTES})`);
    return issues;
}

export function textIssues(alt, caption) {
    const issues = [];
    for (const [field, val, max] of [['caption', caption, MAX_CAPTION], ['alt', alt, MAX_ALT]]) {
        if (typeof val !== 'string' || !val.trim()) {issues.push(`${field} empty`); continue;}
        if (val.length > max) issues.push(`${field} too long (${val.length} > ${max})`);
        if (ILLEGAL_TEXT_RE.test(val)) issues.push(`${field} has illegal characters`);
    }
    if (typeof alt === 'string' && alt.trim() === (caption || '').trim()) issues.push('alt equals caption');
    return issues;
}

export function validateSlides(slides, {slidesDir = SLIDES_DIR} = {}) {
    const v = [];
    if (!Array.isArray(slides)) return ['slides.json is not an array'];
    if (slides.length < MIN_SLIDES || slides.length > MAX_SLIDES)
        v.push(`slide count ${slides.length} outside ${MIN_SLIDES}..${MAX_SLIDES}`);

    const seen = new Set();
    const seenRefs = new Set();
    for (const [i, s] of slides.entries()) {
        const at = `slide[${i}]`;
        if (!SRC_RE.test(s.src || '')) {v.push(`${at} src invalid: ${s.src}`); continue;}
        if (seen.has(s.src)) v.push(`${at} duplicate src: ${s.src}`);
        seen.add(s.src);

        // Mirrors what selectSlides halts on, so a human PR cannot land a state
        // that would stop the bot on its next run.
        if (s.evergreen === true && s.sourceArticle) v.push(`${at} has both evergreen and sourceArticle`);
        else if (!(s.evergreen === true) && !s.sourceArticle) v.push(`${at} untracked (no evergreen/sourceArticle)`);
        else if (s.sourceArticle && typeof s.sourceArticle !== 'string') v.push(`${at} sourceArticle is not a string`);
        else if (s.sourceArticle) {
            if (seenRefs.has(s.sourceArticle)) v.push(`${at} duplicate sourceArticle: ${s.sourceArticle}`);
            seenRefs.add(s.sourceArticle);
        }

        for (const issue of textIssues(s.alt, s.caption)) v.push(`${at} ${issue}`);

        const abs = path.join(slidesDir, path.basename(s.src));
        if (!fs.existsSync(abs)) {v.push(`${at} image missing: ${abs}`); continue;}
        try {
            const img = probeImage(abs);
            const ext = path.extname(abs).slice(1).toLowerCase();
            if (!extensionMatches(img, ext)) v.push(`${at} format ${img.format} != extension .${ext}`);
            // Quality gates apply only to bot-created images (BOT_FILE_RE).
            // Legacy/human pins predate the automation and are grandfathered.
            if (BOT_FILE_RE.test(path.basename(abs)))
                for (const issue of imageQualityIssues(img)) v.push(`${at} ${issue}`);
        } catch (e) {
            v.push(`${at} image probe failed: ${e.message}`);
        }
    }
    return v;
}

export function diffScopeViolations() {
    // `git status`, not `git diff`, which cannot see untracked files: a stray
    // temp file written outside the slides paths is exactly what this guards.
    const out = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {encoding: 'utf8'});
    return out.split('\n').map(s => s.slice(3).trim()).filter(Boolean)
        .filter(p => p !== 'src/data/slides.json' && !p.startsWith('src/data/slides/'))
        .map(p => `out-of-scope change: ${p}`);
}

// ========================================================================
// Candidate collection
// ========================================================================

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
        return extensionMatches(img, a.coverExt) && !imageQualityIssues(img).length;
    } catch {
        return false;
    }
}

// The captions an article would get if the agent is off or rejected must
// themselves pass the gate. Without this an article whose summary repeats its
// title yields alt === caption, which fails validation after every apply.
export function usableCandidate(a) {
    if (!usableCover(a)) return false;
    // fallbackText would otherwise caption it with the title. Typed rather than
    // truthy: YAML yields a number for an unquoted `summary: 2024`, and the bot
    // runs before the build that would reject it.
    if (typeof a.summary !== 'string' || !a.summary.trim()) return false;
    const {alt, caption} = fallbackText(a);
    return !textIssues(alt, caption).length;
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

export function collect(now = new Date(), {current = readCurrent()} = {}) {
    const ranked = rankCandidates(withCover(listArticles()).filter(usableCandidate), now);
    const byRef = new Map(ranked.map(a => [a.ref, a]));
    for (const s of current) {
        if (s.sourceArticle && !byRef.has(s.sourceArticle)) {
            const a = resolveArticle(s.sourceArticle);
            if (a && a.coverAbsPath) byRef.set(a.ref, {...a, score: scoreArticle(a, now), topics: topicsOf(a)});
        }
    }
    return {current, candidates: [...byRef.values()].map(toCandidate)};
}

// ========================================================================
// Selection
// ========================================================================

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

    const malformed = current.find(s => s.sourceArticle && typeof s.sourceArticle !== 'string');
    if (malformed) return halt(`${malformed.src} has a non-string sourceArticle`);

    const evergreens = current
        .filter(s => s.evergreen === true || !s.sourceArticle)
        .map(s => (s.evergreen === true ? s : {...s, evergreen: true}));
    if (evergreens.length > MAX_SLIDES)
        return halt(`${evergreens.length} pinned slides exceed the ${MAX_SLIDES} slot limit; `
            + `unpin one of ${evergreens.map(s => s.src).join(', ')}`);
    const budget = MAX_SLIDES - evergreens.length;

    const botIncumbents = current.filter(s => s.sourceArticle);
    const claimedRefs = new Set(botIncumbents.map(s => s.sourceArticle));
    // Keeping one of two slides that name the same article means deleting the
    // other and its image, on a guess. Same unanswerable question as a dual-key
    // entry, so it gets the same answer.
    if (claimedRefs.size < botIncumbents.length) {
        const dupe = botIncumbents.find((s, i) => botIncumbents.findIndex(o => o.sourceArticle === s.sourceArticle) < i);
        const pair = botIncumbents.filter(s => s.sourceArticle === dupe.sourceArticle).map(s => s.src);
        return halt(`${pair.join(' and ')} both name ${dupe.sourceArticle}; remove one`);
    }

    // One slide per file: a generated filename already taken by a pin, or by a
    // higher-scored candidate this same run, disqualifies the candidate.
    const claimedSrcs = new Set(current.map(s => s.src));
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

// ========================================================================
// Captions
// ========================================================================

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function clamp(str, n) {
    const s = String(str ?? '').replace(/\s+/g, ' ').trim();
    return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}

export function fallbackText(cand) {
    const caption = clamp(cand.summary || cand.title, MAX_CAPTION);
    return {alt: clamp(cand.title, MAX_ALT), caption};
}

export function properNounsOk(text, cand) {
    const src = `${cand.title} ${cand.summary}`;
    const runs = text.match(/[A-ZÅØÆ][\wÅØÆåøæ.'-]+(?:\s+[A-ZÅØÆ][\wÅØÆåøæ.'-]+)+/g) || [];
    return runs.every(r => src.includes(r));
}

export function validAgentText(alt, caption, cand) {
    if (textIssues(alt, caption).length) return false;
    return properNounsOk(caption, cand) && properNounsOk(alt, cand);
}

export function extractJsonArray(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    for (const candidate of [t, (t.match(/\[[\s\S]*\]/) || [])[0]]) {
        if (!candidate) continue;
        try {
            const v = JSON.parse(candidate);
            if (Array.isArray(v)) return v;
        } catch { /* try next */ }
    }
    return null;
}

export function defaultRunAgent(inputJson) {
    const model = process.env.SLIDES_AGENT_MODEL;
    if (!model || process.env.SLIDES_AGENT === 'off') return Promise.resolve('');
    // State the task, not just the format. "Return only the JSON array" alone
    // reads as "echo the array you were given", and small models do exactly that.
    const prompt = 'Write alt and caption for every slide below, following your ' +
        `rules. Return only the JSON array of {id, alt, caption}.\n${inputJson}`;
    const r = spawnSync('opencode', ['run', '--model', model, prompt],
        {cwd: HERE, encoding: 'utf8', timeout: 120_000, maxBuffer: 4 << 20});
    return Promise.resolve(r.status === 0 ? (r.stdout || '') : '');
}

export async function writeCaptions(slides, {runAgent = defaultRunAgent} = {}) {
    const news = slides.filter(s => s._candidate && (s.alt == null || s.caption == null));
    if (!news.length) return slides;

    const input = JSON.stringify({
        slides: news.map(s => ({id: s._candidate.id, title: s._candidate.title, summary: s._candidate.summary})),
    });

    let byId = new Map();
    try {
        const arr = extractJsonArray(await runAgent(input));
        if (arr) byId = new Map(arr.map(o => [o.id, o]));
    } catch { /* fall back below */ }

    for (const s of news) {
        const c = s._candidate;
        const a = byId.get(c.id);
        if (a && validAgentText(a.alt, a.caption, c)) {
            s.alt = a.alt.trim();
            s.caption = a.caption.trim();
        } else {
            const fb = fallbackText(c);
            s.alt = fb.alt;
            s.caption = fb.caption;
        }
    }
    return slides;
}

// ========================================================================
// Apply
// ========================================================================

export function cleanEntry(s) {
    const out = {src: s.src, alt: s.alt, caption: s.caption};
    if (s.evergreen === true) out.evergreen = true;
    else if (s.sourceArticle) out.sourceArticle = s.sourceArticle;
    return out;
}

export function referencedBasenames(slides) {
    return new Set(slides.map(s => path.basename(s.src)));
}

export function staleBotFiles(existing, referenced) {
    return existing.filter(f => BOT_FILE_RE.test(f) && !referenced.has(f));
}

export function apply(slides) {
    const retained = new Set(slides.filter(s => !s._candidate).map(s => path.basename(s.src)));
    for (const s of slides) {
        if (s._candidate) {
            const name = path.basename(s.src);
            if (retained.has(name))
                throw new Error(`refusing to overwrite an image already in use: ${name}`);
            retained.add(name);
            fs.copyFileSync(s._candidate.coverAbsPath, path.join(SLIDES_DIR, name));
        }
    }
    const clean = slides.map(cleanEntry);
    const referenced = referencedBasenames(clean);
    const existing = fs.readdirSync(SLIDES_DIR);
    const deleted = staleBotFiles(existing, referenced);
    for (const f of deleted) fs.rmSync(path.join(SLIDES_DIR, f));

    fs.writeFileSync(SLIDES_JSON, JSON.stringify(clean, null, 4) + '\n');
    return {deleted, slides: clean};
}

// ========================================================================
// Refresh
// ========================================================================

function setOutput(result) {
    const out = process.env.GITHUB_OUTPUT;
    if (out) fs.appendFileSync(out, `result=${result}\n`);
    console.log(`result=${result}`);
}

export async function refresh({diffScope = false} = {}) {
    const {current, candidates} = collect(new Date());
    const {slides, changed, blocked, budget, dropped} = selectSlides({current, candidates});
    if (blocked) {
        console.error(`Cannot refresh: ${blocked}.`);
        return 1;
    }
    if (budget === 0) {
        console.warn(dropped
            ? `Pins fill every slot; dropping ${dropped} bot slide(s) to make room.`
            : 'Every slot is pinned; the bot has nothing to rotate.');
    }
    if (!changed) {
        console.log('No slide changes needed.');
        setOutput('noop');
        return 0;
    }

    await writeCaptions(slides);
    const {deleted, slides: applied} = apply(slides);

    const violations = validateSlides(applied);
    if (diffScope) violations.push(...diffScopeViolations());
    if (violations.length) {
        console.error('Validation failed after apply:\n' + violations.map(m => '  - ' + m).join('\n'));
        return 1;
    }

    console.log(`Applied ${applied.length} slides; deleted ${deleted.length} stale file(s).`);
    setOutput('changed');
    return 0;
}

// ========================================================================
// CLI
// ========================================================================

const COMMANDS = {
    collect: () => {
        process.stdout.write(JSON.stringify(collect(), null, 2) + '\n');
        return 0;
    },
    refresh: () => refresh({diffScope: process.argv.includes('--diff-scope')}),
    validate: () => {
        const slides = JSON.parse(fs.readFileSync(SLIDES_JSON, 'utf8'));
        const v = validateSlides(slides);
        if (process.argv.includes('--diff-scope')) v.push(...diffScopeViolations());
        if (v.length) {
            console.error('Slide validation failed:\n' + v.map(m => '  - ' + m).join('\n'));
            return 1;
        }
        console.log(`Slides valid (${slides.length}).`);
        return 0;
    },
};

if (import.meta.url === `file://${process.argv[1]}`) {
    const command = COMMANDS[process.argv[2]];
    if (!command) {
        console.error(`Usage: slides.js <${Object.keys(COMMANDS).join('|')}> [--diff-scope]`);
        process.exit(2);
    }
    Promise.resolve(command())
        .then(code => process.exit(code))
        .catch(e => {console.error(e); process.exit(1);});
}
