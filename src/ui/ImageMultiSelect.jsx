import React from 'react';
import { Check, ImageOff } from 'lucide-react';

// ⚠️ CONFIRM BEFORE USE: this tries a few common field-name/shape
// conventions for a product's images. Confirm the real Appwrite field name
// and shape on your `products` collection, then trim this down to the one
// real case — don't ship all four guesses to production.
function extractImages(product) {
    const raw = product?.images ?? product?.image ?? product?.photos ?? product?.thumbnail;
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map((entry, i) => {
            if (typeof entry === 'string') return { id: `${product['$id']}-${i}`, url: entry };
            return { id: entry.id || entry['$id'] || `${product['$id']}-${i}`, url: entry.url || entry.href || entry.src };
        });
    }
    if (typeof raw === 'string') return [{ id: `${product['$id']}-0`, url: raw }];
    return [];
}

/**
 * Checkbox-overlaid thumbnail grid for one product's images.
 *
 * Props:
 *  - product — the product whose images are shown
 *  - selectedIds — array of currently-selected image ids for this product
 *  - onChange(nextSelectedIds) — called with the updated id list
 */
export function ImageMultiSelect({ product, selectedIds = [], onChange }) {
    const images = extractImages(product);

    function toggle(id) {
        const next = selectedIds.includes(id)
            ? selectedIds.filter((x) => x !== id)
            : [...selectedIds, id];
        onChange?.(next);
    }

    if (images.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center dark:border-stone-700 dark:bg-stone-900">
                <ImageOff size={20} className="text-stone-400 dark:text-stone-500" />
                <p className="text-sm text-stone-500 dark:text-stone-400">No images on this product yet.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((img) => {
                const checked = selectedIds.includes(img.id);
                return (
                    <button
                        key={img.id}
                        type="button"
                        onClick={() => toggle(img.id)}
                        aria-pressed={checked}
                        className="group relative aspect-square overflow-hidden rounded-md border border-stone-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-stone-800 dark:focus-visible:ring-offset-stone-950"
                    >
                        <img src={img.url} alt="" className="h-full w-full object-cover" />
                        <span
                            className={`absolute inset-0 transition-colors ${
                                checked ? 'bg-brand-600/25' : 'bg-transparent group-hover:bg-stone-900/10'
                            }`}
                        />
                        <span
                            role="checkbox"
                            aria-checked={checked}
                            className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md border-2 ${
                                checked
                                    ? 'border-brand-600 bg-brand-600 dark:border-brand-500 dark:bg-brand-500'
                                    : 'border-white bg-white/70 dark:border-stone-300 dark:bg-stone-900/70'
                            }`}
                        >
                            {checked && <Check size={13} strokeWidth={3} className="text-white" />}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

export default ImageMultiSelect;