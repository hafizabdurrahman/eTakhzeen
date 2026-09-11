import { createSlice, createAsyncThunk, isAnyOf } from "@reduxjs/toolkit";
import returnService from "../../backend/return"; // ⚠️ adjust path to match your backend/ location

const initialState = {
    // ---- user-facing "my returns" ----
    list: {
        items: [],
        status: 'idle', // idle | loading | succeeded | failed
        error: null,
    },
    create: {
        status: 'idle',
        error: null,
    },

    // Latest return doc per orderId — lets an order row show the right
    // button state (none yet / Requested / Approved / Rejected / Denied)
    // without re-deriving it from list.items every render.
    byOrderId: {},

    // ---- admin ----
    adminList: {
        items: [],
        status: 'idle',
        error: null,
    },
    adminDecision: {
        status: 'idle',
        error: null,
    },
};

// ---- user-facing ----

export const fetchMyReturns = createAsyncThunk(
    'returns/fetchMyReturns',
    async ({ username }) => returnService.getUserReturns({ username })
);

// Look up just one order's latest return — cheaper than loading the whole
// list when you only need to gate a single order row's button.
export const fetchReturnForOrder = createAsyncThunk(
    'returns/fetchReturnForOrder',
    async ({ orderId }) => {
        const returnDoc = await returnService.getLatestReturnForOrder({ orderId });
        return { orderId, returnDoc }; // returnDoc is null if none exists yet
    }
);

export const createReturn = createAsyncThunk(
    'returns/createReturn',
    async ({ order, username, reason }, { rejectWithValue }) => {
        const created = await returnService.createReturnRequest({ order, username, reason });
        if (!created) {
            return rejectWithValue('Could not submit return request — check the order status, return window, or an existing request.');
        }
        return created;
    }
);

// ---- admin ----

export const fetchAllReturnsAdmin = createAsyncThunk(
    'returns/fetchAllReturnsAdmin',
    async () => returnService.getAllReturns()
);

export const searchReturnsAdmin = createAsyncThunk(
    'returns/searchReturnsAdmin',
    async ({ term }) => returnService.searchReturns({ term })
);

export const decideReturnAdmin = createAsyncThunk(
    'returns/decideReturnAdmin',
    async ({ rowId, decision, adminNote, decidedBy }, { rejectWithValue }) => {
        const updated = await returnService.decideReturn({ rowId, decision, adminNote, decidedBy });
        if (!updated) return rejectWithValue('Failed to record the decision.');
        return updated;
    }
);

const returnSlice = createSlice({
    name: 'returns',
    initialState,
    reducers: {
        clearCreateStatus: (s) => { s.create = { status: 'idle', error: null }; },
        clearAdminDecisionStatus: (s) => { s.adminDecision = { status: 'idle', error: null }; },
    },
    extraReducers: (builder) => {
        builder
            // ---- user list ----
            .addCase(fetchMyReturns.pending, (s) => { s.list.status = 'loading'; s.list.error = null; })
            .addCase(fetchMyReturns.fulfilled, (s, a) => {
                s.list.status = 'succeeded';
                s.list.items = a.payload;
                a.payload.forEach((r) => { s.byOrderId[r.orderId] = r; });
            })
            .addCase(fetchMyReturns.rejected, (s, a) => { s.list.status = 'failed'; s.list.error = a.error.message; })

            // ---- per-order lookup ----
            .addCase(fetchReturnForOrder.fulfilled, (s, a) => {
                s.byOrderId[a.payload.orderId] = a.payload.returnDoc;
            })

            // ---- create ----
            .addCase(createReturn.pending, (s) => { s.create.status = 'loading'; s.create.error = null; })
            .addCase(createReturn.fulfilled, (s, a) => {
                s.create.status = 'succeeded';
                s.list.items.unshift(a.payload);
                s.byOrderId[a.payload.orderId] = a.payload;
            })
            .addCase(createReturn.rejected, (s, a) => {
                s.create.status = 'failed';
                s.create.error = a.payload || a.error.message;
            })

            // ---- admin decision ----
            .addCase(decideReturnAdmin.pending, (s) => { s.adminDecision.status = 'loading'; s.adminDecision.error = null; })
            .addCase(decideReturnAdmin.fulfilled, (s, a) => {
                s.adminDecision.status = 'succeeded';
                const idx = s.adminList.items.findIndex((r) => r.$id === a.payload.$id);
                if (idx !== -1) s.adminList.items[idx] = a.payload;
                s.byOrderId[a.payload.orderId] = a.payload;
                const uIdx = s.list.items.findIndex((r) => r.$id === a.payload.$id);
                if (uIdx !== -1) s.list.items[uIdx] = a.payload;
            })
            .addCase(decideReturnAdmin.rejected, (s, a) => {
                s.adminDecision.status = 'failed';
                s.adminDecision.error = a.payload || a.error.message;
            })

            // ---- admin list: fetchAll / search share the same shape ----
            .addMatcher(
                isAnyOf(fetchAllReturnsAdmin.pending, searchReturnsAdmin.pending),
                (s) => { s.adminList.status = 'loading'; s.adminList.error = null; }
            )
            .addMatcher(
                isAnyOf(fetchAllReturnsAdmin.fulfilled, searchReturnsAdmin.fulfilled),
                (s, a) => { s.adminList.status = 'succeeded'; s.adminList.items = a.payload; }
            )
            .addMatcher(
                isAnyOf(fetchAllReturnsAdmin.rejected, searchReturnsAdmin.rejected),
                (s, a) => { s.adminList.status = 'failed'; s.adminList.error = a.error.message; }
            );
    },
});

export const { clearCreateStatus, clearAdminDecisionStatus } = returnSlice.actions;
export default returnSlice.reducer;