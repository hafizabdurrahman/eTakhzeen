import React, { useCallback, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams, Link } from 'react-router';
import service from '../backend/service'; // ⚠️ adjust path if backend/ isn't directly under src/
import { getOneProduct, getProducts } from '../store/slices/productSlice'; // ⚠️ adjust path if store/ isn't directly under src/
import { addToCart } from '../store/slices/cartSlice'; // ⚠️ adjust path
import { formatPKR } from '../utils/formatPrice'; // ⚠️ adjust path
import ProductForm from '../admin/components/ProductForm'; // ⚠️ adjust path to wherever ProductForm.jsx actually lives

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

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        const found = await service.getProductBySlug({ slug });
        if (!found) {
            setError('Product not found.');
            setLoading(false);
            return;
        }

        // FIX: case-insensitive / trimmed comparison. Previously an exact
        // strict comparison meant any casing or whitespace mismatch between
        // the stored category/group and the URL param (e.g. "Phone" vs
        // "phone") triggered a redirect to a URL that itself mismatched
        // again on the next load — an infinite redirect loop that left
        // `loading` stuck true forever with no error ever surfacing.
        const normalizedCategory = (found.category || '').trim().toLowerCase();
        const normalizedGroup = (found.group || '').trim().toLowerCase();
        const urlCategory = (category || '').trim().toLowerCase();
        const urlGroup = (group || '').trim().toLowerCase();

        if (normalizedCategory !== urlCategory || normalizedGroup !== urlGroup) {
            // FIX: always reset loading before navigating away, as a safety
            // net — even in the normal case this component unmounts and
            // remounts fresh, but if navigate() doesn't actually cause a
            // remount (e.g. only the slug segment changes) this prevents a
            // stuck spinner.
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
        await dispatch(addToCart({ userId: userData['$id'], product, quantity: qty })); // ⚠️ confirm userData['$id'] is the correct row id field for your user table
        setAdding(false);
        setOrderMessage('Added to cart.');
    }

    // Checkout details (address, payment method, account creation for
    // guests) all live in OrderForm now. If the shopper is logged in, the
    // product is also saved to their cart before handing off, so it's there
    // if they abandon checkout. Guests skip straight to checkout — OrderForm
    // itself handles logging them in or creating an account inline.
    async function handleOrderNow() {
        if (userData) {
            setOrdering(true);
            await dispatch(addToCart({ userId: userData['$id'], product, quantity: qty }));
            setOrdering(false);
        }
        navigate('/checkout', { state: { items: [{ product, quantity: qty }], mode: 'single' } });
    }

    function handleRequestRestock() {
        // No backend wiring requested for this yet — stub for now. Wire to
        // an email/notification flow or a dedicated table later.
        alert(`We'll notify you when "${product.name}" is back in stock.`);
    }

    if (loading) return <p className="text-neutral-400">Loading product...</p>;
    if (error) return <p className="text-red-400">{error}</p>;
    if (!product || !product['$id']) return null;

    const otherProductsInGroup = siblings.filter((p) => p['$id'] !== product['$id']);
    const inStock = product.status === true;

    return (
        <div>
            {isAdmin && !editing && (
                <div className="flex gap-2 mb-4 border border-neutral-800 rounded-md p-2">
                    <span className="text-xs text-neutral-500 self-center mr-2">Admin</span>
                    <button
                        onClick={startEdit}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium"
                    >
                        Edit
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
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
                    <div className="mb-8">
                        {product.fileId ? (
                            <img
                                src={service.getImagePreview({ fileId: product.fileId })}
                                alt={product.name}
                                className="w-full max-w-md rounded-lg mb-4"
                            />
                        ) : (
                            <div className="w-full max-w-md h-64 rounded-lg bg-neutral-800 mb-4" />
                        )}

                        <h1 className="text-2xl font-semibold">{product.name}</h1>
                        <p className="text-neutral-500 text-sm mb-2">
                            {product.category} / {product.group}
                        </p>
                        <p className="text-lg mb-1">{formatPKR(product.price)}</p>
                        <p className={`text-sm mb-4 ${inStock ? 'text-green-400' : 'text-red-400'}`}>
                            {inStock ? 'In stock' : 'Out of stock'}
                        </p>

                        {inStock ? (
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={qty}
                                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                                    className="w-16 rounded-md bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-sm"
                                />
                                <button
                                    onClick={handleAddToCart}
                                    disabled={adding}
                                    className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium hover:border-neutral-500 disabled:opacity-50"
                                >
                                    {adding ? 'Adding...' : 'Add to Cart'}
                                </button>
                                <button
                                    onClick={handleOrderNow}
                                    disabled={ordering}
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
                                >
                                    {ordering ? 'Preparing checkout...' : 'Order Now'}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleRequestRestock}
                                className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium hover:border-neutral-500 mb-2"
                            >
                                Request to get it in stock
                            </button>
                        )}

                        {orderMessage && <p className="text-sm text-neutral-400 mt-1">{orderMessage}</p>}

                        {product.description && (
                            <p className="text-neutral-400 mt-4">{product.description}</p>
                        )}
                    </div>

                    {otherProductsInGroup.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold mb-3">
                                More in {product.group}
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {otherProductsInGroup.map((p) => (
                                    <Link
                                        key={p['$id']}
                                        to={`/products/${p.category}/${p.group}/${p.slug}`}
                                        className="block border border-neutral-800 rounded-md p-2 hover:border-neutral-600"
                                    >
                                        {p.fileId ? (
                                            <img
                                                src={service.getImagePreview({ fileId: p.fileId })}
                                                alt={p.name}
                                                className="w-full h-32 object-cover rounded mb-2"
                                            />
                                        ) : (
                                            <div className="w-full h-32 rounded bg-neutral-800 mb-2" />
                                        )}
                                        <p className="text-sm">{p.status ? 'In Stock' : 'Out of stock'}</p>
                                        <p className="text-sm">{p.name}</p>
                                        <p className="text-neutral-500 text-xs">
                                            {formatPKR(p.price)}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default Product;