import { organizations } from './organizations';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export type AboutNode = {
    nodeName: string;
    universityShort: string;
    href: string;
    color: string;
};

export type SectionIcon = 'people' | 'cases' | 'impact' | 'publications';

export type AboutSection = {
    name: string;
    desc: string;
    href: string;
    icon: SectionIcon;
};

// Derived from organizations.ts so the menu can never drift from the org data.
// Object insertion order: bergen, oslo, tromso, trondheim, aas.
export const aboutNodes: AboutNode[] = Object.values(organizations).map((org) => ({
    nodeName: org.nodeName,
    universityShort: org.universityShort,
    href: `${BASE}/about/${org.slug}`,
    color: org.color,
}));

export const aboutSections: AboutSection[] = [
    { name: 'Everyone', desc: 'The people of ELIXIR Norway', href: `${BASE}/about/everyone`, icon: 'people' },
    { name: 'Case Studies', desc: 'Impact stories', href: `${BASE}/about/case-studies`, icon: 'cases' },
    { name: 'Political Impact', desc: 'Personalised medicine & data sharing', href: `${BASE}/about/political-impact`, icon: 'impact' },
    { name: 'Publications', desc: 'Papers & outputs', href: `${BASE}/about/publications`, icon: 'publications' },
];

export const aboutOverviewHref = `${BASE}/about`;
