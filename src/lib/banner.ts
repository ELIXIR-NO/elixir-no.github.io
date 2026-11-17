// The announcement banner from src/data/banner.json. The schema is strict, so a
// misspelt key or an unreadable deadline fails the build instead of showing a
// banner that never ends.
import { z } from 'astro/zod';
import raw from '../data/banner.json';
import { href } from './site';

const text = z.string().trim().min(1);

export const schema = z.object({
    visible: z.boolean(),
    // Inline markdown: **bold**, *italic* and [text](link).
    message: z.string(),
    label: text.optional(),
    link: z.object({ label: text, href }).strict().optional(),
    // The banner disappears at this moment. It needs a time zone, such as
    // 2026-12-09T10:00:00+01:00, so it ends at the same moment for every visitor.
    expires: z.string().datetime({ offset: true })
        .refine((value) => !Number.isNaN(Date.parse(value)), "is not a real date and time").optional(),
}).strict();

export type Banner = z.infer<typeof schema>;

const parsed = schema.safeParse(raw);
if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`src/data/banner.json is invalid:\n${problems.join('\n')}`);
}

export const banner: Banner = parsed.data;

export function isLive(b: Banner, now = Date.now()): boolean {
    if (!b.visible || !b.message.trim()) return false;
    return !b.expires || Date.parse(b.expires) > now;
}

// Dismissing hides one announcement, so a new or changed one shows again.
export function bannerId(b: Banner): string {
    const source = JSON.stringify([b.label, b.message, b.link, b.expires]);
    let hash = 5381;
    for (let i = 0; i < source.length; i++) hash = ((hash * 33) ^ source.charCodeAt(i)) >>> 0;
    return hash.toString(36);
}

const escapeHtml = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// The ampersand goes last, so an escaped "&lt;" in the message stays "&lt;".
const unescapeHtml = (s: string) => s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

const linkClass = 'underline underline-offset-2 decoration-white/50 hover:decoration-white';

// Editors write the message, so it is escaped first, and a link whose target
// would fail the href rules (javascript:, //host, plain http) stays as text.
// After escaping, every "<" is a tag this function made, so a link target may
// not contain one: that keeps a bold or italic closing tag out of the href.
export function renderInlineMarkdown(md: string): string {
    return escapeHtml(md)
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)<]+)\)/g, (_match, label: string, target: string) => {
            const checked = href.safeParse(unescapeHtml(target));
            if (!checked.success) return label;
            const url = escapeHtml(checked.data);
            const external = url.startsWith('https://') ? ' target="_blank" rel="noopener noreferrer"' : '';
            return `<a href="${url}" class="${linkClass}"${external}>${label}</a>`;
        });
}
