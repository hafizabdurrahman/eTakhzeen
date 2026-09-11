import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import { RichTextEditor } from '../.'; // ⚠️ adjust path
import announcementService from '../../backend/announcement'; // ⚠️ adjust path
import {
    fetchAnnouncementAdmin,
    createAnnouncementAdmin,
    updateAnnouncementAdmin,
    deleteAnnouncementAdmin,
    fetchResponsesForAnnouncementAdmin,
    clearAdminCurrent,
} from '../../store/slices/announcementSlice'; // ⚠️ adjust path

const emptyForm = { title: '', contentHtml: '', coverFileId: '', buttonLabel: '', buttonHref: '', active: true };

function AdminAnnouncementDetail() {
    const { announcementId } = useParams();
    const isNew = !announcementId;
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { item: announcement, status } = useSelector((s) => s.announcements.admin.current);
    const saveStatus = useSelector((s) => s.announcements.admin.save.status);
    const saveError = useSelector((s) => s.announcements.admin.save.error);
    const { items: responses, status: responsesStatus } = useSelector((s) => s.announcements.admin.responses);

    const [form, setForm] = useState(emptyForm);
    const [coverUploading, setCoverUploading] = useState(false);

    useEffect(() => {
        if (!isNew) {
            dispatch(fetchAnnouncementAdmin({ rowId: announcementId }));
            dispatch(fetchResponsesForAnnouncementAdmin({ announcementId }));
        }
        return () => dispatch(clearAdminCurrent());
    }, [dispatch, announcementId, isNew]);

    useEffect(() => {
        if (announcement) {
            setForm({
                title: announcement.title || '',
                contentHtml: announcement.contentHtml || '',
                coverFileId: announcement.coverFileId || '',
                buttonLabel: announcement.buttonLabel || '',
                buttonHref: announcement.buttonHref || '',
                active: announcement.active ?? true,
            });
        }
    }, [announcement]);

    function handleField(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    async function handleCoverUpload(e) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setCoverUploading(true);
        const uploaded = await announcementService.uploadImage({ file });
        setCoverUploading(false);

        if (!uploaded) {
            alert('Cover image upload failed.');
            return;
        }
        // Clean up the old cover if we're replacing one on an existing announcement
        if (!isNew && form.coverFileId) {
            announcementService.deleteImage({ fileId: form.coverFileId }).catch(() => {});
        }
        handleField('coverFileId', uploaded['$id']);
    }

    async function handleSave() {
        if (!form.title.trim() || !form.contentHtml.trim()) {
            alert('Title and content are required.');
            return;
        }

        if (isNew) {
            const result = await dispatch(createAnnouncementAdmin(form));
            if (createAnnouncementAdmin.fulfilled.match(result)) {
                navigate('/admin/announcements', { replace: true });
            }
        } else {
            dispatch(updateAnnouncementAdmin({ rowId: announcementId, data: form }));
        }
    }

    async function handleDelete() {
        if (!confirm('Permanently delete this announcement? This cannot be undone.')) return;
        const result = await dispatch(deleteAnnouncementAdmin({ rowId: announcementId, coverFileId: form.coverFileId }));
        if (deleteAnnouncementAdmin.fulfilled.match(result)) {
            navigate('/admin/announcements', { replace: true });
        }
    }

    if (!isNew && (status === 'loading' || status === 'idle')) {
        return <p className="text-sm text-stone-500 dark:text-stone-400">Loading announcement...</p>;
    }

    return (
        <div className="max-w-2xl">
            <button onClick={() => navigate('/admin/announcements')} className="mb-4 text-sm text-stone-500 hover:text-brand-600 hover:underline dark:text-stone-400 dark:hover:text-brand-500">
                ← Back to Announcements
            </button>

            <h1 className="mb-4 text-3xl font-bold text-stone-900 dark:text-stone-100">{isNew ? 'New Announcement' : 'Edit Announcement'}</h1>

            {saveStatus === 'failed' && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{saveError}</p>}

            <div className="mb-4 space-y-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <div>
                    <label className="mb-1 block text-sm font-medium text-stone-900 dark:text-stone-100">Title</label>
                    <input
                        value={form.title}
                        onChange={(e) => handleField('title', e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-stone-900 dark:text-stone-100">Content</label>
                    <RichTextEditor value={form.contentHtml} onChange={(html) => handleField('contentHtml', html)} />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-stone-900 dark:text-stone-100">
                        Cover Image {coverUploading && <span className="text-stone-500 dark:text-stone-400">(uploading...)</span>}
                    </label>
                    <input type="file" accept="image/*" onChange={handleCoverUpload} className="text-sm text-stone-500 file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-stone-900 dark:text-stone-400 dark:file:bg-stone-800 dark:file:text-stone-100" />
                    {form.coverFileId && (
                        <img
                            src={announcementService.getImageUrl({ fileId: form.coverFileId })}
                            alt=""
                            className="mt-2 h-24 rounded object-cover"
                        />
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-stone-900 dark:text-stone-100">Button Label (optional)</label>
                        <input
                            value={form.buttonLabel}
                            onChange={(e) => handleField('buttonLabel', e.target.value)}
                            placeholder="Shop Now"
                            className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-stone-900 dark:text-stone-100">Button Link (optional)</label>
                        <input
                            value={form.buttonHref}
                            onChange={(e) => handleField('buttonHref', e.target.value)}
                            placeholder="/products or https://..."
                            className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                        />
                    </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                    <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) => handleField('active', e.target.checked)}
                    />
                    Active (visible to users)
                </label>
            </div>

            <div className="flex gap-2 mb-6">
                <button
                    onClick={handleSave}
                    disabled={saveStatus === 'loading' || coverUploading}
                    className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
                >
                    {saveStatus === 'loading' ? 'Saving...' : isNew ? 'Create' : 'Save Changes'}
                </button>
                {!isNew && (
                    <button
                        onClick={handleDelete}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                    >
                        Delete
                    </button>
                )}
            </div>

            {!isNew && (
                <div>
                    <h2 className="mb-2 text-sm text-stone-500 dark:text-stone-400">
                        Responses ({responses.length}) — {announcement?.likesCount ?? 0} likes, {announcement?.dislikesCount ?? 0} dislikes
                    </h2>
                    {responsesStatus === 'loading' && <p className="text-sm text-stone-500 dark:text-stone-400">Loading responses...</p>}
                    {responsesStatus === 'succeeded' && responses.length === 0 && (
                        <p className="text-sm text-stone-500 dark:text-stone-400">No one has seen this announcement yet.</p>
                    )}
                    {responsesStatus === 'succeeded' && responses.length > 0 && (
                        <table className="w-full text-sm text-left">
                            <thead className="border-b border-stone-200 text-stone-500 dark:border-stone-800 dark:text-stone-400">
                                <tr>
                                    <th className="py-2 pr-4">Username</th>
                                    <th className="py-2 pr-4">Read</th>
                                    <th className="py-2 pr-4">Reaction</th>
                                </tr>
                            </thead>
                            <tbody>
                                {responses.map((r) => (
                                    <tr key={r['$id']} className="border-b border-stone-100 dark:border-stone-800/60">
                                        <td className="py-2 pr-4">{r.username}</td>
                                        <td className="py-2 pr-4">{r.read ? 'Yes' : 'No'}</td>
                                        <td className="py-2 pr-4 capitalize">{r.reaction}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}

export default AdminAnnouncementDetail;