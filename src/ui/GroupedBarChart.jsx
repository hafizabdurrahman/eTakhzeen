import React, { useEffect, useRef, useState } from 'react';
import ChartTooltip from './ChartTooltip';

/**
 * Horizontal grouped bar chart, no charting library dependency.
 * `items` = [{ label, bars: [{ name, value, color }] }]
 * `legend` = [{ name, color }] shown once above the chart.
 */
function GroupedBarChart({ items, legend }) {
    const containerRef = useRef(null);
    const [animated, setAnimated] = useState(false);
    const [hovered, setHovered] = useState(null); // { itemLabel, bar }
    const [tooltipPos, setTooltipPos] = useState(null);
    const max = Math.max(1, ...items.flatMap((it) => it.bars.map((b) => b.value)));

    useEffect(() => {
        const t = requestAnimationFrame(() => setAnimated(true));
        return () => cancelAnimationFrame(t);
    }, [items]);

    function handleMove(e, itemLabel, bar) {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setHovered({ itemLabel, bar });
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    function handleLeave() {
        setHovered(null);
        setTooltipPos(null);
    }

    if (items.length === 0) {
        return <p className="text-sm text-stone-500 dark:text-stone-400">No data yet.</p>;
    }

    return (
        <div ref={containerRef} className="relative">
            {legend && (
                <div className="mb-3 flex flex-wrap gap-3">
                    {legend.map((l) => (
                        <span key={l.name} className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                            {l.name}
                        </span>
                    ))}
                </div>
            )}
            <div className="space-y-3.5">
                {items.map((item) => (
                    <div key={item.label}>
                        <p className="mb-1 truncate text-xs font-medium text-stone-600 dark:text-stone-300">{item.label}</p>
                        <div className="space-y-1.5">
                            {item.bars.map((bar) => (
                                <div key={bar.name} className="flex items-center gap-2">
                                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                                        <div
                                            onMouseMove={(e) => handleMove(e, item.label, bar)}
                                            onMouseLeave={handleLeave}
                                            className="h-full rounded-full transition-all duration-700 ease-out hover:brightness-90"
                                            style={{
                                                width: animated ? `${(bar.value / max) * 100}%` : '0%',
                                                backgroundColor: bar.color,
                                            }}
                                        />
                                    </div>
                                    <span className="w-6 shrink-0 text-right text-xs text-stone-500 dark:text-stone-400">
                                        {bar.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <ChartTooltip
                point={
                    hovered && tooltipPos
                        ? {
                              ...tooltipPos,
                              content: (
                                  <>
                                      <div className="font-semibold">{hovered.itemLabel}</div>
                                      <div className="opacity-80">
                                          {hovered.bar.name}: {hovered.bar.value}
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

export default GroupedBarChart;