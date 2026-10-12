// The visitor's Matomo analytics choice, kept in the cookies Matomo's tracker
// reads itself. The Tag Manager container tracks cookieless without requiring
// consent, so no choice means tracked. Even with cookies disabled the tracker
// checks mtm_consent_removed before every request and sends nothing while it
// is set. It ignores mtm_consent in that mode, so that cookie only lets the
// banner remember an acceptance, and requiring consent in the container would
// stop tracking for everyone. Never call the tracker's consent API instead:
// setConsentGiven turns cookies back on.

export type AnalyticsChoice = 'accepted' | 'opted-out';

export const ANALYTICS_CHOICE_EVENT = 'analytics-choice';

const CONSENT_COOKIE = 'mtm_consent';
const CONSENT_REMOVED_COOKIE = 'mtm_consent_removed';

// A choice lasts a year from the latest visit; then the banner asks again.
const CHOICE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

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

// Returns false when the browser refuses the cookie, so the choice did not stick.
export function setAnalyticsChoice(choice: AnalyticsChoice): boolean {
    storeChoice(choice);
    if (readAnalyticsChoice() !== choice) return false;
    document.dispatchEvent(new CustomEvent<AnalyticsChoice>(ANALYTICS_CHOICE_EVENT, { detail: choice }));
    return true;
}

// Rewrites the stored choice so its lifetime counts from this visit. Browsers
// cut script-set cookies short (Safari after 7 days without a visit), and an
// opt-out that lapsed would let tracking resume before the banner asks again.
export function renewAnalyticsChoice() {
    const choice = readAnalyticsChoice();
    if (choice) storeChoice(choice);
}

// The same signal Matomo's enableDoNotTrack honours: with it on, nothing is recorded.
export function sendsDoNotTrack(nav: Navigator = navigator): boolean {
    const signal = nav.doNotTrack || (nav as Navigator & { msDoNotTrack?: string }).msDoNotTrack;
    return signal === '1' || signal === 'yes';
}
