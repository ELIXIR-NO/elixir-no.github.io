const REPO_OWNER = 'ELIXIR-NO';
const REPO_NAME = 'elixir-no.github.io';
const API = 'https://api.github.com';

export interface GitHubFile {
    path: string;
    sha: string;
    type: 'blob' | 'tree';
    size?: number;
}

function headers(token: string): HeadersInit {
    return {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
    };
}

// ─── UTF-8 safe base64 encode/decode ─────────────────────

function b64Decode(b64: string): string {
    const binary = atob(b64.replace(/\n/g, ''));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
}

function b64Encode(str: string): string {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
}

// ─── Cache layer ─────────────────────────────────────────

const CACHE_PREFIX = 'elixir-cms-cache:';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
    data: T;
    ts: number;
}

function cacheGet<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const entry: CacheEntry<T> = JSON.parse(raw);
        if (Date.now() - entry.ts > CACHE_TTL) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return entry.data;
    } catch {
        return null;
    }
}

function cacheSet<T>(key: string, data: T): void {
    try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
    } catch {
        // localStorage full — silently ignore
    }
}

export function cacheClear(): void {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
}

// ─── API functions ───────────────────────────────────────

async function getMainSha(token: string): Promise<string> {
    const res = await fetch(`${API}/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/main`, {
        headers: headers(token),
    });
    const data = await res.json();
    return data.object.sha;
}

/** List all files under a path (recursive, cached) */
export async function listFiles(token: string, path: string): Promise<GitHubFile[]> {
    const cached = cacheGet<GitHubFile[]>(`tree:${path}`);
    if (cached) return cached;

    const sha = await getMainSha(token);
    const res = await fetch(
        `${API}/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${sha}?recursive=1`,
        { headers: headers(token) },
    );
    const data = await res.json();
    const files = (data.tree || []).filter(
        (f: GitHubFile) => f.path.startsWith(path) && f.type === 'blob',
    );
    cacheSet(`tree:${path}`, files);
    return files;
}

