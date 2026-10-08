import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState, useCallback } from "react";
import CommandPalette from "./command-palette.tsx";
import ThemeToggle, { circleButtonClass } from "./theme-toggle.tsx";
import NavAboutMenu from "./nav-about-menu.tsx";
import NavDropdown from "./nav-dropdown.tsx";
import NavMobileAccordion from "./nav-mobile-accordion.tsx";
import { useMagicPill } from "../lib/hooks/use-magic-pill";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const SearchIcon = ({ className }: { className?: string }) => (
    <MagnifyingGlassIcon className={className} aria-hidden="true" />
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

const isActivePath = (pathname: string, href: string) =>
    pathname === href || pathname.startsWith(href + '/');

const navLinkClass = (active: boolean) =>
    `relative z-10 px-3.5 py-2 text-sm 2xl:text-[0.9375rem] font-medium tracking-[-0.01em] rounded-control transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active ? 'text-ink' : 'text-body hover:text-ink'
    }`;

// Merge and split thresholds differ so a scroll position hovering near one
// edge cannot flip the nav back and forth. `settled` turns true one frame
// after the first measurement so a reload mid-page snaps to the merged state
// instead of morphing from the server-rendered relaxed one.
const useScrolled = (merge = 48, split = 16) => {
    const [scrolled, setScrolled] = useState(false);
    const [settled, setSettled] = useState(false);
    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY;
            setScrolled((prev) => (prev ? y > split : y > merge));
        };
        onScroll();
        const frame = requestAnimationFrame(() => setSettled(true));
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
        };
    }, [merge, split]);
    return { scrolled, settled };
};

const PILL_RADIUS = 9999;

const morphTransition = { layout: { duration: 0.35, ease: 'easeOut' as const } };
const instantTransition = { layout: { duration: 0 } };
type LayoutTransition = typeof morphTransition | typeof instantTransition;

/**
 * Surface + rule border painted behind a nav piece. A separate layout element
 * so its opacity can fade independently of the content while framer keeps the
 * corner radius undistorted during the morph.
 */
const Skin = ({ visible, radius, transition, className }: { visible: boolean; radius: number; transition: LayoutTransition; className: string }) => {
    const shouldReduceMotion = useReducedMotion();
    return (
        <motion.div
            aria-hidden="true"
            layout
            initial={false}
            animate={{ opacity: visible ? 1 : 0 }}
            transition={{ ...transition, opacity: { duration: shouldReduceMotion ? 0 : 0.3 } }}
            style={{ borderRadius: radius }}
            className={`pointer-events-none absolute inset-0 z-0 bg-surface/90 ${className}`}
        />
    );
};

