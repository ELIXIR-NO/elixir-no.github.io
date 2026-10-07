import { MotionConfig, motion, useReducedMotion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { ArrowRightIcon, ArrowTopRightOnSquareIcon, LifebuoyIcon } from '@heroicons/react/24/outline';
import { PauseIcon, PlayIcon } from '@heroicons/react/20/solid';


const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const WORDS = ['life science', 'genomics', 'bioinformatics', 'biomedical', 'proteomics'];
const FLIP_MS = 600;
const DWELL_MS = 2300;

function RotatingWord({ playing }: { playing: boolean }) {
    const [{ current, leaving }, setFlip] = useState<{ current: number; leaving: number | null }>({ current: 0, leaving: null });

    useEffect(() => {
        if (!playing) return;
        const id = setInterval(() => {
            setFlip(({ current }) => ({ current: (current + 1) % WORDS.length, leaving: current }));
        }, FLIP_MS + DWELL_MS);
        return () => clearInterval(id);
    }, [playing]);

    useEffect(() => {
        if (leaving === null) return;
        const id = setTimeout(() => setFlip(flip => ({ ...flip, leaving: null })), FLIP_MS);
        return () => clearTimeout(id);
    }, [leaving]);

    return (
        <span className="rotor" aria-hidden="true">
            {WORDS.map((word, i) => {
                const state = i === current
                    ? (leaving === null ? 'is-on' : 'is-on is-in')
                    : i === leaving ? 'is-out' : '';
                return <span key={word} className={`rotor-word ${state}`}>{word}</span>;
            })}
        </span>
    );
}

export function Hero() {
    const shouldReduceMotion = useReducedMotion();
    const [paused, setPaused] = useState(false);
    const playing = !paused && !shouldReduceMotion;

    // Transform only, so the server-rendered hero is readable before hydration. The same
    // props render on server and client; MotionConfig skips the movement for reduced motion.
    const fadeUp = { initial: { y: 12 }, animate: { y: 0 } };

    return (
        <MotionConfig reducedMotion="user">
            <section className="relative -mt-[var(--nav-offset)] overflow-hidden">
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
                                className="mt-4 sm:mt-5 text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-semibold tracking-[-0.035em] text-ink leading-[1.05] text-balance"
                            >
                                <span className="sr-only">Research infrastructure for life science</span>
                                <span aria-hidden="true">Research infrastructure for</span>
                                <span className="block">
                                    <RotatingWord playing={playing} />
                                </span>
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

                {/* Hidden by CSS rather than by useReducedMotion so server and client markup match. */}
                <button
                    type="button"
                    onClick={() => setPaused(p => !p)}
                    className="absolute bottom-6 sm:bottom-8 right-4 sm:right-8 z-10 motion-reduce:hidden inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-xs font-medium text-muted hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                    {paused
                        ? <PlayIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        : <PauseIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span className="sr-only sm:not-sr-only">{paused ? 'Play animation' : 'Pause animation'}</span>
                </button>
            </section>
        </MotionConfig>
    );
}

export default Hero;
