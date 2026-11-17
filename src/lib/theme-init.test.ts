import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import themeInit from './theme-init.js?raw';

type Theme = 'dark' | 'light';

const root = document.documentElement;
const isDark = () => root.classList.contains('dark');

// What a page load does: base.astro puts this file's text in a classic script.
const loadPage = () => new Function(themeInit)();

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
        vi.stubGlobal('localStorage', {
            getItem: () => { throw new DOMException('The operation is insecure.', 'SecurityError'); },
        });
        expect(loadPage).not.toThrow();
        expect(isDark()).toBe(false);
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
    });

    it('leaves a page alone when it is shown after a normal load', () => {
        store('light');
        loadPage();
        store('dark');
        showPage(false);
        expect(isDark()).toBe(false);
    });
});
