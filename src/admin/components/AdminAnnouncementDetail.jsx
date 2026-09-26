import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import {
    ArrowLeft,
    ImagePlus,
    X,
    BellOff,
    Bell,
    Sparkles,
    Check,
    Save,
    FileText,
    PieChart,
    ThumbsUp,
    ThumbsDown,
    CalendarDays,
    TrendingUp,
    Info,
} from 'lucide-react';
import { Toggle, SegmentedControl, DonutChart, GroupedBarChart } from '../../ui'; // ⚠️ adjust path
import announcementService from '../../backend/announcement'; // ⚠️ adjust path
import {
    fetchAnnouncementAdmin,
    createAnnouncementAdmin,
    updateAnnouncementAdmin,
} from '../../store/slices/announcementSlice'; // ⚠️ adjust path
import RichTextEditor from './RichTextEditor';

// Which alert surface this announcement shows up on, if any. "none" is the
// default — most announcements just live in the regular list and don't
// interrupt anyone.
//
// `classes` replaces the old inline hex `color` — each entry is a full set of
// Tailwind utility classes (light + dark) for: the icon tile when inactive,
// the icon tile when active, and the active card's border/background.
const ALERT_TYPES = [
    {
        value: 'none',
        label: 'None',
        description: "Won't appear in any alert banner — just the regular announcements list.",
        icon: BellOff,
        classes: {
            iconIdle: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
            iconActive: 'bg-stone-600 text-white dark:bg-stone-500',
            cardActive: 'border-stone-600 bg-stone-50 dark:border-stone-500 dark:bg-stone-500/10',
            badgeActive: 'bg-stone-600 dark:bg-stone-500',
        },
    },
    {
        value: 'list',
        label: 'List alert',
        description: 'Shown in the alerts list users can browse.',
        icon: Bell,
        classes: {
            iconIdle: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
            iconActive: 'bg-blue-600 text-white dark:bg-blue-500',
            cardActive: 'border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/10',
            badgeActive: 'bg-blue-600 dark:bg-blue-500',
        },
    },
    {
        value: 'special',
        label: 'Special alert',
        description: 'Highlighted as a special, high-priority alert.',
        icon: Sparkles,
        classes: {
            iconIdle: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
            iconActive: 'bg-purple-600 text-white dark:bg-purple-500',
            cardActive: 'border-purple-600 bg-purple-50 dark:border-purple-500 dark:bg-purple-500/10',
            badgeActive: 'bg-purple-600 dark:bg-purple-500',
        },
    },
];

const REACTION_COLORS = { likes: '#10b981', dislikes: '#ef4444' };

// Staggered entrance — same pattern used across the other admin pages.
function Reveal({ children, delay = 0, className = '' }) {
    const [shown, setShown] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setShown(true), delay);
        return () => clearTimeout(t);
    }, [delay]);
    return (
        <div
            className={`transition-all duration-500 ease-out ${
                shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            } ${className}`}
        >
            {children}
        </div>
    );
}

// Counts up from 0 to `value` — same behavior used for every stat figure
// elsewhere in the admin panel (AdminAnnouncements list, dashboards).
function AnimatedNumber({ value, duration = 700 }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const numeric = Number(value) || 0;
        let frame;
        let start;
        function tick(ts) {
            if (start === undefined) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(numeric * eased));
            if (progress < 1) frame = requestAnimationFrame(tick);
        }
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value, duration]);
    return <>{display}</>;
}

function StatTile({ icon: Icon, label, value, color }) {
    return (
        <div className="group flex items-center gap-3 rounded-lg border border-stone-200 bg-cream p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
            <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105"
                style={{ backgroundColor: `${color}1a`, color }}
            >
                <Icon size={18} />
            </span>
            <div className="min-w-0">
                <p className="text-lg font-bold leading-tight tabular-nums text-stone-900 dark:text-stone-100">
                    <AnimatedNumber value={value} />
                </p>
                <p className="truncate text-xs text-stone-500 dark:text-stone-400">{label}</p>
            </div>
        </div>
    );
}

