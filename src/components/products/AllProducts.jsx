import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCatalogCategories, fetchCatalogGroups } from '../../store/slices/productSlice'; // ⚠️ adjust path
import { CategoryTile, GroupTile, ViewAllTile} from '../.';


const PREVIEW_LIMIT = 4;

// Landing view on /products: both categories and groups shown together,
// each capped at 4 with its own "view all" tile. This component only
// fetches and displays — every tile click is real navigation (see
// CategoryTile / GroupTile), so nothing here needs local selection state.
function AllProducts() {
    const dispatch = useDispatch();
    const categories = useSelector((s) => s.products.catalogCategories);
    const groups = useSelector((s) => s.products.catalogGroups);

    useEffect(() => {
        dispatch(fetchCatalogCategories());
        dispatch(fetchCatalogGroups({})); // no category = groups across the whole catalog
    }, [dispatch]);

    return (
        <div className="space-y-10">
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

            <section>
                <h2 className="text-lg font-medium mb-4">Shop by group</h2>
                {groups.status === 'loading' && <p className="text-neutral-400">Loading groups...</p>}
                {groups.status === 'failed' && <p className="text-red-400">Failed to load groups.</p>}
                {groups.status === 'succeeded' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groups.items.slice(0, PREVIEW_LIMIT).map((g) => (
                            <GroupTile
                                key={g.name}
                                name={g.name}
                                count={g.count}
                                sampleFileID={g.sampleFileID}
                                categoryName={g.sampleCategory}
                            />
                        ))}
                        {groups.items.length > PREVIEW_LIMIT && (
                            <ViewAllTile to="/products/groups" label="View all groups" />
                        )}
                        {groups.items.length === 0 && (
                            <p className="text-neutral-400 col-span-full">No groups yet.</p>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}

export default AllProducts;