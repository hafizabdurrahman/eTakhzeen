import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCatalogCategories } from '../../store/slices/productSlice'; // ⚠️ adjust path to match where productSlice.js actually lives
import { CategoryTile } from '../.';

const PREVIEW_LIMIT = 4;

// Always-mounted category strip at the top of the Products page. Capped to
// 4 tiles with an in-place "show all" toggle — no navigation involved in
// expanding it. Selecting/deselecting a tile is reported up via onSelect;
// Products.jsx owns what that does to the URL.
function CategoriesSection({ selectedCategory, onSelect }) {
    const dispatch = useDispatch();
    const categories = useSelector((s) => s.products.catalogCategories);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        if (categories.items.length === 0 && categories.status === 'idle') {
            dispatch(fetchCatalogCategories());
        }
    }, [dispatch, categories.items.length, categories.status]);

    if (categories.status === 'loading' && categories.items.length === 0) {
        return <p className="text-neutral-400">Loading categories...</p>;
    }
    if (categories.status === 'failed') {
        return <p className="text-red-400">Failed to load categories.</p>;
    }
    if (categories.items.length === 0) {
        return null;
    }

    const visible = showAll ? categories.items : categories.items.slice(0, PREVIEW_LIMIT);
    const hasMore = categories.items.length > PREVIEW_LIMIT;

    return (
        <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-medium">Categories</h2>
                {selectedCategory && (
                    <button onClick={() => onSelect(null)} className="text-sm text-neutral-400 hover:underline">
                        Clear category
                    </button>
                )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {visible.map((c) => (
                    <CategoryTile
                        key={c.name}
                        name={c.name}
                        sampleFileID={c.sampleFileID}
                        isActive={selectedCategory === c.name}
                        onSelect={() => onSelect(c.name === selectedCategory ? null : c.name)}
                    />
                ))}
            </div>
            {hasMore && (
                <button
                    onClick={() => setShowAll((v) => !v)}
                    className="mt-3 text-sm text-neutral-400 hover:underline"
                >
                    {showAll ? 'Show less' : `Show all ${categories.items.length} categories`}
                </button>
            )}
        </section>
    );
}

export default CategoriesSection;