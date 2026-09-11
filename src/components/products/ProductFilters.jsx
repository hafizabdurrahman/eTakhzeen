import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setFilter } from '../../store/slices/productSlice'; // ⚠️ adjust path
import { SlidersHorizontal, Tag } from 'lucide-react';
import { Select, Toggle } from '../../ui';

const SORT_OPTIONS = [
    { value: 'name-asc', label: 'Name (A–Z)' },
    { value: 'name-desc', label: 'Name (Z–A)' },
    { value: 'price-asc', label: 'Price: low to high' },
    { value: 'price-desc', label: 'Price: high to low' },
    { value: 'newest', label: 'Newest arrivals' },
];

function ProductFilters({ onClear }) {
    const dispatch = useDispatch();
    const filters = useSelector((s) => s.products.filters);
    const priceBounds = useSelector((s) => s.products.priceBounds);

    const [minInput, setMinInput] = useState(filters.minPrice ?? '');
    const [maxInput, setMaxInput] = useState(filters.maxPrice ?? '');

    useEffect(() => {
        setMinInput(filters.minPrice ?? '');
        setMaxInput(filters.maxPrice ?? '');
    }, [filters.minPrice, filters.maxPrice]);

    useEffect(() => {
        const handle = setTimeout(() => {
            const min = minInput === '' ? null : Number(minInput);
            const max = maxInput === '' ? null : Number(maxInput);
            if (min !== filters.minPrice || max !== filters.maxPrice) {
                dispatch(setFilter({ minPrice: min, maxPrice: max }));
            }
        }, 500);
        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [minInput, maxInput, dispatch]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
                <SlidersHorizontal size={16} />
                <h3 className="text-sm font-semibold">Refine results</h3>
            </div>

            <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-stone-900 dark:text-stone-100">
                    <Tag size={13} className="text-stone-400 dark:text-stone-500" />
                    Price range
                    {priceBounds.max > 0 && (
                        <span className="font-normal text-stone-500 dark:text-stone-400">
                            ({priceBounds.min} – {priceBounds.max})
                        </span>
                    )}
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="0"
                        value={minInput}
                        onChange={(e) => setMinInput(e.target.value)}
                        placeholder="Min"
                        className="w-1/2 rounded-md border border-stone-200 bg-cream px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                    />
                    <span className="text-stone-400 dark:text-stone-500">–</span>
                    <input
                        type="number"
                        min="0"
                        value={maxInput}
                        onChange={(e) => setMaxInput(e.target.value)}
                        placeholder="Max"
                        className="w-1/2 rounded-md border border-stone-200 bg-cream px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                    />
                </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-stone-200 p-3 dark:border-stone-800">
                <div>
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">In stock only</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Hide sold-out products</p>
                </div>
                <Toggle
                    checked={filters.stockFilter === 'in'}
                    onChange={(checked) => dispatch(setFilter({ stockFilter: checked ? 'in' : 'all' }))}
                    label="In stock only"
                />
            </div>

            <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-900 dark:text-stone-100">Sort by</label>
                <Select
                    value={filters.sortBy}
                    onChange={(value) => dispatch(setFilter({ sortBy: value }))}
                    options={SORT_OPTIONS}
                    placeholder="Default"
                />
            </div>

            <button
                onClick={onClear}
                className="w-full rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
            >
                Clear all filters
            </button>
        </div>
    );
}

export default ProductFilters;