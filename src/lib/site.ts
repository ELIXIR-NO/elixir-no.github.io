// Site copy that editors change, from src/data/site.json. Every object is
// strict, so a missing, misspelt or extra key fails the build instead of
// rendering a blank. Prose with links or emphasis lives in src/content/blocks.
import { z } from 'astro/zod';
import raw from '../data/site.json';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const text = z.string().trim().min(1);
const email = z.string().email();

// Paths on this site are stored without the base path and get it here. A
// leading // (or /\, which browsers read the same way) would point at another
// host, and browsers drop tabs and line breaks before reading those slashes,
// so links may not contain whitespace either.
const SITE_PATH = /^\/(?![/\\])\S*$/;
const withBase = (value: string) => (SITE_PATH.test(value) ? `${BASE}${value}` : value);
const sitePath = z.string()
    .regex(SITE_PATH, 'must be a path on this site, starting with a single /, with no spaces')
    .transform(withBase);
export const href = z.string()
    .regex(/^(https:\/\/|mailto:|\/(?![/\\]))\S*$/, 'must start with https://, mailto: or a single /, with no spaces')
    .transform(withBase);

const link = z.object({ label: text, href }).strict();
const logoLink = z.object({ name: text, href, logo: sitePath }).strict();
const seo = z.object({ title: text, description: text }).strict();
const checklist = z.object({ title: text, items: z.array(text).min(1) }).strict();
const resource = z.object({ name: text, caption: text, href }).strict();

const tier = z.object({
    name: text,
    price: text,
    period: text.nullable(),
    description: text,
    features: z.array(text).min(1),
    mostPopular: z.boolean(),
}).strict();

export const schema = z.object({
    contact: z.object({
        supportEmail: email,
        generalEmail: email,
    }).strict(),
    hero: z.object({
        tagline: link,
        headline: text,
        // The first phrase is also the static fallback and completes the heading for screen readers.
        rotatingWords: z.array(text).min(1).refine(
            (words) => new Set(words).size === words.length,
            'each rotating word must be unique',
        ),
        subline: text,
        primaryAction: link,
        secondaryAction: link,
    }).strict(),
    footer: z.object({
        navigation: z.array(link).min(1),
        careers: link,
        socials: z.object({ linkedin: href, youtube: href, flickr: href }).strict(),
        partners: z.array(logoLink).min(1),
        funders: z.array(logoLink).min(1),
        fundingNote: text,
    }).strict(),
    training: z.object({
        seo,
        heading: text,
        intro: text,
        resources: z.object({
            heading: text,
            intro: text,
            tess: resource,
            github: resource,
            zenodo: resource,
        }).strict(),
    }).strict(),
    researchSupport: z.object({
        seo,
        heading: text,
        intro: text,
        documentation: link,
        howItWorks: z.object({ title: text, body: text }).strict(),
        offer: z.object({
            heading: text,
            intro: text,
            supportTypes: checklist,
            dataTypes: checklist,
            fields: checklist,
        }).strict(),
        pricing: z.object({
            heading: text,
            intro: text,
            tiers: z.array(tier).min(1),
        }).strict(),
    }).strict(),
}).strict();

export type Site = z.infer<typeof schema>;
export type HeroCopy = Site['hero'];
export type PricingTier = z.infer<typeof tier>;

const parsed = schema.safeParse(raw);
if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`src/data/site.json is invalid:\n${problems.join('\n')}`);
}

export const site: Site = parsed.data;
