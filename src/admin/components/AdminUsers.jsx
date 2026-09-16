// Suggested location: src/pages/admin/AdminUsers.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router';
import {
    Users as UsersIcon,
    UserCheck,
    ShieldOff,
    UserPlus,
    Lock,
    Search,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import { user } from '../../backend'; // ⚠️ adjust path to match your project
import { setUser } from '../../store/slices/userSlice'; // ⚠️ adjust path to match your project
import { normalizeUserRows } from '../../utils/userLabels'; // ⚠️ adjust path to match your project
import { getHighestRole, canModerate, initials, RoleBadge, ROLE_META, ROLE_ORDER } from '../../constants/roles'; // ⚠️ adjust path to match your project

import {
    SegmentedControl,
    Toggle,
    Select,
    DonutChart,
    GroupedBarChart,
    TrendAreaChart,
    HeatmapCalendar,
} from '../../ui';

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'blocked', label: 'Blocked' },
];

const TREND_RANGE_OPTIONS = [
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'All' },
];

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: null };

// Semantic colors for status (matches the Active/Blocked pills already used
// in the table below), kept separate from the role palette in constants/roles.
const STATUS_COLORS = { active: '#16a34a', blocked: '#dc2626' };

// ---------------------------------------------------------------------------
// Chart data helpers
// ---------------------------------------------------------------------------

// A running total of ALL users (not just new signups in a bucket), windowed
// to the selected time range. Picking "7D"/"30D"/etc. doesn't just change
// how the x-axis is labeled — it restricts which slice of the growth curve
// is drawn, while the line itself still reflects the complete user count up
// to that point (it never resets to 0 at the window's edge).
function buildUserGrowthTrend(rows, range) {
    const dated = rows
        .filter((r) => r['$createdAt'])
        .map((r) => new Date(r['$createdAt']))
        .sort((a, b) => a.getTime() - b.getTime());

    if (dated.length === 0) {
        return { xLabels: [], values: [], granularity: 'day', total: 0 };
    }

    const now = new Date();
    const oldest = dated[0];
    const rangeDays = RANGE_DAYS[range];
    const rangeStart = rangeDays ? new Date(now.getTime() - rangeDays * 86400000) : oldest;
    const effectiveStart = rangeStart < oldest ? oldest : rangeStart; // never before the first real signup

    const spanDays = Math.max(1, (now.getTime() - effectiveStart.getTime()) / 86400000);
    const granularity = spanDays > 365 ? 'quarter' : spanDays > 120 ? 'month' : spanDays > 30 ? 'week' : 'day';

    function periodStart(d) {
        const c = new Date(d);
        if (granularity === 'day') {
            c.setHours(0, 0, 0, 0);
            return c;
        }
        if (granularity === 'week') {
            const isoDay = (c.getDay() + 6) % 7; // Monday-start week
            c.setDate(c.getDate() - isoDay);
            c.setHours(0, 0, 0, 0);
            return c;
        }
        if (granularity === 'month') return new Date(c.getFullYear(), c.getMonth(), 1);
        const q = Math.floor(c.getMonth() / 3);
        return new Date(c.getFullYear(), q * 3, 1);
    }

    function nextPeriod(d) {
        const c = new Date(d);
        if (granularity === 'day') c.setDate(c.getDate() + 1);
        else if (granularity === 'week') c.setDate(c.getDate() + 7);
        else if (granularity === 'month') c.setMonth(c.getMonth() + 1);
        else c.setMonth(c.getMonth() + 3);
        return c;
    }

    function labelFor(d) {
        if (granularity === 'day' || granularity === 'week') {
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
        if (granularity === 'month') return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
        return `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
    }

    // Walk period-by-period from the window start to now, carrying a
    // running total of every signup counted so far — including everyone
    // who joined before the window opened, so the line always reads as
    // "total users", not "users who joined during this window".
    let dateIdx = 0;
    let runningTotal = 0;
    let cursor = periodStart(effectiveStart);
    while (dateIdx < dated.length && dated[dateIdx] < cursor) {
        runningTotal += 1;
        dateIdx += 1;
    }

    const xLabels = [];
    const values = [];
    while (cursor <= now) {
        const periodEnd = nextPeriod(cursor);
        while (dateIdx < dated.length && dated[dateIdx] < periodEnd) {
            runningTotal += 1;
            dateIdx += 1;
        }
        xLabels.push(labelFor(cursor));
        values.push(runningTotal);
        cursor = periodEnd;
    }

    return { xLabels, values, granularity, total: dated.length };
}

function buildRoleSegments(rows) {
    const counts = { admin: 0, manager: 0, support: 0, regular: 0 };
    for (const r of rows) counts[getHighestRole(r.label)] += 1;
    return ROLE_ORDER.map((role) => ({
        label: ROLE_META[role].label,
        value: counts[role],
        color: ROLE_META[role].chart,
        role,
    }));
}

// Active vs. blocked headcount per role — pairs with the donut chart so a
// viewer can see both the mix of roles and how "healthy" each role's
// accounts are, side by side. Shaped for GroupedBarChart's real API:
// items: [{ label, bars: [{ name, value, color }] }].
function buildRoleStatusBreakdown(rows) {
    const counts = {};
    for (const role of ROLE_ORDER) counts[role] = { active: 0, blocked: 0 };
    for (const r of rows) {
        const role = getHighestRole(r.label);
        if (r.blocked) counts[role].blocked += 1;
        else counts[role].active += 1;
    }
    return ROLE_ORDER.map((role) => ({
        label: ROLE_META[role].label,
        bars: [
            { name: 'Active', value: counts[role].active, color: STATUS_COLORS.active },
            { name: 'Blocked', value: counts[role].blocked, color: STATUS_COLORS.blocked },
        ],
    }));
}

const ROLE_STATUS_LEGEND = [
    { name: 'Active', color: STATUS_COLORS.active },
    { name: 'Blocked', color: STATUS_COLORS.blocked },
];

// Span of the data in days, used only to size the heatmap window.
function computeSpanDays(rows) {
    const times = rows.map((r) => r['$createdAt']).filter(Boolean).map((d) => new Date(d).getTime());
    if (times.length === 0) return 0;
    return (Date.now() - Math.min(...times)) / (1000 * 60 * 60 * 24);
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

function StatCard({ icon: Icon, label, value, accent }) {
    return (
        <div className="group flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-brand-500/50">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 ${accent}`}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</p>
                <p className="text-xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
                    <AnimatedNumber value={value} />
                </p>
            </div>
        </div>
    );
}

