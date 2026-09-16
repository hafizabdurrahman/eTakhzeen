import React, { useCallback, useEffect, useState } from 'react';
import { registerDialogHandler } from './dialogController';
import DialogModal from './DialogModel';

let idCounter = 0;

// Mount this once near the root of the app (e.g. wrapping <App /> or just
// inside <BrowserRouter>). It doesn't render anything itself beyond the
// active dialog — customAlert/customConfirm/customPrompt work from any
// module once this is mounted.
function DialogProvider({ children }) {
    // A simple FIFO queue so rapid-fire calls (e.g. two confirms in a row)
    // show one at a time instead of stacking/overwriting each other.
    const [queue, setQueue] = useState([]);
    const current = queue[0] || null;

    const enqueue = useCallback((request) => {
        return new Promise((resolve) => {
            const id = ++idCounter;
            setQueue((q) => [...q, { id, ...request, resolve }]);
        });
    }, []);

    const alert = useCallback((message, options = {}) => enqueue({ type: 'alert', message, ...options }), [enqueue]);
    const confirmDialog = useCallback(
        (message, options = {}) => enqueue({ type: 'confirm', message, ...options }),
        [enqueue]
    );
    const promptDialog = useCallback(
        (message, defaultValue = '', options = {}) => enqueue({ type: 'prompt', message, defaultValue, ...options }),
        [enqueue]
    );

    useEffect(() => {
        registerDialogHandler({ alert, confirm: confirmDialog, prompt: promptDialog });
        return () => registerDialogHandler(null);
    }, [alert, confirmDialog, promptDialog]);

    function handleClose(value) {
        setQueue((q) => {
            const [first, ...rest] = q;
            first?.resolve(value);
            return rest;
        });
    }

    return (
        <>
            {children}
            {current && <DialogModal key={current.id} request={current} onClose={handleClose} />}
        </>
    );
}

export default DialogProvider;