import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import {
    WholeWord , Package, ShoppingCart, Megaphone, Moon, Sun, ChevronRight,
    Mail, Phone, Wallet, ShoppingBag, Sparkles, AlertTriangle, Hand,
    Star, Heart, Zap,
} from 'lucide-react';
import { user } from '../backend/';
import { ThemeToggle } from '../components';

import { fetchUserOrders } from '../store/slices/orderSlice';
import { loadCart, selectCartCount } from '../store/slices/cartSlice';
import { fetchActiveAnnouncements, fetchUserResponses } from '../store/slices/announcementSlice';
import { DonutChart, HeatmapCalendar, Toggle } from '../ui'; // ⚠️ adjust to your actual ui/ barrel path
import useTheme from '../context/theme';
import { formatPKR } from '../utils/formatPrice'; // ⚠️ adjust path — same helper OrderForm.jsx uses

const DAY_MS = 24 * 60 * 60 * 1000;
const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const CHART_COLORS = ['#0ea5e9', '#f97316', '#8b5cf6', '#10b981', '#ef4444', '#eab308', '#6366f1', '#14b8a6'];

// Keeps the first 3 characters of the local part and the domain's TLD,
// replaces everything in between with dots — e.g.
// "thebosdfakd@gmail.com" -> "the.............com"
function maskEmail(email) {
    if (!email) return 'Not provided';
    const atIndex = email.indexOf('@');
    if (atIndex === -1) return email;

    const local = email.slice(0, atIndex);
    const domain = email.slice(atIndex + 1);
    const dotIndex = domain.lastIndexOf('.');
    const tld = dotIndex !== -1 ? domain.slice(dotIndex) : '';

    const visible = local.slice(0, 3);
    const hiddenLength = Math.max(3, email.length - visible.length - tld.length);
    return `${visible}${'.'.repeat(hiddenLength)}${tld}`;
}

// Different pattern from email, deliberately — keeps the first 3 and last 2
// digits visible, stars out the middle. e.g. "03001234567" -> "300******67"
function maskPhone(phone) {
    if (!phone) return 'Not provided';
    if (phone.length <= 5) return '*'.repeat(phone.length);

    const start = phone.slice(0, 3);
    const end = phone.slice(-2);
    const hiddenLength = phone.length - start.length - end.length;
    return `${start}${'*'.repeat(hiddenLength)}${end}`;
}

// Staggered entrance wrapper — each section fades + rises in on mount,
// offset by `delay` ms, so the page reveals itself top-to-bottom instead
// of popping in all at once. Pure CSS transition, no animation library.
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

// Counts up from 0 to `value` with an ease-out curve. Used for the stat
// numbers and the total-spent figure so the page feels alive on load
// instead of numbers just appearing static.
function AnimatedNumber({ value, duration = 800, formatter }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        let frame;
        let start;
        function tick(ts) {
            if (start === undefined) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(value * eased));
            if (progress < 1) frame = requestAnimationFrame(tick);
        }
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value, duration]);
    return <>{formatter ? formatter(display) : display}</>;
}

