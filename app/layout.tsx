import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BootScript } from "@/components/BootScript";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Static, and deliberately so.
 *
 * Nothing here reads a cookie. Both the theme and the language are per-member
 * preferences that live in cookies, and reading either one in the root layout
 * would opt every route in the application — the marketing page included — into
 * dynamic rendering. `BootScript` reads them in the browser instead, before the
 * first paint, which is where a class name and a `lang` attribute can be set
 * without a server round trip and without a flash of the wrong value.
 *
 * The metadata is English for the same reason, and because it describes the
 * marketing page, which is a fixed English brand surface.
 */
export const metadata: Metadata = {
  title: "LodgeTrack | Simplify Your Property Management",
  description:
    "Cutting-edge software to manage properties, bookings, and revenue in one unified platform. Built for small to medium rental businesses.",
  keywords: [
    "property management",
    "lodge track",
    "vacation rental software",
    "booking calendar",
    "rental analytics",
  ],
  authors: [{ name: "Veljko Galović" }],
  icons: {
    icon: "/images/logo/LogoNoBG.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} scroll-smooth`}
      // `BootScript` rewrites `class`, `style` and `lang` on this element before
      // React hydrates, so the server markup and the live DOM legitimately
      // disagree here. That is expected, not a bug to be reconciled.
      suppressHydrationWarning
    >
      <head>
        <BootScript />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-primary/30">
        {children}
      </body>
    </html>
  );
}
