import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {
    SLIDES_JSON, SLIDES_DIR, MAX_SLIDES, MIN_SLIDES, SRC_RE, BOT_FILE_RE,
    MAX_CAPTION, MAX_ALT, MIN_IMG_WIDTH, MIN_ASPECT, MAX_IMG_BYTES, ILLEGAL_TEXT_RE,
} from './constants.mjs';
import {probeImage} from './image-probe.mjs';

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

        // Mirrors what select.mjs halts on, so a human PR cannot land a state
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
            // Quality gates apply only to bot-created images (<year>-<slug>.<ext>).
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
    const out = execFileSync('git', ['diff', '--name-only', 'HEAD'], {encoding: 'utf8'});
    return out.split('\n').map(s => s.trim()).filter(Boolean)
        .filter(p => p !== 'src/data/slides.json' && !p.startsWith('src/data/slides/'))
        .map(p => `out-of-scope change: ${p}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const slides = JSON.parse(fs.readFileSync(SLIDES_JSON, 'utf8'));
    const v = validateSlides(slides);
    if (process.argv.includes('--diff-scope')) v.push(...diffScopeViolations());
    if (v.length) {
        console.error('Slide validation failed:\n' + v.map(m => '  - ' + m).join('\n'));
        process.exit(1);
    }
    console.log(`Slides valid (${slides.length}).`);
}
