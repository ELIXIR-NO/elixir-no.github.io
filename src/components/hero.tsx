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
                className="inline-block w-[0.38em] h-[0.1em] bg-marker ml-[0.08em]"
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
            className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 p-2 text-muted hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-control"
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
        <section className="relative -mt-[var(--nav-offset)] overflow-hidden">
            <div
                className="absolute inset-0 bg-gradient-to-br from-brand-primary/[0.03] via-transparent to-brand-secondary/[0.03] dark:from-brand-primary/20 dark:via-dark-background dark:to-brand-secondary/10"
                aria-hidden="true"
            />

            {!shouldReduceMotion && (
                <Suspense fallback={null}>
                    <ParticleField playing={true} />
                </Suspense>
            )}

            <div className="relative flex items-center pt-[calc(var(--nav-offset)+4rem)] pb-24 lg:pt-[calc(var(--nav-offset)+5rem)] lg:pb-28 z-10">
                <div className="w-full px-6 sm:px-8 mx-auto text-center">
                    <div className="max-w-3xl mx-auto">
                        <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }}>
                            <a
                                href="https://elixir-europe.org"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2.5 text-sm font-semibold text-ink hover:underline underline-offset-4 before:h-2 before:w-2 before:rounded-marker before:bg-marker before:content-['']"
                            >
                                Part of the European ELIXIR infrastructure
                                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                            </a>
                        </motion.div>

                        <motion.h1
                            {...fadeUp}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="mt-4 sm:mt-5 text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-semibold tracking-[-0.035em] text-ink leading-[1.05]"
                        >
                            Research infrastructure<br />
                            <span className="whitespace-nowrap">for <TypingWord shouldReduceMotion={shouldReduceMotion} /></span>
                        </motion.h1>

                        <motion.p
                            {...fadeUp}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="mt-6 sm:mt-8 text-base sm:text-lg leading-relaxed text-body max-w-2xl mx-auto"
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
                                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-control bg-ink text-paper font-semibold text-sm transition-colors duration-200 ease-out hover:bg-ink/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                            >
                                Explore services
                                <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1" aria-hidden="true" />
                            </a>
                            <a
                                href={`${BASE}/research-support`}
                                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-control border border-rule bg-surface text-ink font-semibold text-sm transition-colors duration-200 ease-out hover:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                            >
                                <LifebuoyIcon className="h-4 w-4 text-ink" aria-hidden="true" />
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
