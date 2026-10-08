import { MotionConfig, motion, useReducedMotion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { PauseIcon, PlayIcon } from '@heroicons/react/20/solid';
import Button from './button';
import HeroVideo from './hero-video';


const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

// The first phrase is also the static fallback and completes the sr-only heading.
const WORDS = [
    'life science', 'genomics', 'bioinformatics', 'biomedical', 'proteomics',
    'scientists across Norway', 'discoveries that matter', 'data you can trust', 'understanding life', 'the next generation',
];
const FLIP_MS = 600;
// Multi-word phrases stay a little longer than single fields so they can be read.
const dwellMs = (word: string) => (word.includes(' ') && word !== WORDS[0] ? 2600 : 2300);

function RotatingWord({ playing }: { playing: boolean }) {
    const [{ current, leaving }, setFlip] = useState<{ current: number; leaving: number | null }>({ current: 0, leaving: null });

    useEffect(() => {
        if (!playing) return;
        const id = setTimeout(() => {
            setFlip(({ current }) => ({ current: (current + 1) % WORDS.length, leaving: current }));
        }, FLIP_MS + dwellMs(WORDS[current]));
        return () => clearTimeout(id);
    }, [playing, current]);

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
            {/* Exactly one screen tall (svh, with vh as the fallback) so the next section never peeks;
                min-height lets it grow when the content needs more room. */}
            <section className="relative -mt-[var(--nav-offset)] flex min-h-screen min-h-svh flex-col overflow-hidden">
                <HeroVideo playing={playing} />

                <div className="relative z-10 flex flex-1 items-center pt-[calc(var(--nav-offset)+clamp(1rem,5vh,4rem))] pb-[clamp(4.5rem,10vh,7rem)]">
                    <div className="w-full px-6 sm:px-8 mx-auto text-center">
                        <div className="relative max-w-3xl mx-auto">
                            {/* A faint, wide paper glow behind the copy that eases out over many stops, so it lifts
                                contrast without reading as a shape. */}
                            <div
                                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[160%] w-[170%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgb(var(--color-paper)/0.5),rgb(var(--color-paper)/0.44)_25%,rgb(var(--color-paper)/0.32)_45%,rgb(var(--color-paper)/0.18)_65%,rgb(var(--color-paper)/0.07)_82%,transparent)]"
                                aria-hidden="true"
                            />
                            <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }}>
                                <a
                                    href="https://elixir-europe.org"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hero-legible inline-flex items-center gap-2.5 text-sm font-semibold text-ink hover:underline underline-offset-4 before:h-2 before:w-2 before:rounded-marker before:bg-marker before:content-['']"
                                >
                                    Part of the European ELIXIR infrastructure
                                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                                </a>
                            </motion.div>

                            <motion.h1
                                {...fadeUp}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="mt-4 sm:mt-5 text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-semibold tracking-[-0.035em] text-ink leading-[1.05] text-balance hero-legible"
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
                                className="mt-6 sm:mt-8 text-base sm:text-lg leading-relaxed text-ink max-w-2xl mx-auto hero-legible"
                            >
                                ELIXIR Norway supports life science researchers with bioinformatics
                                services, data management tools, and secure e-infrastructure.
                                Part of Europe's leading bioinformatics network.
                            </motion.p>

                            <motion.div
                                {...fadeUp}
                                transition={{ duration: 0.6, delay: 0.4 }}
                                className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8"
                            >
                                <Button href={`${BASE}/services`}>Explore services</Button>
                                <Button href={`${BASE}/research-support`} variant="link" className="hero-legible">Get support</Button>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Hidden by CSS rather than by useReducedMotion so server and client markup match. */}
                <button
                    type="button"
                    onClick={() => setPaused(p => !p)}
                    className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-10 motion-reduce:hidden inline-flex min-h-9 items-center gap-2 rounded-control border border-rule bg-paper/90 px-2.5 text-xs font-medium text-ink transition-colors hover:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
