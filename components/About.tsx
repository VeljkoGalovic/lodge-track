import Image from "next/image";
import { GlassCard } from "@/components/ui/GlassCard";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";

export function About({ locale = "en" }: { locale?: Locale }) {
  const t = getDictionary(locale).marketing.about;
  return (
    <section id="about" className="relative isolate py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 -z-20">
        <Image
          src="/images/backgrounds/4th.jpg"
          alt=""
          fill
          className="object-cover object-center"
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#07090E]/80 via-[#07090E]/75 to-[#07090E]" />

      <div className="container mx-auto px-6 md:px-10 max-w-4xl">
        <div className="text-center mb-8">
          <span className="inline-flex px-5 py-2 rounded-full border border-[#36BFAE]/40 bg-[#36BFAE]/10 text-sm font-semibold text-[#36BFAE]">
            {t.badge}
          </span>
        </div>

        <GlassCard
          className="p-8 md:p-12 border-[#36BFAE]/20 shadow-[0_0_50px_rgba(54,191,174,0.08)]"
          hover={false}
        >
          <div className="space-y-5 text-center">
            <p className="text-xl md:text-2xl leading-relaxed text-slate-200 font-medium">
              {t.body1}
            </p>
            <p className="text-base md:text-lg leading-relaxed text-slate-400">
              {t.body2}
            </p>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
