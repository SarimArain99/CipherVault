"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ApiErrorResponse {
  error?: string;
}

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter both your email address and login password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        setError(data.error ?? "Unable to sign in. Please check your credentials.");
        setLoading(false);
        return;
      }

      router.push("/vault");
      router.refresh();
    } catch {
      setError("Network error while connecting to the server. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <div className="border border-neutral-200 rounded bg-white p-6 sm:p-8">
        <div className="text-xs font-mono uppercase tracking-wider text-[#0E7A5F] font-semibold">
          Session Authentication
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0a0a0a]">
          Sign in to CipherVault
        </h1>
        <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
          Enter your account credentials to access your encrypted vault records. Your vault decryption passphrase will be requested separately inside the vault.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-6 p-3.5 rounded border border-red-300 bg-red-50 text-xs text-red-900 leading-relaxed"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="you@domain.com"
              className="mt-1.5 w-full px-3.5 py-2.5 text-sm rounded border border-neutral-300 bg-white text-[#0a0a0a] focus:outline-none focus:border-[#0E7A5F] disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
            >
              Login Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Enter your account login password"
              className="mt-1.5 w-full px-3.5 py-2.5 text-sm rounded border border-neutral-300 bg-white text-[#0a0a0a] focus:outline-none focus:border-[#0E7A5F] disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded bg-[#0E7A5F] text-white text-sm font-medium hover:bg-[#0b614b] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-neutral-200 text-xs text-neutral-600 flex items-center justify-between">
          <span>Don&apos;t have an account yet?</span>
          <Link
            href="/signup"
            className="font-semibold text-[#0E7A5F] hover:underline"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
