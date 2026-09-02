import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { user } from '../../backend';

function AdminUsers() {
    const userData = useSelector((s) => s.user.userData);
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [blockingId, setBlockingId] = useState(null);

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

    async function handleToggleBlock(row, e) {
        e.stopPropagation(); // don't trigger the row's "open profile" click
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

    if (loading) return <p className="text-neutral-400">Loading users...</p>;
    if (error) return <p className="text-red-400">{error}</p>;

    return (
        <div>
            <h1 className="text-xl font-semibold mb-4">Users ({rows.length})</h1>
            <table className="w-full text-sm text-left">
                <thead className="text-neutral-400 border-b border-neutral-800">
                    <tr>
                        <th className="py-2 pr-4">Username</th>
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Phone</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr
                            key={row['$id']}
                            onClick={() => openProfile(row)}
                            className="border-b border-neutral-900 cursor-pointer hover:bg-neutral-900"
                        >
                            <td className="py-2 pr-4">{row.username}</td>
                            <td className="py-2 pr-4">{row.name}</td>
                            <td className="py-2 pr-4">{row.email}</td>
                            <td className="py-2 pr-4">{row.phone}</td>
                            <td className="py-2 pr-4">
                                {row.blocked ? (
                                    <span className="text-red-400">Blocked</span>
                                ) : (
                                    <span className="text-green-400">Active</span>
                                )}
                            </td>
                            <td className="py-2 pr-4">
                                <button
                                    onClick={(e) => handleToggleBlock(row, e)}
                                    disabled={blockingId === row['$id']}
                                    className={`text-sm hover:underline disabled:opacity-50 ${
                                        row.blocked ? 'text-green-400' : 'text-red-400'
                                    }`}
                                >
                                    {blockingId === row['$id']
                                        ? 'Updating...'
                                        : row.blocked
                                        ? 'Unblock'
                                        : 'Block'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default AdminUsers;