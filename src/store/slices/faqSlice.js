import { createSlice } from '@reduxjs/toolkit';

const faqSlice = createSlice({
    name: 'faq',
    initialState: {
        items: [],
        loading: false,
    },
    reducers: {
        setFaqItems: (state, action) => {
            state.items = action.payload;
        },
        setFaqLoading: (state, action) => {
            state.loading = action.payload;
        },
    },
});

export const { setFaqItems, setFaqLoading } = faqSlice.actions;

export default faqSlice.reducer;