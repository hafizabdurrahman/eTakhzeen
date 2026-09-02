import React, { useEffect, useState } from 'react'
import { Outlet } from "react-router";
import { Provider, useDispatch } from 'react-redux';
import { Header, Footer } from './components';
import { ThemeProvider } from './context/theme';
import store from './store/store'
import auth from './backend/auth';
import { login, logout } from './store/slices/userSlice';
import { BlockedGuard, AnnouncementPopup } from './components';

// Runs once, verifies the Appwrite session, and syncs Redux.
// Rendered as a child of <Provider> so useDispatch has store access.
function AuthBootstrap() {
    const dispatch = useDispatch();

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const userData = await auth.getCurrentUser();
            if (cancelled) return;

            if (userData && userData !== 'User not found') {
                dispatch(login(userData));
            } else {
                dispatch(logout());
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [dispatch]);

    return null;
}

function Layout() {
    const [themeMode, setThemeMode] = useState('dark');

    function toggleTheme() {
        setThemeMode(prev => (prev === "dark" ? "light" : "dark"));
    }

    useEffect(() => {
        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add(themeMode);
    }, [themeMode]);

    return (
        <Provider store={store}>
            <ThemeProvider value={{ themeMode, toggleTheme }}>
                <AuthBootstrap />
                <Header />
                    <BlockedGuard>
                        <AnnouncementPopup />
                        <Outlet />
                    </BlockedGuard>
                <Footer />
            </ThemeProvider>
        </Provider>
    )
}

export default Layout