import React, { useMemo } from 'react';
import DonutChart from '../ui/DonutChart'; // ⚠️ adjust path
import HeatmapCalendar from '../ui/HeatmapCalendar'; // ⚠️ adjust path

// Fixed, semantically-meaningful colors for the statuses we know about;
// anything unrecognized falls back to the shared categorical chart palette
// (§1) cycling by insertion order, so a new/unexpected status string never
// breaks rendering — it just gets the next palette color.
const STATUS_COLORS = {
    pending: '#f97316',   // orange
    processing: '#0ea5e9', // sky
    shipped: '#6366f1',   // indigo
    delivered: '#14b8a6', // teal
    completed: '#14b8a6', // teal
    cancelled: '#dc2626', // red-600 — the one semantic/destructive use here
};
const FALLBACK_PALETTE = ['#0ea5e9', '#f97316', '#8b5cf6', '#10b981', '#ef4444', '#eab308', '#6366f1', '#14b8a6'];

function colorForStatus(status, fallbackIndex) {
    const key = (status || '').toLowerCase();
    return STATUS_COLORS[key] || FALLBACK_PALETTE[fallbackIndex % FALLBACK_PALETTE.length];
}

// Takes an already-filtered orders array — this component only aggregates
// and displays, it doesn't fetch or filter by period itself, so it can be
// dropped into the user panel or an admin page equally.
function OrderInsights({ orders }) {
    const statusSegments = useMemo(() => {
        const counts = new Map();
        orders.forEach((o) => {
            const label = o.status || 'Unknown';
            counts.set(label, (counts.get(label) || 0) + 1);
        });
        return Array.from(counts.entries()).map(([label, value], i) => ({
            label,
            value,
            color: colorForStatus(label, i),
        }));
    }, [orders]);

    const heatmapEntries = useMemo(() => {
        const counts = new Map();
        orders.forEach((o) => {
            const key = new Date(o.$createdAt).toISOString().slice(0, 10);
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
    }, [orders]);

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    By status
                </h3>
                <DonutChart segments={statusSegments} centerLabel="Orders" />
            </div>
            <div className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Daily activity
                </h3>
                <HeatmapCalendar entries={heatmapEntries} weeks={52} />
            </div>
        </div>
    );
}

export default OrderInsights;