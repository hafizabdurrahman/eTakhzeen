import React, { useMemo, useRef, useState } from 'react';
import { Search, X, Package, Tags, Layers } from 'lucide-react';

// Badge shown on each result row so a product, category, and group never
// look interchangeable in the dropdown — neutral badge pattern, theme §9.
function TypeBadge({ type }) {
    const config = {
        product: { label: 'Product', icon: Package },
        category: { label: 'Category', icon: Tags },
        group: { label: 'Group', icon: Layers },
    }[type];
    const Icon = config.icon;
    return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            <Icon size={11} />
            {config.label}
        </span>
    );
}

/**
 * A single search input that returns a mixed result list of products,
 * categories, and groups. Selecting a group is how the admin generates one
 * post for every product that shares that category+group pair — there is
 * no separate "bulk" control, it's just another kind of search result.
 *
 * Props:
 *  - products, categories (object map), groups (object map) — from useCatalogData
 *  - groupContentMap — from useGroupContentMap, used to show a product count per group
 *  - selected — array of { type, item } already chosen
 *  - onSelect(entry) — called with { type: 'product'|'category'|'group', item }
 *  - onRemove(entry) — called to remove a chip
 */
export function CatalogSearchBar({
    products = [],
    categories = {},
    groups = {},
    groupContentMap,
    selected = [],
    onSelect,
    onRemove,
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];

        const productMatches = products
            .filter(
                (p) =>
                    p.name?.toLowerCase().includes(q) ||
                    p.category?.toLowerCase().includes(q) ||
                    p.group?.toLowerCase().includes(q) ||
                    (p.keywords || []).some((k) => k.toLowerCase().includes(q))
            )
            .slice(0, 6)
            .map((p) => ({ type: 'product', key: `product:${p['$id']}`, item: p, label: p.name, sub: `${p.category} • ${p.group}` }));

        const categoryMatches = Object.keys(categories)
            .filter((name) => name.toLowerCase().includes(q))
            .slice(0, 4)
            .map((name) => ({
                type: 'category',
                key: `category:${name}`,
                item: { name },
                label: name,
                sub: 'All groups in this category',
            }));

        const groupMatches = Object.keys(groups)
            .filter((name) => name.toLowerCase().includes(q))
            .slice(0, 6)
            .map((name) => {
                // Groups are keyed by name only here; find which category(ies)
                // this group name belongs to via the products list so the
                // group-content lookup key can be built correctly.
                const matchingProduct = products.find((p) => p.group === name);
                const category = matchingProduct?.category || 'Uncategorized';
                const mapKey = `${category}::${name}`;
                const contentEntry = groupContentMap?.get(mapKey);
                return {
                    type: 'group',
                    key: `group:${category}:${name}`,
                    item: { name, category },
                    label: name,
                    sub: contentEntry
                        ? `${contentEntry.productCount} product${contentEntry.productCount === 1 ? '' : 's'} • ${category}`
                        : category,
                };
            });

        return [...productMatches, ...categoryMatches, ...groupMatches];
    }, [query, products, categories, groups, groupContentMap]);

    function handleSelect(result) {
        onSelect?.({ type: result.type, item: result.item });
        setQuery('');
        setOpen(false);
    }

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500"
                />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder="Search products, categories, or groups…"
                    className="w-full rounded-md border border-stone-200 bg-cream py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                />
            </div>

            {open && query.trim() && (
                <div className="absolute z-20 mt-1.5 max-h-72 w-full overflow-auto rounded-md border border-stone-200 bg-cream py-1 shadow-lg dark:border-stone-800 dark:bg-stone-900">
                    {results.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-stone-500 dark:text-stone-400">No matches.</p>
                    ) : (
                        results.map((r) => (
                            <button
                                key={r.key}
                                type="button"
                                onClick={() => handleSelect(r)}
                                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-cream-hover dark:hover:bg-stone-800"
                            >
                                <span className="min-w-0">
                                    <span className="block truncate font-medium text-stone-900 dark:text-stone-100">
                                        {r.label}
                                    </span>
                                    <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{r.sub}</span>
                                </span>
                                <TypeBadge type={r.type} />
                            </button>
                        ))
                    )}
                </div>
            )}

            {selected.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {selected.map((entry) => {
                        const label =
                            entry.type === 'product'
                                ? entry.item.name
                                : entry.type === 'group'
                                ? entry.item.name
                                : entry.item.name;
                        return (
                            <span
                                key={`${entry.type}:${entry.item.name || entry.item['$id']}`}
                                className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                            >
                                <TypeBadge type={entry.type} />
                                <span className="max-w-[10rem] truncate">{label}</span>
                                <button
                                    type="button"
                                    onClick={() => onRemove?.(entry)}
                                    title={`Remove ${label}`}
                                    aria-label={`Remove ${label}`}
                                    className="rounded-full p-0.5 text-brand-600 transition-colors hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-500/20"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default CatalogSearchBar;