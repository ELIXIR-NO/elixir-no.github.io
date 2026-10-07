import { useEffect, useState } from 'react';
import { MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { organizations } from '../data/organizations';
import { needsDarkOutline } from '../lib/utils';

/** The five ELIXIR Norway nodes placed by real latitude and longitude on a faint outline of
 *  mainland Norway, linked by the network edges, with service keywords in the open space. */

// Mainland Norway from Natural Earth 1:50m admin-0 (public domain), projected equirectangular
// with a cos(65°) longitude correction, scaled to 100 units tall and simplified to ~350 points.
const NORWAY_PATH =
    'M50.8 15.7L49.2 15.8L49.9 17.2L48.7 19.5L49.6 20.0L48.7 20.9L43.3 19.4L42.8 19.6L42.9 22.1' +
    'L42.1 23.9L40.1 22.9L38.4 24.5L37.7 26.6L36.3 28.0L37.2 30.9L34.0 35.2L34.2 36.6L32.8 37.7' +
    'L31.1 38.0L31.4 40.5L30.9 44.3L28.3 49.8L29.6 50.7L29.6 53.5L29.3 54.1L26.8 53.7L25.5 54.3' +
    'L23.5 57.3L22.9 59.7L23.6 61.9L23.3 65.0L23.9 67.4L23.4 71.7L25.8 74.5L25.2 76.7L23.9 77.2' +
    'L24.8 81.4L24.5 84.0L22.7 85.9L21.9 88.0L22.3 90.3L21.8 93.1L21.2 93.2L20.9 91.7L19.2 91.1' +
    'L18.4 86.7L17.0 92.4L15.9 92.8L15.0 91.6L15.3 92.7L14.2 93.6L14.3 94.4L10.5 99.0L8.3 100.0' +
    'L6.8 100.0L6.4 99.0L5.9 99.6L5.4 99.4L5.7 98.2L3.7 97.3L2.0 94.6L2.3 92.4L3.8 93.5L4.7 92.5' +
    'L3.8 92.9L3.2 91.8L3.4 90.2L4.8 88.2L1.5 91.2L0.7 90.8L1.3 87.6L1.8 87.1L2.8 87.5L4.2 86.2' +
    'L3.0 86.4L2.7 85.9L4.0 83.1L5.2 81.7L5.2 83.7L5.9 81.7L6.7 80.9L4.0 82.2L0.8 87.6L1.0 84.2' +
    'L2.5 83.9L1.2 83.3L0.7 81.4L2.4 79.6L1.1 80.5L0.7 80.0L0.3 76.9L6.0 76.1L6.9 77.6L6.9 76.5' +
    'L8.7 75.6L7.9 74.9L8.2 73.9L7.3 75.9L5.6 75.6L5.5 75.0L4.8 76.2L1.7 76.4L0.6 75.8L0.3 73.9' +
    'L1.4 73.5L0.1 71.8L0.1 70.5L1.8 70.3L3.6 71.2L5.9 70.6L1.2 70.0L0.6 69.4L0.8 68.3L1.4 68.4' +
    'L2.0 67.2L3.2 66.4L3.8 66.9L5.4 66.4L5.8 66.0L4.0 66.4L4.7 64.9L6.6 64.8L8.6 65.4L9.0 65.1' +
    'L8.5 64.4L10.3 64.0L5.9 64.0L6.6 62.4L8.6 61.1L10.3 61.2L12.0 63.1L10.5 60.7L10.9 59.7L12.0 59.3' +
    'L11.2 58.1L11.9 57.3L12.7 57.0L13.7 57.4L13.7 58.4L14.3 57.5L15.5 57.1L16.5 58.9L17.6 58.3' +
    'L18.9 58.4L18.8 57.1L20.9 55.7L20.3 55.0L21.1 54.1L19.9 54.3L19.4 54.9L19.8 55.4L19.5 56.0' +
    'L16.6 58.0L15.7 56.6L15.1 56.7L15.2 55.8L18.3 51.1L21.4 48.6L21.5 48.0L20.6 48.5L21.3 46.8' +
    'L23.4 45.2L23.9 45.9L25.3 45.0L25.9 44.0L24.3 45.2L23.3 43.8L25.2 39.7L26.3 39.3L25.5 38.2' +
    'L28.3 37.6L29.5 36.7L26.5 37.2L26.8 34.1L28.2 32.9L29.3 32.9L28.3 32.0L29.7 30.4L34.0 29.8' +
    'L30.8 29.2L32.5 26.9L34.5 28.6L34.9 27.3L33.4 26.7L33.6 25.4L32.2 26.2L32.0 25.1L33.1 23.9' +
    'L34.6 24.0L33.6 23.1L35.9 21.9L36.9 24.6L37.1 23.0L36.5 21.2L37.1 20.7L38.9 20.9L40.9 20.4' +
    'L40.5 20.0L37.7 20.1L37.5 19.6L40.4 17.5L41.4 15.2L42.7 14.8L43.2 12.4L45.1 13.6L44.3 12.2' +
    'L45.5 11.7L46.2 10.3L47.8 9.8L47.6 12.8L48.7 9.7L49.8 8.8L49.9 11.3L49.1 13.4L50.4 11.9' +
    'L51.2 12.0L50.5 10.7L50.8 9.0L52.6 9.2L52.8 8.3L53.4 8.2L55.2 9.6L54.6 7.8L53.2 6.6L56.0 6.0' +
    'L56.3 6.3L57.5 5.5L58.3 6.0L58.6 7.6L59.6 8.5L59.7 6.5L63.1 3.0L62.6 2.0L63.9 0.7L65.8 1.9' +
    'L66.4 1.4L67.4 1.8L65.8 4.1L64.9 6.7L65.1 7.5L65.6 7.3L69.8 1.4L70.3 1.2L70.6 1.8L70.0 3.2' +
    'L70.1 5.2L71.4 4.4L72.0 2.7L73.2 2.2L72.2 1.1L73.4 0.0L75.9 0.9L75.7 2.0L74.3 3.2L75.5 3.2' +
    'L75.3 6.4L77.3 1.7L78.2 1.8L80.3 3.4L81.3 3.0L81.8 4.2L83.1 4.3L84.1 5.3L84.2 6.2L82.0 7.4' +
    'L77.2 7.2L79.8 8.5L80.1 10.3L81.4 10.5L81.9 9.4L82.5 10.5L82.7 9.9L83.9 10.0L84.0 11.7L83.1 11.9' +
    'L81.7 11.1L81.4 12.7L79.1 13.7L78.6 15.3L77.8 15.8L77.4 14.6L79.0 12.4L78.3 10.9L73.8 7.9' +
    'L71.8 9.1L69.9 9.0L68.4 10.7L67.4 13.8L67.4 16.1L65.8 17.4L64.8 19.1L61.3 17.5L59.5 18.7' +
    'L56.6 18.1L53.9 13.9L52.2 14.4L52.2 15.7ZM35.1 19.4L36.7 17.0L37.4 17.5L37.5 18.8L35.8 20.6' +
    'L34.0 21.3L33.5 20.8L31.4 22.1L30.2 22.2L30.2 21.7L31.3 20.6L32.9 20.3L34.0 18.9L34.4 17.0' +
    'L34.2 15.7L36.0 13.7L36.2 14.3L35.2 15.8L35.6 18.0ZM40.7 11.4L42.3 12.1L42.2 14.5L40.7 14.5' +
    'L39.4 15.9L38.5 15.5L39.0 14.9L39.1 13.2L40.3 13.1L39.8 12.3ZM46.4 7.8L47.5 8.2L46.6 9.7' +
    'L45.6 10.2L44.9 11.6L42.7 11.7L43.5 10.1L44.5 10.0L44.5 9.2L45.7 8.1L46.0 6.5ZM33.3 16.4' +
    'L33.9 17.7L33.3 18.9L30.7 18.6L31.2 17.4L32.0 17.6L32.2 16.7L32.7 16.8L32.7 16.0ZM59.9 2.1' +
    'L57.9 4.2L56.4 4.4L55.2 3.3L58.4 2.9ZM60.5 4.1L60.6 4.8L59.4 6.1L58.2 5.4L58.6 4.6L60.3 3.6Z';

interface Node { cx: number; cy: number; r: number; color: string; label: string; lx: number; ly: number }
// Same projection as the outline. Ås is nudged about a unit south-east of its true spot so it does not
// sit on top of Oslo; their labels fan out above and below.
const NODES: Node[] = [
    { cx: 1.3, cy: 81.9, r: 2.2, color: organizations.bergen.color, label: 'Bergen', lx: 4.6, ly: 83.2 },
    { cx: 18.9, cy: 85.5, r: 1.6, color: organizations.oslo.color, label: 'Oslo', lx: 22.4, ly: 84.4 },
    { cx: 45.4, cy: 11.0, r: 2.2, color: organizations.tromso.color, label: 'Tromsø', lx: 48.8, ly: 12.3 },
    { cx: 17.8, cy: 58.6, r: 2.2, color: organizations.trondheim.color, label: 'Trondheim', lx: 21.2, ly: 59.9 },
    { cx: 19.6, cy: 88.6, r: 1.6, color: organizations.aas.color, label: 'Ås', lx: 22.6, ly: 91.6 },
];

// Hub-and-spoke from Bergen, the coordinating node, plus cross-links
const EDGES: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 4], [2, 3], [3, 4],
];

