const API = "https://tess.elixir-europe.org";

// Sized for someone waiting on the page: one slow TESS response is tolerated,
// a dead one gives way to the "could not be loaded" state inside a minute.
const ATTEMPTS: number = 3;
const TIMEOUT_MS = 15_000;

export interface TessEvent {
    id: number;
    title: string;
    url: string;
    slug?: string;
    description?: string;
    start?: string;
    end?: string;
    venue?: string;
    city?: string;
    country?: string;
    organizer?: string;
}

export interface TessMaterial {
    id: number;
    title: string;
    url: string;
    description?: string;
    doi?: string;
}

type Params = Record<string, string | number | boolean | string[]>;

/**
 * `reachable` separates "TESS has nothing to list" from "TESS never answered".
 * Both leave `items` empty, and rendering them the same way is what let the old
 * widget show a plausible-looking empty state over a dead feed for months.
 */
export interface TessResult<T> {
    items: T[];
    reachable: boolean;
}

function query(params: Params): string {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        // TESS expects repeated bracketed keys for arrays: country[]=Norway
        if (Array.isArray(value)) value.forEach(v => q.append(`${key}[]`, v));
        else q.append(key, String(value));
    }
    return q.toString();
}

// Without an explicit JSON Accept header TESS serves an HTML 403 with no CORS
// headers, which the browser reports as a CORS failure. Accept is also the only
// header sent, and that is deliberate: it keeps this a simple request, because
// TESS answers the preflight a custom header would trigger with a 403.
// TESS also returns 5xx intermittently, hence the retries.
async function fetchList<T>(path: string, params: Params): Promise<TessResult<T>> {
    const url = `${API}/${path}?${query(params)}`;

    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        try {
            const res = await fetch(url, {
                headers: { Accept: "application/json" },
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const body = await res.json();
            if (!Array.isArray(body)) throw new Error("expected a JSON array");
            return { items: body as T[], reachable: true };
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            if (attempt === ATTEMPTS) {
                const tries = ATTEMPTS === 1 ? "1 attempt" : `${ATTEMPTS} attempts`;
                console.warn(`[tess] ${path} failed after ${tries} (${reason}); the section will say so`);
                return { items: [], reachable: false };
            }
            await new Promise(r => setTimeout(r, attempt * 1000));
        }
    }
    return { items: [], reachable: false };
}

export const upcomingEvents = (pageSize = 5) =>
    fetchList<TessEvent>("events", { page_size: pageSize, country: ["Norway"] });

const hasEnded = (event: TessEvent) => Date.parse(event.end ?? event.start ?? "") < Date.now();

// include_expired adds ended events to the upcoming ones rather than replacing
// them, so the ones still to come are filtered out here; fetching double keeps
// the list full once they are gone. "late" sorts by start date, newest first.
export async function pastEvents(pageSize = 10): Promise<TessResult<TessEvent>> {
    const result = await fetchList<TessEvent>("events", {
        page_size: pageSize * 2,
        sort: "late",
        country: ["Norway"],
        include_expired: true,
        include_disabled: false,
    });
    return { ...result, items: result.items.filter(hasEnded).slice(0, pageSize) };
}

export const materials = (pageSize = 10) =>
    fetchList<TessMaterial>("materials", { page_size: pageSize, node: ["Norway"] });

/** The same listings on TESS itself, for "browse all" links and fallbacks. */
export const browseLinks = {
    upcoming: `${API}/events?country[]=Norway`,
    past: `${API}/events?country[]=Norway&include_expired=true`,
    materials: `${API}/materials?node[]=Norway`,
} as const;

// These URLs come from a feed we do not control and go straight into an href.
// Anything that is not http(s), a `javascript:` URL being the case that matters,
// is dropped for a TESS address we build ourselves.
function safeUrl(raw: string | undefined, fallback: string): string {
    if (!raw) return fallback;
    try {
        const { protocol } = new URL(raw);
        return protocol === "http:" || protocol === "https:" ? raw : fallback;
    } catch {
        return fallback;
    }
}

/** Link to the event's own registration page, falling back to its TESS entry. */
export function eventLink(event: TessEvent): string {
    const onTess = event.slug
        ? `${API}/events/${encodeURIComponent(event.slug)}`
        : `${API}/events`;
    return safeUrl(event.url, onTess);
}

/** Link to the material on TESS, falling back to the Norwegian listing. */
export function materialLink(material: TessMaterial): string {
    return safeUrl(material.url, browseLinks.materials);
}

/** "12 Mar 2026", or a range when the event spans more than one day. */
export function eventDates(event: TessEvent): string {
    const fmt = (iso: string) =>
        new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

    if (!event.start) return "";
    const start = fmt(event.start);
    if (!event.end) return start;

    const end = fmt(event.end);
    return start === end ? start : `${start} to ${end}`;
}

// Venue is left out on purpose. TESS stores a full street address there and
// often a doubled one ("Moltke Moes vei,  Moltke Moes vei"), which is noise in a
// one-line summary; the linked event page carries the address.
/** "Oslo, Norway", skipping whichever part TESS left blank. */
export function eventPlace(event: TessEvent): string {
    return [event.city, event.country].filter(Boolean).join(", ");
}
