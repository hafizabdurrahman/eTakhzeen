import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCatalogGroups } from '../../store/slices/productSlice'; // ⚠️ adjust path to match where productSlice.js actually lives
import { GroupTile } from '../.';

const PREVIEW_LIMIT = 4;

// Same idea one level down — only rendered by Products.jsx once a category
// is selected. Re-fetches whenever categoryName changes.
function GroupsSection({ categoryName, selectedGroup, onSelect }) {
    const dispatch = useDispatch();
    const groups = useSelector((s) => s.products.catalogGroups);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        setShowAll(false);
        dispatch(fetchCatalogGroups({ category: categoryName }));
    }, [dispatch, categoryName]);

    if (groups.status === 'loading') {
        return <p className="text-neutral-400">Loading groups...</p>;
    }
    if (groups.status === 'failed') {
        return <p className="text-red-400">Failed to load groups.</p>;
    }
    if (groups.status === 'succeeded' && groups.items.length === 0) {
        return <p className="text-neutral-400 mb-6">No groups in this category yet.</p>;
    }

    const visible = showAll ? groups.items : groups.items.slice(0, PREVIEW_LIMIT);
    const hasMore = groups.items.length > PREVIEW_LIMIT;

    return (
        <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-medium">Groups in {categoryName}</h2>
                {selectedGroup && (
                    <button onClick={() => onSelect(null)} className="text-sm text-neutral-400 hover:underline">
                        Clear group
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visible.map((g) => (
                    <GroupTile
                        key={g.name}
                        name={g.name}
                        count={g.count}
                        sampleFileID={g.sampleFileID}
                        isActive={selectedGroup === g.name}
                        onSelect={() => onSelect(g.name === selectedGroup ? null : g.name)}
                    />
                ))}
            </div>
            {hasMore && (
                <button onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm text-neutral-400 hover:underline">
                    {showAll ? 'Show less' : `Show all ${groups.items.length} groups`}
                </button>
            )}
        </section>
    );
}

export default GroupsSection;