import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, Link } from 'react-router';
import {
    ArrowLeft, User, Mail, Phone, MapPin, CreditCard, Package, Trash2,
    Save, Loader2, CheckCircle2, AlertTriangle, Copy, Check, CalendarDays, Clock,
} from 'lucide-react';
import { fetchOrder, updateOrderAdmin, deleteOrderAdmin, clearCurrentOrder } from '../../store/slices/orderSlice'; // ⚠️ adjust path
import service from '../../backend/service'; // ⚠️ adjust path
import StatusPicker, { ORDER_STATUS_META } from '../../ui/StatusPicker';
import { SegmentedControl } from '../../ui'; // ⚠️ adjust path

const PAYMENT_OPTIONS = [
    { value: 'Advance', label: 'Advance' },
    { value: 'COD', label: 'COD' },
];

function AdminOrderDetail() {
    const { orderId } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { item: order, status, error } = useSelector((s) => s.orders.current);
    const updateStatus = useSelector((s) => s.orders.adminUpdate.status);
    const updateError = useSelector((s) => s.orders.adminUpdate.error);
    const deleteStatus = useSelector((s) => s.orders.adminDelete.status);

    const [form, setForm] = useState(null);
    const [copied, setCopied] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);

    useEffect(() => {
        if (orderId) dispatch(fetchOrder({ rowId: orderId }));
        return () => dispatch(clearCurrentOrder());
    }, [dispatch, orderId]);

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

    useEffect(() => {
        if (updateStatus === 'succeeded') {
            setSavedFlash(true);
            const t = setTimeout(() => setSavedFlash(false), 2500);
            return () => clearTimeout(t);
        }
    }, [updateStatus]);

    const isDirty = useMemo(() => {
        if (!order || !form) return false;
        return (
            form.name !== (order.name || '') ||
            form.email !== (order.email || '') ||
            form.phone !== (order.phone || '') ||
            form.address !== (order.address || '') ||
            form.paymentMethod !== (order.paymentMethod || '') ||
            form.status !== (order.status || 'Pending')
        );
    }, [order, form]);

    function handleFieldChange(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleSave() {
        if (!order || !form || !isDirty) return;
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

    function handleCopyId() {
        if (!order) return;
        navigator.clipboard?.writeText(order['$id']);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    if (status === 'loading' || status === 'idle') {
        return <p className="text-sm text-stone-500 dark:text-stone-400">Loading order...</p>;
    }
    if (status === 'failed') {
        return (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
            </div>
        );
    }
    if (!order || !form) return <p className="text-sm text-stone-500 dark:text-stone-400">Order not found.</p>;

    const meta = ORDER_STATUS_META[order.status];

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <button
                onClick={() => navigate('/admin/orders')}
                className="flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-brand-600 dark:text-stone-400 dark:hover:text-brand-500"
            >
                <ArrowLeft size={14} /> Back to Orders
            </button>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">Order</h1>
                        <button
                            onClick={handleCopyId}
                            className="flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1 font-mono text-xs text-stone-500 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
                            title="Copy order ID"
                        >
                            {copied ? <Check size={12} className="text-green-600 dark:text-green-400" /> : <Copy size={12} />}
                            #{order['$id'].slice(0, 8)}
                        </button>
                    </div>
                    <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Placed by <Link to={`/admin/users/${order.username}`} className='hover:text-blue-500'>@{order.username}</Link></p>
                </div>
                <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                    <span className="flex items-center gap-1.5">
                        <CalendarDays size={13} /> {new Date(order.$createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Clock size={13} /> {new Date(order.$updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            {updateStatus === 'failed' && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <p>{updateError}</p>
                </div>
            )}
            {savedFlash && (
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400">
                    <CheckCircle2 size={15} /> Changes saved.
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Main column */}
                <div className="space-y-4 lg:col-span-2">
                    <Card title="Recipient details" icon={User}>
                        <div className="space-y-3">
                            <Field icon={User} label="Recipient Name" value={form.name} onChange={(v) => handleFieldChange('name', v)} />
                            <Field icon={Mail} label="Email" value={form.email} onChange={(v) => handleFieldChange('email', v)} />
                            <Field icon={Phone} label="Phone" value={form.phone} onChange={(v) => handleFieldChange('phone', v)} />
                            <Field icon={MapPin} label="Address" value={form.address} onChange={(v) => handleFieldChange('address', v)} textarea />
                        </div>
                    </Card>

                    <Card title="Items" icon={Package}>
                        <ul className="divide-y divide-stone-100 dark:divide-stone-800/60">
                            {order.orderDetails.map((item, i) => {
                                const preview = item.fileId ? service.getImagePreview({ fileId: item.fileId }) : null;
                                return (
                                    <li key={item.productId || i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                                        {preview ? (
                                            <img src={preview} alt={item.name} className="h-11 w-11 shrink-0 rounded-md border border-stone-200 object-cover dark:border-stone-700" />
                                        ) : (
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-600">
                                                <Package size={16} />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">{item.name}</p>
                                            <p className="text-xs text-stone-500 dark:text-stone-400">Qty {item.quantity} × Rs. {item.price}</p>
                                        </div>
                                        <p className="shrink-0 text-sm font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                                            Rs. {(Number(item.price) * item.quantity).toLocaleString()}
                                        </p>
                                    </li>
                                );
                            })}
                        </ul>
                        <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 dark:border-stone-800">
                            <span className="text-sm font-medium text-stone-500 dark:text-stone-400">Total</span>
                            <span className="text-lg font-bold tabular-nums text-stone-900 dark:text-stone-100">Rs. {order.total.toLocaleString()}</span>
                        </div>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <Card title="Status" icon={meta?.icon || Package}>
                        <StatusPicker value={form.status} onChange={(v) => handleFieldChange('status', v)} disabled={updateStatus === 'loading'} />
                    </Card>

                    <Card title="Payment method" icon={CreditCard}>
                        <SegmentedControl
                            name="Payment method"
                            value={form.paymentMethod}
                            onChange={(v) => handleFieldChange('paymentMethod', v)}
                            options={PAYMENT_OPTIONS}
                        />
                    </Card>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleSave}
                            disabled={updateStatus === 'loading' || !isDirty}
                            className="flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
                        >
                            {updateStatus === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            {updateStatus === 'loading' ? 'Saving...' : isDirty ? 'Save Changes' : 'No changes'}
                        </button>

                        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-500/30 dark:bg-red-500/5">
                            <p className="mb-2 text-xs text-red-700 dark:text-red-400">Deleting an order is permanent and cannot be undone.</p>
                            <button
                                onClick={handleDelete}
                                disabled={deleteStatus === 'loading'}
                                className="flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
                            >
                                {deleteStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                {deleteStatus === 'loading' ? 'Deleting...' : 'Delete Order'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Card({ title, icon: Icon, children }) {
    return (
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
                {Icon && <Icon size={15} className="text-stone-400 dark:text-stone-500" />}
                <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
            </div>
            {children}
        </div>
    );
}

function Field({ icon: Icon, label, value, onChange, textarea }) {
    const Comp = textarea ? 'textarea' : 'input';
    return (
        <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-stone-900 dark:text-stone-100">
                {Icon && <Icon size={13} className="text-stone-400 dark:text-stone-500" />} {label}
            </label>
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