import { createSlice } from '@reduxjs/toolkit';

const conversationsSlice = createSlice({
    name: 'conversations',
    initialState: {
        list: [],       // admin inbox rows, or the current user's own thread list
        current: null,  // the conversation row currently open in the chat window
        loading: false,
    },
    reducers: {
        setConversations: (state, action) => {
            state.list = action.payload;
        },
        setCurrentConversation: (state, action) => {
            state.current = action.payload;
        },
        // Insert a brand-new conversation, or replace it in place if it
        // already exists in the list (e.g. after an unread count changes).
        upsertConversation: (state, action) => {
            const updated = action.payload;
            const idx = state.list.findIndex((c) => c.$id === updated.$id);
            if (idx >= 0) state.list[idx] = updated;
            else state.list.unshift(updated);
            if (state.current?.$id === updated.$id) state.current = updated;
        },
        setConversationsLoading: (state, action) => {
            state.loading = action.payload;
        },
        clearConversations: (state) => {
            state.list = [];
            state.current = null;
        },
    },
});

export const {
    setConversations,
    setCurrentConversation,
    upsertConversation,
    setConversationsLoading,
    clearConversations,
} = conversationsSlice.actions;

export default conversationsSlice.reducer;