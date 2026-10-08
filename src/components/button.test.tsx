import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Button from './button';

const render = (element: JSX.Element) => {
    const host = document.createElement('div');
    host.innerHTML = renderToStaticMarkup(element);
    return host.firstElementChild as HTMLElement;
};

describe('Button', () => {
    it('renders a link when given an href', () => {
        const el = render(<Button href="/services">Explore services</Button>);
        expect(el.tagName).toBe('A');
        expect(el.getAttribute('href')).toBe('/services');
    });

    it('renders a type="button" button without an href', () => {
        const el = render(<Button>Load more</Button>);
        expect(el.tagName).toBe('BUTTON');
        expect(el.getAttribute('type')).toBe('button');
    });

    it('keeps an explicit button type', () => {
        expect(render(<Button type="submit">Send</Button>).getAttribute('type')).toBe('submit');
    });

    it('opens external links in a new tab safely', () => {
        const el = render(<Button href="https://example.org" external>Docs</Button>);
        expect(el.getAttribute('target')).toBe('_blank');
        expect(el.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('leaves internal links in the same tab', () => {
        const el = render(<Button href="/news">News</Button>);
        expect(el.hasAttribute('target')).toBe(false);
        expect(el.hasAttribute('rel')).toBe(false);
    });

    it('styles primary as an ink pill with an orange chip', () => {
        const el = render(<Button href="/x">Go</Button>);
        expect(el.className).toContain('rounded-full');
        expect(el.className).toContain('bg-ink');
        expect(el.querySelector('.bg-marker.rounded-full svg')).not.toBeNull();
    });

    it('styles link as ink text with a growing marker underline', () => {
        const el = render(<Button href="/x" variant="link">Go</Button>);
        expect(el.className).not.toContain('bg-ink');
        expect(el.className).toContain('text-ink');
        expect(el.querySelector('.bg-marker.scale-x-0')).not.toBeNull();
    });

    it('drops the arrow when asked', () => {
        expect(render(<Button href="/x" arrow={false}>Go</Button>).querySelector('svg')).toBeNull();
        expect(render(<Button href="/x" variant="link" arrow={false}>Go</Button>).querySelector('svg')).toBeNull();
    });

    it('passes disabled through to the button', () => {
        const el = render(<Button disabled>Wait</Button>);
        expect(el.hasAttribute('disabled')).toBe(true);
        expect(el.className).toContain('disabled:opacity-50');
    });

    it('passes extra props and layout classes through', () => {
        const el = render(<Button id="load-more" aria-controls="list" data-track="cta" className="mt-6 w-full">More</Button>);
        expect(el.id).toBe('load-more');
        expect(el.getAttribute('aria-controls')).toBe('list');
        expect(el.getAttribute('data-track')).toBe('cta');
        expect(el.className).toContain('mt-6 w-full');
    });

    it('renders the small size', () => {
        const el = render(<Button href="/x" size="sm">Go</Button>);
        expect(el.className).toContain('h-10');
        expect(el.className).toContain('text-sm');
    });
});
