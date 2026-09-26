import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, Search, X } from 'lucide-react';
import {
    fetchSocialMediaOverview,
    selectSocialMediaOverviewItems,
    selectSocialMediaOverviewStatus,
} from '../../store/slices/socialMediaSlice';
import { parsePostDataHtml, productThumbnail, hydrateProducts } from './PostGenerator';

function platformMetaFor(map, platform) {
    return map[platform] || { label: platform || 'unknown', icon: null, color: '#a8a29e' };
}

// Read-only overlapping-thumbnail stack for a saved post's products —
// same visual language as SelectedProductsStack in PostGenerator, just
// smaller and without the remove button (this list is for browsing/opening,
// not editing).
function ProductThumbStack({ products, max = 4 }) {
    if (products.length === 0) return null;
    const shown = products.slice(0, max);
    const extra = products.length - shown.length;
    return (
        <div className="flex -space-x-2">
            {shown.map((p, i) => (
                <img
                    key={p['$id'] || i}
                    src={productThumbnail(p)}
                    alt={p.name || ''}
                    title={p.name}
                    className="h-6 w-6 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-stone-800"
                />
            ))}
            {extra > 0 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-200 text-[9px] font-semibold text-stone-600 ring-2 ring-white dark:bg-stone-700 dark:text-stone-300 dark:ring-stone-800">
                    +{extra}
                </div>
            )}
        </div>
    );
}

// props:
//  - platformMeta: { [platformKey]: { label, icon, color } } — pass the same
//    PLATFORM_TABS map AdminSocialMedia already builds, so icons/colors stay
//    in one place.
//  - onOpenPost(post): called with the raw saved post row when clicked.
function SavedPostsTab({ platformMeta, onOpenPost }) {
    const dispatch = useDispatch();
    const items = useSelector(selectSocialMediaOverviewItems);
    const status = useSelector(selectSocialMediaOverviewStatus);

    const [search, setSearch] = useState('');
    const [platformFilter, setPlatformFilter] = useState('all');

    // id -> product row. Hydrated in bulk from every product ID referenced
    // by any saved post, and cached here so switching filters/search terms
    // never re-fetches — only genuinely new IDs (e.g. after a refetch of the
    // overview) trigger a request.
    const [productMap, setProductMap] = useState(new Map());
    const [hydrating, setHydrating] = useState(false);

    useEffect(() => {
        dispatch(fetchSocialMediaOverview());
    }, [dispatch]);

    // Parse each post's stored HTML once per items change, not on every
    // render or every filter/search keystroke.
    const parsedItems = useMemo(
        () =>
            items.map((post) => ({
                post,
                parsed: parsePostDataHtml(post.postData),
                productIds: Array.isArray(post.products) ? post.products : [],
            })),
        [items]
    );

    // Fetch whatever product rows aren't already cached.
    useEffect(() => {
        const allIds = new Set();
        parsedItems.forEach(({ productIds }) => productIds.forEach((id) => allIds.add(id)));
        const missing = Array.from(allIds).filter((id) => !productMap.has(id));
        if (missing.length === 0) return;

        setHydrating(true);
        hydrateProducts(missing)
            .then((rows) => {
                setProductMap((prev) => {
                    const next = new Map(prev);
                    rows.forEach((r) => next.set(r['$id'], r));
                    return next;
                });
            })
            .finally(() => setHydrating(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parsedItems]);

    // Distinct platforms actually present in the saved posts, with counts —
    // avoids showing an empty filter chip for a platform with zero posts.
    const platformOptions = useMemo(() => {
        const seen = new Set(items.map((p) => p.platform).filter(Boolean));
        return Array.from(seen).map((key) => ({
            key,
            count: items.filter((p) => p.platform === key).length,
            ...platformMetaFor(platformMeta, key),
        }));
    }, [items, platformMeta]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return parsedItems.filter(({ post, parsed }) => {
            if (platformFilter !== 'all' && post.platform !== platformFilter) return false;
            if (!term) return true;
            const haystack = `${parsed.title} ${parsed.description} ${parsed.tags.join(' ')} ${parsed.hashtags.join(' ')}`.toLowerCase();
            return haystack.includes(term);
        });
    }, [parsedItems, search, platformFilter]);

    if (status === 'loading' && items.length === 0) {
        return (
            <div className="flex items-center gap-2 p-10 text-sm text-stone-500 dark:text-stone-400">
                <Loader2 size={14} className="animate-spin" /> Loading saved posts…
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <p className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
                No posts saved yet — generate one from a platform tab.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {/* ---- Search ---- */}
            <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search saved posts by title, caption, hashtags, keywords…"
                    className="w-full rounded-lg border border-stone-200 bg-transparent py-2 pl-8 pr-8 text-sm outline-none focus:border-brand-500 dark:border-stone-700 dark:text-stone-200"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                    >
                        <X size={13} />
                    </button>
                )}
            </div>

            {/* ---- Platform filter chips ---- */}
            <div className="flex flex-wrap gap-1.5">
                <button
                    type="button"
                    onClick={() => setPlatformFilter('all')}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        platformFilter === 'all'
                            ? 'border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-400'
                            : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700 dark:border-stone-700 dark:text-stone-400'
                    }`}
                >
                    All ({items.length})
                </button>
                {platformOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = platformFilter === opt.key;
                    return (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => setPlatformFilter(isActive ? 'all' : opt.key)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                isActive ? 'border-transparent text-white' : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700 dark:border-stone-700 dark:text-stone-400'
                            }`}
                            style={isActive ? { backgroundColor: opt.color } : undefined}
                        >
                            {Icon && <Icon size={12} />}
                            {opt.label} ({opt.count})
                        </button>
                    );
                })}
            </div>

            {hydrating && (
                <p className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
                    <Loader2 size={12} className="animate-spin" /> Loading product previews…
                </p>
            )}

            {/* ---- Results ---- */}
            {filtered.length === 0 ? (
                <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
                    No saved posts match your search.
                </p>
            ) : (
                <div className="space-y-2">
                    {filtered.map(({ post, parsed, productIds }) => {
                        const meta = platformMetaFor(platformMeta, post.platform);
                        const Icon = meta.icon;
                        const productCount = productIds.length;
                        const products = productIds.map((id) => productMap.get(id)).filter(Boolean);

                        return (
                            <button
                                key={post['$id']}
                                type="button"
                                onClick={() => onOpenPost(post)}
                                className="flex w-full items-start gap-3 rounded-xl border border-stone-200 bg-white p-3 text-left transition-colors hover:border-brand-300 hover:shadow-sm dark:border-stone-700 dark:bg-stone-800"
                            >
                                <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                                    style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                                >
                                    {Icon ? <Icon size={16} /> : <span className="text-xs font-bold">{meta.label[0]}</span>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
                                            {parsed.title || 'Untitled post'}
                                        </p>
                                        <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">
                                            {post['$createdAt'] ? new Date(post['$createdAt']).toLocaleDateString() : ''}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 line-clamp-1 text-xs text-stone-500 dark:text-stone-400">
                                        {parsed.description || 'No description'}
                                    </p>
                                    <div className="mt-1.5 flex items-center gap-2">
                                        <ProductThumbStack products={products} />
                                        <p className="text-[11px] font-medium" style={{ color: meta.color }}>
                                            {meta.label} · {productCount} product{productCount === 1 ? '' : 's'}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default SavedPostsTab;