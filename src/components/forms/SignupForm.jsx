import auth from "../../backend/auth";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { UserPlus, AlertCircle, ImageOff, Sparkles } from "lucide-react";
import { Input, Button } from "../.";
import { user } from "../../backend";
import { login, setUser } from "../../store/slices/userSlice";

const SIGNUP_IMAGE_SRC = "/images/forms/loginForm.webp";

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

  useEffect(() => {
    if (allCols) {
      setColsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setColsLoading(true);
        const cols = await user.getCols({ properties: ["username", "email", "phone"] });
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
    return () => { cancelled = true; };
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

      const userData = await auth.getCurrentUser();
      if (!userData || userData === "User not found") {
        setSubmitError("Account created, but we couldn't load your profile. Please log in.");
        navigate("/welcome-back", { state: { email: data.email } });
        return;
      }

      dispatch(login(userData));
      const isAdmin = userData.labels?.includes("admin");
      navigate(isAdmin ? "/admin" : `/${userData["$id"]}/profile`, { replace: true });
    } catch (err) {
      if (err?.code === 409) {
        navigate("/welcome-back", { state: { email: data.email } });
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
    <div className="flex min-h-screen w-full">
      {/* Image panel — full height, half width, on large screens only */}
      <div className="relative hidden w-[58%] shrink-0 lg:block">
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
              Capturing moments, creating memories.
            </p>
            <p className="mt-3 text-base text-white/60">
              Join thousands of people already using the platform.
            </p>
          </div>
        </div>
      </div>

      {/* Form panel — full height, half width, form itself is roomy */}
      <div className="flex w-full items-center justify-center px-6 py-12 sm:px-12 lg:w-1/2">
        <div className="w-full max-w-xl">
          <div className="mb-9 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-pink-500 dark:bg-brand-500/10 dark:text-pink-500">
                <UserPlus size={22} />
              </span>
              <div>
                <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Create your account</h2>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Takes less than a minute.</p>
              </div>
            </div>
            <Link
              to="/welcome-back"
              className="mt-1 shrink-0 text-sm font-medium text-pink-500 hover:underline dark:text-pink-500"
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

          <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
              className={`w-full ${isSubmitting || isValidating ? "opacity-50" : ""} bg-gradient-to-r from-pink-500 to-brand-600 `}
            >
              {isSubmitting ? "Submitting..." : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400 lg:hidden">
            Already have an account?{" "}
            <Link to="/welcome-back" className="font-medium text-pink-500 hover:underline dark:text-pink-500">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}