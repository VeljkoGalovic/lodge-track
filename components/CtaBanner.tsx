import Image from "next/image";
import { Button } from "@/components/ui/Button";

export function CtaBanner() {
  return (
    <section className="relative py-16 md:py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-20">
        <Image
          src="/images/backgrounds/3rd.jpg"
          alt=""
          fill
          className="object-cover object-center"
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-[#07090E]/70" />

      <div className="container mx-auto px-6 md:px-10">
        <div className="flex items-center justify-center gap-4 md:gap-16">
          {/* Left glass star */}
          <Image
            src="/images/elements/glass-star.png"
            alt=""
            width={160}
            height={160}
            className="h-20 w-20 md:h-36 md:w-36 object-contain shrink-0 drop-shadow-[0_0_30px_rgba(54,191,174,0.4)]"
          />

          {/* Center CTA */}
          <div className="text-center">
            <Button
              variant="glass"
              className="text-xl md:text-3xl font-bold text-[#BA87FF] px-8 md:px-14 py-4 md:py-6 shadow-[0_0_40px_rgba(186,135,255,0.25)] hover:shadow-[0_0_60px_rgba(186,135,255,0.4)]"
            >
              Sign up now!
            </Button>
            <p className="mt-4 text-xs md:text-sm text-slate-400">
              No credit card required · Free 14-day trial
            </p>
          </div>

          {/* Right glass prism */}
          <Image
            src="/images/elements/glass-pie-chart.png"
            alt=""
            width={160}
            height={160}
            className="h-20 w-20 md:h-36 md:w-36 object-contain shrink-0 drop-shadow-[0_0_30px_rgba(186,135,255,0.4)]"
          />
        </div>
      </div>
    </section>
  );
}
