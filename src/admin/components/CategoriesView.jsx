import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import {
    ArrowRight, Tag, Boxes, TrendingUp, Crown, ImageOff, PieChart, BarChart3,
    Layers, SlidersHorizontal, CalendarDays, Sparkles, Package, ExternalLink,
    Shirt, Gem, Home, Palette, Gift, ShoppingBag, Lamp, Flower2, Search, X,
    LineChart as LineChartIcon,
} from 'lucide-react';
// ⚠️ adjust path to match where the products slice actually lives relative to this file
import { fetchCatalogCategories } from '../../store/slices/productSlice';
import service from '../../backend/service';
import {
    DonutChart, ComparisonHistogram, SegmentedControl, Toggle, Checkbox,
    Select, HeatmapCalendar, TrendAreaChart,
} from '../../ui';

const CHART_COLORS = ['#0ea5e9', '#f97316', '#8b5cf6', '#10b981', '#ef4444', '#eab308', '#6366f1', '#14b8a6'];
const GROUPS_METRIC_COLOR = '#a8a29e'; // stone-400 — secondary metric, kept neutral vs. the category's own hue
const TOP_N = 5;

// Cycled purely for visual variety in the ranked list — categories aren't
// semantically tied to any one icon, this just keeps rows from all looking
// identical the way a single repeated Tag icon would.
const CATEGORY_ICONS = [Tag, Shirt, Gem, Home, Palette, Gift, ShoppingBag, Lamp, Flower2];

const VIEW_OPTIONS = [
    { value: 'overview', label: (
        <span className="flex items-center gap-1.5"><PieChart size={13} /> Overview</span>
    ) },
    { value: 'trend', label: (
        <span className="flex items-center gap-1.5"><BarChart3 size={13} /> Ranked</span>
    ) },
    { value: 'growth', label: (
        <span className="flex items-center gap-1.5"><LineChartIcon size={13} /> Growth</span>
    ) },
    { value: 'compare', label: (
        <span className="flex items-center gap-1.5"><SlidersHorizontal size={13} /> Compare</span>
    ) },
    { value: 'activity', label: (
        <span className="flex items-center gap-1.5"><CalendarDays size={13} /> Activity</span>
    ) },
];

function colorFor(i) {
    return CHART_COLORS[i % CHART_COLORS.length];
}
function iconFor(i) {
    return CATEGORY_ICONS[i % CATEGORY_ICONS.length];
}
function monthKeyAndLabel(dateLike) {
    const d = new Date(dateLike);
    return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
    };
}

