import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Inside the merged nav bar (group data-merged) the circles drop their own
// surface so the bar reads as one piece; the colour transition rides the morph.
export const circleButtonClass =
    'h-10 w-10 flex items-center justify-center rounded-full border border-rule bg-surface/90 text-ink hover:border-ink group-data-[merged=true]:border-transparent group-data-[merged=true]:bg-transparent group-data-[merged=true]:hover:border-transparent group-data-[merged=true]:hover:bg-ink/5 transition-[border-color,background-color,color] duration-300 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

// Transform-only entrance so the icon swap collapses to a cross-fade under reduced motion
// (the nav's MotionConfig skips transforms) and the server-rendered markup never depends on it.
const iconVariants = {
    initial: { scale: 0, rotate: -90, opacity: 0 },
    animate: { scale: 1, rotate: 0, opacity: 1 },
    exit: { scale: 0, rotate: 90, opacity: 0 },
};

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    const toggle = () => {
        const el = document.documentElement;
        el.classList.toggle('dark');
        const dark = el.classList.contains('dark');
        localStorage.setItem('theme', dark ? 'dark' : 'light');
        setIsDark(dark);
    };

    return (
        <button
            onClick={toggle}
            className={`relative ${circleButtonClass}`}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                    <motion.svg
                        key="sun"
                        variants={iconVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-[22px] w-[22px]"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                        />
                    </motion.svg>
                ) : (
                    <motion.svg
                        key="moon"
                        variants={iconVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-[22px] w-[22px]"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
                        />
                    </motion.svg>
                )}
            </AnimatePresence>
        </button>
    );
}
