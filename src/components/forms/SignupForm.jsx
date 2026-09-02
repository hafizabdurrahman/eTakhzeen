import auth from "../../backend/auth";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { Input, Button } from "../.";
import { user } from "../../backend";
import { login, setUser } from "../../store/slices/userSlice";
import { useNavigate } from "react-router";

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
      navigate(isAdmin ? "/admin" : `/user/${userData["$id"]}`, { replace: true });
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
    <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
      {colsError && <p>{colsError}</p>}
      {submitError && <p>{submitError}</p>}

      <div>
        <Input
          type="text"
          name="name"
          {...register("name", {
            required: "Name is required",
            minLength: { value: 4, message: "Min 4 characters" },
          })}
        />
        {errors.name && <p>{errors.name.message}</p>}
      </div>

      <div>
        <Input
          type="text"
          name="username"
          {...register("username", {
            required: "Username is required",
            minLength: { value: 8, message: "Min 8 characters" },
            validate: (value) => validateUnique("username", value),
          })}
        />
        {errors.username && <p>{errors.username.message}</p>}
      </div>

      <div>
        <Input
          type="email"
          name="email"
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Invalid email format",
            },
            validate: (value) => validateUnique("email", value),
          })}
        />
        {errors.email && <p>{errors.email.message}</p>}
      </div>

      <div>
        <Input
          type="password"
          name="password"
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
        {errors.password && <p>{errors.password.message}</p>}
      </div>

      <div>
        <Input
          type="password"
          name="confirmPassword"
          {...register("confirmPassword", {
            required: "Please confirm your password",
            validate: (value) => value === password || "Passwords do not match",
          })}
        />
        {errors.confirmPassword && <p>{errors.confirmPassword.message}</p>}
      </div>

      <div>
        <Input
          type="tel"
          name="phone"
          {...register("phone", {
            required: "Phone number is required",
            pattern: { value: /^[0-9]{10,15}$/, message: "Invalid phone number" },
            validate: (value) => validateUnique("phone", value),
          })}
        />
        {errors.phone && <p>{errors.phone.message}</p>}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || isValidating || colsLoading || !isValid}
        className={isSubmitting || isValidating ? "opacity-50" : ""}
      >
        {isSubmitting ? "Submitting..." : "Sign up"}
      </Button>
    </form>
  );
}