import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";
import { clsx } from "clsx";
import { CtaBanner } from "@/components/CtaBanner";

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
}

const TIERS: PricingTier[] = [
  {
    name: "Starter",
    price: "$19",
    period: "/month",
    description: "Ideal for individual hosts managing 1–3 properties.",
    features: [
      "Up to 3 properties",
      "1 GB receipt storage",
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
      "5 GB receipt storage",
      "Detailed financial analytics",
      "Multi-tenant tracking",
      "Data import & export",
      "Priority support",
    ],
    cta: "Get started",
    featured: true,
  },
  {
    name: "Business",
    price: "$99",
    period: "",
    description: "Custom solutions for large rental portfolios and teams.",
    features: [
      "Unlimited properties",
      "Unlimited receipt storage",
      "Dedicated account manager",
      "Custom integrations & API",
      "SSO and role-based access",
      "99.9% uptime SLA",
    ],
    cta: "Contact sales",
    featured: false,
  },
];

function PricingCard({ tier }: { tier: PricingTier }) {
  return (
    <div
      className={clsx(
        "relative flex flex-col rounded-3xl border backdrop-blur-xl p-8 transition-all duration-300 text-left",
        tier.featured
          ? "bg-white/[0.08] border-[#BA87FF]/50 shadow-[0_0_60px_rgba(186,135,255,0.2)] md:-my-4 md:py-12"
          : "bg-white/[0.04] border-white/10 hover:bg-white/[0.07] hover:border-white/20"
      )}
    >
      {tier.featured && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#BA87FF] text-[#07090E] shadow-lg">
          Most popular
        </span>
      )}

      <h3 className="text-2xl font-bold text-[#BA87FF] mb-3">{tier.name}</h3>

      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-4xl font-extrabold text-white">{tier.price}</span>
        <span className="text-sm text-slate-400">{tier.period}</span>
      </div>

      <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-8 min-h-[48px]">
        {tier.description}
      </p>

      <ul className="space-y-4 mb-8 flex-1">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <div className="p-0.5 rounded-full bg-[#36BFAE]/10 text-[#36BFAE] mt-0.5 shrink-0">
              <Check size={16} />
            </div>
            <span className="text-sm text-slate-300">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        variant={tier.featured ? "primary" : "glass"}
        className="w-full text-base py-3"
      >
        {tier.cta}
      </Button>
    </div>
  );
}

export function Pricing() {
  return (
    <section 
      id="pricing" 
      className="relative py-28 md:py-40 overflow-hidden bg-[#07090E] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/backgrounds/3rd.jpg')" }}
    >
      {/* Dark overlay to ensure your text stays readable over the background image */}
      <div className="absolute inset-0 bg-[#07090E]/85 backdrop-blur-[2px] -z-10" />

      <div className="relative z-10 flex flex-col justify-center">
        <CtaBanner />

        <div className="container mx-auto px-6 md:px-10 text-center">
          <div className="max-w-4xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#36BFAE]">
              Flexible Pricing
            </span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Choose the tier which <span className="text-gradient-teal">best suits you</span>
            </h2>
            <p className="text-slate-300 text-base md:text-lg">
              Transparent plans designed to scale alongside your property portfolio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {TIERS.map((tier) => (
              <PricingCard key={tier.name} tier={tier} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}