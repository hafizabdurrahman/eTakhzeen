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
 * Accepts either:
 *   fn('message', { title, confirmLabel, ... })
 *   fn({ title, message, confirmText, cancelText, ... })
 * and returns { message, options } with consistent option names.
 */
function normalize(messageOrConfig, options = {}) {
    let message = messageOrConfig;
    let opts = options || {};

    if (messageOrConfig !== null && typeof messageOrConfig === 'object') {
        const { message: msg, ...rest } = messageOrConfig;
        message = msg;
        opts = { ...rest, ...opts };
    }

    // Support confirmText/cancelText as aliases for confirmLabel/cancelLabel.
    const { confirmText, cancelText, ...cleanOpts } = opts;
    if (cleanOpts.confirmLabel === undefined && confirmText !== undefined) {
        cleanOpts.confirmLabel = confirmText;
    }
    if (cleanOpts.cancelLabel === undefined && cancelText !== undefined) {
        cleanOpts.cancelLabel = cancelText;
    }

    return { message: message == null ? '' : String(message), options: cleanOpts };
}

/**
 * Same contract as window.alert: shows a message, resolves once dismissed.
 * @returns {Promise<void>}
 */
export function customAlert(message, options = {}) {
    const n = normalize(message, options);
    if (!handler) {
        window.alert(n.message);
        return Promise.resolve(undefined);
    }
    return handler.alert(n.message, n.options);
}

/**
 * Same contract as window.confirm: resolves true if confirmed, false if
 * cancelled/dismissed (Escape, backdrop click, Cancel button).
 * @returns {Promise<boolean>}
 */
export function customConfirm(message, options = {}) {
    const n = normalize(message, options);
    if (!handler) {
        return Promise.resolve(window.confirm(n.message));
    }
    return handler.confirm(n.message, n.options);
}

/**
 * Same contract as window.prompt: resolves the entered string, or null if
 * cancelled/dismissed.
 *
 * Also accepts a single config object:
 *   customPrompt({ message, defaultValue, title, placeholder, ... })
 * @returns {Promise<string|null>}
 */
export function customPrompt(message, defaultValue = '', options = {}) {
    let value = defaultValue;
    let opts = options;

    // Config-object style: customPrompt({ message, defaultValue, ... })
    if (message !== null && typeof message === 'object') {
        const { defaultValue: dv, ...rest } = message;
        if (dv !== undefined) value = dv;
        // In this style the second argument (if any) is treated as options.
        opts = { ...rest, ...(typeof defaultValue === 'object' ? defaultValue : {}), ...options };
        if (typeof defaultValue === 'string') value = dv !== undefined ? dv : defaultValue;
        message = rest.message;
        delete opts.message;
    }

    const n = normalize(message, opts);
    if (!handler) {
        return Promise.resolve(window.prompt(n.message, value));
    }
    return handler.prompt(n.message, value, n.options);
}