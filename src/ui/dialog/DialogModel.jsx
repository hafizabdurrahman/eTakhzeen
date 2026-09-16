import React, { useEffect, useRef, useState } from 'react';
import { Info, HelpCircle, MessageSquareText } from 'lucide-react';

const TYPE_ICONS = {
    alert: Info,
    confirm: HelpCircle,
    prompt: MessageSquareText,
};

function DialogModal({ request, onClose }) {
    const {
        type,
        message,
        title,
        defaultValue = '',
        placeholder,
        variant = 'default', // 'default' | 'danger'
        confirmLabel,
        cancelLabel,
    } = request;

    const [visible, setVisible] = useState(false);
    const [inputValue, setInputValue] = useState(defaultValue);
    const inputRef = useRef(null);
    const confirmRef = useRef(null);

    // Entrance animation: mount hidden, flip visible one frame later so the
    // "from" state actually paints first.
    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        if (type === 'prompt') {
            inputRef.current?.focus();
            inputRef.current?.select();
        } else {
            confirmRef.current?.focus();
        }
    }, [type]);

    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                handleDismiss();
            } else if (e.key === 'Enter' && type !== 'prompt') {
                handleConfirm();
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputValue]);

    function close(value) {
        setVisible(false);
        // Let the exit transition play before actually unmounting/resolving.
        setTimeout(() => onClose(value), 150);
    }

    function handleDismiss() {
        if (type === 'confirm') close(false);
        else if (type === 'prompt') close(null);
        else close(undefined);
    }

    function handleConfirm() {
        if (type === 'confirm') close(true);
        else if (type === 'prompt') close(inputValue);
        else close(undefined);
    }

    const Icon = TYPE_ICONS[type];
    const isDanger = variant === 'danger';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4"
            onClick={handleDismiss}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-sm overflow-hidden rounded-xl border border-stone-200 bg-cream shadow-2xl transition-all duration-150 dark:border-stone-800 dark:bg-stone-900 ${
                    visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
                }`}
            >
                <div className="flex items-start gap-3 p-5">
                    <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            isDanger
                                ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                                : 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                        }`}
                    >
                        <Icon size={20} />
                    </span>
                    <div className="min-w-0 pt-1">
                        {title && (
                            <h3 className="mb-1 text-base font-semibold text-stone-900 dark:text-stone-100">{title}</h3>
                        )}
                        <p className="text-sm text-stone-600 dark:text-stone-300">{message}</p>

                        {type === 'prompt' && (
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={placeholder}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleConfirm();
                                }}
                                className="mt-3 w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                            />
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-stone-100 bg-stone-50/60 px-5 py-3 dark:border-stone-800 dark:bg-stone-800/20">
                    {type !== 'alert' && (
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
                        >
                            {cancelLabel || 'Cancel'}
                        </button>
                    )}
                    <button
                        ref={confirmRef}
                        type="button"
                        onClick={handleConfirm}
                        className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${
                            isDanger
                                ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
                                : 'bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600'
                        }`}
                    >
                        {confirmLabel || (type === 'alert' ? 'OK' : type === 'prompt' ? 'Submit' : 'Confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DialogModal;