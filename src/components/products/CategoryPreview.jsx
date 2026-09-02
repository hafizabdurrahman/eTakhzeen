import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCatalogCategories } from '../../store/slices/productSlice'; // ⚠️ adjust path
import CategoryTile from './CategoryTile';
import ViewAllTile from './ViewAllTile';

const PREVIEW_LIMIT = 4;

function CategoryPreview() {
    const dispatch = useDispatch();
    const categories = useSelector((s) => s.products.catalogCategories);

    useEffect(() => {
        dispatch(fetchCatalogCategories());
    }, [dispatch]);

    return (
        <section>
            <h2 className="text-lg font-medium mb-4">Shop by category</h2>
            {categories.status === 'loading' && <p className="text-neutral-400">Loading categories...</p>}
            {categories.status === 'failed' && <p className="text-red-400">Failed to load categories.</p>}
            {categories.status === 'succeeded' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {categories.items.slice(0, PREVIEW_LIMIT).map((c) => (
                        <CategoryTile key={c.name} name={c.name} sampleFileID={c.sampleFileID} />
                    ))}
                    {categories.items.length > PREVIEW_LIMIT && (
                        <ViewAllTile to="/products/categories" label="View all categories" />
                    )}
                    {categories.items.length === 0 && (
                        <p className="text-neutral-400 col-span-full">No categories yet.</p>
                    )}
                </div>
            )}
        </section>
    );
}

export default CategoryPreview;