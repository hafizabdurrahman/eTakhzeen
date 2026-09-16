import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';

/**
 * Editable combobox — like Select, but the input is typable. Pick an
 * existing option from the dropdown, or type a value that doesn't exist
 * yet (e.g. a brand-new category/group) and it's used as-is, same as the
 * old `<input list="...">` + <datalist> behavior, just styled to match
 * the rest of ui/ instead of the browser's native datalist popup.
 *
 * Fully controlled: `value` / `onChange(nextValue)` / `onBlur`. Designed
 * to be dropped straight into a react-hook-form <Controller field={...}>
 * render prop — spread `field` onto it.
 */
function Combobox({
    value = '',
    onChange,
    onBlur,
    options = [],
    placeholder = 'Select or type...',
    disabled = false,
    error = false,
    className = '',
}) {
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);
    const rootRef = useRef(null);
    const inputRef = useRef(null);

    const filtered = useMemo(() => {
        const q = (value || '').trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) => o.toLowerCase().includes(q));
    }, [options, value]);

    const exactMatch = options.some((o) => o.toLowerCase() === (value || '').trim().toLowerCase());
    const showCreateHint = value && value.trim() && !exactMatch;

    useEffect(() => {
        function handlePointerDown(e) {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
                onBlur && onBlur();
            }
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
    }, [onBlur]);

    useEffect(() => {
        setHighlighted(-1);
    }, [value, open]);

    function pick(nextValue) {
        onChange(nextValue);
        setOpen(false);
        inputRef.current?.focus();
    }

    function handleKeyNav(e) {
        if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setOpen(true);
            return;
        }
        if (!open) return;

        const listLength = filtered.length;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted((i) => (i + 1 >= listLength ? 0 : i + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted((i) => (i - 1 < 0 ? listLength - 1 : i - 1));
        } else if (e.key === 'Enter') {
            if (highlighted >= 0 && filtered[highlighted]) {
                e.preventDefault();
                pick(filtered[highlighted]);
            } else {
                setOpen(false);
            }
        }
    }

    return (
        <div ref={rootRef} className={`relative z-40 ${className}`}>
            <div
                className={`flex items-center gap-2 rounded-md border bg-white px-3 py-2 shadow-sm transition-colors focus-within:ring-2 focus-within:ring-brand-100 dark:bg-stone-900 dark:focus-within:ring-brand-500/20 ${
                    error
                        ? 'border-red-500 focus-within:border-red-500 dark:border-red-500'
                        : open
                        ? 'border-brand-600 ring-2 ring-brand-100 dark:border-brand-500 dark:ring-brand-500/20'
                        : 'border-stone-300 hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-600'
                } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyNav}
                    placeholder={placeholder}
                    className="w-full min-w-0 bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none dark:text-stone-100 dark:placeholder:text-stone-500"
                />
                <button
                    type="button"
                    tabIndex={-1}
                    disabled={disabled}
                    onClick={() => {
                        setOpen((o) => !o);
                        inputRef.current?.focus();
                    }}
                    className="shrink-0 text-stone-400 dark:text-stone-500"
                >
                    <ChevronDown size={16} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {open && !disabled && (
                <div
                    role="listbox"
                    className="absolute z-20 mt-1.5 max-h-64 w-full overflow-auto rounded-md border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-800 dark:bg-stone-900"
                >
                    {filtered.map((opt, i) => (
                        <button
                            key={opt}
                            type="button"
                            role="option"
                            aria-selected={opt === value}
                            onClick={() => pick(opt)}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                                i === highlighted ? 'bg-stone-50 dark:bg-stone-800' : 'hover:bg-stone-50 dark:hover:bg-stone-800'
                            } ${opt === value ? 'font-medium text-brand-700 dark:text-brand-400' : 'text-stone-700 dark:text-stone-300'}`}
                        >
                            <span className="truncate">{opt}</span>
                            {opt === value && <Check size={14} className="shrink-0" />}
                        </button>
                    ))}

                    {filtered.length === 0 && !showCreateHint && (
                        <p className="px-3 py-2 text-sm text-stone-400 dark:text-stone-500">No options yet — type to create one.</p>
                    )}

                    {showCreateHint && (
                        <div className="mt-1 flex items-center gap-1.5 border-t border-stone-100 px-3 py-2 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
                            <Plus size={12} />
                            Will use "<span className="font-medium text-stone-700 dark:text-stone-300">{value.trim()}</span>" as a new value
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Combobox;