export const Navigation = ({ pathname }: { pathname: string }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const { scrolled, settled } = useScrolled();
    const shouldReduceMotion = useReducedMotion();

    const activeIndex = navigation.findIndex((item) => isActivePath(pathname, item.href));
    const { glider, setHoveredIndex, registerRef } = useMagicPill(activeIndex);

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

    const layoutTransition = settled ? morphTransition : instantTransition;
    const logoClass = `w-auto transition-[filter] duration-300 motion-reduce:transition-none ${
        scrolled ? 'h-9 lg:h-10' : 'h-11 lg:h-[60px] [filter:drop-shadow(0_0_14px_rgb(var(--color-paper)/0.9))]'
    }`;

    return (
        <MotionConfig reducedMotion="user">
            <CommandPalette open={searchOpen} setOpen={setSearchOpen} />
            <header className="pointer-events-none fixed top-3 inset-x-3 sm:inset-x-5 lg:inset-x-8 z-50">
                <motion.div
                    layout
                    initial={false}
                    transition={layoutTransition}
                    style={{ borderRadius: PILL_RADIUS }}
                    data-merged={scrolled}
                    className={`group relative grid grid-cols-[1fr_auto_1fr] items-center ${scrolled ? 'pointer-events-auto px-4 py-2 lg:px-5' : ''}`}
                >
                    <Skin visible={scrolled} radius={PILL_RADIUS} transition={layoutTransition} className="shadow-lg shadow-black/[0.08] dark:shadow-black/30" />

                    <nav aria-label="Main navigation" className="contents">
                        {/* Logo: floats large on its own at the top, shrinks into the bar once merged */}
                        <motion.div
                            layout
                            initial={false}
                            transition={layoutTransition}
                            className={`pointer-events-auto relative z-10 justify-self-start flex items-center ${scrolled ? 'p-1' : 'p-1 lg:p-2'}`}
                        >
                            <a href={`${BASE}/`} className="relative flex focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control">
                                <span className="sr-only">ELIXIR Norway</span>
                                {/* elixir-no-light.svg is the white wordmark for dark backgrounds. */}
                                <motion.img layout transition={layoutTransition} alt="ELIXIR Norway logo" src={`${BASE}/assets/logos/elixir-no-light.svg`} className={`hidden dark:block ${logoClass}`} width="140" height="94" />
                                <motion.img layout transition={layoutTransition} alt="ELIXIR Norway logo" src={`${BASE}/assets/logos/elixir-no-dark.svg`} className={`block dark:hidden ${logoClass}`} width="140" height="94" />
                            </a>
                        </motion.div>

                        {/* Desktop link strip + magic pill */}
                        <motion.div
                            layout="position"
                            initial={false}
                            transition={layoutTransition}
                            className="pointer-events-auto relative z-10 hidden lg:flex items-center gap-x-1 justify-self-center px-1.5 py-1.5"
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <Skin visible={!scrolled} radius={PILL_RADIUS} transition={layoutTransition} className="border border-rule" />
                            {glider && (
                                <motion.span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute h-0.5 rounded-marker bg-marker"
                                    initial={false}
                                    animate={{ left: glider.left + 14, top: glider.top + glider.height - 5, width: glider.width - 28 }}
                                    transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                                />
                            )}

                            {navigation.map((item, i) => {
                                const active = isActivePath(pathname, item.href);

                                if (item.name === 'About') {
                                    return (
                                        <NavDropdown
                                            key={item.name}
                                            label={item.name}
                                            href={item.href}
                                            active={active}
                                            panelId="about-menu-panel"
                                            panelLabel="About ELIXIR Norway"
                                            panelClassName={`w-80 ${scrolled ? 'mt-5' : 'mt-3'}`}
                                            rootRef={registerRef(i)}
                                            onHover={() => setHoveredIndex(i)}
                                        >
                                            {(close) => <NavAboutMenu pathname={pathname} variant="panel" onNavigate={close} />}
                                        </NavDropdown>
                                    );
                                }

                                return (
                                    <a
                                        key={item.name}
                                        ref={registerRef(i)}
                                        href={item.href}
                                        onMouseEnter={() => setHoveredIndex(i)}
                                        className={navLinkClass(active)}
                                        aria-current={active ? 'page' : undefined}
                                    >
                                        {item.name}
                                    </a>
                                );
                            })}
                        </motion.div>

                        {/* Right actions: theme toggle, then search (desktop) or menu (mobile) */}
                        <motion.div
                            layout="position"
                            initial={false}
                            transition={layoutTransition}
                            className="pointer-events-auto relative z-10 col-start-3 justify-self-end flex items-center gap-x-2"
                        >
                            <ThemeToggle />
                            <button
                                onClick={() => setSearchOpen(true)}
                                className={`hidden lg:flex ${circleButtonClass}`}
                                aria-label="Search (Ctrl+K)"
                            >
                                <SearchIcon className="h-[22px] w-[22px]" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(prev => !prev)}
                                className={`relative lg:hidden ${circleButtonClass}`}
                                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                                aria-expanded={mobileMenuOpen}
                            >
                                <div className="w-[18px] h-3.5 relative flex flex-col justify-between" aria-hidden="true">
                                    <motion.span
                                        className="block h-[2px] w-full bg-current rounded-full origin-center"
                                        animate={mobileMenuOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
                                        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25 }}
                                    />
                                    <motion.span
                                        className="block h-[2px] w-full bg-current rounded-full origin-center"
                                        animate={mobileMenuOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
                                        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25 }}
                                    />
                                </div>
                            </button>
                        </motion.div>
                    </nav>
                </motion.div>
            </header>

            {/* Spacer for fixed header */}
            <div className="h-[var(--nav-offset)]" aria-hidden="true" />

            {/* Mobile menu: full-screen overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-0 z-40 bg-paper/95 backdrop-blur-xl lg:hidden flex flex-col"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Mobile navigation"
                    >
                        <nav aria-label="Mobile navigation" className="flex-1 flex flex-col justify-center overflow-y-auto overscroll-contain px-8 sm:px-12 pt-24 pb-4">
                            <ul className="space-y-1">
                                {navigation.map((item, i) => {
                                    const active = isActivePath(pathname, item.href);
                                    const bigLink = `block py-2.5 landscape:py-1.5 text-2xl landscape:text-xl sm:text-3xl font-semibold tracking-tight text-ink decoration-marker decoration-2 underline-offset-[6px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:rounded-control ${active ? 'underline' : 'hover:underline'}`;

                                    return (
                                        <motion.li
                                            key={item.name}
                                            initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.04 * i, duration: 0.3 }}
                                        >
                                            {item.name === 'About' ? (
                                                <NavMobileAccordion
                                                    label={item.name}
                                                    href={item.href}
                                                    active={active}
                                                    panelId="about-accordion"
                                                    linkClassName={bigLink}
                                                    onNavigate={closeMobile}
                                                >
                                                    <NavAboutMenu pathname={pathname} variant="accordion" onNavigate={closeMobile} />
                                                </NavMobileAccordion>
                                            ) : (
                                                <a href={item.href} onClick={closeMobile} className={bigLink} aria-current={active ? 'page' : undefined}>
                                                    {item.name}
                                                </a>
                                            )}
                                        </motion.li>
                                    );
                                })}
                            </ul>
                        </nav>

                        <motion.div
                            className="px-8 sm:px-12 pb-8 pt-4 border-t border-rule"
                            initial={shouldReduceMotion ? {} : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.25 }}
                        >
                            <button
                                onClick={() => { closeMobile(); setSearchOpen(true); }}
                                className="flex items-center gap-3 text-base font-semibold text-muted hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:rounded-control"
                            >
                                <SearchIcon className="h-5 w-5" />
                                Search
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </MotionConfig>
    );
};

export default Navigation;
