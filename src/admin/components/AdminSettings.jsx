import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
    Palette,
    UserRound,
    ShieldCheck,
    Bell,
    Loader2,
    Check,
    Eye,
    EyeOff,
    AlertTriangle,
} from 'lucide-react';

import { user } from '../../backend'; // ⚠️ adjust path to match your project
import auth from '../../backend/auth'; // ⚠️ adjust path to match your project
import { ThemeToggle } from '../../components'; // ⚠️ adjust path — this is your existing component, untouched
import { SegmentedControl, Toggle } from '../../ui';

const SECTIONS = [
    { value: 'appearance', label: 'Appearance', icon: Palette },
    { value: 'account', label: 'Account', icon: UserRound },
    { value: 'security', label: 'Security', icon: ShieldCheck },
    { value: 'notifications', label: 'Notifications', icon: Bell },
];

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

// Card shell every section uses, so spacing/border/radius stays identical
// across tabs — the only thing that should visibly change on tab switch is
// the content, not the chrome around it.
function SettingsCard({ title, description, children }) {
    return (
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-6">
            {(title || description) && (
                <div className="mb-5">
                    {title && <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">{title}</h2>}
                    {description && <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{description}</p>}
                </div>
            )}
            {children}
        </div>
    );
}

// One labelled row inside a card — label + description on the left,
// control on the right. Used for both toggle rows and the theme row so
// Appearance and Notifications read as the same kind of list.
function SettingRow({ title, description, children, last = false }) {
    return (
        <div
            className={`flex items-center justify-between gap-4 py-4 ${
                last ? '' : 'border-b border-stone-100 dark:border-stone-800/70'
            }`}
        >
            <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{title}</p>
                {description && <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{description}</p>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">{label}</span>
            {children}
        </label>
    );
}

const inputClass =
    'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20 dark:disabled:bg-stone-900';

// Save button that shows its own state (idle / saving / saved) so a click
// always confirms it did something, without a separate toast system.
function SaveButton({ status, onClick, disabled }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || status === 'saving'}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
        >
            {status === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === 'saved' && <Check className="h-4 w-4" />}
            {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : 'Save changes'}
        </button>
    );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function AppearanceSection() {
    return (
        <SettingsCard title="Appearance" description="Controls how the admin panel looks on this device.">
            <SettingRow title="Dark mode" description="Switch between a light and dark interface." last>
                <ThemeToggle />
            </SettingRow>
        </SettingsCard>
    );
}

function AccountSection({ userData }) {
    const [form, setForm] = useState({
        name: userData?.name || '',
        email: userData?.email || '',
        phone: userData?.phone || '',
    });
    const [status, setStatus] = useState('idle'); // idle | saving | saved | error
    const [error, setError] = useState('');

    const dirty =
        form.name !== (userData?.name || '') ||
        form.email !== (userData?.email || '') ||
        form.phone !== (userData?.phone || '');

    function update(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
        if (status !== 'idle') setStatus('idle');
    }

    async function handleSave() {
        setStatus('saving');
        setError('');
        // ⚠️ adjust to your actual Appwrite update call — this assumes a
        // sibling method to user.getProfile()/user.setBlocked() that
        // updates the caller's own row.
        const result = await user.updateProfile({
            id: userData?.['$id'],
            name: form.name,
            email: form.email,
            phone: form.phone,
        });

        if (!result) {
            setStatus('error');
            setError('Failed to update your account. Please try again.');
            return;
        }

        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2000);
    }

    return (
        <SettingsCard title="Account" description="Your profile information as shown across the admin panel.">
            <div className="flex items-center gap-4 border-b border-stone-100 pb-5 dark:border-stone-800/70">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                    {(form.name || userData?.username || '?')[0]?.toUpperCase()}
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {userData?.username || 'Your account'}
                    </p>
                    <p className="truncate text-xs text-stone-500 dark:text-stone-400">{userData?.email}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2">
                <Field label="Full name">
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        className={inputClass}
                        placeholder="Your name"
                    />
                </Field>
                <Field label="Username">
                    <input type="text" value={userData?.username || ''} disabled className={inputClass} />
                </Field>
                <Field label="Email">
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        className={inputClass}
                        placeholder="you@example.com"
                    />
                </Field>
                <Field label="Phone">
                    <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        className={inputClass}
                        placeholder="+1 555 000 0000"
                    />
                </Field>
            </div>

            {error && (
                <p className="mt-4 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                </p>
            )}

            <div className="mt-5 flex justify-end">
                <SaveButton status={status} onClick={handleSave} disabled={!dirty} />
            </div>
        </SettingsCard>
    );
}

function PasswordField({ label, value, onChange, placeholder }) {
    const [show, setShow] = useState(false);
    return (
        <Field label={label}>
            <div className="relative">
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`${inputClass} pr-10`}
                    autoComplete="new-password"
                />
                <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
                    aria-label={show ? 'Hide password' : 'Show password'}
                >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </Field>
    );
}

