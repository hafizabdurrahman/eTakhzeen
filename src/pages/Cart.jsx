import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router';
import { Trash2, ShoppingCart } from 'lucide-react';
import {
    loadCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
} from '../store/slices/cartSlice'; // ⚠️ adjust path
import service from '../backend/service'; // ⚠️ adjust path (for getImagePreview)
import { formatPKR } from '../utils/formatPrice'; // ⚠️ adjust path

function Cart() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const userData = useSelector((s) => s.user.userData);
    const { items, status } = useSelector((s) => s.cart);

    useEffect(() => {
        if (userData?.['$id']) {
            dispatch(loadCart({ userId: userData['$id'] }));
        }
    }, [dispatch, userData]);

    const total = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);

    function handleQuantityChange(productId, quantity) {
        dispatch(updateCartQuantity({ userId: userData['$id'], productId, quantity }));
    }

    function handleRemove(productId) {
        dispatch(removeFromCart({ userId: userData['$id'], productId }));
    }

    function handleClear() {
        if (!confirm('Clear your entire cart?')) return;
        dispatch(clearCart({ userId: userData['$id'] }));
    }

    // Checkout details (address, payment method, account creation for
    // guests) all live in OrderForm now — Cart just hands off the items.
    function handleCheckout() {
        navigate('/checkout', { state: { items, mode: 'cart' } });
    }

    if (!userData) {
        return <p className="text-sm text-stone-500 dark:text-stone-400">Please log in to view your cart.</p>;
    }
    if (status === 'loading') {
        return <p className="text-sm text-stone-500 dark:text-stone-400">Loading your cart...</p>;
    }

    return (
        <div>
            <p className="text-sm font-semibold text-brand-600 dark:text-brand-500">Account overview</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Your Cart</h1>

            {items.length === 0 ? (
                <div className="mt-8 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-8 text-center dark:border-stone-700 dark:bg-stone-900">
                    <ShoppingCart size={22} className="mx-auto mb-2 text-stone-400 dark:text-stone-600" />
                    <p className="text-sm text-stone-500 dark:text-stone-400">Your cart is empty.</p>
                </div>
            ) : (
                <>
                    <div className="mb-6 mt-8 space-y-3">
                        {items.map(({ product, quantity }) => (
                            <div
                                key={product['$id']}
                                className="flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900"
                            >
                                {product.fileId ? (
                                    <img
                                        src={service.getImagePreview({ fileId: product.fileId })}
                                        alt={product.name}
                                        className="h-16 w-16 rounded-md object-cover ring-1 ring-stone-200 dark:ring-stone-700"
                                    />
                                ) : (
                                    <div className="h-16 w-16 rounded-md bg-stone-100 dark:bg-stone-800" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <Link
                                        to={`/products/${product.category}/${product.group}/${product.slug}`}
                                        className="text-sm font-medium text-stone-900 hover:text-brand-600 dark:text-stone-100 dark:hover:text-brand-500"
                                    >
                                        {product.name}
                                    </Link>
                                    <p className="text-xs text-stone-500 dark:text-stone-400">{formatPKR(product.price)} each</p>
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => handleQuantityChange(product['$id'], Math.max(1, Number(e.target.value) || 1))}
                                    className="w-16 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                                />
                                <p className="w-20 text-right text-sm font-semibold text-stone-900 dark:text-stone-100">
                                    {formatPKR(Number(product.price) * quantity)}
                                </p>
                                <button
                                    onClick={() => handleRemove(product['$id'])}
                                    title="Remove"
                                    aria-label={`Remove ${product.name}`}
                                    className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-stone-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-5 dark:border-stone-800">
                        <button
                            onClick={handleClear}
                            className="text-sm font-medium text-stone-500 hover:text-red-600 hover:underline dark:text-stone-400 dark:hover:text-red-400"
                        >
                            Clear cart
                        </button>
                        <div className="text-right">
                            <p className="mb-2 text-lg font-bold text-stone-900 dark:text-stone-100">Total: {formatPKR(total)}</p>
                            <button
                                onClick={handleCheckout}
                                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 dark:bg-brand-500 dark:hover:bg-brand-600 dark:focus:ring-brand-500 dark:focus:ring-offset-stone-950"
                            >
                                Checkout
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default Cart;