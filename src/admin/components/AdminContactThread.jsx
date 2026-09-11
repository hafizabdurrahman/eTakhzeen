import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import {
    openAdminThread, openAdminThreadById, sendAdminReply, fetchAdminThreadMessages, changeConversationStatus,
    selectAdminThreadConversation, selectAdminThreadMessages, selectAdminThreadStatus, selectInboxItems,
} from '../../store/slices/contactSlice'; // ⚠️ adjust path

const STATUS_OPTIONS = ['open', 'pending', 'resolved', 'closed'];

function AdminContactThread() {
    const { conversationId } = useParams();
    const dispatch = useDispatch();
    const { userData } = useSelector((state) => state.user);
    const inboxItems = useSelector(selectInboxItems);

    const conversation = useSelector(selectAdminThreadConversation);
    const messages = useSelector(selectAdminThreadMessages);
    const status = useSelector(selectAdminThreadStatus);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!conversationId) return;
        const row = inboxItems.find((c) => c.$id === conversationId);
        if (row) dispatch(openAdminThread(row));
        else dispatch(openAdminThreadById(conversationId)); // direct link / refresh fallback
    }, [conversationId, inboxItems, dispatch]);

    const canSend = useMemo(() => draft.trim().length > 0 && !sending, [draft, sending]);

    async function handleSend(e) {
        e.preventDefault();
        if (!canSend) return;
        setSending(true);
        try {
            await dispatch(sendAdminReply({ content: draft.trim(), adminId: userData['$id'], adminName: userData.name }));
            setDraft('');
        } finally {
            setSending(false);
        }
    }

    function refresh() {
        if (conversation?.$id) dispatch(fetchAdminThreadMessages(conversation.$id));
    }

    async function handleStatusChange(e) {
        if (conversation) await dispatch(changeConversationStatus({ conversationId: conversation.$id, status: e.target.value }));
    }

    if (status === 'loading' && !conversation) return <p>Loading…</p>;
    if (!conversation) return <p>Conversation not found.</p>;

    return (
        <div>
            <h3>{conversation.userName || conversation.userId} — {conversation.department}</h3>
            <select value={conversation.status} onChange={handleStatusChange}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" onClick={refresh}>Refresh</button>

            <div>
                {messages.map((m) => (
                    <div key={m.id} data-role={m.role}>
                        <strong>{m.role === 'admin' ? m.adminName : (conversation.userName || 'User')}:</strong> {m.content}
                    </div>
                ))}
            </div>

            <form onSubmit={handleSend}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Reply…" disabled={sending} />
                <button type="submit" disabled={!canSend}>Reply</button>
            </form>
        </div>
    );
}

export default AdminContactThread;