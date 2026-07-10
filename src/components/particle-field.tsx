import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    opacity: number;
}

const CONNECTION_DISTANCE = 165;
const CONNECTION_OPACITY = 0.22;
const CONNECTION_WIDTH = 0.9;
const SPEED = 0.2;

function particleCount(w: number): number {
    if (w < 640) return 40;
    if (w < 1024) return 60;
    return 80;
}

function createParticles(w: number, h: number): Particle[] {
    const count = particleCount(w);
    return Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * SPEED,
        vy: (Math.random() - 0.5) * SPEED,
        radius: 4 + Math.random() * 4,
        opacity: 0.12 + Math.random() * 0.18,
    }));
}

export default function ParticleField({ playing = true }: { playing?: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const rafRef = useRef<number>(0);
    const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

    const resize = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const parent = canvas.parentElement;
        if (!parent) return;
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        }
        setDimensions({ w, h });

        particlesRef.current = createParticles(w, h);
    }, []);

    useEffect(() => {
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [resize]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !playing || dimensions.w === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { w, h } = dimensions;
        const particles = particlesRef.current;

        function getAccentColor(): string {
            const style = getComputedStyle(document.documentElement);
            const raw = style.getPropertyValue('--color-accent').trim();
            if (!raw) return '2 52 82';
            return raw;
        }

        let accentRgb = getAccentColor();

        // Re-read accent color when theme changes
        const observer = new MutationObserver(() => {
            accentRgb = getAccentColor();
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        function draw() {
            ctx!.clearRect(0, 0, w, h);

            // Update positions
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) { p.x = 0; p.vx *= -1; }
                if (p.x > w) { p.x = w; p.vx *= -1; }
                if (p.y < 0) { p.y = 0; p.vy *= -1; }
                if (p.y > h) { p.y = h; p.vy *= -1; }
            }

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECTION_DISTANCE) {
                        const alpha = CONNECTION_OPACITY * (1 - dist / CONNECTION_DISTANCE);
                        ctx!.beginPath();
                        ctx!.moveTo(particles[i].x, particles[i].y);
                        ctx!.lineTo(particles[j].x, particles[j].y);
                        ctx!.strokeStyle = `rgba(${accentRgb} / ${alpha})`;
                        ctx!.lineWidth = CONNECTION_WIDTH;
                        ctx!.stroke();
                    }
                }
            }

            // Draw particles
            for (const p of particles) {
                ctx!.beginPath();
                ctx!.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2);
                ctx!.fillStyle = `rgba(${accentRgb} / ${p.opacity})`;
                ctx!.fill();
            }

            rafRef.current = requestAnimationFrame(draw);
        }

        rafRef.current = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(rafRef.current);
            observer.disconnect();
        };
    }, [playing, dimensions]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
        />
    );
}
