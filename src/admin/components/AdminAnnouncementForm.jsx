import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, ImagePlus, X, BellOff, Bell, Sparkles, Check, Save } from 'lucide-react';
import { Toggle } from '../../ui'; // ⚠️ adjust path
import announcementService from '../../backend/announcement'; // ⚠️ adjust path
import {
    fetchAnnouncementByIdAdmin,
    createAnnouncementAdmin,
    updateAnnouncementAdmin,
} from '../../store/slices/announcementSlice'; // ⚠️ adjust path
import RichTextEditor from './RichTextEditor';

// Which alert surface this announcement shows up on, if any. "none" is the
// default — most announcements just live in the regular list and don't
// interrupt anyone.
const ALERT_TYPES = [
    {
        value: 'none',
        label: 'None',
        description: "Won't appear in any alert banner — just the regular announcements list.",
        icon: BellOff,
        color: '#78716c',
    },
    {
        value: 'list',
        label: 'List alert',
        description: 'Shown in the alerts list users can browse.',
        icon: Bell,
        color: '#0ea5e9',
    },
    {
        value: 'special',
        label: 'Special alert',
        description: 'Highlighted as a special, high-priority alert.',
        icon: Sparkles,
        color: '#f97316',
    },
];

// Card-style option picker (theme §7) — used instead of a segmented control
// because each option needs its own icon + explanation, not just a label.
function AlertTypePicker({ value, onChange }) {
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ALERT_TYPES.map((opt) => {
                const active = value === opt.value;
                const Icon = opt.icon;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        aria-pressed={active}
                        className={`relative flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                            active
                                ? 'border-brand-600 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10'
                                : 'border-stone-200 hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700'
                        }`}
                    >
                        <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                active ? 'bg-brand-600 text-white dark:bg-brand-500' : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                            }`}
                        >
                            <Icon size={16} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{opt.label}</p>
                            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{opt.description}</p>
                        </div>
                        {active && (
                            <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white dark:bg-brand-500">
                                <Check size={12} strokeWidth={3} />
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

function AdminAnnouncementForm() {
    const { id } = useParams(); // "new" for creation, otherwise an existing announcement id
    const isNew = !id || id === 'new';
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [alertType, setAlertType] = useState('none');
    const [active, setActive] = useState(true);
    const [coverImageUrl, setCoverImageUrl] = useState(null);
    const [coverFileId, setCoverFileId] = useState(null);

    const loadExisting = useCallback(async () => {
        if (isNew) return;
        setLoading(true);
        const result = await dispatch(fetchAnnouncementByIdAdmin(id)).unwrap?.();
        if (result) {
            setTitle(result.title || '');
            setContent(result.content || '');
            setAlertType(result.alertType || 'none');
            setActive(result.active ?? true);
            setCoverFileId(result.coverImageId || null);
            setCoverImageUrl(
                result.coverImageId ? announcementService.getImageUrl({ fileId: result.coverImageId }) : null
            );
        }
        setLoading(false);
    }, [dispatch, id, isNew]);

    useEffect(() => {
        loadExisting();
    }, [loadExisting]);

    async function handleCoverUpload(e) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setUploadingCover(true);
        const uploaded = await announcementService.uploadImage({ file });
        setUploadingCover(false);

        if (!uploaded) {
            alert('Cover image upload failed.');
            return;
        }
        setCoverFileId(uploaded['$id']);
        setCoverImageUrl(announcementService.getImageUrl({ fileId: uploaded['$id'] }));
    }

    function handleRemoveCover() {
        // TODO: also delete the now-orphaned file via announcementService if
        // your backend doesn't already garbage-collect unattached uploads.
        setCoverFileId(null);
        setCoverImageUrl(null);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!title.trim()) {
            alert('Please give the announcement a title.');
            return;
        }

        setSaving(true);
        const payload = {
            title: title.trim(),
            content,
            alertType,
            active,
            coverImageId: coverFileId,
        };

        const result = isNew
            ? await dispatch(createAnnouncementAdmin(payload)).unwrap?.()
            : await dispatch(updateAnnouncementAdmin({ id, ...payload })).unwrap?.();
        setSaving(false);

        if (!result) {
            alert('Failed to save this announcement.');
            return;
        }
        navigate('/admin/announcements');
    }

    if (loading) {
        return <p className="text-sm text-stone-500 dark:text-stone-400">Loading announcement...</p>;
    }

    return (
        <div className="mx-auto max-w-3xl">
            <button
                onClick={() => navigate('/admin/announcements')}
                className="mb-4 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-brand-600 hover:underline dark:text-stone-400 dark:hover:text-brand-500"
            >
                <ArrowLeft className="h-4 w-4" /> Back to Announcements
            </button>

            <h1 className="mb-6 text-2xl font-bold text-stone-900 dark:text-stone-100">
                {isNew ? 'New Announcement' : 'Edit Announcement'}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <label htmlFor="announcement-title" className="mb-1.5 block text-sm font-medium text-stone-900 dark:text-stone-100">
                        Title
                    </label>
                    <input
                        id="announcement-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Scheduled maintenance this weekend"
                        className="w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                    />
                </div>

                <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <h3 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">Alert type</h3>
                    <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
                        Choose whether — and how — this shows up as an alert.
                    </p>
                    <AlertTypePicker value={alertType} onChange={setAlertType} />
                </div>

                <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 p-3 dark:border-stone-800">
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                                {active ? 'Active' : 'Hidden'}
                            </p>
                            <p className="text-xs text-stone-500 dark:text-stone-400">
                                {active ? 'Visible to users once saved.' : "Saved as a draft — won't be shown yet."}
                            </p>
                        </div>
                        <Toggle checked={active} onChange={setActive} color="brand" label={active ? 'Hide announcement' : 'Activate announcement'} />
                    </div>
                </div>

                <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Cover image</h3>

                    {coverImageUrl ? (
                        <div className="relative overflow-hidden rounded-lg border border-stone-200 dark:border-stone-800">
                            <img src={coverImageUrl} alt="Cover" className="h-56 w-full object-cover" />
                            <button
                                type="button"
                                onClick={handleRemoveCover}
                                title="Remove cover image"
                                aria-label="Remove cover image"
                                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-stone-900/70 text-white transition-colors hover:bg-red-600"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <label
                            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-10 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:border-stone-700 dark:bg-stone-800/50 dark:hover:border-brand-500 dark:hover:bg-brand-500/5 ${
                                uploadingCover ? 'pointer-events-none opacity-60' : ''
                            }`}
                        >
                            <ImagePlus className="h-7 w-7 text-stone-400 dark:text-stone-500" />
                            <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                                {uploadingCover ? 'Uploading...' : 'Click to upload a cover image'}
                            </span>
                            <span className="text-xs text-stone-500 dark:text-stone-400">PNG or JPG, recommended 1200×600</span>
                            <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" disabled={uploadingCover} />
                        </label>
                    )}
                </div>

                <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Content</h3>
                    <RichTextEditor value={content} onChange={setContent} />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/announcements')}
                        className="w-full rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700 sm:w-auto"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3 pl-5 pr-6 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/25 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60 dark:bg-brand-500 dark:shadow-brand-500/20 dark:hover:bg-brand-600 sm:w-auto"
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save Announcement'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AdminAnnouncementForm;