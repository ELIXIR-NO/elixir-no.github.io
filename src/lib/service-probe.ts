// Shared client-side reachability probing for ELIXIR Norway services.
// Used by the detailed status page (service-status.tsx) and the compact
// index pill (service-status-summary.tsx). Keep this framework-agnostic.

export type Status = 'checking' | 'ok' | 'reachable' | 'degraded' | 'error' | 'down';

export type ProbeResult = {
    status: Status;
    httpStatus: number | null;
    latency: number;
    detail: string;
};

export const STATUS_PROXY = 'https://elixir-cms-oauth.vercel.app/status';

export function classifyHttpCode(code: number): { status: Status; detail: string } {
    if (code >= 200 && code < 300) return { status: 'ok', detail: `HTTP ${code}` };
    if (code >= 300 && code < 400) return { status: 'ok', detail: `HTTP ${code} (redirect)` };
    if (code >= 400 && code < 500) return { status: 'degraded', detail: `HTTP ${code}` };
    return { status: 'error', detail: `HTTP ${code}` };
}

export async function probe(url: string): Promise<ProbeResult> {
    // Route through server-side proxy to bypass CORS and get real status codes
    const proxyUrl = `${STATUS_PROXY}?url=${encodeURIComponent(url)}&origin=${encodeURIComponent(window.location.origin)}`;
    try {
        const res = await fetch(proxyUrl, {
            cache: 'no-store',
            signal: AbortSignal.timeout(15_000),
        });
        const data = await res.json();

        if (data.status !== null) {
            const { status, detail } = classifyHttpCode(data.status);
            return { status, httpStatus: data.status, latency: data.latency, detail };
        }
        // Server-side fetch failed (connection refused, DNS, expired cert, etc.)
        return {
            status: 'down',
            httpStatus: null,
            latency: data.latency,
            detail: data.error || 'Connection failed',
        };
    } catch {
        // Proxy itself is unreachable — fall back to client-side no-cors probe
        return probeClientFallback(url);
    }
}

export async function probeClientFallback(url: string): Promise<ProbeResult> {
    const start = performance.now();
    const elapsed = () => Math.round(performance.now() - start);
    try {
        await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(10_000) });
        return { status: 'reachable', httpStatus: null, latency: elapsed(), detail: 'Proxy unavailable — reachability only' };
    } catch {
        return { status: 'down', httpStatus: null, latency: elapsed(), detail: 'Connection failed' };
    }
}