// Zero-padded, lexicographically-sortable bucket keys — fixes the old
// `${year}-${month}` bug where "2025-10" sorted before "2025-2".
function bucketKey(dateLike, granularity) {
    const d = new Date(dateLike);
    if (granularity === 'day') return d.toISOString().slice(0, 10); // YYYY-MM-DD
    if (granularity === 'week') {
        const day = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString().slice(0, 10);
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
}
function bucketLabel(key, granularity) {
    if (granularity === 'month') {
        const [y, m] = key.split('-').map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    }
    return new Date(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
const GROWTH_CAP = { day: 30, week: 16, month: 12 };

// Cumulative products-added-over-time, one line per name in `names`.
// Cumulative total BEFORE the visible window is folded into the first
// point so the line's starting height is still correct even when older
// history got capped off.
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


// Small stat tile used in the summary row above the chart/list — now with
// the same hover-lift used across the other admin pages, plus an optional
// count-up for numeric values.
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

// Counts up from 0 to `value` once whenever `value` changes — used above
// the heatmap so the summary line feels alive rather than a static number.
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

// Read-only analysis of distinct categories: counts, share of catalog, and a
// sample image per category. Data comes from the products slice
// (fetchCatalogCategories), not a direct service call, so it stays in sync
// with anything else in the admin panel reading from the same slice.
// onSelect (optional) lets the parent jump to a filtered product list —
// when omitted, rows fall back to a real <Link> to the admin products page.
function CategoriesView({ onSelect }) {
    const dispatch = useDispatch();
    const { items, status, error } = useSelector((s) => s.products.catalogCategories);
    const [growthGranularity, setGrowthGranularity] = useState('day'); // day catches sparse/test data

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchCatalogCategories());
        }
    }, [status, dispatch]);

    // Full product list — needed for the Activity heatmap and Growth chart,
    // since per-product $createdAt isn't on the category rollup. Fetched
    // once, independent of the categories slice's own loading state.
    const [allProducts, setAllProducts] = useState([]);
    const [productsStatus, setProductsStatus] = useState('idle');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setProductsStatus('loading');
            const rows = await service.getProducts({});
            if (cancelled) return;
            setAllProducts(Array.isArray(rows) ? rows : []);
            setProductsStatus('succeeded');
        })();
        return () => { cancelled = true; };
    }, []);

    // Bars animate their width in from 0 once, on first successful load —
    // same requestAnimationFrame + boolean-state pattern the chart
    // components already use, so the "hero" motion is the reveal, not a
    // replay on every re-render.
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (status === 'succeeded') {
            const raf = requestAnimationFrame(() => setVisible(true));
            return () => cancelAnimationFrame(raf);
        }
        setVisible(false);
    }, [status]);

    // View + filter controls. `topOnly` drives both the ranked list and
    // whichever chart is active; `selectedNames` scopes the Compare chart
    // to a subset of the current ranked slice. `null` means "everything
    // currently ranked" so newly-promoted items (after toggling Top 5 vs
    // All) are included automatically instead of staying stuck at an old
    // selection. `searchTerm` narrows the ranked list by name before
    // topOnly slicing is applied, everywhere the ranked list feeds a view.
    const [viewMode, setViewMode] = useState('overview');
    const [topOnly, setTopOnly] = useState(true);
    const [selectedNames, setSelectedNames] = useState(null);
    const [activityCategory, setActivityCategory] = useState(''); // '' = all categories
    const [searchTerm, setSearchTerm] = useState('');

    // Stats row always reflects the FULL catalog, unaffected by search.
    const totalProducts = items.reduce((sum, item) => sum + item.count, 0);
    const ranked = useMemo(() => [...items].sort((a, b) => b.count - a.count), [items]);
    const topGroup = ranked[0];
    const avgPerCategory = items.length ? (totalProducts / items.length).toFixed(1) : '0';

    // Search narrows the working set before Top-N slicing, so every other
    // view (Ranked, Growth, Compare) reflects the same filtered set.
    const searchedRanked = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return ranked;
        return ranked.filter((item) => item.name.toLowerCase().includes(q));
    }, [ranked, searchTerm]);

    const visibleRanked = topOnly ? searchedRanked.slice(0, TOP_N) : searchedRanked;
    const activeSelected = selectedNames ?? new Set(visibleRanked.map((i) => i.name));

    function toggleName(name) {
        setSelectedNames((prev) => {
            const base = prev ?? new Set(visibleRanked.map((i) => i.name));
            const next = new Set(base);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    }
    function toggleAll() {
        const allSelected = visibleRanked.every((i) => activeSelected.has(i.name));
        setSelectedNames(allSelected ? new Set() : null);
    }

    const allSelected = visibleRanked.length > 0 && visibleRanked.every((i) => activeSelected.has(i.name));
    const noneSelected = visibleRanked.every((i) => !activeSelected.has(i.name));

    // Each category's own count of distinct groups isn't guaranteed to be
    // on this slice's items yet — wire up `groupsCount` on the
    // fetchCatalogCategories result to unlock the two-metric comparison
    // (groups AND products per category). Until then this degrades
    // gracefully to a single-metric "Products" comparison.
    const hasGroupsMetric = ranked.some((item) => typeof item.groupsCount === 'number');

    // Shared by both the Ranked and Compare charts — every category
    // becomes a { label, bars } entry with a Products bar and, once the
    // data supports it, a Groups bar right alongside it so a category can
    // be read against both metrics at a glance, not just products alone.
    function toBars(item) {
        const color = colorFor(ranked.indexOf(item));
        const bars = [{ name: 'Products', value: item.count, color }];
        if (hasGroupsMetric) bars.push({ name: 'Groups', value: item.groupsCount || 0, color: GROUPS_METRIC_COLOR });
        return { label: item.name, bars };
    }

    const rankedItems = visibleRanked.map(toBars);
    const compareItems = visibleRanked.filter((item) => activeSelected.has(item.name)).map(toBars);

    // ---- Growth: cumulative products over time, per category ----
    // An area/line trend is naturally a running total, so each category's
    // line only climbs — the slope itself shows which categories are
    // actively growing vs. flat, and lines can be toggled/compared exactly
    // like Finance's revenue/cost/profit chart.
    const growth = useMemo(() => {
    const catNames = visibleRanked.map((c) => c.name);
    return buildGrowthSeries({
        products: allProducts,
        field: 'category',
        names: catNames,
        granularity: growthGranularity,
        colorForIndex: (i) => colorFor(ranked.indexOf(visibleRanked[i])),
    });
    }, [allProducts, visibleRanked, ranked, growthGranularity]);

    // ---- Activity heatmap: when did categories gain new products? ----
    // Every product becomes one heatmap entry keyed by its $createdAt,
    // optionally scoped to one category. `item` carries the raw product so
    // clicking a day can list exactly which products landed that day.
    const activityEntries = useMemo(() => {
        const scoped = activityCategory
            ? allProducts.filter((p) => p.category === activityCategory)
            : allProducts;
        return scoped
            .filter((p) => p['$createdAt'])
            .map((p) => ({ date: p['$createdAt'], count: 1, item: p }));
    }, [allProducts, activityCategory]);

    const activityTotal = activityEntries.length;
    const [activityBucket, setActivityBucket] = useState(null); // clicked day's products, if any

    function handleActivityBoxClick(bucket) {
        setActivityBucket(bucket.count > 0 ? bucket : null);
    }

    function linkTarget(name) {
        return `/admin/products?category=${encodeURIComponent(name)}`;
    }

    if (status === 'loading' || status === 'idle') {
        return <p className="text-sm text-stone-500 dark:text-stone-400">Loading categories...</p>;
    }
    if (status === 'failed') {
        return <p className="text-sm text-red-600 dark:text-red-400">{error || 'Failed to load categories.'}</p>;
    }
    if (items.length === 0) {
        return <p className="text-sm text-stone-500 dark:text-stone-400">No categories yet.</p>;
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

            <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-brand-600 dark:text-brand-500">
                    <Tag size={14} className="mr-1.5 inline -mt-0.5" />
                    Catalog
                </span>
            </div>
            <h2 className="mb-1 flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight">
                <span
                    className="bg-gradient-to-r from-brand-600 via-emerald-500 to-brand-600 bg-[length:200%_auto] bg-clip-text text-transparent dark:from-brand-400 dark:via-emerald-400 dark:to-brand-400"
                    style={{ animation: 'admin-gradient-shimmer 6s ease infinite' }}
                >
                    Categories
                </span>
                <Sparkles size={16} className="text-amber-500 dark:text-amber-400" aria-hidden="true" />
            </h2>
            <p className="mb-5 text-sm text-stone-500 dark:text-stone-400">
                {items.length} categor{items.length === 1 ? 'y' : 'ies'} across your catalog.
            </p>

            {/* ---- Summary stats (always reflect the full catalog, not the filter below) ---- */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile icon={Tag} label="Categories" value={items.length} animate />
                <StatTile icon={Boxes} label="Total Products" value={totalProducts} animate
                    chip="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" />
                <StatTile icon={TrendingUp} label="Avg per Category" value={avgPerCategory}
                    chip="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" />
                <StatTile icon={Crown} label="Top Category" value={topGroup.name}
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
                        placeholder="Search categories..."
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
                    <SegmentedControl name="Category view" options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />
                    {viewMode !== 'activity' && (
                        <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
                            <span>Top {TOP_N} only</span>
                            <Toggle checked={topOnly} onChange={setTopOnly} label="Show only the top categories" size="sm" />
                        </label>
                    )}
                </div>

                {searchTerm && (
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                        {searchedRanked.length} categor{searchedRanked.length === 1 ? 'y matches' : 'ies match'} "{searchTerm}"
                    </p>
                )}
            </div>

            {viewMode === 'overview' && (
                searchedRanked.length === 0 ? (
                    <p className="rounded-lg border border-stone-200 bg-cream p-6 text-center text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
                        No categories match "{searchTerm}".
                    </p>
                ) : (
                <div className="space-y-5">
                    {/* Row 1 — donut only, full width, untouched component */}
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

                    {/* Row 2 — ranked breakdown with share-of-catalog bars, its own full-width row */}
                    <ul className="space-y-2.5">
                        {visibleRanked.map((item) => {
                            const i = ranked.indexOf(item);
                            const pct = totalProducts ? (item.count / totalProducts) * 100 : 0;
                            const color = colorFor(i);
                            const Icon = iconFor(i);
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
                                                        <Icon size={15} style={{ color }} />
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
                                                    {hasGroupsMetric && typeof item.groupsCount === 'number' && (
                                                        <> · {item.groupsCount} group{item.groupsCount === 1 ? '' : 's'}</>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {onSelect ? (
                                            <button
                                                onClick={() => onSelect(item.name)}
                                                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-brand-50 dark:text-brand-500 dark:hover:bg-brand-500/10"
                                            >
                                                View <ArrowRight size={14} />
                                            </button>
                                        ) : (
                                            <Link
                                                to={linkTarget(item.name)}
                                                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-brand-50 dark:text-brand-500 dark:hover:bg-brand-500/10"
                                            >
                                                View <ArrowRight size={14} />
                                            </Link>
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
                        {hasGroupsMetric
                            ? `Groups and products per category, ${topOnly ? `top ${TOP_N}` : 'full catalog'}, ranked highest to lowest — the tallest bar is your leading category.`
                            : `Products per category, ${topOnly ? `top ${TOP_N}` : 'full catalog'}, ranked highest to lowest — the tallest bar is your leading category.`}
                    </p>
                    {rankedItems.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No categories match "{searchTerm}".</p>
                    ) : (
                        <ComparisonHistogram
                            items={rankedItems}
                            onBarClick={onSelect ? (it) => onSelect(it.label) : undefined}
                        />
                    )}
                    {!hasGroupsMetric && (
                        <p className="mt-4 flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
                            <Layers size={12} /> Add a <code>groupsCount</code> field to each category to also rank by
                            group counts here.
                        </p>
                    )}
                </div>
            )}

            {viewMode === 'growth' && (
                <div className="rounded-lg border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-stone-500 dark:text-stone-400">
                            Cumulative products added per category — each line only climbs. Switch granularity if the data
                            is too spread out or too clustered to read.
                        </p>
                        <SegmentedControl
                            name="Growth granularity"
                            value={growthGranularity}
                            onChange={setGrowthGranularity}
                            options={[{ value: 'day', label: 'Daily' }, { value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }]}
                        />
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

            {viewMode === 'compare' && (
                <div className="rounded-lg border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-sm text-stone-500 dark:text-stone-400">
                            {hasGroupsMetric
                                ? 'Groups and products per category — pick which categories to compare.'
                                : 'Products per category — pick which categories to compare.'}
                        </p>
                        <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-stone-500 dark:text-stone-400">
                            <Checkbox
                                checked={allSelected}
                                indeterminate={!allSelected && !noneSelected}
                                onChange={toggleAll}
                                label="Select all categories"
                            />
                            Select all
                        </label>
                    </div>

                    {visibleRanked.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No categories match "{searchTerm}".</p>
                    ) : (
                        <>
                            <div className="mb-5 flex flex-wrap gap-2">
                                {visibleRanked.map((item) => (
                                    <label
                                        key={item.name}
                                        className="flex items-center gap-1.5 rounded-full border border-stone-200 px-2.5 py-1 text-xs text-stone-600 dark:border-stone-700 dark:text-stone-300"
                                    >
                                        <Checkbox
                                            checked={activeSelected.has(item.name)}
                                            onChange={() => toggleName(item.name)}
                                            label={`Include ${item.name} in comparison`}
                                        />
                                        {item.name}
                                    </label>
                                ))}
                            </div>

                            {compareItems.length > 0 ? (
                                <ComparisonHistogram items={compareItems} onBarClick={onSelect ? (it) => onSelect(it.label) : undefined} />
                            ) : (
                                <p className="text-sm text-stone-500 dark:text-stone-400">
                                    Select at least one category above to compare it.
                                </p>
                            )}
                        </>
                    )}

                    {!hasGroupsMetric && (
                        <p className="mt-4 flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
                            <Layers size={12} /> Add a <code>groupsCount</code> field to each category to also compare
                            group counts here.
                        </p>
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
                                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                                        New products over time
                                    </h3>
                                    <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                                        Click a square to see exactly which products were added that day.
                                    </p>
                                </div>
                            </div>
                            <div className="w-full sm:w-52">
                                <Select
                                    value={activityCategory}
                                    onChange={(v) => { setActivityCategory(v); setActivityBucket(null); }}
                                    options={ranked.map((r) => r.name)}
                                    placeholder="All categories"
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
                                    in the last 180 days{activityCategory ? ` in ${activityCategory}` : ''}
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
                                            {onSelect ? (
                                                <button
                                                    onClick={() => onSelect(p.category)}
                                                    className="shrink-0 text-stone-400 transition-colors hover:text-brand-600 dark:text-stone-500 dark:hover:text-brand-400"
                                                    title={`View ${p.category}`}
                                                >
                                                    <ExternalLink size={14} />
                                                </button>
                                            ) : (
                                                <Link
                                                    to={linkTarget(p.category)}
                                                    className="shrink-0 text-stone-400 transition-colors hover:text-brand-600 dark:text-stone-500 dark:hover:text-brand-400"
                                                    title={`View ${p.category}`}
                                                >
                                                    <ExternalLink size={14} />
                                                </Link>
                                            )}
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

export default CategoriesView;