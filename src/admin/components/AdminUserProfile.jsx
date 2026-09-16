// Suggested location: src/pages/admin/AdminUserProfile.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import {
    Eye,
    EyeOff,
    ArrowLeft,
    Mail,
    Phone,
    AtSign,
    Calendar,
    ShieldCheck,
    Lock,
    Award,
    Clock,
    MessageCircle,
    Package,
} from 'lucide-react';
import { user } from '../../backend'; // ⚠️ adjust path to match your project
import { Toggle } from '../../ui'; // ⚠️ adjust path to match your project
import { getHighestRole, initials, RoleBadge, ROLE_META, ROLE_ORDER } from '../../constants/roles'; // ⚠️ adjust path to match your project

// Full profile view for a single user — only reachable from AdminUsers by
// clicking a row. Password is shown here ONLY (never in the list view), and
// stays masked until the viewer explicitly reveals it.

function formatDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// A friendly "how long has this account existed" label, derived from the
// same $createdAt already used elsewhere (e.g. the signup trend on the list
// screen) — no new data source, just a second read of one field.
function accountAge(dateStr) {
    if (!dateStr) return null;
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (days < 1) return 'Joined today';
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} old`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} old`;
    const years = Math.floor(months / 12);
    return `${years} year${years === 1 ? '' : 's'} old`;
}

// Icon chip — colored circular icon backdrop (§9/§13): background is the
// item's own color at ~10% opacity, icon colored to match.
function IconChip({ icon: Icon, color, size = 'md' }) {
    const dims = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
    const iconSize = size === 'sm' ? 16 : 20;
    return (
        <span
            className={`flex ${dims} shrink-0 items-center justify-center rounded-full`}
            style={{ backgroundColor: `${color}1a`, color }}
        >
            <Icon size={iconSize} />
        </span>
    );
}

function DetailRow({ icon: Icon, label, value, color = '#78716c' }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2.5">
            <span className="flex items-center gap-2.5 text-sm text-stone-500 dark:text-stone-400">
                {Icon && <IconChip icon={Icon} color={color} size="sm" />}
                {label}
            </span>
            <span className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">{value || '—'}</span>
        </div>
    );
}

function SidebarCard({ title, subtitle, children }) {
    return (
        <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h3>
            {subtitle && <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>}
            {children}
        </div>
    );
}

