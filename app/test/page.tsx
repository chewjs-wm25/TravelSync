"use client";

import { useCallback, useEffect, useState } from "react";
import { useTestStore } from "@/src/store/useTestStore";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ApiError = { ok: false; error: string };

type NodeResponse = { ok: true; info: Record<string, unknown> } | ApiError;

type MessageRow = {
  id: number;
  content: string;
  created_at: string;
};

type D1ListResponse = { ok: true; messages: MessageRow[] } | ApiError;
type D1AddResponse = { ok: true; message: MessageRow | null } | ApiError;

type KvReadResponse = { ok: true; key: string; value: string | null } | ApiError;
type KvWriteResponse = { ok: true; key: string; value: string } | ApiError;
type KvDeleteResponse = { ok: true; key: string } | ApiError;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function apiFetch<T>(
  url: string,
  init?: RequestInit
): Promise<Exclude<T, ApiError>> {
  const res = await fetch(url, init);
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error(`HTTP ${res.status}: response is not valid JSON`);
  }
  const isApiError =
    typeof data === "object" &&
    data !== null &&
    (data as { ok?: unknown }).ok === false;
  if (!res.ok || isApiError) {
    const err = (data as { error?: string } | null)?.error;
    throw new Error(err ?? `HTTP ${res.status}`);
  }
  return data as Exclude<T, ApiError>;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * 统一管理异步操作的「数据 / 加载中 / 错误」三态。
 * `run()` 返回 Promise<T | null>，null 表示本次调用失败（错误已存入 error）。
 */
function useAsyncAction<T>(task: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await task();
      setData(result);
      return result;
    } catch (err) {
      setError(errorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [task]);

  return { data, loading, error, run };
}

/* -------------------------------------------------------------------------- */
/* Reusable UI pieces                                                         */
/* -------------------------------------------------------------------------- */

