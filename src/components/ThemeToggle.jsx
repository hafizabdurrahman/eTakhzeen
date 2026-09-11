import React from 'react';
import { Sun, Moon } from 'lucide-react';
import useTheme from '../context/theme';

function ThemeToggle() {
    const { themeMode, toggleTheme } = useTheme();
    const isDark = themeMode === 'dark';

    return (
        <button
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={toggleTheme}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border-2 border-transparent bg-stone-200 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:bg-stone-700 dark:focus-visible:ring-offset-stone-950"
        >
            <Sun size={13} className="absolute left-1.5 text-stone-500 dark:text-stone-500" />
            <Moon size={13} className="absolute right-1.5 text-stone-500 dark:text-stone-400" />
            <span
                className={`z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand-600 shadow-md transition duration-200 ease-in-out dark:bg-stone-900 dark:text-brand-400 ${
                    isDark ? 'translate-x-7' : 'translate-x-0.5'
                }`}
            >
                {isDark ? <Moon size={13} /> : <Sun size={13} />}
            </span>
        </button>
    );
}

export default ThemeToggle;