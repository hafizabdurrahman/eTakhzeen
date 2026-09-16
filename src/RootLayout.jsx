import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { Provider, useDispatch } from 'react-redux';
import { ThemeProvider } from './context/theme';
import store from './store/store';
import auth from './backend/auth';
import { login, logout } from './store/slices/userSlice';
import { BlockedGuard } from './components';
import AuthLayout from './AuthLayout';

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

// Sits at the ROOT of the whole route tree — the one place Provider/
// ThemeProvider/AuthBootstrap/BlockedGuard get mounted, so every route
// (storefront, user panel, admin panel) gets Redux, theme, session
// bootstrap, and the blocked-account check. This deliberately has NO
// Header/Footer/main wrapper — that chrome now lives one level down, in
// StorefrontLayout, so admin/user panels can skip it while still getting
// everything here.
function RootLayout() {
    const [themeMode, setThemeMode] = useState('dark');

    function toggleTheme() {
        setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }

    useEffect(() => {
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(themeMode);
    }, [themeMode]);

    return (
        <Provider store={store}>
            <ThemeProvider value={{ themeMode, toggleTheme }}>
                <AuthBootstrap />
                <BlockedGuard>
                    <Outlet />
                </BlockedGuard>
            </ThemeProvider>
        </Provider>
    );
}

export default RootLayout;