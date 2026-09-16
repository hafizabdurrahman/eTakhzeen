import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import {
    Search,
    Plus,
    Megaphone,
    Eye,
    EyeOff,
    ThumbsUp,
    ThumbsDown,
    Sparkles,
} from 'lucide-react';
import { fetchAllAnnouncementsAdmin } from '../../store/slices/announcementSlice'; // ⚠️ adjust path
import { Toggle, SegmentedControl, Select, DonutChart, GroupedBarChart, StatusTrendChart } from '../../ui'; // ⚠️ adjust path

const STATUS_TABS = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'hidden', label: 'Hidden' },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'mostLiked', label: 'Most liked' },
    { value: 'mostDisliked', label: 'Most disliked' },
];

// Same status-color convention used by the order-status charts elsewhere —
// keeps "active" reading as positive (emerald) and "hidden" as neutral (stone)
// everywhere this pair shows up (donut, trend chart, table pill).
const STATUS_COLORS = { active: '#10b981', hidden: '#78716c' };

function monthKey(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short' });
}

// Staggered entrance wrapper — matches the fade/rise used across the other
// admin pages (Dashboard, Orders, Users) so sections cascade in on mount.
function Reveal({ children, delay = 0, className = '' }) {
    const [shown, setShown] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setShown(true), delay);
        return () => clearTimeout(t);
    }, [delay]);
    return (
        <div className={`transition-all duration-700 ease-out ${shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} ${className}`}>
            {children}
        </div>
    );
}

// Counts up from 0 to `value` with an ease-out curve — same behavior used
// for every stat figure elsewhere in the admin panel.
function AnimatedNumber({ value, duration = 800, formatter }) {
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
    return <>{formatter ? formatter(display) : display}</>;
}

// Small stat tile — same icon-chip + number pattern used across the admin
// dashboards, now with a hover lift and an animated count-up to match.
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

