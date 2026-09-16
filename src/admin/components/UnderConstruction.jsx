import React, { useEffect, useState } from 'react';
import { HardHat, Cog, ArrowLeft } from 'lucide-react';

/**
 * Admin placeholder for routes that are wired up but not built yet.
 *
 *   <Route path="/admin/reports" element={<UnderConstruction title="Reports" />} />
 *
 * Props (all optional):
 *   title        what the finished page will be called
 *   description  one line, in plain language, on what it will do
 *   progress     0-100, drives the bar; defaults to 40
 *   note         short muted line under the bar, e.g. "Expected next release"
 *   onBack       if passed, renders a secondary back button
 */
function UnderConstruction({
    title = 'This page',
    description = 'The screen is in place, but the functionality behind it is still being built.',
    progress = 40,
    note,
    onBack,
}) {
    // §11: entrance + bar draw-in use the rAF boolean-state pattern, never a
    // CSS animation class, so the "from" state paints before the "to" state.
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(frame);
    }, []);

    const pct = Math.min(100, Math.max(0, progress));

    return (
        <div className="flex min-h-[60vh] items-center justify-center p-4">
            <div
                className={`w-full max-w-lg rounded-lg border border-dashed border-stone-300 bg-stone-50 p-8 text-center transition-all duration-150 dark:border-stone-700 dark:bg-stone-900 ${
                    visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
                }`}
            >
                {/* The gear pair is the focal point and the only continuous
                    motion — meshing gears carry the "being worked on" meaning,
                    so the movement is functional rather than decoration. */}
                <div className="relative mx-auto mb-5 h-28 w-28">
                    <Cog
                        size={92}
                        strokeWidth={1.5}
                        aria-hidden="true"
                        className="absolute left-0 top-0 animate-spin text-brand-600 motion-reduce:animate-none dark:text-brand-500"
                        style={{ animationDuration: '12s' }}
                    />
                    <Cog
                        size={44}
                        strokeWidth={1.5}
                        aria-hidden="true"
                        className="absolute bottom-0 right-0 animate-spin text-brand-600/40 motion-reduce:animate-none dark:text-brand-500/40"
                        style={{ animationDuration: '7s', animationDirection: 'reverse' }}
                    />
                </div>

                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                    <HardHat size={12} aria-hidden="true" />
                    In development
                </span>

                <h1 className="mt-3 text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">
                    {title} isn&rsquo;t ready yet
                </h1>

                <p className="mx-auto mt-2 max-w-sm text-sm text-stone-600 dark:text-stone-300">
                    {description}
                </p>

                {/* §9 bar-chart pattern: stone track, brand fill, width drawn in
                    at duration-700 ease-out off the same `visible` flag. */}
                <div className="mt-6">
                    <div
                        className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${title} build progress`}
                    >
                        <div
                            className="h-full rounded-full bg-brand-600 transition-all duration-700 ease-out dark:bg-brand-500"
                            style={{ width: visible ? `${pct}%` : '0%' }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                        {note || `${Math.round(pct)}% complete`}
                    </p>
                </div>

                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700 dark:focus-visible:ring-offset-stone-950 sm:w-auto"
                    >
                        <ArrowLeft size={15} />
                        Go back
                    </button>
                )}
            </div>
        </div>
    );
}

export default UnderConstruction;