import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import service from '../../backend/service';
import { user } from '../../backend';
import { fetchAllOrdersAdmin } from '../../store/slices/orderSlice'; // ⚠️ adjust path
import { fetchAllAnnouncementsAdmin } from '../../store/slices/announcementSlice'; // ⚠️ adjust path
import { ORDER_STATUS_PRIORITY } from '../../backend/order';

import { HeatmapCalendar, DonutChart, GroupedBarChart, Toggle } from '../../ui';
import {
    ShieldCheck, Sparkles, TrendingUp, AlertTriangle,
    Package, Tags, Layers, ShoppingCart, Users, ShieldAlert, Megaphone,
} from 'lucide-react';

// Same status -> color mapping used in AdminOrders.jsx, kept in sync so a
// status reads identically wherever it appears in the admin panel.
const STATUS_COLORS = {
    Pending: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    Processing: 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-500',
    Delivered: 'bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    Returned: 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
    Cancelled: 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400',
};

// The users table has a single `label` column — one of these four strings —
// rather than an array. Colors double as the donut's legend order. Red is
// reserved for "Blocked" (it wins over whatever role the account has) so it
// reads as the one status that needs attention, matching the red "Blocked"
// badge already used in AdminUsers/AdminUserProfile.
const ROLE_COLORS = {
    blocked: '#dc2626',
    admin: '#55ff56',
    manager: '#d9aa06',
    support: '#2563eb',
    regular: '#7aa1ac',
};

// blocked always wins over label — a blocked admin still counts as
// "Blocked" in the chart, not "Admin".
function roleFor(user) {
    if (user?.blocked) return 'blocked';
    const key = (user?.label || '').toLowerCase();
    return ROLE_COLORS[key] ? key : 'regular';
}

// Per-stat-card accent — icon chip color + value gradient, so the row
// reads as distinct categories rather than eight identical stone tiles.
const STAT_THEMES = {
    products: {
        chip: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
        value: 'text-stone-900 dark:text-stone-100',
    },
    categories: {
        chip: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
        value: 'text-stone-900 dark:text-stone-100',
    },
    groups: {
        chip: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400',
        value: 'text-stone-900 dark:text-stone-100',
    },
    orders: {
        chip: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
        value: 'text-stone-900 dark:text-stone-100',
    },
    revenue: {
        chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
        value: 'bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent dark:from-emerald-400 dark:to-emerald-300',
    },
    users: {
        chip: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
        value: 'text-stone-900 dark:text-stone-100',
    },
    blocked: {
        chip: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
        value: 'text-red-600 dark:text-red-400',
    },
    announcements: {
        chip: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
        value: 'text-stone-900 dark:text-stone-100',
    },
};

// Staggered entrance wrapper — each section fades + rises in on mount,
// offset by `delay` ms, so the dashboard reveals itself top-to-bottom
// instead of popping in all at once. Pure CSS transition, no library.
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

// Counts up from 0 to `value` with an ease-out curve.
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

