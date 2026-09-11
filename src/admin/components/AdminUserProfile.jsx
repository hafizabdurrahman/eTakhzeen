import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import { user } from '../../backend';

// Full profile view for a single user — only reachable from AdminUsers by
// clicking a row. Password is shown here ONLY (never in the list view).
function AdminUserProfile() {
    const { username } = useParams();
    const navigate = useNavigate();
    const userData = useSelector((s) => s.user.userData);

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [blocking, setBlocking] = useState(false);

    const loadProfile = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await user.getProfile({
                requesterLabels: userData?.labels,
                requesterId: userData?.['$id'],
                targetId: username,
            });
            setProfile(result || null);
        } catch (err) {
            setError('Failed to load this user.');
        } finally {
            setLoading(false);
        }
    }, [userData, username]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    async function handleToggleBlock() {
        if (!profile) return;
        setBlocking(true);
        const nextBlocked = !profile.blocked;
        const result = await user.setBlocked({ rowId: profile['$id'], blocked: nextBlocked });
        setBlocking(false);

        if (!result) {
            alert('Failed to update block status.');
            return;
        }
        setProfile((prev) => ({ ...prev, blocked: nextBlocked }));
    }

    if (loading) return <p className="text-sm text-stone-500 dark:text-stone-400">Loading user...</p>;
    if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
    if (!profile) return <p className="text-sm text-stone-500 dark:text-stone-400">User not found.</p>;

    return (
        <div className="max-w-lg">
            <button
                onClick={() => navigate('/admin/users')}
                className="mb-4 text-sm text-stone-500 hover:text-brand-600 hover:underline dark:text-stone-400 dark:hover:text-brand-500"
            >
                ← Back to Users
            </button>

            <h1 className="mb-1 text-3xl font-bold text-stone-900 dark:text-stone-100">{profile.name || profile.username}</h1>
            <p className="text-sm mb-4">
                {profile.blocked ? (
                    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-400">Blocked</span>
                ) : (
                    <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/20 dark:text-green-400">Active</span>
                )}
            </p>

            <div className="mb-4 space-y-2 rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <Row label="Username" value={profile.username} />
                <Row label="Name" value={profile.name} />
                <Row label="Email" value={profile.email} />
                <Row label="Phone" value={profile.phone} />
                <Row label="Password" value={profile.password} />
            </div>

            <div className="flex gap-2">
                <button
                    onClick={handleToggleBlock}
                    disabled={blocking}
                    className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        profile.blocked ? 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600' : 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
                    }`}
                >
                    {blocking ? 'Updating...' : profile.blocked ? 'Unblock User' : 'Block User'}
                </button>

                {/* Wired up later — button only for now, per request */}
                <button className="rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700">
                    Contact
                </button>
                <button
                    onClick={() => navigate(`/admin/orders?username=${profile.username}`)}
                    className="rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
                >   
                    View Orders
                </button>
            </div>
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-stone-500 dark:text-stone-400">{label}</span>
            <span className="text-stone-900 dark:text-stone-100">{value || '—'}</span>
        </div>
    );
}

export default AdminUserProfile;