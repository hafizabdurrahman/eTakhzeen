import React from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';

// Dashed "view all" card, same footprint as GroupTile, dropped into a
// group/category card grid as its trailing cell.
function ViewAllTile({ to, label }) {
    return (
        <Link
            to={to}
            className="group flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:border-stone-700 dark:bg-stone-800/50 dark:hover:border-brand-500 dark:hover:bg-brand-500/5"
        >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors group-hover:bg-brand-100 group-hover:text-brand-600 dark:bg-stone-800 dark:text-stone-400 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400">
                <ArrowRight size={16} />
            </span>
            <span className="px-3 text-sm font-medium text-stone-600 dark:text-stone-300">{label}</span>
        </Link>
    );
}

export default ViewAllTile;