import React from 'react';

/**
 * Styled toggle switch — replaces native <input type="checkbox"> used as an
 * on/off control (Active, Blocked, etc). Fully keyboard accessible: it's a
 * real <button role="switch">, not a div with a click handler.
 *
 * Color reads as semantic, not just "on/off":
 *   - "brand"  -> on = brand-600 (default, e.g. "Active", "Featured")
 *   - "danger" -> on = red-600   (e.g. a toggle whose "on" state is the bad one, like "Blocked")
 */
const TRACK_ON = {
    brand: 'bg-brand-600 dark:bg-brand-500',
    danger: 'bg-red-600 dark:bg-red-500',
};

function Toggle({ checked, onChange, disabled = false, color = 'brand', label, size = 'md' }) {
    const dims = size === 'sm'
        ? { track: 'h-5 w-9', thumb: 'h-3.5 w-3.5', translate: checked ? 'translate-x-4' : 'translate-x-0.5' }
        : { track: 'h-6 w-11', thumb: 'h-4.5 w-4.5', translate: checked ? 'translate-x-5' : 'translate-x-0.5' };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500 dark:focus-visible:ring-offset-stone-950 ${dims.track} ${
                checked ? TRACK_ON[color] : 'bg-stone-300 dark:bg-stone-700'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
            <span
                className={`pointer-events-none inline-block transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${dims.thumb} ${dims.translate}`}
            />
        </button>
    );
}

export default Toggle;