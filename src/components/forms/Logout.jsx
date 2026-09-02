import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import authService from '../../backend/auth'; // ⚠️ adjust path
import { logout } from '../../store/slices/userSlice'; // ⚠️ adjust path
import { resetCartLocal } from '../../store/slices/cartSlice'; // ⚠️ adjust path — clears the cart from the UI without touching the saved server-side cart, per cartSlice.js's own comment on resetCartLocal

function Logout() {
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
            className="text-blue-300 hover:underline disabled:opacity-50"
        >
            {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
    );
}

export default Logout;