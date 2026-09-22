import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCatalogCategories, fetchCatalogGroups } from '../../store/slices/productSlice'; // ⚠️ adjust path
import { CategoryTile, GroupTile, ViewAllTile } from '../.';

const PREVIEW_LIMIT = 4;

// Fisher–Yates on a copy, so the store's own ordering is never mutated.
function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// One scoped stylesheet: the woven-thread divider (the only decorative
// element on the page), the one-time tile reveal, and the display face.
// The weave uses a mid-stone tone with alpha so it reads on light and dark.
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap');

.ap-display {
    font-family: 'Fraunces', Georgia, 'Times New Roman', serif;
    font-optical-sizing: auto;
    letter-spacing: -0.015em;
}
.ap-weave {
    height: 6px;
    background-image:
        repeating-linear-gradient(45deg, rgba(120,113,108,0.45) 0 1px, transparent 1px 5px),
        repeating-linear-gradient(-45deg, rgba(120,113,108,0.28) 0 1px, transparent 1px 5px);
    -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 55%, transparent 100%);
            mask-image: linear-gradient(90deg, #000 0%, #000 55%, transparent 100%);
}
@keyframes ap-reveal {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: none; }
}
.ap-reveal { animation: ap-reveal 480ms cubic-bezier(.2,.7,.2,1) both; }
@media (prefers-reduced-motion: reduce) {
    .ap-reveal { animation: none; }
}
`;

// Section chrome shared by both rows: heading, live count, weave divider,
// and the loading / error / empty states. Defined at module level so it is
// not re-created (and remounted) on every render of AllProducts.
function Section({
    id,
    title,
    hint,
    noun,
    status,
    total,
    shown,
    onRetry,
    gridClass,
    skeletonClass,
    children,
}) {
    const isLoading = status === 'loading' || status === 'idle' || status === undefined;
    const isFailed = status === 'failed';
    const isReady = status === 'succeeded';

    return (
        <section aria-labelledby={id} aria-busy={isLoading}>
            <header className="mb-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <h2 id={id} className="ap-display text-2xl font-medium text-stone-900 sm:text-3xl dark:text-white">
                        {title}
                    </h2>
                    {isReady && total > 0 && (
                        <p className="text-sm tabular-nums text-stone-500 dark:text-stone-400">
                            Showing {shown} of {total}
                        </p>
                    )}
                </div>
                <p className="mt-1 max-w-prose text-sm text-stone-600 dark:text-stone-400">{hint}</p>
                <div className="ap-weave mt-4" aria-hidden="true" />
            </header>

            {isLoading && (
                <div className={gridClass} role="status" aria-label={`Loading ${noun}`}>
                    {Array.from({ length: PREVIEW_LIMIT }).map((_, i) => (
                        <div
                            key={i}
                            className={`${skeletonClass} animate-pulse rounded-xl bg-stone-200/70 motion-reduce:animate-none dark:bg-white/[0.06]`}
                        />
                    ))}
                </div>
            )}

            {isFailed && (
                <div
                    role="alert"
                    className="flex flex-col items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                    <p className="text-sm text-red-700 dark:text-red-300">
                        We couldn&apos;t load the {noun}. Check your connection and try again.
                    </p>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="rounded-md border border-red-500/40 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 dark:border-red-300/40 dark:text-red-200 dark:hover:bg-red-300/10"
                    >
                        Try again
                    </button>
                </div>
            )}

            {isReady && total === 0 && (
                <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center dark:border-white/15">
                    <p className="text-sm text-stone-700 dark:text-stone-300">No {noun} yet.</p>
                    <p className="mt-1 text-sm text-stone-500">New arrivals will appear here once they are added.</p>
                </div>
            )}

            {isReady && total > 0 && <div className={gridClass}>{children}</div>}
        </section>
    );
}

// Landing view on /products: both categories and groups shown together,
// each capped at 4 with its own "view all" tile. Which 4 are shown is
// randomized on every visit. This component only fetches and displays —
// every tile click is real navigation (see CategoryTile / GroupTile), so
// nothing here needs local selection state.
function AllProducts() {
    const dispatch = useDispatch();
    const categories = useSelector((s) => s.products.catalogCategories);
    const groups = useSelector((s) => s.products.catalogGroups);

    const loadCategories = useCallback(() => dispatch(fetchCatalogCategories()), [dispatch]);
    const loadGroups = useCallback(() => dispatch(fetchCatalogGroups({})), [dispatch]); // no category = groups across the whole catalog

    useEffect(() => {
        loadCategories();
        loadGroups();
    }, [loadCategories, loadGroups]);

    // Shuffled once per fetched list (and once per mount), never on unrelated
    // re-renders, so tiles don't jump around while the person is browsing.
    const randomCategories = useMemo(() => shuffle(categories.items || []), [categories.items]);
    const randomGroups = useMemo(() => shuffle(groups.items || []), [groups.items]);

    const categoryTotal = randomCategories.length;
    const groupTotal = randomGroups.length;

    return (
        <div className="space-y-14 sm:space-y-16">
            <style>{STYLES}</style>

            <div className="max-w-2xl">
                <h1 className="ap-display text-4xl font-medium leading-[1.05] text-stone-900 sm:text-5xl dark:text-white">
                    Explore the store
                </h1>
                <p className="mt-3 text-base text-stone-600 dark:text-stone-400">
                    A fresh mix every visit. Open a category or a group to see everything inside it.
                </p>
            </div>

            <Section
                id="ap-categories"
                title="Shop by category"
                hint="Start with the label or line you already know."
                noun="categories"
                status={categories.status}
                total={categoryTotal}
                shown={Math.min(PREVIEW_LIMIT, categoryTotal)}
                onRetry={loadCategories}
                gridClass="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
                skeletonClass="aspect-square"
            >
                {randomCategories.slice(0, PREVIEW_LIMIT).map((c, i) => (
                    <div key={c.name} className="ap-reveal min-w-0" style={{ animationDelay: `${i * 70}ms` }}>
                        <CategoryTile name={c.name} sampleFileID={c.sampleFileID} />
                    </div>
                ))}
                {categoryTotal > PREVIEW_LIMIT && (
                    <div className="ap-reveal min-w-0" style={{ animationDelay: `${PREVIEW_LIMIT * 70}ms` }}>
                        <ViewAllTile to="/products/categories" label="View all categories" />
                    </div>
                )}
            </Section>

            <Section
                id="ap-groups"
                title="Shop by group"
                hint="Browse by fabric or collection across every category."
                noun="groups"
                status={groups.status}
                total={groupTotal}
                shown={Math.min(PREVIEW_LIMIT, groupTotal)}
                onRetry={loadGroups}
                gridClass="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                skeletonClass="aspect-[4/3]"
            >
                {randomGroups.slice(0, PREVIEW_LIMIT).map((g, i) => (
                    <div key={g.name} className="ap-reveal min-w-0" style={{ animationDelay: `${i * 70}ms` }}>
                        <GroupTile
                            name={g.name}
                            count={g.count}
                            sampleFileID={g.sampleFileID}
                            categoryName={g.sampleCategory}
                        />
                    </div>
                ))}
                {groupTotal > PREVIEW_LIMIT && (
                    <div className="ap-reveal min-w-0" style={{ animationDelay: `${PREVIEW_LIMIT * 70}ms` }}>
                        <ViewAllTile to="/products/groups" label="View all groups" />
                    </div>
                )}
            </Section>
        </div>
    );
}

export default AllProducts;