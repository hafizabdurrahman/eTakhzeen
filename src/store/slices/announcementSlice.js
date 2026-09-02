import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import announcementService from "../../backend/announcement"; // ⚠️ adjust path

const initialState = {
    // Active announcements + the CURRENT user's read/reaction state —
    // drives the popup and the notification sidebar.
    active: { items: [], status: 'idle', error: null },
    responses: { byId: {}, status: 'idle', error: null }, // keyed by announcementId

    // Single announcement (user-facing detail page)
    current: { item: null, status: 'idle', error: null },
    reaction: { status: 'idle', error: null },

    ui: { sidebarOpen: false },

    // ---- admin ----
    admin: {
        list: { items: [], status: 'idle', error: null },
        current: { item: null, status: 'idle', error: null },
        save: { status: 'idle', error: null },
        remove: { status: 'idle', error: null },
        responses: { items: [], status: 'idle', error: null },
    },
};

// ---- user-facing ----

export const fetchActiveAnnouncements = createAsyncThunk(
    'announcements/fetchActiveAnnouncements',
    async () => announcementService.getActiveAnnouncements()
);

export const fetchUserResponses = createAsyncThunk(
    'announcements/fetchUserResponses',
    async ({ username }) => announcementService.getUserResponses({ username })
);

export const fetchAnnouncement = createAsyncThunk(
    'announcements/fetchAnnouncement',
    async ({ rowId }) => announcementService.getAnnouncement({ rowId })
);

export const markAnnouncementRead = createAsyncThunk(
    'announcements/markAnnouncementRead',
    async ({ announcementId, username }) => {
        await announcementService.markRead({ announcementId, username });
        return { announcementId };
    }
);

export const setAnnouncementReaction = createAsyncThunk(
    'announcements/setAnnouncementReaction',
    async ({ announcementId, username, reaction }, { rejectWithValue }) => {
        const updated = await announcementService.setReaction({ announcementId, username, reaction });
        if (!updated) return rejectWithValue('Failed to save your response.');
        return {
            announcementId,
            reaction: updated.reaction,
            likesCount: updated.likesCount,
            dislikesCount: updated.dislikesCount,
        };
    }
);

// ---- admin ----

export const fetchAllAnnouncementsAdmin = createAsyncThunk(
    'announcements/fetchAllAnnouncementsAdmin',
    async () => announcementService.getAllAnnouncements()
);

export const fetchAnnouncementAdmin = createAsyncThunk(
    'announcements/fetchAnnouncementAdmin',
    async ({ rowId }) => announcementService.getAnnouncement({ rowId })
);

export const createAnnouncementAdmin = createAsyncThunk(
    'announcements/createAnnouncementAdmin',
    async (data, { rejectWithValue }) => {
        const created = await announcementService.createAnnouncement(data);
        if (!created) return rejectWithValue('Failed to create announcement.');
        return created;
    }
);

export const updateAnnouncementAdmin = createAsyncThunk(
    'announcements/updateAnnouncementAdmin',
    async ({ rowId, data }, { rejectWithValue }) => {
        const updated = await announcementService.updateAnnouncement({ rowId, data });
        if (!updated) return rejectWithValue('Failed to update announcement.');
        return updated;
    }
);

export const deleteAnnouncementAdmin = createAsyncThunk(
    'announcements/deleteAnnouncementAdmin',
    async ({ rowId, coverFileId }, { rejectWithValue }) => {
        const ok = await announcementService.deleteAnnouncement({ rowId, coverFileId });
        if (!ok) return rejectWithValue('Failed to delete announcement.');
        return { rowId };
    }
);

export const fetchResponsesForAnnouncementAdmin = createAsyncThunk(
    'announcements/fetchResponsesForAnnouncementAdmin',
    async ({ announcementId }) => announcementService.getResponsesForAnnouncement({ announcementId })
);

