import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SiteHeader from "./components/site-header";

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
      <body className="min-h-screen flex flex-col bg-night text-body">
        <SiteHeader />

        <main className="flex-1">{children}</main>

        <footer className="border-t border-line bg-surface py-8 mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-body">CipherVault</span>
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
