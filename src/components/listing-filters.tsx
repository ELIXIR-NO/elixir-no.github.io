import { useEffect, useState, useCallback } from 'react';

export type FilterOption = {
    id: string;
    label: string;
    count: number;
};

export type FilterGroup = {
    key: string;
    label: string;
    options: FilterOption[];
    /** 'single' = radio (one active at a time), 'multi' = toggle (default) */
    mode?: 'single' | 'multi';
};

type Props = {
    groups: FilterGroup[];
    event?: string;
};

export default function ListingFilters({ groups, event = 'filters-changed' }: Props) {
    const [selected, setSelected] = useState<Record<string, Set<string>>>({});
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const initial: Record<string, Set<string>> = {};
        groups.forEach(g => {
            const vals = params.getAll(g.key);
            if (vals.length) initial[g.key] = new Set(vals);
        });
        if (Object.keys(initial).length) setSelected(initial);
    }, []);

    const notify = useCallback((next: Record<string, Set<string>>) => {
        const params = new URLSearchParams();
        Object.entries(next).forEach(([key, vals]) =>
            vals.forEach(v => params.append(key, v))
        );
        const qs = params.toString();
        window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
        window.dispatchEvent(new CustomEvent(event, { detail: next }));
    }, [event]);

    const toggle = useCallback((group: FilterGroup, optionId: string) => {
        setSelected(prev => {
            const next = { ...prev };

            if (group.mode === 'single') {
                // Radio behavior: clicking active option deselects (show all)
                if (prev[group.key]?.has(optionId)) {
                    delete next[group.key];
                } else {
                    next[group.key] = new Set([optionId]);
                }
            } else {
                // Multi-toggle behavior
                const set = new Set(prev[group.key] || []);
                if (set.has(optionId)) set.delete(optionId);
                else set.add(optionId);
                if (set.size === 0) delete next[group.key];
                else next[group.key] = set;
            }

            notify(next);
            return next;
        });
    }, [notify]);

    const clearAll = useCallback(() => {
        setSelected({});
        notify({});
    }, [notify]);

    const activeCount = Object.values(selected).reduce((sum, s) => sum + s.size, 0);
    const hasFilters = activeCount > 0;

    const filterContent = (
        <div className="space-y-4">
            {groups.map(group => {
                const isAllSelected = !selected[group.key] || selected[group.key].size === 0;
                return (
                    <div key={group.key}>
                        {groups.length > 1 && (
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                {group.label}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2" role="group" aria-label={`Filter by ${group.label}`}>
                            {/* "All" button for single-select groups */}
                            {group.mode === 'single' && (
                                <button
                                    onClick={() => {
                                        if (!isAllSelected) {
                                            setSelected(prev => {
                                                const next = { ...prev };
                                                delete next[group.key];
                                                notify(next);
                                                return next;
                                            });
                                        }
                                    }}
                                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                        isAllSelected
                                            ? 'bg-accent text-white'
                                            : 'border border-gray-200/60 dark:border-gray-700/30 text-brand-grey dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                                    aria-pressed={isAllSelected}
                                >
                                    All
                                </button>
                            )}
                            {group.options.map(opt => {
                                const isActive = selected[group.key]?.has(opt.id) || false;
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => toggle(group, opt.id)}
                                        className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                            isActive
                                                ? 'bg-accent text-white'
                                                : 'border border-gray-200/60 dark:border-gray-700/30 text-brand-grey dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                        aria-pressed={isActive}
                                    >
                                        {opt.label}
                                        <span className={`ml-1.5 text-xs ${isActive ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {opt.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            {hasFilters && (
                <button
                    onClick={clearAll}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-primary dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:rounded"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                    Clear filters ({activeCount})
                </button>
            )}
        </div>
    );

    return (
        <>
            {/* Mobile: collapsible toggle */}
            <button
                onClick={() => setMobileOpen(prev => !prev)}
                className="sm:hidden flex items-center gap-2 rounded-lg border border-gray-200/60 dark:border-gray-700/30 bg-white dark:bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-brand-primary dark:text-white transition-colors hover:border-accent/30 w-full justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-expanded={mobileOpen}
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
                Filters
                {hasFilters && (
                    <span className="rounded-full bg-accent text-white text-xs px-1.5 py-0.5 leading-none">
                        {activeCount}
                    </span>
                )}
            </button>

            {/* Mobile: expanded panel */}
            {mobileOpen && (
                <div className="sm:hidden mt-3 rounded-xl border border-gray-200/60 dark:border-gray-700/30 bg-white dark:bg-white/[0.03] p-4">
                    {filterContent}
                </div>
            )}

            {/* Desktop: always visible */}
            <div className="hidden sm:block">
                {filterContent}
            </div>
        </>
    );
}
