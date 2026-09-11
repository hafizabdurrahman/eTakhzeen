import React, { useEffect, useMemo, useRef, useState } from 'react';
import ChartTooltip from './ChartTooltip';

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const GAP = 4;
const MIN_CELL = 11;    // slightly larger floor than before
const MAX_CELL = 16;    // slightly larger ceiling — still small/dense, not the old 20px blowout
const TARGET_CELL = 13; // used only to pick a sensible starting week-count
const TOP_MARGIN = 16;
const DEFAULT_MIN_WEEKS = 8;
const DEFAULT_MAX_WEEKS = 26;

function toDateKey(date) {
    return date.toISOString().slice(0, 10);
}

function levelFor(count, max) {
    if (count <= 0) return 0;
    if (max <= 1) return count > 0 ? 4 : 0;
    const ratio = count / max;
    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
}

const LEVEL_CLASSES = [
    'fill-stone-100 dark:fill-stone-700',
    'fill-emerald-300 dark:fill-emerald-800',
    'fill-emerald-500 dark:fill-emerald-600',
    'fill-emerald-700 dark:fill-emerald-400',
    'fill-emerald-900 dark:fill-emerald-200',
];

/**
 * Contribution-style calendar, centered and fully responsive. Given the
 * container width, it first picks a column count (`activeWeeks`) that
 * roughly fits at a small target cell size, clamped to [minWeeks,
 * maxWeeks]. It then solves for the exact cell size that makes that many
 * columns fill the container edge-to-edge, clamped to [MIN_CELL,
 * MAX_CELL] so cells stay small and dense rather than ballooning. The
 * grid is centered in its container so any small leftover slack (from
 * the clamps) is distributed evenly instead of collecting on one side.
 *
 * `entries` — [{ date: Date|'YYYY-MM-DD', count, item?, items? }]. `item`/
 * `items` are optional raw records (e.g. order objects) tied to that date
 * — when present, clicking a box passes every item across the days it
 * covers to `onBoxClick`.
 * `days` — how many days of history to cover (drives bucket size when
 * the available columns can't show one box per day). Falls back to
 * `weeks * 7` if omitted.
 * `weeks` — fallback column count used before the container is measured.
 * `minWeeks` / `maxWeeks` — bounds for the responsive column count.
 * `onBoxClick` — optional (bucket) => void,
 *   bucket = { start: Date, end: Date, count: number, items: any[] }.
 */
