"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { decryptText } from "@/lib/crypto";

interface SharedPayload {
  title: string;
  ciphertext: string;
  salt: string;
  iv: string;
  expires_at: string;
  views: number;
  max_views: number;
}

export default function ShareViewPage() {
  const params = useParams<{ id: string }>();
  const shareId = params?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [expiredOrGone, setExpiredOrGone] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SharedPayload | null>(null);

  const [passphrase, setPassphrase] = useState("");
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [decryptedSecret, setDecryptedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchShare() {
      if (!shareId) {
        setExpiredOrGone(true);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/share/${shareId}`, {
          method: "GET",
          cache: "no-store",
        });

        if (response.status === 410 || response.status === 404) {
          if (active) {
            setExpiredOrGone(true);
            setLoading(false);
          }
          return;
        }

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          if (active) {
            setLoadError(data.error ?? "Unable to retrieve shared encrypted record.");
            setLoading(false);
          }
          return;
        }

        const data = (await response.json()) as SharedPayload;
        if (active) {
          setPayload(data);
          setLoading(false);
        }
      } catch {
        if (active) {
          setLoadError("Network error while loading shared link.");
          setLoading(false);
        }
      }
    }

    void fetchShare();
    return () => {
      active = false;
    };
  }, [shareId]);

  async function handleDecrypt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payload) return;

    if (!passphrase) {
      setDecryptError("Please enter the decryption passphrase.");
      return;
    }

    setDecrypting(true);
    setDecryptError(null);

    try {
      const plaintext = await decryptText(
        {
          ciphertext: payload.ciphertext,
          salt: payload.salt,
          iv: payload.iv,
        },
        passphrase
      );
      setDecryptedSecret(plaintext);
      setPassphrase("");
    } catch (err) {
      setDecryptError(
        err instanceof Error
          ? err.message
          : "Decryption failed. Incorrect passphrase."
      );
    } finally {
      setDecrypting(false);
    }
  }

  async function handleCopy() {
    if (!decryptedSecret) return;
    try {
      await navigator.clipboard.writeText(decryptedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-20">
        <div className="p-8 rounded border border-neutral-200 bg-white text-xs font-mono text-neutral-600">
          Fetching encrypted share payload...
        </div>
      </div>
    );
  }

  if (expiredOrGone) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-20">
        <div className="p-8 rounded border border-neutral-200 bg-white">
          <div className="text-xs font-mono uppercase tracking-wider text-red-700 font-semibold">
            HTTP 410 Gone
          </div>
          <h1 className="mt-2 text-2xl font-bold text-[#0a0a0a]">
            This link has expired or been used up.
          </h1>
          <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
            The encrypted share link you requested has either reached its maximum allowed view count, passed its expiration timestamp, or never existed.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-block px-4 py-2.5 rounded bg-[#0E7A5F] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#0b614b] transition-colors"
            >
              Return to CipherVault
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !payload) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-20">
        <div className="p-8 rounded border border-red-300 bg-red-50 text-sm text-red-900">
          {loadError ?? "Could not load shared item."}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <div className="p-6 sm:p-8 rounded border border-neutral-200 bg-white">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#0E7A5F] font-semibold">
            Zero-Knowledge Shared Secret
          </span>
          <span className="text-xs font-mono text-neutral-500">
            View {payload.views} of {payload.max_views}
          </span>
        </div>

        <h1 className="mt-2 text-2xl font-bold text-[#0a0a0a]">
          {payload.title}
        </h1>

        <div className="mt-4 p-3.5 rounded border border-neutral-200 bg-[#f8faf9] text-xs text-neutral-700 leading-relaxed">
          <strong>Self-Destruct Notice:</strong> This encrypted payload was retrieved on view{" "}
          <span className="font-mono font-semibold">{payload.views}</span> of{" "}
          <span className="font-mono font-semibold">{payload.max_views}</span>{" "}
          (expires{" "}
          {new Date(payload.expires_at).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          ). If the view limit is reached, refreshing or closing this page will permanently prevent the ciphertext from being fetched again.
        </div>

        {!decryptedSecret ? (
          <form onSubmit={handleDecrypt} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="share-passphrase"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
              >
                Decryption Passphrase
              </label>
              <input
                id="share-passphrase"
                type="password"
                required
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                disabled={decrypting}
                placeholder="Enter the passphrase provided by the sender..."
                className="mt-1.5 w-full px-3.5 py-2.5 text-sm rounded border border-neutral-300 bg-white text-[#0a0a0a] focus:outline-none focus:border-[#0E7A5F]"
              />
            </div>

            {decryptError && (
              <div
                role="alert"
                className="p-3 rounded border border-red-300 bg-red-50 text-xs text-red-900"
              >
                {decryptError}
              </div>
            )}

            <button
              type="submit"
              disabled={decrypting}
              className="w-full py-2.5 px-4 rounded bg-[#0E7A5F] text-white text-sm font-medium hover:bg-[#0b614b] transition-colors disabled:opacity-60 cursor-pointer"
            >
              {decrypting
                ? "Deriving PBKDF2 Key & Decrypting..."
                : "Decrypt Shared Secret"}
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded border border-[#0E7A5F]/40 bg-[#f0fdf8]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#0E7A5F] font-semibold">
                  Decrypted Secret
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="px-3 py-1 rounded bg-[#0E7A5F] text-white text-xs font-mono font-medium hover:bg-[#0b614b] transition-colors cursor-pointer"
                >
                  {copied ? "Copied to Clipboard" : "Copy Secret"}
                </button>
              </div>
              <pre className="p-3 rounded border border-neutral-200 bg-white text-xs font-mono text-[#0a0a0a] whitespace-pre-wrap break-all">
                {decryptedSecret}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
