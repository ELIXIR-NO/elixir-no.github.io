import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);
    const shouldReduceMotion = useReducedMotion();

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

    const iconVariants = shouldReduceMotion
        ? { initial: {}, animate: {}, exit: {} }
        : {
            initial: { scale: 0, rotate: -90, opacity: 0 },
            animate: { scale: 1, rotate: 0, opacity: 1 },
            exit: { scale: 0, rotate: 90, opacity: 0 },
        };

    return (
        <motion.button
            onClick={toggle}
            className="relative h-9 w-9 flex items-center justify-center rounded-control border border-rule text-ink hover:border-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            whileHover={undefined}
            whileTap={undefined}
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
                        className="h-5 w-5"
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
                        className="h-5 w-5"
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
        </motion.button>
    );
}
