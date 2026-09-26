import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Share2, Sparkles, FileText, Radio, Package, Repeat2, LayoutGrid, Bookmark,
} from 'lucide-react';
// Real brand icons — react-icons bundles Font Awesome's icon set as proper
// React components (MIT-licensed package), so no hand-drawn logo SVGs needed.
// `npm install react-icons` if it isn't already in your project.
import { FaFacebookF, FaInstagram, FaYoutube, FaTiktok, FaWhatsapp } from 'react-icons/fa6';

// ⚠️ adjust these three import paths to match your actual folder structure
import HeatmapCalendar from '../../ui/HeatmapCalendar';
import TrendAreaChart from '../../ui/TrendAreaChart';
import PostGenerator, { parsePostDataHtml } from './PostGenerator';
import SavedPostsTab from './SavedPostsTab';
import {
    fetchSocialMediaOverview,
    selectSocialMediaOverviewItems,
    selectSocialMediaOverviewStatus,
    selectSocialMediaHeatmapEntries,
    selectProductPostStats,
    selectPlatformTrend,
} from '../../store/slices/socialMediaSlice';

// Staggered entrance — same pattern used across the other admin pages
// (Products, Dashboard, Orders, Users, Announcements, Finance).
function Reveal({ children, delay = 0, className = '' }) {
    const [shown, setShown] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setShown(true), delay);
        return () => clearTimeout(t);
    }, [delay]);
    return (
        <div
            className={`transition-all duration-700 ease-out ${
                shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            } ${className}`}
        >
            {children}
        </div>
    );
}

// Real platform tabs. Each links to the real generator, scoped per platform.
const PLATFORM_TABS = [
    { key: 'youtube', label: 'YouTube', icon: FaYoutube, color: '#ef4444' },
    { key: 'tiktok', label: 'TikTok', icon: FaTiktok, color: '#111827' },
    { key: 'instagram', label: 'Instagram', icon: FaInstagram, color: '#ec4899' },
    { key: 'whatsappstatus', label: 'WhatsApp Status', icon: FaWhatsapp, color: '#22c55e' },
    { key: 'facebook', label: 'Facebook', icon: FaFacebookF, color: '#3b82f6' },
];

// Overview + one tab per platform + a Saved tab for browsing/reopening
// previously-saved posts.
const TABS = [
    { key: 'overview', label: 'Overview', icon: LayoutGrid },
    ...PLATFORM_TABS,
    { key: 'saved', label: 'Saved', icon: Bookmark },
];

// Fallback color for any platform value in the data that isn't one of the
// five known tabs above (typos, future platforms, etc).
const FALLBACK_COLOR = '#a8a29e';
function colorForPlatform(platform) {
    return PLATFORM_TABS.find((p) => p.key === platform)?.color || FALLBACK_COLOR;
}

// Icon sits in a small gradient tile so the four stat cards read as a set
// while still being visually distinct from one another (accent prop drives
// the gradient + icon color, everything else about the card stays uniform).
const ACCENTS = {
    emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    brand: 'from-brand-500/15 to-brand-500/5 text-brand-600 dark:text-brand-400',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400',
    pink: 'from-pink-500/15 to-pink-500/5 text-pink-600 dark:text-pink-400',
};

