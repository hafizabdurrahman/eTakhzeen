import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import auth from '../../backend/auth';
import { login } from '../../store/slices/userSlice';
import { Button } from '../.';

function LoginForm() {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm();

    const [authError, setAuthError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    // If redirected here from Signup (account already existed), prefill
    // only the email the user already typed there — never the password.
    useEffect(() => {
        const prefillEmail = location.state?.email;
        if (prefillEmail) {
            setValue('email', prefillEmail, { shouldValidate: true });
        }
    }, [location.state, setValue]);

    const onSubmit = async (data) => {
        setAuthError('');

        const success = await auth.login({
            email: data.email,
            password: data.password,
        });

        if (!success) {
            setAuthError('Invalid email or password.');
            return;
        }

        const userData = await auth.getCurrentUser();
        if (!userData || userData === 'User not found') {
            setAuthError('Logged in, but could not fetch user data.');
            return;
        }
        dispatch(login(userData));

        const isAdmin = userData.labels?.includes('admin');
        // userId was set to the username at signup, so $id === username
        // -> redirects to /:username/profile, not /user/:username
        navigate(isAdmin ? '/admin' : `/${userData['$id']}/profile`, { replace: true });
    };

    return (
        <div className="rounded-xl border border-stone-200 bg-cream p-6 shadow-sm sm:p-8 dark:border-stone-800 dark:bg-stone-900">
            <div className="mb-6 flex flex-col items-center text-center">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <LogIn size={20} />
                </span>
                <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Welcome back</h2>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Log in to continue to your account.</p>
            </div>

            {location.state?.email && (
                <p className="mb-5 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                    An account with this email already exists — log in below.
                </p>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-900 dark:text-stone-100" htmlFor="email">
                        Email
                    </label>
                    <div className="relative">
                        <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            className="min-h-10 w-full rounded-md border border-stone-200 bg-cream py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                            {...register('email', {
                                required: 'Email is required',
                                pattern: {
                                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                    message: 'Enter a valid email address',
                                },
                            })}
                        />
                    </div>
                    {errors.email && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={12} /> {errors.email.message}
                        </p>
                    )}
                </div>

                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-sm font-medium text-stone-900 dark:text-stone-100" htmlFor="password">
                            Password
                        </label>
                    </div>
                    <div className="relative">
                        <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            className="min-h-10 w-full rounded-md border border-stone-200 bg-cream py-2 pl-9 pr-10 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
                            {...register('password', {
                                required: 'Password is required',
                                minLength: {
                                    value: 8,
                                    message: 'Password must be at least 8 characters',
                                },
                            })}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={12} /> {errors.password.message}
                        </p>
                    )}
                </div>

                {authError && (
                    <p className="flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                        <AlertCircle size={14} className="shrink-0" /> {authError}
                    </p>
                )}

                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? 'Logging in...' : 'Login'}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
                Don't have an account?{' '}
                <Link to="/create-account" className="font-medium text-brand-600 hover:underline dark:text-brand-500">
                    Create one
                </Link>
            </p>
        </div>
    );
}

export default LoginForm;