import { useEffect, useState } from 'react';
import { MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { organizations } from '../data/organizations';
import { needsDarkOutline } from '../lib/utils';

/** The five ELIXIR Norway nodes on a dot-matrix Norway, linked by the network edges, with
 *  service keywords drifting through the open space around it. */

// One character per grid cell, north at the top. Traced from mainland Norway with the far north
// squeezed so Tromsø sits closer to the south, then smoothed by hand: fjords filled, islands dropped.
const MASK = [
    '.......................................#',
    '................................############',
    '...............................#############',
    '........................##############..###',
    '........................#############',
    '....................#########...####',
    '....................######',
    '....................###',
    '....................###',
    '..................#####',
    '..................####',
    '................#####',
    '................####',
    '..............######',
    '............#######',
    '...........########',
    '..........#######',
    '........########',
    '.......#########',
    '......##########',
    '.....###########',
    '.....###########',
    '...#############',
    '..##############',
    '.###############',
    '.###############',
    '.###############',
    '.################',
    '.################',
    '.################',
    '.###############',
    '.################',
    '.################',
    '.################',
    '.###############',
    '.###############',
    '.##############',
    '.##############',
    '.###########.##',
    '..##########.##',
    '..########',
    '..########',
    '..#######',
    '....####',
    '....###',
];
const PITCH = 2;
const DOTS = MASK.flatMap((row, r) =>
    [...row].flatMap((cell, c) => (cell === '#' ? [{ x: c * PITCH, y: r * PITCH }] : [])),
);

type Side = 'start' | 'end';
interface Node { cx: number; cy: number; r: number; color: string; label: string; side: Side }
// Placed by hand on the grid, not to scale: Oslo and Ås are pulled apart so neither the circles
// nor the labels touch, and Oslo sits east of the Trondheim to Ås edge so no line crosses it.
const NODES: Node[] = [
    { cx: 4, cy: 64, r: 5, color: organizations.bergen.color, label: 'Bergen', side: 'end' },
    { cx: 30, cy: 61, r: 4.5, color: organizations.oslo.color, label: 'Oslo', side: 'start' },
    { cx: 56, cy: 6, r: 4.5, color: organizations.tromso.color, label: 'Tromsø', side: 'start' },
    { cx: 17, cy: 36, r: 4.5, color: organizations.trondheim.color, label: 'Trondheim', side: 'end' },
    { cx: 26, cy: 76, r: 4.5, color: organizations.aas.color, label: 'Ås', side: 'start' },
];

// Hub-and-spoke from Bergen, the coordinating node, plus cross-links
const EDGES: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 4], [2, 3], [3, 4],
];

// Keywords sit in the sea to the west and south and the open land to the east, with room for the drift
interface Keyword { label: string; x: number; y: number }
const KEYWORDS: Keyword[] = [
    { label: 'Open Science', x: 14, y: 3 },
    { label: 'Sensitive Data', x: 6, y: 14 },
    { label: 'Genomics', x: 2, y: 25 },
    { label: 'Storage', x: -12, y: 48 },
    { label: 'Proteomics', x: -10, y: 90 },
    { label: 'Training', x: 34, y: 92 },
    { label: 'Bioinformatics', x: 72, y: 20 },
    { label: 'Workflows', x: 60, y: 32 },
    { label: 'NeLS', x: 86, y: 40 },
    { label: 'FAIR Data', x: 66, y: 48 },
    { label: 'Helpdesk', x: 76, y: 64 },
    { label: 'Cloud', x: 56, y: 78 },
];

const LABEL_GAP = 3.5;

export default function AboutHeroVisual() {
    const reduce = useReducedMotion() ?? false;
    // Looping motion starts after mount so server and client markup match.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const loop = mounted && !reduce;

    return (
        <MotionConfig reducedMotion="user">
            <div
                className="relative w-full max-w-lg mx-auto lg:max-w-none aspect-[6/5]"
                role="img"
                aria-label="Map of Norway with the five ELIXIR Norway nodes: Tromsø, Trondheim, Bergen, Oslo and Ås"
            >
                <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="-24 -4 120 100"
                    preserveAspectRatio="xMidYMid meet"
                    aria-hidden="true"
                >
                    <g className="fill-ink/[0.14]">
                        {DOTS.map(d => <circle key={`${d.x},${d.y}`} cx={d.x} cy={d.y} r="0.5" />)}
                    </g>

                    {EDGES.map(([a, b], i) => (
                        <motion.line
                            key={`e${a}-${b}`}
                            x1={NODES[a].cx} y1={NODES[a].cy}
                            x2={NODES[b].cx} y2={NODES[b].cy}
                            className="stroke-ink/30"
                            strokeWidth="0.35"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={reduce ? { duration: 0 } : { duration: 0.8, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
                        />
                    ))}

                    {loop && EDGES.map(([a, b], i) => {
                        const n1 = NODES[a], n2 = NODES[b];
                        return (
                            <motion.circle
                                key={`p${a}-${b}`}
                                r="0.8"
                                className="fill-marker"
                                initial={{ cx: n1.cx, cy: n1.cy }}
                                animate={{ cx: [n1.cx, n2.cx, n1.cx], cy: [n1.cy, n2.cy, n1.cy] }}
                                transition={{ duration: 5 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: 1 + i * 0.6 }}
                            />
                        );
                    })}

                    {KEYWORDS.map((kw, i) => (
                        <motion.g
                            key={kw.label}
                            initial={{ x: 0, y: 0 }}
                            animate={loop ? {
                                x: [0, 0.6 + (i % 3) * 0.4, 0, -(0.5 + (i % 2) * 0.6), 0],
                                y: [0, -(0.8 + (i % 4) * 0.4), 0, 0.6 + (i % 3) * 0.4, 0],
                            } : { x: 0, y: 0 }}
                            transition={loop ? {
                                x: { duration: 7 + i * 0.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 },
                                y: { duration: 6 + i * 0.7, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 },
                            } : { duration: 0 }}
                        >
                            <text
                                x={kw.x} y={kw.y}
                                textAnchor="middle"
                                className="fill-muted/70 font-semibold uppercase select-none"
                                style={{ fontSize: '3.2px', letterSpacing: '0.3px' }}
                            >
                                {kw.label}
                            </text>
                        </motion.g>
                    ))}

                    {NODES.map((node, i) => (
                        <g key={node.label}>
                            <motion.circle
                                cx={node.cx} cy={node.cy}
                                r={node.r + 1.5}
                                fill="none"
                                stroke={node.color}
                                strokeWidth="0.4"
                                initial={{ opacity: 0.25, r: node.r + 1.5 }}
                                animate={loop ? { opacity: [0.1, 0.35, 0.1], r: [node.r + 1.5, node.r + 3, node.r + 1.5] } : { opacity: 0.25 }}
                                transition={loop ? { duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 } : { duration: 0 }}
                            />
                            <circle
                                cx={node.cx} cy={node.cy}
                                r={node.r}
                                fill={node.color}
                                className={needsDarkOutline(node.color) ? 'dark:stroke-ink/60' : undefined}
                                strokeWidth="0.4"
                            />
                            <text
                                x={node.side === 'start' ? node.cx + node.r + LABEL_GAP : node.cx - node.r - LABEL_GAP}
                                y={node.cy}
                                dy="0.35em"
                                textAnchor={node.side}
                                className="fill-ink stroke-paper font-semibold select-none"
                                style={{ fontSize: '4px', strokeWidth: '1.2px', paintOrder: 'stroke', strokeLinejoin: 'round' }}
                            >
                                {node.label}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
        </MotionConfig>
    );
}
