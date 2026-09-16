import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    ArrowRight, Layers, Boxes, TrendingUp, Crown, ImageOff, PieChart, BarChart3,
    Search, X, LineChart as LineChartIcon, CalendarDays, Sparkles, Package,
} from 'lucide-react';
// ⚠️ adjust path to match where the products slice actually lives relative to this file
import { fetchCatalogGroups } from '../../store/slices/productSlice';
import service from '../../backend/service';
import { DonutChart, ComparisonHistogram, SegmentedControl, Toggle, Select, HeatmapCalendar, TrendAreaChart } from '../../ui';

const CHART_COLORS = ['#0ea5e9', '#f97316', '#8b5cf6', '#10b981', '#ef4444', '#eab308', '#6366f1', '#14b8a6'];
const TOP_N = 5;

const VIEW_OPTIONS = [
    { value: 'overview', label: <span className="flex items-center gap-1.5"><PieChart size={13} /> Overview</span> },
    { value: 'trend', label: <span className="flex items-center gap-1.5"><BarChart3 size={13} /> Ranked</span> },
    { value: 'growth', label: <span className="flex items-center gap-1.5"><LineChartIcon size={13} /> Growth</span> },
    { value: 'activity', label: <span className="flex items-center gap-1.5"><CalendarDays size={13} /> Activity</span> },
];

