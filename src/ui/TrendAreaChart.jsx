import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import ChartTooltip from './ChartTooltip';

const PAD_LEFT = 46;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const Y_TICKS = 4;

// Distinct stroke patterns per series so overlapping lines stay tellable
// apart even when two series happen to sit close in value — color alone
// isn't enough once lines cross. Cycled by series index unless a series
// explicitly sets its own `dash`.
const DASH_CYCLE = [undefined, '7 4', '1.5 4', '9 3 2 3'];
const DASH_PATTERNS = { solid: undefined, dashed: '7 4', dotted: '1.5 4', dashdot: '9 3 2 3' };

// Small checkbox that tints to the series' own color when checked, instead
// of the shared ui/Checkbox's fixed brand color — so a legend toggle reads
// as "the Profit tag" rather than a generic checked box next to a label.
function ColorCheckbox({ checked, color, onChange, label }) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={label}
            onClick={(e) => {
                e.stopPropagation();
                onChange(!checked);
            }}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors duration-150"
            style={
                checked
                    ? { borderColor: color, backgroundColor: color }
                    : { borderColor: 'var(--tw-checkbox-border, #d6d3d1)' }
            }
        >
            {checked && <Check size={10} strokeWidth={3} className="text-white" />}
        </button>
    );
}

// Tiny dash-pattern preview so the legend communicates both color AND line
// style before the person even hovers the chart.
function DashSwatch({ color, dash }) {
    return (
        <svg width="18" height="8" className="shrink-0">
            <line x1="0" y1="4" x2="18" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dash} strokeLinecap="round" />
        </svg>
    );
}

/**
 * Multi-series line/area trend chart with a zero baseline — needed because
 * Profit/Loss can go negative, which none of the existing bar-based charts
 * support (they only ever draw positive bars from zero).
 *
 * `series` = [{ key, name, color, values: number[], dash?: 'solid'|'dashed'|'dotted'|'dashdot' }]
 * `xLabels` = string[], same length as each series' `values`.
 * `valueFormatter` = (n) => string, used on the y-axis and in the tooltip.
 * `defaultHidden` = string[] of series keys that start unchecked.
 * `presets` = [{ label, keys: string[] }] — optional quick-filter chips
 * above the legend that jump straight to a common combination (e.g. "Profit
 * & Loss only") without unchecking things one at a time.
 */
