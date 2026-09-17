import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { About } from "@/components/About";
import { Footer } from "@/components/Footer";

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
 */
export default function Home() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <About />
      </main>
      <Footer />
    </div>
  );
}
