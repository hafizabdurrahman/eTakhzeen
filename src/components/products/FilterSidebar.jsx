import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import ProductFilters from './ProductFilters';

// Slide-in filter panel. Stays mounted and just translates off-screen so
// both the open and close transitions play (unmounting would skip the
// close animation).
function FilterSidebar({ isOpen, onClose, onClear }) {
    return (
        <>
            <div
                onClick={onClose}
                aria-hidden="true"
                className={`fixed inset-0 z-40 bg-stone-900/50 transition-opacity duration-300 ${
                    isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                }`}
            />
            <aside
                className={`fixed left-0 top-0 z-50 h-full w-full max-w-xs overflow-y-auto border-r border-stone-200 bg-stone-400 shadow-2xl transition-transform duration-300 dark:border-stone-800 dark:bg-stone-900 z-200 ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between border-b border-stone-100 p-5 dark:border-stone-800">
                    <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
                        <SlidersHorizontal size={17} />
                        <h2 className="text-lg font-semibold">Filters</h2>
                    </div>
                    <button
                        onClick={onClose}
                        title="Close filters"
                        aria-label="Close filters"
                        className="rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="p-5">
                    <ProductFilters onClear={onClear} />
                </div>
            </aside>
        </>
    );
}

export default FilterSidebar;