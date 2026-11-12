"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { encryptText, decryptText } from "@/lib/crypto";

interface UserProfile {
  id: string;
  email: string;
  createdAt: string;
}

interface VaultItem {
  id: string;
  title: string;
  ciphertext: string;
  salt: string;
  iv: string;
  created_at: string;
  updated_at: string;
}

interface ShareDialogState {
  itemId: string;
  expiresInHours: number;
  maxViews: number;
  creating: boolean;
  generatedUrl: string | null;
  error: string | null;
}

export default function VaultPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Zero-knowledge passphrase kept strictly in React memory state
  const [passphraseInput, setPassphraseInput] = useState("");
  const [activePassphrase, setActivePassphrase] = useState<string | null>(null);

  // New item form state
  const [newTitle, setNewTitle] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [savingItem, setSavingItem] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // In-memory map of decrypted secrets keyed by item ID (cleared on Lock/Signout)
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});
  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit item state (PUT API already exists; this wires the UI to it)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSecret, setEditSecret] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Share link creation state
  const [shareState, setShareState] = useState<ShareDialogState | null>(null);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);

  const loadVaultItems = useCallback(async () => {
    setLoadingItems(true);
    setGlobalError(null);
    try {
      const response = await fetch("/api/vault", {
        method: "GET",
        cache: "no-store",
      });
      if (response.status === 401) {
        router.push("/signin");
        return;
      }
      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string };
        setGlobalError(errData.error ?? "Could not load vault items.");
        return;
      }
      const data = (await response.json()) as { items: VaultItem[] };
      setItems(data.items ?? []);
    } catch {
      setGlobalError("Network error while loading your encrypted vault items.");
    } finally {
      setLoadingItems(false);
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    async function verifySessionAndLoad() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.status === 401 || !res.ok) {
          if (active) {
            router.push("/signin");
          }
          return;
        }
        const data = (await res.json()) as { user: UserProfile };
        if (active) {
          setUser(data.user);
          setAuthChecking(false);
          await loadVaultItems();
        }
      } catch {
        if (active) {
          setGlobalError("Unable to verify session with server.");
          setAuthChecking(false);
        }
      }
    }
    void verifySessionAndLoad();
    return () => {
      active = false;
    };
  }, [router, loadVaultItems]);

  function handleUnlockVault(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passphraseInput.trim()) {
      setGlobalError("Please enter a non-empty vault passphrase to unlock.");
      return;
    }
    setGlobalError(null);
    setActivePassphrase(passphraseInput);
    setPassphraseInput("");
    setDecryptedMap({});
    setItemErrors({});
  }

  function handleLockVault() {
    setActivePassphrase(null);
    setPassphraseInput("");
    setDecryptedMap({});
    setItemErrors({});
    setEditingId(null);
    setNewTitle("");
    setNewSecret("");
    setShareState(null);
  }

  async function handleSignOut() {
    handleLockVault();
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } finally {
      router.push("/signin");
      router.refresh();
    }
  }

  async function handleCreateItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!activePassphrase) {
      setFormError("Unlock your vault with your passphrase before adding items.");
      return;
    }

    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      setFormError("Please provide a title for this vault item.");
      return;
    }
    if (!newSecret) {
      setFormError("Please enter the secret content to encrypt.");
      return;
    }

    setSavingItem(true);
    try {
      const encrypted = await encryptText(newSecret, activePassphrase);

      const response = await fetch("/api/vault", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
          ciphertext: encrypted.ciphertext,
          salt: encrypted.salt,
          iv: encrypted.iv,
        }),
      });

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string };
        setFormError(errData.error ?? "Failed to store encrypted item.");
        setSavingItem(false);
        return;
      }

      const data = (await response.json()) as { item: VaultItem };
      setItems((prev) => [data.item, ...prev]);
      setNewTitle("");
      setNewSecret("");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Client-side encryption failed."
      );
    } finally {
      setSavingItem(false);
    }
  }

  async function handleToggleDecryptItem(item: VaultItem) {
    if (!activePassphrase) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]: "Unlock the vault with your passphrase first.",
      }));
      return;
    }

    // If already decrypted in memory, hide it
    if (decryptedMap[item.id] !== undefined) {
      setDecryptedMap((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      return;
    }

    setDecryptingId(item.id);
    setItemErrors((prev) => {
      const copy = { ...prev };
      delete copy[item.id];
      return copy;
    });

    try {
      const plaintext = await decryptText(
        {
          ciphertext: item.ciphertext,
          salt: item.salt,
          iv: item.iv,
        },
        activePassphrase
      );

      setDecryptedMap((prev) => ({
        ...prev,
        [item.id]: plaintext,
      }));
    } catch (err) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]:
          err instanceof Error
            ? err.message
            : "Decryption failed. Verify that your active vault passphrase matches the passphrase used when this item was encrypted.",
      }));
    } finally {
      setDecryptingId(null);
    }
  }

  async function handleCopyPlaintext(itemId: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(itemId);
      setTimeout(() => {
        setCopiedId((current) => (current === itemId ? null : current));
      }, 2000);
    } catch {
      setItemErrors((prev) => ({
        ...prev,
        [itemId]: "Could not copy to clipboard.",
      }));
    }
  }

  async function handleStartEdit(item: VaultItem) {
    if (!activePassphrase) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]: "Unlock the vault with your passphrase first.",
      }));
      return;
    }
    // Reuse the in-memory decrypted secret when available; otherwise decrypt now.
    let secret = decryptedMap[item.id];
    if (secret === undefined) {
      try {
        secret = await decryptText(
          { ciphertext: item.ciphertext, salt: item.salt, iv: item.iv },
          activePassphrase
        );
      } catch (err) {
        setItemErrors((prev) => ({
          ...prev,
          [item.id]:
            err instanceof Error ? err.message : "Decryption failed.",
        }));
        return;
      }
    }
    setEditTitle(item.title);
    setEditSecret(secret);
    setEditingId(item.id);
  }

  async function handleSaveEdit(event: React.FormEvent<HTMLFormElement>, item: VaultItem) {
    event.preventDefault();
    if (!activePassphrase) return;

    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setItemErrors((prev) => ({ ...prev, [item.id]: "Title cannot be empty." }));
      return;
    }
    if (!editSecret) {
      setItemErrors((prev) => ({ ...prev, [item.id]: "Secret cannot be empty." }));
      return;
    }

    setSavingEdit(true);
    try {
      // Re-encrypt with the active passphrase (fresh salt + IV) and PUT.
      const encrypted = await encryptText(editSecret, activePassphrase);
      const response = await fetch(`/api/vault/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          ciphertext: encrypted.ciphertext,
          salt: encrypted.salt,
          iv: encrypted.iv,
        }),
      });

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string };
        setItemErrors((prev) => ({
          ...prev,
          [item.id]: errData.error ?? "Failed to update vault item.",
        }));
        return;
      }

      const data = (await response.json()) as { item: VaultItem };
      setItems((prev) => prev.map((i) => (i.id === item.id ? data.item : i)));
      setDecryptedMap((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      setEditingId(null);
    } catch (err) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]: err instanceof Error ? err.message : "Update failed.",
      }));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    setItemErrors((prev) => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });

    try {
      const response = await fetch(`/api/vault/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string };
        setItemErrors((prev) => ({
          ...prev,
          [itemId]: errData.error ?? "Failed to delete vault item.",
        }));
        return;
      }

      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setDecryptedMap((prev) => {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });
      if (shareState?.itemId === itemId) {
        setShareState(null);
      }
      if (editingId === itemId) {
        setEditingId(null);
      }
    } catch {
      setItemErrors((prev) => ({
        ...prev,
        [itemId]: "Network error while deleting item.",
      }));
    }
  }

  function openShareModal(itemId: string) {
    setCopiedShareUrl(false);
    setShareState({
      itemId,
      expiresInHours: 24,
      maxViews: 1,
      creating: false,
      generatedUrl: null,
      error: null,
    });
  }

  async function handleCreateShareLink(item: VaultItem) {
    if (!shareState || shareState.itemId !== item.id) return;

    setShareState((prev) =>
      prev ? { ...prev, creating: true, error: null, generatedUrl: null } : null
    );

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: item.title,
          ciphertext: item.ciphertext,
          salt: item.salt,
          iv: item.iv,
          expiresInHours: shareState.expiresInHours,
          maxViews: shareState.maxViews,
        }),
      });

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string };
        setShareState((prev) =>
          prev
            ? {
                ...prev,
                creating: false,
                error: errData.error ?? "Could not create share link.",
              }
            : null
        );
        return;
      }

      const data = (await response.json()) as { id: string; url: string };
      const fullUrl = `${window.location.origin}${data.url}`;
      setShareState((prev) =>
        prev
          ? {
              ...prev,
              creating: false,
              generatedUrl: fullUrl,
            }
          : null
      );
    } catch {
      setShareState((prev) =>
        prev
          ? {
              ...prev,
              creating: false,
              error: "Network error while creating share link.",
            }
          : null
      );
    }
  }

  async function handleCopyShareUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShareUrl(true);
      setTimeout(() => setCopiedShareUrl(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  }

  if (authChecking) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="p-8 border border-line rounded bg-surface text-sm text-body font-mono">
          Verifying authenticated session...
        </div>
      </div>
    );
  }

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Account & Zero-Knowledge Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded border border-ok-400/40 bg-ok-400/10 text-ok-300 font-semibold">
              {activePassphrase ? "Vault Unlocked (In-Memory)" : "Vault Locked"}
            </span>
            {user && (
              <span className="text-xs text-muted font-mono break-all min-w-0">
                {user.email}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-heading">
            Encrypted Vault
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {activePassphrase && (
            <button
              type="button"
              onClick={handleLockVault}
              className="px-4 py-2 rounded border border-muted/60 bg-elevated text-xs font-semibold text-heading hover:border-muted transition-colors cursor-pointer"
            >
              Lock Vault
            </button>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2 rounded border border-muted/60 bg-elevated text-xs font-semibold text-body hover:text-danger-300 hover:border-danger-400/60 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      {globalError && (
        <div
          role="alert"
          className="p-4 rounded border border-danger-400/40 bg-danger-400/10 text-xs text-danger-200"
        >
          {globalError}
        </div>
      )}

      {/* Vault Passphrase Unlock / Active Control Box */}
      <section className="p-6 rounded border border-line bg-surface">
        {!activePassphrase ? (
          <div>
            <h2 className="text-base font-semibold text-heading">
              Unlock Vault with Local Passphrase
            </h2>
            <p className="mt-1 text-xs text-body leading-relaxed max-w-3xl">
              Your vault passphrase is kept exclusively in React memory state. It is never saved to localStorage, sessionStorage, or cookies, and is never transmitted to the server. Each item derives a 256-bit AES-GCM key using PBKDF2-SHA256 (600,000 iterations).
            </p>
            <form
              onSubmit={handleUnlockVault}
              className="mt-4 flex flex-col sm:flex-row gap-3 max-w-xl"
            >
              <input
                type="password"
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                placeholder="Enter your local vault passphrase..."
                required
                className="flex-1 px-3.5 py-2.5 text-sm rounded border border-muted/60 bg-elevated text-heading focus:outline-none focus:border-brass"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded bg-brass text-night text-sm font-medium hover:bg-brass-deep transition-colors cursor-pointer"
              >
                Unlock Vault
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-ok-300 font-semibold">
                Active Passphrase Loaded in Memory
              </div>
              <p className="mt-1 text-xs text-body">
                You can now encrypt new secrets or click any existing record below to derive its key and decrypt in place. Locking the vault immediately wipes the passphrase and all decrypted secrets from browser memory.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLockVault}
              className="self-start sm:self-center shrink-0 px-4 py-2 rounded bg-brass text-night text-xs font-semibold hover:bg-brass-deep transition-colors cursor-pointer"
            >
              Clear Key &amp; Lock
            </button>
          </div>
        )}
      </section>

      {/* Main Content When Unlocked vs Locked */}
      {activePassphrase && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Add Encrypted Item Form */}
          <div className="lg:col-span-5 p-6 rounded border border-line bg-surface">
            <div className="text-xs font-mono text-brass font-semibold">
              Client-Side Encryption
            </div>
            <h2 className="mt-1 text-lg font-bold text-heading">
              Add New Vault Secret
            </h2>
            <p className="mt-1 text-xs text-body">
              Plaintext is encrypted with a fresh 16-byte salt and 12-byte IV before leaving your browser.
            </p>

            {formError && (
              <div
                role="alert"
                className="mt-4 p-3 rounded border border-danger-400/40 bg-danger-400/10 text-xs text-danger-200"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateItem} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="item-title"
                  className="block text-xs font-semibold text-body"
                >
                  Title (Unencrypted Metadata)
                </label>
                <input
                  id="item-title"
                  type="text"
                  maxLength={200}
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  disabled={savingItem}
                  placeholder="e.g., Production Database Credentials"
                  className="mt-1.5 w-full px-3.5 py-2 text-sm rounded border border-muted/60 bg-elevated text-heading focus:outline-none focus:border-brass"
                />
              </div>

              <div>
                <label
                  htmlFor="item-secret"
                  className="block text-xs font-semibold text-body"
                >
                  Secret Plaintext (Encrypted Locally)
                </label>
                <textarea
                  id="item-secret"
                  rows={5}
                  required
                  value={newSecret}
                  onChange={(e) => setNewSecret(e.target.value)}
                  disabled={savingItem}
                  placeholder="Paste API key, recovery seed, password, or confidential note..."
                  className="mt-1.5 w-full px-3.5 py-2 text-sm font-mono rounded border border-muted/60 bg-elevated text-heading focus:outline-none focus:border-brass"
                />
              </div>

              <button
                type="submit"
                disabled={savingItem}
                className="w-full py-2.5 px-4 rounded bg-brass text-night text-sm font-medium hover:bg-brass-deep transition-colors disabled:opacity-60 cursor-pointer"
              >
                {savingItem
                  ? "Deriving Key & Encrypting..."
                  : "Encrypt & Save to Vault"}
              </button>
            </form>
          </div>

          {/* Right Column: Searchable Vault Items List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-heading">
                Stored Vault Records ({items.length})
              </h2>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items by title..."
                className="w-full sm:w-64 px-3.5 py-2 text-xs rounded border border-muted/60 bg-elevated text-heading focus:outline-none focus:border-brass"
              />
            </div>

            {loadingItems ? (
              <div className="p-8 rounded border border-line bg-surface text-xs font-mono text-muted">
                Loading encrypted records...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 rounded border border-line bg-surface text-center">
                <p className="text-sm font-semibold text-heading">
                  {items.length === 0
                    ? "Your encrypted vault is empty."
                    : "No vault items match your search filter."}
                </p>
                <p className="mt-1 text-xs text-body">
                  {items.length === 0
                    ? "Use the form on the left to encrypt and store your first secret."
                    : "Try clearing or changing your search query."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => {
                  const isDecrypted = decryptedMap[item.id] !== undefined;
                  const isDecrypting = decryptingId === item.id;
                  const itemError = itemErrors[item.id];
                  const isSharingThis = shareState?.itemId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded border border-line bg-surface transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-heading">
                            {item.title}
                          </h3>
                          <div className="mt-0.5 text-xs font-mono text-muted">
                            Created{" "}
                            {new Date(item.created_at).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleToggleDecryptItem(item)}
                            disabled={isDecrypting}
                            className="px-3 py-1.5 rounded bg-brass text-night text-xs font-medium hover:bg-brass-deep transition-colors disabled:opacity-60 cursor-pointer"
                          >
                            {isDecrypting
                              ? "Decrypting..."
                              : isDecrypted
                              ? "Hide Secret"
                              : "Decrypt Secret"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleStartEdit(item)}
                            className="px-3 py-1.5 rounded border border-muted/60 bg-elevated text-xs font-medium text-heading hover:border-muted transition-colors cursor-pointer"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              isSharingThis
                                ? setShareState(null)
                                : openShareModal(item.id)
                            }
                            className="px-3 py-1.5 rounded border border-muted/60 bg-elevated text-xs font-medium text-heading hover:border-muted transition-colors cursor-pointer"
                          >
                            {isSharingThis ? "Close Share" : "Create Share Link"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDeleteItem(item.id)}
                            className="px-3 py-1.5 rounded border border-line bg-elevated text-xs font-medium text-danger-300 hover:border-danger-400 hover:bg-danger-400/10 transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {itemError && (
                        <div
                          role="alert"
                          className="mt-3 p-3 rounded border border-danger-400/40 bg-danger-400/10 text-xs text-danger-200"
                        >
                          {itemError}
                        </div>
                      )}

                      {editingId === item.id && (
                        <form
                          onSubmit={(e) => void handleSaveEdit(e, item)}
                          className="mt-4 space-y-3 p-4 rounded border border-muted/60 bg-elevated"
                        >
                          <div>
                            <label className="block text-xs font-semibold text-body">
                              Title
                            </label>
                            <input
                              type="text"
                              maxLength={200}
                              required
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              disabled={savingEdit}
                              className="mt-1.5 w-full px-3.5 py-2 text-sm rounded border border-muted/60 bg-elevated text-heading focus:outline-none focus:border-brass"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-body">
                              Secret (re-encrypted on save)
                            </label>
                            <textarea
                              rows={4}
                              required
                              value={editSecret}
                              onChange={(e) => setEditSecret(e.target.value)}
                              disabled={savingEdit}
                              className="mt-1.5 w-full px-3.5 py-2 text-sm font-mono rounded border border-muted/60 bg-elevated text-heading focus:outline-none focus:border-brass"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              disabled={savingEdit}
                              className="px-4 py-2 rounded bg-brass text-night text-xs font-medium hover:bg-brass-deep transition-colors disabled:opacity-60 cursor-pointer"
                            >
                              {savingEdit ? "Re-encrypting..." : "Save Changes"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-4 py-2 rounded border border-muted/60 bg-elevated text-xs font-medium text-heading hover:border-muted transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      {isDecrypted && (
                        <div className="mt-4 p-4 rounded border border-brass/40 bg-brass/10">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-mono text-brass font-semibold">
                              Decrypted Plaintext
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void handleCopyPlaintext(
                                  item.id,
                                  decryptedMap[item.id] ?? ""
                                )
                              }
                              className="px-2.5 py-1 rounded bg-elevated border border-brass/40 text-xs font-mono font-medium text-brass hover:bg-brass hover:text-night transition-colors cursor-pointer"
                            >
                              {copiedId === item.id ? "Copied" : "Copy Secret"}
                            </button>
                          </div>
                          <pre className="text-xs font-mono text-heading whitespace-pre-wrap break-all bg-elevated p-3 rounded border border-line">
                            {decryptedMap[item.id]}
                          </pre>
                        </div>
                      )}

                      {isSharingThis && shareState && (
                        <div className="mt-4 p-4 rounded border border-muted/60 bg-elevated space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-heading font-semibold">
                              Zero-Knowledge Encrypted Share Link
                            </span>
                          </div>
                          <p className="text-xs text-body leading-relaxed">
                            Creates a public link containing only this item&apos;s ciphertext, salt, and IV. Anyone opening the link must still enter the exact vault passphrase used to encrypt this item.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-body">
                                Expiration Window
                              </label>
                              <select
                                value={shareState.expiresInHours}
                                onChange={(e) =>
                                  setShareState((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          expiresInHours: Number(e.target.value),
                                          generatedUrl: null,
                                        }
                                      : null
                                  )
                                }
                                className="mt-1 w-full px-3 py-2 text-xs rounded border border-muted/60 bg-elevated text-heading"
                              >
                                <option value={1}>1 Hour</option>
                                <option value={24}>24 Hours</option>
                                <option value={168}>7 Days (168 Hours)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-body">
                                Maximum Views
                              </label>
                              <select
                                value={shareState.maxViews}
                                onChange={(e) =>
                                  setShareState((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          maxViews: Number(e.target.value),
                                          generatedUrl: null,
                                        }
                                      : null
                                  )
                                }
                                className="mt-1 w-full px-3 py-2 text-xs rounded border border-muted/60 bg-elevated text-heading"
                              >
                                <option value={1}>1 View (Self-Destruct)</option>
                                <option value={5}>5 Views</option>
                                <option value={10}>10 Views</option>
                              </select>
                            </div>
                          </div>

                          {shareState.error && (
                            <div className="p-2.5 rounded border border-danger-400/40 bg-danger-400/10 text-xs text-danger-200">
                              {shareState.error}
                            </div>
                          )}

                          {!shareState.generatedUrl ? (
                            <button
                              type="button"
                              disabled={shareState.creating}
                              onClick={() => void handleCreateShareLink(item)}
                              className="px-4 py-2 rounded bg-brass text-night text-xs font-medium hover:bg-brass-deep transition-colors disabled:opacity-60 cursor-pointer"
                            >
                              {shareState.creating
                                ? "Generating Share Link..."
                                : "Generate Encrypted Share URL"}
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-ok-300">
                                Share URL Ready:
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={shareState.generatedUrl}
                                  className="flex-1 px-3 py-2 text-xs font-mono rounded border border-muted/60 bg-elevated text-heading"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyShareUrl(
                                      shareState.generatedUrl ?? ""
                                    )
                                  }
                                  className="px-3.5 py-2 rounded bg-elevated border border-muted/60 text-heading text-xs font-medium hover:border-muted transition-colors cursor-pointer"
                                >
                                  {copiedShareUrl ? "Copied URL" : "Copy URL"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!activePassphrase && (
        <div className="p-10 rounded border border-line bg-surface text-center">
          <div className="text-xs font-mono text-muted">
            Zero-Knowledge Protection Active
          </div>
          <h3 className="mt-2 text-lg font-semibold text-heading">
            Your vault is currently locked
            {!loadingItems && (
              <>
                {" "}
                ({items.length} encrypted {items.length === 1 ? "record" : "records"}{" "}
                stored)
              </>
            )}
            .
          </h3>
          <p className="mt-1 text-xs text-body max-w-md mx-auto">
            Enter your vault passphrase above to unlock client-side encryption, add new secrets, or decrypt your existing records.
          </p>
        </div>
      )}
    </div>
  );
}