const GRANULARITY_OPTIONS = [
    { value: 'day', label: 'Daily' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' },
];

function colorFor(i) {
    return CHART_COLORS[i % CHART_COLORS.length];
}

// Zero-padded, lexicographically-sortable bucket keys — a plain
// `${year}-${month}` string sorts "2025-10" before "2025-2", which
// scrambles anything spanning October onward. Day/week keys are already
// ISO (YYYY-MM-DD) and sort correctly as-is.
function bucketKey(dateLike, granularity) {
    const d = new Date(dateLike);
    if (granularity === 'day') return d.toISOString().slice(0, 10);
    if (granularity === 'week') {
        const day = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString().slice(0, 10);
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function bucketLabel(key, granularity) {
    if (granularity === 'month') {
        const [y, m] = key.split('-').map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    }
    return new Date(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
const GROWTH_CAP = { day: 30, week: 16, month: 12 };

// Cumulative products-added-over-time, one line per name in `names`. Growth
// BEFORE the visible window is folded into the running total so a line's
// starting height is still correct even when older history gets capped off
// — without this, capping to the last N buckets would make every line
// restart from zero and misrepresent categories/groups with older history.
function buildGrowthSeries({ products, field, names, granularity, colorForIndex }) {
    const byNameBucket = new Map();
    const allKeys = new Set();
    products.forEach((p) => {
        if (!p[field] || !names.includes(p[field]) || !p['$createdAt']) return;
        const key = bucketKey(p['$createdAt'], granularity);
        allKeys.add(key);
        if (!byNameBucket.has(p[field])) byNameBucket.set(p[field], new Map());
        const m = byNameBucket.get(p[field]);
        m.set(key, (m.get(key) || 0) + 1);
    });

    const sortedKeys = Array.from(allKeys).sort();
    const cap = GROWTH_CAP[granularity] || 12;
    const visibleKeys = sortedKeys.slice(-cap);
    const priorKeys = sortedKeys.slice(0, sortedKeys.length - visibleKeys.length);
    const xLabels = visibleKeys.map((k) => bucketLabel(k, granularity));

    const series = names.map((name, i) => {
        const bucketMap = byNameBucket.get(name) || new Map();
        let running = 0;
        priorKeys.forEach((k) => { running += bucketMap.get(k) || 0; });
        const values = visibleKeys.map((k) => {
            running += bucketMap.get(k) || 0;
            return running;
        });
        return { key: name, name, color: colorForIndex(i), values };
    });

    return { xLabels, series };
}

// Small stat tile used in the summary row above the chart/list — same
// hover-lift and optional count-up treatment as CategoriesView's.
function StatTile({ icon: Icon, label, value, chip, animate = false }) {
    return (
        <div className="group flex items-center gap-3 rounded-lg border border-stone-200 bg-cream p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105 ${chip || 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'}`}>
                <Icon size={16} />
            </span>
            <div className="min-w-0">
                <p className="truncate text-lg font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                    {animate && typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
            </div>
        </div>
    );
}

// Counts up from 0 to `value` once whenever `value` changes — same pattern
// used in CategoriesView, for the activity summary line and stat tiles.
function AnimatedNumber({ value, duration = 700 }) {
    const [display, setDisplay] = useState(0);
    const startRef = useRef(null);

    useEffect(() => {
        startRef.current = null;
        let raf;
        function tick(ts) {
            if (startRef.current === null) startRef.current = ts;
            const progress = Math.min(1, (ts - startRef.current) / duration);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            setDisplay(Math.round(eased * value));
            if (progress < 1) raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value, duration]);

    return <span className="tabular-nums">{display}</span>;
}

// Read-only analysis of distinct groups: counts, share of catalog, growth
// over time, and when products were added — optionally scoped to a single
// category (pass `category`). Rollup data (counts/samples) comes from the
// products slice (fetchCatalogGroups); per-product timestamps for the
// Growth/Activity tabs come from a direct service.getProducts() call,
// scoped server-side to the same category when one is set.
// onSelect (optional) lets the parent jump to a filtered product list.
function GroupsView({ category, onSelect }) {
    const dispatch = useDispatch();
    const { items, status, error } = useSelector((s) => s.products.catalogGroups);

    useEffect(() => {
        dispatch(fetchCatalogGroups({ category: category || undefined }));
    }, [category, dispatch]);

    // Per-product rows for Growth/Activity — re-fetched whenever the
    // scoping category changes, filtered server-side via the existing
    // category param on service.getProducts().
    const [scopedProducts, setScopedProducts] = useState([]);
    const [productsStatus, setProductsStatus] = useState('idle');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setProductsStatus('loading');
            const rows = await service.getProducts({ category: category || undefined });
            if (cancelled) return;
            setScopedProducts(Array.isArray(rows) ? rows : []);
            setProductsStatus('succeeded');
        })();
        return () => { cancelled = true; };
    }, [category]);

    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (status === 'succeeded') {
            const raf = requestAnimationFrame(() => setVisible(true));
            return () => cancelAnimationFrame(raf);
        }
        setVisible(false);
    }, [status]);

    const [viewMode, setViewMode] = useState('overview');
    const [topOnly, setTopOnly] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [growthGranularity, setGrowthGranularity] = useState('day'); // day catches sparse/test data best
    const [activityGroup, setActivityGroup] = useState(''); // '' = all groups in scope

    const ranked = useMemo(() => [...items].sort((a, b) => b.count - a.count), [items]);

    const searchedRanked = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return ranked;
        return ranked.filter((item) => item.name.toLowerCase().includes(q));
    }, [ranked, searchTerm]);

    const visibleRanked = topOnly ? searchedRanked.slice(0, TOP_N) : searchedRanked;

    const rankedItems = visibleRanked.map((item) => ({
        label: item.name,
        bars: [{ name: 'Products', value: item.count, color: colorFor(ranked.indexOf(item)) }],
    }));

    // ---- Growth: cumulative products over time, per group ----
    const growth = useMemo(() => {
        const groupNames = visibleRanked.map((g) => g.name);
        return buildGrowthSeries({
            products: scopedProducts,
            field: 'group',
            names: groupNames,
            granularity: growthGranularity,
            colorForIndex: (i) => colorFor(ranked.indexOf(visibleRanked[i])),
        });
    }, [scopedProducts, visibleRanked, ranked, growthGranularity]);

    // ---- Activity heatmap: when did this group (or scope) gain products? ----
    const activityEntries = useMemo(() => {
        const scoped = activityGroup
            ? scopedProducts.filter((p) => p.group === activityGroup)
            : scopedProducts;
        return scoped.filter((p) => p['$createdAt']).map((p) => ({ date: p['$createdAt'], count: 1, item: p }));
    }, [scopedProducts, activityGroup]);

    const activityTotal = activityEntries.length;
    const [activityBucket, setActivityBucket] = useState(null);
    function handleActivityBoxClick(bucket) {
        setActivityBucket(bucket.count > 0 ? bucket : null);
    }

    if (status === 'loading' || status === 'idle') {
        return <p className="text-sm text-stone-500 dark:text-stone-400">Loading groups...</p>;
    }
    if (status === 'failed') {
        return <p className="text-sm text-red-600 dark:text-red-400">{error || 'Failed to load groups.'}</p>;
    }
    if (items.length === 0) {
        return <p className="text-sm text-stone-500 dark:text-stone-400">No groups yet.</p>;
    }

    const totalProducts = items.reduce((sum, item) => sum + item.count, 0);
    const topGroup = ranked[0];
    const avgPerGroup = (totalProducts / items.length).toFixed(1);

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

            <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-brand-600 dark:text-brand-500">
                    <Layers size={14} className="mr-1.5 inline -mt-0.5" />
                    Catalog
                </span>
            </div>
            <h2 className="mb-1 flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight">
                <span
                    className="bg-gradient-to-r from-brand-600 via-emerald-500 to-brand-600 bg-[length:200%_auto] bg-clip-text text-transparent dark:from-brand-400 dark:via-emerald-400 dark:to-brand-400"
                    style={{ animation: 'admin-gradient-shimmer 6s ease infinite' }}
                >
                    Groups{category ? ` in ${category}` : ''}
                </span>
                <Sparkles size={16} className="text-amber-500 dark:text-amber-400" aria-hidden="true" />
            </h2>
            <p className="mb-5 text-sm text-stone-500 dark:text-stone-400">
                {items.length} group{items.length === 1 ? '' : 's'}{category ? ` in ${category}` : ' across your catalog'}.
            </p>

            {/* ---- Summary stats (always reflect the full scope, not the search below) ---- */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile icon={Layers} label="Groups" value={items.length} animate />
                <StatTile icon={Boxes} label="Total Products" value={totalProducts} animate
                    chip="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" />
                <StatTile icon={TrendingUp} label="Avg per Group" value={avgPerGroup}
                    chip="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" />
                <StatTile icon={Crown} label="Top Group" value={topGroup.name}
                    chip="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />
            </div>

            {/* ---- Search + controls ---- */}
            <div className="mb-4 flex flex-col gap-3">
                <div className="relative">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search groups..."
                        className="w-full rounded-md border border-stone-200 bg-cream py-2 pl-9 pr-8 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
                            aria-label="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <SegmentedControl name="Group view" options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />
                    {viewMode !== 'activity' && (
                        <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
                            <span>Top {TOP_N} only</span>
                            <Toggle checked={topOnly} onChange={setTopOnly} label="Show only the top groups" size="sm" />
                        </label>
                    )}
                </div>

                {searchTerm && (
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                        {searchedRanked.length} group{searchedRanked.length === 1 ? ' matches' : 's match'} "{searchTerm}"
                    </p>
                )}
            </div>

            {viewMode === 'overview' && (
                searchedRanked.length === 0 ? (
                    <p className="rounded-lg border border-stone-200 bg-cream p-6 text-center text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
                        No groups match "{searchTerm}".
                    </p>
                ) : (
                <div className="space-y-5">
                    {/* Row 1 — donut, full width */}
                    <div className="flex items-center justify-center rounded-lg border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                        <DonutChart
                            segments={searchedRanked.map((item) => ({
                                label: item.name,
                                value: item.count,
                                color: colorFor(ranked.indexOf(item)),
                            }))}
                            centerLabel="Products"
                        />
                    </div>

                    {/* Row 2 — every matching group, its own full-width row */}
                    <ul className="space-y-2.5">
                        {searchedRanked.map((item) => {
                            const i = ranked.indexOf(item);
                            const pct = totalProducts ? (item.count / totalProducts) * 100 : 0;
                            const color = colorFor(i);
                            const previewUrl = item.sampleFileID
                                ? service.getImagePreview({ fileId: item.sampleFileID })
                                : null;

                            return (
                                <li
                                    key={item.name}
                                    className="group rounded-lg border border-stone-200 bg-cream px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="w-4 shrink-0 text-center text-xs font-medium text-stone-400 dark:text-stone-500">
                                                {i + 1}
                                            </span>

                                            {previewUrl ? (
                                                <img
                                                    src={previewUrl}
                                                    alt={item.name}
                                                    className="h-9 w-9 shrink-0 rounded-full border border-stone-200 object-cover dark:border-stone-700"
                                                />
                                            ) : (
                                                <span
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                                                    style={{ backgroundColor: `${color}1a` }}
                                                >
                                                    {item.count > 0 ? (
                                                        <Layers size={15} style={{ color }} />
                                                    ) : (
                                                        <ImageOff size={15} style={{ color }} />
                                                    )}
                                                </span>
                                            )}

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="truncate font-medium text-stone-900 dark:text-stone-100">
                                                        {item.name}
                                                    </p>
                                                    {i === 0 && <Crown size={12} className="shrink-0 text-amber-500" />}
                                                </div>
                                                <p className="text-xs text-stone-500 dark:text-stone-400">
                                                    {item.count} product{item.count === 1 ? '' : 's'} · {pct.toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>

                                        {onSelect && (
                                            <button
                                                onClick={() => onSelect(item.name)}
                                                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-brand-50 dark:text-brand-500 dark:hover:bg-brand-500/10"
                                            >
                                                View <ArrowRight size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                                        <div
                                            className="h-full rounded-full transition-all duration-700 ease-out"
                                            style={{ width: visible ? `${pct}%` : '0%', backgroundColor: color }}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
                )
            )}

            {viewMode === 'trend' && (
                <div className="rounded-lg border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
                        Products per group, {topOnly ? `top ${TOP_N}` : 'full catalog'}, ranked highest to lowest — the
                        tallest bar is your leading group.
                    </p>
                    {rankedItems.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No groups match "{searchTerm}".</p>
                    ) : (
                        <ComparisonHistogram items={rankedItems} onBarClick={onSelect ? (it) => onSelect(it.label) : undefined} />
                    )}
                </div>
            )}

            {viewMode === 'growth' && (
                <div className="rounded-lg border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-stone-500 dark:text-stone-400">
                            Cumulative products added per group — each line only climbs, so the slope shows which
                            groups are actively growing. Switch granularity if the data reads too flat or too cluttered.
                        </p>
                        <SegmentedControl name="Growth granularity" value={growthGranularity} onChange={setGrowthGranularity} options={GRANULARITY_OPTIONS} />
                    </div>
                    {productsStatus === 'loading' ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">Loading growth data...</p>
                    ) : growth.xLabels.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">Not enough history yet to chart growth.</p>
                    ) : (
                        <TrendAreaChart xLabels={growth.xLabels} series={growth.series} valueFormatter={(v) => String(Math.round(v))} />
                    )}
                </div>
            )}

            {viewMode === 'activity' && (
                <div className="space-y-4">
                    <div className="rounded-lg border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-2">
                                <Sparkles size={15} className="mt-0.5 shrink-0 text-stone-400 dark:text-stone-500" />
                                <div>
                                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">New products over time</h3>
                                    <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                                        Click a square to see exactly which products were added that day.
                                    </p>
                                </div>
                            </div>
                            <div className="w-full sm:w-52">
                                <Select
                                    value={activityGroup}
                                    onChange={(v) => { setActivityGroup(v); setActivityBucket(null); }}
                                    options={ranked.map((r) => r.name)}
                                    placeholder="All groups"
                                />
                            </div>
                        </div>

                        {productsStatus === 'loading' ? (
                            <p className="text-sm text-stone-500 dark:text-stone-400">Loading activity...</p>
                        ) : activityEntries.length === 0 ? (
                            <p className="text-sm text-stone-500 dark:text-stone-400">No products found for this filter.</p>
                        ) : (
                            <>
                                <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
                                    <AnimatedNumber value={activityTotal} /> product{activityTotal === 1 ? '' : 's'} added
                                    in the last 180 days{activityGroup ? ` in ${activityGroup}` : ''}
                                </p>
                                <HeatmapCalendar entries={activityEntries} days={180} onBoxClick={handleActivityBoxClick} unitLabel="product" />
                            </>
                        )}
                    </div>

                    {activityBucket && (
                        <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-4 shadow-sm dark:border-brand-500/30 dark:bg-brand-500/5">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-900 dark:text-stone-100">
                                    <Package size={14} className="text-brand-600 dark:text-brand-400" />
                                    {activityBucket.items.length} product{activityBucket.items.length === 1 ? '' : 's'} added
                                    {activityBucket.start.toDateString() === activityBucket.end.toDateString()
                                        ? ` on ${activityBucket.start.toLocaleDateString()}`
                                        : ` between ${activityBucket.start.toLocaleDateString()} – ${activityBucket.end.toLocaleDateString()}`}
                                </p>
                                <button
                                    onClick={() => setActivityBucket(null)}
                                    className="text-xs font-medium text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
                                >
                                    Clear
                                </button>
                            </div>
                            <ul className="space-y-1.5">
                                {activityBucket.items.map((p) => {
                                    const previewUrl = p.fileId ? service.getImagePreview({ fileId: p.fileId }) : null;
                                    return (
                                        <li key={p['$id']} className="flex items-center gap-3 rounded-md bg-white px-3 py-2 text-sm shadow-sm dark:bg-stone-900">
                                            {previewUrl ? (
                                                <img src={previewUrl} alt={p.name} className="h-8 w-8 shrink-0 rounded-md border border-stone-200 object-cover dark:border-stone-700" />
                                            ) : (
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500">
                                                    <Package size={14} />
                                                </span>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium text-stone-900 dark:text-stone-100">{p.name}</p>
                                                <p className="text-xs text-stone-500 dark:text-stone-400">{p.category} · {p.group}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default GroupsView;