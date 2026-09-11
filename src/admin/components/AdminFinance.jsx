import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import {
    Wallet, TrendingUp, TrendingDown, Banknote, Percent, AlertTriangle,
    LineChart, PieChart, BarChart3, CalendarDays, ReceiptText, ClipboardList,
    Package, Clock, RefreshCw, Truck, CheckCircle2, RotateCcw, XCircle, ChevronRight,
} from 'lucide-react';
import service from '../../backend/service';
import { fetchAllOrdersAdmin } from '../../store/slices/orderSlice'; // ⚠️ adjust path
import { HeatmapCalendar, DonutChart, StatusTrendChart, TrendAreaChart, Select, SegmentedControl } from '../../ui';
import { formatPKR } from '../../utils/formatPrice'; // ⚠️ adjust path

const DAY_MS = 24 * 60 * 60 * 1000;

// ⚠️ Rename this if your product table's new column isn't called
// "costPrice" — it's the only place the field name is referenced.
const COST_FIELD = 'costPrice';

// Orders in these statuses are excluded from Revenue/Profit and instead
// counted as Loss — their cost was already sunk (stock procured, possibly
// shipped) but no payment was kept.
const LOSS_STATUSES = ['Cancelled', 'Returned'];

const STATUS_HEX = {
    Pending: '#f59e0b',
    Processing: '#0ea5e9',
    Shipped: '#8b5cf6',
    Delivered: '#16a34a',
    Returned: '#f97316',
    Cancelled: '#dc2626',
};

const STATUS_ICONS = {
    Pending: Clock,
    Processing: RefreshCw,
    Shipped: Truck,
    Delivered: CheckCircle2,
    Returned: RotateCcw,
    Cancelled: XCircle,
};

const STATUS_BADGE_CLASSES = {
    Pending: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    Processing: 'bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400',
    Shipped: 'bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
    Delivered: 'bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    Returned: 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
    Cancelled: 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400',
};

const PERIOD_OPTIONS = [
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '180d', label: 'Last 6 months' },
    { value: '365d', label: 'Last year' },
    { value: 'all', label: 'All time' },
];
const PERIOD_DAYS = { '30d': 30, '90d': 90, '180d': 180, '365d': 365 };

const GRANULARITY_OPTIONS = [
    { value: 'day', label: 'Daily' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' },
];

const ORDER_ROWS_STEP = 10;

function getPeriodCutoff(period) {
    const days = PERIOD_DAYS[period];
    if (!days) return null;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days + 1);
    return cutoff;
}

function bucketFor(date, granularity) {
    if (granularity === 'day') {
        const key = date.toISOString().slice(0, 10);
        return { key, label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
    }
    if (granularity === 'month') {
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        return { key, label: date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) };
    }
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() + ((day === 0 ? -6 : 1) - day)); // shift to Monday
    d.setHours(0, 0, 0, 0);
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
}

// Staggered entrance — same pattern already used on User.jsx / AdminDashboard,
// kept consistent across the admin panel rather than introducing a new style.
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

