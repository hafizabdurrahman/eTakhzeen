import { configureStore } from "@reduxjs/toolkit";
import {
    productsReducer,
    userReducer,
    cartReducer,
    contactReducer,
    ordersReducer,
    announcementsReducer,
    conversationsReducer,
    messagesReducer,
    faqReducer,
    reviewsReducer,
    returnReducer
} from "./slices";

const store = configureStore({
    reducer: {
        user: userReducer,
        products: productsReducer,
        cart: cartReducer,
        contact: contactReducer,
        orders: ordersReducer,
        announcements: announcementsReducer,
        conversations: conversationsReducer,
        messages: messagesReducer,
        faq: faqReducer,
        reviews: reviewsReducer,
        returns: returnReducer,
    }
});

export default store;