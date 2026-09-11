import React from 'react';
import { Link } from 'react-router';
import { ShieldOff, Home, Mail } from 'lucide-react';

function Blocked() {
    return (
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <ShieldOff size={22} strokeWidth={2} aria-hidden="true" />
            </span>

            <h1 className="mt-4 text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">
                Access blocked
            </h1>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                Your account has been blocked, or you don't have permission to view this page.
                If you think this is a mistake, reach out to support.
            </p>

            <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link
                    to="/contact"
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700 sm:w-auto"
                >
                    <Mail size={16} aria-hidden="true" />
                    Contact support
                </Link>
                <Link
                    to="/"
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-600/20 transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:shadow-brand-500/20 dark:hover:bg-brand-600 sm:w-auto"
                >
                    <Home size={16} aria-hidden="true" />
                    Back to home
                </Link>
            </div>
        </div>
    );
}

export default Blocked;