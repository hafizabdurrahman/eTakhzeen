import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';
import authService from '../../backend/auth'; // ⚠️ adjust path
import { logout } from '../../store/slices/userSlice'; // ⚠️ adjust path
import { resetCartLocal } from '../../store/slices/cartSlice'; // ⚠️ adjust path — clears the cart from the UI without touching the saved server-side cart, per cartSlice.js's own comment on resetCartLocal

function Logout({ collapsed = false }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [loggingOut, setLoggingOut] = useState(false);

    async function handleLogout() {
        setLoggingOut(true);
        await authService.logout();
        setLoggingOut(false);

        // Clear local state regardless of the server call's result — even if
        // the session was already gone server-side, there's nothing left to
        // keep logged in locally.
        dispatch(logout());
        dispatch(resetCartLocal());
        navigate('/');
    }

    return (
        <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300 ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Logout' : undefined}
        >
            <LogOut size={18} />
            {!collapsed && (loggingOut ? 'Logging out...' : 'Logout')}
        </button>
    );
}

export default Logout;