function Card({
  index,
  title,
  icon,
  accent,
  children,
}: {
  index: string;
  title: string;
  icon: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <span className="absolute right-4 top-4 font-mono text-xs font-bold text-slate-300 dark:text-slate-600">
        {index}
      </span>
      <header className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${accent}`}
        >
          {icon}
        </span>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/50 dark:text-red-400">
      ❌ {message}
    </p>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"
    />
  );
}

function ActionButton({
  onClick,
  disabled,
  loading,
  children,
  tone = "blue",
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  tone?: "blue" | "green" | "amber" | "red";
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
    amber: "bg-amber-500 hover:bg-amber-600",
    red: "bg-red-500 hover:bg-red-600",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Spinner /> Working...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
    </label>
  );
}

function Endpoint({ path }: { path: string }) {
  return (
    <code className="rounded bg-slate-100 px-1 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {path}
    </code>
  );
}

/* -------------------------------------------------------------------------- */
/* 01 — Node.js runtime test                                                  */
/* -------------------------------------------------------------------------- */

function NodeInfoTable({ info }: { info: Record<string, unknown> }) {
  const rows = Object.entries(info);
  return (
    <div className="max-h-72 overflow-auto rounded-xl border border-slate-800 bg-slate-950">
      <table className="w-full text-left font-mono text-xs">
        <tbody className="divide-y divide-slate-800/70">
          {rows.map(([key, value]) => (
            <tr key={key}>
              <td className="whitespace-nowrap px-3 py-1.5 text-slate-500">
                {key}
              </td>
              <td className="break-all px-3 py-1.5 text-green-400">
                {value === null || typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NodeJsTest() {
  const {
    data: probeData,
    loading: probeLoading,
    error: probeError,
    run: probeRun,
  } = useAsyncAction(
    useCallback(() => apiFetch<NodeResponse>("/api/test/node"), [])
  );

  useEffect(() => {
    // 延迟到微任务，避免 effect 内同步 setState（react-hooks/set-state-in-effect）
    Promise.resolve().then(() => void probeRun());
  }, [probeRun]);

  return (
    <Card
      index="01"
      title="Node.js Runtime"
      icon="🟩"
      accent="bg-green-100 dark:bg-green-950/60"
    >
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Probes <code className="font-mono text-xs">nodejs_compat</code> APIs
        inside the worker runtime via <Endpoint path="/api/test/node" />.
      </p>

      {probeError && <ErrorText message={probeError} />}
      {probeData && <NodeInfoTable info={probeData.info} />}

      <div className="mt-4">
        <ActionButton onClick={probeRun} loading={probeLoading} tone="green">
          ↻ Run probe
        </ActionButton>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 02 — Tailwind CSS test                                                     */
/* -------------------------------------------------------------------------- */

function TailwindTest() {
  const palette = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-green-500",
    "bg-teal-500",
    "bg-sky-500",
    "bg-indigo-500",
    "bg-purple-500",
  ];
  const sizes = [
    ["text-xs", "xs"],
    ["text-sm", "sm"],
    ["text-base", "base"],
    ["text-lg", "lg"],
    ["text-xl", "xl"],
    ["text-2xl", "2xl"],
  ] as const;

  return (
    <Card
      index="02"
      title="Tailwind CSS"
      icon="🎨"
      accent="bg-sky-100 dark:bg-sky-950/60"
    >
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        If you see styled cards, gradients, animations and a responsive grid,
        the Tailwind v4 pipeline is working.
      </p>

      {/* 响应式网格 + 渐变 / 动画 / 交互 / dark 变体 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 p-4 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105">
          gradient
        </div>
        <div className="flex items-center justify-center gap-2.5 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="h-4 w-4 animate-pulse rounded-full bg-green-500" />
          <span className="h-4 w-4 animate-bounce rounded-full bg-amber-500" />
        </div>
        <button className="rounded-xl bg-blue-600 p-4 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-blue-700 hover:shadow-xl active:scale-95">
          hover / active
        </button>
        <div className="rounded-xl border-2 border-dashed border-slate-300 p-4 text-center text-sm font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          dark: variants
        </div>
      </div>

      {/* 调色板 */}
      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {palette.map((color) => (
          <div
            key={color}
            title={color}
            className={`h-10 rounded-lg ${color} shadow-sm transition-transform hover:scale-110`}
          />
        ))}
      </div>

      {/* 排版尺寸 */}
      <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-slate-700 dark:text-slate-200">
        {sizes.map(([cls, label]) => (
          <span key={cls} className={`${cls} font-semibold`}>
            {label}
          </span>
        ))}
      </div>

      {/* flexbox / 间距 / 圆角 / 阴影 / 环 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {["flex", "gap", "rounded", "shadow", "ring"].map((t) => (
          <span
            key={t}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
          >
            {t}
          </span>
        ))}
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 03 — Zustand state test                                                    */
/* -------------------------------------------------------------------------- */

function Counter({ name }: { name: string }) {
  const { count, increase, decrease } = useTestStore();
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {name}
      </p>
      <p className="mb-3 text-4xl font-black text-slate-800 dark:text-slate-100">
        {count}
      </p>
      <div className="flex justify-center gap-2">
        <button
          onClick={decrease}
          className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white transition-all hover:bg-red-600 active:scale-95"
        >
          −
        </button>
        <button
          onClick={increase}
          className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-semibold text-white transition-all hover:bg-green-600 active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ZustandTest() {
  return (
    <Card
      index="03"
      title="Zustand State"
      icon="🧠"
      accent="bg-violet-100 dark:bg-violet-950/60"
    >
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Both counters read from the same store (
        <code className="font-mono text-xs">useTestStore</code>). Change one
        and the other updates instantly — shared global state.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Counter name="Counter A" />
        <Counter name="Counter B" />
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 04 — D1 database test                                                      */
/* -------------------------------------------------------------------------- */

function D1Test() {
  const [content, setContent] = useState("");

  const {
    data: listData,
    loading: listLoading,
    error: listError,
    run: listRun,
  } = useAsyncAction(
    useCallback(() => apiFetch<D1ListResponse>("/api/test/d1"), [])
  );

  const {
    loading: addLoading,
    error: addError,
    run: addRun,
  } = useAsyncAction(
    useCallback(async () => {
      const trimmed = content.trim();
      if (!trimmed) return;
      await apiFetch<D1AddResponse>("/api/test/d1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      setContent("");
      await listRun();
    }, [content, listRun])
  );

  useEffect(() => {
    Promise.resolve().then(() => void listRun());
  }, [listRun]);

  const error = addError ?? listError;
  const messages = listData?.messages ?? [];

  return (
    <Card
      index="04"
      title="D1 Database"
      icon="🗄️"
      accent="bg-amber-100 dark:bg-amber-950/60"
    >
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Reads / writes the <code className="font-mono text-xs">messages</code>{" "}
        table via the <code className="font-mono text-xs">TEST_DB</code> binding
        through <Endpoint path="/api/test/d1" />.
      </p>

      <div className="mb-3 flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addRun()}
          placeholder="Type a message to insert..."
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <ActionButton onClick={addRun} loading={addLoading} tone="green">
          + Insert
        </ActionButton>
      </div>

      {error && <ErrorText message={error} />}

      {listLoading && !error ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
          <Spinner /> Loading messages...
        </div>
      ) : (
        <ul className="max-h-56 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {messages.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-400">
              No messages yet — insert one above.
            </li>
          )}
          {messages.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <span className="text-sm text-slate-700 dark:text-slate-200">
                {m.content}
              </span>
              <span className="shrink-0 font-mono text-xs text-slate-400">
                #{m.id} · {m.created_at}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <ActionButton onClick={listRun} loading={listLoading} tone="amber">
          ↻ Refresh
        </ActionButton>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 05 — KV storage test                                                       */
/* -------------------------------------------------------------------------- */

function KvTest() {
  const [key, setKey] = useState("test-key");
  const [value, setValue] = useState("Hello from TravelSync");
  const [lastResult, setLastResult] = useState<string | null>(null);

  const {
    error: writeError,
    loading: writeLoading,
    run: writeRun,
  } = useAsyncAction(
    useCallback(
      () =>
        apiFetch<KvWriteResponse>("/api/test/kv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        }),
      [key, value]
    )
  );

  const {
    error: readError,
    loading: readLoading,
    run: readRun,
  } = useAsyncAction(
    useCallback(
      () =>
        apiFetch<KvReadResponse>(
          `/api/test/kv?key=${encodeURIComponent(key)}`
        ),
      [key]
    )
  );

  const {
    error: deleteError,
    loading: deleteLoading,
    run: deleteRun,
  } = useAsyncAction(
    useCallback(
      () =>
        apiFetch<KvDeleteResponse>(
          `/api/test/kv?key=${encodeURIComponent(key)}`,
          { method: "DELETE" }
        ),
      [key]
    )
  );

  const onWrite = useCallback(async () => {
    const res = await writeRun();
    if (res) setLastResult(`Wrote "${res.value}" → "${res.key}"`);
  }, [writeRun]);

  const onRead = useCallback(async () => {
    const res = await readRun();
    if (res) {
      setLastResult(
        res.value === null
          ? `Key "${res.key}" is not set (null)`
          : `Read "${res.value}" from "${res.key}"`
      );
    }
  }, [readRun]);

  const onDelete = useCallback(async () => {
    const res = await deleteRun();
    if (res) setLastResult(`Deleted key "${res.key}"`);
  }, [deleteRun]);

  const error = writeError ?? readError ?? deleteError;
  const loading = writeLoading || readLoading || deleteLoading;

  return (
    <Card
      index="05"
      title="KV Storage"
      icon="🔑"
      accent="bg-rose-100 dark:bg-rose-950/60"
    >
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Reads / writes key-value pairs via the{" "}
        <code className="font-mono text-xs">TEST_KV</code> binding through{" "}
        <Endpoint path="/api/test/kv" />.
      </p>

      <div className="mb-3 space-y-3">
        <Field label="Key" value={key} onChange={setKey} placeholder="my-key" />
        <Field
          label="Value"
          value={value}
          onChange={setValue}
          placeholder="my value"
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <ActionButton onClick={onWrite} loading={loading} tone="green">
          ✍️ Write
        </ActionButton>
        <ActionButton onClick={onRead} loading={loading} tone="blue">
          📖 Read
        </ActionButton>
        <ActionButton onClick={onDelete} loading={loading} tone="red">
          🗑 Delete
        </ActionButton>
      </div>

      {error && <ErrorText message={error} />}

      {lastResult && !error && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 font-mono text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
          ✅ {lastResult}
        </p>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function TestPage() {
  return (
    <main className="min-h-screen bg-slate-100 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl px-4">
        <header className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-4xl font-black text-transparent">
            Cloudflare Stack Test Panel
          </h1>
          <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">
            Node.js · Tailwind CSS · Zustand · D1 &amp; KV
            (via @opennextjs/cloudflare)
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400 dark:text-slate-500">
            Bindings are defined in{" "}
            <code className="rounded bg-slate-200 px-1 font-mono text-xs dark:bg-slate-800">
              wrangler.json
            </code>
            : <code className="rounded bg-slate-200 px-1 font-mono text-xs dark:bg-slate-800">TEST_DB</code>{" "}
            (D1) and{" "}
            <code className="rounded bg-slate-200 px-1 font-mono text-xs dark:bg-slate-800">
              TEST_KV
            </code>{" "}
            (KV). Run{" "}
            <code className="rounded bg-slate-200 px-1 font-mono text-xs dark:bg-slate-800">
              npm run dev
            </code>{" "}
            for local bindings or{" "}
            <code className="rounded bg-slate-200 px-1 font-mono text-xs dark:bg-slate-800">
              npm run preview
            </code>{" "}
            for a full worker simulation.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <NodeJsTest />
          <ZustandTest />
          <div className="md:col-span-2">
            <TailwindTest />
          </div>
          <D1Test />
          <KvTest />
        </div>

        <footer className="mt-8 pb-4 text-center text-xs text-slate-400">
          TravelSync · Malaysia travel planning · test page at{" "}
          <code className="rounded bg-slate-200 px-1 font-mono dark:bg-slate-800">
            /test
          </code>
        </footer>
      </div>
    </main>
  );
}
