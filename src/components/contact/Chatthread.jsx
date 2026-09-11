import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Client } from 'appwrite';
import envVars from '../../../envVars/vars'; // ⚠️ adjust path
import contactService from '../../backend/contact'; // ⚠️ adjust path
import responseService from '../../backend/main'; // ⚠️ adjust path (this is your "Main"/Response table service)
import conversationService from '../../backend/conversation'; // ⚠️ adjust path
import { setMessagesFromParts, addMessage, setMessagesLoading, clearMessages } from '../../store/slices/messagesSlice'; // ⚠️ adjust path
import { upsertConversation } from '../../store/slices/conversationsSlice'; // ⚠️ adjust path
import { MessageBubble, MessageComposer } from '../.';

/**
 * currentRole: 'user' | 'admin' — which side of the conversation the person
 * viewing this thread is on. Controls which table a new message is written
 * to, and which unread counter gets reset/incremented.
 */
export default function ChatThread({ conversation, currentRole, currentUserId, currentUserName = null }) {
    const dispatch = useDispatch();
    const messages = useSelector((state) => state.messages.items);
    const loading = useSelector((state) => state.messages.loading);

    const conversationId = conversation?.$id;

    const loadMessages = useCallback(async () => {
        if (!conversationId) return;
        dispatch(setMessagesLoading(true));
        const [userMessages, adminMessages] = await Promise.all([
            contactService.listByConversation(conversationId),
            responseService.listByConversation(conversationId),
        ]);
        dispatch(setMessagesFromParts({ userMessages, adminMessages }));
        dispatch(setMessagesLoading(false));
    }, [conversationId, dispatch]);

    // Load history + reset the viewer's own unread count whenever the open
    // thread changes.
    useEffect(() => {
        if (!conversationId) {
            dispatch(clearMessages());
            return;
        }
        loadMessages();

        if (currentRole === 'admin') {
            contactService.markAllRead(conversationId);
            conversationService.resetUnread({ conversationId, forRole: 'admin' });
        } else {
            responseService.markAllRead(conversationId);
            conversationService.resetUnread({ conversationId, forRole: 'user' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId, currentRole]);

    // Realtime — live-append new rows from either table into this thread.
    // ⚠️ Verify this channel string against your Appwrite SDK version —
    // TablesDB realtime channels follow the pattern
    // `databases.{databaseId}.tables.{tableId}.rows`; older Databases-API
    // projects use `.collections.{id}.documents` instead.
    useEffect(() => {
        if (!conversationId) return undefined;

        const client = new Client()
            .setEndpoint(envVars.eTakhzeenURL)
            .setProject(envVars.eTakhzeenProjectId);

        const channels = [
            `databases.${envVars.eTakhzeenDatabaseId}.tables.${envVars.eTakhzeenContactTableId}.rows`,
            `databases.${envVars.eTakhzeenDatabaseId}.tables.${envVars.eTakhzeenResponseTable}.rows`,
        ];

        const unsubscribe = client.subscribe(channels, (event) => {
            const row = event.payload;
            if (!row || row.conversationId !== conversationId) return;
            if (!event.events.some((e) => e.endsWith('.create'))) return;

            const isFromContactTable = event.channels.some((c) => c.includes(envVars.eTakhzeenContactTableId));
            const role = isFromContactTable ? 'user' : 'admin';

            // addMessage dedupes by $id, so this is safe even for a message
            // this viewer just sent themself a moment ago via sendMessage().
            dispatch(addMessage({ ...row, role }));

            // Only mark-as-read when the message came from the OTHER side —
            // the thread is open on screen right now, so it counts as seen.
            if (role !== currentRole) {
                if (currentRole === 'admin') {
                    contactService.markAllRead(conversationId);
                    conversationService.resetUnread({ conversationId, forRole: 'admin' });
                } else {
                    responseService.markAllRead(conversationId);
                    conversationService.resetUnread({ conversationId, forRole: 'user' });
                }
            }
        });

        return () => unsubscribe();
    }, [conversationId, currentRole, dispatch]);

    const sendMessage = async (content) => {
        if (!conversationId) return;
        const preview = content.length > 80 ? `${content.slice(0, 80)}…` : content;

        if (currentRole === 'user') {
            const row = await contactService.send({
                conversationId,
                userId: currentUserId,
                department: conversation.department,
                content,
            });
            if (row) {
                dispatch(addMessage({ ...row, role: 'user' }));
                await conversationService.markUserMessage({ conversationId, preview });
                dispatch(upsertConversation({ ...conversation, lastMessage: preview, lastSenderRole: 'user' }));
            }
        } else {
            const row = await responseService.send({
                conversationId,
                userId: conversation.userId,
                department: conversation.department,
                adminId: currentUserId,
                adminName: currentUserName,
                content,
            });
            if (row) {
                dispatch(addMessage({ ...row, role: 'admin' }));
                await conversationService.markAdminMessage({ conversationId, preview });
                dispatch(upsertConversation({ ...conversation, lastMessage: preview, lastSenderRole: 'admin' }));
            }
        }
    };

    if (!conversationId) {
        return <div className="chat-thread chat-thread--empty">Select a conversation to start chatting.</div>;
    }

    return (
        <div className="chat-thread">
            <div className="chat-thread__messages">
                {loading && <div className="chat-thread__loading">Loading messages...</div>}
                {!loading && messages.length === 0 && <div className="chat-thread__empty">No messages yet.</div>}
                {messages.map((message) => (
                    <MessageBubble key={message.$id} message={message} />
                ))}
            </div>
            <MessageComposer onSend={sendMessage} disabled={loading} />
        </div>
    );
}