import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import conversationService from '../../backend/conversation'; // ⚠️ adjust path
import { setConversations, setCurrentConversation, setConversationsLoading } from '../../store/slices/conversationsSlice'; // ⚠️ adjust path
import ChatThread from '../contact/ChatThread'; // ⚠️ adjust path

/**
 * Drop this into your existing User.jsx profile page as a "Messages" tab,
 * e.g.: {activeTab === 'messages' && <ProfileContactPanel currentUser={userData} />}
 * Shows every department thread this user has ever started, and lets them
 * reopen and reply to any of them.
 */
export default function ProfileContactPanel({ currentUser }) {
    const dispatch = useDispatch();
    const conversations = useSelector((state) => state.conversations.list);
    const current = useSelector((state) => state.conversations.current);
    const loading = useSelector((state) => state.conversations.loading);

    const load = useCallback(async () => {
        if (!currentUser?.$id) return;
        dispatch(setConversationsLoading(true));
        const rows = await conversationService.listForUser(currentUser.$id);
        dispatch(setConversations(rows));
        dispatch(setConversationsLoading(false));
    }, [currentUser?.$id, dispatch]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="profile-contact-panel">
            <aside className="profile-contact-panel__list">
                {loading && <div>Loading...</div>}
                {!loading && conversations.length === 0 && <div>No conversations yet.</div>}
                {conversations.map((conversation) => (
                    <button
                        key={conversation.$id}
                        type="button"
                        className={current?.$id === conversation.$id ? 'active' : ''}
                        onClick={() => dispatch(setCurrentConversation(conversation))}
                    >
                        <span>{conversation.department}</span>
                        {conversation.unreadByUser > 0 && (
                            <span className="badge">{conversation.unreadByUser}</span>
                        )}
                        <small>{conversation.lastMessage}</small>
                    </button>
                ))}
            </aside>
            <div className="profile-contact-panel__thread">
                <ChatThread
                    conversation={current}
                    currentRole="user"
                    currentUserId={currentUser?.$id}
                />
            </div>
        </div>
    );
}