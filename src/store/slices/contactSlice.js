import { createSlice } from "@reduxjs/toolkit";

const contactSlice = createSlice({
    name: "contact",
    initialState: {
        userId: null,
        contactDetails: null,
    },
    reducers: {
        setContactInfo: (s, a) => {
            s.userId = a.payload;
            s.contactDetails = a.payload;
        },
        getContactInfo: (s, a) => {
            s.userId = a.payload;
            s.contactDetails = a.payload;
        }
    }
});

export const { setContactInfo, getContactInfo } = contactSlice.reducer;

export default contactSlice.reducer;