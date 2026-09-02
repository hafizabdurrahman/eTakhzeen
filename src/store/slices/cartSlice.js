import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import userService from "../../backend/user"; // ⚠️ adjust to wherever your user-table service actually lives
import productService from "../../backend/service"; // ⚠️ adjust path

const initialState = {
    items: [],      // [{ product: {...fullProductRow}, quantity }]
    status: 'idle', // idle | loading | saving | failed
    error: null,
}

// Redux keeps full product objects for display; the server only ever needs
// productId + quantity. This strips it back down before every write so the
// `cart` text column stays small and never holds stale product data.
function toRawCart(items) {
    return items.map((i) => ({ productId: i.product['$id'], quantity: i.quantity }));
}

async function persist(userId, items) {
    await userService.updateUserCart({ userId, cart: JSON.stringify(toRawCart(items)) });
}

// Reads the user's cart column (JSON text, or null/empty for an untouched
// cart), parses it, then fetches each referenced product so the UI has
// something to render. Products deleted since the cart was saved are
// silently dropped rather than crashing the page.
export const loadCart = createAsyncThunk(
    'cart/loadCart',
    async ({ userId }) => {
        const raw = await userService.getUserCart({ userId });
        let parsed = [];
        try {
            parsed = raw ? JSON.parse(raw) : [];
        } catch {
            parsed = []; // corrupt/legacy value — fail safe instead of crashing
        }
        if (!Array.isArray(parsed) || parsed.length === 0) return [];

        const products = await Promise.all(
            parsed.map((entry) => productService.getProduct({ rowId: entry.productId }))
        );

        return parsed
            .map((entry, i) => ({ product: products[i], quantity: entry.quantity }))
            .filter((item) => item.product); // product was deleted — drop the line
    }
);

export const addToCart = createAsyncThunk(
    'cart/addToCart',
    async ({ userId, product, quantity = 1 }, { getState }) => {
        const current = getState().cart.items;
        const existing = current.find((i) => i.product['$id'] === product['$id']);
        const next = existing
            ? current.map((i) =>
                  i.product['$id'] === product['$id']
                      ? { ...i, quantity: i.quantity + quantity }
                      : i
              )
            : [...current, { product, quantity }];
        await persist(userId, next);
        return next;
    }
);

export const removeFromCart = createAsyncThunk(
    'cart/removeFromCart',
    async ({ userId, productId }, { getState }) => {
        const current = getState().cart.items;
        const next = current.filter((i) => i.product['$id'] !== productId);
        await persist(userId, next);
        return next;
    }
);

export const updateCartQuantity = createAsyncThunk(
    'cart/updateCartQuantity',
    async ({ userId, productId, quantity }, { getState }) => {
        const current = getState().cart.items;
        const next = quantity <= 0
            ? current.filter((i) => i.product['$id'] !== productId)
            : current.map((i) => (i.product['$id'] === productId ? { ...i, quantity } : i));
        await persist(userId, next);
        return next;
    }
);

export const clearCart = createAsyncThunk(
    'cart/clearCart',
    async ({ userId }) => {
        await persist(userId, []);
        return [];
    }
);

export const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        // Local-only wipe (e.g. on logout). Doesn't touch the server —
        // logging out shouldn't erase what's saved for next time.
        resetCartLocal: (s) => {
            s.items = [];
            s.status = 'idle';
            s.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadCart.pending, (s) => { s.status = 'loading'; s.error = null; })
            .addCase(loadCart.fulfilled, (s, a) => { s.status = 'idle'; s.items = a.payload; })
            .addCase(loadCart.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message; })

            .addCase(addToCart.pending, (s) => { s.status = 'saving'; })
            .addCase(addToCart.fulfilled, (s, a) => { s.status = 'idle'; s.items = a.payload; })
            .addCase(addToCart.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message; })

            .addCase(removeFromCart.pending, (s) => { s.status = 'saving'; })
            .addCase(removeFromCart.fulfilled, (s, a) => { s.status = 'idle'; s.items = a.payload; })
            .addCase(removeFromCart.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message; })

            .addCase(updateCartQuantity.pending, (s) => { s.status = 'saving'; })
            .addCase(updateCartQuantity.fulfilled, (s, a) => { s.status = 'idle'; s.items = a.payload; })
            .addCase(updateCartQuantity.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message; })

            .addCase(clearCart.pending, (s) => { s.status = 'saving'; })
            .addCase(clearCart.fulfilled, (s, a) => { s.status = 'idle'; s.items = a.payload; })
            .addCase(clearCart.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message; });
    }
})

export const { resetCartLocal } = cartSlice.actions;

// Derived cart count for a header badge: useSelector(selectCartCount)
export const selectCartCount = (state) => state.cart.items.reduce((sum, i) => sum + i.quantity, 0);

export default cartSlice.reducer;