import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch } from 'react-redux';
import { startAdminInitiatedConversation, openAdminThread } from '../../store/slices/contactSlice';

// Usage inside AdminUserProfile.jsx, wherever the profile row is in scope:
//   <ContactUserButton targetUser={profileRow} />
function ContactUserButton({ targetUser, department = 'admin' }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    async function handleClick() {
        setLoading(true);
        try {
            const convo = await dispatch(startAdminInitiatedConversation({
                targetUserId: targetUser.username, targetUserName: targetUser.name, targetUserEmail: targetUser.email, department,
            })).unwrap();
            await dispatch(openAdminThread(convo));
            navigate(`/admin/contact/${convo.$id}`);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return <button type="button" onClick={handleClick} disabled={loading}>{loading ? 'Opening…' : 'Contact'}</button>;
}

export default ContactUserButton;