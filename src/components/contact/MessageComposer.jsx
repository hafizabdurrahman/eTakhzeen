import React, { useState } from 'react';

export default function MessageComposer({ onSend, disabled = false }) {
    const [value, setValue] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setValue('');
    };

    return (
        <form className="message-composer" onSubmit={handleSubmit}>
            <input
                type="text"
                className="message-composer__input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Type a message..."
                disabled={disabled}
            />
            <button type="submit" className="message-composer__send" disabled={disabled || !value.trim()}>
                Send
            </button>
        </form>
    );
}