import React, { useEffect, useMemo, useRef, useState } from 'react';
import ChartTooltip from './ChartTooltip';

const GAP_ITEM = 18;
const GAP_BAR = 4;
const PAD_LEFT = 34;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 34;
const Y_TICKS = 4;
const MIN_BAR_W = 8;
const MAX_BAR_W = 34;

/**
 * Vertical grouped-column chart ("histogram") for ranking N items against
 * one or two numeric metrics side by side — e.g. categories compared by
 * group count AND product count, or groups compared by product count
 * alone.
 *
 * This is the ranked-category counterpart to the existing charts:
 * GroupedBarChart is horizontal and reads best with long labels or few
 * items; TrendAreaChart reads best for genuinely sequential/continuous
 * data. Use ComparisonHistogram when the x-axis is a short ranked list of
 * named things (top categories, top groups) and you want their metrics
 * side-by-side as columns.
 *
 * `items` = [{ label, bars: [{ name, value, color }] }]
 * `legend` — optional [{ name, color }] shown once above the chart when
 *   any item has 2+ bars. Derived from the first item's bars if omitted.
 * `valueFormatter` = (n) => string, used on the y-axis and in the tooltip.
 * `onBarClick` — optional (item) => void.
 */
function ComparisonHistogram({ items, legend, valueFormatter = (n) => n, height = 260, onBarClick }) {
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(null);
    const [animated, setAnimated] = useState(false);
    const [hovered, setHovered] = useState(null); // { item, bar }
    const [tooltipPos, setTooltipPos] = useState(null);

    useEffect(() => {
        setAnimated(false);
        const t = requestAnimationFrame(() => setAnimated(true));
        return () => cancelAnimationFrame(t);
    }, [items]);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((list) => {
            const w = list[0]?.contentRect?.width;
            if (w) setContainerWidth(w);
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const width = containerWidth || 640;
    const plotW = Math.max(1, width - PAD_LEFT - PAD_RIGHT);
    const plotH = Math.max(1, height - PAD_TOP - PAD_BOTTOM);
    const n = items.length;

    const barsPerItem = n > 0 ? Math.max(1, ...items.map((it) => it.bars.length)) : 1;
    const slotW = n > 0 ? plotW / n : plotW;
    const barW = Math.max(MIN_BAR_W, Math.min(MAX_BAR_W, (slotW - GAP_ITEM) / barsPerItem - GAP_BAR));

    const max = Math.max(1, ...items.flatMap((it) => it.bars.map((b) => b.value)), 1);

    const yTickValues = useMemo(() => {
        const step = max / Y_TICKS;
        return Array.from({ length: Y_TICKS + 1 }, (_, i) => step * i);
    }, [max]);

    function yAt(v) {
        return PAD_TOP + plotH - (v / max) * plotH;
    }

    function handleMove(e, item, bar) {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setHovered({ item, bar });
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    function handleLeave() {
        setHovered(null);
        setTooltipPos(null);
    }

    const resolvedLegend =
        legend || (barsPerItem > 1 ? items[0]?.bars.map((b) => ({ name: b.name, color: b.color })) : null);
    const isClickable = Boolean(onBarClick);

    if (n === 0) {
        return <p className="text-sm text-stone-500 dark:text-stone-400">No data to compare yet.</p>;
    }

    return (
        <div>
            {resolvedLegend && (
                <div className="mb-3 flex flex-wrap gap-3">
                    {resolvedLegend.map((l) => (
                        <span key={l.name} className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                            {l.name}
                        </span>
                    ))}
                </div>
            )}

            <div ref={containerRef} className="relative w-full">
                <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="block overflow-visible">
                    {yTickValues.map((v, i) => (
                        <g key={i}>
                            <line
                                x1={PAD_LEFT}
                                x2={width - PAD_RIGHT}
                                y1={yAt(v)}
                                y2={yAt(v)}
                                className="stroke-stone-100 dark:stroke-stone-800"
                                strokeWidth={1}
                            />
                            <text
                                x={PAD_LEFT - 8}
                                y={yAt(v)}
                                textAnchor="end"
                                dominantBaseline="middle"
                                className="fill-stone-400 text-[9px] dark:fill-stone-500"
                            >
                                {valueFormatter(Math.round(v))}
                            </text>
                        </g>
                    ))}
                    <line
                        x1={PAD_LEFT}
                        x2={width - PAD_RIGHT}
                        y1={yAt(0)}
                        y2={yAt(0)}
                        className="stroke-stone-300 dark:stroke-stone-600"
                        strokeWidth={1.25}
                    />

                    {items.map((item, itemIndex) => {
                        const slotX = PAD_LEFT + itemIndex * slotW;
                        const groupW = barW * item.bars.length + GAP_BAR * (item.bars.length - 1);
                        const groupX = slotX + (slotW - groupW) / 2;

                        return (
                            <g key={item.label}>
                                {item.bars.map((bar, barIndex) => {
                                    const barH = animated ? (bar.value / max) * plotH : 0;
                                    const x = groupX + barIndex * (barW + GAP_BAR);
                                    const y = PAD_TOP + plotH - barH;
                                    const isHovered =
                                        hovered && hovered.item.label === item.label && hovered.bar.name === bar.name;
                                    return (
                                        <rect
                                            key={bar.name}
                                            x={x}
                                            y={y}
                                            width={barW}
                                            height={barH}
                                            rx={3}
                                            fill={bar.color}
                                            opacity={hovered && !isHovered ? 0.4 : 1}
                                            className={`transition-all duration-700 ease-out ${
                                                isClickable ? 'cursor-pointer' : 'cursor-default'
                                            }`}
                                            onMouseMove={(e) => handleMove(e, item, bar)}
                                            onMouseLeave={handleLeave}
                                            onClick={() => isClickable && onBarClick(item)}
                                        />
                                    );
                                })}
                                <text
                                    x={slotX + slotW / 2}
                                    y={height - PAD_BOTTOM + 16}
                                    textAnchor="middle"
                                    className="fill-stone-500 text-[10px] font-medium dark:fill-stone-400"
                                >
                                    {item.label.length > 11 ? `${item.label.slice(0, 10)}…` : item.label}
                                    <title>{item.label}</title>
                                </text>
                            </g>
                        );
                    })}
                </svg>

                <ChartTooltip
                    point={
                        hovered && tooltipPos
                            ? {
                                  ...tooltipPos,
                                  content: (
                                      <>
                                          <div className="font-semibold">{hovered.item.label}</div>
                                          <div className="opacity-80">
                                              {hovered.bar.name}: {valueFormatter(hovered.bar.value)}
                                          </div>
                                      </>
                                  ),
                              }
                            : null
                    }
                />
            </div>
        </div>
    );
}

export default ComparisonHistogram;