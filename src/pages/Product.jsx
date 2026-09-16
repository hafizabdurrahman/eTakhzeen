import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams, Link } from 'react-router';
import {
    ChevronLeft,
    ChevronRight,
    Star,
    ShoppingCart,
    Zap,
    Check,
    X,
    Minus,
    Plus,
    Truck,
    MapPin,
    Tags,
    PackageCheck,
    MessageSquareText,
    UserRound,
} from 'lucide-react';
import Toggle from '../ui/Toggle'; // ⚠️ adjust path; confirm this Toggle accepts `checked` + `onChange` props
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

/* -------------------------------------------------------------------- */
/* helpers                                                               */
/* -------------------------------------------------------------------- */

// Splits the comma-separated `keywords` string column into a clean array.
// "leather,handmade, gift" -> ["leather", "handmade", "gift"]
function parseKeywords(raw) {
    if (!raw || typeof raw !== 'string') return [];
    return raw
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
}

// Turns product.deliveryDuration (a day count: 1, 2, 3…) into the actual
// calendar date an order placed right now would arrive.
function getEstimatedDeliveryDate(durationDays) {
    const days = Number(durationDays);
    if (!Number.isFinite(days) || days < 0) return null;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

function formatDeliveryDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
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

// Maps a 1–5 rating to a distinct accent so the review list reads at a
// glance, without leaning on a single brand color for everything.
function ratingAccent(rating) {
    const r = Math.round(rating || 0);
    if (r >= 5) return { ring: 'ring-emerald-200 dark:ring-emerald-500/30', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400' };
    if (r === 4) return { ring: 'ring-sky-200 dark:ring-sky-500/30', bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400' };
    if (r === 3) return { ring: 'ring-amber-200 dark:ring-amber-500/30', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400' };
    if (r === 2) return { ring: 'ring-orange-200 dark:ring-orange-500/30', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400' };
    return { ring: 'ring-rose-200 dark:ring-rose-500/30', bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400' };
}

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
                        className={interactive ? 'rounded p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500' : ''}
                    >
                        <Star
                            size={size}
                            className={filled || half ? 'fill-amber-400 text-amber-400' : 'text-stone-300 dark:text-stone-600'}
                        />
                    </button>
                );
            })}
        </div>
    );
}

