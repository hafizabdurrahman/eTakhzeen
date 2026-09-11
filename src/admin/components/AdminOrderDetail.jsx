import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import { fetchOrder, updateOrderAdmin, deleteOrderAdmin, clearCurrentOrder } from '../../store/slices/orderSlice'; // ⚠️ adjust path
import { ORDER_STATUSES } from '../../backend/order';

function AdminOrderDetail() {
    const { orderId } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { item: order, status, error } = useSelector((s) => s.orders.current);
    const updateStatus = useSelector((s) => s.orders.adminUpdate.status);
    const updateError = useSelector((s) => s.orders.adminUpdate.error);
    const deleteStatus = useSelector((s) => s.orders.adminDelete.status);

    const [form, setForm] = useState(null);

    useEffect(() => {
        if (orderId) dispatch(fetchOrder({ rowId: orderId }));
        return () => dispatch(clearCurrentOrder());
    }, [dispatch, orderId]);

    // Seed the editable form once the order loads, and again after a save
    // so the fields reflect what actually landed in the table.
    useEffect(() => {
        if (order) {
            setForm({
                name: order.name || '',
                email: order.email || '',
                phone: order.phone || '',
                address: order.address || '',
                paymentMethod: order.paymentMethod || '',
                status: order.status || 'Pending',
            });
        }
    }, [order]);

    function handleFieldChange(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleSave() {
        if (!order || !form) return;
        dispatch(updateOrderAdmin({ rowId: order['$id'], data: form }));
    }

    async function handleDelete() {
        if (!order) return;
        if (!confirm('Permanently delete this order? This cannot be undone.')) return;
        const result = await dispatch(deleteOrderAdmin({ rowId: order['$id'] }));
        if (deleteOrderAdmin.fulfilled.match(result)) {
            navigate('/admin/orders', { replace: true });
        }
    }

    if (status === 'loading' || status === 'idle') return <p className="text-sm text-stone-500 dark:text-stone-400">Loading order...</p>;
    if (status === 'failed') return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
    if (!order || !form) return <p className="text-sm text-stone-500 dark:text-stone-400">Order not found.</p>;

    return (
        <div className="max-w-xl">
            <button onClick={() => navigate('/admin/orders')} className="mb-4 text-sm text-stone-500 hover:text-brand-600 hover:underline dark:text-stone-400 dark:hover:text-brand-500">
                ← Back to Orders
            </button>

            <h1 className="mb-1 text-3xl font-bold text-stone-900 dark:text-stone-100">Order #{order['$id']}</h1>
            <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">Placed by {order.username}</p>

            {updateStatus === 'failed' && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{updateError}</p>}

            <div className="mb-4 space-y-3 rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <Field label="Recipient Name" value={form.name} onChange={(v) => handleFieldChange('name', v)} />
                <Field label="Email" value={form.email} onChange={(v) => handleFieldChange('email', v)} />
                <Field label="Phone" value={form.phone} onChange={(v) => handleFieldChange('phone', v)} />
                <Field label="Address" value={form.address} onChange={(v) => handleFieldChange('address', v)} textarea />

                <div>
                    <label className="mb-1 block text-sm font-medium text-stone-900 dark:text-stone-100">Payment Method</label>
                    <select
                        value={form.paymentMethod}
                        onChange={(e) => handleFieldChange('paymentMethod', e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                    >
                        <option value="Advance">Advance</option>
                        <option value="COD">COD</option>
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-stone-900 dark:text-stone-100">Status</label>
                    <select
                        value={form.status}
                        onChange={(e) => handleFieldChange('status', e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                    >
                        {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <h2 className="mb-2 text-sm font-semibold text-stone-900 dark:text-stone-100">Items</h2>
                <ul className="mb-4 space-y-1 rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                    {order.orderDetails.map((item, i) => (
                        <li key={item.productId || i} className="text-sm text-stone-900 dark:text-stone-100">
                            {item.name} — Qty {item.quantity} — Rs. {item.price}
                        </li>
                    ))}
                </ul>
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">Total: Rs. {order.total}</p>
            </div>

            <div className="flex gap-2 mt-4">
                <button
                    onClick={handleSave}
                    disabled={updateStatus === 'loading'}
                    className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
                >
                    {updateStatus === 'loading' ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                    onClick={handleDelete}
                    disabled={deleteStatus === 'loading'}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
                >
                    {deleteStatus === 'loading' ? 'Deleting...' : 'Delete Order'}
                </button>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, textarea }) {
    const Comp = textarea ? 'textarea' : 'input';
    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-stone-900 dark:text-stone-100">{label}</label>
            <Comp
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={textarea ? 2 : undefined}
                className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
            />
        </div>
    );
}

export default AdminOrderDetail;