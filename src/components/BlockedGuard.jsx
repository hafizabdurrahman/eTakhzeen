import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router';

// Confines a blocked user to exactly one route: their own profile page
// (where the "you're blocked" alert lives). Any other path — a nav link,
// a hand-typed URL, a changed slug, browser back/forward — bounces them
// to /blocked instead. Runs at the Layout level, above <Outlet />, so it
// covers every route in the app, including ones with no per-route guard
// of their own (products, cart, contact, checkout, etc).
function BlockedGuard({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const status = useSelector((s) => s.user.status);
    const userData = useSelector((s) => s.user.userData);
    const authChecked = useSelector((s) => s.user.authChecked);

    useEffect(() => {
        if (!authChecked || !status || !userData?.blocked) return;

        const ownProfilePath = `/user/${userData['$id']}`;
        const allowedPaths = [ownProfilePath, '/blocked'];

        if (!allowedPaths.includes(location.pathname)) {
            navigate('/blocked', { replace: true });
        }
    }, [authChecked, status, userData, location.pathname, navigate]);

    return <>{children}</>;
}

export default BlockedGuard;