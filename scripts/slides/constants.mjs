import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SLIDES_JSON = path.join(REPO_ROOT, 'src/data/slides.json');
export const SLIDES_DIR = path.join(REPO_ROOT, 'src/data/slides');
export const CONTENT_DIR = path.join(REPO_ROOT, 'src/content');

export const COLLECTIONS = ['news', 'events', 'funding-and-projects'];

export const MAX_SLIDES = 6;
export const MIN_SLIDES = 1;
export const CANDIDATE_POOL = 12;
export const HYSTERESIS_MARGIN = 0.15; // fraction of score an incumbent gets as a stay bonus
export const MAX_SWAPS = 2;

export const MAX_CAPTION = 280;
export const MAX_ALT = 125;
export const MIN_IMG_WIDTH = 800;
export const MAX_IMG_BYTES = 3_000_000;
export const MIN_ASPECT = 0.9; // width/height must be >= this (landscape-ish)

// Control characters plus the three that break MDX/JSX or shell-quote a caption.
export const ILLEGAL_TEXT_RE = /[\x00-\x1f<>`]/;

export const SRC_RE = /^\/data\/slides\/[a-z0-9-]+\.(png|jpe?g|webp)$/;

// Bot-created images are `<collection>-<year>-<slug>.<ext>`. The collection is
// part of the name because a slug is only unique within its collection: news
// and events both hold `2025/elixir-industry-engagement-day`.
export const BOT_FILE_RE =
    new RegExp(`^(?:${COLLECTIONS.join('|')})-\\d{4}-[a-z0-9-]+\\.(?:png|jpe?g|webp)$`);

// Editorial weighting: matched against lowercased `${title} ${summary} ${tags}`.
export const FLAGSHIP_TOPICS = [
    {re: /\ball hands\b|all-hands/, weight: 1.0},
    {re: /\bgdi\b|genomic data infrastructure/, weight: 0.9},
    {re: /\bfega\b|federated ega/, weight: 0.9},
    {re: /\beosc\b/, weight: 0.8},
    {re: /1\+ ?million genomes|1\+mg|genome of europe|\bgoe\b/, weight: 0.8},
    {re: /infrastructure|hackathon|workshop/, weight: 0.5},
    {re: /training|course|webinar/, weight: 0.4},
];
export const DEMOTE_TOPICS = [
    {re: /scheduled maintenance|maintenance window|downtime/, weight: -1.0},
    {re: /job vacancy|call for|deadline reminder/, weight: -0.4},
];

export const NEWS_HALFLIFE_DAYS = 120; // news/funding recency half-life
export const EVENT_DECAY_DAYS = 21;    // events die ~this fast after their date
