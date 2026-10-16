import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    ANALYTICS_CHOICE_EVENT,
    isAnalyticsChoice,
    readAnalyticsChoice,
    sendsDoNotTrack,
    setAnalyticsChoice,
} from './analytics-consent';

const clearCookies = () => {
    for (const name of ['mtm_consent', 'mtm_consent_removed']) {
        document.cookie = `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/`;
    }
};

const nativeCookie = (() => {
    for (let proto = Object.getPrototypeOf(document); proto; proto = Object.getPrototypeOf(proto)) {
        const descriptor = Object.getOwnPropertyDescriptor(proto, 'cookie');
        if (descriptor) return descriptor;
    }
    throw new Error('document.cookie has no accessor');
})();

// Records every cookie write; with `store: false` the browser refuses them all.
const watchCookieWrites = ({ store = true } = {}) => {
    const writes: string[] = [];
    Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: () => nativeCookie.get!.call(document),
        set: (value: string) => {
            writes.push(value);
            if (store) nativeCookie.set!.call(document, value);
        },
    });
    return writes;
};

const restoreCookies = () => {
    delete (document as { cookie?: string }).cookie;
    vi.unstubAllGlobals();
    clearCookies();
};

// A tracker running on the page, as the Tag Manager container exposes it.
// Records its consent calls and the container events in the order they happen.
const runTracker = () => {
    const calls: string[] = [];
    const tracker = {
        detectsBrowserFeatures: false,
        enableBrowserFeatureDetection() { this.detectsBrowserFeatures = true; },
        // Matomo's own setConsentGiven switches detection on.
        setConsentGiven() {
            calls.push('setConsentGiven');
            this.enableBrowserFeatureDetection();
            if (this.detectsBrowserFeatures) calls.push('detects browser features');
        },
        forgetConsentGiven() {
            calls.push('forgetConsentGiven');
            document.cookie = 'mtm_consent_removed=1; Max-Age=946080000; Path=/';
        },
    };
    window.Matomo = { getAsyncTrackers: () => [tracker] };
    window._mtm = { push: ({ event }: { event: string }) => calls.push(event) } as unknown as object[];
    return calls;
};

const stopTracker = () => {
    delete window.Matomo;
    delete window._mtm;
};

// The pattern Matomo's tracker uses to read a cookie.
const matomoReads = (name: string) => new RegExp(`(^|;)[ ]*${name}=([^;]+)`).test(document.cookie);

describe('readAnalyticsChoice', () => {
    it('is null before any choice', () => {
        expect(readAnalyticsChoice('')).toBeNull();
        expect(readAnalyticsChoice('theme=dark')).toBeNull();
    });

    it('reads each choice', () => {
        expect(readAnalyticsChoice('mtm_consent=1760000000000')).toBe('accepted');
        expect(readAnalyticsChoice('theme=dark; mtm_consent_removed=1760000000000')).toBe('opted-out');
    });

    it('lets the opt-out win when both cookies are present', () => {
        expect(readAnalyticsChoice('mtm_consent=1; mtm_consent_removed=2')).toBe('opted-out');
    });

    it('ignores empty values and look-alike names', () => {
        expect(readAnalyticsChoice('mtm_consent=')).toBeNull();
        expect(readAnalyticsChoice('mtm_consent_extra=1; xmtm_consent=1')).toBeNull();
        expect(readAnalyticsChoice('mtm_consent_removed=; mtm_consent=1')).toBe('accepted');
    });

    it('accepts values that contain an equals sign', () => {
        expect(readAnalyticsChoice('mtm_consent_removed=a=b')).toBe('opted-out');
    });
});

describe('isAnalyticsChoice', () => {
    it('accepts only the two choices', () => {
        expect(isAnalyticsChoice('accepted')).toBe(true);
        expect(isAnalyticsChoice('opted-out')).toBe(true);
        expect(isAnalyticsChoice('opted-in')).toBe(false);
        expect(isAnalyticsChoice(undefined)).toBe(false);
    });
});

