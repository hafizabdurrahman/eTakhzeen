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

    if (status === 'loading' || status === 'idle') return <p className="text-neutral-400">Loading order...</p>;
    if (status === 'failed') return <p className="text-red-400">{error}</p>;
    if (!order || !form) return <p className="text-neutral-400">Order not found.</p>;

    return (
        <div className="max-w-xl">
            <button onClick={() => navigate('/admin/orders')} className="text-sm text-neutral-400 hover:underline mb-4">
                ← Back to Orders
            </button>

            <h1 className="text-xl font-semibold mb-1">Order #{order['$id']}</h1>
            <p className="text-neutral-500 text-sm mb-4">Placed by {order.username}</p>

            {updateStatus === 'failed' && <p className="text-red-400 text-sm mb-2">{updateError}</p>}

            <div className="space-y-3 border border-neutral-800 rounded-lg p-4 mb-4">
                <Field label="Recipient Name" value={form.name} onChange={(v) => handleFieldChange('name', v)} />
                <Field label="Email" value={form.email} onChange={(v) => handleFieldChange('email', v)} />
                <Field label="Phone" value={form.phone} onChange={(v) => handleFieldChange('phone', v)} />
                <Field label="Address" value={form.address} onChange={(v) => handleFieldChange('address', v)} textarea />

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">Payment Method</label>
                    <select
                        value={form.paymentMethod}
                        onChange={(e) => handleFieldChange('paymentMethod', e.target.value)}
                        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                    >
                        <option value="Advance">Advance</option>
                        <option value="COD">COD</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">Status</label>
                    <select
                        value={form.status}
                        onChange={(e) => handleFieldChange('status', e.target.value)}
                        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                    >
                        {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <h2 className="text-sm text-neutral-400 mb-2">Items</h2>
                <ul className="space-y-1 mb-4">
                    {order.orderDetails.map((item, i) => (
                        <li key={item.productId || i} className="text-sm">
                            {item.name} — Qty {item.quantity} — Rs. {item.price}
                        </li>
                    ))}
                </ul>
                <p className="text-sm font-medium">Total: Rs. {order.total}</p>
            </div>

            <div className="flex gap-2 mt-4">
                <button
                    onClick={handleSave}
                    disabled={updateStatus === 'loading'}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                    {updateStatus === 'loading' ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                    onClick={handleDelete}
                    disabled={deleteStatus === 'loading'}
                    className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
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
            <label className="block text-sm text-neutral-400 mb-1">{label}</label>
            <Comp
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={textarea ? 2 : undefined}
                className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
            />
        </div>
    );
}

export default AdminOrderDetail;