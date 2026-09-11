import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Megaphone, ThumbsUp, ThumbsDown } from 'lucide-react';
import announcementService from '../backend/announcement'; // ⚠️ adjust path
import {
    fetchActiveAnnouncements,
    fetchUserResponses,
    fetchAnnouncement,
    markAnnouncementRead,
    setAnnouncementReaction,
    clearCurrentAnnouncement,
} from '../store/slices/announcementSlice'; // ⚠️ adjust path

function Announcements() {
    const { announcementId } = useParams();
    return announcementId ? <AnnouncementDetail id={announcementId} /> : <AnnouncementList />;
}

function AnnouncementList() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const userData = useSelector((s) => s.user.userData);

    const items = useSelector((s) => s.announcements.active.items);
    const status = useSelector((s) => s.announcements.active.status);
    const responsesById = useSelector((s) => s.announcements.responses.byId);

    useEffect(() => {
        dispatch(fetchActiveAnnouncements());
        if (userData?.['$id']) dispatch(fetchUserResponses({ username: userData['$id'] }));
    }, [dispatch, userData]);

    if (status === 'loading' || status === 'idle') return <p className="mx-auto max-w-2xl px-4 py-12 text-sm text-stone-500 dark:text-stone-400">Loading announcements...</p>;
    if (items.length === 0) return <p className="mx-auto max-w-2xl px-4 py-12 text-sm text-stone-500 dark:text-stone-400">No announcements yet.</p>;

    const sorted = [...items].sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));

    return (
        <div className="mx-auto max-w-2xl space-y-3 px-4 py-8">
            <h1 className="mb-5 text-3xl font-bold text-stone-900 dark:text-stone-100">Announcements</h1>
            {sorted.map((a) => {
                const isNew = !responsesById[a['$id']]?.read;
                return (
                    <div
                        key={a['$id']}
                        onClick={() => navigate(`/announcements/${a['$id']}`)}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
                    >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                            <Megaphone size={15} />
                        </span>
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                            <h2 className={`truncate text-sm ${isNew ? 'font-semibold text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400'}`}>
                                {a.title}
                            </h2>
                            {isNew && <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-medium text-white dark:bg-brand-500">New</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function AnnouncementDetail({ id }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const userData = useSelector((s) => s.user.userData);

    const { item: announcement, status } = useSelector((s) => s.announcements.current);
    const responsesById = useSelector((s) => s.announcements.responses.byId);
    const reactionStatus = useSelector((s) => s.announcements.reaction.status);

    const myReaction = responsesById[id]?.reaction || 'none';

    useEffect(() => {
        dispatch(fetchAnnouncement({ rowId: id }));
        return () => dispatch(clearCurrentAnnouncement());
    }, [dispatch, id]);

    useEffect(() => {
        if (announcement && userData?.['$id']) {
            dispatch(markAnnouncementRead({ announcementId: announcement['$id'], username: userData['$id'] }));
        }
    }, [dispatch, announcement, userData]);

    function handleReact(reaction) {
        if (!userData?.['$id']) return;
        dispatch(setAnnouncementReaction({ announcementId: id, username: userData['$id'], reaction }));
    }

    function handleButtonClick() {
        const href = announcement.buttonHref;
        if (!href) return;
        if (href.startsWith('http')) {
            window.open(href, '_blank', 'noopener,noreferrer');
        } else {
            navigate(href);
        }
    }

    if (status === 'loading' || status === 'idle') return <p className="mx-auto max-w-2xl px-4 py-12 text-sm text-stone-500 dark:text-stone-400">Loading announcement...</p>;
    if (!announcement) return <p className="mx-auto max-w-2xl px-4 py-12 text-sm text-stone-500 dark:text-stone-400">Announcement not found.</p>;

    return (
        <div className="mx-auto max-w-2xl px-4 py-8">
            <button
                onClick={() => navigate('/announcements')}
                className="mb-4 flex items-center gap-1 text-sm text-stone-500 hover:text-brand-600 hover:underline dark:text-stone-400 dark:hover:text-brand-500"
            >
                <ArrowLeft size={14} /> Back to announcements
            </button>

            {announcement.coverFileId && (
                <img
                    src={announcementService.getImageUrl({ fileId: announcement.coverFileId })}
                    alt=""
                    className="mb-6 h-56 w-full rounded-lg object-cover"
                />
            )}

            <h1 className="mb-3 text-3xl font-bold text-stone-900 dark:text-stone-100">{announcement.title}</h1>
            <div
                className="prose mb-4 max-w-none text-sm text-stone-500 dark:text-stone-400"
                dangerouslySetInnerHTML={{ __html: announcement.contentHtml }}
            />

            {announcement.buttonLabel && announcement.buttonHref && (
                <button
                    onClick={handleButtonClick}
                    className="mb-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                >
                    {announcement.buttonLabel}
                </button>
            )}

            <div className="flex items-center gap-3 border-t border-stone-200 pt-4 dark:border-stone-800">
                <button
                    onClick={() => handleReact('like')}
                    disabled={reactionStatus === 'loading'}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        myReaction === 'like'
                            ? 'bg-brand-600 text-white dark:bg-brand-500'
                            : 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                    }`}
                >
                    <ThumbsUp size={14} /> {announcement.likesCount ?? 0}
                </button>
                <button
                    onClick={() => handleReact('dislike')}
                    disabled={reactionStatus === 'loading'}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        myReaction === 'dislike'
                            ? 'bg-red-600 text-white dark:bg-red-500'
                            : 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                    }`}
                >
                    <ThumbsDown size={14} /> {announcement.dislikesCount ?? 0}
                </button>
            </div>
        </div>
    );
}

export default Announcements;