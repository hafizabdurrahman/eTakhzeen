import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { fetchOrder, cancelUserOrder, clearCurrentOrder } from '../store/slices/orderSlice';

function Order() {
    const { orderId } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { item: order, status, error } = useSelector((s) => s.orders.current);
    const cancelStatus = useSelector((s) => s.orders.cancel.status);
    const cancelError = useSelector((s) => s.orders.cancel.error);

    useEffect(() => {
        if (orderId) dispatch(fetchOrder({ rowId: orderId }));
        return () => dispatch(clearCurrentOrder());
    }, [dispatch, orderId]);

    const handleCancel = () => {
        if (order) dispatch(cancelUserOrder({ rowId: order.$id }));
    };

    if (status === 'loading' || status === 'idle') return <p className="text-sm text-stone-500 dark:text-stone-400">Loading order...</p>;
    if (status === 'failed') return <p className="text-sm text-red-600 dark:text-red-400">Could not load order: {error}</p>;
    if (!order) return <p className="text-sm text-stone-500 dark:text-stone-400">Order not found.</p>;

    return (
        <div>
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-500 dark:hover:text-brand-400"
            >
                <ArrowLeft size={15} /> Back to orders
            </button>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-brand-600 dark:text-brand-500">Order details</p>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Order #{order.$id}</h1>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-400">
                    {order.status}
                </span>
            </div>

            <div className="mt-8 grid gap-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:grid-cols-2">
                <p className="text-sm text-stone-500 dark:text-stone-400">
                    <span className="font-semibold text-stone-900 dark:text-stone-100">Recipient:</span> {order.name}
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                    <span className="font-semibold text-stone-900 dark:text-stone-100">Phone:</span> {order.phone}
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                    <span className="font-semibold text-stone-900 dark:text-stone-100">Email:</span> {order.email}
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                    <span className="font-semibold text-stone-900 dark:text-stone-100">Payment:</span> {order.paymentMethod}
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-400 sm:col-span-2">
                    <span className="font-semibold text-stone-900 dark:text-stone-100">Address:</span> {order.address}
                </p>
                <p className="text-lg font-bold text-stone-900 dark:text-stone-100 sm:col-span-2">Total: Rs. {order.total}</p>
            </div>

            <h2 className="mt-8 text-xl font-semibold text-stone-900 dark:text-stone-100">Items</h2>
            <ul className="mt-3 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white shadow-sm dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
                {order.orderDetails.map((item, i) => (
                    <li key={item.productId || i} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                        <span className="font-medium text-stone-900 dark:text-stone-100">{item.name}</span>
                        <span className="text-stone-500 dark:text-stone-400">Qty {item.quantity} · Rs. {item.price}</span>
                    </li>
                ))}
            </ul>

            {order.status === 'Pending' && (
                <div className="mt-6">
                    <button
                        onClick={handleCancel}
                        disabled={cancelStatus === 'loading'}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
                    >
                        {cancelStatus === 'loading' ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                    {cancelStatus === 'failed' && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{cancelError}</p>}
                </div>
            )}
        </div>
    );
}

export default Order;