function ChartCard({ title, subtitle, children, className = '' }) {
    return (
        <div className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-colors hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700 ${className}`}>
            <div className="mb-3">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h3>
                {subtitle && <p className="text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}

// One small, orchestrated entrance for the stat row on load — a single
// staggered reveal rather than scattered fades on every element. Purely
// mount-driven, so it never fires again on re-renders (e.g. after a block
// toggle updates `rows`).
function Reveal({ children, delay = 0, className = '' }) {
    const [shown, setShown] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setShown(true), delay);
        return () => clearTimeout(t);
    }, [delay]);
    return (
        <div className={`transition-all duration-500 ease-out ${shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'} ${className}`}>
            {children}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
function AdminUsers() {
    const dispatch = useDispatch();
    const userData = useSelector((s) => s.user.userData);
    // Source of truth for the table lives in redux (`allCols`) instead of
    // local component state — see AdminLayout's sidebar hover-prefetch.
    const allCols = useSelector((s) => s.user.allCols);
    const navigate = useNavigate();
    const location = useLocation();

    const rows = allCols || [];
    const [loading, setLoading] = useState(allCols === null);
    const [error, setError] = useState(null);
    const [blockingId, setBlockingId] = useState(null);
    const [filter, setFilter] = useState(location.state?.filter || 'all');
    const [roleFilter, setRoleFilter] = useState(''); // '' = all roles
    const [term, setTerm] = useState('');
    const [trendRange, setTrendRange] = useState('all');

    const currentUserId = userData?.['$id'];
    const currentUserRole = getHighestRole(userData?.label);

    useEffect(() => {
        // Already cached — either from a previous visit or from hovering
        // the "Users" link in the sidebar before navigating here.
        if (allCols !== null) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);
                const all = await user.getProfile({
                    requesterLabels: userData?.labels,
                    requesterId: userData?.['$id'],
                });
                if (!cancelled) dispatch(setUser(normalizeUserRows(all)));
            } catch (err) {
                if (!cancelled) setError('Failed to load users.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
        // Intentionally only re-runs when the requesting user changes — not
        // on every `allCols` update (e.g. after a block toggle), or this
        // would re-fetch in a loop.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData]);

    async function handleToggleBlock(row) {
        const targetRole = getHighestRole(row.label);
        const isSelf = row['$id'] === currentUserId;

        if (!canModerate(currentUserRole, targetRole, isSelf)) {
            alert(
                isSelf
                    ? "You can't block or unblock your own account."
                    : `Your role (${ROLE_META[currentUserRole].label}) doesn't have permission to moderate a ${ROLE_META[targetRole].label} account.`
            );
            return;
        }

        setBlockingId(row['$id']);
        const nextBlocked = !row.blocked;
        const result = await user.setBlocked({ rowId: row['$id'], blocked: nextBlocked });
        setBlockingId(null);

        if (!result) {
            alert('Failed to update block status.');
            return;
        }

        dispatch(
            setUser(rows.map((r) => (r['$id'] === row['$id'] ? { ...r, blocked: nextBlocked } : r)))
        );
    }

    function openProfile(row) {
        navigate(`/admin/users/${row.username}`);
    }

    const roleOptions = useMemo(() => {
        const found = new Set(rows.map((r) => getHighestRole(r.label)));
        return ROLE_ORDER.filter((r) => found.has(r)).map((r) => ({ value: r, label: ROLE_META[r].label }));
    }, [rows]);

    const filteredRows = useMemo(() => {
        let list = rows;
        if (filter === 'active') list = list.filter((r) => !r.blocked);
        if (filter === 'blocked') list = list.filter((r) => r.blocked);
        if (roleFilter) list = list.filter((r) => getHighestRole(r.label) === roleFilter);

        if (term.trim()) {
            const q = term.trim().toLowerCase();
            list = list.filter(
                (r) =>
                    r.username?.toLowerCase().includes(q) ||
                    r.name?.toLowerCase().includes(q) ||
                    r.email?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [rows, filter, roleFilter, term]);

    const stats = useMemo(() => {
        const total = rows.length;
        const blocked = rows.filter((r) => r.blocked).length;
        const active = total - blocked;
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const newThisWeek = rows.filter((r) => {
            const t = r['$createdAt'] ? new Date(r['$createdAt']).getTime() : 0;
            return t >= weekAgo;
        }).length;
        return { total, active, blocked, newThisWeek };
    }, [rows]);

    const roleSegments = useMemo(() => buildRoleSegments(rows), [rows]);
    const roleStatusBreakdown = useMemo(() => buildRoleStatusBreakdown(rows), [rows]);
    const signupTrend = useMemo(() => buildUserGrowthTrend(rows, trendRange), [rows, trendRange]);
    const heatmapEntries = useMemo(
        () => rows.filter((r) => r['$createdAt']).map((r) => ({ date: r['$createdAt'], count: 1 })),
        [rows]
    );
    const heatmapDays = useMemo(() => {
        const span = computeSpanDays(rows);
        return span ? Math.max(56, Math.min(180, Math.ceil(span))) : undefined;
    }, [rows]);

    if (loading) return <p className="text-sm text-stone-500 dark:text-stone-400">Loading users...</p>;
    if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

    const statCards = [
        { icon: UsersIcon, label: 'Total users', value: stats.total, accent: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400' },
        { icon: UserCheck, label: 'Active', value: stats.active, accent: 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400' },
        { icon: ShieldOff, label: 'Blocked', value: stats.blocked, accent: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' },
        { icon: UserPlus, label: 'New this week', value: stats.newThisWeek, accent: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
    ];

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

            {/* Header */}
            <Reveal delay={0}>
                <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-500">
                        <ShieldCheck size={14} />
                        User management
                    </span>
                    <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                        <span
                            className="bg-gradient-to-r from-brand-600 via-emerald-500 to-brand-600 bg-[length:200%_auto] bg-clip-text text-transparent dark:from-brand-400 dark:via-emerald-400 dark:to-brand-400"
                            style={{ animation: 'admin-gradient-shimmer 6s ease infinite' }}
                        >
                            Users
                        </span>
                        <Sparkles size={18} className="text-amber-500 dark:text-amber-400" aria-hidden="true" />
                    </h1>
                    <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                        Manage accounts, roles, and access across your workspace.
                    </p>
                </div>
            </Reveal>

            {/* Stat cards — one staggered entrance on load */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {statCards.map((c, i) => (
                    <Reveal key={c.label} delay={60 + i * 60}>
                        <StatCard {...c} />
                    </Reveal>
                ))}
            </div>

            {/* Charts: role mix + active/blocked split, side by side */}
            <Reveal delay={320}>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                    <ChartCard
                        title="Active vs. blocked by role"
                        subtitle="Headcount split across your role tiers"
                        className="lg:col-span-3"
                    >
                        <GroupedBarChart items={roleStatusBreakdown} legend={ROLE_STATUS_LEGEND} />
                    </ChartCard>

                    <ChartCard title="Users by role" subtitle="Share of admins, managers, support and regulars" className="lg:col-span-2">
                        <DonutChart segments={roleSegments} size={160} thickness={20} centerLabel="Users" />
                    </ChartCard>
                </div>
            </Reveal>

            {/* Cumulative total users, windowed by the selected range (not
                a per-bucket "new signups" count — see buildUserGrowthTrend
                above). Switching the range restricts the window without
                resetting the running total, so the line always reads as
                "how many users existed by this point". */}
            <Reveal delay={360}>
                <ChartCard
                    title="Total users over time"
                    subtitle={`${signupTrend.total} signups tracked, bucketed by ${signupTrend.granularity}`}
                >
                    <div className="mb-3 flex justify-end">
                        <SegmentedControl
                            options={TREND_RANGE_OPTIONS}
                            value={trendRange}
                            onChange={setTrendRange}
                            name="Trend range"
                            size="sm"
                        />
                    </div>
                    <TrendAreaChart
                        series={[{ key: 'totalUsers', name: 'Total users', color: '#4f46e5', values: signupTrend.values }]}
                        xLabels={signupTrend.xLabels}
                        valueFormatter={(n) => n}
                    />
                </ChartCard>
            </Reveal>

            <Reveal delay={400}>
                <ChartCard title="Signup activity" subtitle="Darker squares mean more people joined that day">
                    <HeatmapCalendar entries={heatmapEntries} days={heatmapDays} unitLabel="signup" />
                </ChartCard>
            </Reveal>

            {/* Controls */}
            <Reveal delay={440}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} name="Filter users" />
                        {roleOptions.length > 0 && (
                            <Select
                                value={roleFilter}
                                onChange={setRoleFilter}
                                options={roleOptions}
                                placeholder="All roles"
                                className="w-40"
                            />
                        )}
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            placeholder="Search by username, name or email..."
                            className="w-full rounded-md border border-stone-300 bg-white py-2 pl-8 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                        />
                    </div>
                </div>
            </Reveal>

            {/* Table */}
            <Reveal delay={480}>
                {filteredRows.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-8 text-center dark:border-stone-700 dark:bg-stone-900">
                        <p className="text-sm text-stone-500 dark:text-stone-400">No users match this view.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
                        <table className="w-full min-w-[48rem] text-left text-sm">
                            <thead className="border-b border-stone-200 bg-stone-50 text-stone-500 dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-400">
                                <tr>
                                    <th className="py-2.5 pl-4 pr-4">User</th>
                                    <th className="py-2.5 pr-4 hidden sm:table-cell">Email</th>
                                    <th className="py-2.5 pr-4 hidden md:table-cell">Phone</th>
                                    <th className="py-2.5 pr-4">Role</th>
                                    <th className="py-2.5 pr-4">Status</th>
                                    <th className="py-2.5 pr-4">Blocked</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((row) => {
                                    const role = getHighestRole(row.label);
                                    const isSelf = row['$id'] === currentUserId;
                                    const allowed = canModerate(currentUserRole, role, isSelf);
                                    const isBusy = blockingId === row['$id'];

                                    return (
                                        <tr
                                            key={row['$id']}
                                            onClick={() => openProfile(row)}
                                            className={`cursor-pointer border-b border-stone-100 transition-colors hover:bg-stone-50 dark:border-stone-800/60 dark:hover:bg-stone-800/60 ${
                                                isSelf ? 'bg-brand-50/40 dark:bg-brand-500/5' : ''
                                            }`}
                                        >
                                            <td className="py-2 pl-4 pr-4">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                                                        {initials(row.name, row.username)}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="truncate font-medium text-stone-900 dark:text-stone-100">
                                                                {row.username}
                                                            </span>
                                                            {isSelf && (
                                                                <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="truncate text-xs text-stone-500 dark:text-stone-400 sm:hidden">{row.email}</p>
                                                        {row.name && (
                                                            <p className="truncate text-xs text-stone-500 dark:text-stone-400">{row.name}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-2 pr-4 hidden sm:table-cell text-stone-600 dark:text-stone-300">{row.email}</td>
                                            <td className="py-2 pr-4 hidden md:table-cell text-stone-600 dark:text-stone-300">{row.phone}</td>
                                            <td className="py-2 pr-4"><RoleBadge role={role} /></td>
                                            <td className="py-2 pr-4">
                                                {row.blocked ? (
                                                    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-400">Blocked</span>
                                                ) : (
                                                    <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/20 dark:text-green-400">Active</span>
                                                )}
                                            </td>
                                            <td className="py-2 pr-4" onClick={(e) => e.stopPropagation()}>
                                                {allowed ? (
                                                    <Toggle
                                                        checked={row.blocked}
                                                        onChange={() => handleToggleBlock(row)}
                                                        disabled={isBusy}
                                                        color="danger"
                                                        label={row.blocked ? `Unblock ${row.username}` : `Block ${row.username}`}
                                                    />
                                                ) : (
                                                    <span
                                                        className="inline-flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500"
                                                        title={
                                                            isSelf
                                                                ? "You can't moderate your own account"
                                                                : `${ROLE_META[currentUserRole].label}s can't moderate ${ROLE_META[role].label} accounts`
                                                        }
                                                    >
                                                        <Lock className="h-3.5 w-3.5" />
                                                        N/A
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Reveal>
        </div>
    );
}

export default AdminUsers;