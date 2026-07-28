import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {MAX_CAPTION, MAX_ALT} from './constants.mjs';
import {textIssues} from './validate-slides.mjs';

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
    const prompt = `Here is the input. Return only the JSON array.\n${inputJson}`;
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
