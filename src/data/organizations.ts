export interface OrgContact {
    reason: string;
    email: string;
    label?: string;
}

export interface OrgLink {
    text: string;
    url: string;
}

export interface Organization {
    key: string;
    slug: string;
    nodeName: string;
    university: string;
    universityShort: string;
    logo: string;
    color: string;
    coverImage: string;
    subtitle: string;
    coordinates: { lat: number; lng: number };
    address: string;
    contacts: OrgContact[];
    links: OrgLink[];
    callout?: string;
}

export const organizations: Record<string, Organization> = {
    bergen: {
        key: 'uib',
        slug: 'bergen',
        nodeName: 'Bergen Node',
        university: 'University of Bergen',
        universityShort: 'UiB',
        logo: '/assets/logos/orgs/uib.svg',
        color: '#dc3545',
        coverImage: '/content/about/bergen/bergen.png',
        subtitle: 'ELIXIR@UiB — Computational Biology Unit',
        coordinates: { lat: 60.381490, lng: 5.331600 },
        address: 'Department of informatics, Thormøhlensgate 55, 5008 Bergen',
        contacts: [
            { reason: 'Technical support', email: 'support@elixir.no' },
            { reason: 'Contact ELIXIR Norway', email: 'contact@elixir.no' },
        ],
        links: [
            { text: 'Norwegian e-infrastructure for Life Science (NeLS)', url: 'https://nels.elixir.no' },
            { text: 'Computational Biology Unit (CBU) UiB', url: 'https://cbu.w.uib.no/' },
        ],
        callout: 'For a bioinformatics support request regarding a project you are working on, please use the helpdesk e-mail address: contact@elixir.no. That will reach a large group of bioinformaticians that will try to answer your request by e-mail, and if needed a local meeting can be organised.',
    },
    oslo: {
        key: 'uio',
        slug: 'oslo',
        nodeName: 'Oslo Node',
        university: 'University of Oslo',
        universityShort: 'UiO',
        logo: '/assets/logos/orgs/uio.svg',
        color: '#c8102e',
        coverImage: '/content/about/oslo/oslo.png',
        subtitle: 'ELIXIR@UiO — Health domain bioinformatics & cancer research',
        coordinates: { lat: 59.938300, lng: 10.722622 },
        address: 'Kristine Bonnevies hus, Blindernveien 31, 0373 Oslo',
        contacts: [
            { reason: 'Technical support (BCF services)', email: 'bioinformatics@ous-research.no' },
            { reason: 'Group leader — Rein Aasland', email: 'rein.aasland@ibv.uio.no' },
        ],
        links: [],
    },
    tromso: {
        key: 'uit',
        slug: 'tromso',
        nodeName: 'Tromsø Node',
        university: 'UiT The Arctic University of Norway',
        universityShort: 'UiT',
        logo: '/assets/logos/orgs/uit.svg',
        color: '#003349',
        coverImage: '/content/about/tromso/tromso.png',
        subtitle: 'ELIXIR@UiT — Arctic microbial genomics & software engineering',
        coordinates: { lat: 69.681222, lng: 18.987015 },
        address: 'Forskningsparken 3, 9037 Tromsø',
        contacts: [],
        links: [
            { text: 'Pathogen Portal Norway', url: 'https://www.pathogens.no/' },
            { text: 'Marine Meta-genomics Portal', url: 'https://sfb.mmp2.sigma2.no/' },
        ],
    },
    trondheim: {
        key: 'ntnu',
        slug: 'trondheim',
        nodeName: 'Trondheim Node',
        university: 'Norwegian University of Science and Technology',
        universityShort: 'NTNU',
        logo: '/assets/logos/orgs/ntnu.svg',
        color: '#00509e',
        coverImage: '/content/about/trondheim/trondheim.png',
        subtitle: 'ELIXIR@NTNU — Gene regulation, genomics & biobank analytics',
        coordinates: { lat: 63.4195386, lng: 10.3910016 },
        address: 'Erling Skjalgsons gate 1, 7491 Trondheim',
        contacts: [],
        links: [],
    },
    aas: {
        key: 'nmbu',
        slug: 'aas',
        nodeName: 'Ås Node',
        university: 'Norwegian University of Life Sciences',
        universityShort: 'NMBU',
        logo: '/assets/logos/orgs/nmbu.svg',
        color: '#005f3b',
        coverImage: '/content/about/aas/aas.png',
        subtitle: 'ELIXIR@NMBU — Fish genomics & aquaculture bioinformatics',
        coordinates: { lat: 59.6657582, lng: 10.7598507 },
        address: 'Oluf Thesens vei 6, 1433 Ås',
        contacts: [],
        links: [],
    },
};

export const ORG_SLUGS = new Set(Object.keys(organizations));

export function getOrganization(slug: string): Organization | undefined {
    return organizations[slug];
}
