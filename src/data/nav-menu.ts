import { organizations } from './organizations';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export type AboutNode = {
    nodeName: string;
    universityShort: string;
    href: string;
    color: string;
};

// Derived from organizations.ts so the menu can never drift from the org data.
// Object insertion order: bergen, oslo, tromso, trondheim, aas.
export const aboutNodes: AboutNode[] = Object.values(organizations).map((org) => ({
    nodeName: org.nodeName,
    universityShort: org.universityShort,
    href: `${BASE}/about/${org.slug}`,
    color: org.color,
}));

export const aboutOverviewHref = `${BASE}/about`;
