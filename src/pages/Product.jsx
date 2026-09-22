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
    FileText,
    Sparkles,
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
/* motion system (scoped, no extra dependencies)                         */
/* -------------------------------------------------------------------- */

const MOTION_CSS = `
@keyframes pd-fade-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes pd-scale-in { from { opacity: 0; transform: scale(.965); } to { opacity: 1; transform: none; } }
@keyframes pd-slide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes pd-pop { 0% { transform: scale(1); } 40% { transform: scale(1.3); } 100% { transform: scale(1); } }
@keyframes pd-shimmer { 100% { transform: translateX(100%); } }
@keyframes pd-ping { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(2.6); opacity: 0; } }
@keyframes pd-star { from { opacity: 0; transform: scale(.3) rotate(-45deg); } to { opacity: 1; transform: none; } }
@keyframes pd-bar { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
@keyframes pd-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }

.pd-up { opacity: 0; animation: pd-fade-up .75s cubic-bezier(.2,.7,.2,1) forwards; animation-delay: var(--d, 0ms); }
.pd-scale { opacity: 0; animation: pd-scale-in .8s cubic-bezier(.2,.7,.2,1) forwards; animation-delay: var(--d, 0ms); }
.pd-slide { animation: pd-slide .35s ease both; }
.pd-pop { animation: pd-pop .3s ease; }
.pd-float { animation: pd-float 3.2s ease-in-out infinite; }

.pd-reveal { opacity: 0; transform: translateY(24px); transition: opacity .7s ease, transform .7s cubic-bezier(.2,.7,.2,1); transition-delay: var(--d, 0ms); }
.pd-reveal.pd-in { opacity: 1; transform: none; }

.pd-shimmer { position: relative; overflow: hidden; }
.pd-shimmer::after { content: ''; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent); animation: pd-shimmer 1.5s infinite; }

.pd-shine { position: relative; overflow: hidden; }
.pd-shine::before { content: ''; position: absolute; top: 0; left: -80%; width: 45%; height: 100%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.4), transparent); transform: skewX(-20deg); transition: left .8s ease; pointer-events: none; }
.pd-shine:hover::before { left: 130%; }

.pd-bar { background-image: linear-gradient(90deg, #4f46e5, #818cf8, #6366f1, #4f46e5); background-size: 200% 100%; animation: pd-bar 6s linear infinite; }

.pd-zoom img { transition: transform .6s cubic-bezier(.2,.7,.2,1); will-change: transform; }
@media (hover: hover) {
  .pd-zoom { cursor: zoom-in; }
  .pd-zoom:hover img { transform: scale(1.85); }
}

.pd-line { transform: scaleX(0); transform-origin: left; transition: transform 1.3s cubic-bezier(.2,.7,.2,1) .35s; }
.pd-in .pd-line { transform: scaleX(1); }
.pd-node { transform: scale(0); transition: transform .5s cubic-bezier(.3,1.6,.5,1); transition-delay: var(--d, 0ms); }
.pd-in .pd-node { transform: scale(1); }

.pd-scroll { scrollbar-width: thin; scrollbar-color: rgba(120,113,108,.5) transparent; }
.pd-scroll::-webkit-scrollbar { width: 6px; }
.pd-scroll::-webkit-scrollbar-thumb { background: rgba(120,113,108,.45); border-radius: 9999px; }

@media (prefers-reduced-motion: reduce) {
  .pd-up, .pd-scale { animation: none; opacity: 1; }
  .pd-reveal { opacity: 1; transform: none; transition: none; }
  .pd-shimmer::after, .pd-bar, .pd-float, .pd-slide, .pd-pop { animation: none; }
  .pd-line, .pd-node { transform: none; transition: none; }
  .pd-zoom:hover img { transform: none; }
}
`;

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

function formatShortDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    if (r >= 5) return { bar: 'bg-emerald-500', ring: 'ring-emerald-200 dark:ring-emerald-500/30', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400' };
    if (r === 4) return { bar: 'bg-sky-500', ring: 'ring-sky-200 dark:ring-sky-500/30', bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400' };
    if (r === 3) return { bar: 'bg-amber-500', ring: 'ring-amber-200 dark:ring-amber-500/30', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400' };
    if (r === 2) return { bar: 'bg-orange-500', ring: 'ring-orange-200 dark:ring-orange-500/30', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400' };
    return { bar: 'bg-rose-500', ring: 'ring-rose-200 dark:ring-rose-500/30', bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400' };
}

// Eases a number up from 0 to `target` (used for the big average rating).
function useCountUp(target, duration = 900) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        const end = Number(target) || 0;
        let raf;
        let start;
        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            setValue(end * (1 - Math.pow(1 - p, 3)));
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);
    return value;
}

// Fades + slides its children in the first time they scroll into view.
function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
    const ref = useRef(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (typeof IntersectionObserver === 'undefined') {
            setShown(true);
            return;
        }
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShown(true);
                    io.disconnect();
                }
            },
            { threshold: 0.12 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <Tag
            ref={ref}
            style={{ '--d': `${delay}ms` }}
            className={`pd-reveal ${shown ? 'pd-in' : ''} ${className}`}
        >
            {children}
        </Tag>
    );
}

