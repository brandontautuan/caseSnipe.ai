"use client";

import { MODEL_MAP } from "@/lib/agents/modelList";

interface StatPillProps {
  label: string;
  value: string;
  barPct?: number;   // 0–100 for the quality bar
  color: string;
}

function StatPill({ label, value, barPct, color }: StatPillProps) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] text-slate-600 uppercase tracking-wider shrink-0">{label}</span>
        <span className={`text-[10px] font-mono font-semibold ${color}`}>{value}</span>
      </div>
      {barPct !== undefined && (
        <div className="h-0.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              barPct >= 80 ? "bg-green-500" :
              barPct >= 65 ? "bg-yellow-500" : "bg-slate-500"
            }`}
            style={{ width: `${barPct}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface BenchmarkBarProps {
  modelId: string;
  accentColor: "red" | "blue" | "yellow";
}

export default function BenchmarkBar({ modelId, accentColor }: BenchmarkBarProps) {
  const model = MODEL_MAP[modelId];
  if (!model) return null;

  const { bench, provider } = model;

  const textColor =
    accentColor === "red"    ? "text-red-400" :
    accentColor === "blue"   ? "text-blue-400" : "text-yellow-400";

  const borderColor =
    accentColor === "red"    ? "border-red-500/15" :
    accentColor === "blue"   ? "border-blue-500/15" : "border-yellow-500/15";

  return (
    <div className={`px-3 py-1.5 border-b ${borderColor} bg-[#0a0a0f]`}>
      {/* Provider tag */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[9px] font-mono uppercase tracking-widest ${textColor} opacity-60`}>
          {provider} · via Nebius
        </span>
        <span className="text-[9px] text-slate-700">Artificial Analysis</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        <StatPill
          label="Quality"
          value={`${bench.quality}`}
          barPct={bench.quality}
          color={bench.quality >= 80 ? "text-green-400" : bench.quality >= 65 ? "text-yellow-400" : "text-slate-400"}
        />
        <StatPill
          label="Speed"
          value={`${bench.speed} t/s`}
          color="text-slate-300"
        />
        <StatPill
          label="Context"
          value={`${bench.contextK}K`}
          color="text-slate-300"
        />
        <StatPill
          label="Cost/1M"
          value={`$${bench.costPer1M.toFixed(2)}`}
          color="text-slate-300"
        />
      </div>
    </div>
  );
}