// Keywords sit in the sea to the west and the open land to the east, clear of nodes and labels
interface Keyword { label: string; x: number; y: number }
const KEYWORDS: Keyword[] = [
    { label: 'Open Science', x: 10, y: 22 },
    { label: 'FAIR Data', x: 9, y: 36 },
    { label: 'Genomics', x: 6, y: 48 },
    { label: 'Workflows', x: 64, y: 36 },
    { label: 'Bioinformatics', x: 62, y: 48 },
    { label: 'Training', x: 60, y: 60 },
    { label: 'Helpdesk', x: 62, y: 72 },
    { label: 'Sensitive Data', x: 58, y: 84 },
];

export default function AboutHeroVisual() {
    const reduce = useReducedMotion() ?? false;
    // Looping pulses start after mount so server and client markup match.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const loop = mounted && !reduce;

    return (
        <MotionConfig reducedMotion="user">
            <div
                className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md mx-auto aspect-[92/108]"
                role="img"
                aria-label="Map of Norway with the five ELIXIR Norway nodes: Tromsø, Trondheim, Bergen, Oslo and Ås"
            >
                <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="-4 -4 92 108"
                    preserveAspectRatio="xMidYMid meet"
                    aria-hidden="true"
                >
                    <path d={NORWAY_PATH} className="fill-ink/[0.05] stroke-ink/25" strokeWidth="0.25" strokeLinejoin="round" />

                    {EDGES.map(([a, b], i) => (
                        <motion.line
                            key={`e${a}-${b}`}
                            x1={NODES[a].cx} y1={NODES[a].cy}
                            x2={NODES[b].cx} y2={NODES[b].cy}
                            className="stroke-ink/30"
                            strokeWidth="0.3"
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
                                r="0.6"
                                className="fill-marker"
                                initial={{ cx: n1.cx, cy: n1.cy }}
                                animate={{ cx: [n1.cx, n2.cx, n1.cx], cy: [n1.cy, n2.cy, n1.cy] }}
                                transition={{ duration: 5 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: 1 + i * 0.6 }}
                            />
                        );
                    })}

                    {KEYWORDS.map(kw => (
                        <text
                            key={kw.label}
                            x={kw.x} y={kw.y}
                            textAnchor="middle"
                            className="fill-muted/60 font-semibold uppercase select-none"
                            style={{ fontSize: '2.6px', letterSpacing: '0.2px' }}
                        >
                            {kw.label}
                        </text>
                    ))}

                    {NODES.map((node, i) => (
                        <g key={node.label}>
                            <motion.circle
                                cx={node.cx} cy={node.cy}
                                r={node.r + 1.2}
                                fill="none"
                                stroke={node.color}
                                strokeWidth="0.35"
                                initial={{ opacity: 0.25, r: node.r + 1.2 }}
                                animate={loop ? { opacity: [0.1, 0.35, 0.1], r: [node.r + 1.2, node.r + 2.4, node.r + 1.2] } : { opacity: 0.25 }}
                                transition={loop ? { duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 } : { duration: 0 }}
                            />
                            <circle
                                cx={node.cx} cy={node.cy}
                                r={node.r}
                                fill={node.color}
                                className={needsDarkOutline(node.color) ? 'dark:stroke-ink/60' : undefined}
                                strokeWidth="0.3"
                            />
                            <text
                                x={node.lx} y={node.ly}
                                className="fill-ink font-semibold select-none"
                                style={{ fontSize: '3.4px' }}
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
