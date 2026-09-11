import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchCatalogPage,
    fetchPriceBounds,
    setSearchTerm,
    setPage,
    resetFilters,
} from '../store/slices/productSlice'; // ⚠️ adjust path
import { Search } from "lucide-react"
import { ProductCard, Pagination, FilterSidebar, CategoryPreview, GroupPreview } from "../components"

function Products() {
    const dispatch = useDispatch();
    const filters = useSelector((s) => s.products.filters);
    const catalog = useSelector((s) => s.products.catalog);

    const [searchInput, setSearchInput] = useState(filters.searchTerm || '');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const handle = setTimeout(() => {
            const trimmed = searchInput.trim();
            // FIX: only dispatch if the value actually changed. Previously
            // this fired setSearchTerm(searchInput.trim()) unconditionally
            // every 400ms after typing (or even on mount with an unchanged
            // empty string), which produced a *new* filters object each
            // time via Immer — triggering a second, redundant
            // fetchCatalogPage call right after the first one, purely
            // because `filters` changed reference with no real change in
            // value.
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

    const handlePageChange = useCallback((page) => {
        dispatch(setPage(page));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [dispatch]);

    const handleClearFilters = () => {
        setSearchInput('');
        dispatch(resetFilters());
    };

    const hasActiveFilters = Boolean(
        filters.searchTerm || filters.minPrice != null || filters.maxPrice != null
    );

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-5 flex items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Products</h1>
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 transition-colors hover:border-brand-600 dark:border-gray-800 dark:text-gray-100 dark:hover:border-brand-500"
                >
                    Filters
                </button>
            </div>

            <div className="relative mb-6">
                <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500"
                />
                <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by name or description..."
                    className="w-full rounded-md border border-stone-200 bg-cream py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                />
            </div>

            <FilterSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onClear={handleClearFilters}
            />

            <div className="space-y-10">
                <CategoryPreview />

                <section>
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

                <GroupPreview />
            </div>
        </div>
    );
}

export default Products;