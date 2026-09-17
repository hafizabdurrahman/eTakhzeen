import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { CircleUserRound, Menu, Search, ShoppingCart, Sparkles, Store, X } from 'lucide-react';
import { NotificationBell } from '.';
import ThemeToggle from './ThemeToggle';
import { setSearchTerm } from '../store/slices/productSlice'; // ⚠️ adjust path

const NAV_LINK_CLASS =
    'rounded-full px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white';

function Header() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const status = useSelector((s) => s.user.status);
    const userData = useSelector((s) => s.user.userData);
    const isAdmin = userData?.labels?.includes('admin');
    // Optional — only renders a badge if a cart slice with an item count actually exists.
    const cartCount = useSelector((s) => s.cart?.items?.length);

    const [searchValue, setSearchValue] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);

    // §10-style modal motion: mount immediately, flip `visible` a frame later
    // so the entrance transition actually plays, and delay the unmount on
    // close so the exit transition plays too.
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
        setTimeout(() => setMenuOpen(false), 150);
    }

    function handleSearchSubmit(e) {
        e.preventDefault();
        dispatch(setSearchTerm(searchValue.trim()));
        navigate('/products');
        closeMenu();
    }

    const navItems = [
        { to: '/', label: 'Home' },
        { to: '/products', label: 'Products' },
        { to: '/contact', label: 'Contact' },
    ];

    return (
        <header className="sticky top-0 z-40 border-b border-stone-200 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80 dark:border-stone-800 dark:bg-stone-950/95 dark:supports-[backdrop-filter]:bg-stone-950/80">
            {/* ---------- UTILITY BAR ---------- */}
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
                <Link to="/" className="order-1 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white dark:bg-brand-500">
                        <Store size={17} />
                    </span>
                    <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                        eTakhzeen
                    </span>
                </Link>

                <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Open menu"
                    aria-expanded={menuOpen}
                    aria-controls="mobile-menu"
                    className="order-2 ml-auto flex h-9 w-9 items-center justify-center rounded-md text-stone-600 transition-colors hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:text-stone-300 dark:hover:bg-stone-800 dark:focus-visible:ring-offset-stone-950 lg:hidden"
                >
                    <Menu size={20} />
                </button>

                {/* Search — full-width row of its own on mobile, inline and
                    centered on desktop. Submitting it drives the same
                    setSearchTerm action the Products page search box uses. */}
                <form
                    onSubmit={handleSearchSubmit}
                    className="order-4 w-full sm:order-3 sm:w-auto sm:flex-1 lg:order-2 lg:max-w-xl"
                >
                    <div className="relative">
                        <Search
                            size={16}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500"
                        />
                        <input
                            type="text"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            placeholder="Search products..."
                            aria-label="Search products"
                            className="w-full rounded-md border border-stone-200 bg-cream px-3 py-2 pl-9 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                        />
                    </div>
                </form>

                {/* Utility icons — always visible (mobile + desktop). */}
                <div className="order-3 ml-auto flex items-center gap-1 lg:order-3 lg:ml-0">
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

            {/* ---------- NAV BAR (desktop) ---------- */}
            <div className="hidden border-t border-stone-100 dark:border-stone-900 lg:block">
                <div className="mx-auto flex max-w-7xl justify-center px-4 py-2 sm:px-6 lg:px-8">
                    <nav className="flex items-center gap-1 rounded-full bg-stone-900 px-2 py-1.5 shadow-lg shadow-stone-900/10 dark:border dark:border-stone-700/60 dark:bg-stone-800 dark:shadow-black/40">
                        {navItems.map((item) => (
                            <Link key={item.to} to={item.to} className={NAV_LINK_CLASS}>
                                {item.label}
                            </Link>
                        ))}
                        <Link to="/sell" className={`${NAV_LINK_CLASS} inline-flex items-center gap-1`}>
                            <Sparkles size={13} />
                            Become a Seller
                        </Link>
                        {isAdmin && (
                            <Link to="/admin" className={NAV_LINK_CLASS}>
                                Admin Dashboard
                            </Link>
                        )}
                    </nav>
                </div>
            </div>

            {/* ---------- MOBILE MENU (drawer) ---------- */}
            {menuOpen && (
                <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
                    <div
                        className={`absolute inset-0 bg-stone-900/50 transition-opacity duration-150 ${
                            menuVisible ? 'opacity-100' : 'opacity-0'
                        }`}
                        onClick={closeMenu}
                    />
                    <div
                        id="mobile-menu"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu"
                        className={`relative flex h-full w-full max-w-xs flex-col overflow-y-auto border-l border-stone-200 bg-cream p-5 shadow-2xl transition-all duration-150 dark:border-stone-800 dark:bg-stone-900 ${
                            menuVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-100'
                        }`}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-lg font-semibold text-stone-900 dark:text-stone-100">Menu</span>
                            <button
                                type="button"
                                onClick={closeMenu}
                                aria-label="Close menu"
                                className="rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <nav className="flex flex-col gap-1 text-sm font-medium">
                            {navItems.map((item) => (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    onClick={closeMenu}
                                    className="rounded-md px-3 py-2.5 text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                                >
                                    {item.label}
                                </Link>
                            ))}
                            <Link
                                to="/sell"
                                onClick={closeMenu}
                                className="flex items-center gap-1.5 rounded-md px-3 py-2.5 text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                            >
                                <Sparkles size={14} />
                                Become a Seller
                            </Link>
                            {isAdmin && (
                                <Link
                                    to="/admin"
                                    onClick={closeMenu}
                                    className="rounded-md px-3 py-2.5 text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                                >
                                    Admin Dashboard
                                </Link>
                            )}
                        </nav>

                        <div className="my-4 border-t border-stone-200 dark:border-stone-800" />

                        {status && userData?.['$id'] && !isAdmin ? (
                            <Link
                                to={`/${userData['$id']}/profile`}
                                onClick={closeMenu}
                                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                    <CircleUserRound size={18} />
                                </span>
                                My profile
                            </Link>
                        ) : !status ? (
                            <div className="flex flex-col gap-2">
                                <Link
                                    to="/welcome-back"
                                    onClick={closeMenu}
                                    className="rounded-md bg-stone-100 px-4 py-2 text-center text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/create-account"
                                    onClick={closeMenu}
                                    className="rounded-md bg-brand-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                                >
                                    Signup
                                </Link>
                            </div>
                        ) : null}

                        <div className="mt-auto flex items-center justify-between pt-4">
                            <span className="text-sm text-stone-500 dark:text-stone-400">Theme</span>
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}

export default Header;