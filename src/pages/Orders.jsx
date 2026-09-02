import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import { fetchUserOrders } from '../store/slices/orderSlice';

function Orders() {
    const { username } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { items, status, error } = useSelector((s) => s.orders.list);

    useEffect(() => {
        if (username) dispatch(fetchUserOrders({ username }));
    }, [dispatch, username]);

    if (status === 'loading' || status === 'idle') return <p>Loading your orders...</p>;
    if (status === 'failed') return <p>Could not load orders: {error}</p>;
    if (items.length === 0) return <p>You have no orders yet.</p>;

    return (
        <div>
            <h1>Your Orders</h1>
            <ul>
                {items.map((order) => (
                    <li
                        key={order.$id}
                        onClick={() => navigate(`/${username}/orders/${order.$id}`)}
                    >
                        Order #{order.$id} — {order.status} — Rs. {order.total} — {order.orderDetails.length} item(s)
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Orders;