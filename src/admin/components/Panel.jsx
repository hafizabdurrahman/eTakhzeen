import React from 'react';

// Same card-head pattern as the `Panel` component in AdminDashboard.jsx.
// Duplicated here (rather than importing it) because AdminDashboard.jsx
// doesn't export it — if you'd rather share one definition, move this into
// a common admin components file and import it from both places.
export function Panel({ title, subtitle, children, className = '', action }) {
    return (
        <div
            className={`overflow-hidden rounded-lg border border-stone-200 bg-cream shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900 ${className}`}
        >
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-800/40 sm:px-5">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
                    {subtitle && <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className="p-4 sm:p-5">{children}</div>
        </div>
    );
}

export default Panel;