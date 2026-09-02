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

    if (loading) return <p className="text-neutral-400">Loading user...</p>;
    if (error) return <p className="text-red-400">{error}</p>;
    if (!profile) return <p className="text-neutral-400">User not found.</p>;

    return (
        <div className="max-w-lg">
            <button
                onClick={() => navigate('/admin/users')}
                className="text-sm text-neutral-400 hover:underline mb-4"
            >
                ← Back to Users
            </button>

            <h1 className="text-xl font-semibold mb-1">{profile.name || profile.username}</h1>
            <p className="text-sm mb-4">
                {profile.blocked ? (
                    <span className="text-red-400">Blocked</span>
                ) : (
                    <span className="text-green-400">Active</span>
                )}
            </p>

            <div className="space-y-2 border border-neutral-800 rounded-lg p-4 mb-4">
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
                    className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                        profile.blocked ? 'bg-green-700' : 'bg-red-700'
                    }`}
                >
                    {blocking ? 'Updating...' : profile.blocked ? 'Unblock User' : 'Block User'}
                </button>

                {/* Wired up later — button only for now, per request */}
                <button className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium">
                    Contact
                </button>
                <button
                    onClick={() => navigate(`/admin/orders?username=${profile.username}`)}
                    className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium"
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
            <span className="text-neutral-400">{label}</span>
            <span>{value || '—'}</span>
        </div>
    );
}

export default AdminUserProfile;