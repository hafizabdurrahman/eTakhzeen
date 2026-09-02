import React from 'react';
import ProductFilters from './ProductFilters';

// Slide-in filter panel. `isOpen` drives a CSS transform transition (the
// panel stays mounted, just translated off-screen) so the animation plays
// both opening and closing — unmounting it would skip the close animation.
function FilterSidebar({ isOpen, onClose, onClear }) {
    return (
        <>
            <div
                onClick={onClose}
                aria-hidden="true"
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
            />
            <aside
                className={`fixed top-0 left-0 h-full w-72 bg-neutral-950 border-r border-neutral-800 z-50 p-4 overflow-y-auto transition-transform duration-300 ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium">Filters</h2>
                    <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200 text-sm">
                        Close
                    </button>
                </div>
                <ProductFilters onClear={onClear} />
            </aside>
        </>
    );
}

export default FilterSidebar;