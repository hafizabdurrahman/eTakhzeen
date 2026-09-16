import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCatalogGroups } from '../../store/slices/productSlice'; // ⚠️ adjust path
import GroupTile from './GroupTile';
import ViewAllTile from './ViewAllTile';

const PREVIEW_LIMIT = 4;

function GroupPreview(props) {
    const dispatch = useDispatch();
    const groups = useSelector((s) => s.products.catalogGroups);

    useEffect(() => {
        dispatch(fetchCatalogGroups({}));
    }, [dispatch]);

    return (
        <section>
            <h2 className="mb-4 text-xl font-semibold text-stone-900 dark:text-stone-100">{props?.title}</h2>
            {groups.status === 'loading' && <p className="text-sm text-stone-500 dark:text-stone-400">Loading groups...</p>}
            {groups.status === 'failed' && <p className="text-sm text-red-600 dark:text-red-400">Failed to load groups.</p>}
            {groups.status === 'succeeded' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                        <p className="col-span-full text-sm text-stone-500 dark:text-stone-400">No groups yet.</p>
                    )}
                </div>
            )}
        </section>
    );
}

export default GroupPreview;