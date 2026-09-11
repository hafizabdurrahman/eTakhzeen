import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux'; // ⚠️ adjust path/usage if this admin app doesn't wire react-redux the same way as the storefront
import { X, Tag, Layers, Calendar, Link as LinkIcon, DollarSign, Package } from 'lucide-react';
import service from '../../backend/service';
import { HeatmapCalendar, GroupedBarChart } from '../../ui';
import { getOneProduct } from '../../store/slices/productSlice'; // ⚠️ adjust path to match where the store actually lives

const DAY_MS = 24 * 60 * 60 * 1000;

// Detailed read-only view of a single product. Opened from ProductList by
// clicking a row. `siblingProducts` (optional) is the current admin product
// list already loaded by AdminProducts — used to compute a group/category
// price comparison without an extra network round trip. All of the core
// product fields come straight from `product`, which is exactly the shape
// productSlice keeps for the currently-viewed product.
function ProductDetailModal({ product, siblingProducts = [], onClose }) {
    const dispatch = useDispatch();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(t);
    }, []);

    useEffect(() => {
        if (product) dispatch(getOneProduct(product));
    }, [product, dispatch]);

    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Escape') handleClose();
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleClose() {
        setVisible(false);
        setTimeout(onClose, 150); // let the fade-out play before unmounting
    }

    const createdAt = product?.['$createdAt'] ? new Date(product['$createdAt']) : null;

    const heatmapEntries = useMemo(() => {
        if (!createdAt) return [];
        return [{ date: createdAt, count: 1 }];
    }, [createdAt]);

    const heatmapWeeks = useMemo(() => {
        if (!createdAt) return 12;
        const weeksAgo = Math.ceil((Date.now() - createdAt.getTime()) / (7 * DAY_MS));
        return Math.min(52, Math.max(12, weeksAgo + 2));
    }, [createdAt]);

    const { groupAvg, categoryAvg, comparableCount } = useMemo(() => {
        if (!product) return { groupAvg: null, categoryAvg: null, comparableCount: 0 };
        const inGroup = siblingProducts.filter(
            (p) => p['$id'] !== product['$id'] && p.category === product.category && p.group === product.group
        );
        const inCategory = siblingProducts.filter(
            (p) => p['$id'] !== product['$id'] && p.category === product.category
        );
        const avg = (arr) => (arr.length ? arr.reduce((sum, p) => sum + Number(p.price || 0), 0) / arr.length : null);
        return {
            groupAvg: avg(inGroup),
            categoryAvg: avg(inCategory),
            comparableCount: inGroup.length,
        };
    }, [product, siblingProducts]);

    if (!product) return null;

    const priceBars = [{ name: 'This product', value: Number(product.price) || 0, color: '#0ea5e9' }];
    if (groupAvg !== null) priceBars.push({ name: 'Group average', value: Number(groupAvg.toFixed(2)), color: '#f97316' });
    if (categoryAvg !== null) priceBars.push({ name: 'Category average', value: Number(categoryAvg.toFixed(2)), color: '#8b5cf6' });

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 transition-opacity duration-150 ${
                visible ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={handleClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-2xl transition-all duration-150 dark:border-stone-800 dark:bg-stone-900 ${
                    visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
                }`}
            >
                {/* Header */}
                <div className="flex items-start gap-4 border-b border-stone-100 p-5 dark:border-stone-800">
                    {product.fileId ? (
                        <img
                            src={service.getImagePreview({ fileId: product.fileId })}
                            alt={product.name}
                            className="h-20 w-20 shrink-0 rounded-lg object-cover ring-1 ring-stone-200 dark:ring-stone-700"
                        />
                    ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800">
                            <Package size={24} className="text-stone-400 dark:text-stone-600" />
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg font-semibold text-stone-900 dark:text-stone-100">{product.name}</h2>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                                <Tag size={11} /> {product.category}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                                <Layers size={11} /> {product.group}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        aria-label="Close"
                        className="shrink-0 rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-6 p-5">
                    {/* Key facts */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <Fact icon={DollarSign} label="Price" value={`$${Number(product.price).toFixed(2)}`} />
                        <Fact icon={LinkIcon} label="Slug" value={product.slug} />
                        <Fact
                            icon={Calendar}
                            label="Added"
                            value={createdAt ? createdAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        />
                    </div>

                    {product.description && (
                        <div>
                            <h3 className="mb-1.5 text-sm font-medium text-stone-900 dark:text-stone-100">Description</h3>
                            <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">{product.description}</p>
                        </div>
                    )}

                    {/* When it was uploaded */}
                    {createdAt && (
                        <div>
                            <h3 className="mb-2 text-sm font-medium text-stone-900 dark:text-stone-100">Upload activity</h3>
                            <div className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
                                <HeatmapCalendar entries={heatmapEntries} weeks={heatmapWeeks} />
                            </div>
                        </div>
                    )}

                    {/* Price comparison */}
                    <div>
                        <h3 className="mb-2 text-sm font-medium text-stone-900 dark:text-stone-100">Price vs. similar products</h3>
                        {comparableCount > 0 ? (
                            <div className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
                                <GroupedBarChart
                                    items={[{ label: product.name, bars: priceBars }]}
                                    legend={priceBars.map((b) => ({ name: b.name, color: b.color }))}
                                />
                            </div>
                        ) : (
                            <p className="text-sm text-stone-500 dark:text-stone-400">
                                No other products in "{product.group}" yet to compare against.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Fact({ icon: Icon, label, value }) {
    return (
        <div className="rounded-lg border border-stone-200 px-3 py-2.5 dark:border-stone-800">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                <Icon size={12} />
                {label}
            </div>
            <p className="mt-0.5 truncate text-sm font-medium text-stone-900 dark:text-stone-100">{value}</p>
        </div>
    );
}

export default ProductDetailModal;