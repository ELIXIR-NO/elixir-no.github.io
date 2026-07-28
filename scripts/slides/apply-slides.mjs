import fs from 'node:fs';
import path from 'node:path';
import {SLIDES_DIR, SLIDES_JSON, BOT_FILE_RE} from './constants.mjs';

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
    for (const s of slides) {
        if (s._candidate) {
            const dest = path.join(SLIDES_DIR, path.basename(s.src));
            fs.copyFileSync(s._candidate.coverAbsPath, dest);
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