// Card-style option picker — each option needs its own icon + explanation,
// not just a label, so a plain SegmentedControl wouldn't fit here. Colors now
// come from each option's `classes` set instead of an inline hex `color`.
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
                        className={`relative flex items-start gap-3 rounded-lg border p-4 text-left transition-all duration-200 ${
                            active
                                ? `scale-[1.01] shadow-sm ${opt.classes.cardActive}`
                                : 'border-stone-200 hover:-translate-y-0.5 hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700'
                        }`}
                    >
                        <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-300 ${
                                active ? `scale-110 ${opt.classes.iconActive}` : opt.classes.iconIdle
                            }`}
                        >
                            <Icon size={16} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{opt.label}</p>
                            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{opt.description}</p>
                        </div>
                        {active && (
                            <span
                                className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-white ${opt.classes.badgeActive}`}
                            >
                                <Check size={12} strokeWidth={3} />
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

function AdminAnnouncementDetail() {
    const { id } = useParams(); // "new" for creation, otherwise an existing announcement id
    const isNew = !id || id === 'new';
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);

    // 'details' | 'insights' — insights only makes sense once an
    // announcement actually has engagement data, so it's hidden for new ones.
    const [activeTab, setActiveTab] = useState('details');

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [alertType, setAlertType] = useState('none');
    const [active, setActive] = useState(true);
    const [coverImageUrl, setCoverImageUrl] = useState(null);
    const [coverFileId, setCoverFileId] = useState(null);

    // Read-only context pulled in alongside the editable fields above —
    // used only by the Insights tab, never sent back in the save payload.
    const [createdAt, setCreatedAt] = useState(null);
    const [likesCount, setLikesCount] = useState(0);
    const [dislikesCount, setDislikesCount] = useState(0);

    const loadExisting = useCallback(async () => {
        if (isNew) return;
        setLoading(true);
        const result = await dispatch(fetchAnnouncementAdmin({ rowId: id })).unwrap?.();
        if (result) {
            setTitle(result.title || '');
            setContent(result.content || '');
            setAlertType(result.alertType || 'none');
            setActive(result.active ?? true);
            setCoverFileId(result.coverImageId || null);
            setCoverImageUrl(
                result.coverImageId ? announcementService.getImageUrl({ fileId: result.coverImageId }) : null
            );
            setCreatedAt(result['$createdAt'] || null);
            setLikesCount(result.likesCount ?? 0);
            setDislikesCount(result.dislikesCount ?? 0);
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
            : await dispatch(updateAnnouncementAdmin({ rowId: id, data: payload })).unwrap?.();
        setSaving(false);

        if (!result) {
            alert('Failed to save this announcement.');
            return;
        }
        navigate('/admin/announcements');
    }

    // Engagement derived purely for display — never touches the save payload.
    const totalReactions = likesCount + dislikesCount;
    const likeRate = totalReactions > 0 ? Math.round((likesCount / totalReactions) * 100) : null;

    const donutSegments = [
        { label: 'Likes', value: likesCount, color: REACTION_COLORS.likes },
        { label: 'Dislikes', value: dislikesCount, color: REACTION_COLORS.dislikes },
    ];

    const engagementBars = [
        {
            label: title?.length > 24 ? `${title.slice(0, 24)}…` : title || 'This announcement',
            bars: [
                { name: 'Likes', value: likesCount, color: REACTION_COLORS.likes },
                { name: 'Dislikes', value: dislikesCount, color: REACTION_COLORS.dislikes },
            ],
        },
    ];

    if (loading) {
        return <p className="text-sm text-stone-500 dark:text-stone-400">Loading announcement...</p>;
    }

    return (
        <div className="mx-auto max-w-3xl">
            {/* Scoped keyframes — same gradient shimmer used across the other
                admin pages, kept local to this file. */}
            <style>{`
                @keyframes admin-gradient-shimmer {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>

            <Reveal>
                <button
                    onClick={() => navigate('/admin/announcements')}
                    className="mb-4 inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-brand-600 hover:underline dark:text-stone-400 dark:hover:text-brand-500"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Announcements
                </button>
            </Reveal>

            <Reveal delay={40}>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                        <span
                            className="bg-gradient-to-r from-brand-600 via-emerald-500 to-brand-600 bg-[length:200%_auto] bg-clip-text text-transparent dark:from-brand-400 dark:via-emerald-400 dark:to-brand-400"
                            style={{ animation: 'admin-gradient-shimmer 6s ease infinite' }}
                        >
                            {isNew ? 'New Announcement' : 'Edit Announcement'}
                        </span>
                        <Sparkles size={18} className="text-amber-500 dark:text-amber-400" aria-hidden="true" />
                    </h1>

                    {/* Insights only exists once there's something to show —
                        a brand-new draft has zero likes/dislikes by definition. */}
                    {!isNew && (
                        <SegmentedControl
                            options={[
                                { value: 'details', label: 'Details' },
                                { value: 'insights', label: 'Insights' },
                            ]}
                            value={activeTab}
                            onChange={setActiveTab}
                            name="announcement-detail-tab"
                            size="sm"
                        />
                    )}
                </div>
            </Reveal>

            {activeTab === 'insights' && !isNew ? (
                <div className="space-y-6">
                    <Reveal delay={0}>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <StatTile icon={ThumbsUp} label="Likes" value={likesCount} color={REACTION_COLORS.likes} />
                            <StatTile icon={ThumbsDown} label="Dislikes" value={dislikesCount} color={REACTION_COLORS.dislikes} />
                            <StatTile icon={TrendingUp} label="Total reactions" value={totalReactions} color="#0ea5e9" />
                            <StatTile
                                icon={active ? Bell : BellOff}
                                label={active ? 'Active' : 'Hidden'}
                                value={likeRate ?? 0}
                                color={active ? '#10b981' : '#78716c'}
                            />
                        </div>
                    </Reveal>

                    <Reveal delay={60}>
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                                <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
                                    Likes vs dislikes
                                </h3>
                                {totalReactions > 0 ? (
                                    <div className="flex justify-center">
                                        <DonutChart
                                            segments={donutSegments}
                                            size={140}
                                            thickness={16}
                                            centerLabel={likeRate !== null ? `${likeRate}%` : '—'}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-6 text-center">
                                        <PieChart className="mb-2 h-6 w-6 text-stone-400 dark:text-stone-500" />
                                        <p className="text-sm text-stone-500 dark:text-stone-400">
                                            No reactions yet — this will fill in once users respond.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                                <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
                                    Reaction breakdown
                                </h3>
                                <GroupedBarChart
                                    items={engagementBars}
                                    legend={[
                                        { name: 'Likes', color: REACTION_COLORS.likes },
                                        { name: 'Dislikes', color: REACTION_COLORS.dislikes },
                                    ]}
                                />
                            </div>
                        </div>
                    </Reveal>

                    <Reveal delay={100}>
                        <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-cream p-4 text-sm text-stone-600 shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
                            <CalendarDays size={15} className="shrink-0 text-stone-400 dark:text-stone-500" />
                            Published on {createdAt ? new Date(createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                            <span className="mx-1 text-stone-300 dark:text-stone-700">·</span>
                            <Info size={15} className="shrink-0 text-stone-400 dark:text-stone-500" />
                            Currently {active ? 'visible to users' : 'hidden as a draft'}
                        </div>
                    </Reveal>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Reveal delay={0}>
                        <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                            <div className="mb-1 flex items-center gap-2">
                                <FileText size={15} className="text-stone-400 dark:text-stone-500" />
                                <label htmlFor="announcement-title" className="text-sm font-medium text-stone-900 dark:text-stone-100">
                                    Title
                                </label>
                            </div>
                            <input
                                id="announcement-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Scheduled maintenance this weekend"
                                className="mt-2 w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                            />
                        </div>
                    </Reveal>

                    <Reveal delay={60}>
                        <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                            <h3 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">Alert type</h3>
                            <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
                                Choose whether — and how — this shows up as an alert.
                            </p>
                            <AlertTypePicker value={alertType} onChange={setAlertType} />
                        </div>
                    </Reveal>

                    <Reveal delay={100}>
                        <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                            <div className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 p-3 dark:border-stone-800">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                                        {active ? 'Active' : 'Hidden'}
                                    </p>
                                    <p className="text-xs text-stone-500 dark:text-stone-400">
                                        {active ? 'Visible to users once saved.' : "Saved as a draft — won't be shown yet."}
                                    </p>
                                </div>
                                <Toggle
                                    checked={active}
                                    onChange={setActive}
                                    color="brand"
                                    label={active ? 'Hide announcement' : 'Activate announcement'}
                                />
                            </div>
                        </div>
                    </Reveal>

                    <Reveal delay={140}>
                        <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
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
                    </Reveal>

                    <Reveal delay={180}>
                        <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                            <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Content</h3>
                            <RichTextEditor value={content} onChange={setContent} />
                        </div>
                    </Reveal>

                    <Reveal delay={220}>
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
                    </Reveal>
                </form>
            )}
        </div>
    );
}

export default AdminAnnouncementDetail;