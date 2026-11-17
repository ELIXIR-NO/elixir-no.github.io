import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { PauseIcon, PlayIcon } from '@heroicons/react/20/solid';
import Button from './button';
import HeroVideo from './hero-video';
import type { HeroCopy } from '../lib/site';

const SWAP = { duration: 0.5, ease: [0.22, 1, 0.36, 1] } as const;
// Multi-word phrases stay a little longer than single fields so they can be read.
const dwellMs = (word: string, words: string[]) => (word.includes(' ') && word !== words[0] ? 2600 : 2300);

function RotatingWord({ words, playing }: { words: string[]; playing: boolean }) {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        if (!playing) return;
        const id = setTimeout(() => setCurrent((i) => (i + 1) % words.length), SWAP.duration * 1000 + dwellMs(words[current], words));
        return () => clearTimeout(id);
    }, [playing, current, words]);

    return (
        <span className="rotor" aria-hidden="true">
            {words.map((word) => <span key={word} className="rotor-word invisible">{word}</span>)}
            {/* The old phrase rises out while the new one rises in over it, so the line is never empty mid-swap.
                Search picks up every phrase from the invisible copies above, so this one stays out of it. */}
            <AnimatePresence initial={false}>
                <motion.span
                    key={words[current]}
                    className="rotor-word"
                    data-pagefind-ignore
                    initial={{ y: '0.5em', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '-0.5em', opacity: 0 }}
                    transition={SWAP}
                >
                    {words[current]}
                </motion.span>
            </AnimatePresence>
        </span>
    );
}

export function Hero({ copy }: { copy: HeroCopy }) {
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
                                    href={copy.tagline.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hero-legible inline-flex items-center gap-2.5 text-sm font-semibold text-ink hover:underline underline-offset-4 before:h-2 before:w-2 before:rounded-marker before:bg-marker before:content-[''] rounded-control focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                >
                                    {copy.tagline.label}
                                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                                </a>
                            </motion.div>

                            <motion.h1
                                {...fadeUp}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="mt-4 sm:mt-5 text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-semibold tracking-[-0.035em] text-ink leading-[1.05] text-balance hero-legible"
                            >
                                <span className="sr-only">{`${copy.headline} ${copy.rotatingWords[0]}`}</span>
                                <span aria-hidden="true">{copy.headline}</span>
                                <span className="block">
                                    <RotatingWord words={copy.rotatingWords} playing={playing} />
                                </span>
                            </motion.h1>

                            <motion.p
                                {...fadeUp}
                                transition={{ duration: 0.6, delay: 0.3 }}
                                className="mt-6 sm:mt-8 text-base sm:text-lg leading-relaxed text-ink max-w-2xl mx-auto hero-legible"
                            >
                                {copy.subline}
                            </motion.p>

                            <motion.div
                                {...fadeUp}
                                transition={{ duration: 0.6, delay: 0.4 }}
                                className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8"
                            >
                                <Button href={copy.primaryAction.href}>{copy.primaryAction.label}</Button>
                                <Button href={copy.secondaryAction.href} variant="link" className="hero-legible">{copy.secondaryAction.label}</Button>
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
