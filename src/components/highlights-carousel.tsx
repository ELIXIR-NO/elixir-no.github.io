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
                    <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                        Highlights
                    </span>
                    <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-brand-primary dark:text-white">
                        From our network
                    </h2>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <button
                        onClick={prev}
                        className="p-2 rounded-lg border border-gray-200/60 dark:border-gray-700/30 text-brand-grey dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label="Previous slide"
                    >
                        <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                        onClick={next}
                        className="p-2 rounded-lg border border-gray-200/60 dark:border-gray-700/30 text-brand-grey dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label="Next slide"
                    >
                        <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* Main image — fixed 16:9 crop */}
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 dark:bg-dark-surface">
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <motion.div
                        key={current}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                        className="absolute inset-0"
                    >
                        <img
                            src={`${BASE}${slide.src}`}
                            alt={slide.alt}
                            className="w-full h-full object-cover"
                        />
                    </motion.div>
                </AnimatePresence>

                {/* Slide counter badge */}
                <div className="absolute top-4 right-4 rounded-full bg-black/50 backdrop-blur-sm px-3 py-1 text-xs font-mono text-white/80 tabular-nums">
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
                        className="text-sm sm:text-base leading-relaxed text-brand-grey dark:text-gray-300"
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
                            className={`relative w-14 h-10 sm:w-16 sm:h-11 rounded-lg overflow-hidden transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                                i === current
                                    ? 'ring-2 ring-accent opacity-100'
                                    : 'opacity-40 hover:opacity-70 grayscale hover:grayscale-0'
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
                        className="w-10 h-10 sm:h-11 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                    <div key={i} className="relative flex-1 h-0.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        {i === current && !paused && !shouldReduceMotion ? (
                            <motion.div
                                className="absolute inset-y-0 left-0 bg-accent rounded-full"
                                initial={{ width: '0%' }}
                                animate={{ width: '100%' }}
                                transition={{ duration: INTERVAL / 1000, ease: 'linear' }}
                                key={`progress-${current}`}
                            />
                        ) : (
                            <div className={`absolute inset-0 rounded-full transition-colors ${i === current ? 'bg-accent' : ''}`} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
