import React from 'react';
import { useRouteError, isRouteErrorResponse, Link, useNavigate } from 'react-router';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

function Error() {
    const error = useRouteError();
    const navigate = useNavigate();

    const is404 = isRouteErrorResponse(error) && error.status === 404;
    const title = is404 ? 'Page not found' : 'Something went wrong';
    const message = is404
        ? "The page you're looking for doesn't exist or may have been moved."
        : "We hit an unexpected error while loading this page. You can try again or head back home.";

    return (
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <AlertTriangle size={22} strokeWidth={2} aria-hidden="true" />
            </span>

            <h1 className="mt-4 text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">
                {is404 ? '404' : 'Error'} — {title}
            </h1>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                {message}
            </p>

            {!is404 && error?.message && (
                <p className="mt-4 w-full truncate rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    {error.message}
                </p>
            )}

            <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <button
                    type="button"
                    onClick={() => navigate(-1) || navigate('/')}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700 sm:w-auto"
                >
                    <RotateCcw size={16} aria-hidden="true" />
                    Go back
                </button>
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

export default Error;