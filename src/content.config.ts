import {defineCollection, z} from 'astro:content';

const about = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string().optional(),
        layout: z.string().optional(),
        variant: z.string().optional(),
        cover: z.object({
            source: z.string(),
        }).optional(),
    }),
});

const accessibility = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string().optional(),
        layout: z.string().optional(),
        variant: z.string().optional(),
    }),
});

const banner = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string().optional(),
        summary: z.string().optional(),
    }),
});

const events = defineCollection({
    type: 'content',
    schema: z.object({
        layout: z.string().optional(),
        variant: z.string().optional(),
        title: z.string(),
        date: z.string(),
        cover: z.object({
            source: z.string(),
        }).optional(),
        summary: z.string(),
    }),
});

const fundingAndProjects = defineCollection({
    type: 'content',
    schema: z.object({
        layout: z.string().optional(),
        variant: z.string().optional(),
        title: z.string(),
        summary: z.string().optional(),
        status: z.string().optional(),
        category: z.string().optional(),
        funder: z.object({
            name: z.string().or(z.null()),
            link: z.string().or(z.null()),
        }).optional(),
        project_number: z.object({
            grant_agreement_id: z.string().or(z.number()).or(z.null()),
            link: z.string().or(z.null()),
        }).optional(),
        period: z.string().optional(),
        external_link: z.string().optional().or(z.null()),
        keywords: z.array(z.string()).optional(),
        draft: z.boolean().optional(),
    }),
});

const landing = defineCollection({
    type: 'content',
    schema: z.object({
        layout: z.string().optional(),
        variant: z.string().optional(),
    }),
});

const news = defineCollection({
    type: 'content',
    schema: z.object({
        layout: z.string().optional(),
        variant: z.string().optional(),
        title: z.string(),
        date: z.string(),
        cover: z.object({
            source: z.string(),
        }).optional(),
        summary: z.string(),
        tags: z.array(z.string()).optional(),
        authors: z.array(z.string()).optional(),
    }),
});

const researchSupport = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string().optional(),
        layout: z.string().optional(),
        variant: z.string().optional(),
    }),
});

const services = defineCollection({
    type: 'content',
    schema: z.object({
        layout: z.string().optional(),
        variant: z.string().optional(),
        title: z.string(),
        logo: z.string().optional(),
        summary: z.string(),
        tags: z.array(z.string()).optional(),
        website: z.string().url().optional(),
    }),
});

const training = defineCollection({
    type: 'content',
    schema: z.object({
        layout: z.string().optional(),
        variant: z.string().optional(),
        title: z.string().optional(),
    }),
});

export const collections = {
    news,
    services,
    events,
    about,
    'funding-and-projects': fundingAndProjects,
    accessibility,
    banner,
    landing,
    'research-support': researchSupport,
    training,
};
