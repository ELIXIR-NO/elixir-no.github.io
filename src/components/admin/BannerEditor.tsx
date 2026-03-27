import React, { useState, useEffect } from 'react';
import { readJsonFile, readFileFromRef, saveAsPR, commitToBranch, type SaveResult } from './github';
import PRConfirmDialog from './PRConfirmDialog';
import BranchPill from './BranchPill';

interface BannerData {
    visible: boolean;
    message: string;
}

function renderPreview(md: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(md)) !== null) {
        if (match.index > lastIndex) {
            parts.push(md.slice(lastIndex, match.index));
        }
        if (match[1]) {
            parts.push(<strong key={key++}>{match[1]}</strong>);
        } else if (match[2]) {
            parts.push(<em key={key++}>{match[2]}</em>);
        } else if (match[3] && match[4]) {
            parts.push(<a key={key++} href={match[4]} className="underline">{match[3]}</a>);
        }
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < md.length) {
        parts.push(md.slice(lastIndex));
    }
    return parts;
}

export default function BannerEditor({ token, username, branchOverride, onBack }: { token: string; username: string; branchOverride?: string; onBack?: () => void }) {
    const [data, setData] = useState<BannerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<SaveResult | null>(null);
    const [dirty, setDirty] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{ files: Array<{ path: string; content: string }> } | null>(null);

    useEffect(() => {
        (async () => {
            let d: BannerData;
            if (branchOverride) {
                const raw = await readFileFromRef(token, 'src/data/banner.json', branchOverride);
                d = JSON.parse(raw);
            } else {
                d = await readJsonFile<BannerData>(token, 'src/data/banner.json');
            }
            setData(d);
            setLoading(false);
        })();
    }, [token, branchOverride]);

    const update = (patch: Partial<BannerData>) => {
        setData(prev => prev ? { ...prev, ...patch } : prev);
        setDirty(true);
    };

    const preparePublish = async () => {
        if (!data) return;
        const files = [{ path: 'src/data/banner.json', content: JSON.stringify(data, null, 4) + '\n' }];
        if (branchOverride) {
            setSaving(true);
            try {
                await commitToBranch(token, branchOverride, files);
                setResult({ prUrl: '', branch: branchOverride });
            } catch (err) {
                alert(`Save failed: ${err}`);
            }
            setSaving(false);
            return;
        }
        setConfirmDialog({ files });
    };

    const handleConfirmedPublish = async (prTitle: string, prDescription: string) => {
        if (!confirmDialog) return;
        setConfirmDialog(null);
        setSaving(true);
        try {
            const res = await saveAsPR(token, { title: prTitle, description: prDescription, username, files: confirmDialog.files });
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
                    <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-green-900/20 flex items-center justify-center">
                        <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{branchOverride ? 'Changes pushed' : 'Pull request created'}</h3>
                    <p className="text-sm text-gray-400 mb-6">Banner updated.</p>
                    <div className="flex items-center justify-center gap-3">
                        {result.prUrl && (
                            <a href={result.prUrl} target="_blank" rel="noopener noreferrer"
                                className="px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-white hover:opacity-90 transition-opacity">
                                View PR on GitHub
                            </a>
                        )}
                        {onBack && (
                            <button onClick={onBack} className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-600 text-gray-300 hover:bg-white/5 transition-colors">
                                Back to Pull Requests
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (loading || !data) {
        return (
            <div className="flex-1 p-8 flex flex-col items-center justify-center">
                <svg className="h-7 w-7 animate-spin text-accent" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs text-gray-500 mt-3">Loading banner...</span>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
            <div className="max-w-2xl">
                {onBack && (
                    <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                        Back to Pull Requests
                    </button>
                )}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl font-bold text-white">Site Banner</h2>
                        <p className="text-sm text-gray-400 mt-1">Announcement shown at the top of every page.</p>
                        <div className="mt-2">
                            <BranchPill branch={branchOverride || 'main'} />
                        </div>
                    </div>
                    {dirty && (
                        <button onClick={preparePublish} disabled={saving}
                            className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                            {saving ? 'Saving...' : branchOverride ? 'Push to PR' : 'Publish Changes'}
                        </button>
                    )}
                </div>

                {/* Visibility toggle */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => update({ visible: !data.visible })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                            data.visible ? 'bg-accent' : 'bg-gray-600'
                        }`}
                        role="switch"
                        aria-checked={data.visible}
                        aria-label="Banner visibility"
                    >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                            data.visible ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                    </button>
                    <span className="text-sm font-medium text-white">
                        {data.visible ? 'Visible' : 'Hidden'}
                    </span>
                    {data.visible && (
                        <span className="inline-flex items-center rounded-full bg-green-900/20 px-2.5 py-0.5 text-xs font-medium text-green-400">
                            Live on all pages
                        </span>
                    )}
                </div>

                {/* Message */}
                <div className="mb-6">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        Message
                    </label>
                    <textarea
                        value={data.message}
                        onChange={(e) => update({ message: e.target.value })}
                        rows={3}
                        placeholder="e.g., NeLS will be under scheduled maintenance on March 25. See **[status page](https://status.elixir.no)** for details."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent resize-y"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Supports inline markdown: **bold**, *italic*, [link text](url)
                    </p>
                </div>

                {/* Preview */}
                {data.message && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            Preview
                        </label>
                        <div className={`rounded-lg text-center text-sm py-2.5 px-4 ${
                            data.visible ? 'bg-accent text-white' : 'bg-gray-700 text-gray-400'
                        }`}>
                            <div className="flex items-center justify-center gap-2">
                                <svg className="h-4 w-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
                                </svg>
                                <p>{renderPreview(data.message)}</p>
                            </div>
                        </div>
                        {!data.visible && <p className="text-xs text-gray-500 mt-1">Banner is hidden. Toggle visibility to show it.</p>}
                    </div>
                )}
            </div>

            {confirmDialog && (
                <PRConfirmDialog
                    defaultTitle={data.visible ? `[CMS] Show banner: ${data.message.slice(0, 60)}` : '[CMS] Hide site banner'}
                    defaultDescription="Banner update via CMS."
                    files={confirmDialog.files}
                    onConfirm={handleConfirmedPublish}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}
        </div>
    );
}
