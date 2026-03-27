import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { collections, getCollection, detectCollection, type Collection, type Field, type ContentCollection, type JsonCollection } from './schema';
import PeopleEditor from './PeopleEditor';
import SlidesEditor from './SlidesEditor';
import BannerEditor from './BannerEditor';
import MarkdownEditor from './MarkdownEditor';
import PRConfirmDialog from './PRConfirmDialog';

/** Sanitize a string to kebab-case for slugs and filenames */
function toKebab(str: string): string {
    return str
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents (ø→o, å→a, etc.)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}
import {
    listFiles, readFile, readJsonFile, saveAsPR, commitToBranch, readFileFromRef,
    getUser, hasWriteAccess, cacheClear,
    type GitHubFile, type SaveResult, type PullRequest, type PRFile,
} from './github';
import OpenPRsView from './OpenPRsView';

// ─── Auth ────────────────────────────────────────────────

const TOKEN_KEY = 'elixir-cms-token';
const AUTH_PROXY = 'https://elixir-cms-oauth.vercel.app';
const AUTH_PROXY_ORIGIN = 'https://elixir-cms-oauth.vercel.app';

function useAuth() {
    const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState<{ login: string; avatar_url: string; name: string } | null>(null);
    const [authorized, setAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        if (!token) return;
        (async () => {
            try {
                const u = await getUser(token);
                setUser(u);
                const access = await hasWriteAccess(token);
                setAuthorized(access);
                if (!access) {
                    sessionStorage.removeItem(TOKEN_KEY);
                    setToken(null);
                }
            } catch {
                sessionStorage.removeItem(TOKEN_KEY);
                setToken(null);
            }
        })();
    }, [token]);

    // Listen for OAuth callback postMessage
    useEffect(() => {
        function onMessage(e: MessageEvent) {
            if (typeof e.data !== 'string') return;

            // Validate origin — only accept messages from our auth proxy
            if (e.origin !== AUTH_PROXY_ORIGIN) return;

            // Respond to the handshake — echo back so the popup sends the token
            if (e.data === 'authorizing:github') {
                (e.source as Window)?.postMessage('authorizing:github', AUTH_PROXY_ORIGIN);
                return;
            }

            // Receive the token
            const match = e.data.match(/^authorization:github:success:(.+)$/);
            if (match) {
                try {
                    const { token: t } = JSON.parse(match[1]);
                    if (t) {
                        sessionStorage.setItem(TOKEN_KEY, t);
                        setToken(t);
                        authPopupRef.current?.close();
                    }
                } catch { /* ignore */ }
            }
        }
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);

    const authPopupRef = useRef<Window | null>(null);

    const login = useCallback(() => {
        const w = 600, h = 700;
        const left = window.screenX + (window.innerWidth - w) / 2;
        const top = window.screenY + (window.innerHeight - h) / 2;
        authPopupRef.current = window.open(
            `${AUTH_PROXY}/auth?provider=github&site_id=${window.location.hostname}`,
            'github-auth',
            `width=${w},height=${h},left=${left},top=${top}`,
        );
    }, []);

    const logout = useCallback(() => {
        sessionStorage.removeItem(TOKEN_KEY);
        cacheClear();
        setToken(null);
        setUser(null);
        setAuthorized(null);
    }, []);

    return { token, user, authorized, login, logout };
}

// ─── Frontmatter parsing ─────────────────────────────────