const announcementSlice = createSlice({
    name: 'announcements',
    initialState,
    reducers: {
        openSidebar: (s) => { s.ui.sidebarOpen = true; },
        closeSidebar: (s) => { s.ui.sidebarOpen = false; },
        toggleSidebar: (s) => { s.ui.sidebarOpen = !s.ui.sidebarOpen; },
        clearCurrentAnnouncement: (s) => {
            s.current = { item: null, status: 'idle', error: null };
            s.reaction = { status: 'idle', error: null };
        },
        clearAdminCurrent: (s) => {
            s.admin.current = { item: null, status: 'idle', error: null };
            s.admin.save = { status: 'idle', error: null };
            s.admin.responses = { items: [], status: 'idle', error: null };
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchActiveAnnouncements.pending, (s) => { s.active.status = 'loading'; s.active.error = null; })
            .addCase(fetchActiveAnnouncements.fulfilled, (s, a) => { s.active.status = 'succeeded'; s.active.items = a.payload; })
            .addCase(fetchActiveAnnouncements.rejected, (s, a) => { s.active.status = 'failed'; s.active.error = a.error.message; })

            .addCase(fetchUserResponses.pending, (s) => { s.responses.status = 'loading'; s.responses.error = null; })
            .addCase(fetchUserResponses.fulfilled, (s, a) => {
                s.responses.status = 'succeeded';
                s.responses.byId = {};
                a.payload.forEach((r) => { s.responses.byId[r.announcementId] = r; });
            })
            .addCase(fetchUserResponses.rejected, (s, a) => { s.responses.status = 'failed'; s.responses.error = a.error.message; })

            .addCase(fetchAnnouncement.pending, (s) => { s.current.status = 'loading'; s.current.error = null; })
            .addCase(fetchAnnouncement.fulfilled, (s, a) => { s.current.status = 'succeeded'; s.current.item = a.payload; })
            .addCase(fetchAnnouncement.rejected, (s, a) => { s.current.status = 'failed'; s.current.error = a.error.message; })

            .addCase(markAnnouncementRead.fulfilled, (s, a) => {
                const id = a.payload.announcementId;
                s.responses.byId[id] = { ...(s.responses.byId[id] || { announcementId: id, reaction: 'none' }), read: true };
            })

            .addCase(setAnnouncementReaction.pending, (s) => { s.reaction.status = 'loading'; s.reaction.error = null; })
            .addCase(setAnnouncementReaction.fulfilled, (s, a) => {
                s.reaction.status = 'succeeded';
                const { announcementId, reaction, likesCount, dislikesCount } = a.payload;
                s.responses.byId[announcementId] = { ...(s.responses.byId[announcementId] || { announcementId }), reaction, read: true };

                if (s.current.item && s.current.item.$id === announcementId) {
                    s.current.item.reaction = reaction;
                    s.current.item.likesCount = likesCount;
                    s.current.item.dislikesCount = dislikesCount;
                }

                // keep the list views (user list, notification sidebar) in sync too
                const activeIdx = s.active.items.findIndex((x) => x.$id === announcementId);
                if (activeIdx !== -1) {
                    s.active.items[activeIdx].likesCount = likesCount;
                    s.active.items[activeIdx].dislikesCount = dislikesCount;
                }
            })
            .addCase(setAnnouncementReaction.rejected, (s, a) => { s.reaction.status = 'failed'; s.reaction.error = a.payload || a.error.message; })

            // ---- admin ----
            .addCase(fetchAllAnnouncementsAdmin.pending, (s) => { s.admin.list.status = 'loading'; s.admin.list.error = null; })
            .addCase(fetchAllAnnouncementsAdmin.fulfilled, (s, a) => { s.admin.list.status = 'succeeded'; s.admin.list.items = a.payload; })
            .addCase(fetchAllAnnouncementsAdmin.rejected, (s, a) => { s.admin.list.status = 'failed'; s.admin.list.error = a.error.message; })

            .addCase(fetchAnnouncementAdmin.pending, (s) => { s.admin.current.status = 'loading'; s.admin.current.error = null; })
            .addCase(fetchAnnouncementAdmin.fulfilled, (s, a) => { s.admin.current.status = 'succeeded'; s.admin.current.item = a.payload; })
            .addCase(fetchAnnouncementAdmin.rejected, (s, a) => { s.admin.current.status = 'failed'; s.admin.current.error = a.error.message; })

            .addCase(createAnnouncementAdmin.pending, (s) => { s.admin.save.status = 'loading'; s.admin.save.error = null; })
            .addCase(createAnnouncementAdmin.fulfilled, (s, a) => {
                s.admin.save.status = 'succeeded';
                s.admin.list.items.unshift(a.payload);
            })
            .addCase(createAnnouncementAdmin.rejected, (s, a) => { s.admin.save.status = 'failed'; s.admin.save.error = a.payload || a.error.message; })

            .addCase(updateAnnouncementAdmin.pending, (s) => { s.admin.save.status = 'loading'; s.admin.save.error = null; })
            .addCase(updateAnnouncementAdmin.fulfilled, (s, a) => {
                s.admin.save.status = 'succeeded';
                s.admin.current.item = a.payload;
                const idx = s.admin.list.items.findIndex((x) => x.$id === a.payload.$id);
                if (idx !== -1) s.admin.list.items[idx] = a.payload;
            })
            .addCase(updateAnnouncementAdmin.rejected, (s, a) => { s.admin.save.status = 'failed'; s.admin.save.error = a.payload || a.error.message; })

            .addCase(deleteAnnouncementAdmin.pending, (s) => { s.admin.remove.status = 'loading'; s.admin.remove.error = null; })
            .addCase(deleteAnnouncementAdmin.fulfilled, (s, a) => {
                s.admin.remove.status = 'succeeded';
                s.admin.list.items = s.admin.list.items.filter((x) => x.$id !== a.payload.rowId);
            })
            .addCase(deleteAnnouncementAdmin.rejected, (s, a) => { s.admin.remove.status = 'failed'; s.admin.remove.error = a.payload || a.error.message; })

            .addCase(fetchResponsesForAnnouncementAdmin.pending, (s) => { s.admin.responses.status = 'loading'; s.admin.responses.error = null; })
            .addCase(fetchResponsesForAnnouncementAdmin.fulfilled, (s, a) => { s.admin.responses.status = 'succeeded'; s.admin.responses.items = a.payload; })
            .addCase(fetchResponsesForAnnouncementAdmin.rejected, (s, a) => { s.admin.responses.status = 'failed'; s.admin.responses.error = a.error.message; });
    },
});

export const { openSidebar, closeSidebar, toggleSidebar, clearCurrentAnnouncement, clearAdminCurrent } = announcementSlice.actions;
export default announcementSlice.reducer;