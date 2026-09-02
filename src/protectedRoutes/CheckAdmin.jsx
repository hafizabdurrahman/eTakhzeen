import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';

function CheckAdmin({ children }) {
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

        // Blocked users get sent to /blocked no matter what URL they're
        // trying to reach — checked before the admin-role check below.
        if (userData.blocked) {
            navigate('/blocked', { replace: true });
            return;
        }

        const isAdmin = userData.labels?.includes('admin');
        if (!isAdmin) {
            navigate(`/user/${userData['$id']}`, { replace: true });
        }
    }, [authChecked, status, userData, navigate]);

    if (!authChecked) return null;
    if (userData?.blocked) return null; // redirect to /blocked is in flight

    const isAdmin = userData?.labels?.includes('admin');
    if (status && isAdmin) return <>{children}</>;

    return null;
}

export default CheckAdmin;