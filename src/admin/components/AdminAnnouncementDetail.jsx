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
        return <p className="text-neutral-400">Loading announcement...</p>;
    }

    return (
        <div className="max-w-2xl">
            <button onClick={() => navigate('/admin/announcements')} className="text-sm text-neutral-400 hover:underline mb-4">
                ← Back to Announcements
            </button>

            <h1 className="text-xl font-semibold mb-4">{isNew ? 'New Announcement' : 'Edit Announcement'}</h1>

            {saveStatus === 'failed' && <p className="text-red-400 text-sm mb-2">{saveError}</p>}

            <div className="space-y-4 border border-neutral-800 rounded-lg p-4 mb-4">
                <div>
                    <label className="block text-sm text-neutral-400 mb-1">Title</label>
                    <input
                        value={form.title}
                        onChange={(e) => handleField('title', e.target.value)}
                        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">Content</label>
                    <RichTextEditor value={form.contentHtml} onChange={(html) => handleField('contentHtml', html)} />
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">
                        Cover Image {coverUploading && <span className="text-neutral-500">(uploading...)</span>}
                    </label>
                    <input type="file" accept="image/*" onChange={handleCoverUpload} className="text-sm text-neutral-400" />
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
                        <label className="block text-sm text-neutral-400 mb-1">Button Label (optional)</label>
                        <input
                            value={form.buttonLabel}
                            onChange={(e) => handleField('buttonLabel', e.target.value)}
                            placeholder="Shop Now"
                            className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-neutral-400 mb-1">Button Link (optional)</label>
                        <input
                            value={form.buttonHref}
                            onChange={(e) => handleField('buttonHref', e.target.value)}
                            placeholder="/products or https://..."
                            className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
                        />
                    </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-neutral-400">
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
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                    {saveStatus === 'loading' ? 'Saving...' : isNew ? 'Create' : 'Save Changes'}
                </button>
                {!isNew && (
                    <button onClick={handleDelete} className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium">
                        Delete
                    </button>
                )}
            </div>

            {!isNew && (
                <div>
                    <h2 className="text-sm text-neutral-400 mb-2">
                        Responses ({responses.length}) — {announcement?.likesCount ?? 0} likes, {announcement?.dislikesCount ?? 0} dislikes
                    </h2>
                    {responsesStatus === 'loading' && <p className="text-neutral-500 text-sm">Loading responses...</p>}
                    {responsesStatus === 'succeeded' && responses.length === 0 && (
                        <p className="text-neutral-500 text-sm">No one has seen this announcement yet.</p>
                    )}
                    {responsesStatus === 'succeeded' && responses.length > 0 && (
                        <table className="w-full text-sm text-left">
                            <thead className="text-neutral-400 border-b border-neutral-800">
                                <tr>
                                    <th className="py-2 pr-4">Username</th>
                                    <th className="py-2 pr-4">Read</th>
                                    <th className="py-2 pr-4">Reaction</th>
                                </tr>
                            </thead>
                            <tbody>
                                {responses.map((r) => (
                                    <tr key={r['$id']} className="border-b border-neutral-900">
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