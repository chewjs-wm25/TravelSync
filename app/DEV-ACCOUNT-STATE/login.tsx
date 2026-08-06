"use client";
import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";

export default function LoginBTN() {
  const { login } = useAuthStore();
  return (
    <button
      onClick={login}
      className="bg-primary-500 hover:shadow-hover rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
    >
      Login
    </button>
  );
}
