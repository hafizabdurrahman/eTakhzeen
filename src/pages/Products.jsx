import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchCatalogPage,
    fetchPriceBounds,
    fetchCatalogCategories,
    fetchCatalogGroups,
    setSearchTerm,
    setFilter,
    setPage,
    resetFilters,
} from '../store/slices/productSlice'; // ⚠️ adjust path
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { ProductCard, Pagination, FilterSidebar, CategoryPreview, GroupPreview } from '../components';
import { Featured, Popular } from '../admin/components/layout';
import { Select } from '../ui'; // requires `export { default as Select } from './Select';` in src/ui/index.js

function Products() {
    const dispatch = useDispatch();
    const filters = useSelector((s) => s.products.filters);
    const catalog = useSelector((s) => s.products.catalog);
    const catalogCategories = useSelector((s) => s.products.catalogCategories);
    const catalogGroups = useSelector((s) => s.products.catalogGroups);

    const [searchInput, setSearchInput] = useState(filters.searchTerm || '');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const productsSectionRef = useRef(null);
    const isFirstRender = useRef(true);
    const prevFiltersRef = useRef(filters);

    // Categories come from the slice's own thunk (service.listCategoriesWithSample()),
    // not a local fetch — this is the piece that was previously missing, which is why
    // the dropdowns stayed empty.
    useEffect(() => {
        dispatch(fetchCatalogCategories());
    }, [dispatch]);

    // Groups are scoped to the selected category (fetchCatalogGroups accepts
    // { category }), so re-fetch whenever the category filter changes —
    // including back to "All categories" (category = null/'' -> all groups).
    useEffect(() => {
        dispatch(fetchCatalogGroups({ category: filters.category || undefined }));
    }, [dispatch, filters.category]);

    useEffect(() => {
        const handle = setTimeout(() => {
            const trimmed = searchInput.trim();
            // Only dispatch on real change — see original fix note: an
            // unconditional dispatch here produces a new `filters`
            // reference every 400ms via Immer and double-fetches.
            if (trimmed !== filters.searchTerm) {
                dispatch(setSearchTerm(trimmed));
            }
        }, 400);
        return () => clearTimeout(handle);
    }, [searchInput, dispatch, filters.searchTerm]);

    useEffect(() => {
        dispatch(fetchPriceBounds({}));
    }, [dispatch]);

    useEffect(() => {
        dispatch(fetchCatalogPage({ page: catalog.page, pageSize: catalog.pageSize, filters }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, catalog.page, dispatch]);

    // Any filter change (search, category, group, price, sidebar clear)
    // produces a new `filters` reference. Scroll the results section into
    // view when that happens — but not on first mount, and not on plain
    // pagination (that's handled separately in handlePageChange).
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            prevFiltersRef.current = filters;
            return;
        }
        if (filters !== prevFiltersRef.current) {
            prevFiltersRef.current = filters;
            productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [filters]);

    const handlePageChange = useCallback(
        (page) => {
            dispatch(setPage(page));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        [dispatch]
    );

    const handleClearFilters = () => {
        setSearchInput('');
        dispatch(resetFilters());
    };

    // catalogCategories.items / catalogGroups.items are [{ name, count, sampleFileID }]
    // — map to { value, label } so counts show in the dropdown.
    const categoryOptions = catalogCategories.items.map((c) => ({
        value: c.name,
        label: c.count != null ? `${c.name} (${c.count})` : c.name,
    }));
    const groupOptions = catalogGroups.items.map((g) => ({
        value: g.name,
        label: g.count != null ? `${g.name} (${g.count})` : g.name,
    }));

    const hasActiveFilters = Boolean(
        filters.searchTerm || filters.category || filters.group || filters.minPrice != null || filters.maxPrice != null
    );

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-5 flex items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Products</h1>
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 transition-colors hover:border-brand-600 dark:border-gray-800 dark:text-gray-100 dark:hover:border-brand-500"
                >
                    <SlidersHorizontal size={14} />
                    Filters
                </button>
            </div>

            {/* Compact search + quick category/group filters, all in one
                row on larger screens. Search shrinks to make room instead
                of spanning full width like before. */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-[200px] flex-1 sm:max-w-xs">
                    <label className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">
                        Search
                    </label>
                    <div className="relative">
                        <Search
                            size={16}
                            strokeWidth={2}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500"
                        />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search products..."
                            className="w-full rounded-lg border border-stone-200 bg-cream py-2 pl-9 pr-9 text-sm text-stone-900 shadow-sm transition-colors placeholder:text-stone-400 hover:border-stone-300 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100/70 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:hover:border-stone-700 dark:focus:border-brand-500 dark:focus:ring-brand-500/15"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                onClick={() => setSearchInput('')}
                                aria-label="Clear search"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
                    <div className="sm:w-44">
                        <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
                            Category
                        </label>
                        <Select
                            value={filters.category || ''}
                            onChange={(value) => dispatch(setFilter({ category: value || null }))}
                            options={categoryOptions}
                            placeholder="All categories"
                            disabled={catalogCategories.status === 'loading'}
                        />
                    </div>

                    <div className="sm:w-44">
                        <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
                            Group
                        </label>
                        <Select
                            value={filters.group || ''}
                            onChange={(value) => dispatch(setFilter({ group: value || null }))}
                            options={groupOptions}
                            placeholder="All groups"
                            disabled={catalogGroups.status === 'loading'}
                        />
                    </div>
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={handleClearFilters}
                        className="flex items-center gap-1 self-start rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 sm:self-end"
                    >
                        <X size={12} />
                        Clear
                    </button>
                )}
            </div>

            <FilterSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onClear={handleClearFilters}
            />

            <div className="space-y-10">
                <CategoryPreview />
                <Featured />
                <section ref={productsSectionRef}>
                    <div className="mb-4 flex items-center justify-between gap-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {hasActiveFilters ? 'Filtered products' : 'All products'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {catalog.status === 'loading'
                                ? 'Loading...'
                                : `${catalog.total} product${catalog.total === 1 ? '' : 's'}`}
                        </p>
                    </div>

                    {catalog.status === 'failed' && (
                        <p className="text-sm text-red-600 dark:text-red-400">Something went wrong loading products.</p>
                    )}
                    {catalog.status === 'succeeded' && catalog.items.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            No products match{filters.searchTerm ? ` "${filters.searchTerm}"` : ' your current filters'}.
                        </p>
                    )}
                    {catalog.items.length > 0 && (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {catalog.items.map((p) => (
                                    <ProductCard key={p['$id']} product={p} />
                                ))}
                            </div>
                            <Pagination
                                page={catalog.page}
                                pageSize={catalog.pageSize}
                                total={catalog.total}
                                onPageChange={handlePageChange}
                            />
                        </>
                    )}
                </section>
                <Popular />
                <GroupPreview />
            </div>
        </div>
    );
}

export default Products;