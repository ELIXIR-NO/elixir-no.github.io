export const slugToTitleCase = (slug: string) => slug
    .toLowerCase()
    .split(/[-_.\s]/)
    .map((w) => `${w.charAt(0).toUpperCase()}${w.slice(1)}`)
    .join(' ');

/**
 * Converts Astro v5 content id to a URL-safe slug path.
 * entry.id is relative to the collection directory (no collection prefix).
 * Strips the trailing /index segment so the folder path becomes the slug.
 *
 * Examples (entry.id values):
 * - "article.mdx"                    → "article"
 * - "article/index.mdx"              → "article"
 * - "2025/ahm-europe/index.mdx"      → "2025/ahm-europe"
 * - "2021/ai-and-protein-folding/index.mdx" → "2021/ai-and-protein-folding"
 */
export const idToSlug = (id: string): string => {
    return id
        .replace(/\.(mdx|md)$/, '')  // strip extension
        .replace(/\/index$/, '');    // strip trailing /index
};

/**
 * Resolves a relative asset path (starting with './') from a content entry
 * to its public URL under /content/. Non-relative paths are returned unchanged.
 *
 * Pass `${entry.collection}/${entry.id}` as entryId so the collection name
 * is included in the resolved URL path.
 *
 * Examples:
 * - ("news/2025-05-26_ELITMa/index.mdx", "./cover.jpg") → "/content/news/2025-05-26_ELITMa/cover.jpg"
 * - ("services/galaxy/index.mdx", "/assets/logos/galaxy.png") → "/assets/logos/galaxy.png"
 */
export const resolveContentAsset = (entryId: string, assetPath: string): string => {
    const cleanPath = assetPath?.trim();
    if (!cleanPath?.startsWith('./')) return assetPath;
    // "news/2025-05-26_ELITMa/index.mdx" → strip filename → "news/2025-05-26_ELITMa"
    const dir = entryId.replace(/\/[^/]+$/, '');
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    return `${base}/content/${dir}/${cleanPath.slice(2)}`;
};

const relativeLuminance = (hex: string): number => {
    const [r, g, b] = [1, 3, 5]
        .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * True when a brand colour falls under the 3:1 non-text contrast minimum
 * against the dark-mode paper (#0A161E), so it needs an outline to stay
 * visible there. Expects a #rrggbb hex.
 */
export const needsDarkOutline = (hex: string): boolean =>
    (0.05 + relativeLuminance(hex)) / (0.05 + relativeLuminance('#0a161e')) < 3;