function StatCard({ label, value, hint, icon: Icon, accent = 'brand' }) {
    return (
        <div className="group relative overflow-hidden rounded-xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-stone-700 dark:bg-stone-800">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                        {value}
                    </p>
                    {hint && <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">{hint}</p>}
                </div>
                {Icon && (
                    <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br transition-transform duration-300 group-hover:scale-110 ${ACCENTS[accent]}`}
                    >
                        <Icon size={18} />
                    </div>
                )}
            </div>
        </div>
    );
}

function SocialMediaOverview() {
    const dispatch = useDispatch();

    const items = useSelector(selectSocialMediaOverviewItems);
    const status = useSelector(selectSocialMediaOverviewStatus);
    const heatmapEntries = useSelector(selectSocialMediaHeatmapEntries);
    const { productsWithPosts, productsWithMultiplePosts } = useSelector(selectProductPostStats);
    const { xLabels, series: trendSeries } = useSelector(selectPlatformTrend);

    useEffect(() => {
        dispatch(fetchSocialMediaOverview());
    }, [dispatch]);

    // TrendAreaChart wants a `color` per series; the slice only knows post
    // counts, not your platform color palette, so it's assigned here.
    const coloredSeries = useMemo(
        () => trendSeries.map((s) => ({ ...s, color: colorForPlatform(s.key) })),
        [trendSeries]
    );

    const activePlatformCount = useMemo(
        () => new Set(items.map((row) => row.platform).filter(Boolean)).size,
        [items]
    );

    const isLoading = status === 'loading' && items.length === 0;
    const isFailed = status === 'failed';

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 p-10 text-sm text-stone-500 dark:text-stone-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-brand-600 dark:border-stone-600 dark:border-t-brand-400" />
                Loading overview…
            </div>
        );
    }

    if (isFailed) {
        return (
            <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400">
                Couldn't load social media data. Try refreshing the page.
            </p>
        );
    }

    return (
        <div className="space-y-6">
            <Reveal delay={80}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard label="Total Posts" value={items.length} hint="Every row in the table" icon={FileText} accent="brand" />
                    <StatCard label="Active Platforms" value={activePlatformCount} hint="Out of 5 tabs" icon={Radio} accent="emerald" />
                    <StatCard
                        label="Products With Posts"
                        value={productsWithPosts}
                        hint="Distinct product IDs across posts"
                        icon={Package}
                        accent="amber"
                    />
                    <StatCard
                        label="Products With Repeat Posts"
                        value={productsWithMultiplePosts}
                        hint="Posted for more than once"
                        icon={Repeat2}
                        accent="pink"
                    />
                </div>
            </Reveal>

            <Reveal delay={140}>
                <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
                    <HeatmapCalendar entries={heatmapEntries} unitLabel="post" title="When Posts Are Created" />
                </div>
            </Reveal>

            <Reveal delay={200}>
                <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
                    <h3 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-200">
                        Posts Created Per Platform
                    </h3>
                    {coloredSeries.length > 0 ? (
                        <TrendAreaChart series={coloredSeries} xLabels={xLabels} valueFormatter={(n) => n} />
                    ) : (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No posts yet.</p>
                    )}
                </div>
            </Reveal>
        </div>
    );
}

// Each platform tab now runs the real generator, scoped to that platform.
// `initialPost` / `onStartNew` let a saved post (opened from the Saved tab)
// pre-fill the form; `instanceKey` forces a clean remount whenever a
// *different* saved post (or "new") is opened for this platform, since
// PostGenerator only hydrates from `initialPost` on mount.
function PlatformTab({ label, icon: Icon, color, platform, initialPost, onStartNew, instanceKey }) {
    return (
        <Reveal delay={80}>
            <div className="mb-4 flex items-center gap-2">
                {Icon && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1a`, color }}>
                        <Icon size={16} />
                    </div>
                )}
                <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">{label} Post Generator</h2>
            </div>
            <PostGenerator key={instanceKey} platform={platform} initialPost={initialPost} onStartNew={onStartNew} />
        </Reveal>
    );
}

function AdminSocialMedia() {
    const [activeTab, setActiveTab] = useState('overview');

    // The saved post currently opened for editing, if any:
    // { postId, platform, title, description, hashtags, tags, productIds } | null
    const [editingEntry, setEditingEntry] = useState(null);

    const activeMeta = TABS.find((t) => t.key === activeTab);

    // { [platformKey]: { label, icon, color } } lookup for SavedPostsTab.
    const platformMetaMap = useMemo(
        () => Object.fromEntries(PLATFORM_TABS.map((p) => [p.key, p])),
        []
    );

    // Manually switching tabs should always start fresh, so an old opened
    // post doesn't leak into an unrelated platform tab.
    function handleTabClick(key) {
        setActiveTab(key);
        setEditingEntry(null);
    }

    // Clicking a saved post in the Saved tab: parse its stored HTML back
    // into form fields and jump straight to that post's platform tab.
    function handleOpenSavedPost(post) {
        const parsed = parsePostDataHtml(post.postData);
        setEditingEntry({
            postId: post['$id'],
            platform: post.platform,
            productIds: Array.isArray(post.products) ? post.products : [],
            ...parsed,
        });
        setActiveTab(post.platform);
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
                <div className="mb-5">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-500">
                        <Share2 size={14} />
                        Marketing
                    </span>
                    <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                        <span
                            className="bg-gradient-to-r from-brand-600 via-emerald-500 to-brand-600 bg-[length:200%_auto] bg-clip-text text-transparent dark:from-brand-400 dark:via-emerald-400 dark:to-brand-400"
                            style={{ animation: 'admin-gradient-shimmer 6s ease infinite' }}
                        >
                            Social Media
                        </span>
                        <Sparkles size={18} className="text-amber-500 dark:text-amber-400" aria-hidden="true" />
                    </h1>
                </div>
            </Reveal>

            {/* Tabs — horizontally scrollable on narrow screens instead of wrapping/clipping */}
            <Reveal delay={60}>
                <div className="mb-4 -mx-4 overflow-x-auto border-b border-stone-200 px-4 dark:border-stone-800 sm:mx-0 sm:px-0">
                    <div className="flex gap-1 whitespace-nowrap">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = tab.key === activeTab;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => handleTabClick(tab.key)}
                                    className={`flex shrink-0 items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-400'
                                            : 'border-transparent text-stone-500 hover:bg-stone-50 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100'
                                    }`}
                                >
                                    {Icon && <Icon size={15} />}
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </Reveal>

            {activeTab === 'overview' ? (
                <SocialMediaOverview />
            ) : activeTab === 'saved' ? (
                <SavedPostsTab platformMeta={platformMetaMap} onOpenPost={handleOpenSavedPost} />
            ) : (
                <PlatformTab
                    label={activeMeta?.label}
                    icon={activeMeta?.icon}
                    color={colorForPlatform(activeTab)}
                    platform={activeTab}
                    initialPost={editingEntry?.platform === activeTab ? editingEntry : null}
                    onStartNew={() => setEditingEntry(null)}
                    instanceKey={`${activeTab}-${editingEntry?.postId || 'new'}`}
                />
            )}
        </div>
    );
}

export default AdminSocialMedia;