import Image from "next/image";
import { TrendingUp, Calendar, Users } from "lucide-react";

const stats = [
  { label: "Occupancy", value: "87%", trend: "+4.2%", color: "#36BFAE" },
  { label: "Revenue (MTD)", value: "$24.8k", trend: "+12.1%", color: "#BA87FF" },
];

const bookings = [
  { guest: "Marina Kovač", unit: "Seaside Loft", nights: "3 nights", status: "Confirmed" },
  { guest: "Tom Lindqvist", unit: "Alpine Cabin", nights: "5 nights", status: "Pending" },
  { guest: "Ana Rossi", unit: "City Studio", nights: "2 nights", status: "Confirmed" },
];

export function DashboardMockup() {
  return (
    <div className="relative">
      {/* Ambient glow behind the mockup */}
      <div className="absolute -inset-6 bg-gradient-to-tr from-[#36BFAE]/15 to-[#BA87FF]/15 blur-3xl -z-10 rounded-full" />

      <div className="bg-[#0C0F16]/90 border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
          <span className="ml-3 text-xs text-slate-500 font-medium">
            LodgeTrack — Dashboard
          </span>
        </div>

        <div className="p-8 space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4"
              >
                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">
                  {stat.label}
                </p>
                <p
                  className="text-2xl font-bold leading-none mb-1.5"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </p>
                <p className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <TrendingUp size={11} /> {stat.trend}
                </p>
              </div>
            ))}
          </div>

          {/* Revenue breakdown with glass pie chart */}
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 flex items-center gap-4">
            <Image
              src="/images/elements/glass-pie-chart.png"
              alt="Revenue distribution chart"
              width={72}
              height={72}
              className="h-16 w-16 object-contain shrink-0"
            />
            <div className="flex-1 space-y-2">
              <p className="text-xs font-semibold text-slate-300">
                Revenue by property
              </p>
              {[
                { name: "Seaside Loft", pct: 46, color: "#36BFAE" },
                { name: "Alpine Cabin", pct: 33, color: "#BA87FF" },
                { name: "City Studio", pct: 21, color: "#64748b" },
              ].map((row) => (
                <div key={row.name} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 w-24 shrink-0">
                    {row.name}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${row.pct}%`, backgroundColor: row.color }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 w-8 text-right">
                    {row.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming bookings */}
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={13} className="text-[#36BFAE]" />
              <p className="text-xs font-semibold text-slate-300">
                Upcoming bookings
              </p>
            </div>
            <div className="space-y-2.5">
              {bookings.map((b) => (
                <div key={b.guest} className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#36BFAE]/30 to-[#BA87FF]/30 border border-white/10 flex items-center justify-center shrink-0">
                    <Users size={11} className="text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-slate-200 truncate">
                      {b.guest}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {b.unit} · {b.nights}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                      b.status === "Confirmed"
                        ? "text-[#36BFAE] border-[#36BFAE]/30 bg-[#36BFAE]/10"
                        : "text-amber-400 border-amber-400/30 bg-amber-400/10"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