/** Read a file's content (UTF-8 safe, cached) */
export async function readFile(token: string, path: string): Promise<string> {
    const cached = cacheGet<string>(`file:${path}`);
    if (cached) return cached;

    const res = await fetch(
        `${API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
        { headers: headers(token) },
    );
    const data = await res.json();
    const content = b64Decode(data.content);
    cacheSet(`file:${path}`, content);
    return content;
}

/** Read a file's SHA (needed for updates) */
export async function getFileSha(token: string, path: string): Promise<string | null> {
    const res = await fetch(
        `${API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
        { headers: headers(token) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.sha;
}

/** Upload a binary file (image) — returns the blob SHA */
export async function uploadBlob(token: string, base64Content: string): Promise<string> {
    const res = await fetch(`${API}/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({ content: base64Content, encoding: 'base64' }),
    });
    const data = await res.json();
    return data.sha;
}

/** Get the authenticated user (cached) */
export async function getUser(token: string): Promise<{ login: string; avatar_url: string; name: string }> {
    const cached = cacheGet<{ login: string; avatar_url: string; name: string }>('user');
    if (cached) return cached;

    const res = await fetch('https://api.github.com/user', { headers: headers(token) });
    const user = await res.json();
    cacheSet('user', user);
    return user;
}

export interface PullRequest {
    number: number;
    title: string;
    created_at: string;
    head: { ref: string; sha: string };
    html_url: string;
}

/** List open PRs created by the logged-in user on cms/ branches */
export async function listUserPRs(token: string, username: string): Promise<PullRequest[]> {
    const cached = cacheGet<PullRequest[]>(`prs:${username}`);
    if (cached) return cached;

    const res = await fetch(
        `${API}/repos/${REPO_OWNER}/${REPO_NAME}/pulls?state=open&per_page=100`,
        { headers: headers(token) },
    );
    if (!res.ok) throw new Error(`Failed to fetch pull requests: ${res.status}`);
    const prs: PullRequest[] = await res.json();
    const filtered = prs.filter(
        pr => pr.head.ref.startsWith(`cms/${username}/`),
    );
    cacheSet(`prs:${username}`, filtered);
    return filtered;
}

export interface PRFile {
    filename: string;
    status: string;
}

/** Get the list of changed files in a PR */
export async function getPRFiles(token: string, prNumber: number): Promise<PRFile[]> {
    const res = await fetch(
        `${API}/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}/files`,
        { headers: headers(token) },
    );
    if (!res.ok) throw new Error(`Failed to fetch PR files: ${res.status}`);
    return res.json();
}

/** Read a file from a specific branch/ref (not cached — always fresh) */
export async function readFileFromRef(token: string, path: string, ref: string): Promise<string> {
    const res = await fetch(
        `${API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${ref}`,
        { headers: headers(token) },
    );
    if (!res.ok) throw new Error(`Failed to read ${path} from ${ref}: ${res.status}`);
    const data = await res.json();
    return b64Decode(data.content);
}

/** Commit files to an existing branch (updates an open PR) */
export async function commitToBranch(
    token: string,
    branch: string,
    files: Array<{ path: string; content: string; encoding?: 'utf-8' | 'base64' }>,
): Promise<void> {
    for (const file of files) {
        const shaRes = await fetch(
            `${API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${file.path}?ref=${branch}`,
            { headers: headers(token) },
        );
        const existingSha = shaRes.ok ? (await shaRes.json()).sha : null;

        const body: Record<string, unknown> = {
            message: `content: update ${file.path}`,
            content: file.encoding === 'base64' ? file.content : b64Encode(file.content),
            branch,
        };
        if (existingSha) body.sha = existingSha;

        const putRes = await fetch(`${API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${file.path}`, {
            method: 'PUT',
            headers: headers(token),
            body: JSON.stringify(body),
        });
        if (!putRes.ok) {
            const err = await putRes.json().catch(() => ({}));
            throw new Error(`Failed to commit ${file.path}: ${putRes.status} ${err.message || ''}`);
        }
    }

    cacheClear();
}

/** Check if user has write access to the repo (cached) */
export async function hasWriteAccess(token: string): Promise<boolean> {
    const cached = cacheGet<boolean>('access');
    if (cached !== null) return cached;

    const res = await fetch(
        `${API}/repos/${REPO_OWNER}/${REPO_NAME}`,
        { headers: headers(token) },
    );
    const data = await res.json();
    const access = data.permissions?.push === true || data.permissions?.admin === true;
    cacheSet('access', access);
    return access;
}

export interface SaveResult {
    prUrl: string;
    branch: string;
}

/**
 * Save changes as a PR:
 * 1. Create a branch from main
 * 2. Commit all files to the branch
 * 3. Create a PR
 */
export async function saveAsPR(
    token: string,
    opts: {
        title: string;
        description: string;
        username: string;
        files: Array<{ path: string; content: string; encoding?: 'utf-8' | 'base64' }>;
    },
): Promise<SaveResult> {
    const mainSha = await getMainSha(token);
    const slug = opts.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const branch = `cms/${opts.username}/${Date.now()}-${slug}`;

    // Create branch
    await fetch(`${API}/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: mainSha }),
    });

    // Commit each file
    for (const file of opts.files) {
        const existingSha = await getFileSha(token, file.path);
        const body: Record<string, unknown> = {
            message: `content: update ${file.path}`,
            content: file.encoding === 'base64' ? file.content : b64Encode(file.content),
            branch,
        };
        if (existingSha) body.sha = existingSha;

        await fetch(`${API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${file.path}`, {
            method: 'PUT',
            headers: headers(token),
            body: JSON.stringify(body),
        });
    }

    // Invalidate caches after saving
    cacheClear();

    // Create PR
    const prRes = await fetch(`${API}/repos/${REPO_OWNER}/${REPO_NAME}/pulls`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({
            title: opts.title,
            body: opts.description,
            head: branch,
            base: 'main',
        }),
    });
    const pr = await prRes.json();

    return { prUrl: pr.html_url, branch };
}

/** Read and parse a JSON file (cached) */
export async function readJsonFile<T = unknown>(token: string, path: string): Promise<T> {
    const content = await readFile(token, path);
    return JSON.parse(content);
}

/** OAuth configuration */
export const OAUTH_AUTH_URL = 'https://elixir-cms-oauth.vercel.app/auth';