/* -------------------------------------------------------------------- */
/* component                                                             */
/* -------------------------------------------------------------------- */

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

    // ---- variant rail: drag-to-reorder + scroll ----
    const [orderedSiblings, setOrderedSiblings] = useState([]);
    const draggedIndexRef = useRef(null);
    const trackRef = useRef(null);
    const reviewsSectionRef = useRef(null);

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
    // No free-text name field — the reviewer's own account name is used
    // automatically. This toggle only controls whether it is attached to
    // the review or the review is posted anonymously.
    const [showNameInReview, setShowNameInReview] = useState(true);
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

    useEffect(() => {
        setQty(1);
        setOrderMessage(null);
    }, [slug]);

    useEffect(() => {
        setReviewRating(0);
        setReviewComment('');
        setShowNameInReview(true);
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

    useEffect(() => {
        if (submitStatus === 'succeeded' || submitStatus === 'failed') {
            const t = setTimeout(() => dispatch(resetReviewStatus()), 4000);
            return () => clearTimeout(t);
        }
    }, [submitStatus, dispatch]);

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

    // Jumps to the reviews section without touching the URL / adding a hash.
    function scrollToReviews() {
        reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function scrollTrack(direction) {
        trackRef.current?.scrollBy({ left: direction * 180, behavior: 'smooth' });
    }

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

    async function handleLoadMoreReviews() {
        if (!product?.['$id'] || loadingMore) return;
        setLoadingMore(true);
        await dispatch(
            fetchReviews({ productId: product['$id'], limit: REVIEWS_PAGE_SIZE, offset: reviewItems.length })
        );
        setLoadingMore(false);
    }

    async function handleSubmitReview(e) {
        e.preventDefault();
        if (reviewRating < 1) {
            setReviewFormError('Please select a star rating.');
            return;
        }
        setReviewFormError(null);
        // ⚠️ adjust `userData?.name` if the account object stores the display
        // name under a different field (e.g. userData?.username).
        const nameForSubmission = showNameInReview ? userData?.name || 'Anonymous' : 'Anonymous';
        const result = await dispatch(
            submitReview({
                productId: product['$id'],
                rating: reviewRating,
                comment: reviewComment,
                reviewerName: nameForSubmission,
            })
        );
        if (submitReview.fulfilled.match(result)) {
            setReviewRating(0);
            setReviewComment('');
            setShowNameInReview(true);
            setShowForm(false);
        }
    }

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-8 h-3 w-40 rounded bg-stone-200 dark:bg-stone-800" />
                <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
                    <div className="aspect-[4/3] w-full rounded-lg bg-stone-200 dark:bg-stone-800" />
                    <div className="space-y-4">
                        <div className="h-3 w-24 rounded bg-stone-200 dark:bg-stone-800" />
                        <div className="h-8 w-3/4 rounded bg-stone-200 dark:bg-stone-800" />
                        <div className="h-4 w-1/3 rounded bg-stone-200 dark:bg-stone-800" />
                        <div className="h-9 w-1/4 rounded bg-stone-200 dark:bg-stone-800" />
                        <div className="h-11 w-full rounded-md bg-stone-200 dark:bg-stone-800" />
                    </div>
                </div>
            </div>
        );
    }
    if (error) {
        return (
            <p className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-rose-600 dark:text-rose-400 sm:px-6 lg:px-8">
                {error}
            </p>
        );
    }
    if (!product || !product['$id']) return null;

    const inStock = product.status === true;
    const variantStrip = [product, ...orderedSiblings];
    const hasMoreReviews = reviewItems.length < reviewTotal;
    const keywordList = parseKeywords(product.keywords);
    const deliveryDate = product.deliveryDuration != null ? getEstimatedDeliveryDate(product.deliveryDuration) : null;

    return (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            {/* breadcrumb */}
            <div className="mb-6 flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                <Link to="/products" className="hover:text-indigo-700 dark:hover:text-indigo-400">
                    Products
                </Link>
                <ChevronRight size={12} className="text-stone-300 dark:text-stone-700" />
                <Link
                    to={`/products?category=${encodeURIComponent(product.category)}`}
                    className="hover:text-indigo-700 dark:hover:text-indigo-400"
                >
                    {product.category}
                </Link>
                <ChevronRight size={12} className="text-stone-300 dark:text-stone-700" />
                <span className="text-stone-700 dark:text-stone-300">{product.group}</span>
            </div>

            {isAdmin && !editing && (
                <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-stone-200 pb-4 text-xs dark:border-stone-800">
                    <span className="font-medium text-stone-400 dark:text-stone-500">Admin</span>
                    <button
                        onClick={startEdit}
                        className="font-medium text-indigo-700 transition-colors hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                        Edit product
                    </button>
                    <span className="text-stone-300 dark:text-stone-700">·</span>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="font-medium text-rose-600 transition-colors hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-400 dark:hover:text-rose-300"
                    >
                        {deleting ? 'Deleting…' : 'Delete product'}
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
                    {/* ============ hero: image + buy panel ============ */}
                    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
                        {/* image, framed rather than glow-backed */}
                        <div className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900">
                            {product.fileId ? (
                                <img
                                    src={service.getImagePreview({ fileId: product.fileId })}
                                    alt={product.name}
                                    className="aspect-[4/3] w-full object-cover"
                                />
                            ) : (
                                <div className="aspect-[4/3] w-full bg-stone-100 dark:bg-stone-800" />
                            )}
                            <span
                                className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm ${
                                    inStock
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-rose-600 text-white'
                                }`}
                            >
                                {inStock ? <Check size={12} /> : <X size={12} />}
                                {inStock ? 'In stock' : 'Out of stock'}
                            </span>
                        </div>

                        {/* buy panel: hard top accent instead of a gradient blob */}
                        <div className="lg:sticky lg:top-24">
                            <div className="rounded-lg border border-stone-200 border-t-4 border-t-indigo-600 bg-white p-5 shadow-sm dark:border-stone-800 dark:border-t-indigo-500 dark:bg-stone-900">
                                <h1 className="text-2xl font-bold leading-tight text-stone-900 dark:text-stone-100">
                                    {product.name}
                                </h1>

                                <button
                                    type="button"
                                    onClick={scrollToReviews}
                                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-indigo-700 dark:text-stone-400 dark:hover:text-indigo-400"
                                >
                                    <StarRow value={reviewStats.average} size={14} />
                                    <span>
                                        {reviewStats.count > 0
                                            ? `${reviewStats.average.toFixed(1)} (${reviewStats.count} review${reviewStats.count === 1 ? '' : 's'})`
                                            : 'No reviews yet'}
                                    </span>
                                </button>

                                <p className="mt-4 text-3xl font-bold text-stone-900 dark:text-stone-100">
                                    {formatPKR(product.price)}
                                </p>

                                <div className="mt-5">
                                    {inStock ? (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <div className="inline-flex items-center rounded-md border border-stone-200 dark:border-stone-700">
                                                    <button
                                                        type="button"
                                                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                                                        aria-label="Decrease quantity"
                                                        className="flex h-10 w-10 items-center justify-center text-stone-600 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                                                    >
                                                        <Minus size={15} />
                                                    </button>
                                                    <span className="w-8 text-center text-sm font-bold text-stone-900 dark:text-stone-100">
                                                        {qty}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setQty((q) => q + 1)}
                                                        aria-label="Increase quantity"
                                                        className="flex h-10 w-10 items-center justify-center text-stone-600 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                                                    >
                                                        <Plus size={15} />
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={handleAddToCart}
                                                    disabled={adding}
                                                    title="Add to cart"
                                                    aria-label="Add to cart"
                                                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-indigo-200 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-500/30 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                                                >
                                                    <ShoppingCart size={16} />
                                                    Add to cart
                                                </button>
                                            </div>

                                            <button
                                                onClick={handleOrderNow}
                                                disabled={ordering}
                                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                                            >
                                                <Zap size={16} />
                                                {ordering ? 'Preparing checkout…' : 'Order now'}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handleRequestRestock}
                                            className="w-full rounded-md bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
                                        >
                                            Notify me when back in stock
                                        </button>
                                    )}

                                    {orderMessage && (
                                        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                            <PackageCheck size={15} />
                                            {orderMessage}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ============ variant rail ============ */}
                    {variantStrip.length > 1 && (
                        <div className="mt-8">
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                                    Other options in {product.group}
                                </h2>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => scrollTrack(-1)}
                                        aria-label="Scroll left"
                                        className="rounded-md border border-stone-200 p-1.5 text-stone-500 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-stone-700 dark:text-stone-400 dark:hover:text-indigo-400"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => scrollTrack(1)}
                                        aria-label="Scroll right"
                                        className="rounded-md border border-stone-200 p-1.5 text-stone-500 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-stone-700 dark:text-stone-400 dark:hover:text-indigo-400"
                                    >
                                        <ChevronRight size={16} />
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
                                    const card = (
                                        <div className="w-24 shrink-0">
                                            <div
                                                className={`aspect-square overflow-hidden rounded-md border-2 transition-colors ${
                                                    isCurrent
                                                        ? 'border-indigo-600 dark:border-indigo-500'
                                                        : 'border-transparent'
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
                                            <p
                                                className={`mt-1.5 truncate text-center text-xs ${
                                                    isCurrent
                                                        ? 'font-semibold text-indigo-700 dark:text-indigo-400'
                                                        : 'text-stone-500 dark:text-stone-400'
                                                }`}
                                            >
                                                {p.name}
                                            </p>
                                        </div>
                                    );

                                    if (isCurrent) {
                                        return (
                                            <div key={p['$id']} className="cursor-default">
                                                {card}
                                            </div>
                                        );
                                    }

                                    const siblingIdx = idx - 1;
                                    return (
                                        <div
                                            key={p['$id']}
                                            draggable
                                            onDragStart={() => handleDragStart(siblingIdx)}
                                            onDragOver={(e) => handleDragOver(e, siblingIdx)}
                                            onDragEnd={handleDragEnd}
                                            className="cursor-grab active:cursor-grabbing"
                                        >
                                            <Link to={`/products/${p.category}/${p.group}/${p.slug}`} draggable={false}>
                                                {card}
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ============ details strip: keywords / delivery / seller ============ */}
                    <div className="mt-10 grid gap-4 border-y border-stone-200 py-6 dark:border-stone-800 sm:grid-cols-3">
                        {/* keywords */}
                        <div className="flex gap-3">
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                                <Tags size={16} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Keywords</p>
                                {keywordList.length > 0 ? (
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {keywordList.map((keyword) => (
                                            <span
                                                key={keyword}
                                                className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-400"
                                            >
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">Not tagged</p>
                                )}
                            </div>
                        </div>

                        {/* delivery estimate — ⚠️ product.deliveryDuration is a day count (1, 2, 3…) */}
                        <div className="flex gap-3">
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                                <Truck size={16} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                                    {product.deliveryDuration != null
                                        ? `Delivery in ${product.deliveryDuration} day${Number(product.deliveryDuration) === 1 ? '' : 's'}`
                                        : 'Delivery estimate unavailable'}
                                </p>
                                {deliveryDate && (
                                    <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                                        Order now to receive it by{' '}
                                        <span className="font-medium text-stone-700 dark:text-stone-300">
                                            {formatDeliveryDate(deliveryDate)}
                                        </span>
                                        .
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* seller location — ⚠️ pick whichever field name matches your schema, defaulting to product.sellerLocation */}
                        <div className="flex gap-3">
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
                                <MapPin size={16} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Ships from</p>
                                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                                    {product.sellerLocation || 'Not specified'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {product.description && (
                        <p className="mt-8 max-w-2xl text-[15px] leading-7 text-stone-600 dark:text-stone-300">
                            {product.description}
                        </p>
                    )}

                    {/* ============ reviews ============ */}
                    <section ref={reviewsSectionRef} className="mt-14 scroll-mt-24">
                        <div className="mb-6 flex items-center gap-2">
                            <MessageSquareText size={18} className="text-indigo-600 dark:text-indigo-400" />
                            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Customer reviews</h2>
                        </div>

                        <div className="grid gap-8 sm:grid-cols-[180px_1fr]">
                            {/* summary */}
                            <div>
                                <p className="text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                                    {reviewStats.count > 0 ? reviewStats.average.toFixed(1) : '—'}
                                </p>
                                <div className="mt-2">
                                    <StarRow value={reviewStats.average} size={15} />
                                </div>
                                <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
                                    {reviewStats.count > 0
                                        ? `Based on ${reviewStats.count} review${reviewStats.count === 1 ? '' : 's'}`
                                        : 'No reviews yet'}
                                </p>
                                {!showForm && (
                                    <button
                                        onClick={() => setShowForm(true)}
                                        className="mt-4 w-full rounded-md border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                                    >
                                        Write a review
                                    </button>
                                )}
                            </div>

                            {/* list + form */}
                            <div className="min-w-0">
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
                                        {reviewItems.map((r) => {
                                            const accent = ratingAccent(r.rating);
                                            return (
                                                <li key={r['$id']} className="flex gap-3 py-4 first:pt-0">
                                                    <div
                                                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ring-2 ${accent.bg} ${accent.ring} ${accent.text}`}
                                                    >
                                                        {r.reviewerName && r.reviewerName !== 'Anonymous' ? (
                                                            <span className="text-xs font-bold">{r.reviewerName.charAt(0).toUpperCase()}</span>
                                                        ) : (
                                                            <UserRound size={15} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                                                                {r.reviewerName || 'Anonymous'}
                                                            </p>
                                                            <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">
                                                                {timeAgo(r['$createdAt'])}
                                                            </span>
                                                        </div>
                                                        <StarRow value={r.rating} size={13} />
                                                        {r.comment && (
                                                            <p className="mt-1.5 text-sm leading-6 text-stone-600 dark:text-stone-300">
                                                                {r.comment}
                                                            </p>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="rounded-md border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
                                        No reviews yet — be the first to share what you think.
                                    </p>
                                )}

                                {hasMoreReviews && (
                                    <button
                                        onClick={handleLoadMoreReviews}
                                        disabled={loadingMore}
                                        className="mt-4 w-full rounded-md border border-stone-200 py-2 text-sm font-medium text-stone-900 transition-colors hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:text-stone-100 dark:hover:border-indigo-500"
                                    >
                                        {loadingMore ? 'Loading…' : `Load more reviews (${reviewTotal - reviewItems.length} more)`}
                                    </button>
                                )}

                                {(showForm || reviewItems.length === 0) && (
                                    <form
                                        onSubmit={handleSubmitReview}
                                        className="mt-6 space-y-4 border-l-2 border-indigo-600 pl-5 dark:border-indigo-500"
                                    >
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
                                                Your rating <span className="text-rose-600 dark:text-rose-400">*</span>
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

                                        <div className="flex items-center justify-between gap-4 rounded-md bg-stone-50 px-4 py-3 dark:bg-stone-800/60">
                                            <div className="flex items-center gap-2.5">
                                                <UserRound size={16} className="flex-shrink-0 text-stone-400 dark:text-stone-500" />
                                                <div>
                                                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                                                        Display my name
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                                                        {showNameInReview
                                                            ? `This review will be posted as "${userData?.name || 'you'}".` // ⚠️ adjust field if account name lives elsewhere
                                                            : 'This review will be posted as "Anonymous".'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Toggle checked={showNameInReview} onChange={setShowNameInReview} />
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
                                                className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                                            />
                                        </div>

                                        {reviewFormError && <p className="text-xs text-rose-600 dark:text-rose-400">{reviewFormError}</p>}
                                        {submitStatus === 'succeeded' && (
                                            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                                Thank you — your review has been submitted.
                                            </p>
                                        )}
                                        {submitStatus === 'failed' && (
                                            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                                                {reviewError || 'Something went wrong. Please try again.'}
                                            </p>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={submitStatus === 'loading'}
                                            className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600 sm:w-auto"
                                        >
                                            {submitStatus === 'loading'
                                                ? 'Submitting…'
                                                : showNameInReview
                                                ? 'Submit review'
                                                : 'Submit as anonymous'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

export default Product;