function AdminFinance() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { items: orders, status: ordersStatus } = useSelector((s) => s.orders.adminList);

    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [period, setPeriod] = useState('90d');
    const [granularity, setGranularity] = useState('week');
    const [statusFilter, setStatusFilter] = useState('');
    const [visibleOrderRows, setVisibleOrderRows] = useState(ORDER_ROWS_STEP);

    useEffect(() => {
        dispatch(fetchAllOrdersAdmin());
    }, [dispatch]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setProductsLoading(true);
                const rows = await service.getProducts({});
                if (!cancelled) setProducts(Array.isArray(rows) ? rows : []);
            } catch (err) {
                if (!cancelled) setError('Could not load product cost data.');
            } finally {
                if (!cancelled) setProductsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const costMap = useMemo(() => {
        const map = new Map();
        products.forEach((p) => map.set(p['$id'], Number(p[COST_FIELD]) || 0));
        return map;
    }, [products]);

    const productNameMap = useMemo(() => {
        const map = new Map();
        products.forEach((p) => map.set(p['$id'], p.name));
        return map;
    }, [products]);

    const ordersLoading = ordersStatus === 'loading' || ordersStatus === 'idle';

    const filteredOrders = useMemo(() => {
        const cutoff = getPeriodCutoff(period);
        if (!cutoff) return orders;
        return orders.filter((o) => new Date(o.$createdAt) >= cutoff);
    }, [orders, period]);

    // Per-order revenue/cost/profit, computed once and reused everywhere.
    const priced = useMemo(() => {
        return filteredOrders.map((o) => {
            const details = o.orderDetails || [];
            const revenue = details.reduce((s, d) => s + Number(d.price) * d.quantity, 0);
            const cost = details.reduce((s, d) => s + (costMap.get(d.productId) || 0) * d.quantity, 0);
            const isLoss = LOSS_STATUSES.includes(o.status);
            return { order: o, revenue, cost, profit: revenue - cost, isLoss };
        });
    }, [filteredOrders, costMap]);

    const totals = useMemo(() => {
        let revenue = 0, cost = 0, loss = 0;
        priced.forEach((p) => {
            if (p.isLoss) loss += p.cost;
            else {
                revenue += p.revenue;
                cost += p.cost;
            }
        });
        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        return { revenue, cost, profit, loss, margin };
    }, [priced]);

    const trend = useMemo(() => {
        const buckets = new Map();
        priced.forEach(({ order, revenue, cost, profit, isLoss }) => {
            const { key, label } = bucketFor(new Date(order.$createdAt), granularity);
            const existing = buckets.get(key) || { label, revenue: 0, cost: 0, profit: 0, loss: 0 };
            if (isLoss) existing.loss += cost;
            else {
                existing.revenue += revenue;
                existing.cost += cost;
                existing.profit += profit;
            }
            buckets.set(key, existing);
        });
        const sortedKeys = Array.from(buckets.keys()).sort();
        return {
            xLabels: sortedKeys.map((k) => buckets.get(k).label),
            revenue: sortedKeys.map((k) => buckets.get(k).revenue),
            cost: sortedKeys.map((k) => buckets.get(k).cost),
            profit: sortedKeys.map((k) => buckets.get(k).profit),
            loss: sortedKeys.map((k) => -buckets.get(k).loss),
        };
    }, [priced, granularity]);

    const statusSegments = useMemo(() => {
        const counts = {};
        filteredOrders.forEach((o) => {
            counts[o.status] = (counts[o.status] || 0) + 1;
        });
        return Object.keys(STATUS_HEX).map((status) => ({ label: status, value: counts[status] || 0, color: STATUS_HEX[status] }));
    }, [filteredOrders]);

    // Monthly status composition for StatusTrendChart — one stacked bar
    // per month instead of GroupedBarChart's many thin same-height bars,
    // which is what made the old panel unreadable.
    const statusPeriods = useMemo(() => {
        const byMonth = new Map();
        filteredOrders.forEach((o) => {
            const d = new Date(o.$createdAt);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
            const existing = byMonth.get(key) || { label, counts: {}, total: 0 };
            existing.counts[o.status] = (existing.counts[o.status] || 0) + 1;
            existing.total += 1;
            byMonth.set(key, existing);
        });
        return Array.from(byMonth.keys()).sort().slice(-8).map((k) => byMonth.get(k));
    }, [filteredOrders]);

    // Cancellation + return rate, plain numbers rather than another chart —
    // the single clearest way to answer "how many orders are falling
    // through" at a glance.
    const cancelReturnRate = useMemo(() => {
        if (filteredOrders.length === 0) return { cancelled: 0, returned: 0, rate: 0 };
        const cancelled = filteredOrders.filter((o) => o.status === 'Cancelled').length;
        const returned = filteredOrders.filter((o) => o.status === 'Returned').length;
        return { cancelled, returned, rate: ((cancelled + returned) / filteredOrders.length) * 100 };
    }, [filteredOrders]);

    const lossHeatmapEntries = useMemo(
        () => priced.filter((p) => p.isLoss).map((p) => ({ date: p.order.$createdAt, count: 1, item: p.order })),
        [priced]
    );

    // Full order list for the drill-down panel — status-filterable, most
    // recent first, revealed a page at a time.
    const orderRows = useMemo(() => {
        const rows = statusFilter ? priced.filter((p) => p.order.status === statusFilter) : priced;
        return [...rows].sort((a, b) => new Date(b.order.$createdAt) - new Date(a.order.$createdAt));
    }, [priced, statusFilter]);

    // Per-product profit rollup, non-loss orders only — the individual
    // "which products are actually making money" breakdown.
    const productRows = useMemo(() => {
        const map = new Map();
        priced
            .filter((p) => !p.isLoss)
            .forEach(({ order }) => {
                (order.orderDetails || []).forEach((d) => {
                    const existing = map.get(d.productId) || {
                        productId: d.productId,
                        name: productNameMap.get(d.productId) || d.name || 'Unknown product',
                        units: 0,
                        revenue: 0,
                        cost: 0,
                    };
                    existing.units += d.quantity;
                    existing.revenue += Number(d.price) * d.quantity;
                    existing.cost += (costMap.get(d.productId) || 0) * d.quantity;
                    map.set(d.productId, existing);
                });
            });
        return Array.from(map.values())
            .map((p) => ({ ...p, profit: p.revenue - p.cost }))
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 8);
    }, [priced, costMap, productNameMap]);

    const maxProductProfit = Math.max(1, ...productRows.map((p) => Math.abs(p.profit)));
    const isLoading = ordersLoading || productsLoading;

    function handlePeriodChange(value) {
        setPeriod(value);
        setVisibleOrderRows(ORDER_ROWS_STEP);
    }
    function handleStatusFilterChange(value) {
        setStatusFilter(value);
        setVisibleOrderRows(ORDER_ROWS_STEP);
    }

    return (
        <div className="space-y-6">
            <Reveal delay={0}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-500">
                            <Wallet size={14} />
                            Finance
                        </span>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-3xl">
                            Revenue &amp; profitability
                        </h1>
                        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                            Revenue, cost, profit, and loss from cancellations — Cancelled/Returned orders count as
                            loss (sunk cost), everything else counts toward revenue and profit.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="w-full sm:w-44">
                            <Select value={period} onChange={handlePeriodChange} options={PERIOD_OPTIONS} placeholder="Time period" />
                        </div>
                        <SegmentedControl name="Granularity" value={granularity} onChange={setGranularity} options={GRANULARITY_OPTIONS} />
                    </div>
                </div>
            </Reveal>

            {error && (
                <Reveal delay={30}>
                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                    </div>
                </Reveal>
            )}

            {/* KPI row */}
            <Reveal delay={60}>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
                    <KpiCard label="Revenue" value={totals.revenue} loading={isLoading} icon={Wallet}
                        chip="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" valueClass="text-stone-900 dark:text-stone-100" />
                    <KpiCard label="Cost" value={totals.cost} loading={isLoading} icon={Banknote}
                        chip="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400" valueClass="text-stone-900 dark:text-stone-100" />
                    <KpiCard label="Profit" value={totals.profit} loading={isLoading} icon={TrendingUp}
                        chip="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                        valueClass="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent dark:from-emerald-400 dark:to-emerald-300" />
                    <KpiCard label="Loss" value={totals.loss} loading={isLoading} icon={TrendingDown}
                        chip="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" valueClass="text-red-600 dark:text-red-400" />
                    <KpiCard label="Margin" value={totals.margin} loading={isLoading} icon={Percent}
                        chip="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" valueClass="text-stone-900 dark:text-stone-100"
                        formatter={(v) => `${v.toFixed(1)}%`} />
                </div>
            </Reveal>

            {/* Trend chart */}
            <Reveal delay={100}>
                <Panel icon={LineChart} title="Revenue, cost, profit & loss over time" subtitle="Loss is plotted as a dip below zero — toggle series or use a quick filter below">
                    {isLoading ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                    ) : trend.xLabels.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No data for this period.</p>
                    ) : (
                        <TrendAreaChart
                            xLabels={trend.xLabels}
                            valueFormatter={(v) => formatPKR(v)}
                            defaultHidden={['cost']}
                            presets={[
                                { label: 'All', keys: ['revenue', 'cost', 'profit', 'loss'] },
                                { label: 'Profit & Loss', keys: ['profit', 'loss'] },
                                { label: 'Revenue & Cost', keys: ['revenue', 'cost'] },
                            ]}
                            series={[
                                { key: 'revenue', name: 'Revenue', color: '#0ea5e9', values: trend.revenue, dash: 'solid' },
                                { key: 'cost', name: 'Cost', color: '#8b5cf6', values: trend.cost, dash: 'dashed' },
                                { key: 'profit', name: 'Profit', color: '#16a34a', values: trend.profit, dash: 'dotted' },
                                { key: 'loss', name: 'Loss', color: '#dc2626', values: trend.loss, dash: 'dashdot' },
                            ]}
                        />
                    )}
                </Panel>
            </Reveal>

            {/* Order status: snapshot + a readable composition-over-time view */}
            <Reveal delay={140}>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Panel icon={PieChart} title="Order status" subtitle="Current breakdown for the selected period">
                        {ordersLoading ? (
                            <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                        ) : (
                            <DonutChart segments={statusSegments} centerLabel="Orders" onSegmentClick={(seg) => handleStatusFilterChange(seg.label)} />
                        )}
                    </Panel>
                    <Panel icon={BarChart3} title="Order status over time" subtitle="Each bar is one month's orders, split by status — hover a segment for the exact count">
                        {ordersLoading ? (
                            <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                        ) : (
                            <>
                                <div className="mb-4 grid grid-cols-3 gap-2 rounded-md bg-stone-50 p-3 text-center dark:bg-stone-800/50">
                                    <div>
                                        <p className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400">{cancelReturnRate.cancelled}</p>
                                        <p className="text-[11px] text-stone-500 dark:text-stone-400">Cancelled</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold tabular-nums text-orange-600 dark:text-orange-400">{cancelReturnRate.returned}</p>
                                        <p className="text-[11px] text-stone-500 dark:text-stone-400">Returned</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold tabular-nums text-stone-900 dark:text-stone-100">{cancelReturnRate.rate.toFixed(1)}%</p>
                                        <p className="text-[11px] text-stone-500 dark:text-stone-400">Of all orders</p>
                                    </div>
                                </div>
                                <StatusTrendChart periods={statusPeriods} statusColors={STATUS_HEX} statusIcons={STATUS_ICONS} valueLabel="orders" />
                            </>
                        )}
                    </Panel>
                </div>
            </Reveal>

            {/* Loss activity */}
            <Reveal delay={180}>
                <Panel icon={CalendarDays} title="Loss activity" subtitle="Days with cancelled/returned orders — darker means more sunk cost that day">
                    {ordersLoading ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                    ) : lossHeatmapEntries.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No cancellations or returns in this period.</p>
                    ) : (
                        <HeatmapCalendar entries={lossHeatmapEntries} days={PERIOD_DAYS[period] ?? 180} onBoxClick={() => handleStatusFilterChange('Cancelled')} />
                    )}
                </Panel>
            </Reveal>

            {/* Individual orders — the drill-down that was missing */}
            <Reveal delay={220}>
                <Panel
                    icon={ClipboardList}
                    title="Orders in this period"
                    subtitle="Filter by status to see each order's own revenue and profit"
                    headerRight={
                        <div className="w-full sm:w-48">
                            <Select
                                value={statusFilter}
                                onChange={handleStatusFilterChange}
                                options={Object.keys(STATUS_HEX)}
                                placeholder="All statuses"
                            />
                        </div>
                    }
                >
                    {ordersLoading ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                    ) : orderRows.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No orders match this filter.</p>
                    ) : (
                        <>
                            <ul className="divide-y divide-stone-100 dark:divide-stone-800/60">
                                {orderRows.slice(0, visibleOrderRows).map(({ order, revenue, cost, profit, isLoss }) => {
                                    const StatusIcon = STATUS_ICONS[order.status] || Clock;
                                    return (
                                        <li key={order['$id']}>
                                            <button
                                                onClick={() => navigate(`/admin/orders/${order['$id']}`)}
                                                className="group flex w-full items-center justify-between gap-3 rounded-md py-2.5 text-sm transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                                            >
                                                <span className="flex min-w-0 items-center gap-2.5">
                                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${STATUS_BADGE_CLASSES[order.status] || 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'}`}>
                                                        <StatusIcon size={13} />
                                                    </span>
                                                    <span className="min-w-0 text-left">
                                                        <span className="block truncate font-medium text-stone-900 dark:text-stone-100">{order.name}</span>
                                                        <span className="block text-xs text-stone-400 dark:text-stone-500">
                                                            {new Date(order.$createdAt).toLocaleDateString()} · {order.status}
                                                        </span>
                                                    </span>
                                                </span>
                                                <span className="flex shrink-0 items-center gap-3">
                                                    <span className={`text-right tabular-nums ${isLoss ? 'text-red-600 dark:text-red-400' : 'text-stone-600 dark:text-stone-300'}`}>
                                                        {isLoss ? `-${formatPKR(cost)}` : formatPKR(revenue)}
                                                        {!isLoss && (
                                                            <span className="block text-[11px] text-stone-400 dark:text-stone-500">
                                                                +{formatPKR(profit)} profit
                                                            </span>
                                                        )}
                                                    </span>
                                                    <ChevronRight size={15} className="text-stone-300 transition-colors group-hover:text-brand-500 dark:text-stone-600" />
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                            {visibleOrderRows < orderRows.length && (
                                <button
                                    type="button"
                                    onClick={() => setVisibleOrderRows((v) => v + ORDER_ROWS_STEP)}
                                    className="mt-3 w-full rounded-md border border-stone-200 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-stone-700 dark:text-stone-300 dark:hover:border-brand-500/50 dark:hover:text-brand-400"
                                >
                                    Show {Math.min(ORDER_ROWS_STEP, orderRows.length - visibleOrderRows)} more
                                </button>
                            )}
                        </>
                    )}
                </Panel>
            </Reveal>

            {/* Individual products */}
            <Reveal delay={260}>
                <Panel icon={Package} title="Top products by profit" subtitle="Non-loss orders only, ranked by contribution — bar length shows relative size">
                    {isLoading ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                    ) : productRows.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No product sales in this period.</p>
                    ) : (
                        <ul className="space-y-3">
                            {productRows.map((p) => {
                                const isNegative = p.profit < 0;
                                const pct = (Math.abs(p.profit) / maxProductProfit) * 100;
                                return (
                                    <li key={p.productId}>
                                        <div className="mb-1 flex items-center justify-between text-xs">
                                            <span className="truncate font-medium text-stone-700 dark:text-stone-300">{p.name}</span>
                                            <span className={`shrink-0 tabular-nums ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-stone-500 dark:text-stone-400'}`}>
                                                {isNegative ? '-' : '+'}{formatPKR(Math.abs(p.profit))} · {p.units} sold
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ease-out ${isNegative ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Panel>
            </Reveal>
        </div>
    );
}

function Panel({ icon: Icon, title, subtitle, children, headerRight, className = '' }) {
    return (
        <div className={`overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900 ${className}`}>
            <div className="flex flex-col gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-800/40 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex items-start gap-2">
                    {Icon && <Icon size={16} className="mt-0.5 shrink-0 text-stone-400 dark:text-stone-500" />}
                    <div>
                        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
                        {subtitle && <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>}
                    </div>
                </div>
                {headerRight}
            </div>
            <div className="p-4 sm:p-5">{children}</div>
        </div>
    );
}

function KpiCard({ label, value, loading, icon: Icon, chip, valueClass, formatter = formatPKR }) {
    return (
        <div className="flex min-h-[100px] flex-col items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white p-3.5 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 sm:p-4">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${chip}`}>
                <Icon size={15} />
            </span>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</p>
            <p className={`text-lg font-bold tabular-nums sm:text-xl ${valueClass}`}>{loading ? '—' : formatter(value)}</p>
        </div>
    );
}

export default AdminFinance;