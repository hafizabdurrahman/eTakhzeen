import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCatalogGroups } from '../store/slices/productSlice'; // ⚠️ adjust path
import { GroupTile, ViewAllTile } from '../components'; // ⚠️ adjust path

const PREVIEW_LIMIT = 4;

function CategoryGroupsPage() {
    const { categoryName } = useParams();
    const dispatch = useDispatch();
    const groups = useSelector((s) => s.products.catalogGroups);

    useEffect(() => {
        dispatch(fetchCatalogGroups({ category: categoryName }));
    }, [dispatch, categoryName]);

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Link to="/products" className="hover:text-brand-600 hover:underline dark:hover:text-brand-500">Products</Link>
                <span>/</span>
                <span>{categoryName}</span>
            </div>

            <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100">{categoryName}</h1>

            {groups.status === 'loading' && <p className="text-sm text-gray-500 dark:text-gray-400">Loading groups...</p>}
            {groups.status === 'failed' && <p className="text-sm text-red-600 dark:text-red-400">Failed to load groups.</p>}
            {groups.status === 'succeeded' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.items.slice(0, PREVIEW_LIMIT).map((g) => (
                        <GroupTile key={g.name} name={g.name} count={g.count} sampleFileID={g.sampleFileID} categoryName={categoryName} />
                    ))}
                    {groups.items.length > PREVIEW_LIMIT && (
                        <ViewAllTile to={`/products/category/${encodeURIComponent(categoryName)}/groups`} label="View all groups" />
                    )}
                    {groups.items.length === 0 && (
                        <p className="col-span-full text-sm text-gray-500 dark:text-gray-400">No groups in this category yet.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default CategoryGroupsPage;