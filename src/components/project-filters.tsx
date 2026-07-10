import React, { useEffect, useState, useCallback } from 'react';
import { AdjustmentsHorizontalIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export type FilterOption = {
    id: string;
    label: string;
    count: number;
};

export type FilterGroup = {
    key: string;
    label: string;
    options: FilterOption[];
};

export default function ProjectFilters({ groups = [] }: { groups: FilterGroup[] }) {
    const [selected, setSelected] = useState<Record<string, Set<string>>>({});
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const initial: Record<string, Set<string>> = {};
        groups.forEach(g => {
            const vals = params.getAll(g.key);
            if (vals.length) initial[g.key] = new Set(vals);
        });
        setSelected(initial);
    }, []);

    const notify = useCallback((next: Record<string, Set<string>>) => {
        const params = new URLSearchParams();
        Object.entries(next).forEach(([key, vals]) => {
            vals.forEach(v => params.append(key, v));
        });
        const qs = params.toString();
        window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
        window.dispatchEvent(new CustomEvent('filters-changed', { detail: next }));
    }, []);

    const toggle = useCallback((groupKey: string, optionId: string) => {
        setSelected(prev => {
            const next = { ...prev };
            const set = new Set(prev[groupKey] || []);
            if (set.has(optionId)) set.delete(optionId);
            else set.add(optionId);
            if (set.size === 0) delete next[groupKey];
            else next[groupKey] = set;
            notify(next);
            return next;
        });
    }, [notify]);

    const clearAll = useCallback(() => {
        setSelected({});
        notify({});
    }, [notify]);

    const activeCount = Object.values(selected).reduce((sum, s) => sum + s.size, 0);
    const hasAnyFilter = activeCount > 0;

    const filterContent = (
        <div className="space-y-5">
            {groups.map(group => (
                <div key={group.key}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                        {group.label}
                    </h3>
                    <div className="flex flex-col gap-0.5" role="group" aria-label={`Filter by ${group.label}`}>
                        {group.options.map(opt => {
                            const isActive = selected[group.key]?.has(opt.id) || false;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => toggle(group.key, opt.id)}
                                    className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent text-left ${
                                        isActive
                                            ? 'bg-accent/10 text-accent font-medium'
                                            : 'text-brand-grey dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                                    }`}
                                    aria-pressed={isActive}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                            isActive
                                                ? 'border-accent bg-accent'
                                                : 'border-gray-300 dark:border-gray-600'
                                        }`}>
                                            {isActive && (
                                                <CheckIcon className="h-3 w-3 text-white" aria-hidden="true" />
                                            )}
                                        </span>
                                        {opt.label}
                                    </span>
                                    <span className={`text-xs tabular-nums ${isActive ? 'text-accent/70' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {opt.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
            {hasAnyFilter && (
                <button
                    onClick={clearAll}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-primary dark:hover:text-white transition-colors"
                >
                    <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    Clear all filters ({activeCount})
                </button>
            )}
        </div>
    );

    return (
        <>
            {/* Mobile toggle button */}
            <button
                onClick={() => setMobileOpen(prev => !prev)}
                className="lg:hidden flex items-center gap-2 rounded-lg border border-gray-200/60 dark:border-gray-700/30 bg-white dark:bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-brand-primary dark:text-white transition-colors hover:border-accent/30 w-full justify-center"
                aria-expanded={mobileOpen}
            >
                <AdjustmentsHorizontalIcon className="h-4 w-4" aria-hidden="true" />
                Filters
                {hasAnyFilter && (
                    <span className="rounded-full bg-accent text-white text-xs px-1.5 py-0.5 leading-none">
                        {activeCount}
                    </span>
                )}
            </button>

            {/* Mobile filter panel */}
            {mobileOpen && (
                <div className="lg:hidden mt-3 rounded-xl border border-gray-200/60 dark:border-gray-700/30 bg-white dark:bg-white/[0.03] p-5">
                    {filterContent}
                </div>
            )}

            {/* Desktop sidebar content */}
            <div className="hidden lg:block">
                {filterContent}
            </div>
        </>
    );
}
