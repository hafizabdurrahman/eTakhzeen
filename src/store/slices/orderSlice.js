import { createSlice, createAsyncThunk, isAnyOf } from "@reduxjs/toolkit";
import orderService from "../../backend/order"; // ⚠️ adjust path to match your backend/ location

const initialState = {
    // ---- user-facing "my orders" ----
    list: {
        items: [],
        status: 'idle', // idle | loading | succeeded | failed
        error: null,
    },
    current: {
        item: null,
        status: 'idle',
        error: null,
    },
    cancel: {
        status: 'idle', // idle | loading | succeeded | failed
        error: null,
    },

    // ---- admin ----
    adminList: {
        items: [],
        status: 'idle',
        error: null,
    },
    adminUpdate: {
        status: 'idle',
        error: null,
    },
    adminDelete: {
        status: 'idle',
        error: null,
    },
};

// ---- user-facing ----

export const fetchUserOrders = createAsyncThunk(
    'orders/fetchUserOrders',
    async ({ username }) => orderService.getUserOrders({ username })
);

export const fetchOrder = createAsyncThunk(
    'orders/fetchOrder',
    async ({ rowId }) => orderService.getOrder({ rowId })
);

export const cancelUserOrder = createAsyncThunk(
    'orders/cancelUserOrder',
    async ({ rowId }, { rejectWithValue }) => {
        const updated = await orderService.cancelOrder({ rowId });
        if (!updated) {
            return rejectWithValue('Could not cancel — order may have already moved past Pending.');
        }
        return updated;
    }
);

// ---- admin ----

export const fetchAllOrdersAdmin = createAsyncThunk(
    'orders/fetchAllOrdersAdmin',
    async () => orderService.getAllOrders()
);

// Exact-match fetch for "View Orders" from a user's admin profile page —
// reuses the same query as the user-facing list, just called by an admin.
export const fetchOrdersForUsernameAdmin = createAsyncThunk(
    'orders/fetchOrdersForUsernameAdmin',
    async ({ username }) => orderService.getUserOrders({ username })
);

export const searchOrdersAdmin = createAsyncThunk(
    'orders/searchOrdersAdmin',
    async ({ term }) => orderService.searchOrders({ term })
);

export const updateOrderAdmin = createAsyncThunk(
    'orders/updateOrderAdmin',
    async ({ rowId, data }, { rejectWithValue }) => {
        const updated = await orderService.adminUpdateOrder({ rowId, data });
        if (!updated) return rejectWithValue('Failed to update order.');
        return updated;
    }
);

export const deleteOrderAdmin = createAsyncThunk(
    'orders/deleteOrderAdmin',
    async ({ rowId }, { rejectWithValue }) => {
        const ok = await orderService.deleteOrder({ rowId });
        if (!ok) return rejectWithValue('Failed to delete order.');
        return { rowId };
    }
);

const orderSlice = createSlice({
    name: 'orders',
    initialState,
    reducers: {
        clearCurrentOrder: (s) => {
            s.current = { item: null, status: 'idle', error: null };
            s.cancel = { status: 'idle', error: null };
            s.adminUpdate = { status: 'idle', error: null };
        },
    },
    extraReducers: (builder) => {
        builder
            // ---- user list ----
            .addCase(fetchUserOrders.pending, (s) => { s.list.status = 'loading'; s.list.error = null; })
            .addCase(fetchUserOrders.fulfilled, (s, a) => { s.list.status = 'succeeded'; s.list.items = a.payload; })
            .addCase(fetchUserOrders.rejected, (s, a) => { s.list.status = 'failed'; s.list.error = a.error.message; })

            // ---- single order (used by both user + admin detail pages) ----
            .addCase(fetchOrder.pending, (s) => { s.current.status = 'loading'; s.current.error = null; })
            .addCase(fetchOrder.fulfilled, (s, a) => { s.current.status = 'succeeded'; s.current.item = a.payload; })
            .addCase(fetchOrder.rejected, (s, a) => { s.current.status = 'failed'; s.current.error = a.error.message; })

            // ---- user cancel ----
            .addCase(cancelUserOrder.pending, (s) => { s.cancel.status = 'loading'; s.cancel.error = null; })
            .addCase(cancelUserOrder.fulfilled, (s, a) => {
                s.cancel.status = 'succeeded';
                if (s.current.item && s.current.item.$id === a.payload.$id) {
                    s.current.item.status = 'Cancelled';
                }
                const idx = s.list.items.findIndex((o) => o.$id === a.payload.$id);
                if (idx !== -1) s.list.items[idx].status = 'Cancelled';
            })
            .addCase(cancelUserOrder.rejected, (s, a) => {
                s.cancel.status = 'failed';
                s.cancel.error = a.payload || a.error.message;
            })

            // ---- admin update ----
            .addCase(updateOrderAdmin.pending, (s) => { s.adminUpdate.status = 'loading'; s.adminUpdate.error = null; })
            .addCase(updateOrderAdmin.fulfilled, (s, a) => {
                s.adminUpdate.status = 'succeeded';
                if (s.current.item && s.current.item.$id === a.payload.$id) {
                    s.current.item = a.payload;
                }
                const idx = s.adminList.items.findIndex((o) => o.$id === a.payload.$id);
                if (idx !== -1) s.adminList.items[idx] = a.payload;
            })
            .addCase(updateOrderAdmin.rejected, (s, a) => {
                s.adminUpdate.status = 'failed';
                s.adminUpdate.error = a.payload || a.error.message;
            })

            // ---- admin delete ----
            .addCase(deleteOrderAdmin.pending, (s) => { s.adminDelete.status = 'loading'; s.adminDelete.error = null; })
            .addCase(deleteOrderAdmin.fulfilled, (s, a) => {
                s.adminDelete.status = 'succeeded';
                s.adminList.items = s.adminList.items.filter((o) => o.$id !== a.payload.rowId);
                if (s.current.item && s.current.item.$id === a.payload.rowId) {
                    s.current.item = null;
                }
            })
            .addCase(deleteOrderAdmin.rejected, (s, a) => {
                s.adminDelete.status = 'failed';
                s.adminDelete.error = a.payload || a.error.message;
            })

            // ---- admin list: fetchAll / fetchForUsername / search all
            // share the same shape, so one matcher handles all three ----
            .addMatcher(
                isAnyOf(fetchAllOrdersAdmin.pending, fetchOrdersForUsernameAdmin.pending, searchOrdersAdmin.pending),
                (s) => { s.adminList.status = 'loading'; s.adminList.error = null; }
            )
            .addMatcher(
                isAnyOf(fetchAllOrdersAdmin.fulfilled, fetchOrdersForUsernameAdmin.fulfilled, searchOrdersAdmin.fulfilled),
                (s, a) => { s.adminList.status = 'succeeded'; s.adminList.items = a.payload; }
            )
            .addMatcher(
                isAnyOf(fetchAllOrdersAdmin.rejected, fetchOrdersForUsernameAdmin.rejected, searchOrdersAdmin.rejected),
                (s, a) => { s.adminList.status = 'failed'; s.adminList.error = a.error.message; }
            );
    },
});

export const { clearCurrentOrder } = orderSlice.actions;
export default orderSlice.reducer;