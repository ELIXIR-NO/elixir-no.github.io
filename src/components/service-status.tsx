import { useState, useEffect, useCallback, useRef } from 'react';

type ServiceInfo = {
    title: string;
    website: string;
    logo: string | null;
    slug: string;
};

type Status = 'checking' | 'ok' | 'reachable' | 'degraded' | 'error' | 'down';

type ServiceState = {
    status: Status;
    httpStatus: number | null;
    latency: number | null;
    checkedAt: Date | null;
    detail: string;
};

const REFRESH_INTERVAL = 60_000;
const STATUS_PROXY = 'https://elixir-cms-oauth.vercel.app/status';

type ProbeResult = {
    status: Status;
    httpStatus: number | null;
    latency: number;
    detail: string;
};

function classifyHttpCode(code: number): { status: Status; detail: string } {
    if (code >= 200 && code < 300) return { status: 'ok', detail: `HTTP ${code}` };
    if (code >= 300 && code < 400) return { status: 'ok', detail: `HTTP ${code} (redirect)` };
    if (code >= 400 && code < 500) return { status: 'degraded', detail: `HTTP ${code}` };
    return { status: 'error', detail: `HTTP ${code}` };
}

async function probe(url: string): Promise<ProbeResult> {
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

async function probeClientFallback(url: string): Promise<ProbeResult> {
    const start = performance.now();
    const elapsed = () => Math.round(performance.now() - start);
    try {
        await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(10_000) });
        return { status: 'reachable', httpStatus: null, latency: elapsed(), detail: 'Proxy unavailable — reachability only' };
    } catch {
        return { status: 'down', httpStatus: null, latency: elapsed(), detail: 'Connection failed' };
    }
}

const statusConfig: Record<Status, {
    dot: string;
    ping: string | null;
    label: string;
    labelClass: string;
    cardBorder: string;
    cardBg: string;
}> = {
    checking: {
        dot: 'bg-yellow-400',
        ping: 'bg-yellow-400',
        label: 'Checking',
        labelClass: 'text-yellow-600 dark:text-yellow-400',
        cardBorder: 'border-gray-200/60 dark:border-gray-700/30',
        cardBg: 'bg-white dark:bg-white/[0.02]',
    },
    ok: {
        dot: 'bg-emerald-500',
        ping: 'bg-emerald-400',
        label: 'Operational',
        labelClass: 'text-emerald-600 dark:text-emerald-400',
        cardBorder: 'border-emerald-200/60 dark:border-emerald-800/30',
        cardBg: 'bg-emerald-50/30 dark:bg-emerald-950/10',
    },
    reachable: {
        dot: 'bg-sky-500',
        ping: null,
        label: 'Reachable',
        labelClass: 'text-sky-600 dark:text-sky-400',
        cardBorder: 'border-sky-200/60 dark:border-sky-800/30',
        cardBg: 'bg-sky-50/30 dark:bg-sky-950/10',
    },
    degraded: {
        dot: 'bg-amber-500',
        ping: null,
        label: 'Degraded',
        labelClass: 'text-amber-600 dark:text-amber-400',
        cardBorder: 'border-amber-200/60 dark:border-amber-800/30',
        cardBg: 'bg-amber-50/30 dark:bg-amber-950/10',
    },
    error: {
        dot: 'bg-red-500',
        ping: null,
        label: 'Error',
        labelClass: 'text-red-600 dark:text-red-400',
        cardBorder: 'border-red-200/60 dark:border-red-800/30',
        cardBg: 'bg-red-50/30 dark:bg-red-950/10',
    },
    down: {
        dot: 'bg-red-500',
        ping: null,
        label: 'Unreachable',
        labelClass: 'text-red-600 dark:text-red-400',
        cardBorder: 'border-red-200/60 dark:border-red-800/30',
        cardBg: 'bg-red-50/30 dark:bg-red-950/10',
    },
};

