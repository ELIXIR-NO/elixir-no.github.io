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

type NetworkInformation = { saveData?: boolean };

function Placeholder() {
    return (
        <div
            className="absolute inset-0 grid place-items-center bg-surface"
            style={{
                backgroundImage:
                    'linear-gradient(rgb(var(--color-rule) / 0.6) 1px, transparent 1px),' +
                    'linear-gradient(90deg, rgb(var(--color-rule) / 0.6) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
                backgroundPosition: 'center',
            }}
        >
            <span className="inline-flex items-center gap-2 rounded-chip border border-rule bg-surface px-2.5 py-1 font-mono text-xs text-muted before:h-1.5 before:w-1.5 before:rounded-marker before:bg-marker before:content-['']">
                Video coming soon
            </span>
        </div>
    );
}

/** Decorative hero film. Never autoplays under reduced motion, Save-Data, or when paused; the hero's pause button is the accessible control. */
export default function HeroVideo({ playing }: { playing: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [inView, setInView] = useState(false);
    const [saveData, setSaveData] = useState(false);

    useEffect(() => {
        setSaveData(Boolean((navigator as Navigator & { connection?: NetworkInformation }).connection?.saveData));
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
        observer.observe(video);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (playing && inView && !saveData) {
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    }, [playing, inView, saveData]);

    const { poster, sources } = HERO_VIDEO;

    if (sources.length === 0) {
        return poster
            ? <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
            : <Placeholder />;
    }

    return (
        <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            poster={poster}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
        >
            {sources.map(source => (
                <source key={source.src} src={source.src} type={source.type} media={source.media} />
            ))}
        </video>
    );
}
