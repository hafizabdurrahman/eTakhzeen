import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ListFilter, Clock, RefreshCw, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import Toggle from './Toggle';

// Single source of truth for how each order status looks across the admin
// panel — icon, hex (for charts), and tailwind classes (for badges/text).
// Mirrors the palette already established in AdminFinance.jsx's
// STATUS_HEX/STATUS_ICONS so Finance, the orders list, and order detail
// all read as one consistent system.
export const ORDER_STATUS_META = {
    Pending: {
        icon: Clock,
        toggleColor: 'brand',
        text: 'text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
        ring: 'border-amber-200 dark:border-amber-500/30',
    },
    Processing: {
        icon: RefreshCw,
        toggleColor: 'brand',
        text: 'text-sky-600 dark:text-sky-400',
        dot: 'bg-sky-500',
        badge: 'bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400',
        ring: 'border-sky-200 dark:border-sky-500/30',
    },
    Delivered: {
        icon: CheckCircle2,
        toggleColor: 'brand',
        text: 'text-green-600 dark:text-green-400',
        dot: 'bg-green-500',
        badge: 'bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-400',
        ring: 'border-green-200 dark:border-green-500/30',
    },
    Returned: {
        icon: RotateCcw,
        toggleColor: 'danger',
        text: 'text-orange-600 dark:text-orange-400',
        dot: 'bg-orange-500',
        badge: 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
        ring: 'border-orange-200 dark:border-orange-500/30',
    },
    Cancelled: {
        icon: XCircle,
        toggleColor: 'danger',
        text: 'text-red-600 dark:text-red-400',
        dot: 'bg-red-500',
        badge: 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400',
        ring: 'border-red-200 dark:border-red-500/30',
    },
};

// Hex versions of the same palette, for DonutChart/TrendAreaChart/HeatmapCalendar
// which need real color values rather than Tailwind classes.
export const ORDER_STATUS_HEX = {
    Pending: '#f59e0b',
    Processing: '#0ea5e9',
    Delivered: '#16a34a',
    Returned: '#f97316',
    Cancelled: '#dc2626',
};

const FALLBACK_META = {
    icon: Clock,
    toggleColor: 'brand',
    text: 'text-stone-500 dark:text-stone-400',
    dot: 'bg-stone-400',
    badge: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
    ring: 'border-stone-200 dark:border-stone-700',
};

export function metaFor(status) {
    return ORDER_STATUS_META[status] || FALLBACK_META;
}

/**
 * Status editor for a single order.
 * - md and up: one row per status, each a labeled Toggle (ui/Toggle) —
 *   exactly one is "on". Turning on an inactive row's toggle switches to
 *   that status; turning off the active row is a no-op (there must always
 *   be exactly one status), same "keep at least one" guard already used
 *   elsewhere (e.g. TrendAreaChart's series legend).
 * - below md: a custom colored dropdown (not a native <select>) — tap to
 *   open, each option shows its own icon/color, the current one gets a check.
 */
