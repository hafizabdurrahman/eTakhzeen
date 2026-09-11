import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';

function RedirectIfAuthenticated({ children }) {
    const navigate = useNavigate();
    const status = useSelector((s) => s.user.status);
    const userData = useSelector((s) => s.user.userData);
    const authChecked = useSelector((s) => s.user.authChecked);

    useEffect(() => {
        if (!authChecked) return; // still verifying — decide nothing yet

        if (!status) return; // confirmed logged out — this route is for them

        if (!userData || !userData['$id']) return; // logged in, data still resolving

        if (userData.blocked) {
            // Land on their profile page first — that's where the blocked
            // alert lives. BlockedGuard takes over from there if they try
            // to go anywhere else.
            navigate(`/${userData['$id']}/profile`, { replace: true });
            return;
        }

        const isAdmin = userData.labels?.includes('admin');
        navigate(isAdmin ? '/admin' : `/${userData['$id']}/profile`, { replace: true });
    }, [authChecked, status, userData, navigate]);

    if (!authChecked) return null;
    if (status && (!userData || !userData['$id'])) return null;
    if (!status) return <>{children}</>;
    return null; // logged in, redirect in flight
}

export default RedirectIfAuthenticated;