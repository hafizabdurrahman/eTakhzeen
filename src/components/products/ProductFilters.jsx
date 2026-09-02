import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setFilter } from '../../store/slices/productSlice'; // ⚠️ adjust path

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
            dispatch(setFilter({ minPrice: min, maxPrice: max }));
        }, 500);
        return () => clearTimeout(handle);
    }, [minInput, maxInput, dispatch]);

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-xs text-neutral-500 mb-1">
                    Price {priceBounds.max > 0 && `(${priceBounds.min} – ${priceBounds.max})`}
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="0"
                        value={minInput}
                        onChange={(e) => setMinInput(e.target.value)}
                        placeholder="Min"
                        className="w-1/2 rounded-md bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-sm"
                    />
                    <span className="text-neutral-600">–</span>
                    <input
                        type="number"
                        min="0"
                        value={maxInput}
                        onChange={(e) => setMaxInput(e.target.value)}
                        placeholder="Max"
                        className="w-1/2 rounded-md bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-sm"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs text-neutral-500 mb-1">Availability</label>
                <select
                    value={filters.stockFilter}
                    onChange={(e) => dispatch(setFilter({ stockFilter: e.target.value }))}
                    className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-sm"
                >
                    <option value="all">All</option>
                    <option value="in">In stock</option>
                    <option value="out">Out of stock</option>
                </select>
            </div>

            <div>
                <label className="block text-xs text-neutral-500 mb-1">Sort by</label>
                <select
                    value={filters.sortBy}
                    onChange={(e) => dispatch(setFilter({ sortBy: e.target.value }))}
                    className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-sm"
                >
                    <option value="name-asc">Name (A–Z)</option>
                    <option value="name-desc">Name (Z–A)</option>
                    <option value="price-asc">Price (low to high)</option>
                    <option value="price-desc">Price (high to low)</option>
                    <option value="newest">Newest</option>
                </select>
            </div>

            <button
                onClick={onClear}
                className="w-full text-sm text-neutral-400 hover:underline text-center"
            >
                Clear all filters
            </button>
        </div>
    );
}

export default ProductFilters;