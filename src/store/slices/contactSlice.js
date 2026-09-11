import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import conversationService from '../../backend/conversation'; // ⚠️ adjust path
import contactService from '../../backend/contact';           // ⚠️ adjust path
import responseService from '../../backend/main';             // ⚠️ adjust path
import faqService from '../../backend/faq';                   // ⚠️ adjust path
import userService from '../../backend/user';

const initialState = {
    active: {
        conversation: null,
        messages: [],
        quickQuestions: [],
        conversationStatus: 'idle',
        messagesStatus: 'idle',
        quickQuestionsStatus: 'idle',
        sendStatus: 'idle',
        error: null,
    },
    userConversations: { items: [], status: 'idle', error: null },
    inbox: {
        items: [],
        status: 'idle',
        error: null,
        departmentFilter: 'all',
        statusFilter: 'open',
        unreadOnly: false,
    },
    adminThread: {
        conversation: null,
        messages: [],
        status: 'idle',
        sendStatus: 'idle',
        error: null,
    },
    userPicker: { items: [], status: 'idle', error: null },
};

function mergeMessages(contactRows = [], responseRows = []) {
    const userMessages = contactRows.map((row) => ({
        id: row.$id, role: 'user', content: row.content, type: row.type || 'text',
        quickQuestionId: row.quickQuestionId || null, attachments: row.attachments || [],
        isRead: !!row.isRead, createdAt: row.$createdAt,
    }));
    const adminMessages = responseRows.map((row) => ({
        id: row.$id, role: 'admin', content: row.content, adminId: row.adminId,
        adminName: row.adminName || 'Support', attachments: row.attachments || [],
        isRead: !!row.isRead, createdAt: row.$createdAt,
    }));
    return [...userMessages, ...adminMessages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

function previewOf(text, maxLength = 120) {
    if (!text) return '';
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

async function loadMergedMessages(conversationId) {
    const [contactRows, responseRows] = await Promise.all([
        contactService.listByConversation(conversationId),
        responseService.listByConversation(conversationId),
    ]);
    return mergeMessages(contactRows, responseRows);
}

// Not a thunk — called from sendMessage below when a quick-question chip
// is tapped. Silently no-ops if the FAQ row is gone/deactivated.
async function maybeAutoAnswer({ conversationId, userId, department, quickQuestionId }) {
    const faqRow = await faqService.getById(quickQuestionId);
    if (!faqRow || faqRow.isActive === false || !faqRow.answer) return;

    const sent = await responseService.send({
        conversationId, userId, department,
        adminId: 'auto-answer', adminName: 'Automated answer', content: faqRow.answer,
    });
    if (sent) await conversationService.touchOnAdminMessage(conversationId, previewOf(faqRow.answer), 'auto-answer');
}

/* --------------------------------- Thunks -------------------------------- */

export const openConversation = createAsyncThunk(
    'contact/openConversation',
    async ({ userId, userName, userEmail, department, productId, productName }, { dispatch, rejectWithValue }) => {
        const convo = await conversationService.getOrCreate({ userId, userName, userEmail, department, productId, productName });
        if (!convo) return rejectWithValue('Failed to open this conversation.');

        await Promise.allSettled([
            dispatch(fetchActiveMessages(convo.$id)),
            dispatch(fetchQuickQuestions({ department, productId })),
            responseService.markAllRead(convo.$id),
            conversationService.markReadByUser(convo.$id),
        ]);
        return convo;
    }
);

export const fetchActiveMessages = createAsyncThunk(
    'contact/fetchActiveMessages',
    async (conversationId) => loadMergedMessages(conversationId)
);

export const fetchQuickQuestions = createAsyncThunk(
    'contact/fetchQuickQuestions',
    async ({ department, productId }) => faqService.listFor({ department, productId })
);

export const sendMessage = createAsyncThunk(
    'contact/sendMessage',
    async ({ content, type = 'text', quickQuestionId = null }, { getState, dispatch, rejectWithValue }) => {
        const { conversation } = getState().contact.active;
        if (!conversation) return rejectWithValue('No active conversation to send to.');

        const sent = await contactService.send({
            conversationId: conversation.$id, userId: conversation.userId, department: conversation.department,
            content, type, quickQuestionId,
        });
        if (!sent) return rejectWithValue('Failed to send your message.');

        await conversationService.touchOnUserMessage(conversation.$id, previewOf(content));

        if (type === 'quick_question' && quickQuestionId) {
            await maybeAutoAnswer({
                conversationId: conversation.$id, userId: conversation.userId,
                department: conversation.department, quickQuestionId,
            });
        }

        await dispatch(fetchActiveMessages(conversation.$id));
        return true;
    }
);

// Fetched once per session unless `force: true` — powers the user-facing
// "contact list" (last message / unread badge per department).
export const fetchUserConversations = createAsyncThunk(
    'contact/fetchUserConversations',
    async ({ userId }) => conversationService.listForUser(userId),
    {
        condition: ({ force = false } = {}, { getState }) => {
            const s = getState().contact.userConversations.status;
            if (s === 'loading') return false;
            if (s === 'succeeded' && !force) return false;
            return true;
        },
    }
);

/* ------------------------------- Admin thunks ------------------------------ */

export const fetchInbox = createAsyncThunk(
    'contact/fetchInbox',
    async ({ departments, status }) => conversationService.listForInbox({ departments, status }),
    {
        condition: ({ force = false } = {}, { getState }) => {
            const s = getState().contact.inbox.status;
            if (s === 'loading') return false;
            if (s === 'succeeded' && !force) return false;
            return true;
        },
    }
);

export const fetchAdminThreadMessages = createAsyncThunk(
    'contact/fetchAdminThreadMessages',
    async (conversationId) => loadMergedMessages(conversationId)
);

export const openAdminThread = createAsyncThunk(
    'contact/openAdminThread',
    async (conversationRow, { dispatch }) => {
        await Promise.allSettled([
            contactService.markAllRead(conversationRow.$id),
            conversationService.markReadByAdmin(conversationRow.$id),
            dispatch(fetchAdminThreadMessages(conversationRow.$id)),
        ]);
        return conversationRow;
    }
);

// Deep-link fallback: opening /admin/contact/:id directly (refresh, bookmark)
// before the inbox list has loaded, so there's no row object in hand yet.
export const openAdminThreadById = createAsyncThunk(
    'contact/openAdminThreadById',
    async (conversationId, { dispatch, rejectWithValue }) => {
        const row = await conversationService.get(conversationId);
        if (!row) return rejectWithValue('Conversation not found.');
        await dispatch(openAdminThread(row));
        return row;
    }
);

export const sendAdminReply = createAsyncThunk(
    'contact/sendAdminReply',
    async ({ content, adminId, adminName }, { getState, dispatch, rejectWithValue }) => {
        const { conversation } = getState().contact.adminThread;
        if (!conversation) return rejectWithValue('No conversation open.');

        const sent = await responseService.send({
            conversationId: conversation.$id, userId: conversation.userId, department: conversation.department,
            adminId, adminName, content,
        });
        if (!sent) return rejectWithValue('Failed to send reply.');

        await conversationService.touchOnAdminMessage(conversation.$id, previewOf(content), adminId);
        await dispatch(fetchAdminThreadMessages(conversation.$id));
        return true;
    }
);

export const changeConversationStatus = createAsyncThunk(
    'contact/changeConversationStatus',
    async ({ conversationId, status }, { rejectWithValue }) => {
        const updated = await conversationService.setStatus(conversationId, status);
        if (!updated) return rejectWithValue('Failed to update status.');
        return updated;
    }
);

// Admin picks a customer to message first (from the "New conversation"
// screen, or the Contact button on a user's admin profile page).
export const startAdminInitiatedConversation = createAsyncThunk(
    'contact/startAdminInitiatedConversation',
    async ({ targetUserId, targetUserName, targetUserEmail, department = 'admin' }, { rejectWithValue }) => {
        const convo = await conversationService.getOrCreate({
            userId: targetUserId, userName: targetUserName, userEmail: targetUserEmail, department,
        });
        if (!convo) return rejectWithValue('Failed to start a conversation with this user.');
        return convo;
    }
);

// Backs the user picker on the "New conversation" screen — fetched once,
// refreshable. Reuses user.js's existing admin-only "return everything"
// branch of getProfile().
export const fetchAllUsersForPicker = createAsyncThunk(
    'contact/fetchAllUsersForPicker',
    async ({ requesterId, requesterLabels }) => {
        const rows = await userService.getProfile({ requesterId, requesterLabels });
        return Array.isArray(rows) ? rows : [];
    },
    {
        condition: ({ force = false } = {}, { getState }) => {
            const s = getState().contact.userPicker.status;
            if (s === 'loading') return false;
            if (s === 'succeeded' && !force) return false;
            return true;
        },
    }
);

/* --------------------------------- Slice --------------------------------- */

const contactSlice = createSlice({
    name: 'contact',
    initialState,
    reducers: {
        activeConversationReset(state) { state.active = initialState.active; },
        adminThreadReset(state) { state.adminThread = initialState.adminThread; },
        setInboxFilters(state, action) {
            const { department, status, unreadOnly } = action.payload;
            if (department !== undefined) state.inbox.departmentFilter = department;
            if (status !== undefined) state.inbox.statusFilter = status;
            if (unreadOnly !== undefined) state.inbox.unreadOnly = unreadOnly;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(openConversation.pending, (s) => { s.active.conversationStatus = 'loading'; s.active.error = null; })
            .addCase(openConversation.fulfilled, (s, a) => { s.active.conversationStatus = 'succeeded'; s.active.conversation = a.payload; })
            .addCase(openConversation.rejected, (s, a) => { s.active.conversationStatus = 'failed'; s.active.error = a.payload; })

            .addCase(fetchActiveMessages.pending, (s) => { s.active.messagesStatus = 'loading'; })
            .addCase(fetchActiveMessages.fulfilled, (s, a) => { s.active.messagesStatus = 'succeeded'; s.active.messages = a.payload; })
            .addCase(fetchActiveMessages.rejected, (s, a) => { s.active.messagesStatus = 'failed'; s.active.error = a.error.message; })

            .addCase(fetchQuickQuestions.pending, (s) => { s.active.quickQuestionsStatus = 'loading'; })
            .addCase(fetchQuickQuestions.fulfilled, (s, a) => { s.active.quickQuestionsStatus = 'succeeded'; s.active.quickQuestions = a.payload; })
            .addCase(fetchQuickQuestions.rejected, (s, a) => { s.active.quickQuestionsStatus = 'failed'; s.active.error = a.error.message; })

            .addCase(sendMessage.pending, (s) => { s.active.sendStatus = 'loading'; })
            .addCase(sendMessage.fulfilled, (s) => { s.active.sendStatus = 'succeeded'; })
            .addCase(sendMessage.rejected, (s, a) => { s.active.sendStatus = 'failed'; s.active.error = a.payload; })

            .addCase(fetchUserConversations.pending, (s) => { s.userConversations.status = 'loading'; })
            .addCase(fetchUserConversations.fulfilled, (s, a) => { s.userConversations.status = 'succeeded'; s.userConversations.items = a.payload; })
            .addCase(fetchUserConversations.rejected, (s, a) => { s.userConversations.status = 'failed'; s.userConversations.error = a.error.message; })

            .addCase(fetchInbox.pending, (s) => { s.inbox.status = 'loading'; })
            .addCase(fetchInbox.fulfilled, (s, a) => { s.inbox.status = 'succeeded'; s.inbox.items = a.payload; })
            .addCase(fetchInbox.rejected, (s, a) => { s.inbox.status = 'failed'; s.inbox.error = a.error.message; })

            .addCase(openAdminThread.pending, (s) => { s.adminThread.status = 'loading'; })
            .addCase(openAdminThread.fulfilled, (s, a) => { s.adminThread.status = 'succeeded'; s.adminThread.conversation = a.payload; })
            .addCase(openAdminThread.rejected, (s, a) => { s.adminThread.status = 'failed'; s.adminThread.error = a.error.message; })

            .addCase(openAdminThreadById.pending, (s) => { s.adminThread.status = 'loading'; })
            .addCase(openAdminThreadById.rejected, (s, a) => { s.adminThread.status = 'failed'; s.adminThread.error = a.payload; })

            .addCase(fetchAdminThreadMessages.fulfilled, (s, a) => { s.adminThread.messages = a.payload; })

            .addCase(sendAdminReply.pending, (s) => { s.adminThread.sendStatus = 'loading'; })
            .addCase(sendAdminReply.fulfilled, (s) => { s.adminThread.sendStatus = 'succeeded'; })
            .addCase(sendAdminReply.rejected, (s, a) => { s.adminThread.sendStatus = 'failed'; s.adminThread.error = a.payload; })

            .addCase(changeConversationStatus.fulfilled, (s, a) => {
                if (s.adminThread.conversation?.$id === a.payload.$id) s.adminThread.conversation = a.payload;
                const idx = s.inbox.items.findIndex((c) => c.$id === a.payload.$id);
                if (idx !== -1) s.inbox.items[idx] = a.payload;
            })

            .addCase(fetchAllUsersForPicker.pending, (s) => { s.userPicker.status = 'loading'; })
            .addCase(fetchAllUsersForPicker.fulfilled, (s, a) => { s.userPicker.status = 'succeeded'; s.userPicker.items = a.payload; })
            .addCase(fetchAllUsersForPicker.rejected, (s, a) => { s.userPicker.status = 'failed'; s.userPicker.error = a.error.message; });
    },
});

export const { activeConversationReset, adminThreadReset, setInboxFilters } = contactSlice.actions;
export default contactSlice.reducer;

/* ------------------------------- Selectors -------------------------------- */

export const selectActiveConversation = (state) => state.contact.active.conversation;
export const selectActiveMessages = (state) => state.contact.active.messages;
export const selectQuickQuestions = (state) => state.contact.active.quickQuestions;
export const selectActiveStatus = (state) => ({
    conversation: state.contact.active.conversationStatus,
    messages: state.contact.active.messagesStatus,
    quickQuestions: state.contact.active.quickQuestionsStatus,
    send: state.contact.active.sendStatus,
    error: state.contact.active.error,
});
export const selectUnreadByUserTotal = (state) =>
    state.contact.userConversations.items.reduce((sum, c) => sum + (c.unreadByUser || 0), 0);

export const selectInboxItems = (state) => state.contact.inbox.items;
export const selectFilteredInboxItems = (state) => {
    const { items, unreadOnly } = state.contact.inbox;
    return unreadOnly ? items.filter((c) => (c.unreadByAdmin || 0) > 0) : items;
};
export const selectInboxStatus = (state) => state.contact.inbox.status;
export const selectInboxFilters = (state) => ({ department: state.contact.inbox.departmentFilter, status: state.contact.inbox.statusFilter });

export const selectAdminThreadConversation = (state) => state.contact.adminThread.conversation;
export const selectAdminThreadMessages = (state) => state.contact.adminThread.messages;
export const selectAdminThreadStatus = (state) => state.contact.adminThread.status;