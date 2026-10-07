import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { PauseIcon, PlayIcon } from '@heroicons/react/24/solid';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

interface Slide {
    src: string;
    alt: string;
    caption?: string;
}

export default function HighlightsCarousel({ slides }: { slides: Slide[] }) {
    const [current, setCurrent] = useState(0);
    const [paused, setPaused] = useState(false);
    const [direction, setDirection] = useState(1);
    const shouldReduceMotion = useReducedMotion();
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    const INTERVAL = 6000;

    const go = useCallback((idx: number) => {
        setDirection(idx > current ? 1 : -1);
        setCurrent(idx);
    }, [current]);

    const next = useCallback(() => {
        setDirection(1);
        setCurrent(i => (i + 1) % slides.length);
    }, [slides.length]);

    const prev = useCallback(() => {
        setDirection(-1);
        setCurrent(i => (i - 1 + slides.length) % slides.length);
    }, [slides.length]);

    useEffect(() => {
        if (paused || shouldReduceMotion) return;
        timerRef.current = setTimeout(next, INTERVAL);
        return () => clearTimeout(timerRef.current);
    }, [current, paused, shouldReduceMotion, next]);

    const slide = slides[current];

    const variants = shouldReduceMotion
        ? { enter: {}, center: {}, exit: {} }
        : {
            enter: (d: number) => ({ x: d > 0 ? '6%' : '-6%', opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit: (d: number) => ({ x: d > 0 ? '-6%' : '6%', opacity: 0 }),
        };

    return (
        <div
            className="relative w-full"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            role="region"
            aria-label="Highlights carousel"
            aria-roledescription="carousel"
        >
            {/* Header row */}
            <div className="flex items-end justify-between mb-8">
                <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-marker-text">
                        Highlights
                    </span>
                    <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
                        From our network
                    </h2>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <button
                        onClick={prev}
                        className="p-2 rounded-control border border-rule text-ink hover:border-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label="Previous slide"
                    >
                        <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                        onClick={next}
                        className="p-2 rounded-control border border-rule text-ink hover:border-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label="Next slide"
                    >
                        <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* Screenshots vary in aspect, so they sit framed inside a fixed 16:9 plate instead of being cropped. */}
            <div className="relative aspect-[16/9] rounded-card overflow-hidden border border-rule bg-paper">
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <motion.div
                        key={current}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                        className="absolute inset-0 p-3 sm:p-6"
                    >
                        <img
                            src={`${BASE}${slide.src}`}
                            alt={slide.alt}
                            className="w-full h-full object-contain"
                        />
                    </motion.div>
                </AnimatePresence>

                {/* Slide counter badge */}
                <div className="absolute top-3 right-3 rounded-control border border-rule bg-surface px-2 py-0.5 text-xs font-mono text-muted tabular-nums">
                    {String(current + 1).padStart(2, '0')}/{String(slides.length).padStart(2, '0')}
                </div>
            </div>

            {/* Caption + thumbnails + progress row */}
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 lg:gap-10 items-start">
                {/* Caption */}
                <AnimatePresence mode="wait">
                    <motion.p
                        key={current}
                        initial={shouldReduceMotion ? {} : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={shouldReduceMotion ? {} : { opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="text-sm sm:text-base leading-relaxed text-body"
                    >
                        {slide.caption || slide.alt}
                    </motion.p>
                </AnimatePresence>

                {/* Thumbnails */}
                <div className="flex gap-2 shrink-0" role="tablist" aria-label="Slide indicators">
                    {slides.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => go(i)}
                            role="tab"
                            aria-selected={i === current}
                            aria-label={`Slide ${i + 1} of ${slides.length}`}
                            className={`relative w-14 h-10 sm:w-16 sm:h-11 rounded-photo overflow-hidden border bg-paper transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                                i === current
                                    ? 'border-ink'
                                    : 'border-rule opacity-60 hover:opacity-100'
                            }`}
                        >
                            <img
                                src={`${BASE}${s.src}`}
                                alt=""
                                aria-hidden="true"
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        </button>
                    ))}
                    <button
                        onClick={() => setPaused(p => !p)}
                        className="w-10 h-10 sm:h-11 flex items-center justify-center rounded-control border border-rule text-ink hover:border-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label={paused ? 'Resume auto-play' : 'Pause auto-play'}
                    >
                        {paused ? (
                            <PlayIcon className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <PauseIcon className="h-4 w-4" aria-hidden="true" />
                        )}
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 flex gap-1" aria-hidden="true">
                {slides.map((_, i) => (
                    <div key={i} className="relative flex-1 h-0.5 bg-rule overflow-hidden">
                        {i === current && !paused && !shouldReduceMotion ? (
                            <motion.div
                                className="absolute inset-y-0 left-0 bg-marker"
                                initial={{ width: '0%' }}
                                animate={{ width: '100%' }}
                                transition={{ duration: INTERVAL / 1000, ease: 'linear' }}
                                key={`progress-${current}`}
                            />
                        ) : (
                            <div className={`absolute inset-0 transition-colors ${i === current ? 'bg-marker' : ''}`} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
