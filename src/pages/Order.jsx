import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
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

    if (status === 'loading' || status === 'idle') return <p>Loading order...</p>;
    if (status === 'failed') return <p>Could not load order: {error}</p>;
    if (!order) return <p>Order not found.</p>;

    return (
        <div>
            <button onClick={() => navigate(-1)}>Back to orders</button>
            <h1>Order #{order.$id}</h1>
            <p>Status: {order.status}</p>
            <p>Recipient: {order.name}</p>
            <p>Phone: {order.phone}</p>
            <p>Email: {order.email}</p>
            <p>Address: {order.address}</p>
            <p>Payment method: {order.paymentMethod}</p>
            <p>Total: Rs. {order.total}</p>

            <h2>Items</h2>
            <ul>
                {order.orderDetails.map((item, i) => (
                    <li key={item.productId || i}>
                        {item.name} — Qty {item.quantity} — Rs. {item.price}
                    </li>
                ))}
            </ul>

            {order.status === 'Pending' && (
                <div>
                    <button onClick={handleCancel} disabled={cancelStatus === 'loading'}>
                        {cancelStatus === 'loading' ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                    {cancelStatus === 'failed' && <p>{cancelError}</p>}
                </div>
            )}
        </div>
    );
}

export default Order;