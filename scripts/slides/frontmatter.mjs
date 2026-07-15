import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {CONTENT_DIR, COLLECTIONS} from './constants.mjs';
import {parseArticleDate} from './dates.mjs';

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
