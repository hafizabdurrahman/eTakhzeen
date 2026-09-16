import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useDispatch } from 'react-redux';
import { ShoppingCart, Star, Sparkles, MapPin, Truck, History } from 'lucide-react';
import service from '../../../backend/service'; // ⚠️ adjust path
import reviewService from '../../../backend/reviews'; // ⚠️ adjust path — same service reviewSlice's thunks call
import { formatPKR } from '../../../utils/formatPrice'; // ⚠️ adjust path
import { addToCart } from '../../../store/slices/cartSlice'; // ⚠️ adjust path + action name
import { timeAgo, formatDateTime, activityLabel } from '../../../utils/timeAgo'; // ⚠️ adjust path

// Structural clone of ProductCard — same image, same top badges, same
// rating fetch, same add-to-cart button — with one deliberate difference:
// the bottom info panel is docked open at rest instead of collapsing to a
// floating circle, and on hover it grows *taller* (not wider) to reveal a
// second block of detail. Anchored to bottom-0, that growth is what pushes
// the panel's top edge upward — the "moves up" motion comes from content,
// not from a bottom-offset flip like the base card uses.
function FeaturedCard({ product }) {
    const dispatch = useDispatch();

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
    const activity = activityLabel(product);
    const hasExtraDetail = Boolean(
        product.description || product.sellerLocation || product.deliveryDuration || activity
    );

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
            {/* Image — identical to ProductCard */}
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

            {/* Top row — stock + price, identical to ProductCard, plus a
                persistent Featured badge stacked just above it so the
                "this is featured" signal is visible at rest, not only
                revealed on hover. */}
            <div className="relative z-20 flex flex-col gap-1.5 p-2.5 sm:p-3">
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-brand-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm dark:bg-brand-500">
                    <Sparkles size={10} />
                    Featured
                </span>

                <div className="flex items-start justify-between">
                    <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 text-[clamp(0.55rem,1.6vw,0.7rem)] font-medium text-stone-700 shadow-sm backdrop-blur-sm dark:bg-stone-900/80 dark:text-stone-200">
                        <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {inStock ? 'In stock' : 'Out of stock'}
                    </span>

                    <span className="rounded-full bg-stone-900/85 px-2.5 py-1 text-[clamp(0.6rem,1.7vw,0.75rem)] font-semibold text-white shadow-sm backdrop-blur-sm dark:bg-white/90 dark:text-stone-900">
                        {formatPKR(product.price)}
                    </span>
                </div>
            </div>

            {/* Bottom panel — docked open at all breakpoints (this is the
                "box on the card" for Featured). Base row (name + rating +
                cart) is always visible; a second block slides in on hover
                by animating max-height, which grows the panel and, since
                it's pinned to bottom-0, pushes the whole thing upward. */}
            <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center pb-0">
                <div className="w-[90%] rounded-xl bg-stone-900/85 px-3 py-2.5 text-cream backdrop-blur-md transition-colors duration-300">
                    <div className="flex items-center gap-2.5">
                        <div className="min-w-0 flex-1">
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
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/15 transition-colors duration-200 hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ShoppingCart
                                size={15}
                                className={`transition-transform duration-200 ${justAdded ? 'scale-125' : 'scale-100'}`}
                            />
                        </button>
                    </div>

                    {/* Extra detail — collapsed to 0 height at rest, grows
                        open on hover. max-height (not height:auto) is what
                        makes the transition animatable. */}
                    {hasExtraDetail && (
                        <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:grid-rows-[1fr]">
                            <div className="overflow-hidden">
                                <div className="mt-2.5 space-y-2 border-t border-white/10 pt-2.5 opacity-0 transition-opacity duration-200 delay-100 group-hover:opacity-100">
                                    {product.description && (
                                        <p className="line-clamp-2 text-[clamp(0.62rem,1.8vw,0.72rem)] leading-relaxed text-stone-300">
                                            {product.description}
                                        </p>
                                    )}

                                    {(product.sellerLocation || product.deliveryDuration) && (
                                        <div className="flex flex-wrap items-center gap-2 text-[clamp(0.58rem,1.7vw,0.68rem)] text-stone-300">
                                            {product.sellerLocation && (
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPin size={11} className="text-stone-400" />
                                                    {product.sellerLocation}
                                                </span>
                                            )}
                                            {product.deliveryDuration && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Truck size={11} className="text-stone-400" />
                                                    {product.deliveryDuration}{' '}
                                                    {Number(product.deliveryDuration) === 1 ? 'day' : 'days'}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {activity && (
                                        <div
                                            className="flex items-center gap-1 text-[clamp(0.56rem,1.6vw,0.65rem)] text-stone-400"
                                            title={formatDateTime(activity.iso)}
                                        >
                                            <History size={10} />
                                            {activity.verb} {timeAgo(activity.iso)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}

export default FeaturedCard;