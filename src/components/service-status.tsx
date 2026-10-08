import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { probe, type Status } from '../lib/service-probe';

type ServiceInfo = {
    title: string;
    website: string;
    logo: string | null;
    slug: string;
};

type ServiceState = {
    status: Status;
    httpStatus: number | null;
    latency: number | null;
    checkedAt: Date | null;
    detail: string;
};

const REFRESH_INTERVAL = 60_000;

const statusConfig: Record<Status, {
    dot: string;
    label: string;
    labelClass: string;
}> = {
    checking: {
        dot: 'bg-muted',
        label: 'Checking',
        labelClass: 'text-muted',
    },
    ok: {
        dot: 'bg-emerald-600 dark:bg-emerald-400',
        label: 'Operational',
        labelClass: 'text-emerald-700 dark:text-emerald-400',
    },
    reachable: {
        dot: 'bg-sky-600 dark:bg-sky-400',
        label: 'Reachable',
        labelClass: 'text-sky-700 dark:text-sky-400',
    },
    degraded: {
        dot: 'bg-amber-600 dark:bg-amber-400',
        label: 'Degraded',
        labelClass: 'text-amber-700 dark:text-amber-400',
    },
    error: {
        dot: 'bg-red-600 dark:bg-red-400',
        label: 'Error',
        labelClass: 'text-red-700 dark:text-red-400',
    },
    down: {
        dot: 'bg-red-600 dark:bg-red-400',
        label: 'Unreachable',
        labelClass: 'text-red-700 dark:text-red-400',
    },
};

function StatusDot({ status }: { status: Status }) {
    return <span className={`block h-2 w-2 rounded-marker ${statusConfig[status].dot}`} />;
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
        <div className="rounded-card border border-rule bg-surface p-5">
            <div className="flex items-center gap-3">
                {!allChecked ? (
                    <div className="h-9 w-9 rounded-control border border-rule flex items-center justify-center shrink-0">
                        <svg className="h-5 w-5 text-muted animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                ) : allOk ? (
                    <div className="h-9 w-9 rounded-control border border-rule flex items-center justify-center shrink-0">
                        <CheckIcon className="h-5 w-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                    </div>
                ) : problems > 0 ? (
                    <div className="h-9 w-9 rounded-control border border-rule flex items-center justify-center shrink-0">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-700 dark:text-red-400" aria-hidden="true" />
                    </div>
                ) : (
                    <div className="h-9 w-9 rounded-control border border-rule flex items-center justify-center shrink-0">
                        <InformationCircleIcon className="h-5 w-5 text-sky-700 dark:text-sky-400" aria-hidden="true" />
                    </div>
                )}
                <div>
                    <p className="text-lg font-semibold text-ink">
                        {!allChecked
                            ? 'Checking services...'
                            : allOk
                            ? 'All systems operational'
                            : problems > 0
                            ? `${problems} service${problems !== 1 ? 's' : ''} with issues`
                            : `${ok} confirmed operational`
                        }
                    </p>
                    <p className="text-sm text-muted">
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
                            className="rounded-card border border-rule bg-surface p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    {service.logo ? (
                                        <div className="h-9 w-9 shrink-0 rounded-control bg-white border border-rule flex items-center justify-center p-1 overflow-hidden">
                                            <img
                                                src={service.logo}
                                                alt=""
                                                aria-hidden="true"
                                                className="w-full h-full object-contain"
                                                loading="lazy"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-9 w-9 shrink-0 rounded-control border border-rule flex items-center justify-center" aria-hidden="true">
                                            <span className="text-sm font-semibold text-ink">{service.title.charAt(0)}</span>
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-ink truncate">
                                            {service.title}
                                        </p>
                                        <a
                                            href={service.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-mono text-muted hover:text-accent transition-colors truncate block"
                                        >
                                            {new URL(service.website).hostname}
                                        </a>
                                    </div>
                                </div>
                                <div className="shrink-0 pt-1.5">
                                    <StatusDot status={state.status} />
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`text-xs font-semibold ${cfg.labelClass}`}>
                                        {cfg.label}
                                    </span>
                                    {state.httpStatus !== null && (
                                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded-chip border border-rule ${
                                            state.httpStatus >= 200 && state.httpStatus < 300
                                                ? 'text-emerald-700 dark:text-emerald-400'
                                                : state.httpStatus >= 300 && state.httpStatus < 400
                                                ? 'text-sky-700 dark:text-sky-400'
                                                : state.httpStatus >= 400 && state.httpStatus < 500
                                                ? 'text-amber-700 dark:text-amber-400'
                                                : 'text-red-700 dark:text-red-400'
                                        }`}>
                                            {state.httpStatus}
                                        </span>
                                    )}
                                </div>
                                {state.latency !== null && state.status !== 'checking' && (
                                    <span className="text-xs font-mono text-muted tabular-nums shrink-0">
                                        {state.latency}ms
                                    </span>
                                )}
                            </div>

                            {state.detail && state.status !== 'checking' && (
                                <p className="mt-1.5 text-xs text-muted truncate">
                                    {state.detail}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <p className="text-xs text-muted">
                Checks HTTP status codes when CORS allows, falls back to reachability probes otherwise.
                Results reflect your network. Refreshes every 60 seconds.
            </p>
        </div>
    );
}
