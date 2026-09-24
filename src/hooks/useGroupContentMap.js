import { useMemo } from 'react';
import { dedupeKeywords } from '../../../utils/socialMedia/parseKeywords';

// Products that share the same `category` + `group` are treated as one
// "line" for social content purposes — this hook builds a lookup keyed by
// `${category}::${group}` so the composer can generate ONE post that
// represents every product in that group, instead of one post per product.
export default function useGroupContentMap(products) {
    return useMemo(() => {
        const map = new Map();

        products.forEach((p) => {
            const category = p.category || 'Uncategorized';
            const group = p.group || 'Ungrouped';
            const key = `${category}::${group}`;

            if (!map.has(key)) {
                map.set(key, {
                    category,
                    group,
                    productCount: 0,
                    sampleName: p.name,
                    sampleDescription: p.description || '',
                    mergedKeywords: [],
                    priceRange: { min: p.price ?? 0, max: p.price ?? 0 },
                    products: [],
                });
            }

            const entry = map.get(key);
            entry.productCount += 1;
            entry.products.push(p);
            entry.mergedKeywords = dedupeKeywords([...entry.mergedKeywords, ...(p.keywords || [])]);
            if (typeof p.price === 'number') {
                entry.priceRange.min = Math.min(entry.priceRange.min, p.price);
                entry.priceRange.max = Math.max(entry.priceRange.max, p.price);
            }
        });

        return map;
    }, [products]);
}

// Small helper for components that just need the key format, so it's
// never hand-built inconsistently in two places.
export function groupKeyFor(product) {
    return `${product?.category || 'Uncategorized'}::${product?.group || 'Ungrouped'}`;
}