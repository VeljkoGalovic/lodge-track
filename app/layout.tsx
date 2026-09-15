import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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
    <html lang="en" className={`${inter.variable} dark scroll-smooth`}>
      <body className="min-h-screen bg-[#07090E] text-white font-sans antialiased selection:bg-[#36BFAE]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
