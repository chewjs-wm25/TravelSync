"use client";

import { FormEvent, useEffect, useState } from "react";
import DashboardPage, { DashboardUser } from "./presentation/DashboardPage";
import { useAuthStore, mapAccountUser } from "@/app/DEV-ACCOUNT-STATE/authUser";

type AuthUser = DashboardUser;

type FormState = {
  username: string;
  identifier: string;
  fullName: string;
  email: string;
  phone: string;
  icNumber: string;
  password: string;
  rememberMe: boolean;
  acceptTerms: boolean;
};

const emptyForm: FormState = {
  username: "",
  identifier: "",
  fullName: "",
  email: "",
  phone: "",
  icNumber: "",
  password: "",
  rememberMe: false,
  acceptTerms: false,
};

type Result = { success: boolean; user?: AuthUser; message?: string; error?: string };

async function accountRequest(
  action: string,
  data?: Record<string, unknown>
): Promise<Result> {
  const response = await fetch(
    `/01_User_&_Account_Management/account-actions?action=${action}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data ?? {}),
    }
  );
  const result = (await response.json()) as Result;
  if (!response.ok) throw new Error(result.error ?? "Request failed");
  return result;
}

export default function AccountSettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const { logout: authLogout } = useAuthStore();
  const [mode, setMode] = useState<"signin" | "register" | "forgot" | "reset">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reset_token") || params.get("token")) return "reset";
    }
    return "signin";
  });
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("reset_token") || params.get("token") || "";
    }
    return "";
  });
  const [newResetPassword, setNewResetPassword] = useState("");
  const [notice, setNotice] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("notice") || "";
    }
    return "";
  });
  const [error, setError] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("error") || "";
    }
    return "";
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (!state.isLoggedIn) {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("error") || url.searchParams.has("notice")) {
        url.searchParams.delete("error");
        url.searchParams.delete("notice");
        window.history.replaceState(
          {},
          "",
          url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "")
        );
      }
    }

    fetch("/01_User_&_Account_Management/account-actions")
      .then(async (response) => {
        if (response.ok) {
          const u = ((await response.json()) as { user: AuthUser }).user;
          setUser(u);
          useAuthStore.getState().syncUser(mapAccountUser(u));
        } else {
          setUser(null);
          useAuthStore.getState().syncUser(null);
        }
      })
      .catch(() => {
        setUser(null);
        useAuthStore.getState().syncUser(null);
      });
  }, []);

  function update(name: keyof FormState, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function switchMode(nextMode: "signin" | "register" | "forgot" | "reset") {
    setMode(nextMode);
    setShowPassword(false);
    setNotice("");
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        const result = await accountRequest("register", {
          username: form.username,
          fullName: form.fullName,
          email: form.email || undefined,
          phone: form.phone || undefined,
          icNumber: form.icNumber || undefined,
          password: form.password,
          acceptTerms: form.acceptTerms,
        });

        if (result.user) {
          setUser(result.user);
          useAuthStore.getState().syncUser(mapAccountUser(result.user));
          setNotice(result.message ?? "Account created successfully.");
        } else {
          setNotice(result.message ?? "Account created. Sign in with your username and password.");
          setMode("signin");
        }
      } else if (mode === "signin") {
        const result = await accountRequest("login", {
          identifier: form.identifier,
          password: form.password,
          rememberMe: form.rememberMe,
        });
        if (result.user) {
          setUser(result.user);
          useAuthStore.getState().syncUser(mapAccountUser(result.user));
        }
        setNotice("Signed in successfully.");
      } else if (mode === "forgot") {
        const result = await accountRequest("forgot-password", { email: forgotEmail });
        setNotice(result.message ?? "Password reset link sent to your email.");
      } else if (mode === "reset") {
        const result = await accountRequest("reset-password", {
          token: resetToken,
          newPassword: newResetPassword,
        });
        setNotice(result.message ?? "Password reset successfully. Please sign in.");
        setMode("signin");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <DashboardPage
        user={user}
        request={accountRequest}
        onUserChange={setUser}
        onLogout={async () => {
          await authLogout();
          setUser(null);
          setNotice("You have been signed out.");
        }}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-220px)] max-w-md items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        {mode !== "forgot" && mode !== "reset" && (
          <div className="mb-7 flex gap-6 border-b border-slate-200">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`border-b-2 pb-3 text-sm font-semibold transition ${
                mode === "signin"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`border-b-2 pb-3 text-sm font-semibold transition ${
                mode === "register"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Register
            </button>
          </div>
        )}

        <h1 className="text-2xl font-bold text-slate-900">
          {mode === "register"
            ? "Create your account"
            : mode === "forgot"
            ? "Reset your password"
            : mode === "reset"
            ? "Set new password"
            : "Welcome back"}
        </h1>
        <p className="mt-2 text-xs text-slate-500">
          {mode === "register"
            ? "Required: username, name, password, terms, and either email or phone."
            : mode === "forgot"
            ? "Enter your registered email and we will send you a reset link."
            : mode === "reset"
            ? "Enter a strong new password for your account."
            : "Use your username or email and password to sign in."}
        </p>

        {(error || notice) && (
          <p
            className={`mt-4 rounded-lg p-3 text-sm font-medium ${
              error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || notice}
          </p>
        )}

        {mode === "forgot" ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Registered Email
              <input
                required
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@example.com"
                className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-700 py-2.5 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
            >
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="text-xs font-semibold text-teal-700 hover:underline"
              >
                ← Back to Sign in
              </button>
            </div>
          </form>
        ) : mode === "reset" ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Reset Token
              <input
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Paste your reset token"
                className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              New Password
              <input
                required
                type="password"
                minLength={8}
                value={newResetPassword}
                onChange={(e) => setNewResetPassword(e.target.value)}
                placeholder="At least 8 chars: upper, lower, number, special"
                className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-700 py-2.5 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Save New Password"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="text-xs font-semibold text-teal-700 hover:underline"
              >
                ← Back to Sign in
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" ? (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  Username
                  <input
                    required
                    pattern="[A-Za-z0-9_]{3,24}"
                    value={form.username}
                    onChange={(event) => update("username", event.target.value)}
                    placeholder="3-24 characters: lowercase, numbers, _"
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Full name
                  <input
                    required
                    value={form.fullName}
                    onChange={(event) => update("fullName", event.target.value)}
                    placeholder="Your full name"
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Email Address
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    placeholder="name@example.com"
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Phone number <span className="font-normal text-slate-400">(optional)</span>
                  <input
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    placeholder="+60 12-345 6789"
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  IC Number <span className="font-normal text-slate-400">(optional)</span>
                  <input
                    value={form.icNumber}
                    onChange={(event) => update("icNumber", event.target.value)}
                    placeholder="MyKad / IC Number"
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                </label>
              </>
            ) : (
              <label className="block text-sm font-medium text-slate-700">
                Username or Email
                <input
                  required
                  value={form.identifier}
                  onChange={(event) => update("identifier", event.target.value)}
                  placeholder="Enter username or email"
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                />
              </label>
            )}

            <label className="block text-sm font-medium text-slate-700">
              <div className="flex justify-between items-center">
                <span>Password</span>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs font-semibold text-teal-700 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative mt-1">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                  placeholder="At least 8 chars: upper, lower, number, special"
                  className="w-full rounded-lg border border-slate-200 p-2.5 pr-16 text-sm outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-teal-700 hover:underline"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {mode === "register" ? (
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  required
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(event) => update("acceptTerms", event.target.checked)}
                  className="rounded border-slate-300"
                />
                I accept the terms and privacy policy
              </label>
            ) : (
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.rememberMe}
                  onChange={(event) => update("rememberMe", event.target.checked)}
                  className="rounded border-slate-300"
                />
                Remember me (31 days)
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-700 py-2.5 font-semibold text-white transition hover:bg-teal-800 active:scale-[0.99] disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : mode === "register"
                ? "Create account"
                : "Sign in"}
            </button>
          </form>
        )}

        {mode === "signin" && (
          <a
            href="/01_User_&_Account_Management/account-actions?action=google"
            className="mt-4 block rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Continue with Google
          </a>
        )}
      </section>
    </main>
  );
}