function StatusPicker({ value, onChange, statuses, disabled = false }) {
    const list = statuses && statuses.length ? statuses : Object.keys(ORDER_STATUS_META);
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    useEffect(() => {
        function handleClick(e) {
            if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
        }
        function handleKey(e) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, []);

    const current = metaFor(value);
    const CurrentIcon = current.icon;

    return (
        <div ref={rootRef}>
            {/* Desktop / tablet — a labeled Toggle per status */}
            <div className="hidden flex-col gap-2 md:flex">
                {list.map((status) => {
                    const meta = metaFor(status);
                    const Icon = meta.icon;
                    const isActive = value === status;
                    return (
                        <div
                            key={status}
                            className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 transition-colors ${
                                isActive ? `${meta.ring} bg-white dark:bg-stone-900` : 'border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-800/40'
                            }`}
                        >
                            <span className="flex items-center gap-2 text-sm font-medium">
                                <Icon size={15} className={meta.text} />
                                <span className={isActive ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400'}>
                                    {status}
                                </span>
                            </span>
                            <Toggle
                                checked={isActive}
                                disabled={disabled}
                                color={meta.toggleColor}
                                label={`Set status to ${status}`}
                                onChange={(next) => {
                                    if (next) onChange(status);
                                }}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Mobile — custom colored dropdown */}
            <div className="relative md:hidden">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setOpen((o) => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    className={`flex w-full items-center justify-between gap-2 rounded-md border bg-white px-3 py-2.5 text-sm font-medium transition-colors dark:bg-stone-900 ${current.ring} ${
                        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    }`}
                >
                    <span className="flex items-center gap-2">
                        <CurrentIcon size={16} className={current.text} />
                        <span className="text-stone-900 dark:text-stone-100">{value}</span>
                    </span>
                    <ChevronDown size={15} className={`text-stone-400 transition-transform dark:text-stone-500 ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                    <ul
                        role="listbox"
                        className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-md border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-800 dark:bg-stone-900"
                    >
                        {list.map((status) => {
                            const meta = metaFor(status);
                            const Icon = meta.icon;
                            const isActive = value === status;
                            return (
                                <li key={status}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={isActive}
                                        onClick={() => {
                                            onChange(status);
                                            setOpen(false);
                                        }}
                                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                                            isActive ? 'bg-stone-50 dark:bg-stone-800' : 'hover:bg-stone-50 dark:hover:bg-stone-800/60'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Icon size={15} className={meta.text} />
                                            <span className="text-stone-900 dark:text-stone-100">{status}</span>
                                        </span>
                                        {isActive && <Check size={14} className="text-brand-600 dark:text-brand-500" />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}

// Custom colored dropdown used to FILTER a list by status (includes an
// "All statuses" entry) — separate from StatusPicker above, which edits
// one order's actual status.
export function StatusFilterSelect({ value, onChange, statuses, placeholder = 'All statuses' }) {
    const list = statuses && statuses.length ? statuses : Object.keys(ORDER_STATUS_META);
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    useEffect(() => {
        function handleClick(e) {
            if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const current = value ? metaFor(value) : null;
    const CurrentIcon = current ? current.icon : ListFilter;

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-900 transition-colors hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-700"
            >
                <span className="flex items-center gap-2">
                    <CurrentIcon size={15} className={current ? current.text : 'text-stone-400 dark:text-stone-500'} />
                    <span>{value || placeholder}</span>
                </span>
                <ChevronDown size={15} className={`text-stone-400 transition-transform dark:text-stone-500 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <ul
                    role="listbox"
                    className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-md border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-800 dark:bg-stone-900"
                >
                    <li>
                        <button
                            type="button"
                            role="option"
                            aria-selected={!value}
                            onClick={() => { onChange(''); setOpen(false); }}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                                !value ? 'bg-stone-50 dark:bg-stone-800' : 'hover:bg-stone-50 dark:hover:bg-stone-800/60'
                            }`}
                        >
                            <span className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
                                <ListFilter size={15} className="text-stone-400 dark:text-stone-500" />
                                {placeholder}
                            </span>
                            {!value && <Check size={14} className="text-brand-600 dark:text-brand-500" />}
                        </button>
                    </li>
                    {list.map((status) => {
                        const meta = metaFor(status);
                        const Icon = meta.icon;
                        const isActive = value === status;
                        return (
                            <li key={status}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isActive}
                                    onClick={() => { onChange(status); setOpen(false); }}
                                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                                        isActive ? 'bg-stone-50 dark:bg-stone-800' : 'hover:bg-stone-50 dark:hover:bg-stone-800/60'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Icon size={15} className={meta.text} />
                                        <span className="text-stone-900 dark:text-stone-100">{status}</span>
                                    </span>
                                    {isActive && <Check size={14} className="text-brand-600 dark:text-brand-500" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export default StatusPicker;