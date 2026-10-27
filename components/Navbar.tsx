"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/locales";

interface NavbarProps {
  links: { label: string; href: string }[];
  signIn: string;
  signUp: string;
  toggleMenu: string;
  languageLabel: string;
  currentLocale: Locale;
}

/**
 * Writes the cookie the server's `visitorLocale()` reads on the next render.
 *
 * Kept as a literal here because the constant lives in `lib/i18n/server.ts`,
 * which imports `next/headers` — that module must never enter the client
 * bundle. The attributes mirror `LOCALE_COOKIE_OPTIONS`: same name, lax
 * same-site, one year.
 */
function setVisitorLocaleCookie(locale: Locale) {
  document.cookie = `lodgetrack_locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  // A reload — not a soft refresh — so the server re-resolves everything with
  // the new cookie, including this header's own server-rendered bits.
  window.location.reload();
}

function LanguageToggle({
  currentLocale,
  languageLabel,
  className = "",
}: {
  currentLocale: Locale;
  languageLabel: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={languageLabel}
      className={`flex items-center rounded-full border border-white/10 bg-white/5 p-0.5 text-xs ${className}`}
    >
      <button
        type="button"
        onClick={() => setVisitorLocaleCookie("en")}
        aria-pressed={currentLocale === "en"}
        className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
            currentLocale === "en" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setVisitorLocaleCookie("sr")}
        aria-pressed={currentLocale === "sr"}
        className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
            currentLocale === "sr" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
        }`}
      >
        SR
      </button>
    </div>
  );
}

export function Navbar({ links, signIn, signUp, toggleMenu, languageLabel, currentLocale }: NavbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 h-16 bg-[#07090E]/80 backdrop-blur-xl border-b border-white/[0.06]">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 shrink-0">
        <Image
          src="/images/logo/LogoNoBG.png"
          alt="LodgeTrack logo"
          width={32}
          height={32}
          className="h-8 w-8 object-contain"
        />
        <span className="text-lg font-semibold tracking-tight text-white">
          Lodge<span className="text-[#36BFAE]">Track</span>
        </span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200 rounded-full hover:bg-white/5"
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* Desktop CTA */}
      <div className="hidden md:flex items-center gap-3">
        <LanguageToggle currentLocale={currentLocale} languageLabel={languageLabel} />
        <Link
          href="/signin"
          className="text-sm font-medium text-slate-400 hover:text-white transition-colors px-3"
        >
          {signIn}
        </Link>
        <Button variant="glass" href="/register" className="text-sm px-5 py-2 h-9">
          {signUp}
        </Button>
      </div>

      {/* Mobile toggle */}
      <button
        className="md:hidden text-slate-400 hover:text-white transition-colors"
        onClick={() => setOpen(!open)}
        aria-label={toggleMenu}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="absolute top-16 left-0 right-0 bg-[#07090E]/95 backdrop-blur-xl border-b border-white/[0.06] md:hidden p-6 flex flex-col gap-4 shadow-2xl">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-slate-300 hover:text-white font-medium py-2 border-b border-white/5"
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/signin"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-400 hover:text-white text-center py-2"
            >
              {signIn}
            </Link>
            <Button
              variant="glass"
              href="/register"
              className="text-sm w-full"
              onClick={() => setOpen(false)}
            >
              {signUp}
            </Button>
            <LanguageToggle currentLocale={currentLocale} languageLabel={languageLabel} className="w-fit" />
          </div>
        </div>
      )}
    </header>
  );
}