function StatusDot({ status }: { status: Status }) {
    const cfg = statusConfig[status];
    return (
        <span className="relative flex h-2.5 w-2.5">
            {cfg.ping && (
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cfg.ping} opacity-50`} />
            )}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
        </span>
    );
}

function OverallSummary({ states }: { states: Map<string, ServiceState> }) {
    let ok = 0, reachable = 0, degraded = 0, errored = 0, down = 0, checking = 0;
    states.forEach(s => {
        if (s.status === 'ok') ok++;
        else if (s.status === 'reachable') reachable++;
        else if (s.status === 'degraded') degraded++;
        else if (s.status === 'error') errored++;
        else if (s.status === 'down') down++;
        else checking++;
    });
    const total = states.size;
    const allChecked = checking === 0;
    const allOk = ok === total;
    const confirmed = ok + reachable;
    const problems = degraded + errored + down;

    return (
        <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/30 bg-white dark:bg-white/[0.02] p-6">
            <div className="flex items-center gap-3">
                {!allChecked ? (
                    <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center shrink-0">
                        <svg className="h-5 w-5 text-yellow-500 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                ) : allOk ? (
                    <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                        <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                    </div>
                ) : problems > 0 ? (
                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                        <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                    </div>
                ) : (
                    <div className="h-10 w-10 rounded-full bg-sky-100 dark:bg-sky-900/20 flex items-center justify-center shrink-0">
                        <svg className="h-5 w-5 text-sky-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                        </svg>
                    </div>
                )}
                <div>
                    <p className="text-lg font-semibold text-brand-primary dark:text-white">
                        {!allChecked
                            ? 'Checking services...'
                            : allOk
                            ? 'All systems operational'
                            : problems > 0
                            ? `${problems} service${problems !== 1 ? 's' : ''} with issues`
                            : `${ok} confirmed operational`
                        }
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {allChecked
                            ? [
                                ok > 0 ? `${ok} operational` : null,
                                reachable > 0 ? `${reachable} reachable (unverified)` : null,
                                degraded > 0 ? `${degraded} degraded` : null,
                                errored > 0 ? `${errored} errored` : null,
                                down > 0 ? `${down} unreachable` : null,
                            ].filter(Boolean).join(' · ')
                            : `${total - checking} of ${total} checked`
                        }
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function ServiceStatus({ services }: { services: ServiceInfo[] }) {
    const [states, setStates] = useState<Map<string, ServiceState>>(() => {
        const m = new Map<string, ServiceState>();
        services.forEach(s => m.set(s.slug, {
            status: 'checking', httpStatus: null, latency: null, checkedAt: null, detail: '',
        }));
        return m;
    });
    const intervalRef = useRef<ReturnType<typeof setInterval>>();

    const checkAll = useCallback(async () => {
        setStates(prev => {
            const next = new Map(prev);
            services.forEach(s => {
                next.set(s.slug, { ...next.get(s.slug)!, status: 'checking', detail: '' });
            });
            return next;
        });

        for (const service of services) {
            probe(service.website).then(result => {
                setStates(prev => {
                    const next = new Map(prev);
                    next.set(service.slug, {
                        status: result.status,
                        httpStatus: result.httpStatus,
                        latency: result.latency,
                        checkedAt: new Date(),
                        detail: result.detail,
                    });
                    return next;
                });
            });
            await new Promise(r => setTimeout(r, 100));
        }
    }, [services]);

    useEffect(() => {
        checkAll();
        intervalRef.current = setInterval(checkAll, REFRESH_INTERVAL);
        return () => clearInterval(intervalRef.current);
    }, [checkAll]);

    const servicesWithWebsite = services.filter(s => s.website);

    return (
        <div className="space-y-6">
            <OverallSummary states={states} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {servicesWithWebsite.map(service => {
                    const state = states.get(service.slug)!;
                    const cfg = statusConfig[state.status];
                    return (
                        <div
                            key={service.slug}
                            className={`rounded-xl border p-4 transition-colors duration-200 ${cfg.cardBorder} ${cfg.cardBg}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    {service.logo ? (
                                        <div className="h-9 w-9 shrink-0 rounded-lg bg-white dark:bg-gray-100 border border-gray-200/40 dark:border-gray-200/20 flex items-center justify-center p-1 overflow-hidden">
                                            <img
                                                src={service.logo}
                                                alt=""
                                                aria-hidden="true"
                                                className="w-full h-full object-contain"
                                                loading="lazy"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-9 w-9 shrink-0 rounded-lg bg-accent/10 flex items-center justify-center" aria-hidden="true">
                                            <span className="text-sm font-bold text-accent">{service.title.charAt(0)}</span>
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-brand-primary dark:text-white truncate">
                                            {service.title}
                                        </p>
                                        <a
                                            href={service.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-gray-500 dark:text-gray-400 hover:text-accent transition-colors truncate block"
                                        >
                                            {new URL(service.website).hostname}
                                        </a>
                                    </div>
                                </div>
                                <div className="shrink-0 pt-0.5">
                                    <StatusDot status={state.status} />
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`text-xs font-semibold ${cfg.labelClass}`}>
                                        {cfg.label}
                                    </span>
                                    {state.httpStatus !== null && (
                                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                                            state.httpStatus >= 200 && state.httpStatus < 300
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                : state.httpStatus >= 300 && state.httpStatus < 400
                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                : state.httpStatus >= 400 && state.httpStatus < 500
                                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                        }`}>
                                            {state.httpStatus}
                                        </span>
                                    )}
                                </div>
                                {state.latency !== null && state.status !== 'checking' && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
                                        {state.latency}ms
                                    </span>
                                )}
                            </div>

                            {state.detail && state.status !== 'checking' && (
                                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {state.detail}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Checks HTTP status codes when CORS allows, falls back to reachability probes otherwise.
                Results reflect your network. Refreshes every 60 seconds.
            </p>
        </div>
    );
}
