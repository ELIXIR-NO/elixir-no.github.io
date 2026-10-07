import { useEffect, useRef, useState } from 'react';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

type VideoSource = { src: string; type: string; media?: string };

// Drop hero.webm, hero.mp4 (plus hero-720.webm / hero-720.mp4) and hero-poster.avif into public/videos/ and list them here.
const HERO_VIDEO: { poster?: string; sources: VideoSource[] } = {
    poster: undefined, // `${BASE}/videos/hero-poster.avif`
    sources: [
        // { src: `${BASE}/videos/hero-720.webm`, type: 'video/webm', media: '(max-width: 767px)' },
        // { src: `${BASE}/videos/hero-720.mp4`, type: 'video/mp4', media: '(max-width: 767px)' },
        // { src: `${BASE}/videos/hero.webm`, type: 'video/webm' },
        // { src: `${BASE}/videos/hero.mp4`, type: 'video/mp4' },
    ],
};

// Stand-in footage for local development only; production builds never reference it.
const SAMPLE_SOURCES: VideoSource[] = [];

const SOURCES = import.meta.env.DEV && SAMPLE_SOURCES.length > 0 ? SAMPLE_SOURCES : HERO_VIDEO.sources;

type NetworkInformation = { saveData?: boolean };

/**
 * Decorative full-bleed hero film under a paper tint. The <video> is only added after mount and
 * never under reduced motion, Save-Data or without sources, so the server HTML is the poster (or
 * plain paper) and nothing downloads for those visitors. The hero's pause button is the control.
 */
export default function HeroVideo({ playing }: { playing: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [allowVideo, setAllowVideo] = useState(false);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const saveData = Boolean((navigator as Navigator & { connection?: NetworkInformation }).connection?.saveData);
        setAllowVideo(SOURCES.length > 0 && !reduceMotion && !saveData);
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
        observer.observe(video);
        return () => observer.disconnect();
    }, [allowVideo]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (playing && inView) {
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    }, [playing, inView, allowVideo]);

    const { poster } = HERO_VIDEO;
    if (!allowVideo && !poster) return null;

    return (
        <div className="absolute inset-0" aria-hidden="true">
            {allowVideo ? (
                <video
                    ref={videoRef}
                    className="h-full w-full object-cover saturate-[.8]"
                    poster={poster}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                >
                    {SOURCES.map(source => (
                        <source key={source.src} src={source.src} type={source.type} media={source.media} />
                    ))}
                </video>
            ) : (
                <img src={poster} alt="" className="h-full w-full object-cover saturate-[.8]" />
            )}
            {/* Tint keeps the hero copy at AA contrast over any frame; calmest behind the text. */}
            <div className="absolute inset-0 bg-paper/[0.82] dark:bg-paper/80" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,rgb(var(--color-paper)/0.7),transparent)]" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-paper" />
        </div>
    );
}
