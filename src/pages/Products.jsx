import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchCatalogPage,
    fetchPriceBounds,
    setSearchTerm,
    setPage,
    resetFilters,
} from '../store/slices/productSlice'; // ⚠️ adjust path

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
        <div>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold">Products</h1>
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="text-sm border border-neutral-800 rounded-md px-3 py-1.5 hover:border-neutral-600"
                >
                    Filters
                </button>
            </div>

            <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or description..."
                className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm mb-6"
            />

            <FilterSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onClear={handleClearFilters}
            />

            <div className="space-y-10">
                <CategoryPreview />

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-medium">
                            {hasActiveFilters ? 'Filtered products' : 'All products'}
                        </h2>
                        <p className="text-neutral-400 text-sm">
                            {catalog.status === 'loading'
                                ? 'Loading...'
                                : `${catalog.total} product${catalog.total === 1 ? '' : 's'}`}
                        </p>
                    </div>

                    {catalog.status === 'failed' && (
                        <p className="text-red-400">Something went wrong loading products.</p>
                    )}
                    {catalog.status === 'succeeded' && catalog.items.length === 0 && (
                        <p className="text-neutral-400">
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