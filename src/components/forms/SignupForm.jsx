import auth from "../../backend/auth";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { UserPlus, AlertCircle, ImageOff, Sparkles } from "lucide-react";
import { Input, Button } from "../.";
import { user } from "../../backend";
import { login, setUser } from "../../store/slices/userSlice";

// Swap this for your real asset path/URL whenever it's ready — the
// fallback below means nothing breaks in the meantime.
const SIGNUP_IMAGE_SRC = "/images/signup-hero.jpg";

export default function SignupForm() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const allCols = useSelector((state) => state.user.allCols);
  const [colsLoading, setColsLoading] = useState(true);
  const [colsError, setColsError] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

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
    <div className="mx-auto flex w-full max-w-5xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900">
      {/* Image panel — hidden below lg so the form gets full width on
          small screens instead of being squeezed next to a shrinking
          image. Handles a failed/missing image with a graceful fallback
          rather than a broken-image icon. */}
      <div className="relative hidden w-[42%] shrink-0 lg:block">
        {!imageFailed && (
          <img
            src={SIGNUP_IMAGE_SRC}
            alt=""
            aria-hidden="true"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
            className={`h-full w-full object-cover transition-opacity duration-500 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Fallback: shown when the image errors out, or while it's still
            loading (so there's never a blank/broken box on screen). */}
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

        {/* Overlay content sits above the image/fallback either way, so
            the panel always looks intentional rather than empty. */}
        <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/60 via-black/10 to-black/30 p-8">
          <div className="flex items-center gap-2 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <Sparkles size={16} />
            </span>
            <span className="text-sm font-semibold tracking-wide">YOUR APP</span>
          </div>
          <div>
            <p className="text-xl font-semibold leading-snug text-white">
              Capturing moments, creating memories.
            </p>
            <p className="mt-2 text-sm text-white/60">
              Join thousands of people already using the platform.
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="w-full px-6 py-8 sm:px-10 sm:py-10 lg:w-[58%]">
        <div className="mx-auto max-w-md">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <UserPlus size={18} />
              </span>
              <div>
                <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Create your account</h2>
                <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">Takes less than a minute.</p>
              </div>
            </div>
            <Link
              to="/welcome-back"
              className="mt-1 shrink-0 text-sm font-medium text-brand-600 hover:underline dark:text-brand-500"
            >
              Log in
            </Link>
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

          <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate className="space-y-5">
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

            <Button
              type="submit"
              disabled={isSubmitting || isValidating || colsLoading || !isValid}
              className={`w-full ${isSubmitting || isValidating ? "opacity-50" : ""}`}
            >
              {isSubmitting ? "Submitting..." : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400 lg:hidden">
            Already have an account?{" "}
            <Link to="/welcome-back" className="font-medium text-brand-600 hover:underline dark:text-brand-500">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}