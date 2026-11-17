import { describe, expect, it } from 'vitest';
import { bannerId, isLive, renderInlineMarkdown, schema, type Banner } from './banner';

const base: Banner = { visible: true, message: 'Workshop in Oslo' };
const deadline = '2026-12-09T10:00:00+01:00';

describe('banner.json', () => {
    it('accepts a label, a link and a deadline with a time zone', () => {
        const result = schema.safeParse({ ...base, label: 'Event', link: { label: 'Read more', href: '/events' }, expires: deadline });
        expect(result.success).toBe(true);
    });

    it.each(['2026-12-09', '2026-12-09T10:00:00', 'next week'])('rejects the deadline %j', (expires) => {
        expect(schema.safeParse({ ...base, expires }).success).toBe(false);
    });

    it('rejects an unknown key', () => {
        expect(schema.safeParse({ ...base, expiry: deadline }).success).toBe(false);
    });

    it.each(['//example.org', 'javascript:alert(1)', 'http://example.org'])('rejects the link %j', (href) => {
        expect(schema.safeParse({ ...base, link: { label: 'Go', href } }).success).toBe(false);
    });
});

describe('isLive', () => {
    const before = Date.parse('2026-12-09T08:59:59Z');
    const at = Date.parse('2026-12-09T09:00:00Z');

    it('shows a visible banner until its deadline', () => {
        expect(isLive({ ...base, expires: deadline }, before)).toBe(true);
        expect(isLive({ ...base, expires: deadline }, at)).toBe(false);
    });

    it('hides a banner that is switched off or empty', () => {
        expect(isLive({ ...base, visible: false })).toBe(false);
        expect(isLive({ ...base, message: '  ' })).toBe(false);
    });

    it('keeps a banner without a deadline', () => {
        expect(isLive(base, Date.parse('2100-01-01T00:00:00Z'))).toBe(true);
    });
});

describe('bannerId', () => {
    it('changes when the announcement changes', () => {
        expect(bannerId(base)).toBe(bannerId({ ...base }));
        expect(bannerId(base)).not.toBe(bannerId({ ...base, message: 'Another workshop' }));
        expect(bannerId(base)).not.toBe(bannerId({ ...base, expires: deadline }));
    });
});

describe('renderInlineMarkdown', () => {
    it('renders bold, italic and links', () => {
        const html = renderInlineMarkdown('**New** *workshop*, [read more](/events)');
        expect(html).toContain('<strong class="font-semibold">New</strong>');
        expect(html).toContain('<em>workshop</em>');
        expect(html).toMatch(/<a href="\/events" class="[^"]+">read more<\/a>/);
    });

    it('opens other websites in a new window', () => {
        expect(renderInlineMarkdown('[EGA](https://ega-archive.org/)')).toContain('target="_blank" rel="noopener noreferrer"');
    });

    it('escapes HTML in the message', () => {
        expect(renderInlineMarkdown('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    });

    it.each(['javascript:alert`1`', '//example.org', '/x" onmouseover="alert`1`'])('keeps a link to %j as text', (target) => {
        expect(renderInlineMarkdown(`[click](${target})`)).toBe('click');
    });
});

describe('review regressions', () => {
    it('accepts the deadline format the admin editor writes', () => {
        expect(schema.safeParse({ ...base, expires: new Date(deadline).toISOString() }).success).toBe(true);
    });

    it.each(['2026-12-09T10:00:00+25:00', '2026-12-09T10:00:00+01:99'])('rejects the impossible deadline %j', (expires) => {
        expect(schema.safeParse({ ...base, expires }).success).toBe(false);
    });

    it('keeps an apostrophe in a link target intact', () => {
        expect(renderInlineMarkdown("[x](https://example.org/it's)")).toContain('href="https://example.org/it&#39;s"');
    });

    it('never puts a raw quote in a link target', () => {
        const html = renderInlineMarkdown('[click](/x"onmouseover="y)');
        expect(html).not.toMatch(/href="[^"]*"[a-z]/);
    });

    it('keeps emphasis tags out of a link target', () => {
        const html = renderInlineMarkdown('*a [b](/x*) c');
        expect(html).not.toMatch(/href="[^"]*<\/?em/);
        expect((html.match(/<em>/g) ?? []).length).toBe((html.match(/<\/em>/g) ?? []).length);
    });
});
