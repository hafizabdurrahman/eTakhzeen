import React from 'react';

// Numbered pagination with prev/next and condensed page numbers
// (first, last, current ±1, with ellipses for large page counts).
function Pagination({ page, pageSize, total, onPageChange }) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) return null;

    const pages = getPageNumbers(page, totalPages);

    return (
        <div className="flex items-center justify-center gap-1 mt-6">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded-md border border-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed hover:border-neutral-600"
            >
                Prev
            </button>

            {pages.map((p, i) =>
                p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-neutral-500">...</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={`px-3 py-1.5 text-sm rounded-md border ${
                            p === page
                                ? 'border-neutral-400 bg-neutral-800'
                                : 'border-neutral-800 hover:border-neutral-600'
                        }`}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm rounded-md border border-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed hover:border-neutral-600"
            >
                Next
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