function SecuritySection() {
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');

    const canSubmit = current.length > 0 && next.length >= 8 && next === confirm;

    async function handleSave() {
        if (next !== confirm) {
            setError("New passwords don't match.");
            return;
        }
        if (next.length < 8) {
            setError('New password must be at least 8 characters.');
            return;
        }

        setStatus('saving');
        setError('');
        // ⚠️ adjust to your actual Appwrite call, e.g. account.updatePassword
        const result = await auth.updatePassword({ oldPassword: current, newPassword: next });

        if (!result) {
            setStatus('error');
            setError('Failed to update your password. Check your current password and try again.');
            return;
        }

        setStatus('saved');
        setCurrent('');
        setNext('');
        setConfirm('');
        setTimeout(() => setStatus('idle'), 2000);
    }

    return (
        <SettingsCard title="Security" description="Change the password used to sign in to the admin panel.">
            <div className="grid grid-cols-1 gap-4 sm:max-w-sm">
                <PasswordField
                    label="Current password"
                    value={current}
                    onChange={(e) => {
                        setCurrent(e.target.value);
                        setError('');
                    }}
                    placeholder="••••••••"
                />
                <PasswordField
                    label="New password"
                    value={next}
                    onChange={(e) => {
                        setNext(e.target.value);
                        setError('');
                    }}
                    placeholder="At least 8 characters"
                />
                <PasswordField
                    label="Confirm new password"
                    value={confirm}
                    onChange={(e) => {
                        setConfirm(e.target.value);
                        setError('');
                    }}
                    placeholder="Repeat new password"
                />
            </div>

            {error && (
                <p className="mt-4 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                </p>
            )}

            <div className="mt-5 flex justify-end">
                <SaveButton status={status} onClick={handleSave} disabled={!canSubmit} />
            </div>
        </SettingsCard>
    );
}

const DEFAULT_NOTIFICATIONS = {
    newSignups: true,
    orderAlerts: true,
    weeklyDigest: false,
    productUpdates: false,
};

function NotificationsSection() {
    const [prefs, setPrefs] = useState(DEFAULT_NOTIFICATIONS);
    const [status, setStatus] = useState('idle');

    function toggle(key) {
        setPrefs((p) => ({ ...p, [key]: !p[key] }));
        setStatus('idle');
    }

    async function handleSave() {
        setStatus('saving');
        // ⚠️ adjust to wherever you persist preferences — a users-table
        // column, a separate preferences collection, etc.
        const result = await user.updatePreferences?.(prefs);
        setStatus(result === false ? 'error' : 'saved');
        if (result !== false) setTimeout(() => setStatus('idle'), 2000);
    }

    return (
        <SettingsCard title="Notifications" description="Choose what the admin panel should notify you about.">
            <div>
                <SettingRow title="New signups" description="Get notified when someone creates an account.">
                    <Toggle
                        checked={prefs.newSignups}
                        onChange={() => toggle('newSignups')}
                        label="Toggle new signup notifications"
                    />
                </SettingRow>
                <SettingRow title="Order alerts" description="Get notified about new and updated orders.">
                    <Toggle checked={prefs.orderAlerts} onChange={() => toggle('orderAlerts')} label="Toggle order alerts" />
                </SettingRow>
                <SettingRow title="Weekly digest" description="A weekly summary of activity across the store.">
                    <Toggle
                        checked={prefs.weeklyDigest}
                        onChange={() => toggle('weeklyDigest')}
                        label="Toggle weekly digest"
                    />
                </SettingRow>
                <SettingRow
                    title="Product updates"
                    description="Occasional announcements about new admin panel features."
                    last
                >
                    <Toggle
                        checked={prefs.productUpdates}
                        onChange={() => toggle('productUpdates')}
                        label="Toggle product update notifications"
                    />
                </SettingRow>
            </div>

            <div className="mt-5 flex justify-end">
                <SaveButton status={status} onClick={handleSave} />
            </div>
        </SettingsCard>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
function AdminSettings() {
    const userData = useSelector((s) => s.user.userData);
    const [activeSection, setActiveSection] = useState('appearance');
    // Content fades/slides in on every section change — the one
    // deliberate motion moment on this page, not scattered per-card.
    const [entered, setEntered] = useState(false);

    useEffect(() => {
        setEntered(false);
        const t = requestAnimationFrame(() => setEntered(true));
        return () => cancelAnimationFrame(t);
    }, [activeSection]);

    const content = useMemo(() => {
        switch (activeSection) {
            case 'appearance':
                return <AppearanceSection />;
            case 'account':
                return <AccountSection userData={userData} />;
            case 'security':
                return <SecuritySection />;
            case 'notifications':
                return <NotificationsSection />;
            default:
                return null;
        }
    }, [activeSection, userData]);

    return (
        <div className="max-w-3xl space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">Settings</h1>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                    Manage your appearance, account, and notification preferences.
                </p>
            </div>

            <SegmentedControl
                options={SECTIONS.map(({ value, label }) => ({ value, label }))}
                value={activeSection}
                onChange={setActiveSection}
                name="Settings section"
            />

            <div
                className={`transition-all duration-300 ease-out ${
                    entered ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'
                }`}
            >
                {content}
            </div>
        </div>
    );
}

export default AdminSettings;