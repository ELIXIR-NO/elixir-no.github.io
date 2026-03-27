import React, { useEffect, useState } from 'react';
import { listUserPRs, getPRFiles, type PullRequest, type PRFile } from './github';
import { detectCollection, type Collection } from './schema';

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

interface PRCardData {
    pr: PullRequest;
    collection: Collection | null;
    files: PRFile[];
}

export default function OpenPRsView({
    token,
    username,
    onEditPR,
    onCountLoaded,
}: {
    token: string;
    username: string;
    onEditPR: (pr: PullRequest, collection: Collection, files: PRFile[]) => void;
    onCountLoaded: (count: number) => void;
}) {
    const [cards, setCards] = useState<PRCardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!username) return;

        setLoading(true);
        setError(null);

        (async () => {
            try {
                const prs = await listUserPRs(token, username);
                const results: PRCardData[] = await Promise.all(
                    prs.map(async (pr) => {
                        const files = await getPRFiles(token, pr.number);
                        const collection = detectCollection(files.map(f => f.filename));
                        return { pr, collection, files };
                    }),
                );
                setCards(results);
                onCountLoaded(results.length);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load pull requests.');
                onCountLoaded(0);
            } finally {
                setLoading(false);
            }
        })();
    }, [token, username]);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
                <svg className="h-7 w-7 animate-spin text-accent" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs text-gray-500 mt-3">Loading pull requests...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 p-6 sm:p-8">
                <div className="rounded-xl border border-red-800/40 bg-red-900/10 p-5">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Pull Requests</h2>
                <span className="text-sm text-gray-500">{cards.length} open</span>
            </div>

            {cards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <svg className="h-10 w-10 text-gray-700 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                    <p className="text-sm text-gray-500">No open pull requests.</p>
                    <p className="text-xs text-gray-600 mt-1">Edits you save will appear here for review.</p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {cards.map(({ pr, collection, files }) => {
                        const isDisabled = collection === null;
                        const branchShort = pr.head.ref.replace(/^cms\/[^/]+\/\d+-/, '');

                        return (
                            <button
                                key={pr.number}
                                onClick={() => !isDisabled && onEditPR(pr, collection!, files)}
                                disabled={isDisabled}
                                className={`text-left rounded-xl border border-gray-700/30 bg-white/[0.03] p-4 transition-colors ${
                                    isDisabled
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover:border-accent/40 hover:bg-white/[0.05]'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <span className="text-sm font-semibold text-white leading-snug line-clamp-2">
                                        {pr.title}
                                    </span>
                                    {collection ? (
                                        <span className="shrink-0 rounded-full bg-accent/10 text-accent px-2 py-0.5 text-xs font-medium">
                                            {collection.label}
                                        </span>
                                    ) : (
                                        <span className="shrink-0 rounded-full bg-gray-700/50 text-gray-500 px-2 py-0.5 text-xs font-medium">
                                            Unknown
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mt-3">
                                    <span>#{pr.number}</span>
                                    <span className="text-gray-700">·</span>
                                    <span>{timeAgo(pr.created_at)}</span>
                                    <span className="text-gray-700">·</span>
                                    <span>{files.length} {files.length === 1 ? 'file' : 'files'}</span>
                                </div>

                                <div className="mt-2 text-xs text-gray-600 font-mono truncate" title={pr.head.ref}>
                                    {branchShort}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
