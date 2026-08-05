"use client";

import { useState } from "react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showError, setShowError] = useState(true); // Pre-set to true for UI mockup display
  const [showSupportModal, setShowSupportModal] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-220px)] items-center justify-center py-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
        
        {/* Header Section */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-sm text-gray-500">
            Please enter your credentials to access your account.
          </p>
        </div>

        {/* Error Alert Mockup (Requirement: Relog-in required on error) */}
        {showError && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600 transition-all">
            <svg
              className="h-5 w-5 shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <span className="font-semibold">Authentication Failed:</span> Username or password is incorrect. Please double-check your credentials and re-login.
            </div>
            <button
              type="button"
              onClick={() => setShowError(false)}
              className="text-red-400 hover:text-red-600"
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
          
          {/* Username Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="block text-xs font-semibold text-gray-800 uppercase tracking-wider"
            >
              Username or Email
            </label>
            <div className="relative">
              <input
                id="username"
                type="text"
                placeholder="e.g. john.doe@example.com"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-800 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
              />
              <svg
                className="absolute left-3 top-3 h-4 w-4 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-gray-800 uppercase tracking-wider"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm text-gray-800 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
              />
              <svg
                className="absolute left-3 top-3 h-4 w-4 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>

              {/* Password Visibility Toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-800"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 1l22 22" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Links under Password Field (Forgot Password & Customer Service) */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="inline-flex items-center gap-1 font-medium text-teal-600 hover:underline"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Customer Service
              </button>
              <a
                href="#forgot-password"
                className="font-medium text-red-500 hover:underline"
              >
                Forgot Password?
              </a>
            </div>
          </div>

          {/* Options: Remember Me */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-200 text-red-500 focus:ring-red-400"
              />
              Remember this device
            </label>
            <button
              type="button"
              onClick={() => setShowError(!showError)}
              className="text-[11px] text-gray-500 hover:text-gray-800 underline"
            >
              {showError ? "Hide Error UI" : "Simulate Login Error"}
            </button>
          </div>

          {/* Login Submit Button */}
          <button
            type="submit"
            className="w-full rounded-lg bg-[#ff6b6b] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.99] shadow-sm"
          >
            Sign In
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-gray-200" />
          <span className="absolute bg-white px-3 text-xs text-gray-500">
            Or continue with
          </span>
        </div>

        {/* Quick Social Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-800 hover:bg-gray-50 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
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
            Google
          </button>

          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-800 hover:bg-gray-50 transition"
          >
            <svg className="h-4 w-4 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </button>
        </div>

        {/* Security Footer Note */}
        <p className="text-center text-[11px] text-gray-500">
          🔒 Encrypted 256-bit Connection.
        </p>
      </div>

      {/* Customer Service Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Customer Support</h3>
              <button
                onClick={() => setShowSupportModal(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Need assistance signing in? Reach out through any of the channels below:
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <span className="font-medium text-gray-800">📞 Hot Line</span>
                <span className="text-teal-600 font-semibold">+1 (800) 555-0199</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <span className="font-medium text-gray-800">✉️ Email Support</span>
                <span className="text-teal-600 font-semibold">support@domain.com</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSupportModal(false)}
              className="w-full rounded-lg bg-gray-800 py-2 text-xs font-semibold text-white hover:bg-gray-900"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