function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { data: {}, body: content };

    const yamlStr = match[1];
    const body = match[2];

    // Simple YAML parser for flat + one-level nested fields
    const data: Record<string, unknown> = {};
    let currentKey = '';
    let inArray = false;
    let arrayItems: string[] = [];

    for (const line of yamlStr.split('\n')) {
        const trimmed = line.trimEnd();
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Array item
        if (inArray && /^\s+-\s/.test(line)) {
            const val = trimmed.replace(/^\s*-\s*/, '').replace(/^["']|["']$/g, '');
            arrayItems.push(val);
            continue;
        } else if (inArray) {
            data[currentKey] = arrayItems;
            inArray = false;
            arrayItems = [];
        }

        // Inline array: key: ["a", "b"]
        const inlineArr = trimmed.match(/^(\w[\w-]*)\s*:\s*\[(.+)\]$/);
        if (inlineArr) {
            data[inlineArr[1]] = inlineArr[2].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
            continue;
        }

        // Object field: key:\n  subkey: value
        const objStart = trimmed.match(/^(\w[\w-]*)\s*:\s*$/);
        if (objStart) {
            currentKey = objStart[1];
            // Check if next lines are sub-fields or array items
            continue;
        }

        // Sub-field: "    source: ./file.png"
        if (/^\s{2,}\w/.test(line) && currentKey) {
            const sub = trimmed.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
            if (sub) {
                if (typeof data[currentKey] !== 'object' || data[currentKey] === null) {
                    data[currentKey] = {};
                }
                (data[currentKey] as Record<string, string>)[sub[1]] = sub[2].replace(/^["']|["']$/g, '');
                continue;
            }
        }

        // Key-value
        const kv = trimmed.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
        if (kv) {
            let val: unknown = kv[2].replace(/^["']|["']$/g, '');
            if (val === 'true') val = true;
            if (val === 'false') val = false;
            data[kv[1]] = val;
            currentKey = kv[1];
            continue;
        }

        // Array start: "key:"  followed by "- item"
        const arrStart = trimmed.match(/^(\w[\w-]*)\s*:$/);
        if (arrStart) {
            currentKey = arrStart[1];
            inArray = true;
            arrayItems = [];
        }
    }
    if (inArray) data[currentKey] = arrayItems;

    return { data, body };
}

function serializeFrontmatter(data: Record<string, unknown>, body: string, layoutPath: string): string {
    const lines: string[] = ['---'];

    lines.push(`layout: "${layoutPath}"`);
    lines.push('variant: "article"');

    for (const [key, value] of Object.entries(data)) {
        if (key === 'layout' || key === 'variant') continue;
        if (value === undefined || value === null || value === '') continue;

        if (Array.isArray(value)) {
            if (value.length === 0) continue;
            lines.push(`${key}:`);
            for (const item of value) {
                lines.push(`  - "${item}"`);
            }
        } else if (typeof value === 'object') {
            lines.push(`${key}:`);
            for (const [sk, sv] of Object.entries(value as Record<string, unknown>)) {
                if (sv !== undefined && sv !== null && sv !== '') {
                    lines.push(`    ${sk}: ${sv}`);
                }
            }
        } else if (typeof value === 'boolean') {
            lines.push(`${key}: ${value}`);
        } else {
            const str = String(value);
            lines.push(`${key}: "${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}"`);
        }
    }

    lines.push('---');
    lines.push('');
    lines.push(body);

    return lines.join('\n');
}

// ─── Entry type ──────────────────────────────────────────

interface Entry {
    path: string;      // e.g., "src/content/news/2025/ahm-europe/index.mdx"
    slug: string;      // e.g., "2025/ahm-europe"
    data: Record<string, unknown>;
    body: string;
}

// ─── Components ──────────────────────────────────────────

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

function LoginScreen({ onLogin }: { onLogin: () => void }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-background">
            <div className="text-center max-w-sm">
                <img src={`${BASE}/assets/logos/elixir-no-light.svg`} alt="ELIXIR Norway" className="h-12 mx-auto mb-6" />
                <h1 className="text-xl font-bold text-white mb-2">Content Manager</h1>
                <p className="text-sm text-gray-400 mb-8">
                    Sign in with your GitHub account to edit content.<br />
                    Requires write access to the repository.
                </p>
                <button
                    onClick={onLogin}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 transition-colors"
                >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    Sign in with GitHub
                </button>
            </div>
        </div>
    );
}

function Sidebar({
    activeCollection,
    onSelect,
    user,
    onLogout,
    mobileOpen,
    onMobileClose,
    prCount,
}: {
    activeCollection: string;
    onSelect: (name: string) => void;
    user: { login: string; avatar_url: string; name: string } | null;
    onLogout: () => void;
    mobileOpen: boolean;
    onMobileClose: () => void;
    prCount: number | null;
}) {
    return (
        <>
        {/* Mobile backdrop */}
        {mobileOpen && (
            <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onMobileClose} />
        )}
        <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-56 shrink-0 border-r border-gray-700/30 bg-dark-surface h-screen flex flex-col transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="px-4 py-4 border-b border-gray-700/30 flex items-center justify-between">
                <img src={`${BASE}/assets/logos/elixir-no-light.svg`} alt="ELIXIR Norway" className="h-8 w-auto" />
                <button onClick={onMobileClose} className="lg:hidden p-1 text-gray-400 hover:text-white">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
                <button
                    onClick={() => { onSelect('pull-requests'); onMobileClose(); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between ${
                        activeCollection === 'pull-requests'
                            ? 'bg-accent/10 text-accent font-semibold'
                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
                >
                    <span className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                        Pull Requests
                    </span>
                    {prCount !== null && prCount > 0 && (
                        <span className="rounded-full bg-accent/20 text-accent px-1.5 py-0.5 text-xs font-semibold min-w-[1.25rem] text-center">
                            {prCount}
                        </span>
                    )}
                </button>
                <div className="my-1 border-t border-gray-700/20" />
                {collections.map((c) => (
                    <button
                        key={c.name}
                        onClick={() => { onSelect(c.name); onMobileClose(); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                            activeCollection === c.name
                                ? 'bg-accent/10 text-accent font-semibold'
                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }`}
                    >
                        {c.label}
                    </button>
                ))}
            </nav>
            {user && (
                <div className="px-3 py-3 border-t border-gray-700/30 flex items-center gap-2">
                    <img src={user.avatar_url} alt="" className="h-6 w-6 rounded-full" />
                    <span className="text-xs text-gray-400 truncate flex-1">{user.login}</span>
                    <button onClick={onLogout} className="text-xs text-gray-500 hover:text-gray-300">
                        Log out
                    </button>
                </div>
            )}
        </aside>
        </>
    );
}

function CollectionView({
    collection,
    token,
    onEdit,
    onCreate,
    onEntriesLoaded,
}: {
    collection: ContentCollection;
    token: string;
    onEdit: (entry: Entry) => void;
    onCreate: () => void;
    onEntriesLoaded: (entries: Entry[]) => void;
}) {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState({ loaded: 0, total: 0 });

    useEffect(() => {
        setLoading(true);
        setProgress({ loaded: 0, total: 0 });
        (async () => {
            const files = await listFiles(token, collection.folder + '/');
            const indexFiles = files.filter((f) => f.path.endsWith('/index.mdx'));
            setProgress({ loaded: 0, total: indexFiles.length });

            const loaded: Entry[] = [];
            for (const f of indexFiles) {
                try {
                    const content = await readFile(token, f.path);
                    const { data, body } = parseFrontmatter(content);
                    const slug = f.path
                        .replace(collection.folder + '/', '')
                        .replace('/index.mdx', '');
                    loaded.push({ path: f.path, slug, data, body });
                } catch { /* skip unreadable files */ }
                setProgress(p => ({ ...p, loaded: loaded.length }));
            }

            loaded.sort((a, b) => {
                const da = String(a.data.date || a.data.title || '');
                const db = String(b.data.date || b.data.title || '');
                return db.localeCompare(da);
            });

            setEntries(loaded);
            onEntriesLoaded(loaded);
            setLoading(false);
        })();
    }, [collection.name, token]);

    return (
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{collection.label}</h2>
                {collection.canCreate && (
                    <button
                        onClick={onCreate}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-white hover:opacity-90 transition-opacity"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        New
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-8">
                <div>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <svg className="h-7 w-7 animate-spin text-accent" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-xs text-gray-500 mt-3">
                                {progress.total > 0
                                    ? `Loading ${progress.loaded} of ${progress.total} entries...`
                                    : 'Fetching file list...'}
                            </span>
                            {progress.total > 0 && (
                                <div className="w-48 h-1 rounded-full bg-gray-700 mt-2 overflow-hidden">
                                    <div
                                        className="h-full bg-accent rounded-full transition-all duration-200"
                                        style={{ width: `${(progress.loaded / progress.total) * 100}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    ) : entries.length === 0 ? (
                        <p className="text-sm text-gray-400">No entries found.</p>
                    ) : (
                        <div className="space-y-1">
                            {entries.map((entry) => (
                                <button
                                    key={entry.path}
                                    onClick={() => onEdit(entry)}
                                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-700/30 bg-white/[0.03] hover:border-accent/30 transition-colors group"
                                >
                                    <div className="text-sm font-semibold text-white group-hover:text-accent transition-colors truncate">
                                        {String(entry.data.title || entry.slug)}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                                        {entry.data.date && <span>{String(entry.data.date)}</span>}
                                        <span className="text-gray-600">{entry.slug}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info panel */}
                <div className="hidden xl:block">
                    <div className="sticky top-8 rounded-xl border border-gray-700/30 bg-white/[0.02] p-5">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">About this collection</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">{collection.description}</p>
                        {!loading && (
                            <p className="text-xs text-gray-500 mt-4">
                                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function FieldInput({
    field,
    value,
    onChange,
    suggestions = [],
}: {
    field: Field;
    value: unknown;
    onChange: (val: unknown) => void;
    suggestions?: string[];
}) {
    switch (field.type) {
        case 'date': {
            // Convert "Month D, YYYY" → "YYYY-MM-DD" for the date input (timezone-safe)
            const toInputDate = (v: unknown): string => {
                if (!v) return '';
                const d = new Date(String(v) + ' UTC');
                if (isNaN(d.getTime())) return '';
                return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
            };
            // Convert "YYYY-MM-DD" → "Month D, YYYY" for storage (no timezone shift)
            const toDisplayDate = (iso: string): string => {
                if (!iso) return '';
                const [y, m, d] = iso.split('-').map(Number);
                const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                return `${months[m - 1]} ${d}, ${y}`;
            };
            return (
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={toInputDate(value)}
                        onChange={(e) => onChange(toDisplayDate(e.target.value))}
                        className="px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent [color-scheme:dark]"
                    />
                    {value && <span className="text-sm text-gray-400">{String(value)}</span>}
                </div>
            );
        }

        case 'string':
            return (
                <input
                    type="text"
                    value={String(value || '')}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder={field.hint}
                />
            );

        case 'text':
            return (
                <textarea
                    value={String(value || '')}
                    onChange={(e) => onChange(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent resize-y"
                    placeholder={field.hint}
                />
            );

        case 'select':
            return (
                <select
                    value={String(value || '')}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent"
                >
                    <option value="">—</option>
                    {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );

        case 'list': {
            const items = Array.isArray(value) ? value : [];
            const [input, setInput] = useState('');
            const [showSuggestions, setShowSuggestions] = useState(false);

            const filtered = suggestions.filter(
                s => !items.includes(s) && s.toLowerCase().includes(input.toLowerCase())
            );

            const addItem = (item: string) => {
                onChange([...items, item]);
                setInput('');
                setShowSuggestions(false);
            };

            return (
                <div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {items.map((item, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-accent/10 text-accent px-2.5 py-0.5 text-xs font-medium">
                                {item}
                                <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="hover:text-red-500">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && input.trim()) {
                                    e.preventDefault();
                                    addItem(input.trim());
                                }
                            }}
                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent"
                            placeholder={field.hint || 'Type and press Enter'}
                        />
                        {showSuggestions && filtered.length > 0 && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-600 bg-dark-surface shadow-xl">
                                {filtered.slice(0, 15).map(s => (
                                    <button
                                        key={s}
                                        onMouseDown={(e) => { e.preventDefault(); addItem(s); }}
                                        className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Type and press Enter to add, or select from suggestions.</p>
                </div>
            );
        }

        case 'boolean':
            return (
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{field.label}</span>
                </label>
            );

        case 'image': {
            const src = typeof value === 'object' && value ? (value as Record<string, string>).source : String(value || '');
            return (
                <div>
                    {src && <p className="text-xs text-gray-400 mb-1">Current: {src}</p>}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const ext = file.name.split('.').pop() || 'png';
                            const baseName = toKebab(file.name.replace(/\.[^.]+$/, ''));
                            const safeName = `${baseName}.${ext.toLowerCase()}`;
                            onChange({ source: `./${safeName}`, _file: file });
                        }}
                        className="text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent/10 file:text-accent hover:file:bg-accent/20 file:cursor-pointer"
                    />
                </div>
            );
        }

        default:
            return (
                <input
                    type="text"
                    value={String(value || '')}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
            );
    }
}

function EntryEditor({
    collection,
    entry,
    token,
    onBack,
    isNew,
    allEntries,
    user,
}: {
    collection: ContentCollection;
    entry: Entry;
    token: string;
    onBack: () => void;
    isNew: boolean;
    allEntries: Entry[];
    user: { login: string } | null;
}) {
    // Auto-save draft key
    const draftKey = `cms-draft:${collection.name}:${isNew ? '__new__' : entry.path}`;

    const loadDraft = (): { data: Record<string, unknown>; body: string; slug: string } | null => {
        try {
            const raw = sessionStorage.getItem(draftKey);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    };

    const draft = loadDraft();
    const [data, setData] = useState<Record<string, unknown>>(draft?.data ?? entry.data);
    const [body, setBody] = useState(draft?.body ?? entry.body);
    const [slug, setSlug] = useState(draft?.slug ?? entry.slug);
    const [slugEdited, setSlugEdited] = useState(false);
    const [hasDraft, setHasDraft] = useState(!!draft);
    const [confirmDialog, setConfirmDialog] = useState<{ files: Array<{ path: string; content: string; encoding?: 'utf-8' | 'base64' }>; defaultTitle: string } | null>(null);

    // Auto-save draft on changes
    useEffect(() => {
        const timer = setTimeout(() => {
            sessionStorage.setItem(draftKey, JSON.stringify({ data, body, slug }));
            setHasDraft(true);
        }, 500);
        return () => clearTimeout(timer);
    }, [data, body, slug, draftKey]);

    const clearDraft = () => {
        sessionStorage.removeItem(draftKey);
        setHasDraft(false);
    };

    // Build suggestions from all entries in the same collection
    const [peopleSuggestions, setPeopleSuggestions] = useState<string[]>([]);
    useEffect(() => {
        readJsonFile<{ orgs: Record<string, { people: Array<{ username: string; name: string }> }> }>(token, 'src/data/people.json')
            .then(d => {
                const usernames = Object.values(d.orgs).flatMap(o => o.people.map(p => p.username)).filter(Boolean);
                setPeopleSuggestions(usernames);
            })
            .catch(() => {});
    }, [token]);

    const fieldSuggestions = useCallback((fieldName: string): string[] => {
        // Collect unique values for this field across all entries
        const values = new Set<string>();
        for (const e of allEntries) {
            const val = e.data[fieldName];
            if (Array.isArray(val)) val.forEach(v => values.add(String(v)));
        }
        // For the authors field, merge with people usernames
        if (fieldName === 'authors') {
            peopleSuggestions.forEach(u => values.add(u));
        }
        return Array.from(values).sort();
    }, [allEntries, peopleSuggestions]);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<SaveResult | null>(null);
    const [pendingBodyFiles, setPendingBodyFiles] = useState<Array<{ path: string; content: string }>>([]);

    const handleBodyFileUpload = useCallback(async (file: File): Promise<string> => {
        const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
        const baseName = toKebab(file.name.replace(/\.[^.]+$/, ''));
        const safeName = `${baseName}.${ext}`;
        const finalSlug = isNew ? slug : entry.slug;
        const dirPath = `${collection.folder}/${finalSlug}`;
        const filePath = `${dirPath}/${safeName}`;

        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
        });

        setPendingBodyFiles(prev => [...prev, { path: filePath, content: base64 }]);
        return `./${safeName}`;
    }, [isNew, slug, entry.slug, collection.folder]);

    const updateField = (name: string, value: unknown) => {
        setData((prev) => ({ ...prev, [name]: value }));
        // Auto-generate slug from title for new entries
        if (isNew && name === 'title' && !slugEdited && typeof value === 'string') {
            const base = toKebab(value);
            if (collection.depth === 2) {
                const year = new Date().getFullYear();
                setSlug(`${year}/${base}`);
            } else {
                setSlug(base);
            }
        }
    };

    const prepareFiles = async () => {
        const finalSlug = isNew ? slug : entry.slug;
        const dirPath = `${collection.folder}/${finalSlug}`;
        const filePath = `${dirPath}/index.mdx`;

        const files: Array<{ path: string; content: string; encoding?: 'utf-8' | 'base64' }> = [];

        const cleanData = { ...data };
        for (const field of collection.fields) {
            if (field.type === 'image' && cleanData[field.name]) {
                const imgVal = cleanData[field.name] as Record<string, unknown>;
                if (imgVal._file instanceof File) {
                    const file = imgVal._file as File;
                    const reader = new FileReader();
                    const base64 = await new Promise<string>((resolve) => {
                        reader.onload = () => resolve((reader.result as string).split(',')[1]);
                        reader.readAsDataURL(file);
                    });
                    files.push({ path: `${dirPath}/${file.name}`, content: base64, encoding: 'base64' });
                    cleanData[field.name] = { source: `./${file.name}` };
                }
            }
        }

        const mdxContent = serializeFrontmatter(cleanData, body, collection.layoutPath);

        // Include files uploaded via the markdown editor body
        for (const bf of pendingBodyFiles) {
            files.push({ path: bf.path, content: bf.content, encoding: 'base64' });
        }

        // Check if content actually changed (skip PR for identical edits)
        if (!isNew && files.length === 0) {
            const originalContent = serializeFrontmatter(entry.data, entry.body, collection.layoutPath);
            if (mdxContent === originalContent) {
                alert('No changes detected.');
                return;
            }
        }

        files.push({ path: filePath, content: mdxContent });

        const title = String(cleanData.title || finalSlug);
        const defaultTitle = `[CMS] ${isNew ? 'Add' : 'Update'} ${collection.label}: ${title}`;
        setConfirmDialog({ files, defaultTitle });
    };

    const handleConfirmedSave = async (prTitle: string, prDescription: string) => {
        setConfirmDialog(null);
        setSaving(true);
        try {
            const res = await saveAsPR(token, {
                title: prTitle,
                description: prDescription,
                username: user?.login || 'cms',
                files: confirmDialog!.files,
            });
            clearDraft();
            setResult(res);
        } catch (err) {
            alert(`Save failed: ${err}`);
        }
        setSaving(false);
    };

    if (result) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                        <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Pull request created</h3>
                    <p className="text-sm text-gray-400 mb-6">
                        Your changes have been saved to branch <code className="text-xs bg-gray-800 px-1.5 py-0.5 rounded">{result.branch}</code> and a PR has been opened for review.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <a
                            href={result.prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-white hover:opacity-90 transition-opacity"
                        >
                            View PR on GitHub
                        </a>
                        <button onClick={onBack} className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            Back to list
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
            <div className="max-w-3xl">
                <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-primary dark:hover:text-white mb-6 transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                    Back to {collection.label}
                </button>

                <h2 className="text-xl font-bold text-white mb-6">
                    {isNew ? `New ${collection.label}` : String(data.title || entry.slug)}
                </h2>

                {isNew && (
                    <div className="mb-5">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            Path / Slug
                        </label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                            placeholder={collection.depth === 2 ? '2026/my-article' : 'my-entry'}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Auto-generated from title. Edit to override.
                        </p>
                    </div>
                )}

                <div className="space-y-5">
                    {collection.fields.map((field) => (
                        <div key={field.name}>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            <FieldInput
                                field={field}
                                value={data[field.name]}
                                onChange={(val) => updateField(field.name, val)}
                                suggestions={field.type === 'list' ? fieldSuggestions(field.name) : []}
                            />
                            {field.hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{field.hint}</p>}
                        </div>
                    ))}

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            Content (Markdown)
                        </label>
                        <MarkdownEditor value={body} onChange={setBody} onFileUpload={handleBodyFileUpload} />
                    </div>
                </div>

                <div className="mt-8 flex items-center gap-3 pb-12">
                    <button
                        onClick={prepareFiles}
                        disabled={saving}
                        className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save as Pull Request'}
                    </button>
                    <button
                        onClick={() => { clearDraft(); onBack(); }}
                        className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-600 text-gray-300 hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    {hasDraft && (
                        <span className="text-xs text-gray-500 ml-auto flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            Draft saved
                            <button
                                onClick={() => { clearDraft(); setData(entry.data); setBody(entry.body); setSlug(entry.slug); }}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                                title="Discard draft and revert to saved version"
                            >
                                Discard
                            </button>
                        </span>
                    )}
                </div>

                {confirmDialog && (
                    <PRConfirmDialog
                        defaultTitle={confirmDialog.defaultTitle}
                        defaultDescription={`Content update via ELIXIR Norway CMS.\n\nFiles changed:\n${confirmDialog.files.map(f => `- \`${f.path}\``).join('\n')}`}
                        files={confirmDialog.files}
                        onConfirm={handleConfirmedSave}
                        onCancel={() => setConfirmDialog(null)}
                    />
                )}
            </div>
        </div>
    );
}

// ─── Global loader ───────────────────────────────────────

function GlobalLoader() {
    return (
        <div className="fixed inset-0 z-[9999] bg-dark-background flex items-center justify-center">
            <div className="flex flex-col items-center gap-5">
                <img src={`${BASE}/assets/logos/elixir-no-light.svg`} alt="ELIXIR Norway" className="h-10 opacity-60" />
                <svg className="h-6 w-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        </div>
    );
}

// ─── Main App ────────────────────────────────────────────

export default function AdminApp() {
    const { token, user, authorized, login, logout } = useAuth();
    const [activeCollection, setActiveCollection] = useState('pull-requests');
    const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [loadedEntries, setLoadedEntries] = useState<Entry[]>([]);
    const [mobileNav, setMobileNav] = useState(false);
    const [prCount, setPrCount] = useState<number | null>(null);
    const [editingPR, setEditingPR] = useState<{ branch: string; prNumber: number } | null>(null);

    if (!token) {
        return <LoginScreen onLogin={login} />;
    }

    if (authorized === null) {
        return <GlobalLoader />;
    }

    if (authorized === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-background">
                <div className="text-center max-w-sm">
                    <p className="text-sm text-red-400 mb-4">
                        Your GitHub account does not have write access to this repository.
                    </p>
                    <button onClick={logout} className="text-sm text-accent hover:underline">Sign out and try another account</button>
                </div>
            </div>
        );
    }

    const handleCreate = () => {
        setIsNew(true);
        setEditingEntry({ path: '', slug: '', data: {}, body: '' });
    };

    const handleBack = () => {
        setEditingEntry(null);
        setIsNew(false);
    };

    const handleEditPR = async (pr: PullRequest, collection: Collection, files: PRFile[]) => {
        setEditingPR({ branch: pr.head.ref, prNumber: pr.number });

        if (collection.kind === 'json') {
            setActiveCollection(collection.name);
            return;
        }

        const contentCollection = collection as ContentCollection;
        const mdxFile = files.find(f => f.filename.endsWith('/index.mdx'));
        if (!mdxFile) {
            alert('Could not find content file in this PR.');
            setEditingPR(null);
            return;
        }

        try {
            const content = await readFileFromRef(token!, mdxFile.filename, pr.head.ref);
            const { data, body } = parseFrontmatter(content);
            const slug = mdxFile.filename
                .replace(contentCollection.folder + '/', '')
                .replace('/index.mdx', '');
            setActiveCollection(collection.name);
            setEditingEntry({ path: mdxFile.filename, slug, data, body });
            setIsNew(false);
        } catch (err) {
            alert(`Failed to load PR content: ${err}`);
            setEditingPR(null);
        }
    };

    const handleBackFromPR = () => {
        setEditingEntry(null);
        setIsNew(false);
        setEditingPR(null);
        setActiveCollection('pull-requests');
    };

    function renderContent() {
        if (activeCollection === 'pull-requests' && !editingEntry) {
            return (
                <OpenPRsView
                    token={token!}
                    username={user?.login || ''}
                    onEditPR={handleEditPR}
                    onCountLoaded={setPrCount}
                />
            );
        }

        const collection = getCollection(activeCollection);
        if (!collection) return null;

        if (collection.kind === 'json') {
            if (collection.name === 'people') return <PeopleEditor token={token} username={user?.login || 'cms'} branchOverride={editingPR?.branch} onBack={editingPR ? handleBackFromPR : undefined} />;
            if (collection.name === 'slides') return <SlidesEditor token={token} username={user?.login || 'cms'} branchOverride={editingPR?.branch} onBack={editingPR ? handleBackFromPR : undefined} />;
            if (collection.name === 'banner') return <BannerEditor token={token} username={user?.login || 'cms'} branchOverride={editingPR?.branch} onBack={editingPR ? handleBackFromPR : undefined} />;
            return null;
        }

        if (editingEntry) {
            return (
                <EntryEditor
                    collection={collection}
                    entry={editingEntry}
                    token={token}
                    onBack={editingPR ? handleBackFromPR : handleBack}
                    isNew={isNew}
                    allEntries={loadedEntries}
                    user={user}
                    branchOverride={editingPR?.branch}
                />
            );
        }

        return (
            <CollectionView
                collection={collection}
                token={token}
                onEdit={(entry) => { setEditingEntry(entry); setIsNew(false); }}
                onCreate={handleCreate}
                onEntriesLoaded={setLoadedEntries}
            />
        );
    }

    return (
        <div className="flex h-screen bg-dark-background">
            <Sidebar
                activeCollection={activeCollection}
                onSelect={(name) => { setActiveCollection(name); setEditingEntry(null); setIsNew(false); setEditingPR(null); }}
                user={user}
                onLogout={logout}
                mobileOpen={mobileNav}
                onMobileClose={() => setMobileNav(false)}
                prCount={prCount}
            />
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile header */}
                <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-700/30 bg-dark-surface shrink-0">
                    <button onClick={() => setMobileNav(true)} className="p-1.5 text-gray-400 hover:text-white">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                    </button>
                    <span className="text-sm font-semibold text-white">
                        {activeCollection === 'pull-requests' ? 'Pull Requests' : getCollection(activeCollection)?.label}
                    </span>
                </div>
                {renderContent()}
            </div>
        </div>
    );
}