// NOTE: fixed the nested-button hydration error here. Previously this
// always rendered <button disabled> for read-only stars, but StarRow gets
// used inside other <button> elements (e.g. the rating trigger in the buy
// panel), and <button> cannot contain <button> — invalid HTML, React
// hydration error. Non-interactive mode now renders <span>, only
// interactive mode renders <button>.
function StarRow({ value, size = 16, interactive = false, onPick, onHover, onLeave }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => {
                const filled = value >= star;
                const half = !filled && value > star - 1;
                const starEl = (
                    <Star
                        size={size}
                        style={
                            interactive
                                ? undefined
                                : { animation: 'pd-star .45s cubic-bezier(.3,1.6,.5,1) both', animationDelay: `${star * 70}ms` }
                        }
                        className={filled || half ? 'fill-amber-400 text-amber-400' : 'text-stone-300 dark:text-stone-600'}
                    />
                );

                if (!interactive) {
                    return (
                        <span key={star} className="cursor-default p-0.5">
                            {starEl}
                        </span>
                    );
                }

                return (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onPick(star)}
                        onMouseEnter={() => onHover(star)}
                        onMouseLeave={onLeave}
                        className="rounded p-0.5 transition-transform duration-150 hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                        {starEl}
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

    // ---- panel tabs + sticky mobile bar ----
    const [tab, setTab] = useState('about');
    const [showSticky, setShowSticky] = useState(false);
    const buyRef = useRef(null);

    // ---- variant rail: drag-to-reorder + scroll ----
    const [orderedSiblings, setOrderedSiblings] = useState([]);
    const draggedIndexRef = useRef(null);
    const trackRef = useRef(null);
    const reviewsSectionRef = useRef(null);

    // ---- image zoom origin ----
    const [zoomOrigin, setZoomOrigin] = useState('50% 50%');

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

    const animatedAverage = useCountUp(reviewStats?.average || 0);

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
        setTab('about');
    }, [slug]);

    // the "Added to cart" confirmation fades away on its own
    useEffect(() => {
        if (!orderMessage) return;
        const t = setTimeout(() => setOrderMessage(null), 3500);
        return () => clearTimeout(t);
    }, [orderMessage]);

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

    // Show the compact mobile buy bar once the main buy buttons scroll away.
    useEffect(() => {
        const el = buyRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') {
            setShowSticky(false);
            return;
        }
        const io = new IntersectionObserver(
            ([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0),
            { threshold: 0 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [loading, editing, product?.['$id'], product?.status]);

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

    function openReviewForm() {
        setShowForm(true);
        scrollToReviews();
    }

    function scrollTrack(direction) {
        trackRef.current?.scrollBy({ left: direction * 180, behavior: 'smooth' });
    }

    function handleImageMove(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setZoomOrigin(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
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

    /* ---------------------------------------------------------------- */
    /* loading / error states                                            */
    /* ---------------------------------------------------------------- */

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                <style>{MOTION_CSS}</style>
                <div className="pd-shimmer mb-8 h-3 w-48 rounded-full bg-stone-200 dark:bg-stone-800" />
                <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
                    <div className="pd-shimmer aspect-[4/3] w-full rounded-2xl bg-stone-200 dark:bg-stone-800" />
                    <div className="space-y-4">
                        <div className="pd-shimmer h-3 w-28 rounded-full bg-stone-200 dark:bg-stone-800" />
                        <div className="pd-shimmer h-9 w-3/4 rounded-lg bg-stone-200 dark:bg-stone-800" />
                        <div className="pd-shimmer h-4 w-1/3 rounded-full bg-stone-200 dark:bg-stone-800" />
                        <div className="pd-shimmer h-10 w-1/3 rounded-lg bg-stone-200 dark:bg-stone-800" />
                        <div className="pd-shimmer h-12 w-full rounded-xl bg-stone-200 dark:bg-stone-800" />
                        <div className="pd-shimmer h-40 w-full rounded-xl bg-stone-200 dark:bg-stone-800" />
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

    /* ---------------------------------------------------------------- */
    /* derived values                                                    */
    /* ---------------------------------------------------------------- */

    const inStock = product.status === true;
    const variantStrip = [product, ...orderedSiblings];
    const hasMoreReviews = reviewItems.length < reviewTotal;
    const keywordList = parseKeywords(product.keywords);
    const deliveryDate = product.deliveryDuration != null ? getEstimatedDeliveryDate(product.deliveryDuration) : null;
    const today = new Date();
    const justAdded = Boolean(orderMessage);
    const totalPrice = Number(product.price) * qty;

    const tabs = [
        { id: 'about', label: 'About', icon: FileText, count: null },
        { id: 'reviews', label: 'Reviews', icon: MessageSquareText, count: reviewStats?.count || 0 },
        { id: 'tags', label: 'Tags', icon: Tags, count: keywordList.length },
    ];
    const tabIndex = Math.max(0, tabs.findIndex((t) => t.id === tab));

    return (
        <div className="relative mx-auto max-w-6xl px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:px-8 lg:pb-10">
            <style>{MOTION_CSS}</style>

            {/* faint dotted texture that fades out downwards */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 text-stone-300 opacity-60 dark:text-stone-700 dark:opacity-40"
                style={{
                    backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
                    backgroundSize: '22px 22px',
                    WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
                    maskImage: 'linear-gradient(to bottom, black, transparent)',
                }}
            />

            {/* breadcrumb */}
            <nav className="pd-up mb-6 flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                <Link to="/products" className="transition-colors hover:text-indigo-700 dark:hover:text-indigo-400">
                    Products
                </Link>
                <ChevronRight size={12} className="text-stone-300 dark:text-stone-700" />
                <Link
                    to={`/products?category=${encodeURIComponent(product.category)}`}
                    className="transition-colors hover:text-indigo-700 dark:hover:text-indigo-400"
                >
                    {product.category}
                </Link>
                <ChevronRight size={12} className="text-stone-300 dark:text-stone-700" />
                <span className="text-stone-700 dark:text-stone-300">{product.group}</span>
            </nav>

            {isAdmin && !editing && (
                <div className="pd-up mb-6 inline-flex flex-wrap items-center gap-3 rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-xs backdrop-blur dark:border-stone-800 dark:bg-stone-900/80">
                    <span className="inline-flex items-center gap-1 font-semibold text-stone-400 dark:text-stone-500">
                        <Sparkles size={12} /> Admin
                    </span>
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
                    {/* ============ hero: gallery + buy panel ============ */}
                    <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
                        {/* ---------- left: image + variant rail ----------
                            min-w-0 is required here: CSS grid items default to
                            min-width:auto, so without it a large intrinsic image
                            size can force this "1fr" track to grow past its
                            track size instead of respecting w-full/aspect-[4/3]
                            on the <img> below. This was the cause of the image
                            rendering hugely oversized and breaking the hero
                            layout. */}
                        <div className="min-w-0">
                            <div
                                className="pd-zoom group relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 shadow-sm dark:border-stone-800 dark:bg-stone-900"
                                onMouseMove={handleImageMove}
                                style={{ '--d': '60ms' }}
                            >
                                {product.fileId ? (
                                    <img
                                        src={service.getImagePreview({ fileId: product.fileId })}
                                        alt={product.name}
                                        style={{ transformOrigin: zoomOrigin }}
                                        className="block aspect-[4/3] w-full max-w-full object-cover"
                                    />
                                ) : (
                                    <div className="aspect-[4/3] w-full bg-stone-100 dark:bg-stone-800" />
                                )}

                                {/* stock badge with live pulse */}
                                <span
                                    className={`absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-md ${
                                        inStock ? 'bg-emerald-600' : 'bg-rose-600'
                                    }`}
                                >
                                    {inStock ? (
                                        <span className="relative flex h-2 w-2">
                                            <span
                                                className="absolute inline-flex h-full w-full rounded-full bg-white"
                                                style={{ animation: 'pd-ping 1.6s ease-out infinite' }}
                                            />
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                                        </span>
                                    ) : (
                                        <X size={12} />
                                    )}
                                    {inStock ? 'In stock' : 'Out of stock'}
                                </span>

                                {/* glass caption */}
                                <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-xl border border-white/40 bg-white/70 px-4 py-2.5 text-xs backdrop-blur-md transition-transform duration-500 group-hover:translate-y-[140%] dark:border-white/10 dark:bg-stone-900/70">
                                    <span className="truncate font-semibold text-stone-900 dark:text-stone-100">{product.name}</span>
                                    <span className="shrink-0 font-medium text-stone-500 dark:text-stone-400">{product.group}</span>
                                </div>
                            </div>

                            {/* variant rail */}
                            {variantStrip.length > 1 && (
                                <div className="pd-up mt-5" style={{ '--d': '220ms' }}>
                                    <div className="mb-3 flex items-center justify-between">
                                        <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                                            Other options in {product.group}
                                        </h2>
                                        <div className="flex gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => scrollTrack(-1)}
                                                aria-label="Scroll left"
                                                className="rounded-full border border-stone-200 p-1.5 text-stone-500 transition-all hover:-translate-x-0.5 hover:border-indigo-300 hover:text-indigo-700 dark:border-stone-700 dark:text-stone-400 dark:hover:text-indigo-400"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => scrollTrack(1)}
                                                aria-label="Scroll right"
                                                className="rounded-full border border-stone-200 p-1.5 text-stone-500 transition-all hover:translate-x-0.5 hover:border-indigo-300 hover:text-indigo-700 dark:border-stone-700 dark:text-stone-400 dark:hover:text-indigo-400"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div
                                        ref={trackRef}
                                        className="flex gap-3 overflow-x-auto scroll-smooth px-1 pb-2 pt-1 [&::-webkit-scrollbar]:hidden"
                                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                    >
                                        {variantStrip.map((p, idx) => {
                                            const isCurrent = p['$id'] === product['$id'];
                                            const card = (
                                                <div className="w-24 shrink-0 sm:w-28">
                                                    <div
                                                        className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                                                            isCurrent
                                                                ? 'border-indigo-600 shadow-md shadow-indigo-600/20 dark:border-indigo-500'
                                                                : 'border-stone-200 group-hover/v:-translate-y-1 group-hover/v:border-indigo-300 group-hover/v:shadow-md dark:border-stone-800 dark:group-hover/v:border-indigo-500/60'
                                                        }`}
                                                    >
                                                        {p.fileId ? (
                                                            <img
                                                                src={service.getImagePreview({ fileId: p.fileId })}
                                                                alt={p.name}
                                                                draggable={false}
                                                                className="block h-full w-full max-w-full object-cover transition-transform duration-500 group-hover/v:scale-110"
                                                            />
                                                        ) : (
                                                            <div className="h-full w-full bg-stone-100 dark:bg-stone-800" />
                                                        )}
                                                        {isCurrent && (
                                                            <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow dark:bg-indigo-500">
                                                                <Check size={11} />
                                                            </span>
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
                                                    <div key={p['$id']} className="group/v cursor-default">
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
                                                    className="group/v cursor-grab active:cursor-grabbing"
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
                        </div>

                        {/* ---------- right: buy panel ---------- */}
                        <div className="pd-up lg:sticky lg:top-24" style={{ '--d': '140ms' }}>
                            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/30">
                                <div className="pd-bar h-1.5 w-full" />

                                <div className="p-5 sm:p-6">
                                    {/* eyebrow chips */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                                            {product.category}
                                        </span>
                                        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                                            {product.group}
                                        </span>
                                    </div>

                                    <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-stone-900 dark:text-stone-100 sm:text-[28px]">
                                        {product.name}
                                    </h1>

                                    <button
                                        type="button"
                                        onClick={scrollToReviews}
                                        className="mt-2 inline-flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-indigo-700 dark:text-stone-400 dark:hover:text-indigo-400"
                                    >
                                        <StarRow value={reviewStats.average} size={14} />
                                        <span>
                                            {reviewStats.count > 0
                                                ? `${reviewStats.average.toFixed(1)} (${reviewStats.count} review${reviewStats.count === 1 ? '' : 's'})`
                                                : 'No reviews yet'}
                                        </span>
                                    </button>

                                    {/* price */}
                                    <div className="mt-4 flex items-end justify-between gap-3">
                                        <p className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
                                            {formatPKR(product.price)}
                                        </p>
                                        {qty > 1 && Number.isFinite(totalPrice) && (
                                            <p key={qty} className="pd-pop pb-1 text-sm font-medium text-stone-500 dark:text-stone-400">
                                                Total <span className="font-bold text-indigo-700 dark:text-indigo-400">{formatPKR(totalPrice)}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* buy controls */}
                                    <div ref={buyRef} className="mt-5">
                                        {inStock ? (
                                            <>
                                                <div className="flex items-center gap-3">
                                                    <div className="inline-flex items-center rounded-xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/60">
                                                        <button
                                                            type="button"
                                                            onClick={() => setQty((q) => Math.max(1, q - 1))}
                                                            aria-label="Decrease quantity"
                                                            className="flex h-11 w-10 items-center justify-center rounded-l-xl text-stone-600 transition-colors hover:bg-stone-100 active:scale-90 dark:text-stone-300 dark:hover:bg-stone-800"
                                                        >
                                                            <Minus size={15} />
                                                        </button>
                                                        <span
                                                            key={qty}
                                                            className="pd-pop w-8 text-center text-sm font-bold text-stone-900 dark:text-stone-100"
                                                        >
                                                            {qty}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setQty((q) => q + 1)}
                                                            aria-label="Increase quantity"
                                                            className="flex h-11 w-10 items-center justify-center rounded-r-xl text-stone-600 transition-colors hover:bg-stone-100 active:scale-90 dark:text-stone-300 dark:hover:bg-stone-800"
                                                        >
                                                            <Plus size={15} />
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={handleAddToCart}
                                                        disabled={adding}
                                                        title="Add to cart"
                                                        aria-label="Add to cart"
                                                        className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                                                            justAdded
                                                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                                : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-400 dark:hover:bg-indigo-500/10'
                                                        }`}
                                                    >
                                                        {justAdded ? <Check size={16} /> : <ShoppingCart size={16} />}
                                                        {justAdded ? 'Added' : adding ? 'Adding…' : 'Add to cart'}
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={handleOrderNow}
                                                    disabled={ordering}
                                                    className="pd-shine mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/30 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                                                >
                                                    <Zap size={16} />
                                                    {ordering ? 'Preparing checkout…' : 'Order now'}
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={handleRequestRestock}
                                                className="pd-shine w-full rounded-xl bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-stone-800 active:translate-y-0 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
                                            >
                                                Notify me when back in stock
                                            </button>
                                        )}

                                        {orderMessage && (
                                            <p className="pd-slide mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                                <PackageCheck size={15} />
                                                {orderMessage}
                                            </p>
                                        )}
                                    </div>

                                    {/* ---- tabbed info: description / reviews / tags ---- */}
                                    <div className="mt-6">
                                        <div className="relative grid grid-cols-3 rounded-xl bg-stone-100 p-1 dark:bg-stone-800/70" role="tablist">
                                            <span
                                                aria-hidden="true"
                                                className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out dark:bg-stone-700"
                                                style={{ transform: `translateX(${tabIndex * 100}%)` }}
                                            />
                                            {tabs.map(({ id, label, icon: Icon, count }) => (
                                                <button
                                                    key={id}
                                                    type="button"
                                                    role="tab"
                                                    aria-selected={tab === id}
                                                    onClick={() => setTab(id)}
                                                    className={`relative z-10 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                                                        tab === id
                                                            ? 'text-indigo-700 dark:text-indigo-300'
                                                            : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
                                                    }`}
                                                >
                                                    <Icon size={13} />
                                                    {label}
                                                    {count > 0 && (
                                                        <span className="rounded-full bg-stone-200 px-1.5 text-[10px] font-bold text-stone-600 dark:bg-stone-600 dark:text-stone-100">
                                                            {count}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        <div key={tab} className="pd-slide pd-scroll mt-4 max-h-64 overflow-y-auto pr-1">
                                            {tab === 'about' && (
                                                <div>
                                                    {product.description ? (
                                                        <p className="whitespace-pre-line text-sm leading-6 text-stone-600 dark:text-stone-300">
                                                            {product.description}
                                                        </p>
                                                    ) : (
                                                        <p className="text-sm text-stone-400 dark:text-stone-500">No description provided yet.</p>
                                                    )}
                                                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
                                                        {product.deliveryDuration != null && (
                                                            <span className="inline-flex items-center gap-1.5">
                                                                <Truck size={13} className="text-blue-600 dark:text-blue-400" />
                                                                Delivery in {product.deliveryDuration} day{Number(product.deliveryDuration) === 1 ? '' : 's'}
                                                            </span>
                                                        )}
                                                        {product.sellerLocation && (
                                                            <span className="inline-flex items-center gap-1.5">
                                                                <MapPin size={13} className="text-violet-600 dark:text-violet-400" />
                                                                Ships from {product.sellerLocation}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {tab === 'reviews' && (
                                                <div>
                                                    {reviewItems.length > 0 ? (
                                                        <ul className="space-y-3">
                                                            {reviewItems.slice(0, 3).map((r) => {
                                                                const accent = ratingAccent(r.rating);
                                                                return (
                                                                    <li
                                                                        key={r['$id']}
                                                                        className="relative overflow-hidden rounded-lg border border-stone-100 bg-stone-50/70 py-2.5 pl-4 pr-3 dark:border-stone-800 dark:bg-stone-800/40"
                                                                    >
                                                                        <span className={`absolute inset-y-0 left-0 w-1 ${accent.bar}`} />
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <p className="truncate text-xs font-semibold text-stone-900 dark:text-stone-100">
                                                                                {r.reviewerName || 'Anonymous'}
                                                                            </p>
                                                                            <StarRow value={r.rating} size={11} />
                                                                        </div>
                                                                        {r.comment && (
                                                                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-600 dark:text-stone-300">
                                                                                {r.comment}
                                                                            </p>
                                                                        )}
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-sm text-stone-500 dark:text-stone-400">
                                                            No reviews yet — be the first to share what you think.
                                                        </p>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={reviewItems.length > 0 ? scrollToReviews : openReviewForm}
                                                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 transition-colors hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                    >
                                                        {reviewItems.length > 0 ? `Read all ${reviewStats.count || reviewItems.length} reviews` : 'Write a review'}
                                                        <ChevronRight size={13} />
                                                    </button>
                                                </div>
                                            )}

                                            {tab === 'tags' && (
                                                <div>
                                                    {keywordList.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {keywordList.map((keyword, i) => (
                                                                <span
                                                                    key={keyword}
                                                                    style={{ animation: 'pd-fade-up .45s ease both', animationDelay: `${i * 60}ms` }}
                                                                    className="cursor-default rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 transition-all hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                                                                >
                                                                    #{keyword}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-stone-400 dark:text-stone-500">This product hasn't been tagged yet.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ============ delivery timeline + ships from ============ */}
                    <Reveal className="mt-12">
                        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                            {/* delivery timeline — ⚠️ product.deliveryDuration is a day count (1, 2, 3…) */}
                            <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                                        <Truck size={16} className="pd-float" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                                            {product.deliveryDuration != null
                                                ? `Delivery in ${product.deliveryDuration} day${Number(product.deliveryDuration) === 1 ? '' : 's'}`
                                                : 'Delivery estimate unavailable'}
                                        </p>
                                        {deliveryDate && (
                                            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                                                Order now to receive it by{' '}
                                                <span className="font-medium text-stone-700 dark:text-stone-300">
                                                    {formatDeliveryDate(deliveryDate)}
                                                </span>
                                                .
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {deliveryDate && (
                                    <div className="mt-6 px-2">
                                        <div className="relative">
                                            <div className="absolute left-0 right-0 top-[7px] h-0.5 rounded-full bg-stone-200 dark:bg-stone-700" />
                                            <div className="pd-line absolute left-0 right-0 top-[7px] h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-500" />
                                            <div className="relative flex items-start justify-between">
                                                {[
                                                    { label: 'Order placed', sub: formatShortDate(today), delay: 100 },
                                                    { label: 'On the way', sub: 'In transit', delay: 700 },
                                                    { label: 'Arrives', sub: formatShortDate(deliveryDate), delay: 1300 },
                                                ].map((step, i) => (
                                                    <div
                                                        key={step.label}
                                                        className={`flex w-24 flex-col ${i === 0 ? 'items-start' : i === 2 ? 'items-end' : 'items-center'}`}
                                                    >
                                                        <span
                                                            className="pd-node flex h-4 w-4 items-center justify-center rounded-full border-2 border-indigo-600 bg-white dark:border-indigo-500 dark:bg-stone-900"
                                                            style={{ '--d': `${step.delay}ms` }}
                                                        >
                                                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-500" />
                                                        </span>
                                                        <p className={`mt-2 text-xs font-semibold text-stone-900 dark:text-stone-100 ${i === 0 ? 'text-left' : i === 2 ? 'text-right' : 'text-center'}`}>
                                                            {step.label}
                                                        </p>
                                                        <p className={`text-xs text-stone-500 dark:text-stone-400 ${i === 0 ? 'text-left' : i === 2 ? 'text-right' : 'text-center'}`}>
                                                            {step.sub}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* seller location — ⚠️ pick whichever field name matches your schema, defaulting to product.sellerLocation */}
                            <div className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 sm:p-6">
                                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 transition-transform duration-300 group-hover:scale-110 dark:bg-violet-500/15 dark:text-violet-400">
                                    <MapPin size={16} />
                                </span>
                                <div className="mt-6">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">Ships from</p>
                                    <p className="mt-1 text-lg font-bold text-stone-900 dark:text-stone-100">
                                        {product.sellerLocation || 'Not specified'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Reveal>

                    {/* ============ reviews ============ */}
                    <section ref={reviewsSectionRef} className="mt-16 scroll-mt-24">
                        <Reveal>
                            <div className="mb-8 flex items-end justify-between gap-4">
                                <div>
                                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                        <MessageSquareText size={14} /> Reviews
                                    </p>
                                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                                        What customers say
                                    </h2>
                                </div>
                            </div>
                        </Reveal>

                        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
                            {/* summary */}
                            <Reveal delay={80}>
                                <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center dark:border-stone-800 dark:bg-stone-900 lg:sticky lg:top-24">
                                    <p className="text-6xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
                                        {reviewStats.count > 0 ? animatedAverage.toFixed(1) : '—'}
                                    </p>
                                    <div className="mt-3 flex justify-center">
                                        <StarRow value={reviewStats.average} size={17} />
                                    </div>
                                    <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                                        {reviewStats.count > 0
                                            ? `Based on ${reviewStats.count} review${reviewStats.count === 1 ? '' : 's'}`
                                            : 'No reviews yet'}
                                    </p>
                                    {!showForm && (
                                        <button
                                            onClick={() => setShowForm(true)}
                                            className="pd-shine mt-5 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 active:translate-y-0 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                                        >
                                            Write a review
                                        </button>
                                    )}
                                </div>
                            </Reveal>

                            {/* list + form */}
                            <div className="min-w-0">
                                {fetchStatus === 'loading' && reviewItems.length === 0 ? (
                                    <div className="space-y-4">
                                        {[0, 1].map((i) => (
                                            <div key={i} className="pd-shimmer space-y-2 rounded-xl border border-stone-200 p-4 dark:border-stone-800">
                                                <div className="h-4 w-24 rounded bg-stone-200 dark:bg-stone-800" />
                                                <div className="h-3 w-full rounded bg-stone-200 dark:bg-stone-800" />
                                            </div>
                                        ))}
                                    </div>
                                ) : reviewItems.length > 0 ? (
                                    <ul className="space-y-3">
                                        {reviewItems.map((r, i) => {
                                            const accent = ratingAccent(r.rating);
                                            return (
                                                <Reveal as="li" key={r['$id']} delay={Math.min(i, 4) * 70}>
                                                    <div className="group relative flex gap-4 overflow-hidden rounded-xl border border-stone-200 bg-white p-4 pl-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                                                        <span className={`absolute inset-y-0 left-0 w-1 ${accent.bar} transition-all duration-300 group-hover:w-1.5`} />
                                                        <div
                                                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ring-2 transition-transform duration-300 group-hover:scale-110 ${accent.bg} ${accent.ring} ${accent.text}`}
                                                        >
                                                            {r.reviewerName && r.reviewerName !== 'Anonymous' ? (
                                                                <span className="text-sm font-bold">{r.reviewerName.charAt(0).toUpperCase()}</span>
                                                            ) : (
                                                                <UserRound size={16} />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                                                                    {r.reviewerName || 'Anonymous'}
                                                                </p>
                                                                <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">
                                                                    {timeAgo(r['$createdAt'])}
                                                                </span>
                                                            </div>
                                                            <div className="mt-0.5">
                                                                <StarRow value={r.rating} size={13} />
                                                            </div>
                                                            {r.comment && (
                                                                <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
                                                                    {r.comment}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Reveal>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="rounded-xl border border-dashed border-stone-300 px-4 py-10 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
                                        No reviews yet — be the first to share what you think.
                                    </p>
                                )}

                                {hasMoreReviews && (
                                    <button
                                        onClick={handleLoadMoreReviews}
                                        disabled={loadingMore}
                                        className="mt-4 w-full rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-900 transition-all hover:-translate-y-0.5 hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:text-stone-100 dark:hover:border-indigo-500"
                                    >
                                        {loadingMore ? 'Loading…' : `Load more reviews (${reviewTotal - reviewItems.length} more)`}
                                    </button>
                                )}

                                {(showForm || reviewItems.length === 0) && (
                                    <form
                                        onSubmit={handleSubmitReview}
                                        className="pd-slide mt-6 space-y-4 rounded-2xl border border-stone-200 border-l-4 border-l-indigo-600 bg-white p-5 dark:border-stone-800 dark:border-l-indigo-500 dark:bg-stone-900"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">Write a review</h3>
                                            {showForm && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowForm(false)}
                                                    className="text-xs text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-200"
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
                                                size={26}
                                                interactive
                                                onPick={setReviewRating}
                                                onHover={setHoverRating}
                                                onLeave={() => setHoverRating(0)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-4 rounded-xl bg-stone-50 px-4 py-3 dark:bg-stone-800/60">
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
                                                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 transition-shadow placeholder:text-stone-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                                            />
                                        </div>

                                        {reviewFormError && <p className="pd-slide text-xs text-rose-600 dark:text-rose-400">{reviewFormError}</p>}
                                        {submitStatus === 'succeeded' && (
                                            <p className="pd-slide rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                                Thank you — your review has been submitted.
                                            </p>
                                        )}
                                        {submitStatus === 'failed' && (
                                            <p className="pd-slide rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                                                {reviewError || 'Something went wrong. Please try again.'}
                                            </p>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={submitStatus === 'loading'}
                                            className="pd-shine w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-indigo-700 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600 sm:w-auto"
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

                    {/* ============ sticky mobile buy bar ============ */}
                    <div
                        aria-hidden={!showSticky}
                        className={`fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/90 px-4 pt-3 backdrop-blur-md transition-transform duration-300 dark:border-stone-800 dark:bg-stone-900/90 lg:hidden ${
                            showSticky ? 'translate-y-0' : 'translate-y-full'
                        }`}
                        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
                    >
                        <div className="mx-auto flex max-w-6xl items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs text-stone-500 dark:text-stone-400">{product.name}</p>
                                <p className="text-lg font-extrabold text-stone-900 dark:text-stone-100">{formatPKR(product.price)}</p>
                            </div>
                            {inStock ? (
                                <>
                                    <button
                                        onClick={handleAddToCart}
                                        disabled={adding || !showSticky}
                                        tabIndex={showSticky ? 0 : -1}
                                        aria-label="Add to cart"
                                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-200 text-indigo-700 transition-all active:scale-95 disabled:opacity-50 dark:border-indigo-500/30 dark:text-indigo-400"
                                    >
                                        {justAdded ? <Check size={18} /> : <ShoppingCart size={18} />}
                                    </button>
                                    <button
                                        onClick={handleOrderNow}
                                        disabled={ordering || !showSticky}
                                        tabIndex={showSticky ? 0 : -1}
                                        className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition-all active:scale-95 disabled:opacity-50 dark:bg-indigo-500"
                                    >
                                        <Zap size={15} />
                                        Order now
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleRequestRestock}
                                    tabIndex={showSticky ? 0 : -1}
                                    className="h-11 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white dark:bg-white dark:text-stone-900"
                                >
                                    Notify me
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default Product;