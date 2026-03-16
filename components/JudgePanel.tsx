"use client";

import { useState } from "react";
import AgentPanel from "./AgentPanel";
import type { AgentStatus, Message } from "./AgentPanel";
import type { EvidenceItem } from "@/lib/cases";

export interface TrialEvent {
  id:          string;
  type:        "motion_filed" | "evidence_admitted" | "objection" | "ruling" | "turn_change" | "judge_direction";
  description: string;
  side?:       "prosecution" | "defense";
  timestamp:   string;
}

interface JudgePanelProps {
  status?:       AgentStatus;
  model?:        string;
  messages?:     Message[];
  events?:       TrialEvent[];
  caseEvidence?: EvidenceItem[];
  round?:        number;
  maxRounds?:    number;
  verdict?:      string;
  currentAngle?: string;
}

const EVENT_ICONS: Record<TrialEvent["type"], string> = {
  motion_filed:      "📋",
  evidence_admitted: "🗂",
  objection:         "✋",
  ruling:            "⚖",
  turn_change:       "🔄",
  judge_direction:   "⚖",
};

const EVENT_COLORS: Record<TrialEvent["type"], string> = {
  motion_filed:      "text-orange-300/80",
  evidence_admitted: "text-slate-300/80",
  objection:         "text-red-300/80",
  ruling:            "text-[#f5c518]/90",
  turn_change:       "text-slate-500",
  judge_direction:   "text-[#f5c518]/80",
};

type TabId = "all" | "evidence" | "motions" | "objections";

const TABS: { id: TabId; label: string }[] = [
  { id: "all",        label: "ALL" },
  { id: "evidence",   label: "EVIDENCE" },
  { id: "motions",    label: "MOTIONS" },
  { id: "objections", label: "OBJECTIONS" },
];

const TAB_FILTER: Record<TabId, TrialEvent["type"][]> = {
  all:        ["motion_filed", "evidence_admitted", "objection", "ruling", "turn_change", "judge_direction"],
  evidence:   ["evidence_admitted"],
  motions:    ["motion_filed", "ruling"],
  objections: ["objection"],
};

const FAVORS_LABEL: Record<EvidenceItem["favorsSide"], string> = {
  prosecution: "PROS",
  defense:     "DEF",
  neutral:     "NEUTRAL",
};
const FAVORS_COLOR: Record<EvidenceItem["favorsSide"], string> = {
  prosecution: "text-[#c0392b]/70 border-[#c0392b]/30",
  defense:     "text-[#1a6fa8]/80 border-[#1a6fa8]/30",
  neutral:     "text-slate-500 border-slate-700/40",
};

export default function JudgePanel({
  status       = "idle",
  model        = "—",
  messages     = [],
  events       = [],
  caseEvidence = [],
  round        = 1,
  maxRounds    = 3,
  verdict      = "",
  currentAngle = "",
}: JudgePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const filteredEvents = events.filter((e) => TAB_FILTER[activeTab].includes(e.type));

  // Which evidence items have been admitted (mentioned in trial events)
  const admittedNames = new Set(
    events
      .filter((e) => e.type === "evidence_admitted")
      .map((e) => e.description.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-2">

      {/* ── Current angle banner ── */}
      {currentAngle && !verdict && (
        <div className="shrink-0 px-3 py-1.5 rounded border border-[#c9a227]/25 bg-[#c9a227]/5">
          <span className="text-[9px] font-bold tracking-wider text-[#c9a227]/70">CURRENT ANGLE</span>
          <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">{currentAngle}</p>
        </div>
      )}

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
          className="shrink-0 border-b border-[#c9a227]/15"
          style={{ background: "rgba(201,162,39,0.05)" }}
        >
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-[#c9a227]/50 text-xs">📜</span>
              <span className="text-[9px] font-bold tracking-[0.2em] text-[#c9a227]/60">COURT RECORD</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-slate-600 tracking-wider">ROUND</span>
              <span className="text-[9px] text-slate-300 font-bold">{round}/{maxRounds}</span>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-0 border-t border-[#c9a227]/10">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-[8px] font-bold tracking-[0.15em] transition-colors ${
                  activeTab === tab.id
                    ? "text-[#c9a227] border-b border-[#c9a227]"
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                {tab.label}
                {tab.id === "evidence" && (
                  <span className="ml-1 opacity-60">({caseEvidence.length})</span>
                )}
                {(tab.id === "motions" || tab.id === "objections") && (
                  <span className="ml-1 opacity-60">
                    ({events.filter((e) => TAB_FILTER[tab.id].includes(e.type)).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">

          {/* ── EVIDENCE tab: show full case evidence list ── */}
          {activeTab === "evidence" ? (
            caseEvidence.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-[10px] text-slate-700 italic tracking-wider">No case loaded</p>
              </div>
            ) : (
              caseEvidence.map((item) => {
                const isAdmitted = admittedNames.has(item.name.toLowerCase()) ||
                  Array.from(admittedNames).some((d) => d.includes(item.name.toLowerCase()));
                return (
                  <div
                    key={item.id}
                    className={`rounded px-2.5 py-2 border transition-colors ${
                      isAdmitted
                        ? "border-slate-500/40 bg-slate-800/30"
                        : "border-slate-700/20 bg-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px]">🗂</span>
                      <span className={`text-[10px] font-semibold ${isAdmitted ? "text-slate-200" : "text-slate-400"}`}>
                        {item.name}
                      </span>
                      {isAdmitted && (
                        <span className="text-[8px] font-bold text-green-400/70 tracking-wider ml-auto">✓ ADMITTED</span>
                      )}
                    </div>
                    <p className="text-[9.5px] text-slate-500 leading-relaxed pl-5">{item.description}</p>
                    <div className="pl-5 mt-1">
                      <span className={`text-[8px] font-bold tracking-wider border rounded px-1 py-0.5 ${FAVORS_COLOR[item.favorsSide]}`}>
                        FAVORS {FAVORS_LABEL[item.favorsSide]}
                      </span>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* ── All other tabs: event list ── */
            filteredEvents.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-[10px] text-slate-700 italic tracking-wider">
                  {events.length === 0 ? "No events recorded" : "No entries in this category"}
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => {
                const isEvidence = event.type === "evidence_admitted";
                const evidenceHighlight =
                  isEvidence && event.side === "prosecution"
                    ? "border-l-2 border-l-[#c0392b]/60 bg-[#1a0a09]/20 pl-2 -ml-1 rounded"
                    : isEvidence && event.side === "defense"
                    ? "border-l-2 border-l-[#1a6fa8]/60 bg-[#09101a]/20 pl-2 -ml-1 rounded"
                    : isEvidence
                    ? "border-l-2 border-l-slate-500/40 bg-slate-800/15 pl-2 -ml-1 rounded"
                    : "";
                return (
                  <div key={event.id} className={`flex items-start gap-2 ${evidenceHighlight}`}>
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
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
}
