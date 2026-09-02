import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useSelector } from 'react-redux';
import { user } from '../backend/'; // adjust path to your actual file

function User() {
    const { username } = useParams();
    const userData = useSelector((s) => s.user.userData);

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // CheckUser already guarantees a non-admin can only land here on
        // their own username, but we still pass requesterId/labels so
        // getProfile enforces the same rule at the data layer too.
        if (!userData || !userData['$id']) return;

        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                const result = await user.getProfile({
                    requesterLabels: userData.labels,
                    requesterId: userData['$id'],
                    targetId: username,
                });

                if (cancelled) return;

                if (!result || Array.isArray(result)) {
                    // Array shouldn't happen on this route (that's the admin
                    // "all users" case), but guard against it defensively.
                    setError('Could not load this profile.');
                    setProfile(null);
                } else {
                    setProfile(result);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error(err);
                    setError('Something went wrong loading this profile.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userData, username]);

    if (loading) {
        return <div>Loading profile...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    if (!profile) {
        return <div>No profile data found.</div>;
    }

    // Prefer the freshly-fetched profile row for this check — it reflects
    // whatever an admin set most recently. userData is a fallback in case
    // profile.blocked ever comes back undefined for some reason.
    const isBlocked = profile.blocked ?? userData.blocked;

    return (
        <div>
            {isBlocked && (
                <div className="rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 mb-4">
                    Your account ({profile.username || userData['$id']}
                    {profile.email ? `, ${profile.email}` : ''}) has been blocked by an
                    administrator. You can only view this page — you won't be able to
                    browse the rest of the site. Contact support if you believe this
                    is a mistake.
                </div>
            )}

            <h2>Welcome, {profile.name || userData.name}</h2>
            <dl>
                <dt>Username</dt>
                <dd>{profile.username || userData['$id']}</dd>

                <dt>Email</dt>
                <dd>{profile.email || userData.email}</dd>

                <dt>Phone</dt>
                <dd>{profile.phone || 'Not provided'}</dd>

                {userData.labels?.length > 0 && (
                    <>
                        <dt>Roles</dt>
                        <dd>{userData.labels.join(', ')}</dd>
                    </>
                )}
            </dl>
        </div>
    );
}

export default User;