import { configureStore } from "@reduxjs/toolkit";
import { productsReducer, userReducer, cartReducer, contactReducer, ordersReducer, announcementsReducer } from "./slices";

const store = configureStore({
    reducer: {
        user: userReducer,
        products: productsReducer,
        cart: cartReducer,
        contact: contactReducer,
        orders: ordersReducer,
        announcements: announcementsReducer
    }
});

export default store;