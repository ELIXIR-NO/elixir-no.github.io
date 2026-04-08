import { motion, useReducedMotion } from 'framer-motion';

/** Pure abstract network constellation — no text, no logos.
 *  Five primary nodes (representing the 5 orgs) connected by lines,
 *  with smaller satellite dots and a subtle pulsing glow. */

interface Node { cx: number; cy: number; r: number; color: string }
const NODES: Node[] = [
    { cx: 32, cy: 22, r: 6, color: '#dc3545' },  // UiB red
    { cx: 72, cy: 14, r: 5, color: '#c8102e' },   // UiO red
    { cx: 16, cy: 56, r: 5, color: '#003349' },    // UiT dark blue
    { cx: 58, cy: 76, r: 5.5, color: '#00509e' },  // NTNU blue
    { cx: 80, cy: 50, r: 5, color: '#005f3b' },    // NMBU green
];

// Hub-and-spoke + cross-links
const EDGES: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 4], [2, 3], [3, 4],
];

// Floating keyword labels drifting through the network
interface Keyword { label: string; cx: number; cy: number }

const KEYWORDS: Keyword[] = [
    { label: 'Training', cx: 20, cy: 80 },
    { label: 'Helpdesk', cx: 72, cy: 64 },
    { label: 'Bioinformatics', cx: 46, cy: 44 },
    { label: 'Storage', cx: 52, cy: 18 },
    { label: 'NeLS', cx: 82, cy: 36 },
    { label: 'Genomics', cx: 22, cy: 38 },
    { label: 'FAIR Data', cx: 64, cy: 86 },
    { label: 'Sensitive Data', cx: 24, cy: 14 },
    { label: 'Cloud', cx: 78, cy: 76 },
    { label: 'Workflows', cx: 40, cy: 88 },
    { label: 'Open Science', cx: 74, cy: 10 },
    { label: 'Proteomics', cx: 18, cy: 66 },
];

export default function AboutHeroVisual() {
    const reduce = useReducedMotion() ?? false;

    return (
        <div
            className="relative w-full aspect-[4/3] max-w-lg mx-auto lg:max-w-none overflow-hidden"
            role="img"
            aria-label="Abstract network visualization representing the ELIXIR Norway collaborative infrastructure"
        >
            {/* Background ambient glow */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <motion.div
                    className="absolute top-[20%] left-[25%] w-48 h-48 rounded-full bg-brand-primary/10 blur-[60px]"
                    animate={reduce ? {} : { scale: [1, 1.15, 1], opacity: [0.1, 0.18, 0.1] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-[20%] right-[20%] w-36 h-36 rounded-full bg-brand-secondary/8 blur-[50px]"
                    animate={reduce ? {} : { scale: [1, 1.2, 1], opacity: [0.08, 0.15, 0.08] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                />
            </div>

            <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
                overflow="hidden"
                aria-hidden="true"
            >
                {/* Dot grid background */}
                <defs>
                    <pattern id="net-dots" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
                        <circle cx="1" cy="1" r="0.25" className="fill-gray-400/15 dark:fill-gray-500/10" />
                    </pattern>
                    {/* Glow filter for primary nodes */}
                    <filter id="node-glow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <rect width="100" height="100" fill="url(#net-dots)" />

                {/* Network edges — animated draw-in */}
                {EDGES.map(([a, b], i) => (
                    <motion.line
                        key={`e${a}-${b}`}
                        x1={NODES[a].cx} y1={NODES[a].cy}
                        x2={NODES[b].cx} y2={NODES[b].cy}
                        stroke="currentColor"
                        strokeWidth="0.4"
                        className="text-gray-400/50 dark:text-gray-500/30"
                        initial={reduce ? {} : { pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
                    />
                ))}

                {/* Travelling pulse dots along edges */}
                {!reduce && EDGES.map(([a, b], i) => {
                    const n1 = NODES[a], n2 = NODES[b];
                    return (
                        <motion.circle
                            key={`p${a}-${b}`}
                            r="0.8"
                            className="fill-accent/60"
                            animate={{
                                cx: [n1.cx, n2.cx, n1.cx],
                                cy: [n1.cy, n2.cy, n1.cy],
                            }}
                            transition={{
                                duration: 4 + i * 0.5,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: 1 + i * 0.6,
                            }}
                        />
                    );
                })}

                {/* Floating keyword labels */}
                {KEYWORDS.map((kw, i) => (
                    <motion.text
                        key={kw.label}
                        x={kw.cx} y={kw.cy}
                        textAnchor="middle"
                        className="fill-gray-300 dark:fill-gray-600 font-bold select-none pointer-events-none uppercase"
                        style={{ fontSize: '4px', letterSpacing: '0.3px' }}
                        initial={reduce ? { opacity: 0.6 } : { opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
                    >
                        {kw.label}
                    </motion.text>
                ))}

                {/* Primary nodes — colored circles with glow */}
                {NODES.map((node, i) => (
                    <motion.g key={`n${i}`}>
                        {/* Pulse ring */}
                        <motion.circle
                            cx={node.cx} cy={node.cy}
                            r={node.r + 2}
                            fill="none"
                            stroke={node.color}
                            strokeWidth="0.5"
                            initial={{ opacity: 0 }}
                            animate={reduce
                                ? { opacity: 0.2 }
                                : { opacity: [0.1, 0.3, 0.1], r: [node.r + 2, node.r + 4, node.r + 2] }
                            }
                            transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                        />
                        {/* Core dot */}
                        <motion.circle
                            cx={node.cx} cy={node.cy}
                            r={node.r}
                            fill={node.color}
                            filter="url(#node-glow)"
                            initial={reduce ? {} : { scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.15 + i * 0.08, type: 'spring', stiffness: 200 }}
                        />
                        {/* Inner highlight */}
                        <circle
                            cx={node.cx - node.r * 0.25}
                            cy={node.cy - node.r * 0.25}
                            r={node.r * 0.35}
                            fill="white"
                            opacity="0.3"
                        />
                    </motion.g>
                ))}
            </svg>
        </div>
    );
}
