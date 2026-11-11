"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ApiErrorResponse {
  error?: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Your login password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Login password and confirmation password do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
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
        setError(data.error ?? "Could not create your account. Please try again.");
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
    <div className="max-w-md mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="border border-neutral-200 rounded bg-white p-6 sm:p-8">
        <div className="text-xs font-mono uppercase tracking-wider text-[#0E7A5F] font-semibold">
          Zero-Knowledge Account Setup
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0a0a0a]">
          Create your CipherVault account
        </h1>

        <div className="mt-4 p-3.5 rounded border border-[#0E7A5F]/30 bg-[#f0fdf8] text-xs text-neutral-800 leading-relaxed">
          <p className="font-semibold text-[#0E7A5F]">
            Important Security Separation:
          </p>
          <p className="mt-1">
            The <strong>login password</strong> below authenticates your account with the server. Once inside your vault, you will choose a separate <strong>vault passphrase</strong> that stays strictly in browser memory to encrypt and decrypt your data. Never use the same secret for both.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 p-3.5 rounded border border-red-300 bg-red-50 text-xs text-red-900 leading-relaxed"
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
              Login Password (Min 8 Characters)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Create a strong login password"
              className="mt-1.5 w-full px-3.5 py-2.5 text-sm rounded border border-neutral-300 bg-white text-[#0a0a0a] focus:outline-none focus:border-[#0E7A5F] disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
            >
              Confirm Login Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              placeholder="Re-enter your login password"
              className="mt-1.5 w-full px-3.5 py-2.5 text-sm rounded border border-neutral-300 bg-white text-[#0a0a0a] focus:outline-none focus:border-[#0E7A5F] disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded bg-[#0E7A5F] text-white text-sm font-medium hover:bg-[#0b614b] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-neutral-200 text-xs text-neutral-600 flex items-center justify-between">
          <span>Already registered?</span>
          <Link
            href="/signin"
            className="font-semibold text-[#0E7A5F] hover:underline"
          >
            Sign in to existing account
          </Link>
        </div>
      </div>
    </div>
  );
}
