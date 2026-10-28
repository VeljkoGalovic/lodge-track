import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { About } from "@/components/About";
import { Footer } from "@/components/Footer";
import { LenisProvider } from "@/components/LenisProvider";
import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { visitorLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  // `www` is the sole canonical host; the apex redirects at the edge.
  alternates: { canonical: "https://www.lodgetrack.com" },
};

/**
 * The marketing page is a fixed dark brand experience.
 *
 * The `.dark` scope is what enforces that: it re-declares the theme tokens for
 * this subtree, so anything shared with the application — `Button`, above all —
 * renders in its dark form here no matter which theme the visitor has chosen for
 * their account. Without it a member who picked light would see the brand's
 * glass buttons turn into light-mode buttons floating over a dark hero.
 *
 * The background is restated rather than inherited from `<body>`, because
 * `Features` and `About` have no background of their own and would otherwise
 * show whatever the application's theme paints behind them.
 *
 * Language is per visitor, not per member: an explicit choice (cookie) wins,
 * otherwise Cloudflare's tunnel tells us the visitor's country and Serbian
 * visitors get the Serbian page. It also becomes the `lang` hint for this
 * subtree's screen readers.
 */
export default async function Home() {
  const locale = await visitorLocale();
  const m = getDictionary(locale).marketing;

  return (
    <div lang={locale} className="dark min-h-screen bg-background text-foreground">
      <LenisProvider />
      <Navbar
        currentLocale={locale}
        links={[
          { label: m.navbar.features, href: "#features" },
          { label: m.navbar.pricing, href: "#pricing" },
          { label: m.navbar.about, href: "#about" },
        ]}
        signIn={m.navbar.signIn}
        signUp={m.navbar.signUp}
        toggleMenu={m.navbar.toggleMenu}
        languageLabel={m.navbar.language}
      />
      <main>
        <Hero locale={locale} />
        <Features locale={locale} />
        <Pricing locale={locale} />
        <About locale={locale} />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
