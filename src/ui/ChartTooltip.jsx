import React from 'react';

/**
 * Small floating label that tracks the cursor inside a chart. Meant to be
 * rendered once per chart, positioned via absolute coordinates relative to
 * a `relative`-positioned wrapper that also reports mouse-move coordinates.
 *
 * `point` = { x, y, content } | null — content can be any node (a line of
 * text, a couple of stacked lines, etc). Renders nothing when null.
 */
function ChartTooltip({ point }) {
    if (!point) return null;

    return (
        <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg transition-opacity duration-100 dark:bg-stone-100 dark:text-stone-900"
            style={{ left: point.x, top: point.y - 10 }}
        >
            {point.content}
            <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-4 border-transparent border-t-stone-900 dark:border-t-stone-100" />
        </div>
    );
}

export default ChartTooltip;