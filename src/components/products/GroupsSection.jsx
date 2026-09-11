import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { fetchCatalogGroups } from '../../store/slices/productSlice'; // ⚠️ adjust path
import { GroupTile } from '../.';

function GroupsSection({ categoryName, selectedGroup, onSelect }) {
    const dispatch = useDispatch();
    const groups = useSelector((s) => s.products.catalogGroups);

    useEffect(() => {
        dispatch(fetchCatalogGroups({ category: categoryName }));
    }, [dispatch, categoryName]);

    if (groups.status === 'loading') {
        return <p className="text-sm text-stone-500 dark:text-stone-400">Loading groups...</p>;
    }
    if (groups.status === 'failed') {
        return <p className="text-sm text-red-600 dark:text-red-400">Failed to load groups.</p>;
    }
    if (groups.status === 'succeeded' && groups.items.length === 0) {
        return <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">No groups in this category yet.</p>;
    }

    return (
        <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Groups in {categoryName}</h2>
                {selectedGroup && (
                    <button
                        type="button"
                        onClick={() => onSelect(null)}
                        className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-500"
                    >
                        Clear group
                    </button>
                )}
            </div>

            {/* single-row, horizontally scrolling strip of small cards — never wraps */}
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {groups.items.map((g) => (
                    <GroupTile
                        key={g.name}
                        name={g.name}
                        count={g.count}
                        sampleFileID={g.sampleFileID}
                        isActive={selectedGroup === g.name}
                        onSelect={() => onSelect(g.name === selectedGroup ? null : g.name)}
                    />
                ))}

                <Link
                    to={`/products/category/${encodeURIComponent(categoryName)}/groups`}
                    className="group flex w-24 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 p-1.5 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-stone-700 dark:bg-stone-800/50 dark:hover:border-brand-500 dark:hover:bg-brand-500/5 dark:focus-visible:ring-offset-stone-950"
                    style={{ minHeight: '5.75rem' }}
                >
                    <ArrowRight size={16} className="text-stone-500 group-hover:text-brand-600 dark:text-stone-400 dark:group-hover:text-brand-400" />
                    <p className="mt-1 text-xs font-medium text-stone-700 dark:text-stone-300">View all</p>
                </Link>
            </div>
        </section>
    );
}

export default GroupsSection;