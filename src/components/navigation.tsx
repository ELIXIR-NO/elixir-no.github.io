import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Fragment, useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import CommandPalette from "./command-palette.tsx";
import ThemeToggle from "./theme-toggle.tsx";
import NavAboutMenu from "./nav-about-menu.tsx";

const SearchIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
);

const ChevronIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
);

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const navigation = [
    { href: `${BASE}/about`, name: "About" },
    { href: `${BASE}/research-support`, name: "Research Support" },
    { href: `${BASE}/services`, name: "Services" },
    { href: `${BASE}/events`, name: "Events" },
    { href: `${BASE}/training`, name: "Training" },
    { href: `${BASE}/funding-and-projects`, name: "Funding & Projects" },
    { href: `${BASE}/news`, name: "News" },
];

// useLayoutEffect warns during SSR; this island is server-rendered then hydrated.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const isActivePath = (pathname: string, href: string) =>
    pathname === href || pathname.startsWith(href + '/');

type Glider = { left: number; top: number; width: number; height: number };

const useScrolled = (threshold = 20) => {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > threshold);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [threshold]);
    return scrolled;
};

export const Navigation = ({ pathname }: { pathname: string }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [aboutMobileOpen, setAboutMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [glider, setGlider] = useState<Glider | null>(null);
    const [hoverCapable, setHoverCapable] = useState(false);
    const scrolled = useScrolled();
    const shouldReduceMotion = useReducedMotion();

    const linkRefs = useRef<(HTMLElement | null)[]>([]);
    const aboutWrapRef = useRef<HTMLDivElement | null>(null);
    const aboutChevronRef = useRef<HTMLButtonElement | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const closeMobile = useCallback(() => { setMobileMenuOpen(false); setAboutMobileOpen(false); }, []);

    // Magic-pill target: hovered link, else the active link (or hidden if neither).
    const activeIndex = navigation.findIndex((item) => isActivePath(pathname, item.href));
    const targetIndex = hoveredIndex ?? (activeIndex >= 0 ? activeIndex : null);
    const targetIndexRef = useRef<number | null>(targetIndex);
    targetIndexRef.current = targetIndex;

    const measureGlider = useCallback((index: number | null) => {
        if (index == null) { setGlider(null); return; }
        const el = linkRefs.current[index];
        if (!el) { setGlider(null); return; }
        setGlider({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
    }, []);

    useIsomorphicLayoutEffect(() => { measureGlider(targetIndex); }, [targetIndex, measureGlider]);

    useEffect(() => {
        const onResize = () => measureGlider(targetIndexRef.current);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [measureGlider]);

    // Re-measure once the web font (Space Grotesk) has loaded — link widths shift.
    useEffect(() => {
        if (typeof document === 'undefined' || !('fonts' in document)) return;
        let cancelled = false;
        document.fonts.ready.then(() => { if (!cancelled) measureGlider(targetIndexRef.current); });
        return () => { cancelled = true; };
    }, [measureGlider]);

    useEffect(() => {
        setHoverCapable(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    }, []);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileMenuOpen]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && mobileMenuOpen) closeMobile();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [mobileMenuOpen, closeMobile]);

    // About dropdown: Esc closes + returns focus to the chevron; outside-click closes.
    useEffect(() => {
        if (!aboutOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setAboutOpen(false); aboutChevronRef.current?.focus(); }
        };
        const onDown = (e: MouseEvent) => {
            if (aboutWrapRef.current && !aboutWrapRef.current.contains(e.target as Node)) setAboutOpen(false);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onDown);
        return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
    }, [aboutOpen]);

    const clearCloseTimer = useCallback(() => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    }, []);
    const scheduleCloseAbout = useCallback(() => {
        clearCloseTimer();
        closeTimer.current = setTimeout(() => setAboutOpen(false), 150);
    }, [clearCloseTimer]);
    useEffect(() => clearCloseTimer, [clearCloseTimer]);

    return (
        <Fragment>
            <CommandPalette open={searchOpen} setOpen={setSearchOpen} />
            <header className="fixed top-3 inset-x-3 sm:inset-x-5 lg:inset-x-8 z-50">
                <div
                    className={`rounded-2xl transition-all duration-300 ${
                        scrolled
                            ? 'bg-white/80 dark:bg-dark-background/80 backdrop-blur-xl shadow-lg shadow-black/[0.08] dark:shadow-black/30 border border-gray-200/60 dark:border-gray-700/60'
                            : 'bg-white/40 dark:bg-dark-background/40 backdrop-blur-md border border-white/40 dark:border-white/10'
                    }`}
                >
                    <nav aria-label="Main navigation" className="flex items-center justify-between px-5 py-3 lg:px-6">

                        {/* Logo */}
                        <div className="flex shrink-0">
                            <a href={`${BASE}/`} className="p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg">
                                <span className="sr-only">ELIXIR Norway</span>
                                <img alt="ELIXIR Norway logo" src={`${BASE}/assets/logos/elixir-no-light.svg`} className="hidden dark:block h-14 w-auto" width="120" height="48" />
                                <img alt="ELIXIR Norway logo" src={`${BASE}/assets/logos/elixir-no-dark.svg`} className="block dark:hidden h-14 w-auto" width="120" height="48" />
                            </a>
                        </div>

                        {/* Desktop nav links + magic pill */}
                        <div
                            className="relative hidden lg:flex lg:items-center lg:gap-x-1"
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            {glider && (
                                <motion.span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute rounded-lg bg-accent/10"
                                    initial={false}
                                    animate={{ left: glider.left, top: glider.top, width: glider.width, height: glider.height }}
                                    transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                                />
                            )}

                            {navigation.map((item, i) => {
                                const active = isActivePath(pathname, item.href);
                                const linkColor = active
                                    ? 'text-accent'
                                    : 'text-brand-grey dark:text-gray-300 hover:text-brand-primary dark:hover:text-white';

                                if (item.name === 'About') {
                                    return (
                                        <div
                                            key={item.name}
                                            ref={(el) => { linkRefs.current[i] = el; aboutWrapRef.current = el; }}
                                            className="relative z-10 flex items-center"
                                            onMouseEnter={() => {
                                                setHoveredIndex(i);
                                                if (hoverCapable) { clearCloseTimer(); setAboutOpen(true); }
                                            }}
                                            onMouseLeave={() => { if (hoverCapable) scheduleCloseAbout(); }}
                                        >
                                            <a
                                                href={item.href}
                                                className={`rounded-lg py-2 pl-3 pr-1.5 text-sm 2xl:text-base font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${linkColor}`}
                                                aria-current={active ? 'page' : undefined}
                                            >
                                                {item.name}
                                            </a>
                                            <button
                                                ref={aboutChevronRef}
                                                type="button"
                                                onClick={() => setAboutOpen((o) => !o)}
                                                aria-expanded={aboutOpen}
                                                aria-controls="about-menu-panel"
                                                aria-label={aboutOpen ? 'Close About menu' : 'Open About menu'}
                                                className={`rounded-lg py-2 pl-1 pr-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${linkColor}`}
                                            >
                                                <ChevronIcon className={`h-3.5 w-3.5 transition-transform ${shouldReduceMotion ? '' : 'duration-200'} ${aboutOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            <AnimatePresence>
                                                {aboutOpen && (
                                                    <motion.div
                                                        id="about-menu-panel"
                                                        role="region"
                                                        aria-label="About ELIXIR Norway"
                                                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="absolute left-0 top-full mt-3 w-[34rem] rounded-2xl border border-gray-200/70 dark:border-gray-700/50 bg-white/95 dark:bg-dark-background/95 backdrop-blur-xl p-3 shadow-xl shadow-black/[0.12] dark:shadow-black/40"
                                                        onMouseEnter={clearCloseTimer}
                                                        onMouseLeave={() => { if (hoverCapable) scheduleCloseAbout(); }}
                                                    >
                                                        <NavAboutMenu pathname={pathname} variant="panel" onNavigate={() => setAboutOpen(false)} />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                }

                                return (
                                    <a
                                        key={item.name}
                                        ref={(el) => { linkRefs.current[i] = el; }}
                                        href={item.href}
                                        onMouseEnter={() => setHoveredIndex(i)}
                                        className={`relative z-10 px-3 py-2 text-sm 2xl:text-base font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${linkColor}`}
                                        aria-current={active ? 'page' : undefined}
                                    >
                                        {item.name}
                                    </a>
                                );
                            })}
                        </div>

                        {/* Desktop right actions */}
                        <div className="hidden lg:flex lg:items-center lg:gap-x-1">
                            <ThemeToggle />
                            <button
                                onClick={() => setSearchOpen(true)}
                                className="h-9 w-9 flex items-center justify-center rounded-xl text-brand-grey dark:text-gray-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                aria-label="Search (Ctrl+K)"
                            >
                                <SearchIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Mobile menu button — animated bars morph to X */}
                        <div className="flex lg:hidden items-center gap-x-1">
                            <ThemeToggle />
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(prev => !prev)}
                                className="relative h-9 w-9 flex items-center justify-center rounded-xl text-brand-grey dark:text-gray-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                                aria-expanded={mobileMenuOpen}
                            >
                                <div className="w-[18px] h-3.5 relative flex flex-col justify-between" aria-hidden="true">
                                    <motion.span
                                        className="block h-[2px] w-full bg-current rounded-full origin-center"
                                        animate={mobileMenuOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
                                        transition={{ duration: 0.25 }}
                                    />
                                    <motion.span
                                        className="block h-[2px] w-full bg-current rounded-full origin-center"
                                        animate={mobileMenuOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
                                        transition={{ duration: 0.25 }}
                                    />
                                </div>
                            </button>
                        </div>
                    </nav>
                </div>
            </header>

            {/* Spacer for fixed header */}
            <div className="h-[84px]" aria-hidden="true" />

            {/* Mobile menu — full-screen overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-0 z-40 bg-white/95 dark:bg-dark-background/95 backdrop-blur-xl lg:hidden flex flex-col"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Mobile navigation"
                    >
                        <nav aria-label="Mobile navigation" className="flex-1 flex flex-col justify-center overflow-y-auto overscroll-contain px-8 sm:px-12 pt-24 pb-4">
                            <ul className="space-y-1">
                                {navigation.map((item, i) => {
                                    const active = isActivePath(pathname, item.href);
                                    const bigLink = `block py-2.5 landscape:py-1.5 text-2xl landscape:text-xl sm:text-3xl font-bold tracking-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:rounded ${active ? 'text-accent' : 'text-brand-primary dark:text-white hover:text-accent'}`;

                                    if (item.name === 'About') {
                                        return (
                                            <motion.li
                                                key={item.name}
                                                initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.04 * i, duration: 0.3 }}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <a href={item.href} onClick={closeMobile} className={bigLink} aria-current={active ? 'page' : undefined}>
                                                        {item.name}
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAboutMobileOpen((o) => !o)}
                                                        aria-expanded={aboutMobileOpen}
                                                        aria-controls="about-accordion"
                                                        aria-label={aboutMobileOpen ? 'Collapse About section' : 'Expand About section'}
                                                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-brand-primary dark:text-white hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                                    >
                                                        <ChevronIcon className={`h-5 w-5 transition-transform ${shouldReduceMotion ? '' : 'duration-200'} ${aboutMobileOpen ? 'rotate-180' : ''}`} />
                                                    </button>
                                                </div>
                                                <AnimatePresence initial={false}>
                                                    {aboutMobileOpen && (
                                                        <motion.div
                                                            id="about-accordion"
                                                            initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                                                            animate={shouldReduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                                                            exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.25 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="py-2 pl-1">
                                                                <NavAboutMenu pathname={pathname} variant="accordion" onNavigate={closeMobile} />
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.li>
                                        );
                                    }

                                    return (
                                        <motion.li
                                            key={item.name}
                                            initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.04 * i, duration: 0.3 }}
                                        >
                                            <a href={item.href} onClick={closeMobile} className={bigLink} aria-current={active ? 'page' : undefined}>
                                                {item.name}
                                            </a>
                                        </motion.li>
                                    );
                                })}
                            </ul>
                        </nav>

                        <motion.div
                            className="px-8 sm:px-12 pb-8 pt-4 border-t border-gray-200/60 dark:border-gray-700/30"
                            initial={shouldReduceMotion ? {} : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.25 }}
                        >
                            <button
                                onClick={() => { closeMobile(); setSearchOpen(true); }}
                                className="flex items-center gap-3 text-base font-semibold text-gray-500 dark:text-gray-400 hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:rounded"
                            >
                                <SearchIcon className="h-5 w-5" />
                                Search
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Fragment>
    );
};

export default Navigation;
