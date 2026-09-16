import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router';
import { LogIn, AlertCircle, ImageOff, Sparkles } from 'lucide-react';
import { Input, Button } from '../.';
import auth from '../../backend/auth';
import { login } from '../../store/slices/userSlice';

const LOGIN_IMAGE_SRC = "/images/forms/loginForm.webp";

function LoginForm() {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm();

    const [authError, setAuthError] = useState('');
    const [imageFailed, setImageFailed] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

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
        navigate(isAdmin ? '/admin' : `/${userData['$id']}/profile`, { replace: true });
    };

    return (
        <div className="flex min-h-screen w-full">
            {/* Image panel — full height, half width, on large screens only */}
            <div className="relative hidden w-[65%] shrink-0 lg:block">
                {!imageFailed && (
                    <img
                        src={LOGIN_IMAGE_SRC}
                        alt=""
                        aria-hidden="true"
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageFailed(true)}
                        className={`h-full w-full object-cover transition-opacity duration-500 ${
                            imageLoaded ? "opacity-100" : "opacity-0"
                        }`}
                    />
                )}

                {(imageFailed || !imageLoaded) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-brand-600 via-brand-700 to-stone-900 px-6 text-center">
                        {imageFailed ? (
                            <>
                                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/70">
                                    <ImageOff size={20} />
                                </span>
                                <p className="text-sm text-white/60">Image unavailable</p>
                            </>
                        ) : (
                            <span className="h-11 w-11 animate-pulse rounded-full bg-white/10" />
                        )}
                    </div>
                )}

                <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/60 via-black/10 to-black/30 p-10">
                    <div className="flex items-center gap-2 text-white">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                            <Sparkles size={18} />
                        </span>
                        <span className="text-base font-semibold tracking-wide">eTakhzeen</span>
                    </div>
                    <div>
                        <p className="text-3xl font-semibold leading-snug text-white">
                            Welcome back.
                        </p>
                        <p className="mt-3 text-base text-white/60">
                            Log in to pick up right where you left off.
                        </p>
                    </div>
                </div>
            </div>

            {/* Form panel — full height, half width */}
            <div className="flex w-full items-center justify-center px-6 py-12 sm:px-12 lg:w-1/2">
                <div className="w-full max-w-xl">
                    <div className="mb-9 flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-pink-500 dark:bg-brand-500/10 dark:text-brand-400">
                                <LogIn size={22} />
                            </span>
                            <div>
                                <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Welcome back</h2>
                                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Log in to your account.</p>
                            </div>
                        </div>
                        <Link
                            to="/create-account"
                            className="mt-1 shrink-0 text-sm font-medium text-pink-500 hover:underline dark:text-pink-500"
                        >
                            Sign up
                        </Link>
                    </div>

                    {location.state?.email && (
                        <p className="mb-5 flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                            <AlertCircle size={14} className="shrink-0" /> An account with this email already exists — log in below.
                        </p>
                    )}
                    {authError && (
                        <p className="mb-5 flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                            <AlertCircle size={14} className="shrink-0" /> {authError}
                        </p>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
                        <div>
                            <Input
                                type="email"
                                name="email"
                                label="Email"
                                {...register('email', {
                                    required: 'Email is required',
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                        message: 'Enter a valid email address',
                                    },
                                })}
                            />
                            {errors.email && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                    <AlertCircle size={12} /> {errors.email.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <Input
                                type="password"
                                name="password"
                                label="Password"
                                {...register('password', {
                                    required: 'Password is required',
                                    minLength: {
                                        value: 8,
                                        message: 'Password must be at least 8 characters',
                                    },
                                })}
                            />
                            {errors.password && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                    <AlertCircle size={12} /> {errors.password.message}
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full ${isSubmitting ? 'opacity-50' : ''} bg-gradient-to-r from-pink-500 to-brand-600 `}
                        >
                            {isSubmitting ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400 lg:hidden">
                        Don't have an account?{' '}
                        <Link
                            to="/create-account"
                            className="bg-gradient-to-r from-pink-500 to-brand-600 bg-clip-text font-medium text-transparent hover:underline dark:from-pink-400 dark:to-brand-500"
                        >
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LoginForm;