function HeatmapCalendar({
    entries,
    days,
    weeks = 12,
    minWeeks = DEFAULT_MIN_WEEKS,
    maxWeeks = DEFAULT_MAX_WEEKS,
    onBoxClick,
}) {
    const containerRef = useRef(null);
    const [hovered, setHovered] = useState(null);
    const [tooltipPos, setTooltipPos] = useState(null);
    const [visible, setVisible] = useState(false);
    const [containerWidth, setContainerWidth] = useState(null);

    useEffect(() => {
        const t = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(t);
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((list) => {
            const w = list[0]?.contentRect?.width;
            if (w) setContainerWidth(w);
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Step 1 — pick a column count that roughly fits at the target cell
    // size, clamped to the requested bounds.
    const activeWeeks = useMemo(() => {
        if (!containerWidth) return weeks;
        const fit = Math.floor((containerWidth + GAP) / (TARGET_CELL + GAP));
        return Math.max(minWeeks, Math.min(maxWeeks, fit));
    }, [containerWidth, weeks, minWeeks, maxWeeks]);

    // Step 2 — solve for the exact cell size that makes `activeWeeks`
    // columns fill the container width, clamped to [MIN_CELL, MAX_CELL].
    const cell = useMemo(() => {
        if (!containerWidth) return TARGET_CELL;
        const raw = Math.floor((containerWidth - (activeWeeks - 1) * GAP) / activeWeeks);
        return Math.max(MIN_CELL, Math.min(MAX_CELL, raw));
    }, [containerWidth, activeWeeks]);

    const totalSlots = activeWeeks * 7;
    const totalDays = Math.max(totalSlots, days || totalSlots);
    const bucketSize = Math.max(1, Math.ceil(totalDays / totalSlots));
    const coveredDays = bucketSize * totalSlots;

    const { buckets, monthMarkers, max } = useMemo(() => {
        const perDay = new Map();
        entries.forEach((e) => {
            const key = typeof e.date === 'string' ? e.date.slice(0, 10) : toDateKey(e.date);
            const existing = perDay.get(key) || { count: 0, items: [] };
            existing.count += e.count ?? 1;
            if (e.items) existing.items.push(...e.items);
            else if (e.item) existing.items.push(e.item);
            perDay.set(key, existing);
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const rangeStart = new Date(today);
        rangeStart.setDate(today.getDate() - coveredDays + 1);

        const list = [];
        let maxCount = 0;
        for (let i = 0; i < totalSlots; i++) {
            const bucketStart = new Date(rangeStart);
            bucketStart.setDate(rangeStart.getDate() + i * bucketSize);
            const rawEnd = new Date(bucketStart);
            rawEnd.setDate(bucketStart.getDate() + bucketSize - 1);
            const bucketEnd = rawEnd > today ? today : rawEnd;

            let count = 0;
            let items = [];
            if (bucketStart <= today) {
                let cursor = new Date(bucketStart);
                while (cursor <= bucketEnd) {
                    const key = toDateKey(cursor);
                    const day = perDay.get(key);
                    if (day) {
                        count += day.count;
                        items = items.concat(day.items);
                    }
                    cursor = new Date(cursor.getTime() + DAY_MS);
                }
            }
            if (count) maxCount = Math.max(maxCount, count);

            list.push({
                key: toDateKey(bucketStart),
                start: bucketStart,
                end: bucketEnd,
                count,
                items,
                isFuture: bucketStart > today,
                column: Math.floor(i / 7),
                row: i % 7,
            });
        }

        const markers = [];
        let lastMonth = null;
        list.forEach((b) => {
            if (b.row !== 0) return;
            const m = b.start.getMonth();
            if (m !== lastMonth) {
                markers.push({ index: b.column, label: MONTH_LABELS[m] });
                lastMonth = m;
            }
        });

        return { buckets: list, monthMarkers: markers, max: maxCount };
    }, [entries, totalSlots, bucketSize, coveredDays]);

    function handleMove(e, bucket) {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setHovered(bucket);
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    function handleLeave() {
        setHovered(null);
        setTooltipPos(null);
    }

    function handleClick(bucket) {
        if (!onBoxClick || bucket.isFuture || bucket.count === 0) return;
        onBoxClick(bucket);
    }

    const gridWidth = activeWeeks * (cell + GAP) - GAP;
    const gridHeight = 7 * (cell + GAP) - GAP;
    const viewW = gridWidth;
    const viewH = gridHeight + TOP_MARGIN;
    const isClickable = Boolean(onBoxClick);

    return (
        <div>
            <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
                {bucketSize === 1
                    ? `Each square is one day over the last ${coveredDays} days — darker means more orders were placed that day.`
                    : `Each square covers ${bucketSize} days over the last ~${Math.round(coveredDays / 30)} months — darker means more orders were placed in that span.`}
            </p>
            <div ref={containerRef} className="relative flex w-full justify-center">
                <svg
                    viewBox={`0 0 ${viewW} ${viewH}`}
                    width={viewW}
                    height={viewH}
                    style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                    preserveAspectRatio="xMidYMid meet"
                    className={`transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
                >
                    {monthMarkers.map((m) => (
                        <text
                            key={m.index}
                            x={m.index * (cell + GAP)}
                            y={10}
                            className="fill-stone-500 text-[9px] dark:fill-stone-400"
                        >
                            {m.label}
                        </text>
                    ))}
                    <g transform={`translate(0, ${TOP_MARGIN})`}>
                        {buckets.map((b) => {
                            if (b.isFuture) return null;
                            const level = levelFor(b.count, max);
                            return (
                                <rect
                                    key={b.key}
                                    x={b.column * (cell + GAP)}
                                    y={b.row * (cell + GAP)}
                                    width={cell}
                                    height={cell}
                                    rx={2.5}
                                    className={`${LEVEL_CLASSES[level]} transition-all duration-200 hover:opacity-70 ${
                                        isClickable && b.count > 0 ? 'cursor-pointer' : 'cursor-default'
                                    }`}
                                    onMouseMove={(e) => handleMove(e, b)}
                                    onMouseLeave={handleLeave}
                                    onClick={() => handleClick(b)}
                                />
                            );
                        })}
                    </g>
                </svg>

                <ChartTooltip
                    point={
                        hovered && tooltipPos
                            ? {
                                  ...tooltipPos,
                                  content: (
                                      <>
                                          <div className="font-semibold">
                                              {bucketSize === 1
                                                  ? hovered.start.toLocaleDateString()
                                                  : `${hovered.start.toLocaleDateString()} – ${hovered.end.toLocaleDateString()}`}
                                          </div>
                                          <div className="opacity-80">
                                              {hovered.count} order{hovered.count === 1 ? '' : 's'}
                                          </div>
                                          {onBoxClick && hovered.count > 0 && (
                                              <div className="mt-0.5 text-[10px] opacity-60">Click to view</div>
                                          )}
                                      </>
                                  ),
                              }
                            : null
                    }
                />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-1 text-xs text-stone-500 dark:text-stone-400">
                Fewer
                {LEVEL_CLASSES.map((cls, i) => (
                    <svg key={i} width="10" height="10">
                        <rect width="10" height="10" rx="2" className={cls} />
                    </svg>
                ))}
                More
            </div>
        </div>
    );
}

export default HeatmapCalendar;