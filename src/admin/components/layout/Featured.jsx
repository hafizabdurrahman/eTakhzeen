import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import service from '../../../backend/service'; // ⚠️ adjust depth to match your tree
import FeaturedCard from './FeaturedCard';

// Renders nothing at all when there are no featured products — no heading,
// no empty state, no leftover vertical space. Pass `products` in if the
// parent already has the list; otherwise this fetches on its own.
// FeaturedCard now navigates via its own <Link>, so there's no click
// handler to forward here anymore.
function Featured({ products: productsProp, title = 'Featured', subtitle, limit }) {
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
                console.error('Failed to load featured products', err);
                if (!cancelled) setProducts([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [productsProp]);

    const featured = (products || []).filter((p) => Boolean(p?.featured));
    const visible = limit ? featured.slice(0, limit) : featured;

    // Quiet loader — still takes no space once resolved to empty.
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
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                            <Sparkles size={15} />
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((product) => (
                    <FeaturedCard key={product['$id']} product={product} />
                ))}
            </div>
        </section>
    );
}

export default Featured;