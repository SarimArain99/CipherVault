"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/tools", label: "Crypto Tools" },
  { href: "/vault", label: "Vault" },
  { href: "/signin", label: "Sign In" },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-[#0a0a0a] hover:opacity-90 transition-opacity shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A5F] rounded"
        >
          <span className="w-7 h-7 rounded bg-[#0E7A5F] flex items-center justify-center text-white font-mono text-xs font-bold">
            CV
          </span>
          <span>CipherVault</span>
        </Link>

        {/* Desktop nav — unchanged from before */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="/tools"
            className="text-neutral-600 hover:text-[#0a0a0a] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A5F] rounded"
          >
            Crypto Tools
          </Link>
          <Link
            href="/vault"
            className="text-neutral-600 hover:text-[#0a0a0a] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A5F] rounded"
          >
            Vault
          </Link>
          <div className="h-4 w-px bg-neutral-200" aria-hidden="true" />
          <Link
            href="/signin"
            className="text-neutral-700 hover:text-[#0E7A5F] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A5F] rounded"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-3.5 py-2 rounded bg-[#0E7A5F] text-white hover:bg-[#0b614b] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A5F]"
          >
            Create Account
          </Link>
        </nav>

        {/* Mobile menu button — 44px touch target, exact SVG icons so the
            menu lines and the X can never drift off-centre. */}
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
          className="md:hidden w-11 h-11 shrink-0 flex items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A5F] cursor-pointer"
        >
          <span className="relative block w-6 h-6" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className={`absolute inset-0 w-6 h-6 transition duration-200 ${
                menuOpen ? "opacity-0 scale-90" : "opacity-100 scale-100"
              }`}
            >
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className={`absolute inset-0 w-6 h-6 transition duration-200 ${
                menuOpen ? "opacity-100 scale-100" : "opacity-0 scale-90"
              }`}
            >
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </span>
        </button>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <nav
          aria-label="Mobile"
          className="md:hidden border-t border-neutral-200 bg-white px-4 sm:px-6 py-2"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block py-3.5 text-base font-medium text-neutral-700 hover:text-[#0E7A5F] border-b border-neutral-100 last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A5F] rounded"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/signup"
            onClick={() => setMenuOpen(false)}
            className="mt-2 mb-2 block text-center py-3 rounded bg-[#0E7A5F] text-white text-base font-medium hover:bg-[#0b614b] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A5F]"
          >
            Create Account
          </Link>
        </nav>
      )}
    </header>
  );
}
