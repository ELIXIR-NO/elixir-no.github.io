import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const ChevronIcon = ({ className }: { className?: string }) => (
    <ChevronDownIcon className={className} aria-hidden="true" />
);

const linkColor = (active: boolean) =>
    active ? 'text-accent' : 'text-brand-grey dark:text-gray-300 hover:text-brand-primary dark:hover:text-white';

type Props = {
    /** Visible text; also the trigger link. */
    label: string;
    /** Destination of the label link. The panel is opened by the chevron, not the label. */
    href: string;
    /** Whether `href` is the current page. */
    active: boolean;
    /** Id tying the chevron (aria-controls) to the panel region. */
    panelId: string;
    /** Accessible name for the panel region. */
    panelLabel: string;
    /** Extra classes for the floating panel (e.g. width). */
    panelClassName?: string;
    /** Ref registrar from useMagicPill so the glider can measure this item. */
    rootRef?: (el: HTMLElement | null) => void;
    /** Pointer-enter hook so the magic pill can glide to this item. */
    onHover?: () => void;
    /** Panel content; receives a `close` callback to dismiss on navigate. */
    children: (close: () => void) => ReactNode;
};

/**
 * A top-level nav item that is both a link (label → href) and a disclosure (a
 * separate chevron button toggles a floating panel). Click/keyboard is the
 * canonical path; hover-intent open is a progressive enhancement on pointer-fine
 * devices. Closes on Escape (restoring focus to the chevron) and outside click.
 * Composes with useMagicPill via `rootRef` + `onHover`.
 */
export default function NavDropdown({
    label, href, active, panelId, panelLabel, panelClassName = '', rootRef, onHover, children,
}: Props) {
    const [open, setOpen] = useState(false);
    const [hoverCapable, setHoverCapable] = useState(false);
    const shouldReduceMotion = useReducedMotion();
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const chevronRef = useRef<HTMLButtonElement | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const setRoot = (el: HTMLDivElement | null) => { wrapRef.current = el; rootRef?.(el); };
    const close = () => setOpen(false);
    const clearCloseTimer = () => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    };
    const scheduleClose = () => {
        clearCloseTimer();
        closeTimer.current = setTimeout(() => setOpen(false), 150);
    };

    useEffect(() => {
        setHoverCapable(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    }, []);

    useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setOpen(false); chevronRef.current?.focus(); }
        };
        const onDown = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onDown);
        return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
    }, [open]);

    return (
        <div
            ref={setRoot}
            className="relative z-10 flex items-center"
            onMouseEnter={() => {
                onHover?.();
                if (hoverCapable) { clearCloseTimer(); setOpen(true); }
            }}
            onMouseLeave={() => { if (hoverCapable) scheduleClose(); }}
        >
            <a
                href={href}
                className={`rounded-lg py-2 pl-3.5 pr-1.5 text-sm 2xl:text-[0.9375rem] font-medium tracking-[-0.01em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${linkColor(active)}`}
                aria-current={active ? 'page' : undefined}
            >
                {label}
            </a>
            <button
                ref={chevronRef}
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={open ? `Close ${label} menu` : `Open ${label} menu`}
                className={`rounded-lg py-2 pl-1 pr-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${linkColor(active)}`}
            >
                <ChevronIcon className={`h-3.5 w-3.5 transition-transform ${shouldReduceMotion ? '' : 'duration-200'} ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        id={panelId}
                        role="region"
                        aria-label={panelLabel}
                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute left-0 top-full mt-3 rounded-2xl border border-gray-200/70 dark:border-gray-700/50 bg-white/95 dark:bg-dark-background/95 backdrop-blur-xl p-3 shadow-xl shadow-black/[0.12] dark:shadow-black/40 ${panelClassName}`}
                        onMouseEnter={clearCloseTimer}
                        onMouseLeave={() => { if (hoverCapable) scheduleClose(); }}
                    >
                        {children(close)}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
