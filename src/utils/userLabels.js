// Your users table stores role/permission tags as a single comma-separated
// string in the `label` column (e.g. "admin", "manager,support" or even
// "manager, support" with stray spaces). Appwrite does not give us this as
// an array on its own — normalizing happens once, right here, so every
// consumer (AdminUsers, AdminLayout's hover-prefetch, any future admin
// page) can always treat `row.label` as a clean array, even when the
// column only ever held one word.

// Accepts a raw value straight off a row — a comma string, an already-an-
// array value, or null/undefined — and always returns a lowercase,
// trimmed, non-empty array. Safe to call on anything, normalized or not,
// which is why getHighestRole() below also runs values through this
// itself rather than trusting the caller pre-normalized them.
export function parseLabelField(raw) {
    if (Array.isArray(raw)) {
        return raw.map((l) => String(l).trim().toLowerCase()).filter(Boolean);
    }
    if (typeof raw === 'string') {
        return raw
            .split(',')
            .map((l) => l.trim().toLowerCase())
            .filter(Boolean);
    }
    return [];
}

// Returns a new row with `label` guaranteed to be an array — "admin" turns
// into ["admin"], "manager,support" into ["manager", "support"], and a
// missing/empty column into []. Use this once, right after fetching rows
// from the backend, before they go into redux.
export function normalizeUserRow(row) {
    return { ...row, label: parseLabelField(row.label) };
}

export function normalizeUserRows(rows) {
    return Array.isArray(rows) ? rows.map(normalizeUserRow) : [];
}