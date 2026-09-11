import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import { Package, ChevronRight, X } from 'lucide-react';
import { useEffect } from 'react';
import { fetchUserOrders } from '../store/slices/orderSlice';
import { Select, DonutChart, HeatmapCalendar, OrdersByMonthChart } from '../ui';

const DAY_MS = 24 * 60 * 60 * 1000;

const PERIOD_OPTIONS = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '180d', label: 'Last 6 months' },
    { value: '365d', label: 'Last year' },
    { value: 'all', label: 'All time' },
];
const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90, '180d': 180, '365d': 365 };

const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const CHART_COLORS = ['#0ea5e9', '#f97316', '#8b5cf6', '#10b981', '#ef4444', '#eab308', '#6366f1', '#14b8a6'];

function getPeriodCutoff(period) {
    const days = PERIOD_DAYS[period];
    if (!days) return null; // 'all'
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days + 1);
    return cutoff;
}

function Orders() {
    const { username } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { items, status, error } = useSelector((s) => s.orders.list);

    const [period, setPeriod] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [selectedBucket, setSelectedBucket] = useState(null);

    useEffect(() => {
        if (username) dispatch(fetchUserOrders({ username }));
    }, [dispatch, username]);

    const filteredItems = useMemo(() => {
        const cutoff = getPeriodCutoff(period);
        if (!cutoff) return items;
        return items.filter((o) => new Date(o.$createdAt) >= cutoff);
    }, [items, period]);

    const statusSegments = useMemo(() => {
        return ORDER_STATUSES.map((label, i) => ({
            label,
            value: filteredItems.filter((o) => o.status === label).length,
            color: CHART_COLORS[i % CHART_COLORS.length],
        }));
    }, [filteredItems]);

    const statusFilteredOrders = useMemo(() => {
        if (!selectedStatus) return [];
        return filteredItems.filter((o) => o.status === selectedStatus);
    }, [filteredItems, selectedStatus]);

    const heatmapEntries = useMemo(() => {
        return filteredItems
            .filter((o) => o.$createdAt)
            .map((o) => ({ date: o.$createdAt, count: 1, item: o }));
    }, [filteredItems]);

    const heatmapDays = useMemo(() => {
        if (period !== 'all') return PERIOD_DAYS[period] ?? 90;
        if (items.length === 0) return 90;
        const oldest = items.reduce((min, o) => Math.min(min, new Date(o.$createdAt).getTime()), Date.now());
        return Math.max(1, Math.ceil((Date.now() - oldest) / DAY_MS) + 1);
    }, [period, items]);

    const bucketOrders = selectedBucket?.items ?? [];

    function handlePeriodChange(value) {
        setPeriod(value);
        setSelectedStatus(null);
        setSelectedBucket(null);
    }

    function handleSegmentClick(seg) {
        setSelectedStatus((prev) => (prev === seg.label ? null : seg.label));
    }

    function handleBucketClick(bucket) {
        setSelectedBucket(bucket);
    }

    if (status === 'loading' || status === 'idle') {
        return <p className="text-sm text-stone-500 dark:text-stone-400">Loading your orders...</p>;
    }
    if (status === 'failed') {
        return <p className="text-sm text-red-600 dark:text-red-400">Could not load orders: {error}</p>;
    }

    return (
        <div className="space-y-6">
            <Header period={period} onPeriodChange={handlePeriodChange} />

            {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-8 text-center dark:border-stone-700 dark:bg-stone-900">
                    <p className="text-sm text-stone-500 dark:text-stone-400">You have no orders yet.</p>
                </div>
            ) : (
                <>
                    {/* 1 & 2 — donut + monthly trend, side by side */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="rounded-lg border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                            <h2 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-100">
                                Order status breakdown
                            </h2>
                            <DonutChart segments={statusSegments} centerLabel="Orders" onSegmentClick={handleSegmentClick} />
                            <p className="mt-4 text-center text-xs text-stone-400 dark:text-stone-500">
                                Click a status to see those orders below.
                            </p>
                        </div>
                        <div className="rounded-lg border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                            <h2 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-100">
                                Orders by month
                            </h2>
                            <OrdersByMonthChart orders={filteredItems} />
                        </div>
                    </div>

                    {/* status click-through */}
                    {selectedStatus && (
                        <OrderResultPanel
                            title={`Orders — ${selectedStatus}`}
                            orders={statusFilteredOrders}
                            username={username}
                            navigate={navigate}
                            onClear={() => setSelectedStatus(null)}
                        />
                    )}

                    {/* 3 — the main list */}
                    <section>
                        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">All orders</h2>
                        {filteredItems.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-8 text-center dark:border-stone-700 dark:bg-stone-900">
                                <p className="text-sm text-stone-500 dark:text-stone-400">No orders in this period.</p>
                                <button
                                    type="button"
                                    onClick={() => handlePeriodChange('all')}
                                    className="mt-2 text-sm font-medium text-brand-600 hover:underline dark:text-brand-500"
                                >
                                    Clear filter
                                </button>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {filteredItems.map((order) => (
                                    <OrderRow key={order.$id} order={order} username={username} navigate={navigate} />
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* 4 — heatmap, always last */}
                    <div className="rounded-lg border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                        <h2 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-100">Order activity</h2>
                        <HeatmapCalendar entries={heatmapEntries} days={heatmapDays} weeks={12} onBoxClick={handleBucketClick} />
                    </div>

                    {selectedBucket && (
                        <OrderResultPanel
                            title={
                                selectedBucket.start.toDateString() === selectedBucket.end.toDateString()
                                    ? `Orders — ${selectedBucket.start.toLocaleDateString()}`
                                    : `Orders — ${selectedBucket.start.toLocaleDateString()} to ${selectedBucket.end.toLocaleDateString()}`
                            }
                            orders={bucketOrders}
                            username={username}
                            navigate={navigate}
                            onClear={() => setSelectedBucket(null)}
                        />
                    )}
                </>
            )}
        </div>
    );
}

// Shared row used by the main list AND both click-through panels, so the
// three places orders are listed never drift out of sync visually.
function OrderRow({ order, username, navigate }) {
    return (
        <li
            onClick={() => navigate(`/${username}/orders/${order.$id}`)}
            className="group flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-stone-200 bg-cream p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
        >
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <Package size={16} />
                </span>
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-stone-900 dark:text-stone-100">Order #{order.$id}</span>
                        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-400">
                            {order.status}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                        Rs. {order.total} · {order.orderDetails.length} item(s)
                    </p>
                </div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-stone-300 transition-colors group-hover:text-brand-500 dark:text-stone-600" />
        </li>
    );
}

// Click-through result panel — used for both "status selected on the
// donut" and "date bucket selected on the heatmap".
function OrderResultPanel({ title, orders, username, navigate, onClear }) {
    return (
        <div className="rounded-lg border border-stone-200 bg-cream shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between rounded-t-lg border border-brand-200 bg-brand-50 px-4 py-2.5 dark:border-brand-500/30 dark:bg-brand-500/10">
                <p className="text-sm font-medium text-brand-700 dark:text-brand-400">
                    {title} · {orders.length} order{orders.length === 1 ? '' : 's'}
                </p>
                <button
                    type="button"
                    onClick={onClear}
                    title="Clear selection"
                    aria-label="Clear selection"
                    className="rounded-md p-1 text-brand-600 transition-colors hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-500/20"
                >
                    <X size={14} />
                </button>
            </div>
            <div className="p-4">
                {orders.length === 0 ? (
                    <p className="text-sm text-stone-500 dark:text-stone-400">No orders found.</p>
                ) : (
                    <ul className="space-y-3">
                        {orders.map((order) => (
                            <OrderRow key={order.$id} order={order} username={username} navigate={navigate} />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

function Header({ period, onPeriodChange }) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p className="text-sm font-semibold text-brand-600 dark:text-brand-500">Account overview</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Your Orders</h1>
                <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Review your recent purchases and order status.</p>
            </div>
            <div className="w-full sm:w-48">
                <Select value={period} onChange={onPeriodChange} options={PERIOD_OPTIONS} placeholder="Time period" />
            </div>
        </div>
    );
}

export default Orders;