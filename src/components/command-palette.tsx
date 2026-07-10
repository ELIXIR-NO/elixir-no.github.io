import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import DomPurify from 'dompurify';
import { MagnifyingGlassIcon, ExclamationCircleIcon, NewspaperIcon, CalendarIcon, CubeIcon, FolderIcon, AcademicCapIcon, UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const ignoredPaths = /^\/news\/?$/;
const DEBOUNCE_MS = 200;

interface SearchResult {
    url: string;
    title: string;
    excerpt: string;
}

// NOTE: dangerouslySetInnerHTML below is safe — all content is sanitized
// through DomPurify.sanitize() before rendering. The excerpts come from
// Pagefind (our own build-time index) and contain <mark> tags for highlights.

function resultIcon(url: string) {
    if (url.includes('/news/')) return 'news';
    if (url.includes('/events/')) return 'event';
    if (url.includes('/services/')) return 'service';
    if (url.includes('/funding-and-projects/')) return 'project';
    if (url.includes('/training')) return 'training';
    if (url.includes('/about')) return 'about';
    return 'page';
}

const iconMap: Record<string, typeof NewspaperIcon> = {
    news: NewspaperIcon,
    event: CalendarIcon,
    service: CubeIcon,
    project: FolderIcon,
    training: AcademicCapIcon,
    about: UserGroupIcon,
    page: DocumentTextIcon,
};

export default function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const shouldReduceMotion = useReducedMotion();

    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    useEffect(() => {
        if (open) requestAnimationFrame(() => inputRef.current?.focus());
    }, [open]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(!open);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, setOpen]);

    const close = useCallback(() => {
        setOpen(false);
        setQuery('');
        setResults([]);
        setActiveIndex(0);
    }, [setOpen]);

    const navigate = useCallback((url: string) => {
        close();
        window.location.href = url;
    }, [close]);

    const search = useCallback(async (term: string) => {
        if (!term.trim() || !(window as any)?.pagefind) {
            setResults([]);
            return;
        }
        const { results: raw } = await (window as any).pagefind.search(term);
        const items: SearchResult[] = [];
        for (const r of raw) {
            const data = await r.data();
            if (!ignoredPaths.test(data.url)) {
                items.push({ url: data.url, title: data.meta?.title, excerpt: data.excerpt });
            }
        }
        setResults(items);
        setActiveIndex(0);
    }, []);

    const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(val), DEBOUNCE_MS);
    }, [search]);

    const onKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
        if (e.key === 'Enter' && results[activeIndex]) { navigate(results[activeIndex].url); }
    }, [close, navigate, results, activeIndex]);

    // Close on Escape regardless of focus — clicking the results area moves
    // focus off the input, so the input's own onKeyDown can't catch Escape.
    useEffect(() => {
        if (!open) return;
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.preventDefault(); close(); }
        };
        document.addEventListener('keydown', onEsc);
        return () => document.removeEventListener('keydown', onEsc);
    }, [open, close]);

    useEffect(() => {
        const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
        el?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    if (!open) return null;

    const hasQuery = query.trim().length > 0;

    // Sanitize excerpt HTML from Pagefind (contains <mark> tags for highlights)
    const sanitize = (html: string) => DomPurify.sanitize(html);

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[999]" role="dialog" aria-modal="true" aria-label="Search">
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        aria-hidden="true"
                    />

                    {/* Centering container — clicks here dismiss the palette */}
                    <div
                        className="fixed inset-0 overflow-y-auto p-4 sm:p-6 md:p-20"
                        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
                    >
                        <motion.div
                            className="mx-auto max-w-xl rounded-2xl bg-white dark:bg-dark-surface shadow-2xl shadow-black/20 dark:shadow-black/50 overflow-hidden ring-1 ring-black/5 dark:ring-white/10"
                            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.96, y: -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.96, y: -8 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Search input */}
                            <div className="grid grid-cols-1">
                                <MagnifyingGlassIcon className="pointer-events-none col-start-1 row-start-1 ml-4 h-5 w-5 self-center text-gray-400 dark:text-gray-500" aria-hidden="true" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={onInputChange}
                                    onKeyDown={onKeyDown}
                                    placeholder="Search pages, services, people..."
                                    className="col-start-1 row-start-1 h-12 w-full pl-11 pr-4 bg-transparent text-base text-brand-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none border-0 ring-0 focus:outline-none focus:border-0 focus:ring-0 focus:shadow-none sm:text-sm"
                                    aria-label="Search"
                                    aria-autocomplete="list"
                                    aria-controls="search-results"
                                    aria-activedescendant={results[activeIndex] ? `search-result-${activeIndex}` : undefined}
                                />
                            </div>

                            {/* Results */}
                            {hasQuery && results.length > 0 && (
                                <div
                                    id="search-results"
                                    ref={listRef}
                                    role="listbox"
                                    className="max-h-80 overflow-y-auto overscroll-contain scroll-py-2 p-2"
                                >
                                    {results.map((item, i) => {
                                        const type = resultIcon(item.url);
                                        const ResultIcon = iconMap[type];
                                        const sanitized = sanitize(item.excerpt);
                                        return (
                                            <div
                                                key={item.url}
                                                id={`search-result-${i}`}
                                                role="option"
                                                aria-selected={i === activeIndex}
                                                onClick={() => navigate(item.url)}
                                                onMouseEnter={() => setActiveIndex(i)}
                                                className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${
                                                    i === activeIndex
                                                        ? 'bg-accent/10'
                                                        : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                                                }`}
                                            >
                                                <ResultIcon className={`h-5 w-5 shrink-0 mt-0.5 ${i === activeIndex ? 'text-accent' : 'text-gray-400 dark:text-gray-500'}`} aria-hidden="true" />
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-sm font-medium truncate ${
                                                        i === activeIndex
                                                            ? 'text-brand-primary dark:text-white'
                                                            : 'text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        {item.title}
                                                    </p>
                                                    <p
                                                        className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1 [&_mark]:bg-accent/20 [&_mark]:text-brand-primary dark:[&_mark]:text-white [&_mark]:rounded-sm [&_mark]:px-0.5"
                                                        dangerouslySetInnerHTML={{ __html: sanitized }}
                                                    />
                                                </div>
                                                {i === activeIndex && (
                                                    <span className="hidden sm:inline-flex shrink-0 self-center text-xs text-accent/60">
                                                        Jump to
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* No results */}
                            {hasQuery && results.length === 0 && (
                                <div className="px-6 py-14 text-center">
                                    <ExclamationCircleIcon className="mx-auto h-6 w-6 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                                    <p className="mt-4 text-sm font-medium text-brand-primary dark:text-white">No results found</p>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Try a different search term</p>
                                </div>
                            )}

                            {/* Initial state */}
                            {!hasQuery && (
                                <div className="px-6 py-10 text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Search across all pages, services, and content
                                    </p>
                                </div>
                            )}

                            {/* Footer with keyboard hints */}
                            <div className="flex items-center gap-4 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-white/[0.02]">
                                <span className="flex items-center gap-1.5">
                                    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-gray-300/60 dark:border-gray-600/40 bg-white dark:bg-white/5 px-1 font-mono text-[10px] font-medium">&#x21B5;</kbd>
                                    select
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-gray-300/60 dark:border-gray-600/40 bg-white dark:bg-white/5 px-1 font-mono text-[10px] font-medium">&#x2191;&#x2193;</kbd>
                                    navigate
                                </span>
                                <span className="flex items-center gap-1.5 ml-auto">
                                    <kbd className="inline-flex h-5 items-center justify-center rounded border border-gray-300/60 dark:border-gray-600/40 bg-white dark:bg-white/5 px-1.5 font-mono text-[10px] font-medium">esc</kbd>
                                    close
                                </span>
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
