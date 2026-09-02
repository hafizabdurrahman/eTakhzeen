import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { adminNavItems } from '../adminNavConfig';

function AdminLayout() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen">
            <aside
                className={`shrink-0 border-r border-neutral-800 bg-neutral-950 text-neutral-200 transition-all duration-200 ${
                    collapsed ? 'w-16' : 'w-60'
                }`}
            >
                <div className="flex items-center justify-between px-3 py-5">
                    {!collapsed && <span className="text-lg font-semibold">Admin Panel</span>}
                    <button
                        onClick={() => setCollapsed((c) => !c)}
                        className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                <nav className="flex flex-col gap-1 px-2">
                    {adminNavItems.map(({ label, path, end, icon: Icon }) => (
                        <NavLink
                            key={path || 'index'}
                            to={path}
                            end={end}
                            title={collapsed ? label : undefined}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                                    collapsed ? 'justify-center' : ''
                                } ${
                                    isActive
                                        ? 'bg-neutral-800 text-white font-medium'
                                        : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100'
                                }`
                            }
                        >
                            {Icon && <Icon size={18} className="shrink-0" />}
                            {!collapsed && <span>{label}</span>}
                        </NavLink>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 p-6">
                <Outlet />
            </main>
        </div>
    );
}

export default AdminLayout;