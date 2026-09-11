import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useDispatch } from 'react-redux';
import { ChevronLeft, ChevronRight, X, LogOut } from 'lucide-react';
import auth from '../../backend/auth';
import { logout as logoutAction } from '../../store/slices/userSlice';
import { getUserNavItems } from './userNavConfig'; // ⚠️ adjust path to match your project

// Tailwind can't resolve fully-dynamic class strings like
// `text-${color}-500` at build time (its scanner needs literal class
// names to keep them in the output), so each color used in
// userNavConfig.js needs an explicit entry here. Add a line whenever you
// introduce a new `color` value in the config.
const ICON_COLOR_CLASSES = {
    sky: 'text-sky-500 dark:text-sky-400',
    violet: 'text-violet-500 dark:text-violet-400',
    orange: 'text-orange-500 dark:text-orange-400',
    fuchsia: 'text-fuchsia-500 dark:text-fuchsia-400',
    emerald: 'text-emerald-500 dark:text-emerald-400',
    amber: 'text-amber-500 dark:text-amber-400',
    stone: 'text-stone-500 dark:text-stone-400',
};

// Mirrors AdminLayout's <aside> exactly — collapse on desktop, off-canvas
// drawer on mobile, left-border active indicator — so both panels feel
// like the same product. Unlike admin, this sidebar also owns the account
// header + logout button, since the user panel has no separate top-level
// control for that. collapsed/mobileOpen state lives in UserPanelLayout
// and is passed down so the mobile top bar and backdrop can react to it.
function UserPanelSidebar({ username, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [loggingOut, setLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState('');

    const navItems = getUserNavItems(username);

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
        <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col justify-between border-r border-stone-200 bg-white text-stone-900 transition-transform duration-200 ease-in-out dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 md:sticky md:top-0 md:h-screen md:translate-x-0 md:transition-[width] ${
                mobileOpen ? 'translate-x-0' : '-translate-x-full'
            } ${collapsed ? 'md:w-16' : 'md:w-60'}`}
        >
            <div>
                <div className="flex items-center justify-between px-3 py-5">
                    {!collapsed && <span className="text-lg font-semibold">My Account</span>}
                    <button
                        type="button"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 md:hidden"
                        aria-label="Close menu"
                    >
                        <X size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setCollapsed((c) => !c)}
                        className="hidden rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 md:block"
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                {!collapsed && (
                    <div className="mb-2 flex items-center gap-3 px-4 pb-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                            {username?.[0]?.toUpperCase() || '?'}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">{username}</p>
                            <p className="text-xs text-stone-500 dark:text-stone-400">Account</p>
                        </div>
                    </div>
                )}

                <nav className="flex flex-col gap-1 overflow-y-auto px-2 pb-4">
                    {navItems.map(({ label, path, icon: Icon, color }) => {
                        const iconColorClass = ICON_COLOR_CLASSES[color] || ICON_COLOR_CLASSES.stone;
                        return (
                            <NavLink
                                key={path}
                                to={path}
                                onClick={() => setMobileOpen(false)}
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
                                        <Icon
                                            size={18}
                                            className={`shrink-0 transition-colors ${
                                                isActive ? '' : `${iconColorClass} group-hover:text-brand-700 dark:group-hover:text-brand-400`
                                            }`}
                                            aria-hidden="true"
                                        />
                                        {!collapsed && <span>{label}</span>}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>
            </div>

            <div className="border-t border-stone-100 px-2 py-3 dark:border-stone-800">
                {logoutError && !collapsed && (
                    <p className="mb-1 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
                        {logoutError}
                    </p>
                )}
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
    );
}

export default UserPanelSidebar;