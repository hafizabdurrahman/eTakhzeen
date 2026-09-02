import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCatalogCategories } from '../store/slices/productSlice'; // ⚠️ adjust path
import { CategoryTile } from '../components'; // ⚠️ adjust path

function AllCategoriesPage() {
    const dispatch = useDispatch();
    const categories = useSelector((s) => s.products.catalogCategories);

    useEffect(() => {
        dispatch(fetchCatalogCategories());
    }, [dispatch]);

    return (
        <div>
            <h1 className="text-xl font-semibold mb-4">All categories</h1>
            {categories.status === 'loading' && <p className="text-neutral-400">Loading...</p>}
            {categories.status === 'failed' && <p className="text-red-400">Failed to load categories.</p>}
            {categories.status === 'succeeded' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {categories.items.map((c) => (
                        <CategoryTile key={c.name} name={c.name} sampleFileID={c.sampleFileID} />
                    ))}
                    {categories.items.length === 0 && (
                        <p className="text-neutral-400 col-span-full">No categories yet.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default AllCategoriesPage;