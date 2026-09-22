import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Package, Layers3, TrendingUp, CalendarDays } from 'lucide-react';
import { TrendAreaChart, HeatmapCalendar } from '../../ui';

/* ---------- tiny animation helpers (pure CSS/Tailwind, no extra deps) ---------- */

function AnimatedNumber({ value, duration = 700 }) {
    const [display, setDisplay] = useState(0);
    const fromRef = useRef(0);
    const startRef = useRef(null);

    useEffect(() => {
        fromRef.current = display;
        startRef.current = null;
        let raf;
        function tick(ts) {
            if (startRef.current === null) startRef.current = ts;
            const progress = Math.min(1, (ts - startRef.current) / duration);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
            setDisplay(Math.round(fromRef.current + (value - fromRef.current) * eased));
            if (progress < 1) raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return <>{display}</>;
}

/** Animated segmented control — a sliding pill that glides to the active option. */
function SegmentedControl({ options, value, onChange }) {
    const btnRefs = useRef([]);
    const [pill, setPill] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const idx = options.findIndex((o) => o.value === value);
        const btn = btnRefs.current[idx];
        if (btn) setPill({ left: btn.offsetLeft, width: btn.offsetWidth });
    }, [value, options]);

    return (
        <div className="relative inline-flex rounded-full bg-stone-100 p-1 dark:bg-stone-800">
            <span
                className="absolute top-1 bottom-1 rounded-full bg-white shadow-sm transition-all duration-300 ease-out dark:bg-stone-700"
                style={{ left: pill.left, width: pill.width }}
            />
            {options.map((opt, i) => (
                <button
                    key={opt.value}
                    type="button"
                    ref={(el) => (btnRefs.current[i] = el)}
                    onClick={() => onChange(opt.value)}
                    className={`relative z-10 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                        value === opt.value
                            ? 'text-stone-900 dark:text-stone-100'
                            : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

/** Fades+scales a subtree out and back in whenever its deps change. */
function useFadeTransition(deps) {
    const [ready, setReady] = useState(true);
    useEffect(() => {
        setReady(false);
        const t = setTimeout(() => setReady(true), 180);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return ready;
}

function StatCard({ icon: Icon, label, value, delay, visible, classes }) {
    return (
        <div
            className={`flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-300 hover:scale-110 ${classes}`}>
                <Icon size={16} />
            </div>
            <div>
                <div className="text-lg font-bold leading-tight text-stone-900 dark:text-stone-100">
                    <AnimatedNumber value={value} />
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400">{label}</div>
            </div>
        </div>
    );
}

/* ---------- data helpers ---------- */

function getCreatedDate(p) {
    const raw = p['$createdAt'] || p.createdAt;
    return raw ? new Date(raw) : null;
}

function startOfWeek(d) {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    c.setDate(c.getDate() - c.getDay());
    return c;
}

const PALETTE = ['#059669', '#7c3aed', '#dc2626', '#2563eb', '#d97706', '#db2777', '#0891b2', '#65a30d'];
const OTHER_COLOR = '#78716c';
const MAX_SERIES = 6;

/** Builds one series per top category/group (by total volume), bucketing the rest into "Other". */
function buildBreakdownSeries(withDates, field, weekStarts) {
    const totals = new Map();
    withDates.forEach(({ p }) => {
        const key = p[field] || 'Uncategorized';
        totals.set(key, (totals.get(key) || 0) + 1);
    });
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const top = ranked.slice(0, MAX_SERIES).map(([name]) => name);
    const hasOther = ranked.length > MAX_SERIES;
    const names = hasOther ? [...top, 'Other'] : top;
    const bucketOf = (name) => (top.includes(name) ? name : 'Other');

    return names.map((name, i) => ({
        key: name,
        name,
        color: name === 'Other' ? OTHER_COLOR : PALETTE[i % PALETTE.length],
        values: weekStarts.map((ws) => {
            const we = new Date(ws);
            we.setDate(we.getDate() + 7);
            return withDates.filter(
                ({ p, date }) => date >= ws && date < we && bucketOf(p[field] || 'Uncategorized') === name
            ).length;
        }),
    }));
}

const RANGE_OPTIONS = [
    { value: '4w', label: '4W', weeks: 4 },
    { value: '12w', label: '12W', weeks: 12 },
    { value: '26w', label: '26W', weeks: 26 },
    { value: '52w', label: '1Y', weeks: 52 },
];
const BREAKDOWN_OPTIONS = [
    { value: 'total', label: 'Total' },
    { value: 'category', label: 'By Category' },
    { value: 'group', label: 'By Group' },
];

/**
 * Standalone Analytics tab content — stats, a trend chart that can split by
 * category/group over a chosen time range, and a heatmap. Drop this in
 * wherever your "Analytics" tab renders; it no longer belongs inside the
 * Products tab.
 */
function ProductAnalytics({ products }) {
    const [visible, setVisible] = useState(false);
    const [range, setRange] = useState('12w');
    const [breakdown, setBreakdown] = useState('total');

    useEffect(() => {
        const t = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(t);
    }, []);

    const chartReady = useFadeTransition([range, breakdown]);

    const rangeWeeks = RANGE_OPTIONS.find((r) => r.value === range)?.weeks ?? 12;

    const { weeklySeries, weekLabels, heatmapEntries, stats, presets } = useMemo(() => {
        const withDates = products
            .map((p) => ({ p, date: getCreatedDate(p) }))
            .filter((x) => x.date);

        const dailyCounts = {};
        withDates.forEach(({ date }) => {
            const key = date.toISOString().slice(0, 10);
            dailyCounts[key] = (dailyCounts[key] || 0) + 1;
        });
        const heatmapEntries = Object.entries(dailyCounts).map(([date, count]) => ({ date, count }));

        const thisWeekStart = startOfWeek(new Date());
        const weekStarts = Array.from({ length: rangeWeeks }, (_, i) => {
            const d = new Date(thisWeekStart);
            d.setDate(d.getDate() - (rangeWeeks - 1 - i) * 7);
            return d;
        });
        const weekLabels = weekStarts.map((ws) => ws.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

        let weeklySeries;
        let presets;
        if (breakdown === 'category') {
            weeklySeries = buildBreakdownSeries(withDates, 'category', weekStarts);
            presets = null;
        } else if (breakdown === 'group') {
            weeklySeries = buildBreakdownSeries(withDates, 'group', weekStarts);
            presets = null;
        } else {
            const addedByWeek = weekStarts.map((ws) => {
                const we = new Date(ws);
                we.setDate(we.getDate() + 7);
                return withDates.filter(({ date }) => date >= ws && date < we).length;
            });
            const priorTotal = withDates.filter(({ date }) => date < weekStarts[0]).length;
            let running = priorTotal;
            const cumulativeByWeek = addedByWeek.map((n) => (running += n));
            weeklySeries = [
                { key: 'added', name: 'Added', color: '#059669', values: addedByWeek },
                { key: 'cumulative', name: 'Cumulative', color: '#7c3aed', values: cumulativeByWeek },
            ];
            presets = [
                { label: 'Added', keys: ['added'] },
                { label: 'Cumulative', keys: ['cumulative'] },
                { label: 'Both', keys: ['added', 'cumulative'] },
            ];
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const stats = {
            total: products.length,
            addedThisWeek: withDates.filter(({ date }) => date >= sevenDaysAgo).length,
            categories: new Set(products.map((p) => p.category).filter(Boolean)).size,
            groups: new Set(products.map((p) => p.group).filter(Boolean)).size,
        };

        return { weeklySeries, weekLabels, heatmapEntries, stats, presets };
    }, [products, rangeWeeks, breakdown]);

    if (products.length === 0) return null;

    const statCards = [
        { icon: Package, label: 'Total Products', value: stats.total, classes: 'text-brand-500 dark:text-brand-400 bg-blue-500/15' },
        { icon: TrendingUp, label: 'Added This Week', value: stats.addedThisWeek, classes: 'text-orange-500 dark:text-orange-400 bg-orange-700/15 dark:bg-orange-700/20' },
        { icon: Layers3, label: 'Categories', value: stats.categories, classes: 'text-green-500 dark:text-green-400 bg-green-300/15 dark:bg-green-300/20' },
        { icon: CalendarDays, label: 'Groups', value: stats.groups, classes: 'text-red-500 dark:text-red-400 bg-red-300/15 dark:bg-red-300/20' },
    ];

    return (
        <div className="mb-5  space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {statCards.map((s, i) => (
                    <StatCard key={s.label} {...s} delay={i * 80} visible={visible} />
                ))}
            </div>

            <div
                className={`rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition-all duration-500 ease-out dark:border-stone-800 dark:bg-stone-900 ${
                    visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
                style={{ transitionDelay: '260ms' }}
            >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                        Product Growth
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <SegmentedControl options={BREAKDOWN_OPTIONS} value={breakdown} onChange={setBreakdown} />
                        <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />
                    </div>
                </div>
                <div
                    className={`transition-all duration-200 ease-out ${
                        chartReady ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-0'
                    }`}
                >
                    <TrendAreaChart
                        series={weeklySeries}
                        xLabels={weekLabels}
                        {...(presets ? { defaultHidden: ['cumulative'], presets } : {})}
                    />
                </div>
            </div>

            <div
                className={`rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition-all duration-500 ease-out dark:border-stone-800 dark:bg-stone-900 ${
                    visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
                style={{ transitionDelay: '340ms' }}
            >
                <HeatmapCalendar
                    entries={heatmapEntries}
                    days={182}
                    unitLabel="product"
                    title="Products added — last 6 months"
                />
            </div>
        </div>
    );
}

export default ProductAnalytics;