function User() {
    const { username } = useParams();
    const dispatch = useDispatch();
    const userData = useSelector((s) => s.user.userData);

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { themeMode, toggleTheme } = useTheme();

    // Privacy toggles for the account-details card. Default to visible
    // (the person already knows their own email/phone) — these exist for
    // screen-share/public-screen situations, not because the data itself
    // is secret from the account owner.
    const [showEmail, setShowEmail] = useState(true);
    const [showPhone, setShowPhone] = useState(true);
    // Balance defaults hidden-toggle to "visible" as well, same reasoning —
    // flip to false if you'd rather it start masked.
    const [showBalance, setShowBalance] = useState(true);

    const orders = useSelector((s) => s.orders.list);
    const cartCount = useSelector(selectCartCount);
    const cartStatus = useSelector((s) => s.cart.status);
    const activeAnnouncements = useSelector((s) => s.announcements.active);
    const announcementResponses = useSelector((s) => s.announcements.responses);

    useEffect(() => {
        if (!userData || !userData['$id']) return;

        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                const result = await user.getProfile({
                    requesterLabels: userData.labels,
                    requesterId: userData['$id'],
                    targetId: username,
                });

                if (cancelled) return;

                if (!result || Array.isArray(result)) {
                    setError('Could not load this profile.');
                    setProfile(null);
                } else {
                    setProfile(result);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error(err);
                    setError('Something went wrong loading this profile.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userData, username]);

    useEffect(() => {
        if (!userData?.['$id']) return;

        if (orders.status === 'idle') {
            dispatch(fetchUserOrders({ username: userData['$id'] }));
        }
        if (cartStatus === 'idle') {
            dispatch(loadCart({ userId: userData['$id'] }));
        }
        if (activeAnnouncements.status === 'idle') {
            dispatch(fetchActiveAnnouncements());
        }
        if (announcementResponses.status === 'idle') {
            dispatch(fetchUserResponses({ username: userData['$id'] }));
        }
    }, [userData, dispatch, orders.status, cartStatus, activeAnnouncements.status, announcementResponses.status]);

    const orderSegments = useMemo(() => {
        return ORDER_STATUSES.map((status, i) => ({
            label: status,
            value: orders.items.filter((o) => o.status === status).length,
            color: CHART_COLORS[i % CHART_COLORS.length],
        }));
    }, [orders.items]);

    const heatmapEntries = useMemo(() => {
        return orders.items
            .filter((o) => o.$createdAt)
            .map((o) => ({ date: o.$createdAt, count: 1 }));
    }, [orders.items]);

    // Drives the heatmap's bucket sizing so a brand-new account with a
    // handful of orders doesn't get spread thin across a full year of
    // mostly-empty boxes — mirrors the same calc used on the Orders page.
    const heatmapDays = useMemo(() => {
        if (orders.items.length === 0) return 90;
        const oldest = orders.items.reduce(
            (min, o) => Math.min(min, new Date(o.$createdAt).getTime()),
            Date.now()
        );
        return Math.max(1, Math.ceil((Date.now() - oldest) / DAY_MS) + 1);
    }, [orders.items]);

    const unreadAnnouncementsCount = useMemo(() => {
        return activeAnnouncements.items.filter((a) => !announcementResponses.byId[a.$id]?.read).length;
    }, [activeAnnouncements.items, announcementResponses.byId]);

    // Spend total from each order's orderDetails snapshot — matches the
    // exact shape OrderForm.jsx writes (productId, name, price, quantity).
    // Cancelled orders are excluded since nothing was actually fulfilled.
    const completedOrders = useMemo(
        () => orders.items.filter((o) => o.status !== 'Cancelled'),
        [orders.items]
    );

    const totalSpent = useMemo(() => {
        return completedOrders.reduce((sum, o) => {
            const orderTotal = (o.orderDetails || []).reduce(
                (s, d) => s + Number(d.price) * d.quantity,
                0
            );
            return sum + orderTotal;
        }, 0);
    }, [completedOrders]);

    if (loading) {
        return <p className="text-sm text-stone-500 dark:text-stone-400">Loading profile...</p>;
    }

    if (error) {
        return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
    }

    if (!profile) {
        return <p className="text-sm text-stone-500 dark:text-stone-400">No profile data found.</p>;
    }

    const isBlocked = profile.blocked ?? userData.blocked;
    const email = profile.email || userData.email;
    const phone = profile.phone;
    const displayName = profile.name || userData.name;

    return (
        <div>
            {/* Scoped keyframes for the gradient shimmer, waving hand, and
                the floating decorative icons around the welcome heading —
                kept local to this file so no Tailwind config changes are
                needed. */}
            <style>{`
                @keyframes user-gradient-shimmer {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes user-wave {
                    0%, 60%, 100% { transform: rotate(0deg); }
                    10%, 30% { transform: rotate(14deg); }
                    20% { transform: rotate(-8deg); }
                    40% { transform: rotate(-4deg); }
                    50% { transform: rotate(10deg); }
                }
                /* Three distinct float paths so the icons don't all move in
                   sync — different amplitude, rotation, and duration per
                   icon. */
                @keyframes user-float-a {
                    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.55; }
                    50% { transform: translateY(-10px) rotate(8deg); opacity: 0.9; }
                }
                @keyframes user-float-b {
                    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
                    50% { transform: translateY(8px) rotate(-10deg); opacity: 0.8; }
                }
                @keyframes user-float-c {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.5; }
                    50% { transform: translate(-6px, -6px) rotate(6deg); opacity: 0.85; }
                }
            `}</style>

            {isBlocked && (
                <Reveal delay={0}>
                    <div className="mb-6 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                        <p>
                            Your account ({profile.username || userData['$id']}
                            {profile.email ? `, ${profile.email}` : ''}) has been blocked by an
                            administrator. You can only view this page — you won't be able to
                            browse the rest of the site. Contact support if you believe this
                            is a mistake.
                        </p>
                    </div>
                </Reveal>
            )}

            {/* WELCOME HEADER — gradient shimmer text, waving lucide Hand
                icon, and a handful of small floating icons drifting around
                the heading for extra life on first arrival. Floating icons
                are purely decorative (aria-hidden) and hidden below sm so
                they don't crowd the text on narrow screens. */}
            <Reveal delay={50}>
                <div className="relative mb-6">
                    {/* Floating decorative icons — absolutely positioned
                        around the heading, each on its own float
                        keyframe/duration/delay so they read as ambient
                        motion rather than a synced group. */}
                    <Sparkles
                        size={16}
                        aria-hidden="true"
                        className="pointer-events-none absolute -left-1 top-0 hidden text-amber-400 dark:text-amber-300 sm:block"
                        style={{ animation: 'user-float-a 3.2s ease-in-out infinite', animationDelay: '0.2s' }}
                    />
                    <Star
                        size={14}
                        aria-hidden="true"
                        className="pointer-events-none absolute left-24 -top-3 hidden text-sky-400 dark:text-sky-300 sm:block"
                        style={{ animation: 'user-float-b 3.8s ease-in-out infinite', animationDelay: '0.6s' }}
                    />
                    <Heart
                        size={13}
                        aria-hidden="true"
                        className="pointer-events-none absolute right-16 top-1 hidden text-rose-400 dark:text-rose-300 sm:block"
                        style={{ animation: 'user-float-c 3.5s ease-in-out infinite', animationDelay: '1s' }}
                    />
                    <Zap
                        size={15}
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-1 top-6 hidden text-violet-400 dark:text-violet-300 sm:block"
                        style={{ animation: 'user-float-a 4.1s ease-in-out infinite', animationDelay: '0.4s' }}
                    />
                    <Sparkles
                        size={12}
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 top-10 hidden text-emerald-400 dark:text-emerald-300 md:block"
                        style={{ animation: 'user-float-b 3s ease-in-out infinite', animationDelay: '0.9s' }}
                    />

                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-500">
                        <Sparkles size={14} className="animate-pulse" />
                        Account overview
                    </span>
                    <h1 className="mt-1 flex flex-wrap items-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
                        <span
                            className="bg-gradient-to-r from-brand-600 via-emerald-500 to-brand-600 bg-[length:200%_auto] bg-clip-text text-transparent dark:from-brand-400 dark:via-emerald-400 dark:to-brand-400"
                            style={{ animation: 'user-gradient-shimmer 6s ease infinite' }}
                        >
                            Welcome, {displayName}
                        </span>
                        <Hand
                            size={28}
                            className="inline-block origin-[70%_70%] text-amber-500 dark:text-amber-400"
                            style={{ animation: 'user-wave 1.8s ease-in-out 1' }}
                            aria-hidden="true"
                        />
                    </h1>
                    <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                        Manage your profile and keep track of your shopping activity.
                    </p>
                </div>
            </Reveal>

            {/* ACCOUNT DETAILS — per-field mask toggles, color-coded lucide
                icon chips per field so the card isn't monochrome. No real
                "reveal password" row exists here since Appwrite never
                returns the plaintext value — nothing to show. */}
            <Reveal delay={100}>
                <div className="mb-6 rounded-lg border border-stone-200 bg-cream p-6 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                    <h2 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">Account details</h2>
                    <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
                        Mask your email and phone if you're on a shared screen — this only changes what's displayed here, not your actual account data.
                    </p>

                    <dl className="divide-y divide-stone-100 dark:divide-stone-800">
                        <div className="flex items-center justify-between gap-4 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-amber-500 dark:text-amber-400">
                                    <WholeWord  size={15} />
                                </span>
                                <div className="min-w-0">
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                                        Username
                                    </dt>
                                    <dd className="mt-0.5 truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                                        {profile.username || userData['$id']}
                                    </dd>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                                    <Mail size={15} />
                                </span>
                                <div className="min-w-0">
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                                        Email
                                    </dt>
                                    <dd className="mt-0.5 truncate text-sm font-medium tabular-nums text-stone-900 dark:text-stone-100">
                                        {!showEmail ? (email || 'Not provided') : maskEmail(email)}
                                    </dd>
                                </div>
                            </div>
                            <Toggle
                                checked={!showEmail}
                                onChange={setShowEmail}
                                label={showEmail ? 'Hide email address' : 'Show email address'}
                                size="sm"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                                    <Phone size={15} />
                                </span>
                                <div className="min-w-0">
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                                        Phone
                                    </dt>
                                    <dd className="mt-0.5 text-sm font-medium tabular-nums text-stone-900 dark:text-stone-100">
                                        {!showPhone ? (phone || 'Not provided') : maskPhone(phone)}
                                    </dd>
                                </div>
                            </div>
                            <Toggle
                                checked={!showPhone}
                                onChange={setShowPhone}
                                label={showPhone ? 'Hide phone number' : 'Show phone number'}
                                size="sm"
                            />
                        </div>

                        {userData.labels?.length > 0 && (
                            <div className="flex items-center justify-between gap-4 py-3">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                                        <Sparkles size={15} />
                                    </span>
                                    <div>
                                        <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                                            Roles
                                        </dt>
                                        <dd className="mt-0.5 text-sm font-medium text-stone-900 dark:text-stone-100">
                                            {userData.labels.join(', ')}
                                        </dd>
                                    </div>
                                </div>
                            </div>
                        )}
                    </dl>
                </div>
            </Reveal>

            {!isBlocked && (
                <>
                    {/* STATS ROW — color-coded per card instead of all-brand,
                        counts animate up on mount, unread gets a live dot. */}
                    <Reveal delay={150}>
                        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Link
                                to={`/${userData['$id']}/orders`}
                                className="flex items-center justify-between rounded-lg border border-stone-200 bg-cream p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
                            >
                                <span className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                        <Package size={18} />
                                    </span>
                                    <span>
                                        <span className="block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                                            Orders
                                        </span>
                                        <span className="block text-lg font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                                            {orders.status === 'loading' ? '...' : <AnimatedNumber value={orders.items.length} />}
                                        </span>
                                    </span>
                                </span>
                                <ChevronRight size={16} className="text-stone-400 dark:text-stone-500" />
                            </Link>

                            <Link
                                to={`/${userData['$id']}/cart`}
                                className="flex items-center justify-between rounded-lg border border-stone-200 bg-cream p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
                            >
                                <span className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                                        <ShoppingCart size={18} />
                                    </span>
                                    <span>
                                        <span className="block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                                            Cart
                                        </span>
                                        <span className="block text-lg font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                                            {cartStatus === 'loading' ? '...' : <AnimatedNumber value={cartCount} />}
                                        </span>
                                    </span>
                                </span>
                                <ChevronRight size={16} className="text-stone-400 dark:text-stone-500" />
                            </Link>

                            <Link
                                to={`/${userData['$id']}/announcements`}
                                className="relative flex items-center justify-between rounded-lg border border-stone-200 bg-cream p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
                            >
                                <span className="flex items-center gap-3">
                                    <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400">
                                        <Megaphone size={18} />
                                        {unreadAnnouncementsCount > 0 && (
                                            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
                                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fuchsia-500" />
                                            </span>
                                        )}
                                    </span>
                                    <span>
                                        <span className="block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                                            Announcements
                                        </span>
                                        <span className="block text-lg font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                                            {activeAnnouncements.status === 'loading' ? (
                                                '...'
                                            ) : (
                                                <>
                                                    <AnimatedNumber value={unreadAnnouncementsCount} /> unread
                                                </>
                                            )}
                                        </span>
                                    </span>
                                </span>
                                <ChevronRight size={16} className="text-stone-400 dark:text-stone-500" />
                            </Link>
                        </div>
                    </Reveal>

                    {/* ORDER STATUS SNAPSHOT + SPENDING — donut chart now
                        actually rendered (it was computed but unused before),
                        paired with the spend total so this reads as one
                        coherent "here's your shopping picture" card. */}
                    <Reveal delay={200}>
                        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="rounded-lg border border-stone-200 bg-cream p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                                <h2 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-100">
                                    Order status
                                </h2>
                                {orders.status === 'loading' ? (
                                    <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                                ) : orders.items.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center dark:border-stone-700 dark:bg-stone-900">
                                        <ShoppingBag size={20} className="mx-auto mb-2 text-stone-400 dark:text-stone-500" />
                                        <p className="text-sm text-stone-500 dark:text-stone-400">No orders yet.</p>
                                    </div>
                                ) : (
                                    <DonutChart segments={orderSegments} centerLabel="Orders" />
                                )}
                            </div>

                            <div className="rounded-lg border border-stone-200 bg-cream p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
                                        <Wallet size={16} className="text-emerald-500 dark:text-emerald-400" />
                                        Total spent
                                    </h2>
                                    {orders.status !== 'loading' && orders.items.length > 0 && (
                                        <Toggle
                                            checked={showBalance}
                                            onChange={setShowBalance}
                                            label={showBalance ? 'Hide total spent' : 'Show total spent'}
                                            size="sm"
                                        />
                                    )}
                                </div>

                                {orders.status === 'loading' ? (
                                    <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                                ) : orders.items.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-8 text-center dark:border-stone-700 dark:bg-stone-900">
                                        <ShoppingBag size={22} className="mx-auto mb-2 text-stone-400 dark:text-stone-500" />
                                        <p className="text-sm text-stone-500 dark:text-stone-400">
                                            You haven't placed any orders yet.
                                        </p>
                                        <Link
                                            to="/products"
                                            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-500"
                                        >
                                            Browse products <ChevronRight size={14} />
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <p className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-3xl font-bold tabular-nums text-transparent dark:from-emerald-400 dark:to-emerald-300">
                                            {showBalance ? (
                                                <AnimatedNumber value={totalSpent} formatter={formatPKR} />
                                            ) : (
                                                '••••••'
                                            )}
                                        </p>
                                        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                                            Across {completedOrders.length} completed order{completedOrders.length === 1 ? '' : 's'}
                                            {completedOrders.length !== orders.items.length &&
                                                ` (${orders.items.length - completedOrders.length} cancelled excluded)`}
                                        </p>
                                        <Link
                                            to="/products"
                                            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-500"
                                        >
                                            Browse products <ChevronRight size={14} />
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </Reveal>

                    {/* ACTIVITY HEATMAP — was computed but never rendered
                        before; now shown as a compact preview with a link
                        through to the full Orders page for the detailed view. */}
                    {orders.items.length > 0 && (
                        <Reveal delay={250}>
                            <div className="mb-6 rounded-lg border border-stone-200 bg-cream p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                                <h2 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-100">
                                    Order activity
                                </h2>
                                <HeatmapCalendar entries={heatmapEntries} days={heatmapDays} weeks={12} />
                            </div>
                        </Reveal>
                    )}

                    <Reveal delay={300}>
                        <Link
                            to={`/${userData['$id']}/orders`}
                            className="mb-6 flex items-center justify-between rounded-lg border border-stone-200 bg-cream p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
                        >
                            <span>
                                <span className="block text-sm font-semibold text-stone-900 dark:text-stone-100">
                                    View order activity &amp; trends
                                </span>
                                <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">
                                    Status breakdown, monthly trend, and your full order history
                                </span>
                            </span>
                            <ChevronRight size={18} className="shrink-0 text-stone-400 dark:text-stone-500" />
                        </Link>
                    </Reveal>

                    <Reveal delay={350}>
                        <div className="rounded-lg border border-stone-200 bg-cream p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                            <h2 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-100">Preferences</h2>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                                    {themeMode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                                    {themeMode === 'dark' ? 'Dark mode' : 'Light mode'}
                                </span>
                                <ThemeToggle />
                            </div>
                        </div>
                    </Reveal>
                </>
            )}
        </div>
    );
}

export default User;