import React from 'react';
import { Check, Minus } from 'lucide-react';

/**
 * Styled checkbox — replaces native <input type="checkbox">. Renders as a
 * real button with the correct aria-checked state (supports "indeterminate"
 * for select-all headers), so it stays keyboard and screen-reader friendly.
 */
function Checkbox({ checked, indeterminate = false, onChange, disabled = false, label }) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={indeterminate ? 'mixed' : checked}
            aria-label={label}
            disabled={disabled}
            onClick={(e) => {
                e.stopPropagation();
                onChange(!checked);
            }}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500 dark:focus-visible:ring-offset-stone-950 ${
                checked || indeterminate
                    ? 'border-brand-600 bg-brand-600 dark:border-brand-500 dark:bg-brand-500'
                    : 'border-stone-300 bg-white hover:border-brand-400 dark:border-stone-600 dark:bg-stone-900 dark:hover:border-brand-500'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
            {indeterminate ? (
                <Minus size={13} strokeWidth={3} className="text-white" />
            ) : checked ? (
                <Check size={13} strokeWidth={3} className="text-white" />
            ) : null}
        </button>
    );
}

export default Checkbox;