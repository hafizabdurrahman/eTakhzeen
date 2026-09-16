// Suggested location: src/constants/roles.jsx
import React from 'react';
import { parseLabelField } from '../utils/userLabels'; // ⚠️ adjust path to match your project

// ---------------------------------------------------------------------------
// Single source of truth for role ranking + styling. Previously this lived
// duplicated inside AdminUsers.jsx, which is why the profile screen and the
// list screen could never share a RoleBadge. Pulling it out here means any
// screen (list, profile, trends) renders roles identically.
// ---------------------------------------------------------------------------

export const ROLE_RANK = { admin: 3, manager: 2, support: 1, regular: 0 };
export const ROLE_ORDER = ['admin', 'manager', 'support', 'regular'];

// A calmer, more professional palette than the old neon red (#fe2323).
// Rose is reserved for the highest-privilege role as a genuine signal, not
// decoration; the other three step down in saturation. Each `chart` hex is
// the same color family as its badge, so donut/bar legends read as the same
// role at a glance.
export const ROLE_META = {
    admin: {
        label: 'Admin',
        badge: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
        chart: '#be123c',
    },
    manager: {
        label: 'Manager',
        badge: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30',
        chart: '#4f46e5',
    },
    support: {
        label: 'Support',
        badge: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
        chart: '#d97706',
    },
    regular: {
        label: 'Regular',
        badge: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
        chart: '#64748b',
    },
};

// Highest-ranking role found in a user's `label` field. Accepts a raw comma
// string, an already-parsed array, or null/undefined — parseLabelField()
// handles all three. Defaults to "regular" once nothing recognisable is
// left after parsing, e.g. the column really is empty.
export function getHighestRole(rawLabel) {
    const labels = parseLabelField(rawLabel);
    if (labels.length === 0) return 'regular';
    let best = 'regular';
    for (const l of labels) {
        if (ROLE_RANK[l] !== undefined && ROLE_RANK[l] > ROLE_RANK[best]) best = l;
    }
    return best;
}

// A requester can only block/unblock someone strictly below them in rank,
// and can never act on their own row.
export function canModerate(requesterRole, targetRole, isSelf) {
    if (isSelf) return false;
    return ROLE_RANK[requesterRole] > ROLE_RANK[targetRole];
}

export function initials(name, username) {
    const src = (name || username || '?').trim();
    const parts = src.split(/\s+/);
    return parts.length > 1
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : src.slice(0, 2).toUpperCase();
}

export function RoleBadge({ role }) {
    const meta = ROLE_META[role] || ROLE_META.regular;
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${meta.badge}`}>
            {meta.label}
        </span>
    );
}