
"use client";

import { useState } from "react";
import {
  signUp,
  confirmSignUp,
  signIn,
} from "aws-amplify/auth";

export default function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: () => void;
}) {
  const [mode, setMode] = useState<"signup" | "login" | "verify">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await signUp({
        username: email.trim().toLowerCase(),
        password,
        options: {
          userAttributes: {
            email: email.trim().toLowerCase(),
          },
        },
      });

      if (result.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
        setMode("verify");
        setMessage("Verification code sent to your email.");
      } else {
        setMessage("Signup completed. You can now log in.");
        setMode("login");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await confirmSignUp({
        username: email.trim().toLowerCase(),
        confirmationCode: code.trim(),
      });

      setMode("login");
      setPassword("");
      setCode("");
      setMessage("Email verified. Please log in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await signIn({
        username: email.trim().toLowerCase(),
        password,
      });

      if (result.isSignedIn) {
        onAuthenticated();
      } else {
        setError(
          `Additional sign-in step required: ${result.nextStep.signInStep}`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] p-5">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white">
            ☁
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            CloudVault
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Secure cloud storage
          </p>
        </div>

        <h2 className="mb-2 text-xl font-bold text-slate-800">
          {mode === "signup"
            ? "Create your account"
            : mode === "verify"
              ? "Verify your email"
              : "Welcome back"}
        </h2>

        <p className="mb-6 text-sm text-slate-500">
          {mode === "verify"
            ? `Enter the verification code sent to ${email}.`
            : mode === "signup"
              ? "Sign up using your email and password."
              : "Log in to access your CloudVault files."}
        </p>

        {message && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {mode === "verify" ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              className={inputClass}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Email verification code"
              required
            />

            <button
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify email"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setMessage("");
              }}
              className="w-full text-sm font-medium text-blue-600"
            >
              Back to login
            </button>
          </form>
        ) : (
          <form
            onSubmit={mode === "signup" ? handleSignup : handleLogin}
            className="space-y-4"
          >
            <input
              type="email"
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
            />

            <input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              minLength={8}
              required
            />

            <button
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "signup"
                  ? "Create account"
                  : "Login"}
            </button>

            <p className="text-center text-sm text-slate-500">
              {mode === "signup"
                ? "Already have an account?"
                : "New to CloudVault?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signup" ? "login" : "signup");
                  setError("");
                  setMessage("");
                }}
                className="font-semibold text-blue-600"
              >
                {mode === "signup" ? "Login" : "Sign up"}
              </button>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
