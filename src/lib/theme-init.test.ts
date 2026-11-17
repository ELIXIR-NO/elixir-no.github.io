import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import themeInit from './theme-init.js?raw';

type Theme = 'dark' | 'light';

const root = document.documentElement;
const isDark = () => root.classList.contains('dark');

// What a page load does: base.astro puts this file's text in a classic script.
// Indirect eval reads it as a script too, so code that only works inside a
// function, such as a top-level return, fails here as it would in the browser.
const loadPage = () => (0, eval)(themeInit);

// Browsers that block storage throw when localStorage is read, before any method is called.
const realStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!;
const blockStorage = () => Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new DOMException('The operation is insecure.', 'SecurityError'); },
});

const setDevice = (device: Theme) => vi.stubGlobal('matchMedia', (query: string) => ({
    matches: device === 'dark' && query.includes('prefers-color-scheme: dark'),
}));

const store = (theme: Theme | null) => theme ? localStorage.setItem('theme', theme) : localStorage.removeItem('theme');

// What the browser sends when a page is shown; "persisted" is true when the
// back or forward button restored it from memory instead of loading it.
const showPage = (persisted: boolean) => {
    const event = new Event('pageshow');
    Object.defineProperty(event, 'persisted', { value: persisted });
    window.dispatchEvent(event);
};

let listen: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    root.classList.remove('dark');
    localStorage.clear();
    setDevice('light');
    listen = vi.spyOn(window, 'addEventListener');
});

afterEach(() => {
    // Each loadPage() listens for pageshow, so one test's page would answer the next test's event.
    for (const [type, listener] of listen.mock.calls) window.removeEventListener(type as string, listener as EventListener);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Object.defineProperty(globalThis, 'localStorage', realStorage);
});

describe('theme on page load', () => {
    it.each<[Theme | null, Theme, boolean]>([
        ['dark', 'light', true],
        ['dark', 'dark', true],
        ['light', 'dark', false],
        ['light', 'light', false],
        [null, 'dark', false],
        [null, 'light', false],
    ])('with %j stored on a %s device, dark is %j', (stored, device, dark) => {
        store(stored);
        setDevice(device);
        loadPage();
        expect(isDark()).toBe(dark);
    });

    it('removes a dark class the stored choice does not ask for', () => {
        root.classList.add('dark');
        store('light');
        loadPage();
        expect(isDark()).toBe(false);
    });

    it('stays light without failing when storage is blocked', () => {
        root.classList.add('dark');
        blockStorage();
        expect(loadPage).not.toThrow();
        expect(isDark()).toBe(false);
    });

    // The text sits inside a <script> element, which either of these would end early.
    it('holds nothing that would cut the script short in the page', () => {
        expect(themeInit).not.toMatch(/<\/script|<!--/i);
    });
});

describe('theme when the back button restores a page', () => {
    it.each<[Theme, Theme]>([
        ['light', 'dark'],
        ['dark', 'light'],
    ])('changes from %s to the %s chosen on another page', (before, after) => {
        setDevice('dark');
        store(before);
        loadPage();
        store(after);
        showPage(true);
        expect(isDark()).toBe(after === 'dark');

        // And again: every later restore has to work, not only the first.
        store(before);
        showPage(true);
        expect(isDark()).toBe(before === 'dark');
    });

    it('leaves a page alone when it is shown after a normal load', () => {
        store('light');
        loadPage();
        store('dark');
        showPage(false);
        expect(isDark()).toBe(false);
    });
});
