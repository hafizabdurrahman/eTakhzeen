import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router';
import { user } from '../../backend';

import { SegmentedControl, Toggle } from '../../ui';

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'blocked', label: 'Blocked' },
];

function AdminUsers() {
    const userData = useSelector((s) => s.user.userData);
    const navigate = useNavigate();
    const location = useLocation();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [blockingId, setBlockingId] = useState(null);
    // A dashboard stat card (e.g. "Blocked Users") can deep-link straight into
    // the matching filter here instead of needing its own page.
    const [filter, setFilter] = useState(location.state?.filter || 'all');
    const [term, setTerm] = useState('');

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);
                const all = await user.getProfile({
                    requesterLabels: userData?.labels,
                    requesterId: userData?.['$id'],
                });
                if (!cancelled) setRows(Array.isArray(all) ? all : []);
            } catch (err) {
                if (!cancelled) setError('Failed to load users.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userData]);

    async function handleToggleBlock(row) {
        setBlockingId(row['$id']);
        const nextBlocked = !row.blocked;
        const result = await user.setBlocked({ rowId: row['$id'], blocked: nextBlocked });
        setBlockingId(null);

        if (!result) {
            alert('Failed to update block status.');
            return;
        }

        setRows((prev) =>
            prev.map((r) => (r['$id'] === row['$id'] ? { ...r, blocked: nextBlocked } : r))
        );
    }

    function openProfile(row) {
        navigate(`/admin/users/${row.username}`);
    }

    const filteredRows = useMemo(() => {
        let list = rows;
        if (filter === 'active') list = list.filter((r) => !r.blocked);
        if (filter === 'blocked') list = list.filter((r) => r.blocked);

        if (term.trim()) {
            const q = term.trim().toLowerCase();
            list = list.filter(
                (r) =>
                    r.username?.toLowerCase().includes(q) ||
                    r.name?.toLowerCase().includes(q) ||
                    r.email?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [rows, filter, term]);

    if (loading) return <p className="text-sm text-stone-500 dark:text-stone-400">Loading users...</p>;
    if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

    return (
        <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">
                    Users <span className="text-stone-400 dark:text-stone-500">({filteredRows.length})</span>
                </h1>
                <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} name="Filter users" />
            </div>

            <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search by username, name or email..."
                className="mb-4 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
            />

            {filteredRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-8 text-center dark:border-stone-700 dark:bg-stone-900">
                    <p className="text-sm text-stone-500 dark:text-stone-400">No users match this view.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead className="border-b border-stone-200 bg-stone-50 text-stone-500 dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-400">
                        <tr>
                            <th className="py-2.5 pl-4 pr-4">Username</th>
                            <th className="py-2.5 pr-4">Name</th>
                            <th className="py-2.5 pr-4 hidden sm:table-cell">Email</th>
                            <th className="py-2.5 pr-4 hidden md:table-cell">Phone</th>
                            <th className="py-2.5 pr-4">Status</th>
                            <th className="py-2.5 pr-4">Blocked</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.map((row) => (
                            <tr
                                key={row['$id']}
                                onClick={() => openProfile(row)}
                                className="cursor-pointer border-b border-stone-100 transition-colors hover:bg-stone-50 dark:border-stone-800/60 dark:hover:bg-stone-800/60"
                            >
                                <td className="py-2 pl-4 pr-4 font-medium text-stone-900 dark:text-stone-100">{row.username}</td>
                                <td className="py-2 pr-4">{row.name}</td>
                                <td className="py-2 pr-4 hidden sm:table-cell">{row.email}</td>
                                <td className="py-2 pr-4 hidden md:table-cell">{row.phone}</td>
                                <td className="py-2 pr-4">
                                    {row.blocked ? (
                                        <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-400">Blocked</span>
                                    ) : (
                                        <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/20 dark:text-green-400">Active</span>
                                    )}
                                </td>
                                <td className="py-2 pr-4" onClick={(e) => e.stopPropagation()}>
                                    <Toggle
                                        checked={row.blocked}
                                        onChange={() => handleToggleBlock(row)}
                                        disabled={blockingId === row['$id']}
                                        color="danger"
                                        label={row.blocked ? `Unblock ${row.username}` : `Block ${row.username}`}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            )}
        </div>
    );
}

export default AdminUsers;