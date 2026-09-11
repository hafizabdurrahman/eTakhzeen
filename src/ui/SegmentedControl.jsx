import React from 'react';

/**
 * Pill-shaped segmented control — replaces a row of native
 * <input type="radio"> buttons for a small set of mutually exclusive
 * options (e.g. "Same for all" / "Edit separately").
 */
function SegmentedControl({ options, value, onChange, name, size = 'sm' }) {
    const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm';

    return (
        <div
            role="radiogroup"
            aria-label={name}
            className="inline-flex items-center gap-0.5 rounded-full border border-stone-200 bg-stone-100 p-0.5 dark:border-stone-800 dark:bg-stone-800/70"
        >
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(opt.value)}
                        className={`rounded-full font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${pad} ${
                            active
                                ? 'bg-brand-600 text-white shadow-sm dark:bg-brand-500'
                                : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

export default SegmentedControl;