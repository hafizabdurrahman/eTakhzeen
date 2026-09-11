import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { fetchCatalogCategories } from '../../store/slices/productSlice'; // ⚠️ adjust path
import { CategoryTile } from '../.';

const DISPLAY_LIMIT = 5;

// Always-mounted category strip at the top of the Products page, shown as
// circular avatars. Caps at 5 tiles; anything beyond that collapses into a
// single "+N" circle that navigates to the full categories page — no
// in-place expansion anymore.
function CategoriesSection({ selectedCategory, onSelect }) {
    const dispatch = useDispatch();
    const categories = useSelector((s) => s.products.catalogCategories);

    useEffect(() => {
        if (categories.items.length === 0 && categories.status === 'idle') {
            dispatch(fetchCatalogCategories());
        }
    }, [dispatch, categories.items.length, categories.status]);

    if (categories.status === 'loading' && categories.items.length === 0) {
        return (
            <section className="mb-8">
                <h2 className="mb-4 text-xl font-semibold text-stone-900 dark:text-stone-100">Categories</h2>
                <div className="flex gap-5 sm:gap-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="h-16 w-16 animate-pulse rounded-full bg-stone-100 dark:bg-stone-800 sm:h-20 sm:w-20" />
                            <div className="h-3 w-10 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (categories.status === 'failed') {
        return <p className="text-sm text-red-600 dark:text-red-400">Failed to load categories.</p>;
    }

    if (categories.items.length === 0) {
        return null;
    }

    const visible = categories.items.slice(0, DISPLAY_LIMIT);
    const remaining = categories.items.length - DISPLAY_LIMIT;
    const hasMore = remaining > 0;

    return (
        <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Categories</h2>
                {selectedCategory && (
                    <button
                        type="button"
                        onClick={() => onSelect(null)}
                        className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-500"
                    >
                        Clear category
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-5 sm:gap-6">
                {visible.map((c) => (
                    <CategoryTile
                        key={c.name}
                        name={c.name}
                        sampleFileID={c.sampleFileID}
                        isActive={selectedCategory === c.name}
                        onSelect={onSelect ? () => onSelect(c.name === selectedCategory ? null : c.name) : undefined}
                    />
                ))}

                {hasMore && (
                    <Link
                        to="/products/categories"
                        title="View all categories"
                        aria-label={`View all ${categories.items.length} categories`}
                        className="group flex flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-950 rounded-lg"
                    >
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-stone-300 bg-stone-50 text-stone-500 transition-colors group-hover:border-brand-400 group-hover:bg-brand-50/50 group-hover:text-brand-600 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400 dark:group-hover:border-brand-500 dark:group-hover:bg-brand-500/5 dark:group-hover:text-brand-400 sm:h-20 sm:w-20">
                            <Plus size={22} strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-medium text-stone-500 dark:text-stone-400 sm:text-sm">
                            +{remaining} more
                        </span>
                    </Link>
                )}
            </div>
        </section>
    );
}

export default CategoriesSection;