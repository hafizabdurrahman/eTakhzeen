import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router';
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
        return <p className="text-neutral-400">Please log in to view your cart.</p>;
    }
    if (status === 'loading') {
        return <p className="text-neutral-400">Loading your cart...</p>;
    }
    if (items.length === 0) {
        return <p className="text-neutral-400">Your cart is empty.</p>;
    }

    return (
        <div>
            <h1 className="text-xl font-semibold mb-4">Your Cart</h1>

            <div className="space-y-3 mb-6">
                {items.map(({ product, quantity }) => (
                    <div key={product['$id']} className="flex items-center gap-3 border border-neutral-800 rounded-md p-2">
                        {product.fileId ? (
                            <img
                                src={service.getImagePreview({ fileId: product.fileId })}
                                alt={product.name}
                                className="w-16 h-16 object-cover rounded"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded bg-neutral-800" />
                        )}
                        <div className="flex-1">
                            <Link to={`/products/${product.category}/${product.group}/${product.slug}`} className="text-sm hover:underline">
                                {product.name}
                            </Link>
                            <p className="text-neutral-500 text-xs">{formatPKR(product.price)} each</p>
                        </div>
                        <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => handleQuantityChange(product['$id'], Math.max(1, Number(e.target.value) || 1))}
                            className="w-16 rounded-md bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-sm"
                        />
                        <p className="text-sm w-20 text-right">{formatPKR(Number(product.price) * quantity)}</p>
                        <button onClick={() => handleRemove(product['$id'])} className="text-red-400 text-sm hover:underline">
                            Remove
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
                <button onClick={handleClear} className="text-sm text-neutral-400 hover:underline">
                    Clear cart
                </button>
                <div className="text-right">
                    <p className="text-lg font-semibold mb-2">Total: {formatPKR(total)}</p>
                    <button
                        onClick={handleCheckout}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium"
                    >
                        Checkout
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Cart;