import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { fetchCatalogCategories } from '../../store/slices/productSlice'; // ⚠️ adjust path
import CategoryTile from './CategoryTile';

const DISPLAY_LIMIT = 6;

// Landing-page preview strip — pure navigation, same circle treatment as
// CategoriesSection but with no selection state (every CategoryTile here
// is a plain Link since onSelect is never passed).
function CategoryPreview(props) {
    const dispatch = useDispatch();
    const categories = useSelector((s) => s.products.catalogCategories);

    useEffect(() => {
        dispatch(fetchCatalogCategories());
    }, [dispatch]);

    return (
        <section>
            <h2 className="mb-4 text-xl font-semibold text-stone-900 dark:text-stone-100">{props?.title || "Categories"}</h2>

            {categories.status === 'loading' && (
                <div className="flex gap-5 sm:gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="h-16 w-16 animate-pulse rounded-full bg-stone-100 dark:bg-stone-800 sm:h-20 sm:w-20" />
                            <div className="h-3 w-10 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
                        </div>
                    ))}
                </div>
            )}

            {categories.status === 'failed' && (
                <p className="text-sm text-red-600 dark:text-red-400">Failed to load categories.</p>
            )}

            {categories.status === 'succeeded' && categories.items.length === 0 && (
                <p className="text-sm text-stone-500 dark:text-stone-400">No categories yet.</p>
            )}

            {categories.status === 'succeeded' && categories.items.length > 0 && (
                <div className="flex justify-center flex-wrap gap-5 sm:gap-6">
                    {categories.items.slice(0, DISPLAY_LIMIT).map((c) => (
                        <CategoryTile key={c.name} name={c.name} sampleFileID={c.sampleFileID} />
                    ))}
                    {categories.items.length > DISPLAY_LIMIT && (
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
                                +{categories.items.length - DISPLAY_LIMIT} more
                            </span>
                        </Link>
                    )}
                </div>
            )}
        </section>
    );
}

export default CategoryPreview;