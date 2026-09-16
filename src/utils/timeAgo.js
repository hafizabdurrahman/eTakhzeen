// Turns an ISO date (Appwrite's $createdAt / $updatedAt) into "2 days ago",
// "in 3 hours", "just now". Uses Intl so it localises for free and handles
// pluralisation correctly instead of hand-rolling "1 days ago".
const DIVISIONS = [
    { amount: 60, unit: 'second' },
    { amount: 60, unit: 'minute' },
    { amount: 24, unit: 'hour' },
    { amount: 7, unit: 'day' },
    { amount: 4.34524, unit: 'week' },
    { amount: 12, unit: 'month' },
    { amount: Number.POSITIVE_INFINITY, unit: 'year' },
];

export function timeAgo(input, locale = undefined) {
    if (!input) return '';

    const date = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(date.getTime())) return '';

    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    let duration = (date.getTime() - Date.now()) / 1000;

    // Anything inside a minute reads better as "just now" than "-12 seconds ago"
    if (Math.abs(duration) < 45) return 'just now';

    for (const division of DIVISIONS) {
        if (Math.abs(duration) < division.amount) {
            return formatter.format(Math.round(duration), division.unit);
        }
        duration /= division.amount;
    }

    return '';
}

// Absolute form for tooltips — the relative string is scannable, this is
// the precise answer when someone hovers to check.
export function formatDateTime(input, locale = undefined) {
    if (!input) return '';
    const date = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

// Appwrite always sets $updatedAt, and it equals $createdAt on insert.
// Comparing them tells you whether to say "Added" or "Updated".
export function activityLabel(row) {
    const created = row?.['$createdAt'];
    const updated = row?.['$updatedAt'];
    if (!created && !updated) return null;

    const wasEdited =
        created && updated && new Date(updated).getTime() - new Date(created).getTime() > 1000;

    return {
        verb: wasEdited ? 'Updated' : 'Added',
        iso: wasEdited ? updated : created,
    };
}