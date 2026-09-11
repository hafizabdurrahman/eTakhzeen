import React from 'react';
import { Link, useNavigate } from 'react-router';
import { useDispatch } from 'react-redux';
import { ShoppingCart, Zap } from 'lucide-react';
import service from '../../backend/service'; // ⚠️ adjust path
import { formatPKR } from '../../utils/formatPrice'; // ⚠️ adjust path
import { addToCart } from '../../store/slices/cartSlice'; // ⚠️ adjust path + action name to match your cart slice

function ProductCard({ product }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    if (!product) return null;

    const inStock = product.status === true;
    const productUrl = `/products/${product.category}/${product.group}/${product.slug}`;

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dispatch(addToCart({ productId: product['$id'], quantity: 1 })); // ⚠️ adjust payload shape
    };

    const handleOrderNow = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dispatch(addToCart({ productId: product['$id'], quantity: 1 })); // ⚠️ adjust to match your buy-now flow
        navigate('/checkout');
    };

    return (
        <Link
            to={productUrl}
            className="group flex flex-col overflow-hidden rounded-lg border border-stone-200 bg-cream shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-brand-500"
        >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
                {product.fileId ? (
                    <img
                        src={service.getImagePreview({ fileId: product.fileId })}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="h-full w-full bg-stone-100 dark:bg-stone-800" />
                )}
                <span
                    className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        inStock
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                    }`}
                >
                    {inStock ? 'In stock' : 'Out of stock'}
                </span>
            </div>

            <div className="flex flex-1 flex-col p-4">
                <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {product.name}
                </p>
                <p className="mt-2 text-lg font-bold text-brand-700 dark:text-brand-500">
                    {formatPKR(product.price)}
                </p>

                <div className="mt-4 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={!inStock}
                        title="Add to cart"
                        aria-label="Add to cart"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-stone-100 px-3 py-2 text-xs font-medium text-stone-900 transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
                    >
                        <ShoppingCart size={14} />
                        Add to Cart
                    </button>
                    <button
                        type="button"
                        onClick={handleOrderNow}
                        disabled={!inStock}
                        title="Order now"
                        aria-label="Order now"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-xs font-medium text-white shadow-sm shadow-brand-600/20 transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
                    >
                        <Zap size={14} />
                        Order Now
                    </button>
                </div>
            </div>
        </Link>
    );
}

export default ProductCard;