describe('setAnalyticsChoice', () => {
    afterEach(restoreCookies);

    it('leaves an opt-out Matomo can read', () => {
        expect(setAnalyticsChoice('opted-out')).toBe(true);
        expect(matomoReads('mtm_consent_removed')).toBe(true);
    });

    it('writes first-party cookies that last a year', () => {
        const writes = watchCookieWrites();
        setAnalyticsChoice('accepted');
        const kept = writes.find((write) => write.startsWith('mtm_consent=') && !write.startsWith('mtm_consent=;'));
        expect(kept).toMatch(/; Max-Age=31536000; Path=\/; SameSite=Lax$/);
    });

    it('marks the cookies Secure on https', () => {
        vi.stubGlobal('location', { protocol: 'https:' });
        const writes = watchCookieWrites({ store: false });
        setAnalyticsChoice('opted-out');
        expect(writes.every((write) => write.endsWith('; Secure'))).toBe(true);
    });

    it('reports a refused cookie and stays quiet about it', () => {
        watchCookieWrites({ store: false });
        const listener = vi.fn();
        document.addEventListener(ANALYTICS_CHOICE_EVENT, listener);
        const stored = setAnalyticsChoice('opted-out');
        document.removeEventListener(ANALYTICS_CHOICE_EVENT, listener);
        expect(stored).toBe(false);
        expect(listener).not.toHaveBeenCalled();
    });

    it('stores an opt-out and clears an earlier acceptance', () => {
        setAnalyticsChoice('accepted');
        setAnalyticsChoice('opted-out');
        expect(document.cookie).not.toMatch(/(^|; )mtm_consent=/);
        expect(readAnalyticsChoice()).toBe('opted-out');
    });

    it('stores an acceptance and clears an earlier opt-out', () => {
        setAnalyticsChoice('opted-out');
        setAnalyticsChoice('accepted');
        expect(document.cookie).not.toMatch(/mtm_consent_removed=/);
        expect(readAnalyticsChoice()).toBe('accepted');
    });

    it('announces the choice so other controls can follow', () => {
        const listener = vi.fn();
        document.addEventListener(ANALYTICS_CHOICE_EVENT, listener);
        setAnalyticsChoice('opted-out');
        document.removeEventListener(ANALYTICS_CHOICE_EVENT, listener);
        expect(listener).toHaveBeenCalledOnce();
        expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe('opted-out');
    });
});

describe('setAnalyticsChoice with Matomo', () => {
    afterEach(() => {
        stopTracker();
        restoreCookies();
    });

    it('releases the held page view and records the opt-in on acceptance', () => {
        const calls = runTracker();
        setAnalyticsChoice('accepted');
        expect(calls).toEqual(['setConsentGiven', 'user_optin']);
    });

    it('records the opt-out of a visitor who had accepted before stopping the tracker', () => {
        const calls = runTracker();
        setAnalyticsChoice('accepted');
        calls.length = 0;
        setAnalyticsChoice('opted-out');
        expect(calls).toEqual(['user_optout', 'forgetConsentGiven']);
    });

    it('keeps browser feature detection off when consent is given', () => {
        const calls = runTracker();
        setAnalyticsChoice('accepted');
        expect(calls).not.toContain('detects browser features');
    });

    it('caps the opt-out cookie Matomo writes at a year', () => {
        runTracker();
        const writes = watchCookieWrites();
        setAnalyticsChoice('opted-out');
        const last = writes.filter((write) => write.startsWith('mtm_consent_removed=')).at(-1);
        expect(last).toMatch(/; Max-Age=31536000;/);
    });

    it('records nothing for a visitor who never accepted', () => {
        const calls = runTracker();
        setAnalyticsChoice('opted-out');
        expect(calls).toEqual(['forgetConsentGiven']);
    });

    it('queues the opt-in for a container that has not loaded yet', () => {
        setAnalyticsChoice('accepted');
        expect(window._mtm).toEqual([{ event: 'user_optin' }]);
    });

    it('leaves the tracker alone when the acceptance cannot be stored', () => {
        const calls = runTracker();
        watchCookieWrites({ store: false });
        expect(setAnalyticsChoice('accepted')).toBe(false);
        expect(calls).toEqual([]);
    });
});

describe('sendsDoNotTrack', () => {
    const nav = (doNotTrack: string | null, msDoNotTrack?: string) => ({ doNotTrack, msDoNotTrack }) as unknown as Navigator;

    it('matches the values Matomo honours', () => {
        expect(sendsDoNotTrack(nav('1'))).toBe(true);
        expect(sendsDoNotTrack(nav(null, 'yes'))).toBe(true);
        expect(sendsDoNotTrack(nav('0'))).toBe(false);
        expect(sendsDoNotTrack(nav(null))).toBe(false);
        expect(sendsDoNotTrack(nav('unspecified'))).toBe(false);
        expect(sendsDoNotTrack(nav(undefined as unknown as null))).toBe(false);
    });
});
