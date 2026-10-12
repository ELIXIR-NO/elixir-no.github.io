import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_CHOICE_EVENT, readAnalyticsChoice, sendsDoNotTrack, setAnalyticsChoice } from './analytics-consent';

const clearCookies = () => {
    for (const name of ['mtm_consent', 'mtm_consent_removed']) {
        document.cookie = `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/`;
    }
};

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
    });
});

describe('setAnalyticsChoice', () => {
    afterEach(clearCookies);

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

describe('sendsDoNotTrack', () => {
    const nav = (doNotTrack: string | null, msDoNotTrack?: string) => ({ doNotTrack, msDoNotTrack }) as unknown as Navigator;

    it('matches the values Matomo honours', () => {
        expect(sendsDoNotTrack(nav('1'))).toBe(true);
        expect(sendsDoNotTrack(nav(null, 'yes'))).toBe(true);
        expect(sendsDoNotTrack(nav('0'))).toBe(false);
        expect(sendsDoNotTrack(nav(null))).toBe(false);
    });
});
