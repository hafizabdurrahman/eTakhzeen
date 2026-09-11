import { createSlice } from '@reduxjs/toolkit';

// Merges Contact (user) + Response (admin) rows into one timeline, tagging
// each with `role` so the UI knows which side of the chat to render it on.
function mergeAndSort(userMessages, adminMessages) {
    const tagged = [
        ...userMessages.map((m) => ({ ...m, role: 'user' })),
        ...adminMessages.map((m) => ({ ...m, role: 'admin' })),
    ];
    return tagged.sort((a, b) => new Date(a.$createdAt) - new Date(b.$createdAt));
}

const messagesSlice = createSlice({
    name: 'messages',
    initialState: {
        items: [],
        loading: false,
    },
    reducers: {
        // payload: { userMessages, adminMessages } — raw rows straight from
        // Contact.listByConversation() and Main.listByConversation()
        setMessagesFromParts: (state, action) => {
            const { userMessages, adminMessages } = action.payload;
            state.items = mergeAndSort(userMessages, adminMessages);
        },
        // payload: a single row that ALREADY has `role: 'user' | 'admin'` set
        addMessage: (state, action) => {
            state.items.push(action.payload);
            state.items.sort((a, b) => new Date(a.$createdAt) - new Date(b.$createdAt));
        },
        setMessagesLoading: (state, action) => {
            state.loading = action.payload;
        },
        clearMessages: (state) => {
            state.items = [];
        },
    },
});

export const { setMessagesFromParts, addMessage, setMessagesLoading, clearMessages } = messagesSlice.actions;

export default messagesSlice.reducer;