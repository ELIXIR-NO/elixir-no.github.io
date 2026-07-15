import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {
    SLIDES_JSON, SLIDES_DIR, MAX_SLIDES, MIN_SLIDES, SRC_RE,
    MAX_CAPTION, MAX_ALT, MIN_IMG_WIDTH, MIN_ASPECT, MAX_IMG_BYTES,
} from './constants.mjs';
import {probeImage} from './image-probe.mjs';

const EXT_FORMAT = {png: 'png', jpg: 'jpeg', jpeg: 'jpeg', webp: 'webp'};

export function validateSlides(slides, {slidesDir = SLIDES_DIR} = {}) {
    const v = [];
    if (!Array.isArray(slides)) return ['slides.json is not an array'];
    if (slides.length < MIN_SLIDES || slides.length > MAX_SLIDES)
        v.push(`slide count ${slides.length} outside ${MIN_SLIDES}..${MAX_SLIDES}`);

    const seen = new Set();
    for (const [i, s] of slides.entries()) {
        const at = `slide[${i}]`;
        if (!SRC_RE.test(s.src || '')) {v.push(`${at} src invalid: ${s.src}`); continue;}
        if (seen.has(s.src)) v.push(`${at} duplicate src: ${s.src}`);
        seen.add(s.src);

        if (!(s.evergreen === true) && !s.sourceArticle) v.push(`${at} untracked (no evergreen/sourceArticle)`);

        for (const [field, max] of [['caption', MAX_CAPTION], ['alt', MAX_ALT]]) {
            const val = s[field];
            if (typeof val !== 'string' || !val.trim()) {v.push(`${at} ${field} empty`); continue;}
            if (val.length > max) v.push(`${at} ${field} too long (${val.length} > ${max})`);
            if (/[\x00-\x1f<>`]/.test(val)) v.push(`${at} ${field} has illegal characters`);
        }
        if (typeof s.alt === 'string' && s.alt.trim() === (s.caption || '').trim())
            v.push(`${at} alt equals caption`);

        const abs = path.join(slidesDir, path.basename(s.src));
        if (!fs.existsSync(abs)) {v.push(`${at} image missing: ${abs}`); continue;}
        try {
            const img = probeImage(abs);
            const ext = path.extname(abs).slice(1).toLowerCase();
            if (EXT_FORMAT[ext] !== img.format) v.push(`${at} format ${img.format} != extension .${ext}`);
            if (img.width < MIN_IMG_WIDTH) v.push(`${at} width ${img.width} < ${MIN_IMG_WIDTH}`);
            if (img.width / img.height < MIN_ASPECT) v.push(`${at} not landscape (${img.width}x${img.height})`);
            if (img.bytes > MAX_IMG_BYTES) v.push(`${at} file too large (${img.bytes} > ${MAX_IMG_BYTES})`);
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
