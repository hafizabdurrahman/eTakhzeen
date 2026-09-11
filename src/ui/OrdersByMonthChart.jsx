import React, { useEffect, useMemo, useState } from 'react';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Horizontal bars, animated width draw-in — same visual language as the
// theme guide's GroupedBarChart spec (§9: stone track, brand fill,
// duration-700 ease-out draw-in). Built standalone since the real
// ui/GroupedBarChart's props weren't available to match against — swap
// this out for that component if/when you share it.
function OrdersByMonthChart({ orders }) {
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        setAnimated(false);
        const t = requestAnimationFrame(() => setAnimated(true));
        return () => cancelAnimationFrame(t);
    }, [orders]);

    const bars = useMemo(() => {
        const counts = new Map();
        orders.forEach((o) => {
            const d = new Date(o.$createdAt);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        const sortedKeys = Array.from(counts.keys()).sort();
        const recentKeys = sortedKeys.slice(-6);
        const max = Math.max(1, ...recentKeys.map((k) => counts.get(k)));
        return recentKeys.map((k) => {
            const [year, month] = k.split('-').map(Number);
            return {
                key: k,
                label: `${MONTH_LABELS[month]} ${year}`,
                count: counts.get(k),
                pct: (counts.get(k) / max) * 100,
            };
        });
    }, [orders]);

    if (bars.length === 0) {
        return <p className="text-sm text-stone-500 dark:text-stone-400">No data for this period.</p>;
    }

    return (
        <div className="space-y-3">
            {bars.map((bar) => (
                <div key={bar.key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-stone-700 dark:text-stone-300">{bar.label}</span>
                        <span className="tabular-nums text-stone-500 dark:text-stone-400">{bar.count}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                        <div
                            className="h-full rounded-full bg-brand-600 transition-all duration-700 ease-out dark:bg-brand-500"
                            style={{ width: animated ? `${bar.pct}%` : '0%' }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default OrdersByMonthChart;