import { Permission, Role } from 'appwrite';

// 'other' has no dedicated label — admins are its fallback owners, so it's
// intentionally left out of this list.
const DEPARTMENTS_WITH_LABELS = ['manager', 'support'];

/**
 * Per-row permissions for Conversation/Contact/Response rows.
 * Requires Document Security ON + the `users` role REMOVED at the table
 * level for these three tables (see console note) — otherwise this has
 * no real effect, since Appwrite unions table-level and document-level
 * grants rather than letting document-level narrow a broader table grant.
 *
 * - Owner (the end user) gets read+update on their own row.
 * - `admin` label always gets read+update.
 * - `manager`/`support` also get read+update when the row's department
 *   matches, so staff can work their queue without the `admin` label.
 */
export function buildRowPermissions({ userId, department }) {
    const permissions = [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.read(Role.label('admin')),
        Permission.update(Role.label('admin')),
    ];

    if (DEPARTMENTS_WITH_LABELS.includes(department)) {
        permissions.push(Permission.read(Role.label(department)));
        permissions.push(Permission.update(Role.label(department)));
    }

    return permissions;
}