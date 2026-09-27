import Image from "next/image";
import { GlassCard } from "@/components/ui/GlassCard";
import { CheckCircle } from "lucide-react";
import { Calendar, DollarSign } from "lucide-react";
const features = [
  "Track bookings with an automated calendar",
  "Take control of your finances with detailed analytics",
  "Multi-tenant tracking supported",
  "Seamlessly import your existing data",
];

export function Features() {
  return (
    <section id="features" className="relative isolate min-h-screen flex items-center py-28 lg:py-36 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-20">
        <Image
          src="/images/backgrounds/2nd.jpg"
          alt=""
          fill
          className="object-cover object-center"
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#07090E] via-[#07090E]/80 to-[#07090E]" />

      <div className="container mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left: Expanded feature list card (Spans 7 cols) */}
          <GlassCard className="lg:col-span-7 p-8 md:p-12 shadow-2xl space-y-8" hover={false}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md w-fit">
              <span className="w-2 h-2 rounded-full bg-[#36BFAE]" />
              <span className="text-xs font-medium text-slate-300">Core Platform Features</span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-[1.15]">
              Manage properties, bookings, and revenue in <span className="text-gradient-teal">one unified platform</span>
            </h2>

            <ul className="space-y-5 pt-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-4">
                  <div className="mt-1 p-1 rounded-full bg-[#BA87FF]/10 text-[#BA87FF] shrink-0 border border-[#BA87FF]/20">
                    <CheckCircle size={18} />
                  </div>
                  <span className="text-slate-200 text-base md:text-lg leading-relaxed">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </GlassCard>

          {/* Right: Dashboard mockup container (Spans 5 cols) */}

          <div className="lg:col-span-5 flex flex-col justify-between gap-4 sm:gap-6">
            <GlassCard className="p-6 md:p-10 border-white/15 space-y-3 sm:space-y-4 flex flex-col justify-center" hover={false}>
              <div className="w-12 h-12 rounded-xl bg-[#36BFAE]/10 border border-[#36BFAE]/30 flex items-center justify-center text-[#36BFAE]">
                <Calendar size={24} />
              </div>
              <h3 className="text-white font-semibold text-lg md:text-xl">Smart Booking Sync</h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Automatically sync calendar schedules across multiple channels with zero double-booking friction.
              </p>
            </GlassCard>

            <GlassCard className="p-6 md:p-14 border-white/15 space-y-3 sm:space-y-4 flex flex-col justify-center" hover={false}>
              <div className="w-12 h-12 rounded-xl bg-[#BA87FF]/10 border border-[#BA87FF]/30 flex items-center justify-center text-[#BA87FF]">
                <DollarSign size={24} />
              </div>
              <h3 className="text-white font-semibold text-lg md:text-xl">Unified Revenue Stream</h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Track payouts, occupancy rates, and operational expenses in real-time with granular precision.
              </p>
            </GlassCard>
          </div>
          

        </div>
      </div>
    </section>
  );
}