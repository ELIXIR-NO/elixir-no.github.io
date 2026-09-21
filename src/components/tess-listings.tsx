import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { BookOpenIcon, CalendarIcon, ExclamationTriangleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import {
    browseLinks,
    eventDates,
    eventLink,
    eventPlace,
    materialLink,
    materials,
    pastEvents,
    upcomingEvents,
    type TessResult,
} from '../lib/tess';

const ITEM = 'py-4 first:pt-0 last:pb-0';
const ITEM_LINK = 'group -m-2 block rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const ITEM_TITLE = 'font-semibold text-brand-primary dark:text-white transition-colors group-hover:text-accent';
const LIST = 'divide-y divide-gray-200/60 dark:divide-gray-700/30';

/** Null while TESS is still being asked. */
function useTess<T>(load: () => Promise<TessResult<T>>): TessResult<T> | null {
    const [result, setResult] = useState<TessResult<T> | null>(null);
    useEffect(() => {
        load().then(setResult);
    }, [load]);
    return result;
}

function Loading({ label }: { label: string }) {
    return (
        <div role="status">
            <span className="sr-only">{label}</span>
            <div className={LIST} aria-hidden="true">
                {[0, 1, 2].map(row => (
                    <div key={row} className={`${ITEM} motion-safe:animate-pulse`}>
                        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="mt-2 h-3 w-1/3 rounded bg-gray-100 dark:bg-white/5" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function Empty({ icon: Icon, children }: { icon: ComponentType<SVGProps<SVGSVGElement>>; children: ReactNode }) {
    return (
        <p className="flex items-center justify-center py-10 text-sm text-gray-500 dark:text-gray-400">
            <Icon className="mr-2 h-5 w-5" aria-hidden="true" />
            {children}
        </p>
    );
}

function Unavailable({ href }: { href: string }) {
    return (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
                This listing could not be loaded from TeSS right now.
            </p>
            <a href={href} target="_blank" rel="noopener noreferrer"
               className="rounded text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                Browse it on TeSS instead
            </a>
        </div>
    );
}

export function TessEvents({ when }: { when: 'upcoming' | 'past' }) {
    const result = useTess(when === 'upcoming' ? upcomingEvents : pastEvents);

    if (!result) return <Loading label={`Loading ${when} training events from TeSS`} />;
    if (!result.reachable) return <Unavailable href={browseLinks[when]} />;
    if (result.items.length === 0) {
        return (
            <Empty icon={CalendarIcon}>
                {when === 'upcoming' ? 'No upcoming training events at the moment.' : 'No past training events to show.'}
            </Empty>
        );
    }

    return (
        <ul className={LIST}>
            {result.items.map(event => (
                <li key={event.id} className={ITEM}>
                    <a href={eventLink(event)} target="_blank" rel="noopener noreferrer" className={ITEM_LINK}>
                        <p className={ITEM_TITLE}>{event.title}</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {[eventDates(event), eventPlace(event)].filter(Boolean).join(' · ')}
                        </p>
                    </a>
                </li>
            ))}
        </ul>
    );
}

export function TessMaterials() {
    const result = useTess(materials);
    const [filter, setFilter] = useState('');

    if (!result) return <Loading label="Loading training materials from TeSS" />;
    if (!result.reachable) return <Unavailable href={browseLinks.materials} />;
    if (result.items.length === 0) return <Empty icon={BookOpenIcon}>No training materials listed at the moment.</Empty>;

    const term = filter.trim().toLowerCase();
    const shown = result.items.filter(material => material.title.toLowerCase().includes(term));

    return (
        <>
            <label htmlFor="material-filter" className="sr-only">Filter training materials</label>
            <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input id="material-filter" type="search" autoComplete="off"
                       placeholder="Filter materials by title"
                       value={filter} onChange={e => setFilter(e.target.value)}
                       className="w-full rounded-lg border border-gray-200/60 dark:border-gray-700/30 bg-white dark:bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-brand-grey dark:text-gray-200 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
            </div>
            <ul className={`mt-4 ${LIST}`}>
                {shown.map(material => (
                    <li key={material.id} className={ITEM}>
                        <a href={materialLink(material)} target="_blank" rel="noopener noreferrer" className={ITEM_LINK}>
                            <p className={ITEM_TITLE}>{material.title}</p>
                            {material.description && (
                                <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{material.description}</p>
                            )}
                        </a>
                    </li>
                ))}
            </ul>
            <p aria-live="polite" className="text-center text-sm text-gray-500 dark:text-gray-400">
                {shown.length === 0 && <span className="block py-10">No materials match that filter.</span>}
            </p>
        </>
    );
}
