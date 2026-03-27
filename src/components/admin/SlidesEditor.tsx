import React, { useState, useEffect } from 'react';
import { readJsonFile, readFileFromRef, saveAsPR, commitToBranch, type SaveResult } from './github';
import type { Slide } from './schema';
import PRConfirmDialog from './PRConfirmDialog';

interface PendingImage { file: File; base64?: string; path: string }

export default function SlidesEditor({ token, username, branchOverride, onBack }: { token: string; username: string; branchOverride?: string; onBack?: () => void }) {
    const [slides, setSlides] = useState<Slide[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<number | 'new' | null>(null);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<SaveResult | null>(null);
    const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<{ files: Array<{ path: string; content: string; encoding?: 'utf-8' | 'base64' }> } | null>(null);

    useEffect(() => {
        (async () => {
            let d: Slide[];
            if (branchOverride) {
                const raw = await readFileFromRef(token, 'src/data/slides.json', branchOverride);
                d = JSON.parse(raw);
            } else {
                d = await readJsonFile<Slide[]>(token, 'src/data/slides.json');
            }
            setSlides(d);
            setLoading(false);
        })();
    }, [token, branchOverride]);

    const moveUp = (i: number) => {
        if (i === 0) return;
        const next = [...slides];
        [next[i - 1], next[i]] = [next[i], next[i - 1]];
        setSlides(next);
        setDirty(true);
    };

    const moveDown = (i: number) => {
        if (i === slides.length - 1) return;
        const next = [...slides];
        [next[i], next[i + 1]] = [next[i + 1], next[i]];
        setSlides(next);
        setDirty(true);
    };

    const removeSlide = (i: number) => {
        if (!confirm('Remove this slide?')) return;
        setSlides(s => s.filter((_, j) => j !== i));
        setDirty(true);
        setEditing(null);
    };

    const handleSaveSlide = async (slide: Slide, image?: PendingImage) => {
        const next = [...slides];
        if (editing === 'new') {
            next.push(slide);
        } else if (typeof editing === 'number') {
            next[editing] = slide;
        }
        setSlides(next);
        setDirty(true);

        if (image) {
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(image.file);
            });
            setPendingImages(prev => [...prev, { ...image, base64 }]);
        }

        setEditing(null);
    };

    const preparePublish = async () => {
        const files: Array<{ path: string; content: string; encoding?: 'utf-8' | 'base64' }> = [];
        files.push({ path: 'src/data/slides.json', content: JSON.stringify(slides, null, 4) + '\n' });
        for (const img of pendingImages) {
            if (img.base64) files.push({ path: img.path, content: img.base64, encoding: 'base64' });
        }
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
                    <p className="text-sm text-gray-400 mb-6">Carousel slides updated.</p>
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

    if (loading) {
        return (
            <div className="flex-1 p-8 flex flex-col items-center justify-center">
                <svg className="h-7 w-7 animate-spin text-accent" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs text-gray-500 mt-3">Loading slides...</span>
            </div>
        );
    }

    if (editing !== null) {
        const slide = editing === 'new'
            ? { src: '', alt: '', caption: '' }
            : slides[editing];

        return (
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
                <button onClick={() => setEditing(null)} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white mb-6 transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                    Back to Slides
                </button>
                <h2 className="text-xl font-bold text-white mb-6">
                    {editing === 'new' ? 'Add Slide' : `Edit Slide ${editing + 1}`}
                </h2>
                <SlideForm slide={slide} onSave={handleSaveSlide} onCancel={() => setEditing(null)}
                    onDelete={editing !== 'new' ? () => removeSlide(editing as number) : undefined}
                    isNew={editing === 'new'} />
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
            {onBack && (
                <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                    Back to Pull Requests
                </button>
            )}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">Slides</h2>
                    <p className="text-sm text-gray-400">{slides.length} slides in the highlights carousel</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setEditing('new')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-white hover:opacity-90 transition-opacity">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        Add Slide
                    </button>
                    {dirty && (
                        <button onClick={preparePublish} disabled={saving}
                            className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                            {saving ? 'Saving...' : branchOverride ? 'Push to PR' : 'Publish Changes'}
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-2 max-w-2xl">
                {slides.map((slide, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-700/30 bg-white/[0.03] group">
                        {/* Reorder */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                            <button onClick={() => moveUp(i)} disabled={i === 0}
                                className="p-0.5 rounded text-gray-400 hover:text-white disabled:opacity-20 transition-colors" aria-label="Move up">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
                            </button>
                            <button onClick={() => moveDown(i)} disabled={i === slides.length - 1}
                                className="p-0.5 rounded text-gray-400 hover:text-white disabled:opacity-20 transition-colors" aria-label="Move down">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                            </button>
                        </div>

                        {/* Thumbnail */}
                        <div className="h-14 w-24 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                            {slide.src && <img src={slide.src} alt="" className="h-full w-full object-cover" />}
                        </div>

                        {/* Info */}
                        <button onClick={() => setEditing(i)} className="flex-1 text-left min-w-0 group/btn">
                            <div className="text-sm font-semibold text-white group-hover/btn:text-accent transition-colors truncate">{slide.alt}</div>
                            <div className="text-xs text-gray-400 truncate">{slide.caption}</div>
                        </button>

                        {/* Position badge */}
                        <span className="text-xs font-mono text-gray-400 text-gray-500 tabular-nums shrink-0">{i + 1}/{slides.length}</span>
                    </div>
                ))}
            </div>

            {confirmDialog && (
                <PRConfirmDialog
                    defaultTitle="[CMS] Update carousel slides"
                    defaultDescription={`Carousel slides update via CMS.\n\nFiles changed:\n${confirmDialog.files.map(f => `- \`${f.path}\``).join('\n')}`}
                    files={confirmDialog.files}
                    onConfirm={handleConfirmedPublish}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}
        </div>
    );
}

function SlideForm({
    slide, onSave, onCancel, onDelete, isNew,
}: {
    slide: Slide; onSave: (slide: Slide, image?: PendingImage) => void;
    onCancel: () => void; onDelete?: () => void; isNew: boolean;
}) {
    const [form, setForm] = useState<Slide>({ ...slide });
    const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const slug = form.alt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'slide';
        const ext = (file.name.split('.').pop() || 'png').toLowerCase();
        const path = `public/data/slides/${slug}.${ext}`;
        setPendingImage({ file, path });
        setForm(f => ({ ...f, src: `/data/slides/${slug}.${ext}` }));
    };

    return (
        <div className="max-w-xl space-y-4">
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Alt Text *</label>
                <input value={form.alt} onChange={e => setForm(f => ({ ...f, alt: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Descriptive text for the image" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Caption</label>
                <textarea value={form.caption || ''} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent resize-y"
                    placeholder="Caption displayed below the image" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Image</label>
                {form.src && <p className="text-xs text-gray-500 mb-1">Current: {form.src}</p>}
                <input type="file" accept="image/*" onChange={handleImageChange}
                    className="text-sm text-gray-400 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent/10 file:text-accent hover:file:bg-accent/20 file:cursor-pointer" />
            </div>
            <div className="flex items-center gap-3 pt-2">
                <button onClick={() => onSave(form, pendingImage || undefined)}
                    className="px-5 py-2 text-sm font-semibold rounded-lg bg-accent text-white hover:opacity-90 transition-opacity">
                    {isNew ? 'Add Slide' : 'Update Slide'}
                </button>
                <button onClick={onCancel}
                    className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-600 text-gray-300 hover:bg-white/5 transition-colors">
                    Cancel
                </button>
                {!isNew && onDelete && (
                    <button onClick={onDelete}
                        className="ml-auto px-4 py-2 text-sm font-semibold rounded-lg text-red-400 hover:bg-red-900/10 transition-colors">
                        Remove
                    </button>
                )}
            </div>
        </div>
    );
}
