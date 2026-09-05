"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  Phone,
  CreditCard,
} from "lucide-react";
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

function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
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
  const [sessionLoading, setSessionLoading] = useState(true);

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
      })
      .finally(() => {
        setSessionLoading(false);
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
          window.location.href = "/";
        }}
      />
    );
  }

  // 会话确认中：先渲染设置界面的骨架占位，避免已登录用户闪见登录表单
  if (sessionLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="flex flex-col gap-8 md:flex-row">
          <aside className="md:w-56 flex-shrink-0">
            <div className="h-3 w-28 animate-pulse rounded-full bg-gray-200" />
            <div className="mt-3 h-7 w-32 animate-pulse rounded-xl bg-gray-200" />
            <div className="mt-6 space-y-1.5">
              <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
            </div>
          </aside>
          <section className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
            <div className="h-3 w-24 animate-pulse rounded-full bg-gray-200" />
            <div className="mt-4 h-7 w-48 animate-pulse rounded-xl bg-gray-200" />
            <div className="mt-6 space-y-4">
              <div className="h-10 w-full animate-pulse rounded-xl bg-gray-100" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-gray-100" />
              <div className="h-28 w-full animate-pulse rounded-xl bg-gray-100" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-gray-100" />
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-180px)] max-w-md flex-col justify-center px-4 py-8">
      {/* Return to Home Header Link */}
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/"
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition hover:text-gray-900 active:opacity-70"
        >
          <ArrowLeft
            size={15}
            className="transition-transform group-hover:-translate-x-1"
          />
          <span>Return to Home</span>
        </Link>
        <span className="text-[11px] font-medium text-gray-400">
          TravelSync Malaysia
        </span>
      </div>

      {/* Main Authentication Card */}
      <section className="w-full rounded-3xl border border-gray-200/90 bg-white p-7 shadow-xl shadow-gray-200/40 sm:p-8">
        {/* Brand Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-primary-500 shadow-sm border border-rose-100">
            <Compass size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-none">
              TravelSync
            </h2>
            <p className="mt-1 text-[11px] text-gray-400">
              Malaysian Travel & Itinerary Platform
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs (Sign in / Register) */}
        {mode !== "forgot" && mode !== "reset" && (
          <div className="mb-6 flex rounded-2xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all active:opacity-70 ${
                mode === "signin"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all active:opacity-70 ${
                mode === "register"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Create account
            </button>
          </div>
        )}

        {/* Headline & Subtitle */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-gray-900">
            {mode === "register"
              ? "Join TravelSync"
              : mode === "forgot"
              ? "Reset password"
              : mode === "reset"
              ? "Set new password"
              : "Welcome back"}
          </h1>
          <p className="text-xs leading-relaxed text-gray-500">
            {mode === "register"
              ? "Start planning your dream Malaysian holidays with friends."
              : mode === "forgot"
              ? "Enter your registered email and we&apos;ll send you a recovery link."
              : mode === "reset"
              ? "Enter a secure new password for your account."
              : "Sign in to access your saved Malaysian itineraries."}
          </p>
        </div>

        {/* Social Authentication: Continue with Google */}
        {(mode === "signin" || mode === "register") && (
          <div className="mt-6 space-y-5">
            <a
              href="/01_User_&_Account_Management/account-actions?action=google"
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]"
            >
              <GoogleIcon className="h-4 w-4" />
              <span>Continue with Google</span>
            </a>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-gray-200" />
              <span className="absolute bg-white px-3 text-[11px] font-medium text-gray-400">
                or continue with credentials
              </span>
            </div>
          </div>
        )}

        {/* Notice & Error Banners */}
        {notice && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs font-medium text-emerald-800 animate-in fade-in">
            <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-600" />
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/70 p-3 text-xs font-medium text-rose-800 animate-in fade-in">
            <AlertCircle size={16} className="flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* ─── FORGOT PASSWORD FORM ─── */}
        {mode === "forgot" ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700">
                Registered Email
              </label>
              <div className="relative mt-1">
                <input
                  required
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 pl-9 text-xs font-medium text-gray-800 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                />
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary-500 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-primary-500/90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="text-xs font-semibold text-primary-500 transition hover:underline active:opacity-70"
              >
                ← Back to Sign in
              </button>
            </div>
          </form>
        ) : mode === "reset" ? (
          /* ─── RESET PASSWORD FORM ─── */
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700">
                Reset Token
              </label>
              <input
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Paste your reset token"
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs font-medium text-gray-800 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700">
                New Password
              </label>
              <div className="relative mt-1">
                <input
                  required
                  type="password"
                  minLength={8}
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="At least 8 chars: upper, lower, number, special"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 pl-9 text-xs font-medium text-gray-800 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                />
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary-500 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-primary-500/90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Save New Password"}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="text-xs font-semibold text-primary-500 transition hover:underline active:opacity-70"
              >
                ← Back to Sign in
              </button>
            </div>
          </form>
        ) : (
          /* ─── SIGN IN & REGISTER FORM ─── */
          <form onSubmit={submit} className="mt-5 space-y-4">
            {mode === "register" ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Username
                  </label>
                  <div className="relative mt-1">
                    <input
                      required
                      pattern="[A-Za-z0-9_]{3,24}"
                      value={form.username}
                      onChange={(e) => update("username", e.target.value)}
                      placeholder="3-24 chars: letters, numbers, _"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 pl-9 text-xs font-medium text-gray-800 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                    />
                    <UserIcon
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Full Name
                  </label>
                  <div className="relative mt-1">
                    <input
                      required
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 pl-9 text-xs font-medium text-gray-800 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                    />
                    <UserIcon
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Email Address
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 pl-9 text-xs font-medium text-gray-800 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                    />
                    <Mail
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700">
                      Phone <span className="font-normal text-gray-400">(opt)</span>
                    </label>
                    <div className="relative mt-1">
                      <input
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        placeholder="+60 12-345 6789"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 pl-8 text-xs font-medium text-gray-800 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                      />
                      <Phone
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700">
                      MyKad IC <span className="font-normal text-gray-400">(opt)</span>
                    </label>
                    <div className="relative mt-1">
                      <input
                        value={form.icNumber}
                        onChange={(e) => update("icNumber", e.target.value)}
                        placeholder="IC Number"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 pl-8 text-xs font-medium text-gray-800 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                      />
                      <CreditCard
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-700">
                  Username or Email
                </label>
                <div className="relative mt-1">
                  <input
                    required
                    value={form.identifier}
                    onChange={(e) => update("identifier", e.target.value)}
                    placeholder="Enter your username or email"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 pl-9 text-xs font-medium text-gray-800 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                  />
                  <UserIcon
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              </div>
            )}

            {/* Password field with toggle visibility */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">
                  Password
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-[11px] font-semibold text-primary-500 transition hover:underline active:opacity-70"
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
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="At least 8 chars: upper, lower, number, special"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 pl-9 pr-10 text-xs font-medium text-gray-800 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                />
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((curr) => !curr)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 active:scale-90"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Checkbox Options */}
            {mode === "register" ? (
              <label className="flex items-start gap-2 pt-1 text-[11px] text-gray-500 cursor-pointer">
                <input
                  required
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(e) => update("acceptTerms", e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span>
                  I agree to the Terms of Service and Privacy Policy for TravelSync Malaysia.
                </span>
              </label>
            ) : (
              <label className="flex items-center gap-2 pt-1 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.rememberMe}
                  onChange={(e) => update("rememberMe", e.target.checked)}
                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span>Remember me for 31 days</span>
              </label>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-2xl bg-primary-500 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-primary-500/90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : mode === "register"
                ? "Create Account"
                : "Sign In"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
