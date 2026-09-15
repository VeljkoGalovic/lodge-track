import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";
import { clsx } from "clsx";

const tiers = [
  {
    name: "Starter",
    price: "$19",
    period: "/month",
    description: "Ideal for individual hosts managing 1–3 properties.",
    features: [
      "Up to 3 properties",
      "Automated booking calendar",
      "Basic revenue reports",
      "Email support",
    ],
    cta: "Start free trial",
    featured: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "For growing managers who need deeper insight and automation.",
    features: [
      "Up to 15 properties",
      "Detailed financial analytics",
      "Multi-tenant tracking",
      "Data import & export",
      "Priority support",
    ],
    cta: "Get started",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Custom solutions for large rental portfolios and teams.",
    features: [
      "Unlimited properties",
      "Dedicated account manager",
      "Custom integrations & API",
      "SSO and role-based access",
      "99.9% uptime SLA",
    ],
    cta: "Contact sales",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24 md:py-32 overflow-hidden bg-[#07090E]">
      {/* Subtle background texture */}
      <div className="absolute inset-0 -z-20 opacity-40">
        <Image
          src="/images/backgrounds/3rd.jpg"
          alt=""
          fill
          className="object-cover object-center"
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#07090E] via-[#07090E]/85 to-[#07090E]" />

      <div className="container mx-auto px-6 md:px-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-[#36BFAE] mb-14">
          Choose the tier which best suits you
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={clsx(
                "relative flex flex-col rounded-2xl border backdrop-blur-xl p-7 transition-all duration-300",
                tier.featured
                  ? "bg-white/[0.07] border-[#BA87FF]/40 shadow-[0_0_50px_rgba(186,135,255,0.18)] md:-my-4 md:py-11"
                  : "bg-white/[0.04] border-white/10 hover:bg-white/[0.07] hover:border-white/20"
              )}
            >
              {tier.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#BA87FF] text-[#07090E]">
                  Most popular
                </span>
              )}

              <h3 className="text-xl font-bold text-[#BA87FF] mb-2">{tier.name}</h3>

              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl font-bold text-white">{tier.price}</span>
                <span className="text-sm text-slate-500">{tier.period}</span>
              </div>

              <p className="text-sm text-[#36BFAE] leading-relaxed mb-6">
                {tier.description}
              </p>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check size={15} className="text-[#36BFAE] mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-400">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={tier.featured ? "primary" : "glass"}
                className="w-full text-sm"
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
