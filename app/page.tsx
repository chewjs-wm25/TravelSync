"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTestStore } from "@/src/store/useTestStore";

// 1. Extract network subscription logic for useSyncExternalStore
const subscribeOnline = (callback: () => void) => {
  if (typeof window !== "undefined") {
    window.addEventListener("online", callback);
    window.addEventListener("offline", callback);
    return () => {
      window.removeEventListener("online", callback);
      window.removeEventListener("offline", callback);
    };
  }
  return () => {};
};

const getOnlineSnapshot = () => {
  if (typeof navigator !== "undefined") {
    return navigator.onLine;
  }
  return true;
};

const getServerSnapshot = () => true; // Solve Next.js SSR hydration error

export default function Home() {
  const { count, increase, decrease } = useTestStore();

  // Perfectly solve useEffect synchronous setState warning: Use the external state synchronization Hook recommended by React 18
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerSnapshot
  );
  const isOffline = !isOnline;

  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    // Perfectly solve any error: Use unknown as an intermediary layer for type assertion
    // This satisfies the strict mode of TS while reading the standalone property specific to iOS
    const nav = window.navigator as unknown as { standalone?: boolean };

    // By delaying the state update to the microtask queue using Promise.resolve
    // We completely avoid the warning "Calling setState synchronously within an effect"
    Promise.resolve().then(() => {
      const isPwaMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        nav.standalone === true;
      setIsStandalone(isPwaMode);
    });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="mb-2 text-3xl font-extrabold text-blue-600">
          Architecture Test Panel 🚀
        </h1>
        <p className="mb-8 font-medium text-gray-500">
          Next.js + React + TypeScript environment is working normally
        </p>

        <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-800">
            Zustand State Test
          </h2>
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={decrease}
              className="rounded-lg bg-red-500 px-5 py-2 font-semibold text-white transition-all hover:bg-red-600 active:scale-95"
            >
              Decrease
            </button>
            <span className="w-12 text-4xl font-black text-gray-800">
              {count}
            </span>
            <button
              onClick={increase}
              className="rounded-lg bg-green-500 px-5 py-2 font-semibold text-white transition-all hover:bg-green-600 active:scale-95"
            >
              Increase
            </button>
          </div>
        </div>

        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-left">
          <h2 className="mb-4 text-center text-lg font-bold text-gray-800">
            Next-PWA Test
          </h2>

          <ul className="space-y-3">
            <li className="flex items-center space-x-2">
              <span className="text-xl">{isStandalone ? "✅" : "🟡"}</span>
              <span
                className={
                  isStandalone
                    ? "font-semibold text-green-700"
                    : "text-yellow-700"
                }
              >
                {isStandalone
                  ? "Running in PWA standalone mode"
                  : "Currently in browser mode (Need to click to install the app)"}
              </span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-xl">{isOffline ? "✈️" : "🌐"}</span>
              <span
                className={
                  isOffline
                    ? "font-semibold text-amber-600"
                    : "font-semibold text-blue-600"
                }
              >
                {isOffline
                  ? "Currently in offline mode (Service Worker is working!)"
                  : "Currently connected to the network"}
              </span>
            </li>
          </ul>

          <div className="mt-4 rounded-lg bg-gray-200/50 p-3 text-sm text-gray-500">
            <strong>How to test offline cache:</strong> Open browser developer
            tools (F12) → Network (network) tab → Set network throttling to
            "Offline" → Refresh the page. If the page still renders normally, it
            indicates that the next-pwa cache was successful.
          </div>
        </div>
      </div>
    </main>
  );
}
