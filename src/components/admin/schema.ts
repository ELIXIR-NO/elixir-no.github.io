export type FieldType = 'string' | 'text' | 'markdown' | 'date' | 'select' | 'list' | 'boolean' | 'image' | 'object' | 'hidden';

export interface Field {
    name: string;
    label: string;
    type: FieldType;
    required?: boolean;
    hint?: string;
    default?: unknown;
    options?: string[];
    fields?: Field[];
}

// ─── Content collections (MDX folders) ───────────────────

export interface ContentCollection {
    kind: 'content';
    name: string;
    label: string;
    folder: string;
    canCreate: boolean;
    depth: number;
    fields: Field[];
    layoutPath: string;
    description: string;
}

// ─── JSON data collections (single file) ─────────────────

export interface JsonCollection {
    kind: 'json';
    name: string;
    label: string;
    file: string;
    description: string;
}

export type Collection = ContentCollection | JsonCollection;

export const collections: Collection[] = [
    {
        kind: 'content',
        name: 'news',
        label: 'News',
        folder: 'src/content/news',
        canCreate: true,
        depth: 2,
        layoutPath: '../../../layouts/page.astro',
        description: 'News articles published on elixir.no/news. Each article has a title, date, summary, optional cover image, tags for filtering, and author usernames that link to the people directory. Articles are organized by year.',
        fields: [
            { name: 'title', label: 'Title', type: 'string', required: true },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'summary', label: 'Summary', type: 'text', required: true, hint: 'Short description for cards and search.' },
            { name: 'cover', label: 'Cover Image', type: 'image' },
            { name: 'tags', label: 'Tags', type: 'list', hint: 'Lowercase, hyphens (e.g., training-events)' },
            { name: 'authors', label: 'Authors', type: 'list', hint: 'Usernames from people.json (e.g., kjell-petersen)' },
        ],
    },
    {
        kind: 'content',
        name: 'events',
        label: 'Events',
        folder: 'src/content/events',
        canCreate: true,
        depth: 2,
        layoutPath: '../../../layouts/page.astro',
        description: 'Events listed on elixir.no/events. Upcoming events appear first, past events below. Each event needs a title, date, summary, and optional cover image. Events are organized by year.',
        fields: [
            { name: 'title', label: 'Title', type: 'string', required: true },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'summary', label: 'Summary', type: 'text', required: true },
            { name: 'cover', label: 'Cover Image', type: 'image' },
        ],
    },
    {
        kind: 'content',
        name: 'services',
        label: 'Services',
        folder: 'src/content/services',
        canCreate: true,
        depth: 1,
        layoutPath: '../../layouts/page.astro',
        description: 'Bioinformatics services offered by ELIXIR Norway, shown at elixir.no/services. Each service has a title, summary, optional logo, and tags for categorization (e.g., e-infrastructure, analysis, data-management).',
        fields: [
            { name: 'title', label: 'Title', type: 'string', required: true },
            { name: 'summary', label: 'Summary', type: 'text', required: true },
            { name: 'logo', label: 'Logo', type: 'image' },
            { name: 'tags', label: 'Tags', type: 'list', hint: 'e.g., e-infrastructure, analysis' },
        ],
    },
    {
        kind: 'content',
        name: 'funding-and-projects',
        label: 'Funding & Projects',
        folder: 'src/content/funding-and-projects',
        canCreate: true,
        depth: 1,
        layoutPath: '../../layouts/page.astro',
        description: 'Research grants and EU projects at elixir.no/funding-and-projects. Includes metadata like status (ongoing/completed), category (european/norwegian/elixir), funder info, period, external links, and keywords for filtering.',
        fields: [
            { name: 'title', label: 'Title', type: 'string', required: true },
            { name: 'summary', label: 'Summary', type: 'text' },
            { name: 'status', label: 'Status', type: 'select', options: ['ongoing', 'completed', 'unknown'] },
            { name: 'category', label: 'Category', type: 'select', options: ['european', 'elixir', 'norwegian', 'global', 'unknown'] },
            { name: 'period', label: 'Period', type: 'string', hint: 'Format: YYYY-MM YYYY-MM' },
            { name: 'external_link', label: 'External Link', type: 'string' },
            { name: 'keywords', label: 'Keywords', type: 'list' },
            { name: 'draft', label: 'Draft', type: 'boolean', default: false },
        ],
    },
    {
        kind: 'json',
        name: 'people',
        label: 'People',
        file: 'src/data/people.json',
        description: 'Staff directory shown at elixir.no/about/everyone and on each organization page. Manages names, titles, photos, profile URLs, organization membership, and ELIXIR governance group roles. Photos upload to /data/people/.',
    },
    {
        kind: 'json',
        name: 'slides',
        label: 'Slides',
        file: 'src/data/slides.json',
        description: 'Highlights carousel on the homepage. Each slide has an image, alt text, and caption. Order matters \u2014 first slide appears first in the carousel. Use the up/down buttons to reorder. Images upload to /data/slides/.',
    },
    {
        kind: 'json',
        name: 'banner',
        label: 'Banner',
        file: 'src/data/banner.json',
        description: 'Site-wide announcement banner shown at the top of every page, above the navigation. Toggle visibility on/off and set a short message. Supports inline markdown: **bold**, *italic*, [links](url).',
    },
];

export function getCollection(name: string): Collection | undefined {
    return collections.find(c => c.name === name);
}

/** Detect which collection a set of file paths belongs to */
export function detectCollection(filePaths: string[]): Collection | null {
    for (const c of collections) {
        if (c.kind === 'content') {
            if (filePaths.some(p => p.startsWith(c.folder + '/'))) return c;
        } else {
            if (filePaths.some(p => p === c.file)) return c;
        }
    }
    return null;
}

// ─── People data types ───────────────────────────────────

export interface ElixirGroup {
    name: string;
    role: string | null;
}

export interface Person {
    username: string;
    name: string;
    title: string;
    photo: string;
    'profile-url': string | null;
    affiliations: Array<{ name: string; role: string }>;
    'elixir-groups': ElixirGroup[];
}

export interface OrgData {
    name: string;
    people: Person[];
}

export interface PeopleData {
    groups: Array<{ name: string; description: string }>;
    orgs: Record<string, OrgData>;
}

// ─── Slides data types ───────────────────────────────────

export interface Slide {
    src: string;
    alt: string;
    caption?: string;
}

export const ELIXIR_GROUPS = [
    'node-leaders',
    'coordinators',
    'steering-board',
    'scientific-advisory-committee',
    'stakeholder-panel',
] as const;

export const ORG_KEYS = [
    'uib', 'uio', 'uit', 'ntnu', 'nmbu',
    'cnio', 'amu', 'vu', 'embl', 'ous', 'hi',
] as const;
