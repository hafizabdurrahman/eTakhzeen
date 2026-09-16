import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Styled dropdown — replaces native <select>. Same controlled shape as a
 * normal select: `value` / `onChange(nextValue)`. Lives in ../../ui
 * alongside Checkbox/Toggle/SegmentedControl — add it to that barrel's
 * index.js: `export { default as Select } from './Select';`
 *
 * `options` = [{ value, label }] (or plain strings, which get normalized).
 * `placeholder` doubles as the "clear" option shown at the top of the list
 * (e.g. "All Categories") — picking it calls onChange('').
 */
function Select({ value, onChange, options, placeholder = 'Select...', disabled = false, className = '' }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
    const selected = normalized.find((o) => o.value === value);

    useEffect(() => {
        function handlePointerDown(e) {
            if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
        }
        function handleKeyDown(e) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    function pick(nextValue) {
        onChange(nextValue);
        setOpen(false);
    }

    return (
        <div ref={rootRef} className={`relative z-40 ${className}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`flex w-full items-center justify-between gap-2 rounded-md border bg-white px-3 py-2 text-left text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-100 dark:bg-stone-900 dark:focus:ring-brand-500/20 ${
                    open
                        ? 'border-brand-600 ring-2 ring-brand-100 dark:border-brand-500 dark:ring-brand-500/20'
                        : 'border-stone-300 hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-600'
                } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
                <span className={`truncate ${selected ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400 dark:text-stone-500'}`}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-stone-400 transition-transform duration-150 dark:text-stone-500 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div
                    role="listbox"
                    className="absolute z-20 mt-1.5 max-h-64 w-full overflow-auto rounded-md border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-800 dark:bg-stone-900"
                >
                    <button
                        type="button"
                        role="option"
                        aria-selected={!value}
                        onClick={() => pick('')}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 ${
                            !value ? 'font-medium text-brand-700 dark:text-brand-400' : 'text-stone-500 dark:text-stone-400'
                        }`}
                    >
                        {placeholder}
                        {!value && <Check size={14} />}
                    </button>
                    {normalized.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            role="option"
                            aria-selected={opt.value === value}
                            onClick={() => pick(opt.value)}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 ${
                                opt.value === value ? 'font-medium text-brand-700 dark:text-brand-400' : 'text-stone-700 dark:text-stone-300'
                            }`}
                        >
                            <span className="truncate">{opt.label}</span>
                            {opt.value === value && <Check size={14} className="shrink-0" />}
                        </button>
                    ))}
                    {normalized.length === 0 && (
                        <p className="px-3 py-2 text-sm text-stone-400 dark:text-stone-500">No options yet.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default Select;