import React, { useState } from 'react';
import { Outlet, useParams } from 'react-router';
import { Menu } from 'lucide-react';
import { UserPanelSidebar } from './.';

// Parent route for everything under /:username/* (profile, orders, cart,
// announcements). Structurally mirrors AdminLayout: a sticky column
// sidebar on desktop, an off-canvas drawer on mobile, plus a fixed mobile
// top bar since the sidebar is off-screen until opened. Only <Outlet/>
// content swaps on navigation — this shell + UserPanelSidebar stay
// mounted throughout, which is also what keeps the sidebar visible
// through a child page's own loading/error states.
function UserPanelLayout() {
    const { username } = useParams();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="flex h-dvh overflow-hidden md:h-auto md:min-h-screen md:overflow-visible">
            <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900 md:hidden">
                <span className="text-base font-semibold text-stone-900 dark:text-stone-100">My Account</span>
                <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                    aria-label="Open menu"
                >
                    <Menu size={20} />
                </button>
            </div>

            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    className="fixed inset-0 z-40 bg-stone-900/50 md:hidden"
                    aria-hidden="true"
                />
            )}

            <UserPanelSidebar
                username={username}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-white p-4 pt-20 text-stone-900 dark:bg-stone-950 dark:text-stone-100 sm:p-6 sm:pt-6 md:h-auto md:overflow-visible md:p-8">
                <Outlet />
            </main>
        </div>
    );
}

export default UserPanelLayout;