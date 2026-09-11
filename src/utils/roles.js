// src/utils/roles.js
//
// Appwrite exposes a user's team/label memberships as `user.labels`
// (a plain array of strings, e.g. ["admin"] or ["support", "manager"]).
// This module turns those raw labels into a normalized "staff scope"
// the rest of the app (AdminContact, route guards, inbox grouping, etc.)
// can rely on — and enforces the rule "if the label isn't present on
// the account, it doesn't show up anywhere."

// The only labels the app understands as staff roles.
export const STAFF_ROLES = Object.freeze({
    ADMIN: 'admin',
    SUPPORT: 'support',
    MANAGER: 'manager',
});

const ALL_STAFF_LABELS = Object.values(STAFF_ROLES);

// Which "departments" (used by the AdminContact department filter/fetchInbox)
// each role is allowed to see. Admin is treated as a super-role and sees
// every department; support/manager only see their own queue.
const ROLE_DEPARTMENTS = {
    [STAFF_ROLES.ADMIN]: ALL_STAFF_LABELS,
    [STAFF_ROLES.SUPPORT]: [STAFF_ROLES.SUPPORT],
    [STAFF_ROLES.MANAGER]: [STAFF_ROLES.MANAGER],
};

// Priority order used whenever we need to pick ONE role to represent a user
// (e.g. collapsing 10 admins into a single contact-list item).
const ROLE_PRIORITY = [STAFF_ROLES.ADMIN, STAFF_ROLES.MANAGER, STAFF_ROLES.SUPPORT];

function normalizeLabels(labels) {
    if (!Array.isArray(labels)) return [];
    return labels.filter(Boolean).map((l) => String(l).trim().toLowerCase());
}

/**
 * Returns only the labels that are (a) actually present on the account AND
 * (b) recognized staff roles, in priority order. This is the single source
 * of truth for "don't show a role that isn't present."
 */
export function getPresentRoles(labels) {
    const normalized = normalizeLabels(labels);
    return ROLE_PRIORITY.filter((role) => normalized.includes(role));
}

export function hasRole(labels, role) {
    return normalizeLabels(labels).includes(String(role).toLowerCase());
}

export function isAdmin(labels) {
    return hasRole(labels, STAFF_ROLES.ADMIN);
}

export function isStaff(labels) {
    return getPresentRoles(labels).length > 0;
}

/**
 * Picks a single "primary" role for a user who might hold multiple labels.
 * Used both for display (one badge) and for grouping (one list item).
 */
export function getPrimaryRole(labels) {
    const present = getPresentRoles(labels);
    return present[0] || null;
}

/**
 * Builds the department list a set of roles is allowed to view, deduped.
 */
export function getDepartmentsForRoles(roles) {
    const departments = new Set();
    roles.forEach((role) => {
        (ROLE_DEPARTMENTS[role] || []).forEach((d) => departments.add(d));
    });
    return Array.from(departments);
}

/**
 * Main entry point — this is what AdminContact.jsx calls.
 * Given raw Appwrite `user.labels`, returns everything needed to gate
 * access to the panel and drive the department filter dropdown.
 *
 * {
 *   roles: ['admin'],          // only labels actually on the account
 *   isStaff: true,
 *   isAdmin: true,
 *   primaryRole: 'admin',
 *   departments: ['admin','support','manager'],
 * }
 */
export function getStaffScope(labels) {
    const roles = getPresentRoles(labels);
    const departments = getDepartmentsForRoles(roles);

    return {
        roles,
        isStaff: roles.length > 0,
        isAdmin: roles.includes(STAFF_ROLES.ADMIN),
        primaryRole: roles[0] || null,
        departments,
    };
}

/**
 * Collapses a list of staff users down to one representative per role, so
 * e.g. 10 admins render as a single "Admin" contact-list item in the UI,
 * while still tracking every real member behind it (so a message sent to
 * that item can be routed/broadcast to all of them).
 *
 * users -> array of objects with at least { $id, labels }
 * Returns one entry per role that is actually present among `users`,
 * in ROLE_PRIORITY order. Users with no recognized label are skipped
 * entirely (they never show up).
 */
export function collapseStaffByRole(users = []) {
    const groups = new Map();

    users.forEach((user) => {
        const role = getPrimaryRole(user.labels);
        if (!role) return; // no recognized label -> not shown at all

        if (!groups.has(role)) {
            groups.set(role, { representative: user, members: [user] });
        } else {
            groups.get(role).members.push(user);
        }
    });

    return ROLE_PRIORITY.filter((role) => groups.has(role)).map((role) => {
        const { representative, members } = groups.get(role);
        return {
            role,
            ...representative,
            groupSize: members.length,
            memberIds: members.map((m) => m.$id),
        };
    });
}

export default {
    STAFF_ROLES,
    getPresentRoles,
    hasRole,
    isAdmin,
    isStaff,
    getPrimaryRole,
    getDepartmentsForRoles,
    getStaffScope,
    collapseStaffByRole,
};