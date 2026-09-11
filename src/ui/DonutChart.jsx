import React, { useEffect, useRef, useState } from 'react';
import ChartTooltip from './ChartTooltip';

/**
 * Simple SVG donut chart with a centered total, a smooth animated draw-in,
 * a legend styled as individual chips, and a floating tooltip that follows
 * the cursor over either the ring or a legend chip.
 * `segments` = [{ label, value, color }] — zero-value segments still get a
 * legend chip (greyed out) so the full set of categories is always visible.
 * `onSegmentClick` — optional (segment) => void, fired when a non-empty
 * ring slice or legend chip is clicked (hover/tooltip behavior unchanged).
 */
function DonutChart({ segments, size = 180, thickness = 24, centerLabel = 'Total', onSegmentClick }) {
    const containerRef = useRef(null);
    const [active, setActive] = useState(null);
    const [tooltipPos, setTooltipPos] = useState(null);
    const [animated, setAnimated] = useState(false);
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    useEffect(() => {
        const t = requestAnimationFrame(() => setAnimated(true));
        return () => cancelAnimationFrame(t);
    }, [total]);

    function handleMove(e, label) {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setActive(label);
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    function handleLeave() {
        setActive(null);
        setTooltipPos(null);
    }

    function handleClick(seg) {
        if (seg.value === 0 || !onSegmentClick) return;
        onSegmentClick(seg);
    }

    let offsetSoFar = 0;
    const activeSeg = segments.find((s) => s.label === active);
    const activePct = activeSeg && total > 0 ? Math.round((activeSeg.value / total) * 100) : 0;
    const isClickable = Boolean(onSegmentClick);

    return (
        <div ref={containerRef} className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
            <div className="relative shrink-0 drop-shadow-sm" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        strokeWidth={thickness}
                        className="stroke-stone-100 dark:stroke-stone-800"
                    />
                    {total > 0 &&
                        segments
                            .filter((seg) => seg.value > 0)
                            .map((seg) => {
                                const fraction = seg.value / total;
                                const fullDash = fraction * circumference;
                                const dash = animated ? fullDash : 0;
                                const dashArray = `${dash} ${circumference - dash}`;
                                const dashOffset = -offsetSoFar;
                                offsetSoFar += fullDash;
                                const isActive = active === seg.label;
                                const isDimmed = active && !isActive;
                                return (
                                    <circle
                                        key={seg.label}
                                        cx={center}
                                        cy={center}
                                        r={radius}
                                        fill="none"
                                        stroke={seg.color}
                                        strokeWidth={isActive ? thickness + 5 : thickness}
                                        strokeDasharray={dashArray}
                                        strokeDashoffset={dashOffset}
                                        opacity={isDimmed ? 0.35 : 1}
                                        className={`transition-all duration-700 ease-out ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                                        onMouseMove={(e) => handleMove(e, seg.label)}
                                        onMouseLeave={handleLeave}
                                        onClick={() => handleClick(seg)}
                                    />
                                );
                            })}
                </svg>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
                        {activeSeg ? activeSeg.value : total}
                    </span>
                    <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                        {activeSeg ? activeSeg.label : centerLabel}
                    </span>
                </div>
            </div>

            <div className="grid w-full max-w-xs grid-cols-1 gap-1.5 sm:max-w-none sm:min-w-[180px]">
                {total === 0 && <p className="text-sm text-stone-500 dark:text-stone-400">No data yet.</p>}
                {segments.map((seg) => {
                    const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
                    const isActive = active === seg.label;
                    const isEmpty = seg.value === 0;
                    return (
                        <button
                            key={seg.label}
                            type="button"
                            onMouseMove={(e) => !isEmpty && handleMove(e, seg.label)}
                            onMouseLeave={handleLeave}
                            onClick={() => handleClick(seg)}
                            disabled={isEmpty}
                            className={`flex items-center justify-between gap-3 rounded-md border px-2.5 py-1.5 text-left text-sm transition-all duration-150 ${
                                isActive
                                    ? 'border-stone-200 bg-stone-50 shadow-sm dark:border-stone-700 dark:bg-stone-800'
                                    : 'border-transparent'
                            } ${
                                isEmpty
                                    ? 'cursor-default opacity-40'
                                    : `${isClickable ? 'cursor-pointer' : 'cursor-default'} hover:border-stone-200 hover:bg-stone-50 dark:hover:border-stone-700 dark:hover:bg-stone-800`
                            }`}
                        >
                            <span className="flex min-w-0 items-center gap-2">
                                <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white dark:ring-stone-900"
                                    style={{ backgroundColor: seg.color }}
                                />
                                <span className="truncate font-medium text-stone-700 dark:text-stone-300">{seg.label}</span>
                            </span>
                            <span className="shrink-0 tabular-nums text-stone-500 dark:text-stone-400">
                                <span className="font-semibold text-stone-900 dark:text-stone-100">{seg.value}</span>{' '}
                                <span className="text-xs text-stone-400 dark:text-stone-500">({pct}%)</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <ChartTooltip
                point={
                    activeSeg && tooltipPos
                        ? {
                              ...tooltipPos,
                              content: (
                                  <>
                                      <div className="font-semibold">{activeSeg.label}</div>
                                      <div className="opacity-80">
                                          {activeSeg.value} ({activePct}%)
                                      </div>
                                      {isClickable && activeSeg.value > 0 && (
                                          <div className="mt-0.5 text-[10px] opacity-60">Click to view</div>
                                      )}
                                  </>
                              ),
                          }
                        : null
                }
            />
        </div>
    );
}

export default DonutChart;