// Lets any module call customAlert/customConfirm/customPrompt without being
// inside a component — the DialogProvider registers itself as the active
// handler on mount. If nothing has registered yet (or the provider was
// removed), we fall back to the real native dialogs so nothing ever silently
// no-ops.
let handler = null;

export function registerDialogHandler(nextHandler) {
    handler = nextHandler;
}

/**
 * Same contract as window.alert: shows a message, resolves once dismissed.
 * @returns {Promise<void>}
 */
export function customAlert(message, options = {}) {
    if (!handler) {
        window.alert(message);
        return Promise.resolve(undefined);
    }
    return handler.alert(message, options);
}

/**
 * Same contract as window.confirm: resolves true if confirmed, false if
 * cancelled/dismissed (Escape, backdrop click, Cancel button).
 * @returns {Promise<boolean>}
 */
export function customConfirm(message, options = {}) {
    if (!handler) {
        return Promise.resolve(window.confirm(message));
    }
    return handler.confirm(message, options);
}

/**
 * Same contract as window.prompt: resolves the entered string, or null if
 * cancelled/dismissed.
 * @returns {Promise<string|null>}
 */
export function customPrompt(message, defaultValue = '', options = {}) {
    if (!handler) {
        return Promise.resolve(window.prompt(message, defaultValue));
    }
    return handler.prompt(message, defaultValue, options);
}