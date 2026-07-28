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
