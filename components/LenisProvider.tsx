"use client";

import { useEffect } from "react";

export function LenisProvider() {
  useEffect(() => {
    // Only initialize on client side
    const initLenis = async () => {
      if (typeof window === "undefined") return;

      // Check if we're on the landing page (has the dark class on the root element)
      const isLandingPage = document.documentElement.classList.contains("dark");

      if (!isLandingPage) return;

      // Dynamic import to avoid SSR issues
      const { default: Lenis } = await import("lenis");

      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 1,
        syncTouch: false,
        touchMultiplier: 2,
        infinite: false,
      });

      function raf(time: number) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }

      requestAnimationFrame(raf);

      // Cleanup on unmount
      return () => {
        lenis.destroy();
      };
    };

    initLenis();
  }, []);

  return null;
}