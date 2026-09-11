import auth from "../../backend/auth";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { UserPlus, AlertCircle } from "lucide-react";
import { Input, Button } from "../.";
import { user } from "../../backend";
import { login, setUser } from "../../store/slices/userSlice";

export default function SignupForm() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const allCols = useSelector((state) => state.user.allCols);
  const [colsLoading, setColsLoading] = useState(true);
  const [colsError, setColsError] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting, isValidating, isValid, errors },
  } = useForm({ mode: "onChange" });

  const password = watch("password");

  // One DB call on mount (unless already cached in store) to fetch every
  // existing username/email/phone, so every keystroke afterward checks
  // in-memory data — zero network calls while typing.
  useEffect(() => {
    if (allCols) {
      setColsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setColsLoading(true);
        const cols = await user.getCols({
          properties: ["username", "email", "phone"],
        });
        if (!cancelled) dispatch(setUser(cols));
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load existing user data:", err);
          setColsError("Could not check availability right now. Please refresh.");
        }
      } finally {
        if (!cancelled) setColsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allCols, dispatch]);

  function validateUnique(field, value) {
    if (colsLoading) return "Checking availability...";
    if (!allCols || !allCols[field]) return true;
    const taken = allCols[field].includes(value);
    return !taken || `This ${field} is already taken`;
  }

  const onValid = async (data) => {
    setSubmitError("");
    try {
      await auth.signup({
        username: data.username,
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
      });

      // auth.signup() already logged the session in; fetch the real
      // Appwrite user object (has $id, labels, etc.) to store — never
      // dispatch raw form data as if it were the account object.
      const userData = await auth.getCurrentUser();
      if (!userData || userData === "User not found") {
        setSubmitError("Account created, but we couldn't load your profile. Please log in.");
        navigate("/login", { state: { email: data.email } });
        return;
      }

      dispatch(login(userData));

      const isAdmin = userData.labels?.includes("admin");
      // userId was set to the username at account creation, so $id === username
      // -> redirects to /:username/profile, not /user/:username
      navigate(isAdmin ? "/admin" : `/${userData["$id"]}/profile`, { replace: true });
    } catch (err) {
      // 409 = an account with this id/email/phone already exists
      if (err?.code === 409) {
        navigate("/login", { state: { email: data.email } });
        return;
      }
      console.error("Unexpected signup error:", err);
      setSubmitError(err?.message || "Something went wrong. Please try again.");
    }
  };

  const onInvalid = (formErrors) => {
    console.warn("Form blocked due to validation errors:", formErrors);
  };

  return (
    <form
      onSubmit={handleSubmit(onValid, onInvalid)}
      noValidate
      className="rounded-xl border border-stone-200 bg-cream p-6 shadow-sm sm:p-8 dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <UserPlus size={20} />
        </span>
        <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Create your account</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">It only takes a minute to get started.</p>
      </div>

      {colsError && (
        <p className="mb-5 flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <AlertCircle size={14} className="shrink-0" /> {colsError}
        </p>
      )}
      {submitError && (
        <p className="mb-5 flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <AlertCircle size={14} className="shrink-0" /> {submitError}
        </p>
      )}

      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Input
              type="text"
              name="name"
              label="Full name"
              {...register("name", {
                required: "Name is required",
                minLength: { value: 4, message: "Min 4 characters" },
              })}
            />
            {errors.name && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <AlertCircle size={12} /> {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Input
              type="text"
              name="username"
              label="Username"
              {...register("username", {
                required: "Username is required",
                minLength: { value: 8, message: "Min 8 characters" },
                validate: (value) => validateUnique("username", value),
              })}
            />
            {errors.username && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <AlertCircle size={12} /> {errors.username.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Input
              type="email"
              name="email"
              label="Email"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Invalid email format",
                },
                validate: (value) => validateUnique("email", value),
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
              type="tel"
              name="phone"
              label="Phone"
              {...register("phone", {
                required: "Phone number is required",
                pattern: { value: /^[0-9]{10,15}$/, message: "Invalid phone number" },
                validate: (value) => validateUnique("phone", value),
              })}
            />
            {errors.phone && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <AlertCircle size={12} /> {errors.phone.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Input
              type="password"
              name="password"
              label="Password"
              {...register("password", {
                required: "Password is required",
                pattern: {
                  value:
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/,
                  message:
                    "Must include uppercase, lowercase, number, and special character",
                },
              })}
            />
            {errors.password && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <AlertCircle size={12} /> {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <Input
              type="password"
              name="confirmPassword"
              label="Confirm password"
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) => value === password || "Passwords do not match",
              })}
            />
            {errors.confirmPassword && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <AlertCircle size={12} /> {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || isValidating || colsLoading || !isValid}
        className={`mt-6 w-full ${isSubmitting || isValidating ? "opacity-50" : ""}`}
      >
        {isSubmitting ? "Submitting..." : "Sign up"}
      </Button>

      <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
        Already have an account?{" "}
        <Link to="/welcome-back" className="font-medium text-brand-600 hover:underline dark:text-brand-500">
          Log in
        </Link>
      </p>
    </form>
  );
}