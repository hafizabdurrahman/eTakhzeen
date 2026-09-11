import React from 'react';
import { Outlet } from 'react-router';
import { Header, Footer, AnnouncementPopup } from './components';

// Adds the public-site chrome (Header, Footer, the announcement popup)
// around storefront pages only. Admin and user-panel routes render
// directly under RootLayout instead, bypassing this component entirely —
// that's what removes Header/Footer from those panels.
function StorefrontLayout() {
    return (
        <>
            <Header />
            <main className="min-h-[calc(100vh-8rem)] bg-white text-stone-900 dark:bg-stone-950 dark:text-stone-100">
                <AnnouncementPopup />
                <Outlet />
            </main>
            <Footer />
        </>
    );
}

export default StorefrontLayout;