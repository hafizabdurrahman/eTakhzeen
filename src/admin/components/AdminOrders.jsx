import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router';
import {
    fetchAllOrdersAdmin,
    fetchOrdersForUsernameAdmin,
    searchOrdersAdmin,
} from '../../store/slices/orderSlice'; // ⚠️ adjust path to match your store/ location
import { ORDER_STATUS_PRIORITY } from '../../backend/order';

const SEARCH_DEBOUNCE_MS = 400;

function AdminOrders() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const usernameFilter = searchParams.get('username') || '';

    // If we arrived via "View Orders" from a user's profile, start
    // pre-filled with their username; the box stays editable afterwards.
    const [term, setTerm] = useState(usernameFilter);
    const [touched, setTouched] = useState(false);

    const { items, status, error } = useSelector((s) => s.orders.adminList);

    useEffect(() => {
        // First load with a username filter and nothing typed yet -> exact
        // match on that user, not a fuzzy search.
        if (!touched && usernameFilter) {
            dispatch(fetchOrdersForUsernameAdmin({ username: usernameFilter }));
            return;
        }

        const handle = setTimeout(() => {
            if (term.trim()) {
                dispatch(searchOrdersAdmin({ term: term.trim() }));
            } else {
                dispatch(fetchAllOrdersAdmin());
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(handle);
    }, [dispatch, term, touched, usernameFilter]);

    function handleSearchChange(e) {
        setTouched(true);
        setTerm(e.target.value);
    }

    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => {
            const pa = ORDER_STATUS_PRIORITY[a.status] ?? 99;
            const pb = ORDER_STATUS_PRIORITY[b.status] ?? 99;
            if (pa !== pb) return pa - pb;
            return new Date(b.$createdAt) - new Date(a.$createdAt);
        });
    }, [items]);

    return (
        <div>
            <h1 className="text-xl font-semibold mb-4">Orders</h1>

            <input
                type="text"
                value={term}
                onChange={handleSearchChange}
                placeholder="Search by name, email, username, address or product..."
                className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm mb-4"
            />

            {status === 'loading' && <p className="text-neutral-400">Loading orders...</p>}
            {status === 'failed' && <p className="text-red-400">{error}</p>}

            {status === 'succeeded' && sortedItems.length === 0 && (
                <p className="text-neutral-400">No orders to show.</p>
            )}

            {status === 'succeeded' && sortedItems.length > 0 && (
                <table className="w-full text-sm text-left">
                    <thead className="text-neutral-400 border-b border-neutral-800">
                        <tr>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Recipient</th>
                            <th className="py-2 pr-4">Username</th>
                            <th className="py-2 pr-4">Address</th>
                            <th className="py-2 pr-4">Items</th>
                            <th className="py-2 pr-4">Total</th>
                            <th className="py-2 pr-4">Payment</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedItems.map((order) => (
                            <tr
                                key={order['$id']}
                                onClick={() => navigate(`/admin/orders/${order['$id']}`)}
                                className="border-b border-neutral-900 cursor-pointer hover:bg-neutral-900"
                            >
                                <td className="py-2 pr-4"><StatusBadge status={order.status} /></td>
                                <td className="py-2 pr-4">{order.name}</td>
                                <td className="py-2 pr-4">{order.username}</td>
                                <td className="py-2 pr-4">{order.address}</td>
                                <td className="py-2 pr-4">{order.orderDetails.length} item(s)</td>
                                <td className="py-2 pr-4">Rs. {order.total}</td>
                                <td className="py-2 pr-4">{order.paymentMethod}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

function StatusBadge({ status }) {
    const colors = {
        Pending: 'text-yellow-400',
        Processing: 'text-blue-400',
        Delivered: 'text-green-400',
        Returned: 'text-orange-400',
        Cancelled: 'text-red-400',
    };
    return <span className={colors[status] || 'text-neutral-400'}>{status}</span>;
}

export default AdminOrders;