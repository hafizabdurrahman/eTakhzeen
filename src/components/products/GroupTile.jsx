import React from 'react';
import { Link } from 'react-router';
import { Package } from 'lucide-react';
import service from '../../backend/service'; // ⚠️ adjust path

function GroupTile({ name, count, sampleFileID, categoryName, isActive, onSelect }) {
    const isSelectable = typeof onSelect === 'function';

    const content = (
        <>
            <div className="h-16 w-full overflow-hidden rounded-md bg-stone-100 dark:bg-stone-800">
                {sampleFileID ? (
                    <img
                        src={service.getImagePreview({ fileId: sampleFileID })}
                        alt={name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <Package size={18} className="text-stone-400 dark:text-stone-500" />
                    </div>
                )}
            </div>
            <p className="mt-1.5 truncate px-1 text-xs font-medium text-stone-900 dark:text-stone-100">{name}</p>
            <p className="truncate px-1 text-[11px] text-stone-500 dark:text-stone-400">
                {count} {count === 1 ? 'item' : 'items'}
            </p>
        </>
    );

    const sharedClasses = `group block w-24 shrink-0 rounded-lg border bg-cream p-1.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:bg-stone-900 dark:focus-visible:ring-offset-stone-950 ${
        isActive
            ? 'border-brand-600 dark:border-brand-500'
            : 'border-stone-200 hover:border-brand-400 dark:border-stone-800 dark:hover:border-brand-500'
    }`;

    if (isSelectable) {
        return (
            <button type="button" onClick={onSelect} aria-pressed={isActive} className={sharedClasses}>
                {content}
            </button>
        );
    }

    return (
        <Link
            to={`/products/category/${encodeURIComponent(categoryName)}/group/${encodeURIComponent(name)}`}
            className={sharedClasses}
        >
            {content}
        </Link>
    );
}

export default GroupTile;