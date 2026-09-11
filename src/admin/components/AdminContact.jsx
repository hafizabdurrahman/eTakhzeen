import React, { useEffect } from 'react';
import { Outlet, Link, useParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInbox, setInboxFilters, selectFilteredInboxItems, selectInboxStatus, selectInboxFilters } from '../../store/slices/contactSlice';
import { getStaffScope } from '../../utils/roles';

function AdminContact() {
    const dispatch = useDispatch();
    const { conversationId: activeId } = useParams();
    const { userData } = useSelector((state) => state.user);
    const scope = getStaffScope(userData?.labels);

    const items = useSelector(selectFilteredInboxItems);
    const status = useSelector(selectInboxStatus);
    const filters = useSelector(selectInboxFilters);
    const unreadOnly = useSelector((state) => state.contact.inbox.unreadOnly);

    const effectiveDepartments = filters.department === 'all' ? scope.departments : scope.departments.filter((d) => d === filters.department);

    useEffect(() => {
        if (!scope.isStaff) return;
        dispatch(fetchInbox({ departments: effectiveDepartments, status: filters.status }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scope.isStaff, filters.department, filters.status, dispatch]);

    function refresh() {
        dispatch(fetchInbox({ departments: effectiveDepartments, status: filters.status, force: true }));
    }

    if (!scope.isStaff) return <p>You don't have access to the contact panel.</p>;

    return (
        <div style={{ display: 'flex' }}>
            <aside>
                <select value={filters.department} onChange={(e) => dispatch(setInboxFilters({ department: e.target.value }))}>
                    <option value="all">All departments</option>
                    {scope.departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>

                <select value={filters.status} onChange={(e) => dispatch(setInboxFilters({ status: e.target.value }))}>
                    {['open', 'pending', 'resolved', 'closed', 'all'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                <label>
                    <input type="checkbox" checked={unreadOnly} onChange={(e) => dispatch(setInboxFilters({ unreadOnly: e.target.checked }))} />
                    Unread only
                </label>

                <button type="button" onClick={refresh} disabled={status === 'loading'}>
                    {status === 'loading' ? 'Refreshing…' : 'Refresh'}
                </button>

                <Link to="/admin/contact/new">+ New conversation</Link>

                <ul>
                    {items.map((c) => (
                        <li key={c.$id}>
                            <Link to={`/admin/contact/${c.$id}`} aria-current={activeId === c.$id}>
                                <strong>{c.userName || c.userId}</strong> — {c.department}
                                {c.unreadByAdmin > 0 && <span> ({c.unreadByAdmin})</span>}
                                <div>{c.lastMessage}</div>
                            </Link>
                        </li>
                    ))}
                    {status !== 'loading' && items.length === 0 && <li>No conversations here.</li>}
                </ul>
            </aside>
            <main style={{ flex: 1 }}><Outlet /></main>
        </div>
    );
}

export default AdminContact;