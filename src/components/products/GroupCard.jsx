import React from 'react';

// Same idea as CategoryCard, one level down.
function GroupCard({ name, count, onSelect }) {
    return (
        <button
            onClick={() => onSelect(name)}
            className="w-full rounded-lg border border-stone-200 bg-cream p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-brand-500 dark:focus-visible:ring-offset-stone-950"
        >
            <p className="font-semibold text-stone-900 dark:text-stone-100">{name}</p>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{count} product{count === 1 ? '' : 's'}</p>
        </button>
    );
}

export default GroupCard;