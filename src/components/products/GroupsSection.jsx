import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { fetchCatalogGroups } from '../../store/slices/productSlice'; // ⚠️ adjust path
import { GroupTile } from '../.';

const DISPLAY_LIMIT = 8;

function GroupsSection({ categoryName, selectedGroup, onSelect }) {
    const dispatch = useDispatch();
    const groups = useSelector((s) => s.products.catalogGroups);

    useEffect(() => {
        dispatch(fetchCatalogGroups({ category: categoryName }));
    }, [dispatch, categoryName]);

    return (
        <section className="mb-6">
            <div className="mb-4 flex items-center justify-between">
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

            {groups.status === 'loading' && (
                <div className="flex flex-wrap gap-5 sm:gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="h-16 w-16 animate-pulse rounded-full bg-stone-100 dark:bg-stone-800 sm:h-20 sm:w-20" />
                            <div className="h-3 w-10 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
                        </div>
                    ))}
                </div>
            )}

            {groups.status === 'failed' && (
                <p className="text-sm text-red-600 dark:text-red-400">Failed to load groups.</p>
            )}

            {groups.status === 'succeeded' && groups.items.length === 0 && (
                <p className="text-sm text-stone-500 dark:text-stone-400">No groups in this category yet.</p>
            )}

            {groups.status === 'succeeded' && groups.items.length > 0 && (
                <div className="flex flex-wrap gap-5 sm:gap-6">
                    {groups.items.slice(0, DISPLAY_LIMIT).map((g) => (
                        <GroupTile
                            key={g.name}
                            name={g.name}
                            count={g.count}
                            sampleFileID={g.sampleFileID}
                            categoryName={categoryName}
                            isActive={selectedGroup === g.name}
                            onSelect={() => onSelect(g.name === selectedGroup ? null : g.name)}
                        />
                    ))}

                    {groups.items.length > DISPLAY_LIMIT && (
                        <Link
                            to={`/products/category/${encodeURIComponent(categoryName)}/groups`}
                            title="View all groups"
                            aria-label={`View all ${groups.items.length} groups in ${categoryName}`}
                            className="group flex flex-col items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-950"
                        >
                            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-stone-300 bg-stone-50 text-stone-500 transition-colors group-hover:border-brand-400 group-hover:bg-brand-50/50 group-hover:text-brand-600 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400 dark:group-hover:border-brand-500 dark:group-hover:bg-brand-500/5 dark:group-hover:text-brand-400 sm:h-20 sm:w-20">
                                <Plus size={22} strokeWidth={2.5} />
                            </div>
                            <span className="text-xs font-medium text-stone-500 dark:text-stone-400 sm:text-sm">
                                +{groups.items.length - DISPLAY_LIMIT} more
                            </span>
                        </Link>
                    )}
                </div>
            )}
        </section>
    );
}

export default GroupsSection;