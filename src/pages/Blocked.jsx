import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import auth from '../backend/auth'; // ⚠️ adjust path to match where auth.js actually lives
import { logout as logoutAction } from '../store/slices/userSlice'; // ⚠️ adjust this path to wherever userSlice.js actually lives

// Static "your account is blocked" page. Reads everything from the store —
// no extra network call, since userData already carries the blocked flag
// after the first fetch (see auth.js's getCurrentUser()).
function Blocked() {
    const userData = useSelector((s) => s.user.userData);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [loggingOut, setLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState('');

    async function handleLogout() {
        setLoggingOut(true);
        setLogoutError('');

        const result = await auth.logout();

        if (!result) {
            // Session deletion failed server-side — don't clear local state
            // as if they're logged out when Appwrite still thinks they have
            // an active session.
            setLoggingOut(false);
            setLogoutError('Failed to log out. Please try again.');
            return;
        }

        dispatch(logoutAction());
        navigate('/welcome-back', { replace: true });
    }

    return (
        <div className="max-w-md mx-auto mt-20 text-center space-y-4">
            <h1 className="text-2xl font-semibold text-red-400">Account Blocked</h1>

            <p className="text-neutral-400">
                {userData?.username ? `${userData.username}, your` : 'Your'} account
                {userData?.email && <> ({userData.email})</>} has been blocked by an
                administrator. If you believe this is a mistake, please contact support.
            </p>

            {logoutError && <p className="text-red-400 text-sm">{logoutError}</p>}

            <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
                {loggingOut ? 'Logging out...' : 'Log Out'}
            </button>
        </div>
    );
}

export default Blocked;