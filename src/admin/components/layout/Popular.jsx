import React, { useEffect, useState } from 'react';
import { Flame, Loader2 } from 'lucide-react';
import service from '../../../backend/service'; // ⚠️ adjust depth to match your tree
import PopularCard from './PopularCard';

// Same contract as Featured: renders nothing when there's nothing to show.
// Ranks by `soldNum` (highest first) and takes the top N — 4 by default,
// per the storefront spec. Only products with soldNum > 0 count as
// "popular"; a store with no sales yet gets an empty section, not four
// arbitrary zero-sale products.
function Popular({ products: productsProp, title = 'Popular Right Now', subtitle, limit = 4 }) {
    const [products, setProducts] = useState(productsProp || null);
    const [loading, setLoading] = useState(!productsProp);

    useEffect(() => {
        if (productsProp) {
            setProducts(productsProp);
            setLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await service.getProducts();
                const rows = res?.rows || res?.documents || res || [];
                if (!cancelled) setProducts(rows);
            } catch (err) {
                console.error('Failed to load popular products', err);
                if (!cancelled) setProducts([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [productsProp]);

    const ranked = (products || [])
        .filter((p) => Number(p?.soldNum) > 0)
        .sort((a, b) => Number(b.soldNum) - Number(a.soldNum));
    const visible = ranked.slice(0, limit);

    if (loading) {
        return (
            <section className="flex justify-center py-10">
                <Loader2 size={18} className="animate-spin text-stone-300 dark:text-stone-700" />
            </section>
        );
    }

    if (visible.length === 0) return null;

    return (
        <section className="py-8">
            <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                    <h2 className="flex items-center gap-2 text-xl font-semibold text-stone-900 dark:text-stone-100">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                            <Flame size={15} />
                        </span>
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>
                    )}
                </div>
                <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">
                    {visible.length} {visible.length === 1 ? 'item' : 'items'}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {visible.map((product) => (
                    <PopularCard key={product['$id']} product={product} />
                ))}
            </div>
        </section>
    );
}

export default Popular;