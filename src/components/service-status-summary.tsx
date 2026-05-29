import { useState, useEffect, useCallback, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { probe, type Status } from '../lib/service-probe';

type ServiceInfo = {
    title: string;
    website: string;
    slug: string;
};

type Overall = 'idle' | 'checking' | 'operational' | 'issues';

const overallConfig: Record<Overall, { pill: string; dot: string; ping: string | null }> = {
    idle: {
        pill: 'bg-accent/5 border-accent/20 text-accent',
        dot: 'bg-gray-400',
        ping: null,
    },
    checking: {
        pill: 'bg-gray-50 dark:bg-white/[0.03] border-gray-200/70 dark:border-gray-700/40 text-gray-600 dark:text-gray-300',
        dot: 'bg-amber-500',
        ping: 'bg-amber-400',
    },
    operational: {
        pill: 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400',
        dot: 'bg-emerald-500',
        ping: 'bg-emerald-400',
    },
    issues: {
        pill: 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300/70 dark:border-amber-800/40 text-amber-700 dark:text-amber-400',
        dot: 'bg-amber-500',
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

    let checking = 0, up = 0, problems = 0;
    statuses.forEach(s => {
        if (s === 'checking') checking++;
        else if (s === 'ok' || s === 'reachable') up++;
        else problems++; // degraded | error | down
    });
    const total = services.length;

    const overall: Overall = !hydrated
        ? 'idle'
        : checking > 0
        ? 'checking'
        : problems > 0
        ? 'issues'
        : 'operational';

    const cfg = overallConfig[overall];

    const label =
        overall === 'idle' ? 'View live service status'
        : overall === 'checking' ? 'Checking service status…'
        : overall === 'operational' ? 'All systems operational'
        : `${problems} service${problems !== 1 ? 's' : ''} with issues`;

    const countText =
        overall === 'operational' ? `${up}/${total}`
        : overall === 'issues' ? `${up}/${total} up`
        : null;

    return (
        <a
            href={href}
            className={`group mt-5 inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-background ${cfg.pill}`}
        >
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
                {cfg.ping && !reduce && (
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cfg.ping} opacity-75`} />
                )}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
            </span>
            <span className="text-inherit" aria-live="polite">
                {label}
                {countText && <span className="text-inherit ml-1.5 font-medium opacity-75">· {countText}</span>}
            </span>
            <svg
                className="h-3.5 w-3.5 shrink-0 opacity-80 transition-transform duration-200 group-hover:translate-x-0.5"
                fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-hidden="true"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
        </a>
    );
}
