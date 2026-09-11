import React from 'react';
import { Link } from 'react-router';
import { useSelector } from 'react-redux';
import { CircleUserRound } from 'lucide-react';
import { NotificationBell } from '.';
import ThemeToggle from './ThemeToggle';

function Header() {
    const status = useSelector((s) => s.user.status);
    const userData = useSelector((s) => s.user.userData);
    const isAdmin = userData?.labels?.includes('admin');

    return (
        <header className="border-b border-stone-200 bg-cream text-stone-900 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                <Link to="/" className="text-xl font-bold tracking-tight text-brand-700 dark:text-brand-500">
                    eTakhzeen
                </Link>

                <ul className="flex w-full flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium text-stone-500 dark:text-stone-400 sm:w-auto">
                    <li>
                        <Link className="transition-colors hover:text-brand-700 dark:hover:text-brand-400" to="/">
                            Home
                        </Link>
                    </li>
                    <li>
                        <Link className="transition-colors hover:text-brand-700 dark:hover:text-brand-400" to="/contact">
                            Contact
                        </Link>
                    </li>

                    {!status ? (
                        <>
                            <li>
                                <Link className="transition-colors hover:text-brand-700 dark:hover:text-brand-400" to="/welcome-back">
                                    Login
                                </Link>
                            </li>
                            <li>
                                <Link
                                    className="rounded-md bg-brand-600 px-3 py-2 text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                                    to="/create-account"
                                >
                                    Signup
                                </Link>
                            </li>
                        </>
                    ) : (
                        isAdmin && (
                            <li>
                                <Link className="transition-colors hover:text-brand-700 dark:hover:text-brand-400" to="/admin">
                                    Admin Dashboard
                                </Link>
                            </li>
                        )
                    )}

                    <li>
                        <Link
                            className="rounded-md border border-brand-600 px-3 py-2 text-brand-700 transition-colors hover:bg-brand-50 dark:border-brand-500 dark:text-brand-500 dark:hover:bg-stone-900"
                            to="/cart"
                        >
                            Cart
                        </Link>
                    </li>

                    {status && userData?.['$id'] && (
                        <li>
                            <NotificationBell />
                        </li>
                    )}

                    {status && userData?.['$id'] && !isAdmin && (
                        <li>
                            <Link
                                to={`/${userData['$id']}/profile`}
                                title="My profile"
                                aria-label="My profile"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 dark:focus-visible:ring-offset-stone-950"
                            >
                                <CircleUserRound size={20} aria-hidden="true" />
                            </Link>
                        </li>
                    )}

                    <li>
                        <ThemeToggle />
                    </li>
                </ul>
            </div>
        </header>
    );
}

export default Header;