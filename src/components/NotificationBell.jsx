import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { Bell, X } from 'lucide-react';
import {
    fetchActiveAnnouncements,
    fetchUserResponses,
    toggleSidebar,
    closeSidebar,
} from '../store/slices/announcementSlice'; // ⚠️ adjust path

function NotificationBell() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const status = useSelector((s) => s.user.status);
    const userData = useSelector((s) => s.user.userData);

    const items = useSelector((s) => s.announcements.active.items);
    const responsesById = useSelector((s) => s.announcements.responses.byId);
    const sidebarOpen = useSelector((s) => s.announcements.ui.sidebarOpen);

    // Admins manage announcements from /admin/announcements — they don't
    // need the user-facing bell/popup/read-tracking.
    const isAdmin = userData?.labels?.includes('admin');
    const eligible = status && userData?.['$id'] && !userData?.blocked && !isAdmin;

    useEffect(() => {
        if (!eligible) return;
        dispatch(fetchActiveAnnouncements());
        dispatch(fetchUserResponses({ username: userData['$id'] }));
    }, [dispatch, eligible, userData]);

    if (!eligible) return null;

    const sorted = [...items].sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
    const unreadCount = sorted.filter((a) => !responsesById[a['$id']]?.read).length;

    function openAnnouncement(id) {
        dispatch(closeSidebar());
        navigate(`/announcements/${id}`);
    }

    return (
        <div className="relative">
            <button
                onClick={() => dispatch(toggleSidebar())}
                className="relative rounded-md p-2 hover:bg-neutral-900"
                aria-label="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {sidebarOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/40"
                        onClick={() => dispatch(closeSidebar())}
                    />
                    <div className="fixed top-0 right-0 z-50 h-full w-80 bg-neutral-950 border-l border-neutral-800 p-4 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Announcements</h2>
                            <button onClick={() => dispatch(closeSidebar())} className="p-1 hover:bg-neutral-900 rounded-md">
                                <X size={18} />
                            </button>
                        </div>

                        {sorted.length === 0 && <p className="text-sm text-neutral-400">No announcements yet.</p>}

                        <ul className="space-y-2">
                            {sorted.map((a) => {
                                const isNew = !responsesById[a['$id']]?.read;
                                return (
                                    <li
                                        key={a['$id']}
                                        onClick={() => openAnnouncement(a['$id'])}
                                        className="cursor-pointer rounded-md border border-neutral-800 p-3 hover:bg-neutral-900"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm ${isNew ? 'font-semibold' : 'text-neutral-400'}`}>
                                                {a.title}
                                            </span>
                                            {isNew && (
                                                <span className="ml-2 shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-medium">
                                                    New
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
}

export default NotificationBell;