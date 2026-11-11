"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { encryptBytes, decryptBytes } from "@/lib/crypto";

const UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz";
const DIGIT_CHARS = "0123456789";
const SYMBOL_CHARS = "!@#$%^&*()-_=+[]{};:,.<>/?~";

function getRandomIndex(maxExclusive: number): number {
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);
  while (true) {
    window.crypto.getRandomValues(buffer);
    const val = buffer[0];
    if (val !== undefined && val < limit) {
      return val % maxExclusive;
    }
  }
}

export default function CryptoToolsPage() {
  // Section A1: File Encryption State
  const [encryptFile, setEncryptFile] = useState<File | null>(null);
  const [encryptPassphrase, setEncryptPassphrase] = useState("");
  const [encryptBusy, setEncryptBusy] = useState(false);
  const [encryptError, setEncryptError] = useState<string | null>(null);
  const [encryptSuccess, setEncryptSuccess] = useState<string | null>(null);
  const [isDraggingEnc, setIsDraggingEnc] = useState(false);
  const encryptInputRef = useRef<HTMLInputElement | null>(null);

  // Section A2: File Decryption State
  const [decryptFile, setDecryptFile] = useState<File | null>(null);
  const [decryptPassphrase, setDecryptPassphrase] = useState("");
  const [decryptBusy, setDecryptBusy] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [decryptSuccess, setDecryptSuccess] = useState<string | null>(null);
  const [isDraggingDec, setIsDraggingDec] = useState(false);
  const decryptInputRef = useRef<HTMLInputElement | null>(null);

  // Section B: Password Generator State
  const [length, setLength] = useState<number>(24);
  const [useUpper, setUseUpper] = useState<boolean>(true);
  const [useLower, setUseLower] = useState<boolean>(true);
  const [useDigits, setUseDigits] = useState<boolean>(true);
  const [useSymbols, setUseSymbols] = useState<boolean>(true);
  const [generatedPassword, setGeneratedPassword] = useState<string>("");
  const [genError, setGenError] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState<boolean>(false);

  const generatePassword = useCallback(() => {
    setGenError(null);
    let pool = "";
    if (useUpper) pool += UPPERCASE_CHARS;
    if (useLower) pool += LOWERCASE_CHARS;
    if (useDigits) pool += DIGIT_CHARS;
    if (useSymbols) pool += SYMBOL_CHARS;

    if (pool.length === 0) {
      setGeneratedPassword("");
      setGenError("Select at least one character set to generate a password.");
      return;
    }

    let result = "";
    for (let i = 0; i < length; i++) {
      const idx = getRandomIndex(pool.length);
      result += pool.charAt(idx);
    }
    setGeneratedPassword(result);
    setCopiedPassword(false);
  }, [length, useUpper, useLower, useDigits, useSymbols]);

  useEffect(() => {
    generatePassword();
  }, [generatePassword]);

  // Calculate Shannon entropy bits based on pool size and length
  let activePoolSize = 0;
  if (useUpper) activePoolSize += UPPERCASE_CHARS.length;
  if (useLower) activePoolSize += LOWERCASE_CHARS.length;
  if (useDigits) activePoolSize += DIGIT_CHARS.length;
  if (useSymbols) activePoolSize += SYMBOL_CHARS.length;

  const entropyBits =
    activePoolSize > 0
      ? Math.round(length * Math.log2(activePoolSize) * 10) / 10
      : 0;

  function triggerBrowserDownload(bytes: Uint8Array, filename: string) {
    const blob = new Blob([bytes as unknown as BlobPart], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  async function handleEncryptFileSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setEncryptError(null);
    setEncryptSuccess(null);

    if (!encryptFile) {
      setEncryptError("Please choose a file to encrypt.");
      return;
    }
    if (!encryptPassphrase) {
      setEncryptError("Please enter a passphrase to encrypt this file.");
      return;
    }

    setEncryptBusy(true);
    try {
      const arrayBuffer = await encryptFile.arrayBuffer();
      const plainBytes = new Uint8Array(arrayBuffer);
      const packedCipherBytes = await encryptBytes(
        plainBytes,
        encryptPassphrase
      );

      const outputFilename = `${encryptFile.name}.vault`;
      triggerBrowserDownload(packedCipherBytes, outputFilename);
      setEncryptSuccess(
        `Encrypted "${encryptFile.name}" and downloaded as "${outputFilename}".`
      );
      setEncryptPassphrase("");
    } catch (err) {
      setEncryptError(
        err instanceof Error ? err.message : "File encryption failed."
      );
    } finally {
      setEncryptBusy(false);
    }
  }

  async function handleDecryptFileSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setDecryptError(null);
    setDecryptSuccess(null);

    if (!decryptFile) {
      setDecryptError("Please select a .vault file to decrypt.");
      return;
    }
    if (!decryptPassphrase) {
      setDecryptError("Please enter the passphrase used to encrypt this file.");
      return;
    }

    setDecryptBusy(true);
    try {
      const arrayBuffer = await decryptFile.arrayBuffer();
      const packedBytes = new Uint8Array(arrayBuffer);
      const decryptedBytes = await decryptBytes(packedBytes, decryptPassphrase);

      const originalName = decryptFile.name.endsWith(".vault")
        ? decryptFile.name.slice(0, -6) || "decrypted-file"
        : `decrypted-${decryptFile.name}`;

      triggerBrowserDownload(decryptedBytes, originalName);
      setDecryptSuccess(
        `Decrypted "${decryptFile.name}" and downloaded as "${originalName}".`
      );
      setDecryptPassphrase("");
    } catch (err) {
      setDecryptError(
        err instanceof Error
          ? err.message
          : "Decryption failed. Incorrect passphrase or corrupted .vault file."
      );
    } finally {
      setDecryptBusy(false);
    }
  }

  async function handleCopyGeneratedPassword() {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-6">
        <div className="text-xs font-mono uppercase tracking-wider text-[#0E7A5F] font-semibold">
          Offline Client-Side Utilities
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0a0a0a]">
          Local Cryptographic Tools
        </h1>
        <p className="mt-2 text-sm text-neutral-600 max-w-3xl leading-relaxed">
          All operations on this page run entirely inside your browser via WebCrypto (<code className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">PBKDF2-SHA256</code>, <code className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">AES-256-GCM</code>, and <code className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">crypto.getRandomValues</code>). No files, passphrases, or generated secrets are ever uploaded.
        </p>
      </div>

      {/* Section A: File Encryption & Decryption */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#0a0a0a]">
            Binary File Encryption &amp; Decryption
          </h2>
          <p className="mt-1 text-xs text-neutral-600">
            Encrypted <code className="font-mono">.vault</code> files pack a 16-byte random salt, 12-byte random IV, and authenticated AES-256-GCM ciphertext into a single portable binary container.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Encrypt File Card */}
          <div className="p-6 rounded border border-neutral-200 bg-white flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#0E7A5F] font-semibold">
                Mode 01 / Encrypt to .vault
              </div>
              <h3 className="mt-1 text-lg font-bold text-[#0a0a0a]">
                Encrypt Local File
              </h3>

              <form
                onSubmit={handleEncryptFileSubmit}
                className="mt-5 space-y-4"
              >
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingEnc(true);
                  }}
                  onDragLeave={() => setIsDraggingEnc(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingEnc(false);
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) {
                      setEncryptFile(dropped);
                      setEncryptError(null);
                      setEncryptSuccess(null);
                    }
                  }}
                  onClick={() => encryptInputRef.current?.click()}
                  className={`p-6 border-2 border-dashed rounded text-center cursor-pointer transition-colors ${
                    isDraggingEnc
                      ? "border-[#0E7A5F] bg-[#f0fdf8]"
                      : "border-neutral-300 bg-[#f8faf9] hover:border-[#0E7A5F]"
                  }`}
                >
                  <input
                    ref={encryptInputRef}
                    type="file"
                    onChange={(e) => {
                      const picked = e.target.files?.[0] ?? null;
                      setEncryptFile(picked);
                      setEncryptError(null);
                      setEncryptSuccess(null);
                    }}
                    className="hidden"
                  />
                  {encryptFile ? (
                    <div>
                      <div className="text-sm font-semibold text-[#0a0a0a]">
                        {encryptFile.name}
                      </div>
                      <div className="mt-1 text-xs font-mono text-neutral-500">
                        {(encryptFile.size / 1024).toFixed(2)} KB — Click or drop to replace
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-medium text-[#0a0a0a]">
                        Drag and drop any file here, or click to browse
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        Processed 100% in browser memory
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="enc-file-pass"
                    className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
                  >
                    Encryption Passphrase
                  </label>
                  <input
                    id="enc-file-pass"
                    type="password"
                    required
                    value={encryptPassphrase}
                    onChange={(e) => setEncryptPassphrase(e.target.value)}
                    disabled={encryptBusy}
                    placeholder="Enter a strong passphrase..."
                    className="mt-1.5 w-full px-3.5 py-2.5 text-sm rounded border border-neutral-300 bg-white text-[#0a0a0a] focus:outline-none focus:border-[#0E7A5F]"
                  />
                </div>

                {encryptError && (
                  <div
                    role="alert"
                    className="p-3 rounded border border-red-300 bg-red-50 text-xs text-red-900"
                  >
                    {encryptError}
                  </div>
                )}

                {encryptSuccess && (
                  <div className="p-3 rounded border border-[#0E7A5F]/40 bg-[#f0fdf8] text-xs text-[#0E7A5F] font-medium">
                    {encryptSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={encryptBusy}
                  className="w-full py-2.5 px-4 rounded bg-[#0E7A5F] text-white text-sm font-medium hover:bg-[#0b614b] transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {encryptBusy
                    ? "Encrypting File (600,000 PBKDF2 Iterations)..."
                    : "Encrypt & Download .vault File"}
                </button>
              </form>
            </div>
          </div>

          {/* Decrypt File Card */}
          <div className="p-6 rounded border border-neutral-200 bg-white flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#0E7A5F] font-semibold">
                Mode 02 / Restore Original File
              </div>
              <h3 className="mt-1 text-lg font-bold text-[#0a0a0a]">
                Decrypt .vault File
              </h3>

              <form
                onSubmit={handleDecryptFileSubmit}
                className="mt-5 space-y-4"
              >
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingDec(true);
                  }}
                  onDragLeave={() => setIsDraggingDec(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingDec(false);
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) {
                      setDecryptFile(dropped);
                      setDecryptError(null);
                      setDecryptSuccess(null);
                    }
                  }}
                  onClick={() => decryptInputRef.current?.click()}
                  className={`p-6 border-2 border-dashed rounded text-center cursor-pointer transition-colors ${
                    isDraggingDec
                      ? "border-[#0E7A5F] bg-[#f0fdf8]"
                      : "border-neutral-300 bg-[#f8faf9] hover:border-[#0E7A5F]"
                  }`}
                >
                  <input
                    ref={decryptInputRef}
                    type="file"
                    accept=".vault,*/*"
                    onChange={(e) => {
                      const picked = e.target.files?.[0] ?? null;
                      setDecryptFile(picked);
                      setDecryptError(null);
                      setDecryptSuccess(null);
                    }}
                    className="hidden"
                  />
                  {decryptFile ? (
                    <div>
                      <div className="text-sm font-semibold text-[#0a0a0a]">
                        {decryptFile.name}
                      </div>
                      <div className="mt-1 text-xs font-mono text-neutral-500">
                        {(decryptFile.size / 1024).toFixed(2)} KB — Click or drop to replace
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-medium text-[#0a0a0a]">
                        Drop a <span className="font-mono">.vault</span> file here, or click to select
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        Extracts salt + IV and verifies GCM authentication tag
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="dec-file-pass"
                    className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
                  >
                    Decryption Passphrase
                  </label>
                  <input
                    id="dec-file-pass"
                    type="password"
                    required
                    value={decryptPassphrase}
                    onChange={(e) => setDecryptPassphrase(e.target.value)}
                    disabled={decryptBusy}
                    placeholder="Enter the passphrase used during encryption..."
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

                {decryptSuccess && (
                  <div className="p-3 rounded border border-[#0E7A5F]/40 bg-[#f0fdf8] text-xs text-[#0E7A5F] font-medium">
                    {decryptSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={decryptBusy}
                  className="w-full py-2.5 px-4 rounded bg-[#0a0a0a] text-white text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {decryptBusy
                    ? "Decrypting & Verifying Integrity..."
                    : "Decrypt & Download Original File"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Section B: High-Entropy Password Generator */}
      <section className="p-6 sm:p-8 rounded border border-neutral-200 bg-white space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-[#0E7A5F] font-semibold">
              CSPRNG Secret Generator
            </div>
            <h2 className="mt-1 text-xl font-bold text-[#0a0a0a]">
              Cryptographic Password Generator
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded border border-[#0E7A5F]/30 bg-[#f0fdf8] text-xs font-mono text-[#0E7A5F] font-semibold">
              Entropy: {entropyBits} bits
            </div>
            <div className="px-3 py-1.5 rounded border border-neutral-200 bg-[#f8faf9] text-xs font-mono text-neutral-600">
              Pool: {activePoolSize} chars
            </div>
          </div>
        </div>

        {genError && (
          <div
            role="alert"
            className="p-3 rounded border border-red-300 bg-red-50 text-xs text-red-900"
          >
            {genError}
          </div>
        )}

        {/* Output Display */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 p-4 rounded border border-neutral-300 bg-[#f8faf9] font-mono text-sm sm:text-base text-[#0a0a0a] break-all select-all">
            {generatedPassword || "—"}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={generatePassword}
              className="px-4 py-3 rounded border border-neutral-300 bg-white text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] hover:border-[#0a0a0a] transition-colors cursor-pointer"
            >
              Generate
            </button>
            <button
              type="button"
              disabled={!generatedPassword}
              onClick={() => void handleCopyGeneratedPassword()}
              className="px-5 py-3 rounded bg-[#0E7A5F] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#0b614b] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {copiedPassword ? "Copied" : "Copy Password"}
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 items-center">
          <div className="md:col-span-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-700">
              <label htmlFor="pw-length">Password Length</label>
              <span className="font-mono text-sm text-[#0E7A5F]">
                {length} characters
              </span>
            </div>
            <input
              id="pw-length"
              type="range"
              min={8}
              max={64}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-full accent-[#0E7A5F] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-neutral-400">
              <span>8</span>
              <span>24</span>
              <span>48</span>
              <span>64</span>
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="flex items-center gap-2.5 p-3 rounded border border-neutral-200 bg-[#f8faf9] text-xs font-medium text-[#0a0a0a] cursor-pointer">
              <input
                type="checkbox"
                checked={useUpper}
                onChange={(e) => setUseUpper(e.target.checked)}
                className="accent-[#0E7A5F] w-4 h-4"
              />
              <span>Uppercase (A-Z)</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded border border-neutral-200 bg-[#f8faf9] text-xs font-medium text-[#0a0a0a] cursor-pointer">
              <input
                type="checkbox"
                checked={useLower}
                onChange={(e) => setUseLower(e.target.checked)}
                className="accent-[#0E7A5F] w-4 h-4"
              />
              <span>Lowercase (a-z)</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded border border-neutral-200 bg-[#f8faf9] text-xs font-medium text-[#0a0a0a] cursor-pointer">
              <input
                type="checkbox"
                checked={useDigits}
                onChange={(e) => setUseDigits(e.target.checked)}
                className="accent-[#0E7A5F] w-4 h-4"
              />
              <span>Digits (0-9)</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded border border-neutral-200 bg-[#f8faf9] text-xs font-medium text-[#0a0a0a] cursor-pointer">
              <input
                type="checkbox"
                checked={useSymbols}
                onChange={(e) => setUseSymbols(e.target.checked)}
                className="accent-[#0E7A5F] w-4 h-4"
              />
              <span>Symbols (!@#$)</span>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
