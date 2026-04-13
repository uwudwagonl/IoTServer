"use client";

import { useEffect, useState } from "react";
import { AUTH_STORAGE_KEY, verifyCredentials } from "@/lib/auth";

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAuthed(sessionStorage.getItem(AUTH_STORAGE_KEY) === "1");
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const ok = await verifyCredentials(user.trim(), pass);
    setBusy(false);
    if (ok) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, "1");
      setAuthed(true);
    } else {
      setErr("Invalid credentials");
      setPass("");
    }
  };

  if (authed === null) return null;

  if (authed) {
    return (
      <>
        {children}
        <button
          onClick={() => {
            sessionStorage.removeItem(AUTH_STORAGE_KEY);
            setAuthed(false);
            setUser("");
          }}
          className="fixed bottom-4 right-4 rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700"
        >
          Sign out
        </button>
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-6"
      >
        <h1 className="mb-1 text-xl font-bold">Admin sign-in</h1>
        <p className="mb-5 text-xs text-gray-500">
          Restricted to operators.
        </p>
        <label className="mb-1 block text-xs text-gray-400">Username</label>
        <input
          type="text"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          autoComplete="username"
          className="mb-3 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500"
        />
        <label className="mb-1 block text-xs text-gray-400">Password</label>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="current-password"
          className="mb-3 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500"
        />
        {err && <p className="mb-3 text-sm text-red-400">{err}</p>}
        <button
          type="submit"
          disabled={busy || !user || !pass}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-40"
        >
          {busy ? "Checking…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
