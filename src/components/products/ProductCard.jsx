import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useDispatch } from 'react-redux';
import { ShoppingCart, Star } from 'lucide-react';
import service from '../../backend/service'; // ⚠️ adjust path
import reviewService from '../../backend/reviews'; // ⚠️ adjust path — same service reviewSlice's thunks call
import { formatPKR } from '../../utils/formatPrice'; // ⚠️ adjust path
import { addToCart } from '../../store/slices/cartSlice'; // ⚠️ adjust path + action name

function ProductCard({ product }) {
    const dispatch = useDispatch();

    // Local, per-card rating — deliberately NOT read from reviewSlice.
    // reviewSlice's `stats` is a single flat object meant for one product
    // detail page open at a time; if every card in a grid dispatched into
    // it, they'd all stomp on each other's numbers. Each card fetches and
    // holds its own aggregate via the same reviewService the slice's
    // thunks already call, without touching Redux.
    const [rating, setRating] = useState({ average: 0, count: 0, loading: true });
    const [justAdded, setJustAdded] = useState(false);

    useEffect(() => {
        const productId = product?.['$id'];
        if (!productId) return;
        let cancelled = false;

        (async () => {
            try {
                const stats = await reviewService.getReviewStats({ productId });
                if (!cancelled) {
                    setRating({ average: stats?.average || 0, count: stats?.count || 0, loading: false });
                }
            } catch (err) {
                console.error('Failed to load rating for product', productId, err);
                if (!cancelled) setRating((r) => ({ ...r, loading: false }));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [product?.['$id']]);

    if (!product) return null;

    const inStock = product.status === true;
    const productUrl = `/products/${product.category}/${product.group}/${product.slug}`;
    const hasReviews = !rating.loading && rating.count > 0;

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!inStock) return;
        dispatch(addToCart({ productId: product['$id'], quantity: 1 })); // ⚠️ adjust payload shape
        setJustAdded(true);
        window.setTimeout(() => setJustAdded(false), 900);
    };

    return (
        <Link
            to={productUrl}
            className="group relative flex h-[260px] w-full flex-col overflow-hidden rounded-xs border border-stone-200 bg-stone-100 shadow-sm transition-shadow duration-300 hover:shadow-lg dark:border-stone-800 dark:bg-stone-900 sm:h-[300px] md:h-[340px] lg:h-[400px]"
        >
            {/* Image — full bleed, always fully visible. A slow, subtle
                zoom on hover (desktop only) is the only thing that moves
                here; everything else happens in the panel below. */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-gradient-to-br from-brand-50 to-stone-100 dark:from-brand-500/10 dark:to-stone-900">
                {product.fileId ? (
                    <img
                        src={service.getImagePreview({ fileId: product.fileId })}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] lg:group-hover:scale-[1.06]"
                    />
                ) : (
                    <div className="h-full w-full bg-stone-100 dark:bg-stone-800" />
                )}
            </div>

            {/* Top labels — stock as a status dot rather than a flat red
                block (so "in stock" doesn't read as a warning), price as
                the one saturated accent on the card. */}
            <div className="relative z-20 flex items-start justify-between p-2.5 sm:p-3">
                <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 text-[clamp(0.55rem,1.6vw,0.7rem)] font-medium text-stone-700 shadow-sm backdrop-blur-sm dark:bg-stone-900/80 dark:text-stone-200">
                    <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {inStock ? 'In stock' : 'Out of stock'}
                </span>

                <span className="rounded-full bg-brand-600 px-2.5 py-1 text-[clamp(0.6rem,1.7vw,0.75rem)] font-semibold text-white shadow-sm dark:bg-brand-500">
                    {formatPKR(product.price)}
                </span>
            </div>

            {/* Bottom panel — the moving colored surface.
                Mobile: no hover to rely on, so it sits docked at the
                bottom permanently, name and cart button both visible.
                lg+: collapses to a small floating cart button. On hover
                it climbs up first, widens a beat later, and the name/
                rating fade in last — three separate transition-delays
                so the motion reads as one sequence, not one snap. */}
            <div
                className="absolute inset-x-0 bottom-0 z-10 flex justify-center
                    lg:bottom-[-38%] lg:pb-3
                    lg:transition-[bottom] lg:duration-300 lg:ease-[cubic-bezier(0.32,0.72,0,1)]
                    lg:group-hover:bottom-0"
            >
                <div
                    className="flex w-full items-center gap-2.5 rounded-t-xl bg-stone-900/85 px-3 py-2.5 text-cream backdrop-blur-md
                        lg:w-11 lg:justify-center lg:rounded-full lg:bg-brand-600 lg:px-0 lg:py-0
                        lg:transition-[width,border-radius,background-color,padding] lg:duration-300 lg:delay-100 lg:ease-[cubic-bezier(0.32,0.72,0,1)]
                        lg:group-hover:w-[90%] lg:group-hover:justify-between lg:group-hover:rounded-xl lg:group-hover:bg-stone-900/85 lg:group-hover:px-3 lg:group-hover:py-2.5"
                >
                    <div
                        className="min-w-0 flex-1
                            lg:opacity-0
                            lg:transition-opacity lg:duration-200 lg:delay-[350ms]
                            lg:group-hover:opacity-100"
                    >
                        <p className="truncate text-[clamp(0.72rem,2.2vw,0.85rem)] font-semibold leading-tight">
                            {product.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1">
                            {hasReviews ? (
                                <>
                                    <div className="flex items-center">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star
                                                key={i}
                                                size={10}
                                                strokeWidth={2}
                                                className={
                                                    i < Math.round(rating.average)
                                                        ? 'fill-brand-400 text-brand-400'
                                                        : 'fill-transparent text-stone-500'
                                                }
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[clamp(0.55rem,1.8vw,0.68rem)] text-stone-300">
                                        {rating.average.toFixed(1)} ({rating.count})
                                    </span>
                                </>
                            ) : (
                                <span className="text-[clamp(0.55rem,1.8vw,0.68rem)] text-stone-400">
                                    {rating.loading ? 'Loading…' : 'No reviews yet'}
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={!inStock}
                        title="Add to cart"
                        aria-label="Add to cart"
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40
                            bg-white/15 hover:bg-white/25
                            lg:h-11 lg:w-11 lg:bg-transparent lg:hover:bg-white/10
                            lg:group-hover:h-8 lg:group-hover:w-8 lg:group-hover:bg-white/15 lg:group-hover:hover:bg-white/25`}
                    >
                        <ShoppingCart
                            size={15}
                            className={`transition-transform duration-200 ${justAdded ? 'scale-125' : 'scale-100'}`}
                        />
                    </button>
                </div>
            </div>
        </Link>
    );
}

export default ProductCard;