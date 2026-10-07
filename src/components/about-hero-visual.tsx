import { useEffect, useState } from 'react';
import { MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { organizations, type Organization } from '../data/organizations';
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

interface Node { cx: number; cy: number; r: number; org: Organization; city: string }
// Placed by hand on the grid, not to scale: Oslo and Ås are pulled apart so their circles never
// touch, and Oslo sits east of the Trondheim to Ås edge so no line crosses it.
const NODES: Node[] = [
    { cx: 4, cy: 64, r: 5, org: organizations.bergen, city: 'Bergen' },
    { cx: 30, cy: 61, r: 4.5, org: organizations.oslo, city: 'Oslo' },
    { cx: 56, cy: 6, r: 4.5, org: organizations.tromso, city: 'Tromsø' },
    { cx: 17, cy: 36, r: 4.5, org: organizations.trondheim, city: 'Trondheim' },
    { cx: 26, cy: 76, r: 4.5, org: organizations.aas, city: 'Ås' },
];

// Hub-and-spoke from Bergen, the coordinating node, plus cross-links
const EDGES: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 4], [2, 3], [3, 4],
];

// Smaller words sit fainter for depth; the smallest drop out on narrow screens where they would be unreadable
const KEYWORD_SIZES = {
    lg: { fontSize: 3.2, className: 'fill-muted/35' },
    md: { fontSize: 2.7, className: 'fill-muted/30' },
    sm: { fontSize: 2.3, className: 'fill-muted/25 max-sm:hidden' },
};

// Keywords hug the coast in the sea to the west and south and the open land to the east, with room for the drift
interface Keyword { label: string; x: number; y: number; size: keyof typeof KEYWORD_SIZES }
const KEYWORDS: Keyword[] = [
    { label: 'Open science', x: 18, y: 2, size: 'lg' },
    { label: 'Metadata', x: 40, y: 0, size: 'sm' },
    { label: 'Sensitive data', x: 14, y: 9, size: 'lg' },
    { label: 'Ontologies', x: 25, y: 16, size: 'md' },
    { label: 'Genomics', x: 8, y: 23, size: 'lg' },
    { label: 'TeSS', x: 22, y: 24, size: 'sm' },
    { label: 'Biobanks', x: -4, y: 32, size: 'md' },
    { label: 'Storage', x: -6, y: 44, size: 'lg' },
    { label: 'Galaxy', x: -8, y: 54, size: 'sm' },
    { label: 'HPC', x: -10, y: 64, size: 'sm' },
    { label: 'Proteomics', x: -11, y: 78, size: 'lg' },
    { label: 'Metagenomics', x: -8, y: 89, size: 'md' },
    { label: 'RDMkit', x: 6, y: 96, size: 'sm' },
    { label: 'Training', x: 28, y: 94, size: 'lg' },
    { label: 'Federated EGA', x: 50, y: 88, size: 'md' },
    { label: 'Cloud', x: 44, y: 78, size: 'lg' },
    { label: 'Helpdesk', x: 50, y: 68, size: 'md' },
    { label: 'Interoperability', x: 54, y: 55, size: 'lg' },
    { label: 'Data management', x: 48, y: 48.5, size: 'md' },
    { label: 'FAIR data', x: 66, y: 42, size: 'lg' },
    { label: 'Workflows', x: 48, y: 35, size: 'lg' },
    { label: 'Machine learning', x: 62, y: 27, size: 'md' },
    { label: 'Bioinformatics', x: 72, y: 19, size: 'lg' },
    { label: 'NeLS', x: 80, y: 34, size: 'md' },
];

export default function AboutHeroVisual() {
    const reduce = useReducedMotion() ?? false;
    // Looping motion starts after mount so server and client markup match.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const loop = mounted && !reduce;

    return (
        <MotionConfig reducedMotion="user">
            <div
                className="relative w-full max-w-lg mx-auto lg:max-w-none aspect-[110/103]"
                role="img"
                aria-label="Map of Norway with the five ELIXIR Norway nodes: Tromsø, Trondheim, Bergen, Oslo and Ås"
            >
                <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="-22 -4 110 103"
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
                                className={`${KEYWORD_SIZES[kw.size].className} font-semibold select-none`}
                                style={{ fontSize: `${KEYWORD_SIZES[kw.size].fontSize}px` }}
                            >
                                {kw.label}
                            </text>
                        </motion.g>
                    ))}

                    {NODES.map((node, i) => (
                        <g key={node.city}>
                            <title>{`${node.city}, ${node.org.university}`}</title>
                            <motion.circle
                                cx={node.cx} cy={node.cy}
                                r={node.r + 1.5}
                                fill="none"
                                stroke={node.org.color}
                                strokeWidth="0.4"
                                initial={{ opacity: 0.25, r: node.r + 1.5 }}
                                animate={loop ? { opacity: [0.1, 0.35, 0.1], r: [node.r + 1.5, node.r + 3, node.r + 1.5] } : { opacity: 0.25 }}
                                transition={loop ? { duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 } : { duration: 0 }}
                            />
                            <circle
                                cx={node.cx} cy={node.cy}
                                r={node.r}
                                fill={node.org.color}
                                className={needsDarkOutline(node.org.color) ? 'dark:stroke-ink/60' : undefined}
                                strokeWidth="0.4"
                            />
                        </g>
                    ))}
                </svg>
            </div>
        </MotionConfig>
    );
}
