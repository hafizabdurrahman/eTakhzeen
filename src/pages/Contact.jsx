import React, { useEffect } from 'react';
import { Outlet, Link, useParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserConversations } from '../store/slices/contactSlice'; // ⚠️ adjust path

const CONTACTS = [
    { department: 'admin', label: 'Admin' },
    { department: 'manager', label: 'Manager' },
    { department: 'support', label: 'Support' },
];

function Contact() {
    const dispatch = useDispatch();
    const { department: activeDepartment } = useParams();
    const { userData, status: loggedIn } = useSelector((state) => state.user);
    const { items, status } = useSelector((state) => state.contact.userConversations);

    useEffect(() => {
        if (!loggedIn || !userData?.['$id']) return;
        dispatch(fetchUserConversations({ userId: userData['$id'] })); // condition() makes repeat calls a no-op
    }, [loggedIn, userData, dispatch]);

    function refresh() {
        if (userData?.['$id']) dispatch(fetchUserConversations({ userId: userData['$id'], force: true }));
    }

    if (!loggedIn) return <p>Please log in to contact us.</p>;

    return (
        <div style={{ display: 'flex' }}>
            <aside>
                <strong>Contacts</strong>
                <button type="button" onClick={refresh} disabled={status === 'loading'}>
                    {status === 'loading' ? 'Refreshing…' : 'Refresh'}
                </button>
                <ul>
                    {CONTACTS.map((c) => {
                        const convo = items.find((row) => row.department === c.department);
                        return (
                            <li key={c.department}>
                                <Link to={`/contact/${c.department}`} aria-current={activeDepartment === c.department}>
                                    <strong>{c.label}</strong>
                                    {convo?.unreadByUser > 0 && <span> ({convo.unreadByUser})</span>}
                                    <div>{convo?.lastMessage || 'No messages yet'}</div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </aside>
            <main style={{ flex: 1 }}><Outlet /></main>
        </div>
    );
}

export default Contact;