import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';

function CheckUser({ children }) {
    const { username } = useParams();
    const navigate = useNavigate();
    const status = useSelector((s) => s.user.status);
    const userData = useSelector((s) => s.user.userData);
    const authChecked = useSelector((s) => s.user.authChecked);

    useEffect(() => {
        if (!authChecked) return;

        if (!status) {
            navigate('/welcome-back', { replace: true });
            return;
        }

        if (!userData || !userData['$id']) return;

        // Blocked-user routing is handled globally by BlockedGuard (it
        // confines them to their own profile page from any route in the
        // app). This guard only needs its normal job: keep a non-blocked
        // user on their own username, keep admins out of the user area.
        const isAdmin = userData.labels?.includes('admin');
        if (isAdmin) {
            navigate('/admin', { replace: true });
            return;
        }

        if (username !== userData['$id']) {
            navigate(`/${userData['$id']}/profile`, { replace: true });
        }
    }, [authChecked, status, userData, username, navigate]);

    if (!authChecked) return null;
    if (status && (!userData || !userData['$id'])) return null;
    if (!status) return null; // redirect to /welcome-back is in flight

    return <>{children}</>;
}

export default CheckUser;