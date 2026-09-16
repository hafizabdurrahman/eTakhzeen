import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router';
import {
    Package, ClipboardList, Clock, RefreshCw, CheckCircle2, TrendingDown,
    Search, X, CalendarDays, PieChart, LineChart, BarChart3, ChevronRight,
    Trash2, Loader2, AlertTriangle, Sparkles,
} from 'lucide-react';
import {
    fetchAllOrdersAdmin,
    fetchOrdersForUsernameAdmin,
    searchOrdersAdmin,
    deleteOrderAdmin,
} from '../../store/slices/orderSlice'; // ⚠️ adjust path
import { ORDER_STATUS_PRIORITY, ORDER_STATUSES } from '../../backend/order';
import {
    HeatmapCalendar, DonutChart, StatusTrendChart, TrendAreaChart, Checkbox,
} from '../../ui'; // ⚠️ adjust path
import { StatusFilterSelect, ORDER_STATUS_META, ORDER_STATUS_HEX } from '../../ui/StatusPicker';

const SEARCH_DEBOUNCE_MS = 400;
const LOSS_STATUSES = ['Cancelled', 'Returned'];

function bucketMonth(date) {
    const d = new Date(date);
    return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
    };
}

function Reveal({ children, delay = 0 }) {
    const [shown, setShown] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setShown(true), delay);
        return () => clearTimeout(t);
    }, [delay]);
    return (
        <div className={`transition-all duration-700 ease-out ${shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            {children}
        </div>
    );
}

// Counts up from 0 to `value` with an ease-out curve — same behavior as
// the dashboard's stat cards, so numbers feel consistent across the panel.
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

function AdminOrders() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const usernameFilter = searchParams.get('username') || '';

    const [term, setTerm] = useState(usernameFilter);
    const [touched, setTouched] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [dateRange, setDateRange] = useState(null); // { start: Date, end: Date } | null
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);

    const { items, status, error } = useSelector((s) => s.orders.adminList);

    useEffect(() => {
        if (!touched && usernameFilter) {
            dispatch(fetchOrdersForUsernameAdmin({ username: usernameFilter }));
            return;
        }
        const handle = setTimeout(() => {
            if (term.trim()) dispatch(searchOrdersAdmin({ term: term.trim() }));
            else dispatch(fetchAllOrdersAdmin());
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(handle);
    }, [dispatch, term, touched, usernameFilter]);

    function handleSearchChange(e) {
        setTouched(true);
        setTerm(e.target.value);
    }

    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => {
            const pa = ORDER_STATUS_PRIORITY[a.status] ?? 99;
            const pb = ORDER_STATUS_PRIORITY[b.status] ?? 99;
            if (pa !== pb) return pa - pb;
            return new Date(b.$createdAt) - new Date(a.$createdAt);
        });
    }, [items]);

    const filteredItems = useMemo(() => {
        return sortedItems.filter((o) => {
            if (statusFilter && o.status !== statusFilter) return false;
            if (dateRange) {
                const created = new Date(o.$createdAt);
                if (created < dateRange.start || created > dateRange.end) return false;
            }
            return true;
        });
    }, [sortedItems, statusFilter, dateRange]);

    // ---- KPIs (over everything currently loaded, not just the filtered view) ----
    const kpis = useMemo(() => {
        const counts = { total: items.length, Pending: 0, Processing: 0, Delivered: 0, lost: 0 };
        items.forEach((o) => {
            if (o.status === 'Pending') counts.Pending += 1;
            else if (o.status === 'Processing') counts.Processing += 1;
            else if (o.status === 'Delivered') counts.Delivered += 1;
            else if (LOSS_STATUSES.includes(o.status)) counts.lost += 1;
        });
        return counts;
    }, [items]);

    // ---- status breakdown donut ----
    const statusSegments = useMemo(() => {
        const counts = {};
        items.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
        return ORDER_STATUSES.map((s) => ({ label: s, value: counts[s] || 0, color: ORDER_STATUS_HEX[s] }));
    }, [items]);

    // ---- monthly composition (stacked) ----
    const statusPeriods = useMemo(() => {
        const byMonth = new Map();
        items.forEach((o) => {
            const { key, label } = bucketMonth(o.$createdAt);
            const existing = byMonth.get(key) || { label, counts: {}, total: 0 };
            existing.counts[o.status] = (existing.counts[o.status] || 0) + 1;
            existing.total += 1;
            byMonth.set(key, existing);
        });
        return Array.from(byMonth.keys()).sort().slice(-8).map((k) => byMonth.get(k));
    }, [items]);

    const statusIcons = useMemo(
        () => Object.fromEntries(Object.entries(ORDER_STATUS_META).map(([k, v]) => [k, v.icon])),
        []
    );

    // ---- trend area: order count per status per month ----
    const trend = useMemo(() => {
        const byMonth = new Map();
        items.forEach((o) => {
            const { key, label } = bucketMonth(o.$createdAt);
            const existing = byMonth.get(key) || { label, counts: {} };
            existing.counts[o.status] = (existing.counts[o.status] || 0) + 1;
            byMonth.set(key, existing);
        });
        const keys = Array.from(byMonth.keys()).sort().slice(-8);
        const xLabels = keys.map((k) => byMonth.get(k).label);
        const series = ORDER_STATUSES.map((s) => ({
            key: s,
            name: s,
            color: ORDER_STATUS_HEX[s],
            values: keys.map((k) => byMonth.get(k).counts[s] || 0),
        }));
        return { xLabels, series };
    }, [items]);

    // ---- heatmap entries — one entry per order, clicking a bucket filters the table ----
    const heatmapEntries = useMemo(
        () => items.map((o) => ({ date: o.$createdAt, count: 1, item: o })),
        [items]
    );

    function handleHeatmapClick(bucket) {
        setDateRange({ start: bucket.start, end: bucket.end });
    }

    // ---- bulk select ----
    const allVisibleSelected = filteredItems.length > 0 && filteredItems.every((o) => selectedIds.has(o['$id']));
    const someVisibleSelected = filteredItems.some((o) => selectedIds.has(o['$id']));

    function toggleSelectAll(next) {
        setSelectedIds((prev) => {
            const nextSet = new Set(prev);
            filteredItems.forEach((o) => {
                if (next) nextSet.add(o['$id']);
                else nextSet.delete(o['$id']);
            });
            return nextSet;
        });
    }

    function toggleSelectOne(id, next) {
        setSelectedIds((prev) => {
            const nextSet = new Set(prev);
            if (next) nextSet.add(id);
            else nextSet.delete(id);
            return nextSet;
        });
    }

    async function handleBulkDelete() {
        if (selectedIds.size === 0) return;
        if (!confirm(`Permanently delete ${selectedIds.size} order(s)? This cannot be undone.`)) return;
        setBulkDeleting(true);
        try {
            await Promise.all(Array.from(selectedIds).map((id) => dispatch(deleteOrderAdmin({ rowId: id }))));
            setSelectedIds(new Set());
        } finally {
            setBulkDeleting(false);
        }
    }

    const isLoading = status === 'loading' || status === 'idle';

    return (
        <div className="space-y-6">
            {/* Scoped keyframes — same gradient shimmer used on the dashboard's
                welcome header, kept local to this file. */}
            <style>{`
                @keyframes admin-gradient-shimmer {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>

            <Reveal delay={0}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-500">
                            <ClipboardList size={14} /> Orders
                        </span>
                        <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                            <span
                                className="bg-gradient-to-r from-brand-600 via-emerald-500 to-brand-600 bg-[length:200%_auto] bg-clip-text text-transparent dark:from-brand-400 dark:via-emerald-400 dark:to-brand-400"
                                style={{ animation: 'admin-gradient-shimmer 6s ease infinite' }}
                            >
                                All orders
                            </span>
                            <Sparkles size={20} className="text-amber-500 dark:text-amber-400" aria-hidden="true" />
                        </h1>
                        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                            Search, filter, and manage every order across the store.
                        </p>
                    </div>
                </div>
            </Reveal>

            {/* KPI row */}
            <Reveal delay={60}>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                    <KpiCard label="Total orders" value={kpis.total} icon={Package} chip="bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300" />
                    <KpiCard label="Pending" value={kpis.Pending} icon={Clock} chip="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />
                    <KpiCard label="Processing" value={kpis.Processing} icon={RefreshCw} chip="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" />
                    <KpiCard label="Cancelled + Returned" value={kpis.lost} icon={TrendingDown} chip="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" valueClass="text-red-600 dark:text-red-400" />
                </div>
            </Reveal>

            {/* Status snapshot + monthly composition */}
            <Reveal delay={100}>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Panel icon={PieChart} title="Order status" subtitle="Current breakdown — click a slice to filter the table below">
                        {isLoading ? (
                            <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                        ) : (
                            <DonutChart segments={statusSegments} centerLabel="Orders" onSegmentClick={(seg) => setStatusFilter(seg.label)} />
                        )}
                    </Panel>
                    <Panel icon={BarChart3} title="Status over time" subtitle="Each bar is one month's orders, split by status">
                        {isLoading ? (
                            <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                        ) : (
                            <StatusTrendChart periods={statusPeriods} statusColors={ORDER_STATUS_HEX} statusIcons={statusIcons} valueLabel="orders" />
                        )}
                    </Panel>
                </div>
            </Reveal>

            {/* Trend line */}
            <Reveal delay={140}>
                <Panel icon={LineChart} title="Order volume by status" subtitle="Toggle series to compare — dashed/dotted lines stay tellable apart in dark mode too">
                    {isLoading ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                    ) : trend.xLabels.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No data yet.</p>
                    ) : (
                        <TrendAreaChart
                            xLabels={trend.xLabels}
                            series={trend.series}
                            valueFormatter={(v) => String(Math.round(v))}
                            presets={[
                                { label: 'All', keys: ORDER_STATUSES },
                                { label: 'Active', keys: ['Pending', 'Processing'] },
                                { label: 'Lost', keys: ['Cancelled', 'Returned'] },
                            ]}
                        />
                    )}
                </Panel>
            </Reveal>

            {/* Heatmap */}
            <Reveal delay={180}>
                <Panel icon={CalendarDays} title="Order activity" subtitle="Darker means more orders placed that day — click a square to filter the table to that range">
                    {isLoading ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                    ) : heatmapEntries.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No orders yet.</p>
                    ) : (
                        <HeatmapCalendar entries={heatmapEntries} days={180} onBoxClick={handleHeatmapClick} />
                    )}
                </Panel>
            </Reveal>

            {/* Search + filters */}
            <Reveal delay={220}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
                        <input
                            type="text"
                            value={term}
                            onChange={handleSearchChange}
                            placeholder="Search by name, email, username, address or product..."
                            className="w-full rounded-md border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <StatusFilterSelect value={statusFilter} onChange={setStatusFilter} statuses={ORDER_STATUSES} />
                    </div>
                    {dateRange && (
                        <button
                            type="button"
                            onClick={() => setDateRange(null)}
                            className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
                        >
                            <CalendarDays size={13} />
                            {dateRange.start.toLocaleDateString()} – {dateRange.end.toLocaleDateString()}
                            <X size={13} />
                        </button>
                    )}
                </div>
            </Reveal>

            {/* Bulk action bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-500/30 dark:bg-red-500/10">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">{selectedIds.size} order(s) selected</p>
                    <button
                        type="button"
                        onClick={handleBulkDelete}
                        disabled={bulkDeleting}
                        className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
                    >
                        {bulkDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        Delete selected
                    </button>
                </div>
            )}

            {status === 'failed' && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {isLoading && <p className="text-sm text-stone-500 dark:text-stone-400">Loading orders...</p>}

            {status === 'succeeded' && filteredItems.length === 0 && (
                <p className="text-sm text-stone-500 dark:text-stone-400">No orders match these filters.</p>
            )}

            {status === 'succeeded' && filteredItems.length > 0 && (
                <>
                    {/* Desktop table */}
                    <div className="hidden overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900 md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-stone-200 text-stone-500 dark:border-stone-800 dark:text-stone-400">
                                <tr>
                                    <th className="w-10 py-2.5 pl-4">
                                        <Checkbox
                                            checked={allVisibleSelected}
                                            indeterminate={someVisibleSelected && !allVisibleSelected}
                                            onChange={toggleSelectAll}
                                            label="Select all visible orders"
                                        />
                                    </th>
                                    <th className="py-2.5 pr-4">Status</th>
                                    <th className="py-2.5 pr-4">Recipient</th>
                                    <th className="py-2.5 pr-4">Username</th>
                                    <th className="py-2.5 pr-4">Address</th>
                                    <th className="py-2.5 pr-4">Items</th>
                                    <th className="py-2.5 pr-4">Total</th>
                                    <th className="py-2.5 pr-4">Payment</th>
                                    <th className="py-2.5 pr-4">Placed</th>
                                    <th className="w-8 py-2.5 pr-4" />
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((order) => (
                                    <tr
                                        key={order['$id']}
                                        onClick={() => navigate(`/admin/orders/${order['$id']}`)}
                                        className="cursor-pointer border-b border-stone-100 transition-colors hover:bg-stone-50 dark:border-stone-800/60 dark:hover:bg-stone-800"
                                    >
                                        <td className="py-2.5 pl-4">
                                            <Checkbox
                                                checked={selectedIds.has(order['$id'])}
                                                onChange={(next) => toggleSelectOne(order['$id'], next)}
                                                label={`Select order ${order['$id']}`}
                                            />
                                        </td>
                                        <td className="py-2.5 pr-4"><StatusBadge status={order.status} /></td>
                                        <td className="py-2.5 pr-4 font-medium text-stone-900 dark:text-stone-100">{order.name}</td>
                                        <td className="py-2.5 pr-4 text-stone-500 dark:text-stone-400">{order.username}</td>
                                        <td className="max-w-[14rem] truncate py-2.5 pr-4 text-stone-500 dark:text-stone-400">{order.address}</td>
                                        <td className="py-2.5 pr-4">{order.orderDetails.length} item(s)</td>
                                        <td className="py-2.5 pr-4 font-medium text-stone-900 dark:text-stone-100">Rs. {order.total}</td>
                                        <td className="py-2.5 pr-4 text-stone-500 dark:text-stone-400">{order.paymentMethod}</td>
                                        <td className="py-2.5 pr-4 text-stone-500 dark:text-stone-400">{new Date(order.$createdAt).toLocaleDateString()}</td>
                                        <td className="py-2.5 pr-4">
                                            <ChevronRight size={15} className="text-stone-300 dark:text-stone-600" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="space-y-2 md:hidden">
                        {filteredItems.map((order) => (
                            <div
                                key={order['$id']}
                                role="button"
                                tabIndex={0}
                                onClick={() => navigate(`/admin/orders/${order['$id']}`)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        navigate(`/admin/orders/${order['$id']}`);
                                    }
                                }}
                                className="flex w-full items-start gap-3 rounded-lg border border-stone-200 bg-white p-3.5 text-left shadow-sm transition-colors hover:border-brand-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-brand-500/50 cursor-pointer"
                            >
                                <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                        checked={selectedIds.has(order['$id'])}
                                        onChange={(next) => toggleSelectOne(order['$id'], next)}
                                        label={`Select order ${order['$id']}`}
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <StatusBadge status={order.status} />
                                        <span className="text-xs text-stone-400 dark:text-stone-500">{new Date(order.$createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="mt-1.5 truncate font-medium text-stone-900 dark:text-stone-100">{order.name}</p>
                                    <p className="truncate text-xs text-stone-500 dark:text-stone-400">@{order.username} · {order.address}</p>
                                    <div className="mt-2 flex items-center justify-between text-sm">
                                        <span className="text-stone-500 dark:text-stone-400">{order.orderDetails.length} item(s) · {order.paymentMethod}</span>
                                        <span className="font-semibold text-stone-900 dark:text-stone-100">Rs. {order.total}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function Panel({ icon: Icon, title, subtitle, children }) {
    return (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-start gap-2 border-b border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-800/40 sm:px-5">
                {Icon && <Icon size={16} className="mt-0.5 shrink-0 text-stone-400 dark:text-stone-500" />}
                <div>
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
                    {subtitle && <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>}
                </div>
            </div>
            <div className="p-4 sm:p-5">{children}</div>
        </div>
    );
}

function KpiCard({ label, value, icon: Icon, chip, valueClass = 'text-stone-900 dark:text-stone-100' }) {
    return (
        <div className="flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white p-3.5 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${chip}`}>
                <Icon size={15} />
            </span>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</p>
            <p className={`text-lg font-bold tabular-nums ${valueClass}`}>
                <AnimatedNumber value={value} />
            </p>
        </div>
    );
}

function StatusBadge({ status }) {
    const meta = ORDER_STATUS_META[status];
    const Icon = meta?.icon;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${meta?.badge || 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'}`}>
            {Icon && <Icon size={11} />}
            {status}
        </span>
    );
}

export default AdminOrders;