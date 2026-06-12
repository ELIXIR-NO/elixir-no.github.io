import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const ChevronIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
);

type Props = {
    /** Visible text; also the trigger link. */
    label: string;
    /** Destination of the label link. The panel is expanded by the chevron, not the label. */
    href: string;
    /** Whether `href` is the current page. */
    active: boolean;
    /** Id tying the chevron (aria-controls) to the collapsible panel. */
    panelId: string;
    /** Class for the big mobile link, shared with sibling nav links. */
    linkClassName: string;
    /** Called when the label or any child link is activated (closes the overlay). */
    onNavigate: () => void;
    /** Collapsible content. */
    children: ReactNode;
};

/**
 * A mobile nav row that is both a link (label → href) and a disclosure: a
 * separate chevron button expands an inline collapsible panel beneath it.
 * Mirrors NavDropdown's link-plus-chevron pattern for the full-screen overlay.
 */
export default function NavMobileAccordion({ label, href, active, panelId, linkClassName, onNavigate, children }: Props) {
    const [open, setOpen] = useState(false);
    const shouldReduceMotion = useReducedMotion();

    return (
        <>
            <div className="flex items-center justify-between gap-2">
                <a href={href} onClick={onNavigate} className={linkClassName} aria-current={active ? 'page' : undefined}>
                    {label}
                </a>
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    aria-label={open ? `Collapse ${label} section` : `Expand ${label} section`}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-brand-primary dark:text-white hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                    <ChevronIcon className={`h-5 w-5 transition-transform ${shouldReduceMotion ? '' : 'duration-200'} ${open ? 'rotate-180' : ''}`} />
                </button>
            </div>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        id={panelId}
                        initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        animate={shouldReduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="py-2 pl-1">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
