import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllUsersForPicker, startAdminInitiatedConversation, openAdminThread } from '../../store/slices/contactSlice';

const DEPARTMENT_OPTIONS = ['admin', 'manager', 'support', 'other'];

function AdminContactNewConversation() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { userData } = useSelector((state) => state.user);
    const { items, status } = useSelector((state) => state.contact.userPicker);
    const [search, setSearch] = useState('');
    const [department, setDepartment] = useState('admin');
    const [starting, setStarting] = useState(null);

    useEffect(() => {
        dispatch(fetchAllUsersForPicker({ requesterId: userData['$id'], requesterLabels: userData.labels }));
    }, [dispatch, userData]);

    function refresh() {
        dispatch(fetchAllUsersForPicker({ requesterId: userData['$id'], requesterLabels: userData.labels, force: true }));
    }

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return items;
        return items.filter((u) => [u.username, u.name, u.email].filter(Boolean).some((v) => v.toLowerCase().includes(term)));
    }, [items, search]);

    async function handleStart(targetUser) {
        setStarting(targetUser.username);
        try {
            const convo = await dispatch(startAdminInitiatedConversation({
                targetUserId: targetUser.username, targetUserName: targetUser.name, targetUserEmail: targetUser.email, department,
            })).unwrap();
            await dispatch(openAdminThread(convo));
            navigate(`/admin/contact/${convo.$id}`);
        } catch (err) {
            console.error(err);
        } finally {
            setStarting(null);
        }
    }

    return (
        <div>
            <h3>Start a new conversation</h3>
            <label>
                Department:
                <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                    {DEPARTMENT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
            </label>

            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by username, name, or email…" />
            <button type="button" onClick={refresh} disabled={status === 'loading'}>
                {status === 'loading' ? 'Refreshing…' : 'Refresh users'}
            </button>

            <ul>
                {filtered.map((u) => (
                    <li key={u.username}>
                        {u.name || u.username} ({u.email})
                        <button type="button" onClick={() => handleStart(u)} disabled={starting === u.username}>
                            {starting === u.username ? 'Starting…' : 'Contact'}
                        </button>
                    </li>
                ))}
                {status !== 'loading' && filtered.length === 0 && <li>No matching users.</li>}
            </ul>
        </div>
    );
}

export default AdminContactNewConversation;