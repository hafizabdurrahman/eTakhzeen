import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
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

    if (status === 'loading' || status === 'idle') return <p className="text-neutral-400">Loading announcements...</p>;
    if (items.length === 0) return <p className="text-neutral-400">No announcements yet.</p>;

    const sorted = [...items].sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));

    return (
        <div className="max-w-2xl mx-auto space-y-3">
            <h1 className="text-xl font-semibold mb-2">Announcements</h1>
            {sorted.map((a) => {
                const isNew = !responsesById[a['$id']]?.read;
                return (
                    <div
                        key={a['$id']}
                        onClick={() => navigate(`/announcements/${a['$id']}`)}
                        className="cursor-pointer rounded-lg border border-neutral-800 p-4 hover:bg-neutral-900"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className={`text-sm ${isNew ? 'font-semibold' : ''}`}>{a.title}</h2>
                            {isNew && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-medium">New</span>}
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

    if (status === 'loading' || status === 'idle') return <p className="text-neutral-400">Loading announcement...</p>;
    if (!announcement) return <p className="text-neutral-400">Announcement not found.</p>;

    return (
        <div className="max-w-2xl mx-auto">
            <button onClick={() => navigate('/announcements')} className="text-sm text-neutral-400 hover:underline mb-4">
                ← Back to announcements
            </button>

            {announcement.coverFileId && (
                <img
                    src={announcementService.getImageUrl({ fileId: announcement.coverFileId })}
                    alt=""
                    className="w-full h-56 object-cover rounded-lg mb-4"
                />
            )}

            <h1 className="text-xl font-semibold mb-3">{announcement.title}</h1>
            <div
                className="text-sm text-neutral-300 prose prose-invert max-w-none mb-4"
                dangerouslySetInnerHTML={{ __html: announcement.contentHtml }}
            />

            {announcement.buttonLabel && announcement.buttonHref && (
                <button onClick={handleButtonClick} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium mb-4">
                    {announcement.buttonLabel}
                </button>
            )}

            <div className="flex items-center gap-3 border-t border-neutral-800 pt-4">
                <button
                    onClick={() => handleReact('like')}
                    disabled={reactionStatus === 'loading'}
                    className={`rounded-md px-3 py-1.5 text-sm ${myReaction === 'like' ? 'bg-blue-600' : 'bg-neutral-800'}`}
                >
                    👍 {announcement.likesCount ?? 0}
                </button>
                <button
                    onClick={() => handleReact('dislike')}
                    disabled={reactionStatus === 'loading'}
                    className={`rounded-md px-3 py-1.5 text-sm ${myReaction === 'dislike' ? 'bg-red-700' : 'bg-neutral-800'}`}
                >
                    👎 {announcement.dislikesCount ?? 0}
                </button>
            </div>
        </div>
    );
}

export default Announcements;