import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import DomPurify from 'dompurify';

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

const iconPaths: Record<string, string> = {
    news: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z',
    event: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
    service: 'M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V15m0 0l-2.25 1.313',
    project: 'M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z',
    training: 'M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5',
    about: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z',
    page: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
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
                                <svg className="pointer-events-none col-start-1 row-start-1 ml-4 h-5 w-5 self-center text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={onInputChange}
                                    onKeyDown={onKeyDown}
                                    placeholder="Search pages, services, people..."
                                    className="col-start-1 row-start-1 h-12 w-full pl-11 pr-4 bg-transparent text-base text-brand-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none sm:text-sm"
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
                                        const path = iconPaths[type];
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
                                                <svg className={`h-5 w-5 shrink-0 mt-0.5 ${i === activeIndex ? 'text-accent' : 'text-gray-400 dark:text-gray-500'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
                                                </svg>
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
                                    <svg className="mx-auto h-6 w-6 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                    </svg>
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
