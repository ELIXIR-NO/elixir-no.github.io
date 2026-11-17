import React, { useState, useEffect } from 'react';
import { readJsonFile, readFileFromRef, saveAsPR, commitToBranch, type SaveResult } from './github';
import PRConfirmDialog from './PRConfirmDialog';
import BranchPill from './BranchPill';
import { isLive, renderInlineMarkdown, schema, type Banner } from '../../lib/banner';

type BannerData = Banner;

// <input type="datetime-local"> works in the browser's own time zone without
// an offset, while banner.json stores an exact moment.
function toLocalInput(iso: string | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | undefined {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
}

// One key order whatever order the editor filled the fields in, so saves do
// not reshuffle banner.json. Unset keys are dropped by JSON.stringify.
function serialize({ visible, label, message, link, expires }: BannerData): string {
    return JSON.stringify({ visible, label, message, link, expires }, null, 4) + '\n';
}

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent';
const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

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

    const updateLink = (patch: { label?: string; href?: string }) => {
        const next = { label: data?.link?.label ?? '', href: data?.link?.href ?? '', ...patch };
        update({ link: next.label || next.href ? next : undefined });
    };

    const check = data ? schema.safeParse(data) : null;
    const problems = check && !check.success
        ? check.error.issues.map((issue) => `${issue.path.join('.') || 'banner'}: ${issue.message}`)
        : [];
    const expired = !!data?.expires && Date.parse(data.expires) <= Date.now();

    const preparePublish = async () => {
        if (!data || problems.length) return;
        const files = [{ path: 'src/data/banner.json', content: serialize(data) }];
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
                        <button onClick={preparePublish} disabled={saving || problems.length > 0}
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
                    {isLive(data) && (
                        <span className="inline-flex items-center rounded-full bg-green-900/20 px-2.5 py-0.5 text-xs font-medium text-green-400">
                            Live on all pages
                        </span>
                    )}
                    {data.visible && expired && (
                        <span className="inline-flex items-center rounded-full bg-amber-900/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                            Deadline passed, so it is hidden
                        </span>
                    )}
                </div>

                {/* Label */}
                <div className="mb-6">
                    <label htmlFor="banner-label" className={labelClass}>Label (optional)</label>
                    <input
                        id="banner-label"
                        value={data.label ?? ''}
                        onChange={(e) => update({ label: e.target.value || undefined })}
                        placeholder="e.g., Event, Maintenance"
                        className={`${inputClass} max-w-xs`}
                    />
                    <p className="text-xs text-gray-500 mt-1">A short tag shown before the message.</p>
                </div>

                {/* Message */}
                <div className="mb-6">
                    <label htmlFor="banner-message" className={labelClass}>Message</label>
                    <textarea
                        id="banner-message"
                        value={data.message}
                        onChange={(e) => update({ message: e.target.value })}
                        rows={3}
                        placeholder="e.g., NeLS will be under scheduled maintenance on March 25. See **[status page](https://status.elixir.no)** for details."
                        className={`${inputClass} resize-y`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Supports inline markdown: **bold**, *italic*, [link text](url)
                    </p>
                </div>

                {/* Link */}
                <div className="mb-6">
                    <span className={labelClass}>Link (optional)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-[12rem_1fr] gap-3">
                        <input
                            aria-label="Link text"
                            value={data.link?.label ?? ''}
                            onChange={(e) => updateLink({ label: e.target.value })}
                            placeholder="Read more"
                            className={inputClass}
                        />
                        <input
                            aria-label="Link address"
                            value={data.link?.href ?? ''}
                            onChange={(e) => updateLink({ href: e.target.value })}
                            placeholder="/events/2026/my-event or https://..."
                            className={inputClass}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        A page on this site starts with a single /; another website starts with https://.
                    </p>
                </div>

                {/* Deadline */}
                <div className="mb-6">
                    <label htmlFor="banner-expires" className={labelClass}>Hide after (optional)</label>
                    <div className="flex items-center gap-3">
                        <input
                            id="banner-expires"
                            type="datetime-local"
                            value={toLocalInput(data.expires)}
                            onChange={(e) => update({ expires: fromLocalInput(e.target.value) })}
                            className={`${inputClass} max-w-xs [color-scheme:dark]`}
                        />
                        {data.expires && (
                            <button onClick={() => update({ expires: undefined })} className="text-sm text-gray-400 hover:text-white transition-colors">
                                Clear
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        The banner disappears by itself at this time ({timeZone}). Leave empty to keep it until you hide it.
                    </p>
                </div>

                {problems.length > 0 && (
                    <div role="alert" className="mb-6 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                        <p className="font-semibold">Fix these before publishing:</p>
                        <ul className="mt-1 list-disc pl-5">
                            {problems.map((problem) => <li key={problem}>{problem}</li>)}
                        </ul>
                    </div>
                )}

                {/* Preview */}
                {data.message && (
                    <div>
                        <span className={labelClass}>Preview</span>
                        <div className={`flex items-center gap-2 rounded-lg border border-white/10 bg-brand-primary py-2.5 pl-4 pr-3 text-white ${isLive(data) ? '' : 'opacity-50'}`}>
                            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm">
                                {data.label && (
                                    <span className="inline-flex items-center rounded-chip bg-brand-secondary px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-brand-primary">
                                        {data.label}
                                    </span>
                                )}
                                <p className="m-0 font-medium text-white" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(data.message) }} />
                                {data.link?.label && (
                                    <span className="rounded-control bg-white px-3 py-1 font-semibold text-brand-primary">{data.link.label} →</span>
                                )}
                            </div>
                            <span className="text-white/75" aria-hidden="true">✕</span>
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
