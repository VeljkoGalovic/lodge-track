import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export function CtaBanner() {
  return (
    <div className="container mx-auto px-6 md:px-10 mb-16 md:mb-24">
      <div className="relative rounded-3xl border border-white/15 bg-white/[0.04] backdrop-blur-2xl p-8 md:p-14 overflow-hidden shadow-2xl">
        
        {/* Ambient background glows */}
        <div className="absolute -left-20 -top-20 w-60 h-60 rounded-full bg-[#36BFAE]/20 blur-[90px] pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 w-60 h-60 rounded-full bg-[#BA87FF]/20 blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
          
          <div className="space-y-3 max-w-xl">
            <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Ready to streamline your <span className="text-gradient-teal">rental workflow</span>?
            </h3>
            <p className="text-slate-300 text-base md:text-lg">
              Join modern operators scaling their portfolios efficiently. No credit card required to start your 14-day trial.
            </p>
          </div>

          <div className="shrink-0">
            <Button
              variant="primary"
              className="gap-2 px-8 py-4 text-base shadow-[0_0_30px_rgba(54,191,174,0.3)] hover:shadow-[0_0_40px_rgba(54,191,174,0.5)]"
            >
              Start free trial <ArrowRight size={18} />
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}