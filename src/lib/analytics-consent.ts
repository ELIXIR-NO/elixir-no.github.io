// The visitor's Matomo analytics choice, kept in the cookies Matomo's tracker
// reads itself: while mtm_consent_removed is set it sends nothing, checked
// before every request. The Tag Manager container tracks cookieless without
// requiring consent, so no choice means tracked. Accepting still writes
// mtm_consent, so switching the container to require consent needs no change
// here. Never call the tracker's consent API instead: setConsentGiven turns
// cookies back on for a container configured to run without them.

export type AnalyticsChoice = 'accepted' | 'opted-out';

export const ANALYTICS_CHOICE_EVENT = 'analytics-choice';

const CONSENT_COOKIE = 'mtm_consent';
const CONSENT_REMOVED_COOKIE = 'mtm_consent_removed';

// A choice lasts a year; then the banner asks again.
const CHOICE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

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

export function setAnalyticsChoice(choice: AnalyticsChoice) {
    const [kept, cleared] = choice === 'accepted'
        ? [CONSENT_COOKIE, CONSENT_REMOVED_COOKIE]
        : [CONSENT_REMOVED_COOKIE, CONSENT_COOKIE];
    writeCookie(cleared, '', 'Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    writeCookie(kept, String(Date.now()), `Max-Age=${CHOICE_MAX_AGE_SECONDS}`);
    document.dispatchEvent(new CustomEvent<AnalyticsChoice>(ANALYTICS_CHOICE_EVENT, { detail: choice }));
}

// The same signal Matomo's enableDoNotTrack honours: with it on, nothing is recorded.
export function sendsDoNotTrack(nav: Navigator = navigator): boolean {
    const signal = nav.doNotTrack || (nav as Navigator & { msDoNotTrack?: string }).msDoNotTrack;
    return signal === '1' || signal === 'yes';
}
