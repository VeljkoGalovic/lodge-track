import Image from "next/image";
import { GlassCard } from "@/components/ui/GlassCard";
import { CheckCircle } from "lucide-react";
import { DashboardMockup } from "@/components/DashboardMockup";

const features = [
  "Track bookings with an automated calendar",
  "Take control of your finances with detailed analytics",
  "Multi-tenant tracking supported",
  "Seamlessly import your existing data",
];

export function Features() {
  return (
    <section id="features" className="relative py-24 md:py-32 overflow-hidden">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Left: feature list card */}
          <GlassCard className="p-8 md:p-10" hover={false}>
            <h2 className="text-2xl md:text-3xl font-bold text-[#36BFAE] leading-tight mb-8">
              Manage properties, bookings, and revenue in one unified platform
            </h2>
            <ul className="space-y-4">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <CheckCircle
                    size={18}
                    className="text-[#BA87FF] mt-0.5 shrink-0"
                  />
                  <span className="text-slate-300 text-sm leading-relaxed">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </GlassCard>

          {/* Right: dashboard mockup */}
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
