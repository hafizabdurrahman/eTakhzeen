import React from 'react';
import { Link } from 'react-router';
import service from '../../backend/service'; // ⚠️ adjust path

// Circular avatar tile for a product group. Used two ways:
//  - as a plain navigation Link when no `onSelect` is passed
//  - as an in-place toggle button when `onSelect` IS passed
function GroupTile({ name, count, sampleFileID, categoryName, isActive, onSelect }) {
    const isSelectable = typeof onSelect === 'function';

    const avatar = (
        <div
            className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 transition-all duration-200 sm:h-20 sm:w-20 ${
                isActive
                    ? 'border-brand-600 shadow-md shadow-brand-600/20 dark:border-brand-500 dark:shadow-brand-500/20'
                    : 'border-stone-200 group-hover:border-brand-400 dark:border-stone-800 dark:group-hover:border-brand-500'
            }`}
        >
            {sampleFileID ? (
                <img
                    src={service.getImagePreview({ fileId: sampleFileID })}
                    alt={name}
                    className="h-full w-full object-cover"
                />
            ) : (
                <div className="h-full w-full bg-stone-100 dark:bg-stone-800" />
            )}
        </div>
    );

    const label = (
        <span
            className={`max-w-[5.5rem] truncate text-xs font-medium sm:text-sm ${
                isActive ? 'text-brand-700 dark:text-brand-400' : 'text-stone-700 dark:text-stone-300'
            }`}
        >
            {name}
        </span>
    );

    const countLabel = (
        <span className="max-w-[5.5rem] truncate text-[10px] text-stone-400 dark:text-stone-500">
            {count} {count === 1 ? 'item' : 'items'}
        </span>
    );

    if (isSelectable) {
        return (
            <button
                type="button"
                onClick={onSelect}
                title={name}
                aria-label={`Filter by ${name}`}
                aria-pressed={isActive}
                className="group flex flex-col items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-950"
            >
                {avatar}
                {label}
                {countLabel}
            </button>
        );
    }

    return (
        <Link
            to={`/products/category/${encodeURIComponent(categoryName)}/group/${encodeURIComponent(name)}`}
            className="group flex flex-col items-center gap-2"
        >
            {avatar}
            {label}
            {countLabel}
        </Link>
    );
}

export default GroupTile;