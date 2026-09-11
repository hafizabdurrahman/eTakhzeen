import React from 'react';

export default function MessageBubble({ message }) {
    const isAdmin = message.role === 'admin';

    return (
        <div className={`message-bubble ${isAdmin ? 'message-bubble--admin' : 'message-bubble--user'}`}>
            {isAdmin && message.adminName && (
                <div className="message-bubble__sender">{message.adminName}</div>
            )}
            <div className="message-bubble__content">{message.content}</div>
            <div className="message-bubble__time">
                {new Date(message.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    );
}