"use client";
import { useState } from "react";
import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";

export default function LoginBTN() {
  const { login } = useAuthStore();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      await login();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleLogin}
        disabled={isLoggingIn}
        className="bg-primary-500 hover:shadow-hover rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoggingIn ? "Logging in…" : "Login"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
