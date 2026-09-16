import React from 'react';
import { Outlet, useLocation } from 'react-router';

function AuthLayout() {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-white dark:bg-stone-900">
            <Outlet key={location.pathname} />
        </div>
    );
}

export default AuthLayout;