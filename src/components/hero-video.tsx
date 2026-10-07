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

// Dev-only stand-in, never referenced by production builds: CC0 drone footage of ice climbing near Tromsø,
// https://commons.wikimedia.org/wiki/File:Drone_Footage_of_People_Climbing_Ice_Formation.webm
const SAMPLE_SOURCES: VideoSource[] = [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Drone_Footage_of_People_Climbing_Ice_Formation.webm', type: 'video/webm' },
];

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
                    className="h-full w-full object-cover saturate-[.9]"
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
                <img src={poster} alt="" className="h-full w-full object-cover saturate-[.9]" />
            )}
            {/* A light global tint; the hero copy carries its own glow for contrast. */}
            <div className="absolute inset-0 bg-[rgb(var(--color-paper)/var(--hero-tint))]" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-paper" />
        </div>
    );
}