function AdminUserProfile() {
    const { username } = useParams();
    const navigate = useNavigate();
    const userData = useSelector((s) => s.user.userData);

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [blocking, setBlocking] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [shown, setShown] = useState(false);

    const loadProfile = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await user.getProfile({
                requesterLabels: userData?.labels,
                requesterId: userData?.['$id'],
                targetId: username,
            });
            setProfile(result || null);
        } catch (err) {
            setError('Failed to load this user.');
        } finally {
            setLoading(false);
        }
    }, [userData, username]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    // A single orchestrated entrance for the whole page once it's ready,
    // rather than fading each card in separately.
    useEffect(() => {
        if (!loading && profile) {
            const t = setTimeout(() => setShown(true), 30);
            return () => clearTimeout(t);
        }
    }, [loading, profile]);

    async function handleToggleBlock() {
        if (!profile) return;
        setBlocking(true);
        const nextBlocked = !profile.blocked;
        const result = await user.setBlocked({ rowId: profile['$id'], blocked: nextBlocked });
        setBlocking(false);

        if (!result) {
            alert('Failed to update block status.');
            return;
        }
        setProfile((prev) => ({ ...prev, blocked: nextBlocked }));
    }

    if (loading) return <p className="text-sm text-stone-500 dark:text-stone-400">Loading user...</p>;
    if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
    if (!profile) return <p className="text-sm text-stone-500 dark:text-stone-400">User not found.</p>;

    const role = getHighestRole(profile.label);
    const rank = ROLE_ORDER.indexOf(role); // 0 = admin ... 3 = regular, since ROLE_ORDER is highest-first
    const rankFromBottom = ROLE_ORDER.length - 1 - rank; // 0 = regular, 3 = admin
    const roleColor = ROLE_META[role].chart;
    const joined = formatDate(profile['$createdAt']);
    const age = accountAge(profile['$createdAt']);

    return (
        <div
            className={`mx-auto max-w-4xl transition-all duration-500 ease-out ${
                shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
        >
            <button
                onClick={() => navigate('/admin/users')}
                className="mb-4 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-brand-600 hover:underline dark:text-stone-400 dark:hover:text-brand-500"
            >
                <ArrowLeft className="h-4 w-4" /> Back to Users
            </button>

            {/* Identity banner — a thin top accent in the role's color is the
                one bit of color-coding on this page; everything else stays
                quiet so it doesn't compete with it. */}
            <div className="mb-6 overflow-hidden rounded-xl border border-stone-200 bg-cream shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <div className="h-1.5" style={{ backgroundColor: roleColor }} />
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xl font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                            {initials(profile.name, profile.username)}
                        </span>
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl font-bold text-stone-900 dark:text-stone-100">
                                {profile.name || profile.username}
                            </h1>
                            <p className="truncate text-sm text-stone-500 dark:text-stone-400">@{profile.username}</p>
                            <div className="mt-2 flex items-center gap-2">
                                <RoleBadge role={role} />
                                {profile.blocked ? (
                                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-400">
                                        Blocked
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                        Active
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 sm:shrink-0">
                        {/* Wired up later — button only for now, per request */}
                        <button className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700">
                            <MessageCircle className="h-4 w-4" />
                            Contact
                        </button>
                        <button
                            onClick={() => navigate(`/admin/orders?username=${profile.username}`)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                        >
                            <Package className="h-4 w-4" />
                            View Orders
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main column: contact details + account access */}
                <div className="space-y-6 lg:col-span-2">
                    <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                        <h3 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">Contact details</h3>
                        <div className="divide-y divide-stone-100 dark:divide-stone-800">
                            <DetailRow icon={AtSign} label="Username" value={profile.username} color="#0ea5e9" />
                            <DetailRow icon={ShieldCheck} label="Name" value={profile.name} color="#8b5cf6" />
                            <DetailRow icon={Mail} label="Email" value={profile.email} color="#f97316" />
                            <DetailRow icon={Phone} label="Phone" value={profile.phone} color="#10b981" />
                            <div className="flex items-center justify-between gap-4 py-2.5">
                                <span className="flex items-center gap-2.5 text-sm text-stone-500 dark:text-stone-400">
                                    <IconChip icon={Lock} color="#6366f1" size="sm" />
                                    Password
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="truncate font-mono text-sm font-medium text-stone-900 dark:text-stone-100">
                                        {showPassword ? profile.password || '—' : '••••••••'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-brand-50 hover:text-brand-700 dark:text-stone-500 dark:hover:bg-brand-500/15 dark:hover:text-brand-400"
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Account access — the toggle now sits next to an explicit,
                        always-visible label and a one-line explanation of what
                        it does, instead of relying on the switch alone. */}
                    <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                        <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Account access</h3>
                        <div className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 p-3 dark:border-stone-800">
                            <div className="flex items-center gap-3 min-w-0">
                                <IconChip
                                    icon={ShieldCheck}
                                    color={profile.blocked ? '#ef4444' : '#10b981'}
                                    size="sm"
                                />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                                        {profile.blocked ? 'Blocked' : 'Active'}
                                    </p>
                                    <p className="text-xs text-stone-500 dark:text-stone-400">
                                        {profile.blocked
                                            ? 'This user cannot sign in until unblocked.'
                                            : 'This user can sign in normally.'}
                                    </p>
                                </div>
                            </div>
                            <Toggle
                                checked={profile.blocked}
                                onChange={handleToggleBlock}
                                disabled={blocking}
                                color="danger"
                                label={profile.blocked ? 'Unblock user' : 'Block user'}
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar: role/permission summary (icon + segmented rank
                    indicator, no chart) + membership stats */}
                <div className="space-y-6">
                    <SidebarCard title="Access level" subtitle={`Rank ${rankFromBottom + 1} of ${ROLE_ORDER.length}`}>
                        <div className="flex items-center gap-3">
                            <IconChip icon={Award} color={roleColor} />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                                    {ROLE_META[role].label}
                                </p>
                                <p className="text-xs text-stone-500 dark:text-stone-400">Current role</p>
                            </div>
                        </div>

                        {/* Segmented rank indicator — a plain set of filled
                            pills, not an SVG/chart component. */}
                        <div className="mt-4 flex gap-1">
                            {ROLE_ORDER.map((_, i) => (
                                <span
                                    key={i}
                                    className={
                                        i <= rankFromBottom
                                            ? 'h-2 flex-1 rounded-full'
                                            : 'h-2 flex-1 rounded-full bg-stone-100 dark:bg-stone-800'
                                    }
                                    style={i <= rankFromBottom ? { backgroundColor: roleColor } : undefined}
                                />
                            ))}
                        </div>
                    </SidebarCard>

                    <SidebarCard title="Membership">
                        <div className="divide-y divide-stone-100 dark:divide-stone-800">
                            <DetailRow icon={Calendar} label="Member since" value={joined} color="#0ea5e9" />
                            <DetailRow icon={Clock} label="Account age" value={age} color="#f97316" />
                        </div>
                    </SidebarCard>
                </div>
            </div>
        </div>
    );
}

export default AdminUserProfile;