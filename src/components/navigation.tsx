import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import React, { Fragment, useEffect, useState, useCallback } from "react";
import CommandPalette from "./command-palette.tsx";
import ThemeToggle from "./theme-toggle.tsx";

const SearchIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
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
    const [searchOpen, setSearchOpen] = useState(false);
    const scrolled = useScrolled();
    const shouldReduceMotion = useReducedMotion();

    const closeMobile = useCallback(() => setMobileMenuOpen(false), []);

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
                    <nav
                        aria-label="Main navigation"
                        className="flex items-center justify-between px-5 py-3 lg:px-6"
                    >

                        {/* Logo */}
                        <div className="flex shrink-0">
                            <a href={`${BASE}/`} className="p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg">
                                <span className="sr-only">ELIXIR Norway</span>
                                <img
                                    alt="ELIXIR Norway logo"
                                    src={`${BASE}/assets/logos/elixir-no-light.svg`}
                                    className="hidden dark:block h-14 w-auto"
                                    width="120"
                                    height="48"
                                />
                                <img
                                    alt="ELIXIR Norway logo"
                                    src={`${BASE}/assets/logos/elixir-no-dark.svg`}
                                    className="block dark:hidden h-14 w-auto"
                                    width="120"
                                    height="48"
                                />
                            </a>
                        </div>

                        {/* Desktop nav links */}
                        <div className="hidden lg:flex lg:items-center lg:gap-x-1">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                return (
                                    <a
                                        key={item.name}
                                        href={item.href}
                                        className={`relative px-3 py-2 text-sm 2xl:text-base font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                            isActive
                                                ? 'text-accent bg-accent/10'
                                                : 'text-brand-grey dark:text-gray-300 hover:text-brand-primary dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                                        }`}
                                        aria-current={isActive ? 'page' : undefined}
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
                                        animate={mobileMenuOpen
                                            ? { rotate: 45, y: 5 }
                                            : { rotate: 0, y: 0 }
                                        }
                                        transition={{ duration: 0.25 }}
                                    />
                                    <motion.span
                                        className="block h-[2px] w-full bg-current rounded-full origin-center"
                                        animate={mobileMenuOpen
                                            ? { rotate: -45, y: -5 }
                                            : { rotate: 0, y: 0 }
                                        }
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
                        {/* Links — centered with landscape-safe scrolling */}
                        <nav aria-label="Mobile navigation" className="flex-1 flex flex-col justify-center overflow-y-auto overscroll-contain px-8 sm:px-12 pt-24 pb-4">
                            <ul className="space-y-1">
                                {navigation.map((item, i) => {
                                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                    return (
                                        <motion.li
                                            key={item.name}
                                            initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.04 * i, duration: 0.3 }}
                                        >
                                            <a
                                                href={item.href}
                                                onClick={closeMobile}
                                                className={`block py-2.5 landscape:py-1.5 text-2xl landscape:text-xl sm:text-3xl font-bold tracking-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:rounded ${
                                                    isActive
                                                        ? 'text-accent'
                                                        : 'text-brand-primary dark:text-white hover:text-accent'
                                                }`}
                                                aria-current={isActive ? 'page' : undefined}
                                            >
                                                {item.name}
                                            </a>
                                        </motion.li>
                                    );
                                })}
                            </ul>
                        </nav>

                        {/* Bottom bar — search */}
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
