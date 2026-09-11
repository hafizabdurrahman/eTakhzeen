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
                    className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                >
                    + New Announcement
                </button>
            </div>

            {status === 'loading' && <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>}
            {status === 'failed' && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {status === 'succeeded' && items.length === 0 && <p className="text-sm text-stone-500 dark:text-stone-400">No announcements yet.</p>}

            {status === 'succeeded' && items.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead className="border-b border-stone-200 text-stone-500 dark:border-stone-800 dark:text-stone-400">
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
                                className="cursor-pointer border-b border-stone-100 transition-colors hover:bg-stone-50 dark:border-stone-800/60 dark:hover:bg-stone-800"
                            >
                                <td className="py-2 pr-4">{a.title}</td>
                                <td className="py-2 pr-4">
                                    {a.active ? <span className="text-green-600 dark:text-green-400">Active</span> : <span className="text-stone-500 dark:text-stone-400">Hidden</span>}
                                </td>
                                <td className="py-2 pr-4">{a.likesCount ?? 0}</td>
                                <td className="py-2 pr-4">{a.dislikesCount ?? 0}</td>
                                <td className="py-2 pr-4">{new Date(a.$createdAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            )}
        </div>
    );
}

export default AdminAnnouncements;