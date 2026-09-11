import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams, Link } from 'react-router';
import { ChevronLeft, ChevronRight, Star, ShoppingCart, Zap, Check, X } from 'lucide-react';
import service from '../backend/service'; // ⚠️ adjust path if backend/ isn't directly under src/
import { getOneProduct, getProducts } from '../store/slices/productSlice'; // ⚠️ adjust path
import { addToCart } from '../store/slices/cartSlice'; // ⚠️ adjust path
import {
    fetchReviews,
    fetchReviewStats,
    submitReview,
    resetReviewStatus,
    clearReviews,
} from '../store/slices/reviewSlice'; // ⚠️ adjust path
import { formatPKR } from '../utils/formatPrice'; // ⚠️ adjust path
import ProductForm from '../admin/components/ProductForm'; // ⚠️ adjust path

const REVIEWS_PAGE_SIZE = 4;

// Renders a static or interactive star row. `value` can be fractional
// (e.g. 4.3) for a read-only average display.
function StarRow({ value, size = 16, interactive = false, onPick, onHover, onLeave }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => {
                const filled = value >= star;
                const half = !filled && value > star - 1;
                return (
                    <button
                        key={star}
                        type={interactive ? 'button' : undefined}
                        disabled={!interactive}
                        onClick={interactive ? () => onPick(star) : undefined}
                        onMouseEnter={interactive ? () => onHover(star) : undefined}
                        onMouseLeave={interactive ? onLeave : undefined}
                        className={interactive ? 'rounded p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500' : ''}
                    >
                        <Star
                            size={size}
                            className={
                                filled || half
                                    ? 'fill-brand-500 text-brand-500'
                                    : 'text-stone-300 dark:text-stone-600'
                            }
                        />
                    </button>
                );
            })}
        </div>
    );
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diffMs / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? 's' : ''} ago`;
}

function Product() {
    const { category, group, slug } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const userData = useSelector((s) => s.user.userData);
    const isAdmin = userData?.labels?.includes('admin');

    const product = useSelector((s) => s.products.product);
    const siblings = useSelector((s) => s.products.products);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [editing, setEditing] = useState(false);
    const [editCategories, setEditCategories] = useState({});
    const [editGroups, setEditGroups] = useState({});
    const [deleting, setDeleting] = useState(false);

    // ---- cart / order state ----
    const [qty, setQty] = useState(1);
    const [ordering, setOrdering] = useState(false);
    const [orderMessage, setOrderMessage] = useState(null);
    const [adding, setAdding] = useState(false);

    // ---- variant strip state (drag-to-reorder + scroll, no scrollbar) ----
    const [orderedSiblings, setOrderedSiblings] = useState([]);
    const draggedIndexRef = useRef(null);
    const trackRef = useRef(null);

    // ---- reviews ----
    const reviewItems = useSelector((s) => s.reviews.items);
    const reviewTotal = useSelector((s) => s.reviews.total);
    const reviewStats = useSelector((s) => s.reviews.stats);
    const fetchStatus = useSelector((s) => s.reviews.fetchStatus);
    const submitStatus = useSelector((s) => s.reviews.submitStatus);
    const reviewError = useSelector((s) => s.reviews.error);

    const [loadingMore, setLoadingMore] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [reviewRating, setReviewRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewerName, setReviewerName] = useState('');
    const [reviewComment, setReviewComment] = useState('');
    const [reviewFormError, setReviewFormError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        const found = await service.getProductBySlug({ slug });
        if (!found) {
            setError('Product not found.');
            setLoading(false);
            return;
        }

        // Case-insensitive / trimmed comparison so a casing mismatch between
        // the stored category/group and the URL param can't trigger a
        // redirect loop that leaves `loading` stuck true forever.
        const normalizedCategory = (found.category || '').trim().toLowerCase();
        const normalizedGroup = (found.group || '').trim().toLowerCase();
        const urlCategory = (category || '').trim().toLowerCase();
        const urlGroup = (group || '').trim().toLowerCase();

        if (normalizedCategory !== urlCategory || normalizedGroup !== urlGroup) {
            setLoading(false);
            navigate(`/products/${found.category}/${found.group}/${found.slug}`, { replace: true });
            return;
        }

        dispatch(getOneProduct(found));

        const groupProducts = await service.getProducts({
            category: found.category,
            group: found.group,
        });
        dispatch(getProducts(Array.isArray(groupProducts) ? groupProducts : []));

        setLoading(false);
    }, [slug, category, group, navigate, dispatch]);

    useEffect(() => {
        load();
    }, [load]);

    // Reset transient cart/order UI whenever we land on a different product.
    useEffect(() => {
        setQty(1);
        setOrderMessage(null);
    }, [slug]);

    // Reset + reload reviews whenever we land on a different product.
    useEffect(() => {
        setReviewRating(0);
        setReviewComment('');
        setReviewerName('');
        setReviewFormError(null);
        setShowForm(false);
        dispatch(resetReviewStatus());
        dispatch(clearReviews());
    }, [slug, dispatch]);

    useEffect(() => {
        if (!product?.['$id']) return;
        dispatch(fetchReviews({ productId: product['$id'], limit: REVIEWS_PAGE_SIZE, offset: 0 }));
        dispatch(fetchReviewStats({ productId: product['$id'] }));
    }, [product?.['$id'], dispatch]);

    // Auto-clear the submitted/failed review banner after a few seconds.
    useEffect(() => {
        if (submitStatus === 'succeeded' || submitStatus === 'failed') {
            const t = setTimeout(() => dispatch(resetReviewStatus()), 4000);
            return () => clearTimeout(t);
        }
    }, [submitStatus, dispatch]);

    // Keep the variant strip's local order in sync with fresh fetches,
    // strictly scoped to THIS product's group — other groups never leak in.
    useEffect(() => {
        if (!product) return;
        const scoped = siblings.filter(
            (p) => p['$id'] !== product['$id'] && p.group === product.group && p.category === product.category
        );
        setOrderedSiblings(scoped);
    }, [siblings, product]);

    async function startEdit() {
        const [categoryMap, groupMap] = await Promise.all([
            service.listCategories(),
            service.listGroups(),
        ]);
        setEditCategories(categoryMap && categoryMap !== false ? categoryMap : {});
        setEditGroups(groupMap && groupMap !== false ? groupMap : {});
        setEditing(true);
    }

    function handleEditDone() {
        setEditing(false);
        load();
    }

    async function handleDelete() {
        if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
        setDeleting(true);
        const ok = await service.deleteProduct({ rowId: product['$id'] });
        if (ok && product.fileId) {
            service.deleteImage({ fileId: product.fileId }).catch(() => {});
        }
        setDeleting(false);
        if (ok) {
            navigate(`/products`);
        } else {
            alert('Failed to delete product.');
        }
    }

    async function handleAddToCart() {
        if (!userData) {
            navigate('/welcome-back');
            return;
        }
        setAdding(true);
        await dispatch(addToCart({ userId: userData['$id'], product, quantity: qty }));
        setAdding(false);
        setOrderMessage('Added to cart.');
    }

    async function handleOrderNow() {
        if (userData) {
            setOrdering(true);
            await dispatch(addToCart({ userId: userData['$id'], product, quantity: qty }));
            setOrdering(false);
        }
        navigate('/checkout', { state: { items: [{ product, quantity: qty }], mode: 'single' } });
    }

    function handleRequestRestock() {
        alert(`We'll notify you when "${product.name}" is back in stock.`);
    }

    // ---- variant strip: scroll buttons ----
    function scrollTrack(direction) {
        trackRef.current?.scrollBy({ left: direction * 180, behavior: 'smooth' });
    }

    // ---- variant strip: drag to reorder ----
    function handleDragStart(index) {
        draggedIndexRef.current = index;
    }

    function handleDragOver(e, index) {
        e.preventDefault();
        const from = draggedIndexRef.current;
        if (from === null || from === index) return;
        setOrderedSiblings((prev) => {
            const updated = [...prev];
            const [moved] = updated.splice(from, 1);
            updated.splice(index, 0, moved);
            return updated;
        });
        draggedIndexRef.current = index;
    }

    async function handleDragEnd() {
        draggedIndexRef.current = null;
        const updates = orderedSiblings.map((p, idx) => ({ id: p['$id'], order: idx }));
        const ok = await service.updateProductOrder(updates);
        if (!ok) console.error('Failed to persist new variant order.');
    }

    // ---- reviews: load more ----
    async function handleLoadMoreReviews() {
        if (!product?.['$id'] || loadingMore) return;
        setLoadingMore(true);
        await dispatch(
            fetchReviews({ productId: product['$id'], limit: REVIEWS_PAGE_SIZE, offset: reviewItems.length })
        );
        setLoadingMore(false);
    }

    // ---- reviews: submit ----
    async function handleSubmitReview(e) {
        e.preventDefault();
        if (reviewRating < 1) {
            setReviewFormError('Please select a star rating.');
            return;
        }
        setReviewFormError(null);
        const result = await dispatch(
            submitReview({
                productId: product['$id'],
                rating: reviewRating,
                comment: reviewComment,
                reviewerName,
            })
        );
        if (submitReview.fulfilled.match(result)) {
            setReviewRating(0);
            setReviewComment('');
            setReviewerName('');
            setShowForm(false);
        }
    }

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl animate-pulse px-4 py-12 sm:px-6 lg:px-8">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
                    <div className="aspect-square w-full rounded-lg bg-stone-200 dark:bg-stone-800" />
                    <div className="space-y-3">
                        <div className="h-6 w-2/3 rounded bg-stone-200 dark:bg-stone-800" />
                        <div className="h-4 w-1/3 rounded bg-stone-200 dark:bg-stone-800" />
                        <div className="h-8 w-1/4 rounded bg-stone-200 dark:bg-stone-800" />
                        <div className="h-10 w-full rounded bg-stone-200 dark:bg-stone-800" />
                    </div>
                </div>
            </div>
        );
    }
    if (error) return <p className="mx-auto max-w-7xl px-4 py-12 text-sm text-red-600 dark:text-red-400 sm:px-6 lg:px-8">{error}</p>;
    if (!product || !product['$id']) return null;

    const inStock = product.status === true;
    const variantStrip = [product, ...orderedSiblings];
    const hasMoreReviews = reviewItems.length < reviewTotal;

    return (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {/* breadcrumb */}
            <nav className="mb-4 flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                <Link to="/products" className="hover:text-brand-700 dark:hover:text-brand-400">Products</Link>
                <span>/</span>
                <Link to={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-brand-700 dark:hover:text-brand-400">
                    {product.category}
                </Link>
                <span>/</span>
                <span className="text-stone-700 dark:text-stone-300">{product.group}</span>
            </nav>

            {isAdmin && !editing && (
                <div className="mb-6 flex flex-wrap items-center gap-2 rounded-md border border-stone-200 bg-cream p-2 dark:border-stone-800 dark:bg-stone-900">
                    <span className="mr-2 text-xs text-stone-500 dark:text-stone-400">Admin</span>
                    <button
                        onClick={startEdit}
                        className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                    >
                        Edit
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            )}

            {editing ? (
                <ProductForm
                    initialData={product}
                    categories={editCategories}
                    groups={editGroups}
                    onDone={handleEditDone}
                    onCancel={() => setEditing(false)}
                />
            ) : (
                <>
                    <div className="mb-10 grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
                        {/* image */}
                        <div>
                            {product.fileId ? (
                                <img
                                    src={service.getImagePreview({ fileId: product.fileId })}
                                    alt={product.name}
                                    className="aspect-square w-full max-w-xl rounded-xl border border-stone-200 object-cover dark:border-stone-800"
                                />
                            ) : (
                                <div className="aspect-square w-full max-w-xl rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-800 dark:bg-stone-800" />
                            )}
                        </div>

                        {/* buy box */}
                        <div className="rounded-xl border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-6">
                            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">{product.name}</h1>

                            <a href="#reviews" className="mt-2 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-brand-700 dark:text-stone-400 dark:hover:text-brand-400">
                                <StarRow value={reviewStats.average} size={15} />
                                <span>
                                    {reviewStats.count > 0
                                        ? `${reviewStats.average.toFixed(1)} (${reviewStats.count} review${reviewStats.count === 1 ? '' : 's'})`
                                        : 'No reviews yet'}
                                </span>
                            </a>

                            <p className="mb-1 mt-3 text-xs uppercase tracking-wide text-stone-400 dark:text-stone-500">
                                {product.category}
                            </p>

                            <div className="mb-4 flex items-center gap-2">
                                <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                        inStock
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                            : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                                    }`}
                                >
                                    {inStock ? <Check size={12} /> : <X size={12} />}
                                    {inStock ? 'In stock' : 'Out of stock'}
                                </span>
                            </div>

                            <p className="mb-5 text-2xl font-bold text-brand-700 dark:text-brand-500">{formatPKR(product.price)}</p>

                            {inStock ? (
                                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <input
                                        type="number"
                                        min="1"
                                        value={qty}
                                        onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                                        className="w-full rounded-md border border-stone-200 bg-cream px-2 py-1.5 text-sm text-stone-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/20 sm:w-16"
                                    />
                                    <button
                                        onClick={handleAddToCart}
                                        disabled={adding}
                                        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-stone-200 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:border-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-800 dark:text-stone-100 dark:hover:border-brand-500 sm:w-auto"
                                    >
                                        <ShoppingCart size={16} />
                                        {adding ? 'Adding...' : 'Add to Cart'}
                                    </button>
                                    <button
                                        onClick={handleOrderNow}
                                        disabled={ordering}
                                        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600 sm:w-auto"
                                    >
                                        <Zap size={16} />
                                        {ordering ? 'Preparing checkout...' : 'Order Now'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleRequestRestock}
                                    className="mb-2 w-full rounded-md border border-stone-200 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:border-brand-600 dark:border-stone-800 dark:text-stone-100 dark:hover:border-brand-500 sm:w-auto"
                                >
                                    Request to get it in stock
                                </button>
                            )}

                            {orderMessage && <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">{orderMessage}</p>}

                            {product.description && (
                                <p className="mt-4 text-sm leading-6 text-stone-500 dark:text-stone-400">{product.description}</p>
                            )}
                        </div>
                    </div>

                    {/* variant strip — image only, no visible scrollbar, click to switch, updates the URL */}
                    {variantStrip.length > 1 && (
                        <div className="mb-10">
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                                    More in {product.group}
                                </h2>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => scrollTrack(-1)}
                                        aria-label="Scroll left"
                                        className="rounded-md p-1.5 text-stone-500 transition-colors hover:bg-brand-50 hover:text-brand-700 dark:text-stone-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => scrollTrack(1)}
                                        aria-label="Scroll right"
                                        className="rounded-md p-1.5 text-stone-500 transition-colors hover:bg-brand-50 hover:text-brand-700 dark:text-stone-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>

                            <div
                                ref={trackRef}
                                className="flex gap-3 overflow-x-auto scroll-smooth pb-1 [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {variantStrip.map((p, idx) => {
                                    const isCurrent = p['$id'] === product['$id'];
                                    const thumb = (
                                        <div
                                            className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:h-24 sm:w-24 ${
                                                isCurrent
                                                    ? 'border-brand-600 ring-2 ring-brand-100 dark:border-brand-500 dark:ring-brand-500/20'
                                                    : 'border-stone-200 hover:border-brand-400 dark:border-stone-800'
                                            }`}
                                        >
                                            {p.fileId ? (
                                                <img
                                                    src={service.getImagePreview({ fileId: p.fileId })}
                                                    alt={p.name}
                                                    draggable={false}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-full w-full bg-stone-100 dark:bg-stone-800" />
                                            )}
                                        </div>
                                    );

                                    if (isCurrent) {
                                        return (
                                            <div key={p['$id']} title={p.name} className="cursor-default">
                                                {thumb}
                                            </div>
                                        );
                                    }

                                    // sibling index within orderedSiblings (offset by 1 for the leading current item)
                                    const siblingIdx = idx - 1;
                                    return (
                                        <div
                                            key={p['$id']}
                                            draggable
                                            onDragStart={() => handleDragStart(siblingIdx)}
                                            onDragOver={(e) => handleDragOver(e, siblingIdx)}
                                            onDragEnd={handleDragEnd}
                                            className="cursor-grab active:cursor-grabbing"
                                            title={p.name}
                                        >
                                            <Link to={`/products/${p.category}/${p.group}/${p.slug}`} draggable={false}>
                                                {thumb}
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* reviews */}
                    <section id="reviews" className="scroll-mt-20 rounded-xl border border-stone-200 bg-cream p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-6">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Reviews</h2>
                                <div className="mt-1 flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                                    <StarRow value={reviewStats.average} size={15} />
                                    {reviewStats.count > 0 ? (
                                        <span>{reviewStats.average.toFixed(1)} out of 5 · {reviewStats.count} review{reviewStats.count === 1 ? '' : 's'}</span>
                                    ) : (
                                        <span>No reviews yet</span>
                                    )}
                                </div>
                            </div>
                            {!showForm && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="rounded-md border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-900 transition-colors hover:border-brand-600 dark:border-stone-800 dark:text-stone-100 dark:hover:border-brand-500"
                                >
                                    Write a review
                                </button>
                            )}
                        </div>

                        {/* list */}
                        {fetchStatus === 'loading' && reviewItems.length === 0 ? (
                            <div className="space-y-4">
                                {[0, 1].map((i) => (
                                    <div key={i} className="animate-pulse space-y-2 border-b border-stone-200 pb-4 dark:border-stone-800">
                                        <div className="h-4 w-24 rounded bg-stone-200 dark:bg-stone-800" />
                                        <div className="h-3 w-full rounded bg-stone-200 dark:bg-stone-800" />
                                    </div>
                                ))}
                            </div>
                        ) : reviewItems.length > 0 ? (
                            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                                {reviewItems.map((r) => (
                                    <li key={r['$id']} className="py-4 first:pt-0">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                                                {r.reviewerName || 'Anonymous'}
                                            </p>
                                            <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">
                                                {timeAgo(r['$createdAt'])}
                                            </span>
                                        </div>
                                        <StarRow value={r.rating} size={14} />
                                        {r.comment && (
                                            <p className="mt-1.5 text-sm leading-6 text-stone-600 dark:text-stone-300">{r.comment}</p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="rounded-md bg-stone-50 px-4 py-6 text-center text-sm text-stone-500 dark:bg-stone-800/50 dark:text-stone-400">
                                No reviews yet — be the first to share what you think.
                            </p>
                        )}

                        {hasMoreReviews && (
                            <button
                                onClick={handleLoadMoreReviews}
                                disabled={loadingMore}
                                className="mt-4 w-full rounded-md border border-stone-200 py-2 text-sm font-medium text-stone-900 transition-colors hover:border-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-800 dark:text-stone-100 dark:hover:border-brand-500"
                            >
                                {loadingMore ? 'Loading...' : `Load more reviews (${reviewTotal - reviewItems.length} more)`}
                            </button>
                        )}

                        {/* form — shown after the list, either toggled open or forced open when there's nothing to show yet */}
                        {(showForm || reviewItems.length === 0) && (
                            <form onSubmit={handleSubmitReview} className="mt-6 space-y-4 border-t border-stone-200 pt-6 dark:border-stone-800">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">Write a review</h3>
                                    {showForm && (
                                        <button
                                            type="button"
                                            onClick={() => setShowForm(false)}
                                            className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-stone-900 dark:text-stone-100">
                                        Your rating <span className="text-red-600 dark:text-red-400">*</span>
                                    </label>
                                    <StarRow
                                        value={hoverRating || reviewRating}
                                        size={22}
                                        interactive
                                        onPick={setReviewRating}
                                        onHover={setHoverRating}
                                        onLeave={() => setHoverRating(0)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="reviewerName" className="mb-1.5 block text-sm font-medium text-stone-900 dark:text-stone-100">
                                        Name (optional)
                                    </label>
                                    <input
                                        id="reviewerName"
                                        type="text"
                                        value={reviewerName}
                                        onChange={(e) => setReviewerName(e.target.value)}
                                        placeholder="How should we credit this review?"
                                        className="w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="reviewComment" className="mb-1.5 block text-sm font-medium text-stone-900 dark:text-stone-100">
                                        Review (optional)
                                    </label>
                                    <textarea
                                        id="reviewComment"
                                        rows={4}
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                        placeholder="What did you like or dislike about this product?"
                                        className="w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                                    />
                                </div>

                                {reviewFormError && <p className="text-xs text-red-600 dark:text-red-400">{reviewFormError}</p>}
                                {submitStatus === 'succeeded' && (
                                    <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                                        Thanks — your review was submitted.
                                    </p>
                                )}
                                {submitStatus === 'failed' && (
                                    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                                        {reviewError || 'Something went wrong. Please try again.'}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitStatus === 'loading'}
                                    className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600 sm:w-auto"
                                >
                                    {submitStatus === 'loading' ? 'Submitting...' : 'Submit review'}
                                </button>
                            </form>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

export default Product;