import Image from "next/image";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Calendar, DollarSign } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-16">
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
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#07090E]/95 via-[#07090E]/85 to-[#07090E]/70" />

      {/* Ambient background glows */}
      <div className="absolute left-1/3 top-1/4 -translate-x-1/2 -z-10 w-[600px] h-[600px] rounded-full bg-[#36BFAE]/15 blur-[120px] pointer-events-none" />
      <div className="absolute right-10 top-1/3 -z-10 w-[450px] h-[450px] rounded-full bg-[#BA87FF]/20 blur-[110px] pointer-events-none" />

      <div className="container mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center justify-center">
          
          {/* Left Column: Larger text block wrapped in a prominent Glass Card */}
          <GlassCard className="lg:col-span-7 p-8 md:p-12 border-white/15 shadow-2xl space-y-6 flex flex-col justify-center" hover={false}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md w-fit">
              <span className="w-2 h-2 rounded-full bg-[#36BFAE] animate-pulse" />
              <span className="text-xs font-medium text-slate-300">Next-Gen Property Operations</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
              Scale your rental business without the <span className="text-gradient-teal">operational chaos</span>
            </h1>

            <p className="text-slate-300 text-lg md:text-xl max-w-2xl leading-relaxed">
              Manage properties, automated bookings, and unified revenue streams from a single, high-performance platform built for modern operators.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Button variant="primary" className="gap-2 px-7 py-4 text-base">
                Get started for free <ArrowRight size={18} />
              </Button>
              <Button variant="glass" className="px-7 py-4 text-base">
                Explore the platform
              </Button>
            </div>
          </GlassCard>

          {/* Right Column: Two taller feature preview cards matching left height */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            <GlassCard className="p-6 md:p-14 border-white/15 space-y-4 flex flex-col justify-center" hover={false}>
              <div className="w-12 h-12 rounded-xl bg-[#36BFAE]/10 border border-[#36BFAE]/30 flex items-center justify-center text-[#36BFAE]">
                <Calendar size={24} />
              </div>
              <h3 className="text-white font-semibold text-lg md:text-xl">Smart Booking Sync</h3>
              <p className="text-slate-300 text-base leading-relaxed">
                Automatically sync calendar schedules across multiple channels with zero double-booking friction.
              </p>
            </GlassCard>

            <GlassCard className="p-6 md:p-14 border-white/15 space-y-4 flex flex-col justify-center" hover={false}>
              <div className="w-12 h-12 rounded-xl bg-[#BA87FF]/10 border border-[#BA87FF]/30 flex items-center justify-center text-[#BA87FF]">
                <DollarSign size={24} />
              </div>
              <h3 className="text-white font-semibold text-lg md:text-xl">Unified Revenue Stream</h3>
              <p className="text-slate-300 text-base leading-relaxed">
                Track payouts, occupancy rates, and operational expenses in real-time with granular precision.
              </p>
            </GlassCard>
          </div>

        </div>
      </div>
    </section>
  );
}