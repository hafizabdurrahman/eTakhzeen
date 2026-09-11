import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import announcementService from '../backend/announcement'; // ⚠️ adjust path
import {
    fetchActiveAnnouncements,
    fetchUserResponses,
    markAnnouncementRead,
} from '../store/slices/announcementSlice'; // ⚠️ adjust path

function AnnouncementPopup() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const status = useSelector((s) => s.user.status);
    const userData = useSelector((s) => s.user.userData);
    const authChecked = useSelector((s) => s.user.authChecked);

    const activeItems = useSelector((s) => s.announcements.active.items);
    const activeStatus = useSelector((s) => s.announcements.active.status);
    const responsesById = useSelector((s) => s.announcements.responses.byId);
    const responsesStatus = useSelector((s) => s.announcements.responses.status);

    const [dismissed, setDismissed] = useState([]); // ids closed THIS session without full navigation
    const [cursor, setCursor] = useState(0);

    const isAdmin = userData?.labels?.includes('admin');
    const eligible = status && authChecked && userData?.['$id'] && !userData?.blocked && !isAdmin;

    useEffect(() => {
        if (!eligible) return;
        dispatch(fetchActiveAnnouncements());
        dispatch(fetchUserResponses({ username: userData['$id'] }));
    }, [dispatch, eligible, userData]);

    const unread = useMemo(() => {
        if (!eligible) return [];
        return activeItems.filter((a) => {
            const r = responsesById[a['$id']];
            return (!r || !r.read) && !dismissed.includes(a['$id']);
        });
    }, [eligible, activeItems, responsesById, dismissed]);

    if (!eligible) return null;
    if (activeStatus !== 'succeeded' || responsesStatus !== 'succeeded') return null;
    if (unread.length === 0) return null;

    const announcement = unread[Math.min(cursor, unread.length - 1)];
    const hasMore = cursor < unread.length - 1;

    function markCurrentReadAndAdvance() {
        dispatch(markAnnouncementRead({ announcementId: announcement['$id'], username: userData['$id'] }));
        setDismissed((prev) => [...prev, announcement['$id']]);
        setCursor((c) => c); // unread array shrinks next render; no index bump needed
    }

    function handleClose() {
        markCurrentReadAndAdvance();
    }

    function handleViewFull() {
        markCurrentReadAndAdvance();
        navigate(`/announcements/${announcement['$id']}`);
    }

    function handleButtonClick() {
        const href = announcement.buttonHref;
        markCurrentReadAndAdvance();
        if (!href) return;
        if (href.startsWith('http')) {
            window.open(href, '_blank', 'noopener,noreferrer');
        } else {
            navigate(href);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 dark:bg-black/70">
            <div className="w-full max-w-lg overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
                {announcement.coverFileId && (
                    <img
                        src={announcementService.getImageUrl({ fileId: announcement.coverFileId })}
                        alt=""
                        className="w-full h-40 object-cover"
                    />
                )}
                <div className="p-5">
                    <h2 className="text-lg font-semibold mb-2">{announcement.title}</h2>
                    <div
                        className="prose mb-4 max-w-none text-sm text-gray-500 dark:text-gray-400"
                        dangerouslySetInnerHTML={{ __html: announcement.contentHtml }}
                    />
                    <div className="flex flex-wrap gap-2">
                        {announcement.buttonLabel && announcement.buttonHref && (
                            <button
                                onClick={handleButtonClick}
                                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                            >
                                {announcement.buttonLabel}
                            </button>
                        )}
                        <button
                            onClick={handleViewFull}
                            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                        >
                            View full announcement
                        </button>
                        <button
                            onClick={handleClose}
                            className="rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        >
                            {hasMore ? 'Dismiss & next' : 'Dismiss'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AnnouncementPopup;