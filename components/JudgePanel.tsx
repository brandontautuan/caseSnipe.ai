"use client";

import AgentPanel from "./AgentPanel";
import type { AgentStatus, Message } from "./AgentPanel";

export interface TrialEvent {
  id:          string;
  type:        "motion_filed" | "evidence_admitted" | "objection" | "ruling" | "turn_change";
  description: string;
  side?:       "prosecution" | "defense";
  timestamp:   string;
}

interface JudgePanelProps {
  status?:    AgentStatus;
  model?:     string;
  messages?:  Message[];
  events?:    TrialEvent[];
  round?:     number;
  maxRounds?: number;
  verdict?:   string;
}

const EVENT_ICONS: Record<TrialEvent["type"], string> = {
  motion_filed:      "📋",
  evidence_admitted: "🗂",
  objection:         "✋",
  ruling:            "⚖",
  turn_change:       "🔄",
};

const EVENT_COLORS: Record<TrialEvent["type"], string> = {
  motion_filed:      "text-orange-300/80",
  evidence_admitted: "text-slate-300/80",
  objection:         "text-red-300/80",
  ruling:            "text-[#f5c518]/90",
  turn_change:       "text-slate-500",
};

export default function JudgePanel({
  status    = "idle",
  model     = "—",
  messages  = [],
  events    = [],
  round     = 1,
  maxRounds = 3,
  verdict   = "",
}: JudgePanelProps) {
  return (
    <div className="flex flex-col h-full gap-2">

      {/* ── Verdict banner ── */}
      {verdict && (
        <div
          className="aa-verdict-slam shrink-0 px-3 py-2.5 rounded-lg"
          style={{
            background: "linear-gradient(135deg, #0d1f0d 0%, #0a1a0a 100%)",
            border: "1px solid rgba(74,222,128,0.3)",
            boxShadow: "0 0 20px rgba(74,222,128,0.08), inset 0 0 20px rgba(74,222,128,0.03)",
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-green-400 aa-gavel inline-block">⚖</span>
            <span className="text-[9px] font-bold tracking-[0.25em] text-green-400/60">VERDICT DELIVERED</span>
          </div>
          <p className="text-[11px] text-green-200/85 leading-relaxed line-clamp-4">
            {verdict.slice(0, 300)}{verdict.length > 300 ? "…" : ""}
          </p>
        </div>
      )}

      {/* ── Judge agent panel ── */}
      <div className="flex-1 min-h-0">
        <AgentPanel
          role="judge"
          status={status}
          model={model}
          messages={messages}
          showBenchmark={false}
        />
      </div>

      {/* ── Court Record / Trial Log ── */}
      <div
        className="h-[36%] flex flex-col rounded-lg overflow-hidden"
        style={{
          background: "#0f0f1e",
          border: "1px solid rgba(201,162,39,0.2)",
          boxShadow: "0 0 0 1px rgba(201,162,39,0.05)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-[#c9a227]/15 shrink-0"
          style={{ background: "rgba(201,162,39,0.05)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[#c9a227]/50 text-xs">📜</span>
            <span className="text-[9px] font-bold tracking-[0.2em] text-[#c9a227]/60">COURT RECORD</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-600 tracking-wider">ROUND</span>
            <span className="text-[9px] text-slate-300 font-bold">{round}/{maxRounds}</span>
          </div>
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[10px] text-slate-700 italic tracking-wider">No events recorded</p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="flex items-start gap-2">
                <span className="text-xs mt-0.5 shrink-0">{EVENT_ICONS[event.type]}</span>
                <div className="flex-1 min-w-0">
                  <span className={`text-[10px] leading-relaxed ${EVENT_COLORS[event.type]}`}>
                    {event.description}
                  </span>
                  {event.side && (
                    <span className={`ml-1.5 text-[9px] font-bold tracking-wider ${
                      event.side === "prosecution" ? "text-[#c0392b]/50" : "text-[#1a6fa8]/60"
                    }`}>
                      [{event.side.toUpperCase()}]
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-slate-700 shrink-0 mt-0.5">{event.timestamp}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