function AdminDashboard() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const userData = useSelector((s) => s.user.userData);
    const adminName = userData?.name || userData?.username || 'Admin';

    const { items: orders, status: ordersStatus } = useSelector((s) => s.orders.adminList);
    const { items: announcements, status: announcementsStatus } = useSelector(
        (s) => s.announcements.admin.list
    );

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState({});
    const [groups, setGroups] = useState({});
    const [users, setUsers] = useState([]);
    const [loadingLocal, setLoadingLocal] = useState(true);
    const [error, setError] = useState(null);

    // Which series the heatmap is showing. false = orders (the default,
    // matching how the panel behaved before the toggle existed).
    const [showProducts, setShowProducts] = useState(true);

    useEffect(() => {
        dispatch(fetchAllOrdersAdmin());
        dispatch(fetchAllAnnouncementsAdmin());
    }, [dispatch]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setLoadingLocal(true);
                setError(null);

                const [productRows, categoryMap, groupMap, userRows] = await Promise.all([
                    service.getProducts({}),
                    service.listCategories(),
                    service.listGroups({}),
                    user.getProfile({ requesterLabels: userData?.labels, requesterId: userData?.['$id'] }),
                ]);

                if (cancelled) return;
                setProducts(Array.isArray(productRows) ? productRows : []);
                setCategories(categoryMap && categoryMap !== false ? categoryMap : {});
                setGroups(groupMap && groupMap !== false ? groupMap : {});
                setUsers(Array.isArray(userRows) ? userRows : []);
            } catch (err) {
                if (!cancelled) setError('Some dashboard data failed to load.');
            } finally {
                if (!cancelled) setLoadingLocal(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userData]);

    const ordersByStatus = useMemo(() => {
        const counts = {};
        orders.forEach((o) => {
            counts[o.status] = (counts[o.status] || 0) + 1;
        });
        return counts;
    }, [orders]);

    const sortedStatuses = useMemo(
        () =>
            Object.keys(ordersByStatus).sort(
                (a, b) => (ORDER_STATUS_PRIORITY[a] ?? 99) - (ORDER_STATUS_PRIORITY[b] ?? 99)
            ),
        [ordersByStatus]
    );

    const revenue = useMemo(
        () => orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
        [orders]
    );

    const recentOrders = useMemo(
        () => [...orders].sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt)).slice(0, 5),
        [orders]
    );

    // One entry per order, dated by creation day — HeatmapCalendar buckets
    // and sums these itself.
    const orderHeatmapEntries = useMemo(
        () => orders.filter((o) => o.$createdAt).map((o) => ({ date: new Date(o.$createdAt), count: 1 })),
        [orders]
    );

    // One entry per product, dated by creation day. Same shape as the order
    // entries above, so the same calendar renders either series — products
    // are already loaded for the stat cards, so this costs no extra request.
    const productHeatmapEntries = useMemo(
        () => products.filter((p) => p.$createdAt).map((p) => ({ date: new Date(p.$createdAt), count: 1 })),
        [products]
    );

    const ordersLoading = ordersStatus === 'loading' || ordersStatus === 'idle';

    // Resolving the toggle into one object up here keeps the JSX below free
    // of a ternary on every prop.
    const heatmap = showProducts
        ? {
              title: 'Products over time',
              entries: productHeatmapEntries,
              unitLabel: 'product',
              loading: loadingLocal,
              emptyText: 'No products yet.',
          }
        : {
              title: 'Orders over time',
              entries: orderHeatmapEntries,
              unitLabel: 'order',
              loading: ordersLoading,
              emptyText: 'No orders yet.',
          };

    const blockedUsersCount = users.filter((u) => u.blocked).length;
    const activeAnnouncementsCount = announcements.filter((a) => a.active).length;

    const roleSegments = useMemo(() => {
        const counts = { blocked: 0, admin: 0, manager: 0, support: 0, regular: 0 };
        users.forEach((u) => {
            counts[roleFor(u)] += 1;
        });
        return [
            { label: 'Blocked', value: counts.blocked, color: ROLE_COLORS.blocked },
            { label: 'Admin', value: counts.admin, color: ROLE_COLORS.admin },
            { label: 'Manager', value: counts.manager, color: ROLE_COLORS.manager },
            { label: 'Support', value: counts.support, color: ROLE_COLORS.support },
            { label: 'Regular', value: counts.regular, color: ROLE_COLORS.regular },
        ];
    }, [users]);

    const announcementBars = useMemo(
        () =>
            [...announcements]
                .sort((a, b) => (b.likesCount ?? 0) + (b.dislikesCount ?? 0) - ((a.likesCount ?? 0) + (a.dislikesCount ?? 0)))
                .slice(0, 6)
                .map((a) => ({
                    label: a.title,
                    bars: [
                        { name: 'Likes', value: a.likesCount ?? 0, color: '#16a34a' },
                        { name: 'Dislikes', value: a.dislikesCount ?? 0, color: '#dc2626' },
                    ],
                })),
        [announcements]
    );

    return (
        <div className="space-y-6">
            {/* Scoped keyframes — gradient shimmer on the welcome name and a
                gentle pulse for the header badge. Kept local to this file. */}
            <style>{`
                @keyframes admin-gradient-shimmer {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>

            {/* WELCOME HEADER — was a plain <h1>, now matches the User panel's
                treatment: gradient shimmer on the name, eyebrow badge,
                shield icon to signal "admin" context at a glance. */}
            <Reveal delay={0}>
                <div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-500">
                        <ShieldCheck size={14} />
                        Admin Dashboard
                    </span>
                    <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                        <span
                            className="bg-gradient-to-r from-brand-600 via-emerald-500 to-brand-600 bg-[length:200%_auto] bg-clip-text text-transparent dark:from-brand-400 dark:via-emerald-400 dark:to-brand-400"
                            style={{ animation: 'admin-gradient-shimmer 6s ease infinite' }}
                        >
                            Welcome back, {adminName}
                        </span>
                        <Sparkles size={20} className="text-amber-500 dark:text-amber-400" aria-hidden="true" />
                    </h1>
                    <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                        An overview of your store right now — tap any card to jump straight to it.
                    </p>
                </div>
            </Reveal>

            {error && (
                <Reveal delay={50}>
                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                    </div>
                </Reveal>
            )}

            {/* Charts up top */}
            <Reveal delay={100}>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Panel title="Users by role" subtitle="Blocked accounts are called out first, regardless of role — everyone else is grouped by label">
                        {loadingLocal ? (
                            <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                        ) : (
                            <DonutChart segments={roleSegments} centerLabel="Users" />
                        )}
                    </Panel>

                    <Panel title="Announcement engagement" subtitle="Likes vs. dislikes, top 6 by activity">
                        {announcementsStatus === 'loading' ? (
                            <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                        ) : (
                            <GroupedBarChart
                                items={announcementBars}
                                legend={[
                                    { name: 'Likes', color: '#16a34a' },
                                    { name: 'Dislikes', color: '#dc2626' },
                                ]}
                            />
                        )}
                    </Panel>
                </div>
            </Reveal>

            {/* Stat cards — now color-coded per category, values animate up
                on mount, revenue gets a gradient treatment like the money
                figure on the User panel. */}
            <Reveal delay={150}>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                    <StatCard
                        label="Products"
                        value={products.length}
                        loading={loadingLocal}
                        theme={STAT_THEMES.products}
                        icon={Package}
                        onClick={() => navigate('/admin/products')}
                    />
                    <StatCard
                        label="Categories"
                        value={Object.keys(categories).length}
                        loading={loadingLocal}
                        theme={STAT_THEMES.categories}
                        icon={Tags}
                        onClick={() => navigate('/admin/products', { state: { view: 'categories' } })}
                    />
                    <StatCard
                        label="Groups"
                        value={Object.keys(groups).length}
                        loading={loadingLocal}
                        theme={STAT_THEMES.groups}
                        icon={Layers}
                        onClick={() => navigate('/admin/products', { state: { view: 'groups' } })}
                    />
                    <StatCard
                        label="Orders"
                        value={orders.length}
                        loading={ordersLoading}
                        theme={STAT_THEMES.orders}
                        icon={ShoppingCart}
                        onClick={() => navigate('/admin/orders')}
                    />
                    <StatCard
                        label="Revenue"
                        value={revenue}
                        formatter={(v) => `Rs. ${v.toLocaleString()}`}
                        loading={ordersLoading}
                        theme={STAT_THEMES.revenue}
                        icon={TrendingUp}
                        onClick={() => navigate('/admin/orders')}
                    />
                    <StatCard
                        label="Users"
                        value={users.length}
                        loading={loadingLocal}
                        theme={STAT_THEMES.users}
                        icon={Users}
                        onClick={() => navigate('/admin/users', { state: { filter: 'all' } })}
                    />
                    <StatCard
                        label="Blocked Users"
                        value={blockedUsersCount}
                        loading={loadingLocal}
                        theme={STAT_THEMES.blocked}
                        icon={ShieldAlert}
                        onClick={() => navigate('/admin/users', { state: { filter: 'blocked' } })}
                    />
                    <StatCard
                        label="Announcements"
                        value={`${activeAnnouncementsCount} active / ${announcements.length}`}
                        loading={announcementsStatus === 'loading'}
                        theme={STAT_THEMES.announcements}
                        icon={Megaphone}
                        raw
                        onClick={() => navigate('/admin/announcements')}
                    />
                </div>
            </Reveal>

            {/* Orders section — bottom, as before. The heatmap now covers both
                orders and products, switched by the toggle in the panel head. */}
            <Reveal delay={200}>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Panel
                        title={heatmap.title}
                        className="lg:col-span-2"
                        action={
                            <div className="flex items-center gap-2 text-xs font-medium">
                                <span
                                    className={
                                        showProducts
                                            ? 'text-stone-400 dark:text-stone-500'
                                            : 'text-stone-900 dark:text-stone-100'
                                    }
                                >
                                    Orders
                                </span>
                                <Toggle
                                    checked={showProducts}
                                    onChange={setShowProducts}
                                    size="sm"
                                    label="Show products instead of orders"
                                />
                                <span
                                    className={
                                        showProducts
                                            ? 'text-stone-900 dark:text-stone-100'
                                            : 'text-stone-400 dark:text-stone-500'
                                    }
                                >
                                    Products
                                </span>
                            </div>
                        }
                    >
                        {heatmap.loading && (
                            <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                        )}
                        {!heatmap.loading && heatmap.entries.length === 0 && (
                            <p className="text-sm text-stone-500 dark:text-stone-400">{heatmap.emptyText}</p>
                        )}
                        {!heatmap.loading && heatmap.entries.length > 0 && (
                            // `key` remounts the calendar on switch so the
                            // staggered draw-in replays for the new series.
                            // Drop it if you'd rather the squares recolor in place.
                            <HeatmapCalendar
                                key={showProducts ? 'products' : 'orders'}
                                entries={heatmap.entries}
                                weeks={26}
                                unitLabel={heatmap.unitLabel}
                            />
                        )}
                    </Panel>

                    <Panel title="Orders by status">
                        {ordersLoading && <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>}
                        {!ordersLoading && sortedStatuses.length === 0 && (
                            <p className="text-sm text-stone-500 dark:text-stone-400">No orders yet.</p>
                        )}
                        {!ordersLoading && sortedStatuses.length > 0 && (
                            <ul className="space-y-2">
                                {sortedStatuses.map((statusName) => (
                                    <li key={statusName}>
                                        <button
                                            onClick={() => navigate('/admin/orders')}
                                            className="flex w-full items-center justify-between rounded-md px-1 py-1 text-sm transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                                        >
                                            <span
                                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                                    STATUS_COLORS[statusName] ||
                                                    'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                                                }`}
                                            >
                                                {statusName}
                                            </span>
                                            <span className="tabular-nums text-stone-900 dark:text-stone-100">
                                                <AnimatedNumber value={ordersByStatus[statusName]} />
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    <Panel title="Recent orders">
                        {ordersLoading && <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>}
                        {!ordersLoading && recentOrders.length === 0 && (
                            <p className="text-sm text-stone-500 dark:text-stone-400">No orders yet.</p>
                        )}
                        {!ordersLoading && recentOrders.length > 0 && (
                            <ul className="divide-y divide-stone-100 dark:divide-stone-800/60">
                                {recentOrders.map((o) => (
                                    <li key={o['$id']}>
                                        <button
                                            onClick={() => navigate(`/admin/orders/${o['$id']}`)}
                                            className="flex w-full items-center justify-between gap-3 rounded-md py-2 text-sm transition-colors hover:bg-stone-50 hover:text-brand-600 dark:hover:bg-stone-800 dark:hover:text-brand-500"
                                        >
                                            <span className="truncate text-stone-900 dark:text-stone-100">{o.name}</span>
                                            <span className="shrink-0 tabular-nums text-stone-500 dark:text-stone-400">Rs. {o.total}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>
            </Reveal>
        </div>
    );
}

// `action` is an optional right-hand slot in the panel head (used by the
// heatmap panel for its Orders/Products toggle). Existing callers that
// don't pass it render exactly as before.
function Panel({ title, subtitle, children, className = '', action }) {
    return (
        <div className={`overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900 ${className}`}>
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-800/40 sm:px-5">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
                    {subtitle && <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className="p-4 sm:p-5">{children}</div>
        </div>
    );
}

function StatCard({ label, value, loading, onClick, theme, icon: Icon, formatter, raw = false }) {
    const chipClass = theme?.chip || 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400';
    const valueClass = theme?.value || 'text-stone-900 dark:text-stone-100';
    const isNumeric = typeof value === 'number';

    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex min-h-[100px] flex-col items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white p-3.5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-brand-500/50 sm:p-4"
        >
            {Icon && (
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${chipClass}`}>
                    <Icon size={15} />
                </span>
            )}
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</p>
            <p className={`text-xl font-bold tabular-nums sm:text-2xl ${valueClass}`}>
                {loading ? (
                    '—'
                ) : raw || !isNumeric ? (
                    value
                ) : (
                    <AnimatedNumber value={value} formatter={formatter} />
                )}
            </p>
        </button>
    );
}

export default AdminDashboard;