function TrendAreaChart({ series, xLabels, valueFormatter = (n) => n, height = 260, defaultHidden = [], presets = [] }) {
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(null);
    const [visible, setVisible] = useState(
        () => new Set(series.map((s) => s.key).filter((k) => !defaultHidden.includes(k)))
    );
    const [animated, setAnimated] = useState(false);
    const [hoverIndex, setHoverIndex] = useState(null);
    const [tooltipPos, setTooltipPos] = useState(null);

    useEffect(() => {
        setAnimated(false);
        const t = requestAnimationFrame(() => setAnimated(true));
        return () => cancelAnimationFrame(t);
    }, [series, xLabels]);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((list) => {
            const w = list[0]?.contentRect?.width;
            if (w) setContainerWidth(w);
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const width = containerWidth || 600;
    const plotW = Math.max(1, width - PAD_LEFT - PAD_RIGHT);
    const plotH = Math.max(1, height - PAD_TOP - PAD_BOTTOM);
    const n = xLabels.length;

    const dashFor = (s, i) => (s.dash ? DASH_PATTERNS[s.dash] : DASH_CYCLE[i % DASH_CYCLE.length]);

    const visibleSeries = series.filter((s) => visible.has(s.key));

    const { min, max } = useMemo(() => {
        const all = visibleSeries.flatMap((s) => s.values);
        all.push(0); // always include the baseline so pos/neg both render
        return { min: Math.min(...all), max: Math.max(...all) };
    }, [visibleSeries]);

    const span = max - min || 1;
    const xAt = (i) => (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW) + PAD_LEFT;
    const yAt = (v) => PAD_TOP + plotH - ((v - min) / span) * plotH;
    const zeroY = yAt(0);

    function pathFor(values) {
        return values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(v)}`).join(' ');
    }
    function areaFor(values) {
        if (values.length === 0) return '';
        return `${pathFor(values)} L ${xAt(values.length - 1)} ${zeroY} L ${xAt(0)} ${zeroY} Z`;
    }

    const yTickValues = useMemo(() => {
        const step = span / Y_TICKS;
        return Array.from({ length: Y_TICKS + 1 }, (_, i) => min + step * i);
    }, [min, span]);

    // Single overlay covering the whole plot area, nearest-point lookup by
    // mouse x. Replaces one-hit-rect-per-point: with narrow buckets those
    // tiny rects left gaps the cursor could slip through between points,
    // which combined with the hover circles sitting on top (see below) is
    // what caused the tooltip to flicker in and out constantly.
    function handleOverlayMove(e) {
        if (!containerRef.current || n === 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const relative = (localX - PAD_LEFT) / plotW;
        const index = Math.round(relative * (n - 1));
        setHoverIndex(Math.max(0, Math.min(n - 1, index)));
        setTooltipPos({ x: localX, y: e.clientY - rect.top });
    }
    function handleOverlayLeave() {
        setHoverIndex(null);
        setTooltipPos(null);
    }

    function toggleSeries(key) {
        setVisible((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                if (next.size === 1) return prev; // keep at least one series visible
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }

    function applyPreset(keys) {
        setVisible(new Set(keys));
    }

    if (n === 0) {
        return <p className="text-sm text-stone-500 dark:text-stone-400">No data for this period.</p>;
    }

    // At most ~8 x-axis labels so they don't collide on narrow screens or
    // long ranges — every Nth label is shown, always including the last.
    const labelStride = Math.max(1, Math.ceil(n / 8));

    return (
        <div>
            {presets.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {presets.map((p) => {
                        const isActive = p.keys.length === visible.size && p.keys.every((k) => visible.has(k));
                        return (
                            <button
                                key={p.label}
                                type="button"
                                onClick={() => applyPreset(p.keys)}
                                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                    isActive
                                        ? 'border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-400'
                                        : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-200'
                                }`}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="mb-3 flex flex-wrap gap-2">
                {series.map((s, i) => {
                    const dash = dashFor(s, i);
                    const on = visible.has(s.key);
                    return (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => toggleSeries(s.key)}
                            className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors ${
                                on
                                    ? 'border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800'
                                    : 'border-transparent opacity-50 hover:opacity-80'
                            }`}
                        >
                            <ColorCheckbox checked={on} color={s.color} onChange={() => toggleSeries(s.key)} label={`Toggle ${s.name}`} />
                            <DashSwatch color={s.color} dash={dash} />
                            <span className="font-medium text-stone-600 dark:text-stone-300">{s.name}</span>
                        </button>
                    );
                })}
            </div>

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
                            <text x={PAD_LEFT - 8} y={yAt(v)} textAnchor="end" dominantBaseline="middle" className="fill-stone-400 text-[9px] dark:fill-stone-500">
                                {valueFormatter(Math.round(v))}
                            </text>
                        </g>
                    ))}
                    <line
                        x1={PAD_LEFT}
                        x2={width - PAD_RIGHT}
                        y1={zeroY}
                        y2={zeroY}
                        className="stroke-stone-300 dark:stroke-stone-600"
                        strokeWidth={1.25}
                        strokeDasharray="3 3"
                    />

                    {xLabels.map((label, i) =>
                        i % labelStride === 0 || i === n - 1 ? (
                            <text key={i} x={xAt(i)} y={height - 8} textAnchor="middle" className="fill-stone-400 text-[9px] dark:fill-stone-500">
                                {label}
                            </text>
                        ) : null
                    )}

                    {/* Areas + lines — pointer-events-none so they never
                        compete with the overlay rect below for the mouse. */}
                    {visibleSeries.map((s) => (
                        <path
                            key={`area-${s.key}`}
                            d={areaFor(s.values)}
                            fill={s.color}
                            className="pointer-events-none transition-opacity duration-700 ease-out"
                            style={{ opacity: animated ? 0.12 : 0 }}
                        />
                    ))}
                    {visibleSeries.map((s, i) => (
                        <path
                            key={`line-${s.key}`}
                            d={pathFor(s.values)}
                            fill="none"
                            stroke={s.color}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray={dashFor(s, i)}
                            className="pointer-events-none transition-opacity duration-700 ease-out"
                            style={{ opacity: animated ? 1 : 0 }}
                        />
                    ))}

                    {/* Single hover overlay — the actual fix for the
                        flicker. One large hit target instead of many thin
                        ones, so there's no dead space between points for
                        the cursor to fall through. */}
                    <rect
                        x={PAD_LEFT}
                        y={PAD_TOP}
                        width={plotW}
                        height={plotH}
                        fill="transparent"
                        onMouseMove={handleOverlayMove}
                        onMouseLeave={handleOverlayLeave}
                        className="cursor-crosshair"
                    />

                    {hoverIndex !== null && (
                        <line
                            x1={xAt(hoverIndex)}
                            x2={xAt(hoverIndex)}
                            y1={PAD_TOP}
                            y2={PAD_TOP + plotH}
                            className="pointer-events-none stroke-stone-300 dark:stroke-stone-600"
                            strokeWidth={1}
                        />
                    )}
                    {/* pointer-events-none is what stops these markers from
                        stealing hover away from the overlay rect beneath
                        them — that theft was the actual cause of the
                        tooltip flashing on/off before. */}
                    {hoverIndex !== null &&
                        visibleSeries.map((s) => (
                            <circle
                                key={s.key}
                                cx={xAt(hoverIndex)}
                                cy={yAt(s.values[hoverIndex])}
                                r={3.5}
                                fill={s.color}
                                stroke="white"
                                strokeWidth={1.5}
                                className="pointer-events-none dark:stroke-stone-900"
                            />
                        ))}
                </svg>

                <ChartTooltip
                    point={
                        hoverIndex !== null && tooltipPos
                            ? {
                                  ...tooltipPos,
                                  content: (
                                      <>
                                          <div className="mb-0.5 font-semibold">{xLabels[hoverIndex]}</div>
                                          {visibleSeries.map((s) => (
                                              <div key={s.key} className="flex items-center gap-1.5 opacity-90">
                                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                                                  {s.name}: {valueFormatter(s.values[hoverIndex])}
                                              </div>
                                          ))}
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

export default TrendAreaChart;