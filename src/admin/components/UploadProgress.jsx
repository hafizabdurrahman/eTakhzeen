import React, { useEffect, useState } from 'react';
import { UploadCloud, Save, Loader2, CheckCircle2 } from 'lucide-react';

// Progress card shown while the bulk form uploads images and saves products.
//
// Props:
//   progress    - the status string from BulkUploadForm, e.g.
//                 "Uploading images (3/10)..." | "Saving products..." | ""
//   progressPct - 0-100 number parsed from "(3/10)", or null when unknown
//
// Styling matches the forms: brand palette, rounded corners, dark-mode
// variants, and the same fade/slide-in entrance the product form uses.
// The two keyframes below are self-contained, so no Tailwind config changes
// are needed, and they switch off for people who prefer reduced motion.

const KEYFRAMES = `
@keyframes bulk-shimmer {
    from { transform: translateX(-100%); }
    to   { transform: translateX(100%); }
}
@keyframes bulk-slide {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(300%); }
}
@keyframes bulk-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-3px); }
}
@media (prefers-reduced-motion: reduce) {
    .bulk-anim { animation: none !important; }
}
`;

// One step in the "Upload images -> Save products" tracker.
// state: 'done' | 'active' | 'pending'
function ProgressStep({ state, icon: Icon, label }) {
    const tone =
        state === 'done'
            ? 'text-emerald-700 dark:text-emerald-400'
            : state === 'active'
            ? 'text-brand-800 dark:text-brand-300'
            : 'text-stone-400 dark:text-stone-500';

    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors duration-300 ${tone}`}>
            {state === 'done' ? (
                <CheckCircle2 size={14} className="animate-[pulse_0.6s_ease-out_1]" />
            ) : state === 'active' ? (
                <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
            ) : (
                <Icon size={14} />
            )}
            {label}
        </span>
    );
}

function UploadProgress({ progress, progressPct }) {
    // Mount transition, same idea as the product form card.
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const isSaving = progress.startsWith('Saving');
    const isPreparing = !progress; // before the first status message arrives

    const match = progress.match(/\((\d+)\/(\d+)\)/);
    const done = match ? Number(match[1]) : 0;
    const total = match ? Number(match[2]) : 0;

    const indeterminate = isPreparing;
    const pct = isSaving ? 100 : Math.min(100, Math.max(0, progressPct ?? 0));

    const title = isSaving ? 'Saving products' : isPreparing ? 'Getting things ready' : 'Uploading images';
    const subtitle = isSaving
        ? 'Almost done — creating your products…'
        : isPreparing
        ? 'Checking slugs and preparing the upload…'
        : done === 0
        ? 'Starting upload…'
        : `${done} of ${total} image${total === 1 ? '' : 's'} uploaded`;

    const HeaderIcon = isSaving ? Save : UploadCloud;

    return (
        <div
            role="status"
            aria-live="polite"
            className={`space-y-4 rounded-lg border border-brand-200 bg-brand-50 p-4 shadow-sm transition-all duration-300 ease-out dark:border-brand-500/30 dark:bg-brand-500/10 ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
        >
            <style>{KEYFRAMES}</style>

            {/* Header: icon, title + subtitle, percentage */}
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                    <span
                        key={isSaving ? 'saving' : 'uploading'}
                        className="bulk-anim inline-flex"
                        style={{ animation: isSaving ? 'none' : 'bulk-float 1.6s ease-in-out infinite' }}
                    >
                        <HeaderIcon size={18} className={isSaving ? 'animate-pulse motion-reduce:animate-none' : ''} />
                    </span>
                </span>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-800 dark:text-brand-300">{title}</p>
                    <p className="mt-0.5 truncate text-xs text-brand-700/80 dark:text-brand-300/70">{subtitle}</p>
                </div>

                {!indeterminate && (
                    <span className="shrink-0 text-lg font-semibold tabular-nums text-brand-700 dark:text-brand-300">
                        {Math.round(pct)}%
                    </span>
                )}
            </div>

            {/* Progress bar */}
            <div
                className="h-2 w-full overflow-hidden rounded-full bg-brand-100 dark:bg-brand-500/20"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={indeterminate ? undefined : Math.round(pct)}
                aria-label={title}
            >
                {indeterminate ? (
                    <div
                        className="bulk-anim h-full w-1/3 rounded-full bg-brand-600 dark:bg-brand-500"
                        style={{ animation: 'bulk-slide 1.2s ease-in-out infinite' }}
                    />
                ) : (
                    <div
                        className="relative h-full overflow-hidden rounded-full bg-brand-600 transition-[width] duration-500 ease-out dark:bg-brand-500"
                        style={{ width: `${Math.max(pct, 3)}%` }}
                    >
                        {/* moving highlight so the bar feels alive between updates */}
                        <div
                            className="bulk-anim absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                            style={{ animation: 'bulk-shimmer 1.6s linear infinite' }}
                        />
                    </div>
                )}
            </div>

            {/* Steps + hint */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                    <ProgressStep state={isSaving ? 'done' : 'active'} icon={UploadCloud} label="Upload images" />
                    <span
                        className={`h-px w-6 transition-colors duration-500 ${
                            isSaving ? 'bg-emerald-400 dark:bg-emerald-500/60' : 'bg-brand-200 dark:bg-brand-500/30'
                        }`}
                    />
                    <ProgressStep state={isSaving ? 'active' : 'pending'} icon={Save} label="Save products" />
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                    Please keep this page open until it finishes.
                </p>
            </div>
        </div>
    );
}

export default UploadProgress;