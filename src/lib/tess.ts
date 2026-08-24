const API = "https://tess.elixir-europe.org";

const ATTEMPTS: number = 5;
const TIMEOUT_MS = 20_000;

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

// Without an explicit JSON Accept header TESS serves an HTML 403 instead of the
// API response, which is what broke the browser widget this replaced: the error
// page carries no CORS headers, so the failure surfaced as a CORS violation.
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
            await new Promise(r => setTimeout(r, attempt * 1500));
        }
    }
    return { items: [], reachable: false };
}

export const upcomingEvents = (pageSize = 5) =>
    fetchList<TessEvent>("events", { page_size: pageSize, country: ["Norway"] });

export const pastEvents = (pageSize = 10) =>
    fetchList<TessEvent>("events", {
        page_size: pageSize,
        sort: "new",
        country: ["Norway"],
        include_expired: true,
        include_disabled: false,
    });

export const materials = (pageSize = 10) =>
    fetchList<TessMaterial>("materials", { page_size: pageSize, node: ["Norway"] });

/** Link to the event's own registration page, falling back to its TESS entry. */
export function eventLink(event: TessEvent): string {
    return event.url || (event.slug ? `${API}/events/${event.slug}` : API);
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
