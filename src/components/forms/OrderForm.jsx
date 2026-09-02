import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router';
import authService from '../../backend/auth'; // ⚠️ adjust path
import userService from '../../backend/user'; // ⚠️ adjust path
import orderService from '../../backend/order'; // ⚠️ adjust path
import service from '../../backend/service'; // ⚠️ adjust path — used for getImagePreview in the summary
import { login, signup } from '../../store/slices/userSlice'; // ⚠️ adjust path
import { clearCart, removeFromCart } from '../../store/slices/cartSlice'; // ⚠️ adjust path
import { formatPKR } from '../../utils/formatPrice'; // ⚠️ adjust path

const PAYMENT_METHODS = [
    { value: 'COD', label: 'Cash on Delivery' },
    { value: 'Advance', label: 'Advance Payment' },
];

// Reached via navigate('/checkout', { state: { items, mode } }) from either
// Product.jsx ("Order Now" — mode: 'single') or Cart.jsx ("Checkout" —
// mode: 'cart'). See order-handling-system.md for the full flow.
function OrderForm() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const userData = useSelector((s) => s.user.userData);
    const isLoggedIn = useSelector((s) => s.user.status);

    const items = location.state?.items;
    const mode = location.state?.mode || 'single';

    // Only asked of guests / new users — becomes the order's contact info too,
    // so a logged-in user isn't asked for the same details twice.
    const [authFields, setAuthFields] = useState({ username: '', name: '', email: '', phone: '', password: '' });

    // Only shown (and editable) for logged-in users. Prefilled from their
    // profile; changes here are snapshots for this order only.
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    // Shared by both flows. Prefilled from the profile if present, left
    // blank if not (e.g. a brand-new account with no address on file yet).
    const [address, setAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('COD');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isLoggedIn && userData) {
            setName(userData.name || '');
            setEmail(userData.email || '');
            setPhone(userData.phone || '');
            setAddress(userData.address || '');
        }
    }, [isLoggedIn, userData]);

    const total = useMemo(() => {
        if (!items) return 0;
        return items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);
    }, [items]);

    if (!items || items.length === 0) {
        return (
            <div>
                <p className="text-neutral-400 mb-3">No items selected for checkout.</p>
                <Link to="/cart" className="text-blue-400 hover:underline text-sm">Go to your cart</Link>
            </div>
        );
    }

    function handleAuthChange(e) {
        setAuthFields((f) => ({ ...f, [e.target.name]: e.target.value }));
    }

    // Resolves who's placing the order. If already logged in, returns the
    // existing profile untouched. Otherwise checks the user table by email
    // and either logs them in or creates a new account — without touching
    // the existing signup()/login() flows used anywhere else in the app.
    async function resolveCurrentUser() {
        if (isLoggedIn && userData?.['$id']) {
            // userData in the store may be the raw Appwrite Account object
            // rather than the profile table row — its $id is set to the
            // username by design (see auth.js signup()), not the row's real
            // $id, and it has no `username`/`address` columns at all. Always
            // re-fetch the actual profile row so we have the right id and
            // fields to work with. (This mismatch is why Add to Cart and
            // order placement fail with 404s / "missing username" — it's a
            // pre-existing issue in whatever dispatches userData on login,
            // not something specific to checkout.)
            const row = await userService.getProfile({ requesterId: userData['$id'] });
            if (!row) {
                throw new Error('Could not load your profile. Please log in again.');
            }
            return { row, isNewAccount: false };
        }

        const { username, name: n, email: em, phone: ph, password } = authFields;
        if (!username || !n || !em || !ph || !password) {
            throw new Error('Please fill in all account fields.');
        }

        const { row, isNewAccount } = await authService.loginOrSignup({ username, name: n, email: em, password, phone: ph });
        dispatch(isNewAccount ? signup(row) : login(row));
        return { row, isNewAccount };
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);

        if (!address.trim()) {
            setError('Please enter a delivery address.');
            return;
        }

        setSubmitting(true);
        try {
            const wasLoggedIn = isLoggedIn;
            const { row: currentUser } = await resolveCurrentUser();

            const contact = wasLoggedIn
                ? { name, email, phone }
                : { name: authFields.name, email: authFields.email, phone: authFields.phone };

            // Address is the ONLY profile field a checkout is allowed to
            // persist back to the user table.
            if (address.trim() !== (currentUser.address || '')) {
                await userService.updateUserAddress({ userId: currentUser['$id'], address: address.trim() });
            }

            const orderDetailsSnapshot = items.map((i) => ({
                productId: i.product['$id'],
                name: i.product.name,
                price: Number(i.product.price), // PKR
                quantity: i.quantity,
                fileId: i.product.fileId || null,
            }));

            const order = await orderService.createOrder({
                username: currentUser.username,
                email: contact.email,
                phone: contact.phone,
                name: contact.name,
                address: address.trim(),
                orderDetails: orderDetailsSnapshot,
                paymentMethod,
            });

            if (!order) {
                setError('Failed to place your order. Please try again.');
                setSubmitting(false);
                return;
            }

            // Only offer to clean up the cart when the items actually came
            // from it (a guest's single "Order Now" never touched the cart).
            const cameFromCart = mode === 'cart' || (mode === 'single' && wasLoggedIn);
            if (cameFromCart) {
                const remove = confirm('Order placed successfully! Remove these items from your cart?');
                if (remove) {
                    if (mode === 'cart') {
                        dispatch(clearCart({ userId: currentUser['$id'] }));
                    } else {
                        items.forEach((i) => {
                            dispatch(removeFromCart({ userId: currentUser['$id'], productId: i.product['$id'] }));
                        });
                    }
                }
            } else {
                alert('Order placed successfully!');
            }

            navigate(`/${currentUser.username}/orders`);
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="max-w-2xl">
            <h1 className="text-xl font-semibold mb-4">Checkout</h1>

            <div className="mb-6 border border-neutral-800 rounded-md p-3">
                <h2 className="text-sm font-medium text-neutral-400 mb-2">Order summary</h2>
                <div className="space-y-2">
                    {items.map((i) => (
                        <div key={i.product['$id']} className="flex items-center gap-3">
                            {i.product.fileId ? (
                                <img
                                    src={service.getImagePreview({ fileId: i.product.fileId })}
                                    alt={i.product.name}
                                    className="w-12 h-12 object-cover rounded"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded bg-neutral-800" />
                            )}
                            <div className="flex-1">
                                <p className="text-sm">{i.product.name}</p>
                                <p className="text-neutral-500 text-xs">
                                    {formatPKR(i.product.price)} × {i.quantity}
                                </p>
                            </div>
                            <p className="text-sm">{formatPKR(Number(i.product.price) * i.quantity)}</p>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between border-t border-neutral-800 mt-3 pt-2">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-sm font-medium">{formatPKR(total)}</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {!isLoggedIn && (
                    <div>
                        <h2 className="text-sm font-medium text-neutral-400 mb-2">Your account</h2>
                        <p className="text-xs text-neutral-500 mb-3">
                            Already have an account? Enter the same email and password and we'll log you in.
                            Otherwise, we'll create one for you automatically.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input name="username" placeholder="Username" value={authFields.username} onChange={handleAuthChange}
                                className="rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm" />
                            <input name="name" placeholder="Full name" value={authFields.name} onChange={handleAuthChange}
                                className="rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm" />
                            <input name="email" type="email" placeholder="Email" value={authFields.email} onChange={handleAuthChange}
                                className="rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm" />
                            <input name="phone" placeholder="Phone" value={authFields.phone} onChange={handleAuthChange}
                                className="rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm" />
                            <input name="password" type="password" placeholder="Password" value={authFields.password} onChange={handleAuthChange}
                                className="rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm sm:col-span-2" />
                        </div>
                    </div>
                )}

                {isLoggedIn && (
                    <div>
                        <h2 className="text-sm font-medium text-neutral-400 mb-2">Contact details for this order</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
                                className="rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm" />
                            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm" />
                            <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)}
                                className="rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm sm:col-span-2" />
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                            These are used for this order's receipt only — they won't change your saved account details.
                        </p>
                    </div>
                )}

                <div>
                    <h2 className="text-sm font-medium text-neutral-400 mb-2">Delivery address</h2>
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3}
                        placeholder="Street, city, postal code..."
                        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm" />
                </div>

                <div>
                    <h2 className="text-sm font-medium text-neutral-400 mb-2">Payment method</h2>
                    <div className="flex gap-4">
                        {PAYMENT_METHODS.map((pm) => (
                            <label key={pm.value} className="flex items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value={pm.value}
                                    checked={paymentMethod === pm.value}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                />
                                {pm.label}
                            </label>
                        ))}
                    </div>
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button type="submit" disabled={submitting}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50">
                    {submitting ? 'Placing order...' : `Place order — ${formatPKR(total)}`}
                </button>
            </form>
        </div>
    );
}

export default OrderForm;