import Image from "next/image";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20 pb-16">
      {/* Background image & deep dark gradient overlay */}
      <div className="absolute inset-0 -z-20">
        <Image
          src="/images/backgrounds/1st.jpg"
          alt=""
          fill
          className="object-cover object-center"
          priority
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#07090E]/95 via-[#07090E]/80 to-[#07090E]/60" />

      {/* Ambient background glows */}
      <div className="absolute left-1/2 top-1/4 -translate-x-1/2 -z-10 w-[600px] h-[600px] rounded-full bg-[#36BFAE]/15 blur-[120px] pointer-events-none" />
      <div className="absolute right-10 top-1/3 -z-10 w-[400px] h-[400px] rounded-full bg-[#BA87FF]/20 blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Compelling value proposition (Spans 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#36BFAE] animate-pulse" />
              <span className="text-xs font-medium text-slate-300">Next-Gen Property Operations</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.15]">
              Scale your rental business without the <span className="text-gradient-teal">operational chaos</span>.
            </h1>

            <p className="text-slate-300 text-lg max-w-xl leading-relaxed">
              Manage properties, automated bookings, and unified revenue streams from a single, high-performance platform built for modern operators.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button variant="primary" className="gap-2 px-6 py-3 text-base">
                Get started free <ArrowRight size={18} />
              </Button>
              <Button variant="glass" className="px-6 py-3 text-base">
                Explore platform
              </Button>
            </div>
          </div>

          {/* Right Column: Floating app preview card / graphic (Spans 5 cols) */}
          <div className="lg:col-span-5 relative flex justify-center">
            <GlassCard className="p-4 md:p-6 w-full max-w-md border-white/15 shadow-2xl relative z-10" hover={false}>
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                <Image
                  src="/images/elements/Screenshot From 2026-09-13 02-21-23.png"
                  alt="LodgeTrack Dashboard Preview"
                  width={500}
                  height={400}
                  className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400 px-2">
                <span>Live Dashboard Active</span>
                <span className="text-brand-teal font-medium">Synced with Postgres</span>
              </div>
            </GlassCard>
          </div>

        </div>
      </div>
    </section>
  );
}