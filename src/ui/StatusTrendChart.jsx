import React, { useEffect, useRef, useState } from 'react';
import ChartTooltip from './ChartTooltip';

/**
 * One stacked horizontal bar per time period — each bar is split into
 * colored segments proportional to that period's counts. Built as the
 * readable alternative to GroupedBarChart for "composition over time"
 * data (e.g. order status mix per month): a grouped bar chart with 5+
 * categories across many periods turns into a wall of thin, same-colored
 * bars that's hard to parse at a glance. A stacked bar keeps every
 * period's total legible as a single shape.
 *
 * `periods` = [{ label, total, counts: { [statusKey]: number } }]
 * `statusColors` = { [statusKey]: hexColor }
 * `statusIcons` = { [statusKey]: LucideIcon } — used only in the legend.
 * `valueLabel` — noun used in the tooltip, e.g. "orders".
 */
function StatusTrendChart({ periods, statusColors, statusIcons = {}, valueLabel = 'orders' }) {
    const containerRef = useRef(null);
    const [animated, setAnimated] = useState(false);
    const [hovered, setHovered] = useState(null); // { period, status, count }
    const [tooltipPos, setTooltipPos] = useState(null);

    useEffect(() => {
        setAnimated(false);
        const t = requestAnimationFrame(() => setAnimated(true));
        return () => cancelAnimationFrame(t);
    }, [periods]);

    function handleMove(e, period, status, count) {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setHovered({ period, status, count });
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    function handleLeave() {
        setHovered(null);
        setTooltipPos(null);
    }

    const statusKeys = Object.keys(statusColors);

    if (periods.length === 0) {
        return <p className="text-sm text-stone-500 dark:text-stone-400">No data yet.</p>;
    }

    return (
        <div ref={containerRef} className="relative">
            <div className="space-y-3">
                {periods.map((period) => (
                    <div key={period.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-medium text-stone-600 dark:text-stone-300">{period.label}</span>
                            <span className="tabular-nums text-stone-400 dark:text-stone-500">
                                {period.total} {valueLabel}
                            </span>
                        </div>
                        <div className="flex h-4 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                            {period.total === 0 ? null : (
                                statusKeys.map((status) => {
                                    const count = period.counts[status] || 0;
                                    if (count === 0) return null;
                                    const pct = (count / period.total) * 100;
                                    return (
                                        <div
                                            key={status}
                                            onMouseMove={(e) => handleMove(e, period.label, status, count)}
                                            onMouseLeave={handleLeave}
                                            className="h-full transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full hover:brightness-90"
                                            style={{ width: animated ? `${pct}%` : '0%', backgroundColor: statusColors[status] }}
                                        />
                                    );
                                })
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3 border-t border-stone-100 pt-3 dark:border-stone-800">
                {statusKeys.map((status) => {
                    const Icon = statusIcons[status];
                    return (
                        <span key={status} className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusColors[status] }} />
                            {Icon && <Icon size={12} className="shrink-0" />}
                            {status}
                        </span>
                    );
                })}
            </div>

            <ChartTooltip
                point={
                    hovered && tooltipPos
                        ? {
                              ...tooltipPos,
                              content: (
                                  <>
                                      <div className="font-semibold">{hovered.period}</div>
                                      <div className="opacity-80">
                                          {hovered.status}: {hovered.count} {valueLabel}
                                      </div>
                                  </>
                              ),
                          }
                        : null
                }
            />
        </div>
    );
}

export default StatusTrendChart;