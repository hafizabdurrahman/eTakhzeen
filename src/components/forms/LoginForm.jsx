import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import auth from '../../backend/auth';
import { login } from '../../store/slices/userSlice';

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
        // No card, no background, no border — floats directly over
        // AuthLayout's rings, per feedback. Just the fields themselves.
        // max-w-md lives here now (not in AuthLayout), since AuthLayout no
        // longer constrains Outlet width — Signup needs to be much wider.
        <div className="w-full max-w-md">
            <h1 className="mb-8 text-center text-3xl font-semibold text-stone-900 dark:text-white">Login</h1>

            {location.state?.email && (
                <p className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                    An account with this email already exists — log in below.
                </p>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <div>
                    <div className="relative">
                        <Mail
                            size={16}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-white/40"
                        />
                        <input
                            id="email"
                            type="email"
                            placeholder="Email"
                            className="min-h-12 w-full rounded-full border border-stone-300 bg-transparent py-2 pl-11 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200 dark:border-white/20 dark:text-white dark:placeholder:text-white/40 dark:focus:border-white/50 dark:focus:ring-white/10"
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
                        <p className="mt-1.5 flex items-center gap-1 pl-2 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={12} /> {errors.email.message}
                        </p>
                    )}
                </div>

                <div>
                    <div className="relative">
                        <Lock
                            size={16}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-white/40"
                        />
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            className="min-h-12 w-full rounded-full border border-stone-300 bg-transparent py-2 pl-11 pr-10 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200 dark:border-white/20 dark:text-white dark:placeholder:text-white/40 dark:focus:border-white/50 dark:focus:ring-white/10"
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
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600 dark:text-white/40 dark:hover:text-white/70"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="mt-1.5 flex items-center gap-1 pl-2 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={12} /> {errors.password.message}
                        </p>
                    )}
                </div>

                {authError && (
                    <p className="flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">
                        <AlertCircle size={14} className="shrink-0" /> {authError}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-12 w-full rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSubmitting ? 'Signing in...' : 'Sign in'}
                </button>
            </form>

            <p className="mt-5 text-center text-sm text-stone-500 dark:text-white/50">
                Don't have an account?{' '}
                <Link
                    to="/create-account"
                    className="font-medium text-stone-900 hover:underline dark:text-white/80 dark:hover:text-white"
                >
                    Sign up
                </Link>
            </p>
        </div>
    );
}

export default LoginForm;