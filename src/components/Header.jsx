import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router';
import { useSelector } from 'react-redux';
import {
    CircleUserRound,
    Home,
    LayoutDashboard,
    LogIn,
    Mail,
    Menu,
    Sparkles,
    ShoppingBag,
    ShoppingCart,
    Store,
    UserPlus,
    X,
} from 'lucide-react';
import { NotificationBell } from '.';
import ThemeToggle from './ThemeToggle';

const NAV_LINK_CLASS =
    'rounded-full px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100';

const NAV_LINK_ACTIVE_CLASS =
    'rounded-full px-4 py-2 text-sm font-medium bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400';

function Header() {
    const location = useLocation();
    const status = useSelector((s) => s.user.status);
    const userData = useSelector((s) => s.user.userData);
    const isAdmin = userData?.labels?.includes('admin');
    const cartCount = useSelector((s) => s.cart?.items?.length);

    const [menuOpen, setMenuOpen] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);

    useEffect(() => {
        if (menuOpen) {
            document.body.style.overflow = 'hidden';
            const frame = requestAnimationFrame(() => setMenuVisible(true));
            return () => {
                cancelAnimationFrame(frame);
                document.body.style.overflow = '';
            };
        }
        document.body.style.overflow = '';
        return undefined;
    }, [menuOpen]);

    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Escape') closeMenu();
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    function closeMenu() {
        setMenuVisible(false);
        setTimeout(() => setMenuOpen(false), 220);
    }

    const navItems = [
        { to: '/', label: 'Home', icon: Home },
        { to: '/products', label: 'Products', icon: ShoppingBag },
        { to: '/contact', label: 'Contact', icon: Mail },
    ];

    const isActive = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));
    const rowDelay = (index) => `${index * 55 + 120}ms`;

    const sidebar = menuOpen && (
        <MobileSidebar
            menuVisible={menuVisible}
            closeMenu={closeMenu}
            navItems={navItems}
            isActive={isActive}
            rowDelay={rowDelay}
            status={status}
            userData={userData}
            isAdmin={isAdmin}
            cartCount={cartCount}
        />
    );

    return (
        <header className="sticky top-0 z-100 border-b border-stone-200 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80 dark:border-stone-800 dark:bg-stone-950/95 dark:supports-[backdrop-filter]:bg-stone-950/80">
            {/* ---------- SINGLE-ROW BAR ---------- */}
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                <Link to="/" className="flex shrink-0 items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white dark:bg-brand-500">
                        <Store size={17} />
                    </span>
                    <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                        eTakhzeen
                    </span>
                </Link>

                {/* Nav links — now sit where the search bar used to be,
                    centered in the middle of the bar. Hidden below lg,
                    where the hamburger + sidebar take over instead. */}
                <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
                    {navItems.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={isActive(item.to) ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_CLASS}
                        >
                            {item.label}
                        </Link>
                    ))}
                    <Link
                        to="/sell"
                        className={`${isActive('/sell') ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_CLASS} inline-flex items-center gap-1`}
                    >
                        <Sparkles size={13} />
                        Become a Seller
                    </Link>
                    {isAdmin && (
                        <Link to="/admin" className={isActive('/admin') ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_CLASS}>
                            Admin Dashboard
                        </Link>
                    )}
                </nav>

                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setMenuOpen(true)}
                        aria-label="Open menu"
                        aria-expanded={menuOpen}
                        aria-controls="mobile-menu"
                        className="flex h-9 w-9 items-center justify-center rounded-md text-stone-600 transition-colors hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:text-stone-300 dark:hover:bg-stone-800 dark:focus-visible:ring-offset-stone-950 lg:hidden"
                    >
                        <Menu size={20} />
                    </button>

                    <Link
                        to={status && userData?.['$id'] ? `/${userData['$id']}/cart` : '/welcome-back'}
                        title="Cart"
                        aria-label="Cart"
                        className="relative rounded-md p-1.5 text-stone-500 transition-colors hover:bg-brand-50 hover:text-brand-700 dark:text-stone-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400"
                    >
                        <ShoppingCart size={20} />
                        {Boolean(cartCount) && (
                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white dark:bg-brand-500">
                                {cartCount}
                            </span>
                        )}
                    </Link>

                    {status && userData?.['$id'] && (
                        <div className="flex items-center">
                            <NotificationBell />
                        </div>
                    )}

                    {status && userData?.['$id'] && !isAdmin && (
                        <Link
                            to={`/${userData['$id']}/profile`}
                            title="My profile"
                            aria-label="My profile"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 dark:focus-visible:ring-offset-stone-950"
                        >
                            <CircleUserRound size={20} aria-hidden="true" />
                        </Link>
                    )}

                    {!status && (
                        <div className="hidden items-center gap-2 sm:flex">
                            <Link
                                to="/welcome-back"
                                className="rounded-md px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                            >
                                Login
                            </Link>
                            <Link
                                to="/create-account"
                                className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                            >
                                Signup
                            </Link>
                        </div>
                    )}

                    <ThemeToggle />
                </div>
            </div>

            {/* Portal — escapes the header's own stacking context entirely,
                so no sibling/section elsewhere on the page (hero, etc.) can
                ever paint over it regardless of that element's z-index. */}
            {sidebar && createPortal(sidebar, document.body)}
        </header>
    );
}

