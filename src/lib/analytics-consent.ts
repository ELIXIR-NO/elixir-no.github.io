// The visitor's Matomo analytics choice. The Tag Manager container requires
// consent, so the tracker sends nothing and sets no cookies until the visitor
// accepts. The choice lives in the two cookies the tracker reads when it
// starts; a tracker already running on the page is told directly, so an
// acceptance sends the page view it held back and an opt-out deletes its
// cookies at once.

export type AnalyticsChoice = 'accepted' | 'opted-out';

export const ANALYTICS_CHOICE_EVENT = 'analytics-choice';

const CONSENT_COOKIE = 'mtm_consent';
const CONSENT_REMOVED_COOKIE = 'mtm_consent_removed';

// A choice lasts a year; then the banner asks again.
const CHOICE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

interface MatomoTracker {
    setConsentGiven(): void;
    forgetConsentGiven(): void;
}

declare global {
    interface Window {
        _mtm?: object[];
        Matomo?: { getAsyncTrackers(): MatomoTracker[] };
    }
}

export function isAnalyticsChoice(value: unknown): value is AnalyticsChoice {
    return value === 'accepted' || value === 'opted-out';
}

// Matomo counts a cookie only when its value is non-empty.
function hasCookie(cookies: string, name: string): boolean {
    return cookies.split(';').some((pair) => {
        const [key, value = ''] = pair.trim().split('=');
        return key === name && value !== '';
    });
}

export function readAnalyticsChoice(cookies: string = document.cookie): AnalyticsChoice | null {
    // Removal wins when both are present, as it does in Matomo.
    if (hasCookie(cookies, CONSENT_REMOVED_COOKIE)) return 'opted-out';
    if (hasCookie(cookies, CONSENT_COOKIE)) return 'accepted';
    return null;
}

function writeCookie(name: string, value: string, lifetime: string) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${value}; ${lifetime}; Path=/; SameSite=Lax${secure}`;
}

function storeChoice(choice: AnalyticsChoice) {
    const [kept, cleared] = choice === 'accepted'
        ? [CONSENT_COOKIE, CONSENT_REMOVED_COOKIE]
        : [CONSENT_REMOVED_COOKIE, CONSENT_COOKIE];
    writeCookie(cleared, '', 'Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    writeCookie(kept, String(Date.now()), `Max-Age=${CHOICE_MAX_AGE_SECONDS}`);
}

function runningTrackers(): MatomoTracker[] {
    return window.Matomo?.getAsyncTrackers() ?? [];
}

// The container records these as Privacy events, but only while the visitor consents.
function recordChoiceEvent(event: 'user_optin' | 'user_optout') {
    (window._mtm ??= []).push({ event });
}

// Returns false when the browser refuses the cookie, so the choice did not stick.
export function setAnalyticsChoice(choice: AnalyticsChoice): boolean {
    if (choice === 'opted-out') {
        // Only a visitor who accepted earlier can be counted: sending the event for
        // anyone else would record a visit from someone who just said no.
        if (readAnalyticsChoice() === 'accepted') recordChoiceEvent('user_optout');
        runningTrackers().forEach((tracker) => tracker.forgetConsentGiven());
    }
    storeChoice(choice);
    if (readAnalyticsChoice() !== choice) return false;
    if (choice === 'accepted') {
        runningTrackers().forEach((tracker) => tracker.setConsentGiven());
        recordChoiceEvent('user_optin');
    }
    document.dispatchEvent(new CustomEvent<AnalyticsChoice>(ANALYTICS_CHOICE_EVENT, { detail: choice }));
    return true;
}

// The same signal Matomo's enableDoNotTrack honours: with it on, nothing is recorded.
export function sendsDoNotTrack(nav: Navigator = navigator): boolean {
    const signal = nav.doNotTrack || (nav as Navigator & { msDoNotTrack?: string }).msDoNotTrack;
    return signal === '1' || signal === 'yes';
}
