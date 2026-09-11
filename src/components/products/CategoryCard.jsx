import React from 'react';

// Plain, clickable card for a category. `count` is how many products are
// in it. onSelect is called with the category name when clicked.
function CategoryCard({ name, count, onSelect }) {
    return (
        <button
            onClick={() => onSelect(name)}
            className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500"
        >
            <p className="font-semibold text-gray-900 dark:text-gray-100">{name}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{count} product{count === 1 ? '' : 's'}</p>
        </button>
    );
}

export default CategoryCard;