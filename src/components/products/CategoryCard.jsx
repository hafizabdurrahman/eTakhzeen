import React from 'react';

// Plain, clickable card for a category. `count` is how many products are
// in it. onSelect is called with the category name when clicked.
function CategoryCard({ name, count, onSelect }) {
    return (
        <button
            onClick={() => onSelect(name)}
            className="text-left border border-neutral-800 rounded-lg p-4 hover:border-neutral-600 w-full"
        >
            <p className="font-medium">{name}</p>
            <p className="text-neutral-500 text-sm">{count} product{count === 1 ? '' : 's'}</p>
        </button>
    );
}

export default CategoryCard;