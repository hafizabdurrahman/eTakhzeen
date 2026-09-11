import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Always rendered under the catalog grid — including when there's only
// one page or zero results — so the layout doesn't jump as result counts
// change. In that case every control is simply disabled rather than the
// component disappearing.
function Pagination({ page, pageSize, total, onPageChange }) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const inactive = totalPages <= 1;
    const pages = getPageNumbers(page, totalPages);

    return (
        <div className="mt-8 flex items-center justify-center gap-1.5">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={inactive || page <= 1}
                title="Previous page"
                aria-label="Previous page"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 text-stone-600 transition-colors hover:border-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-stone-200 disabled:hover:text-stone-600 dark:border-stone-800 dark:text-stone-400 dark:hover:border-brand-500 dark:hover:text-brand-400 dark:disabled:hover:border-stone-800 dark:disabled:hover:text-stone-400"
            >
                <ChevronLeft size={16} />
            </button>

            {pages.map((p, i) =>
                p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-1.5 text-sm text-stone-400 dark:text-stone-500">
                        …
                    </span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        disabled={inactive}
                        className={`flex h-9 min-w-9 items-center justify-center rounded-md border px-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                            p === page && !inactive
                                ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500'
                                : 'border-stone-200 text-stone-700 hover:border-brand-600 hover:text-brand-700 dark:border-stone-800 dark:text-stone-300 dark:hover:border-brand-500 dark:hover:text-brand-400'
                        } ${inactive ? 'opacity-40' : ''}`}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                onClick={() => onPageChange(page + 1)}
                disabled={inactive || page >= totalPages}
                title="Next page"
                aria-label="Next page"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 text-stone-600 transition-colors hover:border-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-stone-200 disabled:hover:text-stone-600 dark:border-stone-800 dark:text-stone-400 dark:hover:border-brand-500 dark:hover:text-brand-400 dark:disabled:hover:border-stone-800 dark:disabled:hover:text-stone-400"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
}

function getPageNumbers(current, total) {
    const delta = 1;
    const range = [];
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
        range.push(i);
    }
    const pages = [1];
    if (range[0] > 2) pages.push('...');
    pages.push(...range);
    if (range[range.length - 1] < total - 1) pages.push('...');
    if (total > 1) pages.push(total);
    return pages;
}

export default Pagination;