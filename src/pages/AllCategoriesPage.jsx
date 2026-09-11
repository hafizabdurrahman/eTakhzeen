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
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100">All categories</h1>
            {categories.status === 'loading' && <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>}
            {categories.status === 'failed' && <p className="text-sm text-red-600 dark:text-red-400">Failed to load categories.</p>}
            {categories.status === 'succeeded' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {categories.items.map((c) => (
                        <CategoryTile key={c.name} name={c.name} sampleFileID={c.sampleFileID} />
                    ))}
                    {categories.items.length === 0 && (
                        <p className="col-span-full text-sm text-gray-500 dark:text-gray-400">No categories yet.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default AllCategoriesPage;