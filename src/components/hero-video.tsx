import { useEffect, useRef, useState } from 'react';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

type VideoSource = { src: string; type: string; media?: string };

// Best codec first, each as a 720p variant for small screens then full size. A browser that ignores
// `media` on <source> takes the first playable entry, the 720p AV1, which still fills the hero.
const HERO_VIDEO: { poster: string; sources: VideoSource[] } = {
    poster: `${BASE}/videos/hero-poster.avif`,
    sources: [
        { src: `${BASE}/videos/hero-720.av1.mp4`, type: 'video/mp4; codecs="av01.0.08M.08"', media: '(max-width: 767px)' },
        { src: `${BASE}/videos/hero.av1.mp4`, type: 'video/mp4; codecs="av01.0.09M.08"' },
        { src: `${BASE}/videos/hero-720.webm`, type: 'video/webm; codecs="vp09.00.40.08"', media: '(max-width: 767px)' },
        { src: `${BASE}/videos/hero.webm`, type: 'video/webm; codecs="vp09.00.41.08"' },
        { src: `${BASE}/videos/hero-720.mp4`, type: 'video/mp4; codecs="avc1.640020"', media: '(max-width: 767px)' },
        { src: `${BASE}/videos/hero.mp4`, type: 'video/mp4; codecs="avc1.640032"' },
    ],
};

// Dev-only stand-in: a local montage of ELIXIR Norway photos and clips. The file is excluded via
// .git/info/exclude and never committed; index.astro only enables it under `astro dev` when the
// file exists, so a fresh clone gets the empty state.
const SAMPLE_SOURCES: VideoSource[] = [
    { src: `${BASE}/videos/dev-sample.webm`, type: 'video/webm' },
];

type NetworkInformation = { saveData?: boolean };

/**
 * Decorative full-bleed hero film under a paper tint. The <video> is only added after mount and
 * never under reduced motion, Save-Data or without sources, so the server HTML is the poster (or
 * plain paper) and nothing downloads for those visitors. The hero's pause button is the control.
 */
export default function HeroVideo({ playing, devSample = false }: { playing: boolean; devSample?: boolean }) {
    const sources = import.meta.env.DEV && devSample ? SAMPLE_SOURCES : HERO_VIDEO.sources;
    const videoRef = useRef<HTMLVideoElement>(null);
    const [allowVideo, setAllowVideo] = useState(false);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const saveData = Boolean((navigator as Navigator & { connection?: NetworkInformation }).connection?.saveData);
        setAllowVideo(sources.length > 0 && !reduceMotion && !saveData);
    }, [sources]);

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
                    className="h-full w-full object-cover"
                    poster={poster}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                >
                    {sources.map((source, i) => (
                        <source
                            key={source.src}
                            src={source.src}
                            type={source.type}
                            media={source.media}
                            onError={i === sources.length - 1 ? () => setAllowVideo(false) : undefined}
                        />
                    ))}
                </video>
            ) : (
                <img src={poster} alt="" className="h-full w-full object-cover" />
            )}
            {/* A light global tint; the hero copy carries its own glow for contrast. */}
            <div className="absolute inset-0 bg-[rgb(var(--color-paper)/var(--hero-tint))]" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-paper" />
        </div>
    );
}
