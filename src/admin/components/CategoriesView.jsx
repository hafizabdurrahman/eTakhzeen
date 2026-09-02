import React, { useEffect, useState } from 'react';
import service from '../../backend/service';

// Read-only list of distinct categories with a product count each.
// onSelect (optional) lets the parent jump to a filtered product list.
function CategoriesView({ onSelect }) {
    const [categories, setCategories] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            const result = await service.listCategories();
            if (cancelled) return;
            if (result === false) {
                setError('Failed to load categories.');
            } else {
                setCategories(result);
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const entries = Object.entries(categories);

    if (loading) return <p className="text-neutral-400">Loading categories...</p>;
    if (error) return <p className="text-red-400">{error}</p>;
    if (entries.length === 0) return <p className="text-neutral-400">No categories yet.</p>;

    return (
        <div>
            <h2 className="text-lg font-semibold mb-3">Categories</h2>
            <ul className="space-y-2">
                {entries.map(([name, count]) => (
                    <li
                        key={name}
                        className="flex items-center justify-between border border-neutral-800 rounded-md px-3 py-2"
                    >
                        <span>{name}</span>
                        <span className="text-neutral-500 text-sm">{count} product{count === 1 ? '' : 's'}</span>
                        {onSelect && (
                            <button
                                onClick={() => onSelect(name)}
                                className="text-blue-400 text-sm hover:underline"
                            >
                                View products
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default CategoriesView;