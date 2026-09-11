import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router';
import { User, MapPin, Truck, Wallet, Check, AlertCircle, ShoppingBag } from 'lucide-react';
import authService from '../../backend/auth'; // ⚠️ adjust path
import userService from '../../backend/user'; // ⚠️ adjust path
import orderService from '../../backend/order'; // ⚠️ adjust path
import service from '../../backend/service'; // ⚠️ adjust path — used for getImagePreview in the summary
import { login, signup } from '../../store/slices/userSlice'; // ⚠️ adjust path
import { clearCart, removeFromCart } from '../../store/slices/cartSlice'; // ⚠️ adjust path
import { formatPKR } from '../../utils/formatPrice'; // ⚠️ adjust path

const PAYMENT_METHODS = [
    { value: 'COD', label: 'Cash on Delivery', description: 'Pay when your order arrives', icon: Truck },
    { value: 'Advance', label: 'Advance Payment', description: 'Pay online ahead of delivery', icon: Wallet },
];

const inputClass =
    'w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20';

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
            <div className="mx-auto max-w-3xl px-4 py-12">
                <p className="mb-3 text-stone-500 dark:text-stone-400">No items selected for checkout.</p>
                <Link to="/cart" className="text-sm text-brand-600 hover:underline dark:text-brand-500">Go to your cart</Link>
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
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <ShoppingBag size={18} />
                </span>
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">Checkout</h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400">Review your order and complete your details below.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                {/* Order summary — sticky on desktop so it stays visible while filling the form */}
                <div className="order-1 lg:order-2 lg:col-span-2">
                    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 lg:sticky lg:top-6">
                        <h2 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-100">Order summary</h2>
                        <div className="space-y-3">
                            {items.map((i) => (
                                <div key={i.product['$id']} className="flex items-center gap-3">
                                    {i.product.fileId ? (
                                        <img
                                            src={service.getImagePreview({ fileId: i.product.fileId })}
                                            alt={i.product.name}
                                            className="h-12 w-12 rounded-md object-cover ring-1 ring-stone-200 dark:ring-stone-700"
                                        />
                                    ) : (
                                        <div className="h-12 w-12 rounded-md bg-stone-100 dark:bg-stone-800" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">{i.product.name}</p>
                                        <p className="text-xs text-stone-500 dark:text-stone-400">
                                            {formatPKR(i.product.price)} × {i.quantity}
                                        </p>
                                    </div>
                                    <p className="shrink-0 text-sm font-semibold text-stone-900 dark:text-stone-100">
                                        {formatPKR(Number(i.product.price) * i.quantity)}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-4 dark:border-stone-800">
                            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">Total</span>
                            <span className="text-lg font-bold text-brand-700 dark:text-brand-500">{formatPKR(total)}</span>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="order-2 space-y-6 lg:order-1 lg:col-span-3">
                    {!isLoggedIn && (
                        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                            <div className="mb-1 flex items-center gap-2">
                                <User size={15} className="text-stone-400 dark:text-stone-500" />
                                <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Your account</h2>
                            </div>
                            <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
                                Already have an account? Enter the same email and password and we'll log you in.
                                Otherwise, we'll create one for you automatically. Or{' '}
                                <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-500">
                                    log in first
                                </Link>{' '}
                                to skip this step.
                            </p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <input name="username" placeholder="Username" value={authFields.username} onChange={handleAuthChange} className={inputClass} />
                                <input name="name" placeholder="Full name" value={authFields.name} onChange={handleAuthChange} className={inputClass} />
                                <input name="email" type="email" placeholder="Email" value={authFields.email} onChange={handleAuthChange} className={inputClass} />
                                <input name="phone" placeholder="Phone" value={authFields.phone} onChange={handleAuthChange} className={inputClass} />
                                <input name="password" type="password" placeholder="Password" value={authFields.password} onChange={handleAuthChange} className={`${inputClass} sm:col-span-2`} />
                            </div>
                        </div>
                    )}

                    {isLoggedIn && (
                        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                            <div className="mb-1 flex items-center gap-2">
                                <User size={15} className="text-stone-400 dark:text-stone-500" />
                                <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Contact details for this order</h2>
                            </div>
                            <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
                                Used for this order's receipt only — they won't change your saved account details.
                            </p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                                <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputClass} sm:col-span-2`} />
                            </div>
                        </div>
                    )}

                    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                        <div className="mb-3 flex items-center gap-2">
                            <MapPin size={15} className="text-stone-400 dark:text-stone-500" />
                            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Delivery address</h2>
                        </div>
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            rows={3}
                            placeholder="Street, city, postal code..."
                            className={inputClass}
                        />
                    </div>

                    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Payment method</h2>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {PAYMENT_METHODS.map((pm) => {
                                const Icon = pm.icon;
                                const active = paymentMethod === pm.value;
                                return (
                                    <button
                                        key={pm.value}
                                        type="button"
                                        onClick={() => setPaymentMethod(pm.value)}
                                        className={`relative flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                                            active
                                                ? 'border-brand-600 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10'
                                                : 'border-stone-200 hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700'
                                        }`}
                                    >
                                        <span
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                                active
                                                    ? 'bg-brand-600 text-white dark:bg-brand-500'
                                                    : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                                            }`}
                                        >
                                            <Icon size={16} />
                                        </span>
                                        <span>
                                            <span className="block text-sm font-medium text-stone-900 dark:text-stone-100">{pm.label}</span>
                                            <span className="block text-xs text-stone-500 dark:text-stone-400">{pm.description}</span>
                                        </span>
                                        {active && (
                                            <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white dark:bg-brand-500">
                                                <Check size={12} strokeWidth={3} />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {error && (
                        <p className="flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                            <AlertCircle size={14} className="shrink-0" /> {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-md bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
                    >
                        {submitting ? 'Placing order...' : `Place order — ${formatPKR(total)}`}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default OrderForm;