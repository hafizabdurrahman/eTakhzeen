import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import reviewService from '../../backend/reviews'; // ⚠️ adjust path

// Fetches one page of reviews for a product. Called with offset 0 on
// mount/product change, and with a growing offset for "load more".
export const fetchReviews = createAsyncThunk(
    'reviews/fetchReviews',
    async ({ productId, limit = 4, offset = 0 }) => {
        const { rows, total } = await reviewService.getReviews({ productId, limit, offset });
        return { rows, total, offset };
    }
);

// Separate from fetchReviews so the rating summary (average + count) can
// reflect ALL reviews even before more pages have been loaded.
export const fetchReviewStats = createAsyncThunk(
    'reviews/fetchReviewStats',
    async ({ productId }) => reviewService.getReviewStats({ productId })
);

export const submitReview = createAsyncThunk(
    'reviews/submitReview',
    async ({ productId, rating, comment, reviewerName }, { rejectWithValue }) => {
        const result = await reviewService.addReview({ productId, rating, comment, reviewerName });
        if (!result) return rejectWithValue('Failed to submit review. Please try again.');
        return result;
    }
);

const initialState = {
    items: [],                          // currently loaded page(s) of reviews, newest first
    total: 0,                           // total review count for the product (from the last fetch)
    stats: { count: 0, average: 0 },    // rating summary, kept independent of pagination
    fetchStatus: 'idle',                // 'idle' | 'loading' | 'succeeded' | 'failed'
    submitStatus: 'idle',               // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
};

const reviewSlice = createSlice({
    name: 'reviews',
    initialState,
    reducers: {
        resetReviewStatus(state) {
            state.submitStatus = 'idle';
            state.error = null;
        },
        // Call when navigating to a different product, before re-fetching,
        // so the previous product's reviews don't flash on screen.
        clearReviews(state) {
            state.items = [];
            state.total = 0;
            state.stats = { count: 0, average: 0 };
            state.fetchStatus = 'idle';
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchReviews.pending, (state) => {
                state.fetchStatus = 'loading';
            })
            .addCase(fetchReviews.fulfilled, (state, action) => {
                state.fetchStatus = 'succeeded';
                const { rows, total, offset } = action.payload;
                // offset 0 = fresh load (replace); anything else = "load more" (append)
                state.items = offset === 0 ? rows : [...state.items, ...rows];
                state.total = total;
            })
            .addCase(fetchReviews.rejected, (state) => {
                state.fetchStatus = 'failed';
            })
            .addCase(fetchReviewStats.fulfilled, (state, action) => {
                state.stats = action.payload;
            })
            .addCase(submitReview.pending, (state) => {
                state.submitStatus = 'loading';
                state.error = null;
            })
            .addCase(submitReview.fulfilled, (state, action) => {
                state.submitStatus = 'succeeded';
                // Show the new review immediately without a re-fetch.
                state.items = [action.payload, ...state.items];
                state.total += 1;
                const newCount = state.stats.count + 1;
                state.stats = {
                    count: newCount,
                    average: (state.stats.average * state.stats.count + Number(action.payload.rating || 0)) / newCount,
                };
            })
            .addCase(submitReview.rejected, (state, action) => {
                state.submitStatus = 'failed';
                state.error = action.payload || action.error.message;
            });
    },
});

export const { resetReviewStatus, clearReviews } = reviewSlice.actions;
export default reviewSlice.reducer;