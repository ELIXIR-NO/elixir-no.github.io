import { useState, useEffect, useCallback, useRef } from 'react';

type ServiceInfo = {
    title: string;
    website: string;
    logo: string | null;
    slug: string;
};

type Status = 'checking' | 'up' | 'down' | 'unknown';

type ServiceState = {
    status: Status;
    latency: number | null;
    checkedAt: Date | null;
};

const REFRESH_INTERVAL = 60_000;

async function probe(url: string): Promise<{ up: boolean; latency: number }> {
    const start = performance.now();
    try {
        await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(10_000) });
        return { up: true, latency: Math.round(performance.now() - start) };
    } catch {
        return { up: false, latency: Math.round(performance.now() - start) };
    }
}

function StatusDot({ status }: { status: Status }) {
    const colors: Record<Status, string> = {
        checking: 'bg-yellow-400',
        up: 'bg-emerald-500',
        down: 'bg-red-500',
        unknown: 'bg-gray-400',
    };
    return (
        <span className="relative flex h-2.5 w-2.5">
            {status === 'checking' && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
            )}
            {status === 'up' && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            )}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colors[status]}`} />
        </span>
    );
}

function StatusLabel({ status }: { status: Status }) {
    const labels: Record<Status, { text: string; className: string }> = {
        checking: { text: 'Checking', className: 'text-yellow-600 dark:text-yellow-400' },
        up: { text: 'Operational', className: 'text-emerald-600 dark:text-emerald-400' },
        down: { text: 'Unreachable', className: 'text-red-600 dark:text-red-400' },
        unknown: { text: 'Unknown', className: 'text-gray-500 dark:text-gray-400' },
    };
    const { text, className } = labels[status];
    return <span className={`text-xs font-semibold ${className}`}>{text}</span>;
}

function OverallSummary({ states }: { states: Map<string, ServiceState> }) {
    let up = 0, down = 0, checking = 0;
    states.forEach(s => {
        if (s.status === 'up') up++;
        else if (s.status === 'down') down++;
        else if (s.status === 'checking') checking++;
    });
    const total = states.size;
    const allUp = up === total;
    const allChecked = checking === 0;

    return (
        <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/30 bg-white dark:bg-white/[0.02] p-6">
            <div className="flex items-center gap-3">
                {!allChecked ? (
                    <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                        <svg className="h-5 w-5 text-yellow-500 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                ) : allUp ? (
                    <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                        <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                    </div>
                ) : (
                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                        <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                    </div>
                )}
                <div>
                    <p className="text-lg font-semibold text-brand-primary dark:text-white">
                        {!allChecked ? 'Checking services...' : allUp ? 'All systems operational' : `${down} service${down !== 1 ? 's' : ''} unreachable`}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {allChecked
                            ? `${up} of ${total} services responding`
                            : `${checking} remaining`
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
        services.forEach(s => m.set(s.slug, { status: 'checking', latency: null, checkedAt: null }));
        return m;
    });
    const intervalRef = useRef<ReturnType<typeof setInterval>>();

    const checkAll = useCallback(async () => {
        setStates(prev => {
            const next = new Map(prev);
            services.forEach(s => {
                const existing = next.get(s.slug);
                next.set(s.slug, { ...existing!, status: 'checking' });
            });
            return next;
        });

        // Stagger probes slightly to avoid a burst
        for (const service of services) {
            probe(service.website).then(result => {
                setStates(prev => {
                    const next = new Map(prev);
                    next.set(service.slug, {
                        status: result.up ? 'up' : 'down',
                        latency: result.latency,
                        checkedAt: new Date(),
                    });
                    return next;
                });
            });
            // 100ms stagger between probes
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
                    return (
                        <div
                            key={service.slug}
                            className={`group rounded-xl border p-4 transition-colors duration-200 ${
                                state.status === 'up'
                                    ? 'border-emerald-200/60 dark:border-emerald-800/30 bg-emerald-50/30 dark:bg-emerald-950/10'
                                    : state.status === 'down'
                                    ? 'border-red-200/60 dark:border-red-800/30 bg-red-50/30 dark:bg-red-950/10'
                                    : 'border-gray-200/60 dark:border-gray-700/30 bg-white dark:bg-white/[0.02]'
                            }`}
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
                                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                                    <StatusDot status={state.status} />
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                                <StatusLabel status={state.status} />
                                {state.latency !== null && state.status !== 'checking' && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                                        {state.latency}ms
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Status checks run from your browser using no-cors probes. Results reflect reachability from your network.
                Refreshes automatically every 60 seconds.
            </p>
        </div>
    );
}
