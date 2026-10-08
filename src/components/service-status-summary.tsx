import { useState, useEffect, useCallback, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { probe, type Status } from '../lib/service-probe';

type ServiceInfo = {
    title: string;
    website: string;
    slug: string;
};

type Overall = 'idle' | 'checking' | 'operational' | 'reachable' | 'issues';

const overallConfig: Record<Overall, { dot: string; ping: string | null }> = {
    idle: {
        dot: 'bg-muted',
        ping: null,
    },
    checking: {
        dot: 'bg-amber-600 dark:bg-amber-400',
        ping: 'bg-amber-500 dark:bg-amber-400',
    },
    operational: {
        dot: 'bg-emerald-600 dark:bg-emerald-400',
        ping: null,
    },
    // Probes that only confirmed reachability (no-cors fallback when the proxy is
    // unavailable) — reachable but HTTP status unverified. Mirrors the detailed
    // status page's distinct "reachable" bucket so the pill never claims
    // "operational" for unverified results.
    reachable: {
        dot: 'bg-sky-600 dark:bg-sky-400',
        ping: null,
    },
    issues: {
        dot: 'bg-amber-600 dark:bg-amber-400',
        ping: null,
    },
};

export default function ServiceStatusSummary({ services, href }: { services: ServiceInfo[]; href: string }) {
    const reduce = useReducedMotion();
    const [statuses, setStatuses] = useState<Map<string, Status>>(() => {
        const m = new Map<string, Status>();
        services.forEach(s => m.set(s.slug, 'checking'));
        return m;
    });
    // Until the first check runs we render `idle` — this matches the server-rendered
    // markup (no hydration mismatch) and is the no-JS fallback.
    const [hydrated, setHydrated] = useState(false);
    const cancelledRef = useRef(false);

    const checkAll = useCallback(async () => {
        setStatuses(prev => {
            const next = new Map(prev);
            services.forEach(s => next.set(s.slug, 'checking'));
            return next;
        });
        for (const service of services) {
            probe(service.website).then(result => {
                if (cancelledRef.current) return;
                setStatuses(prev => {
                    const next = new Map(prev);
                    next.set(service.slug, result.status);
                    return next;
                });
            });
            await new Promise(r => setTimeout(r, 100));
        }
    }, [services]);

    useEffect(() => {
        cancelledRef.current = false;
        setHydrated(true);
        checkAll();
        const onVisible = () => {
            if (document.visibilityState === 'visible') checkAll();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelledRef.current = true;
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [checkAll]);

    let checking = 0, ok = 0, reachable = 0, problems = 0;
    statuses.forEach(s => {
        if (s === 'checking') checking++;
        else if (s === 'ok') ok++;
        else if (s === 'reachable') reachable++;
        else problems++; // degraded | error | down
    });
    const total = services.length;
    const up = ok + reachable; // confirmed reachable (verified or not)

    const overall: Overall = !hydrated
        ? 'idle'
        : checking > 0
        ? 'checking'
        : problems > 0
        ? 'issues'
        : reachable > 0
        ? 'reachable' // no problems, but some only reachable (HTTP status unverified)
        : 'operational';

    const cfg = overallConfig[overall];

    const label =
        overall === 'idle' ? 'View live service status'
        : overall === 'checking' ? 'Checking service status…'
        : overall === 'operational' ? 'All systems operational'
        : overall === 'reachable' ? 'Services reachable'
        : `${problems} service${problems !== 1 ? 's' : ''} with issues`;

    const countText =
        overall === 'operational' ? `${up}/${total}`
        : overall === 'reachable' ? `${up}/${total} reachable`
        : overall === 'issues' ? `${up}/${total} up`
        : null;

    return (
        <a
            href={href}
            className="group mt-5 inline-flex h-9 items-center gap-2.5 rounded-control border border-rule bg-surface px-3 text-sm font-medium text-ink transition-colors hover:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
            <span className="relative flex h-2 w-2 rounded-marker shrink-0" aria-hidden="true">
                {cfg.ping && !reduce && (
                    <span className={`absolute inline-flex h-full w-full rounded-marker animate-ping ${cfg.ping} opacity-75`} />
                )}
                <span className={`relative inline-flex h-2 w-2 rounded-marker ${cfg.dot}`} />
            </span>
            <span className="text-inherit" aria-live="polite">
                {label}
                {countText && <span className="ml-1.5 font-mono text-xs text-muted">· {countText}</span>}
            </span>
            <ArrowRightIcon
                className="h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
            />
        </a>
    );
}
