import { motion, useReducedMotion } from 'framer-motion';
import React, { Suspense, lazy, useState, useEffect } from 'react';
import { ArrowRightIcon, ArrowTopRightOnSquareIcon, ChevronDownIcon, LifebuoyIcon } from '@heroicons/react/24/outline';

const ParticleField = lazy(() => import('./particle-field'));
const MotionChevronDown = motion.create(ChevronDownIcon);

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const WORDS = ['life science', 'genomics', 'bioinformatics', 'biomedical', 'proteomics'];
const TYPE_SPEED = 70;
const DELETE_SPEED = 40;
const PAUSE_AFTER_TYPE = 2000;
const PAUSE_AFTER_DELETE = 400;

function TypingWord({ shouldReduceMotion }: { shouldReduceMotion: boolean | null }) {
    const [wordIndex, setWordIndex] = useState(0);
    const [displayed, setDisplayed] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (shouldReduceMotion) {
            setDisplayed(WORDS[0]);
            return;
        }

        const word = WORDS[wordIndex];

        if (!isDeleting && displayed === word) {
            const id = setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPE);
            return () => clearTimeout(id);
        }

        if (isDeleting && displayed === '') {
            const id = setTimeout(() => {
                setWordIndex(i => (i + 1) % WORDS.length);
                setIsDeleting(false);
            }, PAUSE_AFTER_DELETE);
            return () => clearTimeout(id);
        }

        const speed = isDeleting ? DELETE_SPEED : TYPE_SPEED;
        const id = setTimeout(() => {
            setDisplayed(isDeleting
                ? word.slice(0, displayed.length - 1)
                : word.slice(0, displayed.length + 1)
            );
        }, speed);
        return () => clearTimeout(id);
    }, [displayed, isDeleting, wordIndex, shouldReduceMotion]);

    if (shouldReduceMotion) {
        return <span>{WORDS[0]}</span>;
    }

    return (
        <span>
            {displayed}
            <motion.span
                className="inline-block w-[0.6em] h-[3px] bg-accent ml-0.5 rounded-full translate-y-[0.1em]"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                aria-hidden="true"
            />
        </span>
    );
}

function ScrollCue({ shouldReduceMotion }: { shouldReduceMotion: boolean | null }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY < 100);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const handleClick = () => {
        const hero = document.querySelector('section');
        if (hero?.nextElementSibling) {
            hero.nextElementSibling.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' });
        }
    };

    return (
        <motion.button
            onClick={handleClick}
            aria-label="Scroll to content"
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={{ opacity: visible ? 1 : 0 }}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 1 }}
            className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 p-2 text-gray-500 dark:text-gray-400 hover:text-brand-primary dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-full"
        >
            <MotionChevronDown
                className="h-6 w-6"
                aria-hidden="true"
                animate={shouldReduceMotion ? {} : { y: [0, 6, 0] }}
                transition={shouldReduceMotion ? {} : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
        </motion.button>
    );
}

export function Hero() {
    const shouldReduceMotion = useReducedMotion();

    const fadeUp = shouldReduceMotion
        ? {}
        : { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } };

    return (
        <section className="relative -mt-[84px] overflow-hidden lg:min-h-screen">
            <div
                className="absolute inset-0 bg-gradient-to-br from-brand-primary/[0.03] via-transparent to-brand-secondary/[0.03] dark:from-brand-primary/20 dark:via-dark-background dark:to-brand-secondary/10"
                aria-hidden="true"
            />

            {!shouldReduceMotion && (
                <Suspense fallback={null}>
                    <ParticleField playing={true} />
                </Suspense>
            )}

            <div className="relative min-h-screen flex items-center pt-[84px] pb-12 sm:pb-16 lg:pb-16 z-10">
                <div className="w-full px-6 sm:px-8 mx-auto text-center">
                    <div className="max-w-3xl mx-auto">
                        <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }}>
                            <a
                                href="https://elixir-europe.org"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                            >
                                Part of the European ELIXIR infrastructure
                                <ArrowTopRightOnSquareIcon className="ml-1.5 h-3 w-3 opacity-60" aria-hidden="true" />
                            </a>
                        </motion.div>

                        <motion.h1
                            {...fadeUp}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="mt-3 sm:mt-4 text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-bold tracking-tight text-brand-primary dark:text-white leading-[1.1]"
                        >
                            Research infrastructure<br />
                            <span className="whitespace-nowrap">for <TypingWord shouldReduceMotion={shouldReduceMotion} /></span>
                        </motion.h1>

                        <motion.p
                            {...fadeUp}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="mt-6 sm:mt-8 text-base sm:text-lg leading-relaxed text-brand-grey dark:text-gray-300 max-w-2xl mx-auto"
                        >
                            ELIXIR Norway supports life science researchers with bioinformatics
                            services, data management tools, and secure e-infrastructure.
                            Part of Europe's leading bioinformatics network.
                        </motion.p>

                        <motion.div
                            {...fadeUp}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:flex-wrap justify-center gap-3 sm:gap-4"
                        >
                            <a
                                href={`${BASE}/services`}
                                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-primary text-white font-semibold text-sm shadow-lg shadow-brand-primary/25 transform-gpu transition-all duration-200 ease-out hover:shadow-xl hover:shadow-brand-primary/30 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-background"
                            >
                                Explore services
                                <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1" aria-hidden="true" />
                            </a>
                            <a
                                href={`${BASE}/research-support`}
                                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-white/[0.03] backdrop-blur-sm text-brand-primary dark:text-gray-200 font-semibold text-sm transform-gpu transition-all duration-200 ease-out hover:border-accent/50 hover:bg-white dark:hover:bg-white/[0.07] motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-background"
                            >
                                <LifebuoyIcon className="h-4 w-4 text-accent" aria-hidden="true" />
                                Get support
                            </a>
                        </motion.div>
                    </div>
                </div>
            </div>

            <ScrollCue shouldReduceMotion={shouldReduceMotion} />
        </section>
    );
}

export default Hero;
