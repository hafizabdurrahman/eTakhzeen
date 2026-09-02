import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { fetchAllAnnouncementsAdmin } from '../../store/slices/announcementSlice'; // ⚠️ adjust path

function AdminAnnouncements() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { items, status, error } = useSelector((s) => s.announcements.admin.list);

    useEffect(() => {
        dispatch(fetchAllAnnouncementsAdmin());
    }, [dispatch]);

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold">Announcements</h1>
                <button
                    onClick={() => navigate('/admin/announcements/new')}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium"
                >
                    + New Announcement
                </button>
            </div>

            {status === 'loading' && <p className="text-neutral-400">Loading...</p>}
            {status === 'failed' && <p className="text-red-400">{error}</p>}
            {status === 'succeeded' && items.length === 0 && <p className="text-neutral-400">No announcements yet.</p>}

            {status === 'succeeded' && items.length > 0 && (
                <table className="w-full text-sm text-left">
                    <thead className="text-neutral-400 border-b border-neutral-800">
                        <tr>
                            <th className="py-2 pr-4">Title</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Likes</th>
                            <th className="py-2 pr-4">Dislikes</th>
                            <th className="py-2 pr-4">Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((a) => (
                            <tr
                                key={a['$id']}
                                onClick={() => navigate(`/admin/announcements/${a['$id']}`)}
                                className="border-b border-neutral-900 cursor-pointer hover:bg-neutral-900"
                            >
                                <td className="py-2 pr-4">{a.title}</td>
                                <td className="py-2 pr-4">
                                    {a.active ? <span className="text-green-400">Active</span> : <span className="text-neutral-500">Hidden</span>}
                                </td>
                                <td className="py-2 pr-4">{a.likesCount ?? 0}</td>
                                <td className="py-2 pr-4">{a.dislikesCount ?? 0}</td>
                                <td className="py-2 pr-4">{new Date(a.$createdAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default AdminAnnouncements;