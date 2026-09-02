import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
    name: "user",
    initialState: {
        status: false,
        userData: {},
        allCols: null,
        authChecked: false, // true once the initial session check has resolved
    },
    reducers: {
        login: function (s, a) {
            s.status = true;
            s.userData = a.payload || {};
            s.allCols = null;
            s.authChecked = true;
        },
        signup: function (s, a) {
            s.status = true;
            s.userData = a.payload || {};
            s.authChecked = true;
        },
        logout: function (s, a) {
            s.status = false;
            s.userData = {};
            s.authChecked = true;
        },
        setUser: function (s, a) {
            s.allCols = a.payload;
        },
        setAuthChecked: function (s, a) {
            s.authChecked = a.payload;
        },
    },
});

export const { login, logout, signup, setUser, setAuthChecked } = userSlice.actions;

export default userSlice.reducer;