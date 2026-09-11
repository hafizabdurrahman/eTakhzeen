import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import {
    openConversation, sendMessage, fetchActiveMessages,
    selectActiveConversation, selectActiveMessages, selectQuickQuestions, selectActiveStatus,
} from '../store/slices/contactSlice'; // ⚠️ adjust path

const VALID_DEPARTMENTS = ['admin', 'manager', 'support', 'other'];

function ContactThread() {
    const { department } = useParams();
    const dispatch = useDispatch();
    const { userData } = useSelector((state) => state.user);

    const conversation = useSelector(selectActiveConversation);
    const messages = useSelector(selectActiveMessages);
    const quickQuestions = useSelector(selectQuickQuestions);
    const activeStatus = useSelector(selectActiveStatus);
    const [draft, setDraft] = useState('');

    const isValidDepartment = VALID_DEPARTMENTS.includes(department);

    useEffect(() => {
        if (!isValidDepartment || !userData?.['$id']) return;
        dispatch(openConversation({ userId: userData['$id'], userName: userData.name, userEmail: userData.email, department }));
    }, [department, userData, dispatch, isValidDepartment]);

    const canSend = useMemo(() => draft.trim().length > 0 && activeStatus.send !== 'loading', [draft, activeStatus.send]);

    async function handleSend(e) {
        e.preventDefault();
        if (!canSend) return;
        const text = draft.trim();
        setDraft('');
        await dispatch(sendMessage({ content: text }));
    }

    async function handleQuickQuestion(faqRow) {
        await dispatch(sendMessage({ content: faqRow.question, type: 'quick_question', quickQuestionId: faqRow.$id }));
    }

    function refresh() {
        if (conversation?.$id) dispatch(fetchActiveMessages(conversation.$id));
    }

    if (!isValidDepartment) return <p>Unknown contact.</p>;

    return (
        <div>
            <div>
                <h3 style={{ display: 'inline-block', marginRight: 8 }}>{department}</h3>
                <button type="button" onClick={refresh} disabled={activeStatus.messages === 'loading'}>
                    {activeStatus.messages === 'loading' ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            {activeStatus.error && <p>{activeStatus.error}</p>}

            {quickQuestions.length > 0 && (
                <div>
                    {quickQuestions.map((f) => (
                        <button key={f.$id} type="button" onClick={() => handleQuickQuestion(f)}>{f.question}</button>
                    ))}
                </div>
            )}

            <div>
                {messages.map((m) => (
                    <div key={m.id} data-role={m.role}><strong>{m.role === 'admin' ? m.adminName : 'You'}:</strong> {m.content}</div>
                ))}
                {activeStatus.messages !== 'loading' && messages.length === 0 && <p>No messages yet — say hello!</p>}
            </div>

            <form onSubmit={handleSend}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" disabled={!conversation} />
                <button type="submit" disabled={!canSend}>Send</button>
            </form>
        </div>
    );
}

export default ContactThread;