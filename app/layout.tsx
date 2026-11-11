import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CipherVault | Zero-Knowledge Encrypted Vault",
  description:
    "Client-side AES-256-GCM encrypted vault with PBKDF2-SHA256 key derivation. Plaintext and encryption keys never leave your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col bg-white text-[#0a0a0a]">
        <header className="border-b border-neutral-200 bg-white sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-[#0a0a0a] hover:opacity-90 transition-opacity"
            >
              <span className="w-7 h-7 rounded bg-[#0E7A5F] flex items-center justify-center text-white font-mono text-xs font-bold">
                CV
              </span>
              <span>CipherVault</span>
            </Link>

            <nav className="flex items-center gap-6 text-sm font-medium">
              <Link
                href="/tools"
                className="text-neutral-600 hover:text-[#0a0a0a] transition-colors"
              >
                Crypto Tools
              </Link>
              <Link
                href="/vault"
                className="text-neutral-600 hover:text-[#0a0a0a] transition-colors"
              >
                Vault
              </Link>
              <div className="h-4 w-px bg-neutral-200" aria-hidden="true" />
              <Link
                href="/signin"
                className="text-neutral-700 hover:text-[#0E7A5F] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-3.5 py-2 rounded bg-[#0E7A5F] text-white hover:bg-[#0b614b] transition-colors"
              >
                Create Account
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-neutral-200 bg-[#f8faf9] py-8 mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-800">CipherVault</span>
              <span>— Zero-Knowledge Architecture</span>
            </div>
            <div className="font-mono">
              PBKDF2-SHA256 (600,000 iter) · AES-256-GCM · WebCrypto API
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
