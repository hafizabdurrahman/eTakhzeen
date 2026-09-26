import React, { useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, ChevronRight, Menu, X, LogOut, ShieldCheck, Home } from 'lucide-react';
import { adminNavItems } from '../adminNavConfig';
import auth from '../../backend/auth'; // ⚠️ adjust path to match your project
import { user } from '../../backend'; // ⚠️ adjust path to match your project
import { logout as logoutAction, setUser } from '../../store/slices/userSlice'; // ⚠️ adjust path
import { normalizeUserRows } from '../../utils/userLabels'; // ⚠️ adjust path to match your project

// Tailwind can't resolve fully-dynamic class strings like
// `text-${color}-500` at build time (its scanner needs literal class
// names to keep them in the output), so each color used in
// adminNavConfig.js needs an explicit entry here. Add a line whenever you
// introduce a new `color` value in the config.
const ICON_COLOR_CLASSES = {
    brand: 'text-brand-500 dark:text-brand-400',
    sky: 'text-sky-500 dark:text-sky-400',
    violet: 'text-violet-500 dark:text-violet-400',
    orange: 'text-orange-500 dark:text-orange-400',
    fuchsia: 'text-fuchsia-500 dark:text-fuchsia-400',
    tomato: 'text-red-500 dark:text-red-400',
    amber: 'text-amber-500 dark:text-amber-400',
    stone: 'text-stone-500 dark:text-stone-400',
    green: 'text-green-500 dark:text-green-400',
    warm: 'text-orange-600 dark:text-orange-700',
    yellow: 'text-yellow-600 dark:text-yellow-400'
};

// Paths that should warm the redux cache as soon as the user shows intent
// to visit them (hover/focus on the nav link), so the destination page
// mounts with data already in the store instead of showing a spinner.
// Add more entries here as other admin pages grow their own store slices.
const PREFETCHABLE_PATHS = new Set(['/admin/users']);

function AdminLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState('');

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const userData = useSelector((s) => s.user.userData);
    const allCols = useSelector((s) => s.user.allCols);
    const adminName = userData?.name || userData?.username || 'Admin';

    // Guards against firing a duplicate request if the pointer re-enters
    // the link (or it's both hovered and focused) before the first
    // request resolves. Not component state on purpose — flipping it
    // shouldn't trigger a re-render.
    const prefetchingUsersRef = useRef(false);

    async function handlePrefetchUsers() {
        if (allCols !== null || prefetchingUsersRef.current) return;
        prefetchingUsersRef.current = true;
        try {
            const rows = await user.getProfile({
                requesterLabels: userData?.labels,
                requesterId: userData?.['$id'],
            });
            if (Array.isArray(rows)) dispatch(setUser(normalizeUserRows(rows)));
        } catch {
            // Silent: this is a background warm-up, not a user-facing
            // action. If it fails, AdminUsers's own effect will retry
            // and surface the real error state on mount.
        } finally {
            prefetchingUsersRef.current = false;
        }
    }

    const PREFETCH_HANDLERS = {
        '/admin/users': handlePrefetchUsers,
    };

    async function handleLogout() {
        setLoggingOut(true);
        setLogoutError('');

        const result = await auth.logout();

        if (!result) {
            // Session deletion failed server-side — don't clear local state
            // as if they're logged out when the backend still thinks they
            // have an active session.
            setLoggingOut(false);
            setLogoutError('Failed to log out.');
            return;
        }

        dispatch(logoutAction());
        navigate('/', { replace: true });
    }

    return (
        <div className="flex min-h-screen">
            {/* Mobile top bar — only shown below md, since the sidebar becomes
                an off-canvas drawer at that breakpoint instead of a column. */}
            <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900 md:hidden">
                <span className="flex items-center gap-2 text-base font-semibold text-stone-900 dark:text-stone-100">
                    <ShieldCheck size={18} className="text-brand-600 dark:text-brand-500" />
                    Admin Panel
                </span>
                <button
                    onClick={() => setMobileOpen(true)}
                    className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                    aria-label="Open menu"
                >
                    <Menu size={20} />
                </button>
            </div>

            {/* Backdrop, mobile only, closes the drawer on tap */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    className="fixed inset-0 z-40 bg-stone-900/50 md:hidden"
                    aria-hidden="true"
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col justify-between border-r border-stone-200 bg-white text-stone-900 transition-transform duration-200 ease-in-out dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 md:sticky md:top-0 md:h-screen md:translate-x-0 md:transition-[width] ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                } ${collapsed ? 'md:w-16' : 'md:w-60'}`}
            >
                <div>
                    <div className="flex items-center justify-between px-3 py-5">
                        {!collapsed && (
                            <span className="flex items-center gap-2 text-lg font-semibold">
                                <ShieldCheck size={20} className="shrink-0 text-brand-600 dark:text-brand-500" />
                                Admin Panel
                            </span>
                        )}
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 md:hidden"
                            aria-label="Close menu"
                        >
                            <X size={18} />
                        </button>
                        <button
                            onClick={() => setCollapsed((c) => !c)}
                            className="hidden rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 md:block"
                            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                        </button>
                    </div>

                    {/* Account header — mirrors UserPanelSidebar so both
                        panels feel like the same product. */}
                    {!collapsed && (
                        <div className="mb-2 flex items-center gap-3 px-4 pb-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                                {adminName?.[0]?.toUpperCase() || '?'}
                            </span>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">{adminName}</p>
                                <p className="text-xs text-stone-500 dark:text-stone-400">Administrator</p>
                            </div>
                        </div>
                    )}

                    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-4">
                        {adminNavItems.map(({ label, path, end, icon: Icon, color }) => {
                            const iconColorClass = ICON_COLOR_CLASSES[color] || ICON_COLOR_CLASSES.stone;
                            const prefetch = PREFETCH_HANDLERS[path];
                            return (
                                <NavLink
                                    key={path || 'index'}
                                    to={path}
                                    end={end}
                                    onClick={() => setMobileOpen(false)}
                                    onMouseEnter={prefetch}
                                    onFocus={prefetch}
                                    title={collapsed ? label : undefined}
                                    className={({ isActive }) =>
                                        `group flex items-center gap-3 rounded-md border-l-4 px-3 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-950 ${
                                            collapsed ? 'justify-center border-l-0' : ''
                                        } ${
                                            isActive
                                                ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-400'
                                                : 'border-transparent text-stone-600 hover:bg-stone-100 hover:text-brand-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-brand-400'
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            {Icon && (
                                                <Icon
                                                    size={18}
                                                    className={`shrink-0 transition-colors ${
                                                        isActive ? '' : `${iconColorClass} group-hover:text-brand-700 dark:group-hover:text-brand-400`
                                                    }`}
                                                />
                                            )}
                                            {!collapsed && <span>{label}</span>}
                                        </>
                                    )}
                                </NavLink>
                            );
                        })}
                    </nav>
                </div>

                {/* Logout — was entirely missing before; mirrors
                    UserPanelSidebar's footer treatment exactly. */}
                <div className="border-t border-stone-100 px-2 py-3 dark:border-stone-800">
                    {logoutError && !collapsed && (
                        <p className="mb-1 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
                            {logoutError}
                        </p>
                    )}
                    <Link
                        to="/"
                        title="Go to home"
                        aria-label="Go to home"
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:text-stone-400 dark:hover:bg-stone-500/10 dark:focus-visible:ring-offset-stone-950 ${
                            collapsed ? 'justify-center' : ''
                        }`}
                    >
                        <Home size={18} className="shrink-0" aria-hidden="true" />
                        {!collapsed &&  'Back to Home'}
                    </Link>
                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        title="Log out"
                        aria-label="Log out"
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:text-red-400 dark:hover:bg-red-500/10 dark:focus-visible:ring-offset-stone-950 ${
                            collapsed ? 'justify-center' : ''
                        }`}
                    >
                        <LogOut size={18} className="shrink-0" aria-hidden="true" />
                        {!collapsed && (loggingOut ? 'Logging out...' : 'Log out')}
                    </button>
                </div>
            </aside>
            <main className="min-w-0 flex-1 bg-white p-4 pt-20 text-stone-900 dark:bg-stone-950 dark:text-stone-100 sm:p-6 sm:pt-6 md:p-8">
                <Outlet />
            </main>
        </div>
    );
}

export default AdminLayout;