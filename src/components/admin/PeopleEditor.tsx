import React, { useState, useEffect } from 'react';
import { readJsonFile, readFileFromRef, saveAsPR, commitToBranch, type SaveResult } from './github';
import { ELIXIR_GROUPS, ORG_KEYS, type PeopleData, type Person, type ElixirGroup } from './schema';
import PRConfirmDialog from './PRConfirmDialog';

const ORG_LABELS: Record<string, string> = {
    uib: 'University of Bergen', uio: 'University of Oslo',
    uit: 'UiT The Arctic University of Norway', ntnu: 'NTNU',
    nmbu: 'NMBU', cnio: 'CNIO', amu: 'Univ. Marseille',
    vu: 'VU Amsterdam', embl: 'EMBL', ous: 'Oslo University Hospital',
    hi: 'Institute of Marine Research',
};

const GROUP_LABELS: Record<string, string> = {
    'node-leaders': 'Node Leaders', 'coordinators': 'Coordinators',
    'steering-board': 'Steering Board',
    'scientific-advisory-committee': 'Scientific Advisory Committee',
    'stakeholder-panel': 'Stakeholder Panel',
};

interface PendingImage { file: File; base64?: string; path: string }

function PersonForm({
    person, orgKey, onSave, onCancel, onDelete, isNew,
}: {
    person: Person; orgKey: string;
    onSave: (orgKey: string, person: Person, image?: PendingImage) => void;
    onCancel: () => void; onDelete?: () => void; isNew: boolean;
}) {
    const [form, setForm] = useState<Person>({ ...person });
    const [org, setOrg] = useState(orgKey);
    const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);

    const set = (key: keyof Person, val: unknown) => setForm(p => ({ ...p, [key]: val }));

    const handleGroupToggle = (groupName: string) => {
        const groups = [...form['elixir-groups']];
        const idx = groups.findIndex(g => g.name === groupName);
        if (idx >= 0) {
            groups.splice(idx, 1);
        } else {
            groups.push({ name: groupName, role: null });
        }
        set('elixir-groups', groups);
    };

    const handleGroupRole = (groupName: string, role: string) => {
        const groups = form['elixir-groups'].map(g =>
            g.name === groupName ? { ...g, role: role || null } : g
        );
        set('elixir-groups', groups);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const ext = (file.name.split('.').pop() || 'png').toLowerCase();
        const username = (form.username || 'new-person').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const path = `public/data/people/${username}.${ext}`;
        setPendingImage({ file, path });
        set('photo', `/data/people/${username}.${ext}`);
    };

    return (
        <div className="max-w-2xl">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Username *</label>
                        <input value={form.username} onChange={e => set('username', e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent"
                            placeholder="firstname-lastname" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Name *</label>
                        <input value={form.name} onChange={e => set('name', e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Title / Position *</label>
                    <input value={form.title} onChange={e => set('title', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Senior Engineer" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Organization</label>
                        <select value={org} onChange={e => setOrg(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent">
                            {ORG_KEYS.map(k => <option key={k} value={k}>{ORG_LABELS[k] || k}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Profile URL</label>
                        <input value={form['profile-url'] || ''} onChange={e => set('profile-url', e.target.value || null)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-2 focus:ring-accent"
                            placeholder="https://..." />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Photo</label>
                    {form.photo && <p className="text-xs text-gray-500 mb-1">Current: {form.photo}</p>}
                    <input type="file" accept="image/*" onChange={handleImageChange}
                        className="text-sm text-gray-400 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent/10 file:text-accent hover:file:bg-accent/20 file:cursor-pointer" />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">ELIXIR Groups</label>
                    <div className="space-y-2">
                        {ELIXIR_GROUPS.map(g => {
                            const active = form['elixir-groups'].find(eg => eg.name === g);
                            return (
                                <div key={g} className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer min-w-[200px]">
                                        <input type="checkbox" checked={!!active} onChange={() => handleGroupToggle(g)}
                                            className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                                        <span className="text-sm text-gray-300">{GROUP_LABELS[g]}</span>
                                    </label>
                                    {active && (
                                        <input value={active.role || ''} onChange={e => handleGroupRole(g, e.target.value)}
                                            placeholder="Role (optional)"
                                            className="flex-1 px-2 py-1 text-xs rounded border border-gray-600 bg-dark-surface text-white focus:outline-none focus:ring-1 focus:ring-accent" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
                <button onClick={() => onSave(org, form, pendingImage || undefined)}
                    className="px-5 py-2 text-sm font-semibold rounded-lg bg-accent text-white hover:opacity-90 transition-opacity">
                    {isNew ? 'Add Person' : 'Update Person'}
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

export default function PeopleEditor({ token, username, branchOverride, onBack }: { token: string; username: string; branchOverride?: string; onBack?: () => void }) {
    const [data, setData] = useState<PeopleData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<{ orgKey: string; index: number } | 'new' | null>(null);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<SaveResult | null>(null);
    const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<{ files: Array<{ path: string; content: string; encoding?: 'utf-8' | 'base64' }> } | null>(null);

    useEffect(() => {
        (async () => {
            let d: PeopleData;
            if (branchOverride) {
                const raw = await readFileFromRef(token, 'src/data/people.json', branchOverride);
                d = JSON.parse(raw);
            } else {
                d = await readJsonFile<PeopleData>(token, 'src/data/people.json');
            }
            setData(d);
            setLoading(false);
        })();
    }, [token, branchOverride]);

    const totalPeople = data ? Object.values(data.orgs).reduce((s, o) => s + o.people.length, 0) : 0;

    const handleSave = async (orgKey: string, person: Person, image?: PendingImage) => {
        if (!data) return;
        const updated = JSON.parse(JSON.stringify(data)) as PeopleData;
        const images: PendingImage[] = [...pendingImages];

        if (image) {
            // Read file as base64
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(image.file);
            });
            images.push({ ...image, base64 });
        }

        if (editing === 'new') {
            if (!updated.orgs[orgKey]) {
                updated.orgs[orgKey] = { name: ORG_LABELS[orgKey] || orgKey, people: [] };
            }
            updated.orgs[orgKey].people.push(person);
        } else if (editing && typeof editing === 'object') {
            const oldOrg = editing.orgKey;
            if (oldOrg === orgKey) {
                updated.orgs[orgKey].people[editing.index] = person;
            } else {
                updated.orgs[oldOrg].people.splice(editing.index, 1);
                if (!updated.orgs[orgKey]) {
                    updated.orgs[orgKey] = { name: ORG_LABELS[orgKey] || orgKey, people: [] };
                }
                updated.orgs[orgKey].people.push(person);
            }
        }

        setData(updated);
        setPendingImages(images);
        setEditing(null);
    };

    const [deleteConfirm, setDeleteConfirm] = useState<{ files: Array<{ path: string; content: string }> } | null>(null);

    const handleDelete = () => {
        if (!data || !editing || editing === 'new') return;
        const person = data.orgs[editing.orgKey].people[editing.index];
        if (!confirm(`Remove ${person.name} from the directory?`)) return;
        const updated = JSON.parse(JSON.stringify(data)) as PeopleData;
        updated.orgs[editing.orgKey].people.splice(editing.index, 1);
        const files = [{ path: 'src/data/people.json', content: JSON.stringify(updated, null, 2) + '\n' }];
        setDeleteConfirm({ files });
    };

    const handleConfirmedDelete = async (prTitle: string, prDescription: string) => {
        if (!deleteConfirm || !data || !editing || editing === 'new') return;
        setDeleteConfirm(null);
        setSaving(true);
        try {
            if (branchOverride) {
                await commitToBranch(token, branchOverride, deleteConfirm.files);
                setResult({ prUrl: '', branch: branchOverride });
            } else {
                const res = await saveAsPR(token, { title: prTitle, description: prDescription, username, files: deleteConfirm.files });
                setResult(res);
            }
        } catch (err) {
            alert(`Save failed: ${err}`);
        }
        setSaving(false);
    };

    const preparePublish = async () => {
        if (!data) return;
        const files: Array<{ path: string; content: string; encoding?: 'utf-8' | 'base64' }> = [];
        files.push({ path: 'src/data/people.json', content: JSON.stringify(data, null, 2) + '\n' });
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
                    <p className="text-sm text-gray-400 mb-6">People directory updated.</p>
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
                <span className="text-xs text-gray-500 mt-3">Loading people...</span>
            </div>
        );
    }

    if (editing !== null && data) {
        const person = editing === 'new'
            ? { username: '', name: '', title: '', photo: '', 'profile-url': null, affiliations: [], 'elixir-groups': [] } as Person
            : data.orgs[editing.orgKey].people[editing.index];
        const orgKey = editing === 'new' ? 'uib' : editing.orgKey;

        return (
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
                <button onClick={() => setEditing(null)} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white mb-6 transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                    Back to People
                </button>
                <h2 className="text-xl font-bold text-white mb-6">
                    {editing === 'new' ? 'Add Person' : person.name}
                </h2>
                <PersonForm person={person} orgKey={orgKey}
                    onSave={handleSave} onCancel={() => setEditing(null)}
                    onDelete={editing !== 'new' ? handleDelete : undefined}
                    isNew={editing === 'new'} />

                {deleteConfirm && (
                    <PRConfirmDialog
                        defaultTitle={`[CMS] Remove ${person.name} from people directory`}
                        defaultDescription={`Removed ${person.name} from the staff directory via CMS.`}
                        files={deleteConfirm.files}
                        onConfirm={handleConfirmedDelete}
                        onCancel={() => setDeleteConfirm(null)}
                    />
                )}
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
                    <h2 className="text-xl font-bold text-white">People</h2>
                    <p className="text-sm text-gray-400">{totalPeople} members across {Object.keys(data!.orgs).length} organizations</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setEditing('new')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-white hover:opacity-90 transition-opacity">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        Add Person
                    </button>
                    {pendingImages.length > 0 && (
                        <button onClick={preparePublish} disabled={saving}
                            className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                            {saving ? 'Saving...' : branchOverride ? 'Push to PR' : `Publish Changes (${pendingImages.length} new)`}
                        </button>
                    )}
                </div>
            </div>

            {data && Object.entries(data.orgs).map(([orgKey, org]) => (
                <div key={orgKey} className="mb-8">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        {org.name} ({org.people.length})
                    </h3>
                    <div className="space-y-1">
                        {org.people.map((person, i) => (
                            <button key={person.username || i} onClick={() => setEditing({ orgKey, index: i })}
                                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-700/30 bg-white/[0.03] hover:border-accent/30 transition-colors group">
                                <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-700 shrink-0">
                                    {person.photo && <img src={person.photo} alt="" className="h-full w-full object-cover" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-sm font-semibold text-white group-hover:text-accent transition-colors truncate block">{person.name}</span>
                                    <span className="text-xs text-gray-400 truncate block">{person.title}</span>
                                </div>
                                {person['elixir-groups'].length > 0 && (
                                    <div className="flex gap-1 shrink-0">
                                        {person['elixir-groups'].map(g => (
                                            <span key={g.name} className="rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] font-medium">{GROUP_LABELS[g.name] || g.name}</span>
                                        ))}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            {confirmDialog && (
                <PRConfirmDialog
                    defaultTitle="[CMS] Update people directory"
                    defaultDescription={`People directory update via CMS.\n\nFiles changed:\n${confirmDialog.files.map(f => `- \`${f.path}\``).join('\n')}`}
                    files={confirmDialog.files}
                    onConfirm={handleConfirmedPublish}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}
        </div>
    );
}
