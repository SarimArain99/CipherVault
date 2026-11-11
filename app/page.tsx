import Link from "next/link";

export default function HomePage() {
  return (
    <div className="bg-white text-[#0a0a0a]">
      {/* Hero Section */}
      <section className="border-b border-neutral-200 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[#0E7A5F]/30 bg-[#f0fdf8] text-[#0E7A5F] text-xs font-mono uppercase tracking-wider mb-6">
              Client-Side WebCrypto Architecture
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#0a0a0a] leading-tight">
              Zero-knowledge encrypted storage for sensitive credentials and records.
            </h1>
            <p className="mt-6 text-lg text-neutral-600 leading-relaxed">
              CipherVault separates authentication from encryption. Your account password authenticates your session, while your vault passphrase stays strictly inside your browser memory to derive AES-256-GCM keys via the native WebCrypto API.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="px-6 py-3 rounded bg-[#0E7A5F] text-white font-medium text-sm hover:bg-[#0b614b] transition-colors"
              >
                Create Vault Account
              </Link>
              <Link
                href="/signin"
                className="px-6 py-3 rounded border border-neutral-300 bg-white text-[#0a0a0a] font-medium text-sm hover:border-[#0a0a0a] transition-colors"
              >
                Sign In to Existing Vault
              </Link>
              <Link
                href="/tools"
                className="px-4 py-3 text-sm font-medium text-[#0E7A5F] hover:underline"
              >
                Offline File &amp; Password Tools &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Zero-Knowledge Architecture Explanation */}
      <section className="py-16 sm:py-24 border-b border-neutral-200 bg-[#f8faf9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0a0a0a]">
              How Zero-Knowledge Separation Works
            </h2>
            <p className="mt-3 text-neutral-600 text-base">
              Standard applications encrypt data on the server, meaning the server briefly holds your plaintext and encryption keys. CipherVault performs all cryptographic operations before network transmission occurs.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded border border-neutral-200">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#0E7A5F]">
                Step 01 / Authentication
              </div>
              <h3 className="mt-2 text-lg font-semibold text-[#0a0a0a]">
                Separate Login Credentials
              </h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                Your account email and login password are used strictly to issue an HTTP-only session cookie and verify access rights to your encrypted blobs. Login passwords are hashed server-side using bcrypt.
              </p>
            </div>

            <div className="bg-white p-6 rounded border border-neutral-200">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#0E7A5F]">
                Step 02 / Local Key Derivation
              </div>
              <h3 className="mt-2 text-lg font-semibold text-[#0a0a0a]">
                PBKDF2-SHA256 in Browser
              </h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                When creating or reading an item, your local vault passphrase is combined with a unique 16-byte random salt per record and passed through 600,000 iterations of PBKDF2-SHA256 to derive a 256-bit key.
              </p>
            </div>

            <div className="bg-white p-6 rounded border border-neutral-200">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#0E7A5F]">
                Step 03 / Authenticated Ciphertext
              </div>
              <h3 className="mt-2 text-lg font-semibold text-[#0a0a0a]">
                AES-256-GCM Storage
              </h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                Plaintext is encrypted with AES-256-GCM using a fresh 12-byte initialization vector (IV). Only the resulting ciphertext, salt, and IV are sent to Postgres. The database never sees your passphrase or plaintext.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature List */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0a0a0a]">
                Engineered for verifiable privacy.
              </h2>
              <p className="mt-4 text-neutral-600 text-base leading-relaxed">
                Every cryptographic primitive relies directly on the browser&apos;s native <code className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">window.crypto.subtle</code> implementation with zero external encryption dependencies.
              </p>
              <div className="mt-8 p-5 rounded border border-neutral-200 bg-[#f8faf9]">
                <div className="text-xs font-mono uppercase text-neutral-500">
                  Database Record Payload Inspection
                </div>
                <pre className="mt-3 text-xs font-mono text-neutral-800 overflow-x-auto leading-relaxed">
{`{
  "title": "Production Root Key",
  "ciphertext": "8f9d2a...b41e==",
  "salt": "4c81e09a2b3f1180...",
  "iv": "9a01bc44d28f1011..."
}`}
                </pre>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 rounded border border-neutral-200">
                <h3 className="text-base font-semibold text-[#0a0a0a]">
                  Encrypted Vault Items
                </h3>
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                  Store API keys, recovery phrases, notes, and credentials. Each item uses an independent 16-byte salt and 12-byte IV so identical secrets never produce identical ciphertext.
                </p>
              </div>

              <div className="p-6 rounded border border-neutral-200">
                <h3 className="text-base font-semibold text-[#0a0a0a]">
                  Self-Destructing Share Links
                </h3>
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                  Generate encrypted one-time or view-limited share links with custom expiration windows. Decryption requires the recipient passphrase in the browser.
                </p>
              </div>

              <div className="p-6 rounded border border-neutral-200">
                <h3 className="text-base font-semibold text-[#0a0a0a]">
                  Client-Side File Encryption
                </h3>
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                  Encrypt and decrypt arbitrary binary files locally in your browser without uploading files to any remote server.
                </p>
              </div>

              <div className="p-6 rounded border border-neutral-200">
                <h3 className="text-base font-semibold text-[#0a0a0a]">
                  High-Entropy Secret Generator
                </h3>
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                  Generate cryptographically random passwords and passphrases via <code className="font-mono text-xs">crypto.getRandomValues</code> with real-time entropy bit calculations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
