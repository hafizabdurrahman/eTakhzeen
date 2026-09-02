import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router';
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
        navigate(isAdmin ? '/admin' : `/user/${userData['$id']}`, { replace: true });
    };

    return (
        <div>
            <h2>Login</h2>
            {location.state?.email && (
                <p>An account with this email already exists — log in below.</p>
            )}
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div>
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        {...register('email', {
                            required: 'Email is required',
                            pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                message: 'Enter a valid email address',
                            },
                        })}
                    />
                    {errors.email && <p>{errors.email.message}</p>}
                </div>

                <div>
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        {...register('password', {
                            required: 'Password is required',
                            minLength: {
                                value: 8,
                                message: 'Password must be at least 8 characters',
                            },
                        })}
                    />
                    {errors.password && <p>{errors.password.message}</p>}
                </div>

                {authError && <p>{authError}</p>}

                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
}

export default LoginForm;