/**
 * The actual drawer markup, split out so it can be passed to createPortal
 * cleanly. z-[9999] is intentionally far above any z-index used elsewhere
 * in the app (hero sections, modals, etc. rarely exceed z-50/z-100).
 */
function MobileSidebar({
    menuVisible,
    closeMenu,
    navItems,
    isActive,
    rowDelay,
    status,
    userData,
    isAdmin,
    cartCount,
}) {
    return (
        <div className="fixed inset-0 z-[9999] lg:hidden">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-stone-900/50 transition-opacity duration-300 ${
                    menuVisible ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={closeMenu}
            />

            {/* Drawer panel */}
            <div
                id="mobile-menu"
                role="dialog"
                aria-modal="true"
                aria-label="Menu"
                className={`absolute left-0 top-0 flex h-full w-[300px] max-w-[85vw] flex-col overflow-x-hidden border-r border-stone-200 bg-cream shadow-2xl transition-transform duration-300 ease-out dark:border-stone-800 dark:bg-stone-950 ${
                    menuVisible ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Header row */}
                <div className="flex items-center justify-between border-b border-stone-200 px-4 py-4 dark:border-stone-800">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white dark:bg-brand-500">
                            <Store size={17} />
                        </span>
                        <span className="truncate text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
                            eTakhzeen
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={closeMenu}
                        aria-label="Close menu"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-500 transition-all duration-200 hover:rotate-90 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Profile / auth strip */}
                <div className="border-b border-stone-200 px-4 py-4 dark:border-stone-800">
                    {status && userData?.['$id'] ? (
                        <Link
                            to={isAdmin ? '/admin' : `/${userData['$id']}/profile`}
                            onClick={closeMenu}
                            className="flex min-w-0 items-center gap-3 rounded-xl bg-stone-100 p-2.5 transition-colors hover:bg-stone-200 dark:bg-stone-900 dark:hover:bg-stone-800"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white dark:bg-brand-500">
                                <CircleUserRound size={18} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                                    {userData?.name || 'My Account'}
                                </div>
                                <div className="truncate text-xs text-stone-500 dark:text-stone-400">
                                    {isAdmin ? 'Admin Dashboard' : 'View profile'}
                                </div>
                            </div>
                        </Link>
                    ) : (
                        <div className="flex gap-2">
                            <Link
                                to="/welcome-back"
                                onClick={closeMenu}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-stone-100 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
                            >
                                <LogIn size={14} />
                                Login
                            </Link>
                            <Link
                                to="/create-account"
                                onClick={closeMenu}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                            >
                                <UserPlus size={14} />
                                Signup
                            </Link>
                        </div>
                    )}
                </div>

                {/* Nav list */}
                <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3">
                    <div className="flex flex-col gap-1">
                        {navItems.map((item, idx) => {
                            const ItemIcon = item.icon;
                            const active = isActive(item.to);
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    onClick={closeMenu}
                                    className={`group relative flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-out ${
                                        active
                                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                                            : 'text-stone-700 hover:translate-x-1 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                                    } ${menuVisible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}
                                    style={{ transitionDelay: rowDelay(idx) }}
                                >
                                    {active && (
                                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-brand-600 dark:bg-brand-400" />
                                    )}
                                    <span
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                                            active
                                                ? 'bg-brand-600 text-white dark:bg-brand-500'
                                                : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                                        }`}
                                    >
                                        <ItemIcon size={15} />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                </Link>
                            );
                        })}

                        <Link
                            to="/sell"
                            onClick={closeMenu}
                            className={`group relative flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition-all duration-300 ease-out hover:translate-x-1 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 ${
                                menuVisible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                            }`}
                            style={{ transitionDelay: rowDelay(navItems.length) }}
                        >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 dark:bg-amber-500/10 dark:text-amber-400">
                                <Sparkles size={15} />
                            </span>
                            <span className="min-w-0 flex-1 truncate">Become a Seller</span>
                        </Link>

                        {isAdmin && (
                            <Link
                                to="/admin"
                                onClick={closeMenu}
                                className={`group relative flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition-all duration-300 ease-out hover:translate-x-1 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 ${
                                    menuVisible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                                }`}
                                style={{ transitionDelay: rowDelay(navItems.length + 1) }}
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 dark:bg-violet-500/10 dark:text-violet-400">
                                    <LayoutDashboard size={15} />
                                </span>
                                <span className="min-w-0 flex-1 truncate">Admin Dashboard</span>
                            </Link>
                        )}
                    </div>
                </nav>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3 dark:border-stone-800">
                    <Link
                        to={status && userData?.['$id'] ? `/${userData['$id']}/cart` : '/welcome-back'}
                        onClick={closeMenu}
                        className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                        <span className="relative shrink-0">
                            <ShoppingCart size={17} />
                            {Boolean(cartCount) && (
                                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand-600 px-0.5 text-[9px] font-semibold text-white dark:bg-brand-500">
                                    {cartCount}
                                </span>
                            )}
                        </span>
                        <span className="truncate">Cart</span>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Header;