function AdminAnnouncements() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { items, status, error } = useSelector((s) => s.announcements.admin.list);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sort, setSort] = useState('newest');

    // Optimistic per-row active/hidden overrides so the toggle feels instant.
    // TODO: wire this up to a real `setAnnouncementActive`-style thunk once
    // that action exists on the slice — for now it's local-only, same as the
    // "wired up later" placeholders used elsewhere in the admin area.
    const [localOverrides, setLocalOverrides] = useState({});

    useEffect(() => {
        dispatch(fetchAllAnnouncementsAdmin());
    }, [dispatch]);

    const displayItems = useMemo(
        () =>
            items.map((a) => ({
                ...a,
                active: localOverrides[a['$id']] ?? a.active,
            })),
        [items, localOverrides]
    );

    const stats = useMemo(() => {
        const total = displayItems.length;
        const active = displayItems.filter((a) => a.active).length;
        const likes = displayItems.reduce((sum, a) => sum + (a.likesCount ?? 0), 0);
        const dislikes = displayItems.reduce((sum, a) => sum + (a.dislikesCount ?? 0), 0);
        return { total, active, hidden: total - active, likes, dislikes };
    }, [displayItems]);

    // Composition of active vs hidden announcements.
    const donutSegments = useMemo(
        () => [
            { label: 'Active', value: stats.active, color: STATUS_COLORS.active },
            { label: 'Hidden', value: stats.hidden, color: STATUS_COLORS.hidden },
        ],
        [stats]
    );

    // Active/hidden counts bucketed by the month an announcement was created,
    // for the last 6 calendar months that actually have data.
    const trendPeriods = useMemo(() => {
        const buckets = new Map();
        displayItems.forEach((a) => {
            const key = monthKey(a['$createdAt']);
            const bucket = buckets.get(key) || { active: 0, hidden: 0 };
            bucket[a.active ? 'active' : 'hidden'] += 1;
            buckets.set(key, bucket);
        });
        return [...buckets.keys()]
            .sort()
            .slice(-6)
            .map((key) => {
                const counts = buckets.get(key);
                return { label: monthLabel(key), total: counts.active + counts.hidden, counts };
            });
    }, [displayItems]);

    // Top 5 announcements by total engagement (likes + dislikes), for a quick
    // "what's landing" comparison.
    const topEngagement = useMemo(
        () =>
            [...displayItems]
                .sort((a, b) => (b.likesCount ?? 0) + (b.dislikesCount ?? 0) - ((a.likesCount ?? 0) + (a.dislikesCount ?? 0)))
                .slice(0, 5)
                .map((a) => ({
                    label: a.title?.length > 22 ? `${a.title.slice(0, 22)}…` : a.title,
                    bars: [
                        { name: 'Likes', value: a.likesCount ?? 0, color: '#10b981' },
                        { name: 'Dislikes', value: a.dislikesCount ?? 0, color: '#ef4444' },
                    ],
                })),
        [displayItems]
    );

    const visibleItems = useMemo(() => {
        let list = displayItems;

        if (statusFilter !== 'all') {
            list = list.filter((a) => (statusFilter === 'active' ? a.active : !a.active));
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter((a) => a.title?.toLowerCase().includes(q));
        }

        const sorted = [...list];
        switch (sort) {
            case 'oldest':
                sorted.sort((a, b) => new Date(a['$createdAt']) - new Date(b['$createdAt']));
                break;
            case 'mostLiked':
                sorted.sort((a, b) => (b.likesCount ?? 0) - (a.likesCount ?? 0));
                break;
            case 'mostDisliked':
                sorted.sort((a, b) => (b.dislikesCount ?? 0) - (a.dislikesCount ?? 0));
                break;
            case 'newest':
            default:
                sorted.sort((a, b) => new Date(b['$createdAt']) - new Date(a['$createdAt']));
        }
        return sorted;
    }, [displayItems, statusFilter, search, sort]);

    function handleToggleActive(a) {
        setLocalOverrides((prev) => ({ ...prev, [a['$id']]: !a.active }));
        // TODO: dispatch(setAnnouncementActive({ id: a['$id'], active: !a.active }))
    }

    return (
        <div>
            {/* Scoped keyframes — same gradient shimmer used across the other
                admin pages, kept local to this file. */}
            <style>{`
                @keyframes admin-gradient-shimmer {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>

            <Reveal delay={0}>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-500">
                            <Megaphone size={14} />
                            Announcements
                        </span>
                        <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                            <span
                                className="bg-gradient-to-r from-brand-600 via-emerald-500 to-brand-600 bg-[length:200%_auto] bg-clip-text text-transparent dark:from-brand-400 dark:via-emerald-400 dark:to-brand-400"
                                style={{ animation: 'admin-gradient-shimmer 6s ease infinite' }}
                            >
                                Announcements
                            </span>
                            <Sparkles size={18} className="text-amber-500 dark:text-amber-400" aria-hidden="true" />
                        </h1>
                        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                            Publish updates and keep an eye on how they land with your users.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/announcements/new')}
                        className="group inline-flex w-full items-center gap-2 rounded-full bg-brand-600 py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/25 active:translate-y-0 dark:bg-brand-500 dark:shadow-brand-500/20 dark:hover:bg-brand-600 sm:w-auto"
                    >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:rotate-90">
                            <Plus size={16} strokeWidth={2.75} />
                        </span>
                        New Announcement
                    </button>
                </div>
            </Reveal>

            {status === 'loading' && <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>}
            {status === 'failed' && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            {status === 'succeeded' && items.length === 0 && (
                <Reveal delay={60}>
                    <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-8 text-center dark:border-stone-700 dark:bg-stone-900">
                        <Megaphone className="mx-auto mb-2 h-6 w-6 text-stone-400 dark:text-stone-500" />
                        <p className="text-sm text-stone-500 dark:text-stone-400">No announcements yet.</p>
                    </div>
                </Reveal>
            )}

            {status === 'succeeded' && items.length > 0 && (
                <>
                    {/* Overview — stat tiles + the two shared chart components */}
                    <Reveal delay={60}>
                        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            <StatTile icon={Megaphone} label="Total" value={stats.total} color="#0ea5e9" />
                            <StatTile icon={Eye} label="Active" value={stats.active} color={STATUS_COLORS.active} />
                            <StatTile icon={EyeOff} label="Hidden" value={stats.hidden} color={STATUS_COLORS.hidden} />
                            <StatTile icon={ThumbsUp} label="Total likes" value={stats.likes} color="#10b981" />
                            <StatTile icon={ThumbsDown} label="Total dislikes" value={stats.dislikes} color="#ef4444" />
                        </div>
                    </Reveal>

                    <Reveal delay={100}>
                        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                                <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Active vs hidden</h3>
                                <div className="flex justify-center">
                                    <DonutChart segments={donutSegments} size={140} thickness={16} centerLabel={String(stats.total)} />
                                </div>
                            </div>

                            <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                                <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Announcements over time</h3>
                                {trendPeriods.length > 0 ? (
                                    <StatusTrendChart periods={trendPeriods} statusColors={STATUS_COLORS} valueLabel="announcements" height={200} />
                                ) : (
                                    <p className="text-sm text-stone-500 dark:text-stone-400">Not enough data yet.</p>
                                )}
                            </div>
                        </div>
                    </Reveal>

                    {topEngagement.length > 0 && (
                        <Reveal delay={140}>
                            <div className="mb-6 rounded-xl border border-stone-200 bg-cream p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
                                    <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-500" />
                                    Top engagement
                                </h3>
                                <GroupedBarChart
                                    items={topEngagement}
                                    legend={[
                                        { name: 'Likes', color: '#10b981' },
                                        { name: 'Dislikes', color: '#ef4444' },
                                    ]}
                                />
                            </div>
                        </Reveal>
                    )}

                    {/* Controls — search, status tabs, sort */}
                    <Reveal delay={180}>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative w-full sm:max-w-xs">
                                <Search
                                    size={16}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500"
                                />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search announcements..."
                                    className="w-full rounded-md border border-stone-200 bg-cream py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                                />
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <SegmentedControl
                                    options={STATUS_TABS}
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    name="announcement-status-filter"
                                    size="sm"
                                />
                                <Select
                                    options={SORT_OPTIONS}
                                    value={sort}
                                    onChange={setSort}
                                    placeholder="Sort by"
                                    className="w-full sm:w-44"
                                />
                            </div>
                        </div>
                    </Reveal>

                    <Reveal delay={220}>
                        {visibleItems.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-8 text-center dark:border-stone-700 dark:bg-stone-900">
                                <Search className="mx-auto mb-2 h-6 w-6 text-stone-400 dark:text-stone-500" />
                                <p className="text-sm text-stone-500 dark:text-stone-400">No announcements match your filters.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-stone-200 bg-cream shadow-sm dark:border-stone-800 dark:bg-stone-900">
                                <table className="w-full min-w-[44rem] text-left text-sm">
                                    <thead className="border-b border-stone-200 bg-stone-50 text-stone-500 dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-400">
                                        <tr>
                                            <th className="py-2 pl-4 pr-4">Title</th>
                                            <th className="py-2 pr-4">Status</th>
                                            <th className="py-2 pr-4">Likes</th>
                                            <th className="py-2 pr-4">Dislikes</th>
                                            <th className="py-2 pr-4">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleItems.map((a) => (
                                            <tr
                                                key={a['$id']}
                                                onClick={() => navigate(`/admin/announcements/${a['$id']}`)}
                                                className="cursor-pointer border-b border-stone-100 transition-colors hover:bg-stone-50 dark:border-stone-800/60 dark:hover:bg-stone-800/60"
                                            >
                                                <td className="py-2 pl-4 pr-4 font-medium text-stone-900 dark:text-stone-100">{a.title}</td>
                                                <td className="py-2 pr-4">
                                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                        <Toggle
                                                            checked={a.active}
                                                            onChange={() => handleToggleActive(a)}
                                                            color="brand"
                                                            size="sm"
                                                            label={a.active ? 'Hide announcement' : 'Activate announcement'}
                                                        />
                                                        <span
                                                            className={
                                                                a.active
                                                                    ? 'text-xs font-medium text-emerald-700 dark:text-emerald-400'
                                                                    : 'text-xs font-medium text-stone-500 dark:text-stone-400'
                                                            }
                                                        >
                                                            {a.active ? 'Active' : 'Hidden'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{a.likesCount ?? 0}</td>
                                                <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{a.dislikesCount ?? 0}</td>
                                                <td className="py-2 pr-4 text-stone-500 dark:text-stone-400">
                                                    {new Date(a['$createdAt']).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Reveal>
                </>
            )}
        </div>
    );
}

export default AdminAnnouncements;