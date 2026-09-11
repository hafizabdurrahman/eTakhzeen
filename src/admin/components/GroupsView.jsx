import React, { useEffect, useState } from 'react';
import { ArrowRight, Layers } from 'lucide-react';
import service from '../../backend/service';
import { DonutChart } from '../../ui';

const CHART_COLORS = ['#0ea5e9', '#f97316', '#8b5cf6', '#10b981', '#ef4444', '#eab308', '#6366f1', '#14b8a6'];

// Read-only list of distinct groups with a product count each.
// Optionally scoped to a single category (pass `category`).
function GroupsView({ category, onSelect }) {
    const [groups, setGroups] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            const result = await service.listGroups({ category: category || undefined });
            if (cancelled) return;
            if (result === false) {
                setError('Failed to load groups.');
            } else {
                setGroups(result);
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [category]);

    const entries = Object.entries(groups);

    if (loading) return <p className="text-sm text-stone-500 dark:text-stone-400">Loading groups...</p>;
    if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
    if (entries.length === 0) return <p className="text-sm text-stone-500 dark:text-stone-400">No groups yet.</p>;

    const segments = entries.map(([name, count], i) => ({
        label: name,
        value: count,
        color: CHART_COLORS[i % CHART_COLORS.length],
    }));

    return (
        <div>
            <h2 className="mb-1 text-xl font-semibold text-stone-900 dark:text-stone-100">
                Groups{category ? ` in ${category}` : ''}
            </h2>
            <p className="mb-5 text-sm text-stone-500 dark:text-stone-400">
                {entries.length} group{entries.length === 1 ? '' : 's'}{category ? ` in ${category}` : ' across your catalog'}.
            </p>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
                <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <DonutChart segments={segments} centerLabel="Products" />
                </div>

                <ul className="grid content-start gap-2.5 sm:grid-cols-2">
                    {entries.map(([name, count], i) => (
                        <li
                            key={name}
                            className="group flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                                    style={{ backgroundColor: `${CHART_COLORS[i % CHART_COLORS.length]}1a` }}
                                >
                                    <Layers size={15} style={{ color: CHART_COLORS[i % CHART_COLORS.length] }} />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-stone-900 dark:text-stone-100">{name}</p>
                                    <p className="text-xs text-stone-500 dark:text-stone-400">
                                        {count} product{count === 1 ? '' : 's'}
                                    </p>
                                </div>
                            </div>
                            {onSelect && (
                                <button
                                    onClick={() => onSelect(name)}
                                    className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-brand-50 dark:text-brand-500 dark:hover:bg-brand-500/10"
                                >
                                    View <ArrowRight size={14} />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default GroupsView;