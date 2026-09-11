import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { Bell, Megaphone } from 'lucide-react';
import { fetchActiveAnnouncements, fetchUserResponses } from '../store/slices/announcementSlice'; // ⚠️ adjust path

const MOBILE_BREAKPOINT = 640; // Tailwind `sm` — matches the rest of the app's mobile-first cutoff

function timeAgo(dateString) {
    const diffMinutes = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
}

function NotificationBell() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const containerRef = useRef(null);

    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(false); // drives the entrance transition only

    const userData = useSelector((s) => s.user.userData);
    const items = useSelector((s) => s.announcements.active.items);
    const status = useSelector((s) => s.announcements.active.status);
    const responsesById = useSelector((s) => s.announcements.responses.byId);

    useEffect(() => {
        if (!userData?.['$id']) return;
        dispatch(fetchActiveAnnouncements());
        dispatch(fetchUserResponses({ username: userData['$id'] }));
    }, [dispatch, userData]);

    // Entrance animation per the motion rules — flip `visible` a frame after
    // `open` so the "from" state actually paints first.
    useEffect(() => {
        if (!open) {
            setVisible(false);
            return;
        }
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, [open]);

    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
        }
        function handleEscape(e) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const sorted = [...items].sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
    const unreadCount = sorted.filter((a) => !responsesById[a['$id']]?.read).length;

    function handleBellClick() {
        const isMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
        if (isMobile) {
            navigate(`/${userData['$id']}/announcements`);
            return;
        }
        setOpen((v) => !v);
    }

    function goToAnnouncement(id) {
        setOpen(false);
        navigate(`/${userData['$id']}/announcements/${id}`);
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={handleBellClick}
                title="Announcements"
                aria-label={`Announcements${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                aria-expanded={open}
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-brand-400 dark:focus-visible:ring-offset-stone-950"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-medium text-white dark:bg-brand-500">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className={`absolute right-0 top-full z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-lg border border-stone-200 bg-cream shadow-lg transition-all duration-150 dark:border-stone-800 dark:bg-stone-900 ${
                        visible ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-1 scale-95 opacity-0'
                    }`}
                >
                    <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3 dark:border-stone-800">
                        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Announcements</h3>
                        {unreadCount > 0 && (
                            <span className="text-xs font-medium text-brand-600 dark:text-brand-400">{unreadCount} new</span>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {status === 'loading' && (
                            <p className="px-4 py-6 text-center text-sm text-stone-500 dark:text-stone-400">Loading...</p>
                        )}
                        {status !== 'loading' && sorted.length === 0 && (
                            <p className="px-4 py-6 text-center text-sm text-stone-500 dark:text-stone-400">No announcements yet.</p>
                        )}
                        {sorted.slice(0, 6).map((a) => {
                            const isUnread = !responsesById[a['$id']]?.read;
                            return (
                                <button
                                    key={a['$id']}
                                    type="button"
                                    onClick={() => goToAnnouncement(a['$id'])}
                                    className="flex w-full items-start gap-3 border-b border-stone-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-stone-50 dark:border-stone-800/60 dark:hover:bg-stone-800/60"
                                >
                                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                        <Megaphone size={14} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className={`truncate text-sm ${isUnread ? 'font-semibold text-stone-900 dark:text-stone-100' : 'text-stone-600 dark:text-stone-300'}`}>
                                            {a.title}
                                        </p>
                                        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{timeAgo(a.$createdAt)}</p>
                                    </div>
                                    {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600 dark:bg-brand-500" />}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={() => goToAnnouncement('')} // placeholder, replaced below
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            navigate(`/${userData['$id']}/announcements`);
                        }}
                        className="block w-full border-t border-stone-100 px-4 py-2.5 text-center text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:border-stone-800 dark:text-brand-400 dark:hover:bg-brand-500/10"
                    >
                        View all announcements
                    </button>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;