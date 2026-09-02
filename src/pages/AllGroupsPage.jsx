import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCatalogGroups } from '../store/slices/productSlice'; // ⚠️ adjust path
import { GroupTile } from '../components'; // ⚠️ adjust path

function AllGroupsPage() {
    const { categoryName } = useParams(); // undefined on the top-level /products/groups route
    const dispatch = useDispatch();
    const groups = useSelector((s) => s.products.catalogGroups);

    useEffect(() => {
        dispatch(fetchCatalogGroups({ category: categoryName }));
    }, [dispatch, categoryName]);

    return (
        <div>
            <div className="flex items-center gap-2 text-sm text-neutral-400 mb-4">
                <Link to="/products" className="hover:underline">Products</Link>
                {categoryName && (
                    <>
                        <span>/</span>
                        <Link to={`/products/category/${encodeURIComponent(categoryName)}`} className="hover:underline">
                            {categoryName}
                        </Link>
                    </>
                )}
                <span>/</span>
                <span>All groups</span>
            </div>

            <h1 className="text-xl font-semibold mb-4">
                {categoryName ? `All groups in ${categoryName}` : 'All groups'}
            </h1>

            {groups.status === 'loading' && <p className="text-neutral-400">Loading...</p>}
            {groups.status === 'failed' && <p className="text-red-400">Failed to load groups.</p>}
            {groups.status === 'succeeded' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.items.map((g) => (
                        <GroupTile
                            key={`${g.sampleCategory || categoryName}-${g.name}`}
                            name={g.name}
                            count={g.count}
                            sampleFileID={g.sampleFileID}
                            categoryName={categoryName || g.sampleCategory}
                        />
                    ))}
                    {groups.items.length === 0 && (
                        <p className="text-neutral-400 col-span-full">No groups yet.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default AllGroupsPage;