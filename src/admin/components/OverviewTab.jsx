import React from 'react';
import { FileEdit, Star, Send } from 'lucide-react';

// TODO: wire these to a real posts table/slice once one exists. There is
// currently no backend for tracking generated social posts, so these are
// static placeholder numbers only — not derived from `usePostDraftState`,
// which is scoped to a single composer session and resets on refresh.
const DUMMY_STATS = [
    { label: 'Posts Created', value: 0, icon: Send, chip: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' },
    { label: 'Drafts', value: 0, icon: FileEdit, chip: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
    { label: 'Starred', value: 0, icon: Star, chip: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400' },
];

export function OverviewTab() {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                {DUMMY_STATS.map(({ label, value, icon: Icon, chip }) => (
                    <div
                        key={label}
                        className="flex min-h-[100px] cursor-default flex-col items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-cream p-3.5 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-4"
                    >
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${chip}`}>
                            <Icon size={15} />
                        </span>
                        <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</p>
                        <p className="text-xl font-bold tabular-nums text-stone-900 dark:text-stone-100 sm:text-2xl">
                            {value}
                        </p>
                    </div>
                ))}
            </div>
            <div className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                These numbers are placeholders — post tracking isn't connected to a backend yet.
            </div>
        </div>
    );
}

export default OverviewTab;