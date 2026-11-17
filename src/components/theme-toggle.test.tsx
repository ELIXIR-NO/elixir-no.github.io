import { MotionGlobalConfig } from 'framer-motion';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeToggle from './theme-toggle';

// The icon swap is animated; skipping the animation lets a test see the icon that ends up showing.
MotionGlobalConfig.skipAnimations = true;

const html = document.documentElement;
const realStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

let host: HTMLElement;
let reactRoot: Root;

const mount = async () => {
    host = document.body.appendChild(document.createElement('div'));
    reactRoot = createRoot(host);
    await act(async () => {
        reactRoot.render(<ThemeToggle />);
        await settle();
    });
    return host.querySelector('button')!;
};

const click = (button: HTMLButtonElement) => act(async () => {
    button.click();
    await settle();
});

const showsOnly = (button: HTMLButtonElement, icon: 'sun' | 'moon') => act(() => vi.waitFor(() => {
    const icons = [...button.querySelectorAll('[data-icon]')].map((svg) => svg.getAttribute('data-icon'));
    expect(icons).toEqual([icon]);
}));

beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    html.classList.remove('dark');
    localStorage.clear();
});

afterEach(async () => {
    await act(async () => reactRoot.unmount());
    host.remove();
    vi.unstubAllGlobals();
    Object.defineProperty(globalThis, 'localStorage', realStorage);
});

describe('ThemeToggle', () => {
    it('switches the page to dark and stores the choice', async () => {
        const button = await mount();
        expect(button.getAttribute('aria-label')).toBe('Switch to dark mode');
        await showsOnly(button, 'moon');

        await click(button);
        expect(html.classList.contains('dark')).toBe(true);
        expect(localStorage.getItem('theme')).toBe('dark');
        expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
        await showsOnly(button, 'sun');
    });

    it('switches back to light and stores that too', async () => {
        html.classList.add('dark');
        const button = await mount();
        expect(button.getAttribute('aria-label')).toBe('Switch to light mode');

        await click(button);
        expect(html.classList.contains('dark')).toBe(false);
        expect(localStorage.getItem('theme')).toBe('light');
        expect(button.getAttribute('aria-label')).toBe('Switch to dark mode');
        await showsOnly(button, 'moon');
    });

    // The script in theme-init.js changes the class when the back button restores a page.
    it('follows a theme change made outside the button', async () => {
        const button = await mount();
        await act(async () => {
            html.classList.add('dark');
            await settle();
        });
        expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
        await showsOnly(button, 'sun');
    });

    it('still switches the page when storage is blocked', async () => {
        // Browsers that block storage throw when localStorage is read, before any method is called.
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            get() { throw new DOMException('The operation is insecure.', 'SecurityError'); },
        });
        const button = await mount();

        await click(button);
        expect(html.classList.contains('dark')).toBe(true);
        expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
    });
});
