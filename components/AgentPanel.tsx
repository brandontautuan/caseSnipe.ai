"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import BenchmarkBar from "./BenchmarkBar";
import * as TypingQueue from "@/lib/typingQueue";

// ── Typewriter effect (serialized global queue) ──────────────────
// Only ONE message across all panels types at a time.
function TypewriterText({ id, text, speed }: { id: string; text: string; speed: number }) {
  const activeId = useSyncExternalStore(TypingQueue.subscribe, TypingQueue.getActiveId);
  const [displayed, setDisplayed] = useState("");
  const enqueuedRef = useRef(false);

  // Register with the queue once on mount
  useEffect(() => {
    if (enqueuedRef.current) return;
    enqueuedRef.current = true;
    if (speed === 0) {
      setDisplayed(text);
      TypingQueue.complete(id);
    } else {
      TypingQueue.enqueue(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show full text once marked done
  const done = TypingQueue.isDone(id);
  useEffect(() => {
    if (done) setDisplayed(text);
  }, [done, text]);

  // Animate when this message is at the front of the queue
  useEffect(() => {
    if (speed === 0 || activeId !== id) return;
    let idx = displayed.length;
    const interval = setInterval(() => {
      idx += 1;
      setDisplayed(text.slice(0, idx));
      if (idx >= text.length) {
        clearInterval(interval);
        TypingQueue.complete(id);
      }
    }, speed);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, id, speed]);

  // Waiting — show cursor placeholder until turn arrives
  if (!done && activeId !== id && displayed.length === 0) {
    return <span className="opacity-30">▌</span>;
  }

  return (
    <>
      {displayed}
      {activeId === id && <span className="animate-pulse ml-px">▌</span>}
    </>
  );
}

export type AgentRole   = "prosecution" | "defense" | "judge";
export type AgentStatus = "idle" | "thinking" | "speaking" | "resting" | "done";

export interface ToolCall {
  id:        string;
  tool:      string;
  input:     string;
  output?:   string;
  timestamp: string;
}

export interface Message {
  id:        string;
  type:      "argument" | "tool_call" | "motion" | "evidence" | "system";
  content:   string;
  toolCall?: ToolCall;
  timestamp: string;
}

// ── Per-role visual config ──────────────────────────────────────
const ROLE_CONFIG = {
  prosecution: {
    label:        "PROSECUTION",
    nameplateColor: "text-[#ff6b5b]",
    nameplateBorder:"border-[#c0392b]",
    headerBg:     "bg-[#1a0a09]",
    headerBorder: "border-[#c0392b]/30",
    panelClass:   "panel-prosecution border-[#c0392b]/30",
    textboxClass: "aa-textbox aa-textbox-prosecution",
    badgeThinking:"bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
    badgeSpeaking:"bg-[#c0392b]/20 text-red-300 border border-[#c0392b]/40",
    badgeResting: "bg-slate-800/40 text-slate-500 border border-slate-700/30",
    badgeDone:    "bg-green-500/15 text-green-300 border border-green-500/30",
    badgeIdle:    "bg-slate-800/40 text-slate-600",
    icon:         "⚔",
    toolColor:    "text-red-400/80",
    accentColor:  "red" as const,
  },
  defense: {
    label:        "DEFENSE",
    nameplateColor: "text-[#5baaff]",
    nameplateBorder:"border-[#1a6fa8]",
    headerBg:     "bg-[#09101a]",
    headerBorder: "border-[#1a6fa8]/30",
    panelClass:   "panel-defense border-[#1a6fa8]/30",
    textboxClass: "aa-textbox aa-textbox-defense",
    badgeThinking:"bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
    badgeSpeaking:"bg-[#1a6fa8]/20 text-blue-300 border border-[#1a6fa8]/40",
    badgeResting: "bg-slate-800/40 text-slate-500 border border-slate-700/30",
    badgeDone:    "bg-green-500/15 text-green-300 border border-green-500/30",
    badgeIdle:    "bg-slate-800/40 text-slate-600",
    icon:         "🛡",
    toolColor:    "text-blue-400/80",
    accentColor:  "blue" as const,
  },
  judge: {
    label:        "JUDGE",
    nameplateColor: "text-[#f5c518]",
    nameplateBorder:"border-[#c9a227]",
    headerBg:     "bg-[#18140a]",
    headerBorder: "border-[#c9a227]/30",
    panelClass:   "panel-judge border-[#c9a227]/30",
    textboxClass: "aa-textbox aa-textbox-judge",
    badgeThinking:"bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
    badgeSpeaking:"bg-[#c9a227]/20 text-yellow-200 border border-[#c9a227]/40",
    badgeResting: "bg-slate-800/40 text-slate-500 border border-slate-700/30",
    badgeDone:    "bg-green-500/15 text-green-300 border border-green-500/30",
    badgeIdle:    "bg-slate-800/40 text-slate-600",
    icon:         "⚖",
    toolColor:    "text-yellow-400/80",
    accentColor:  "yellow" as const,
  },
} as const;

const STATUS_LABELS: Record<AgentStatus, string> = {
  idle:     "■ IDLE",
  thinking: "◈ THINKING",
  speaking: "▶ ARGUING",
  resting:  "◻ RESTING",
  done:     "✓ DONE",
};

interface AgentPanelProps {
  role:            AgentRole;
  status?:         AgentStatus;
  model?:          string;
  messages?:       Message[];
  motionsCount?:   number;
  evidenceCount?:  number;
  showBenchmark?:  boolean;
  textSpeed?:      number; // ms per character; 0 = instant
}

// ── Tool call display ───────────────────────────────────────────
function ToolCallBubble({ toolCall, role }: { toolCall: ToolCall; role: AgentRole }) {
  const cfg = ROLE_CONFIG[role];
  // Map tool names to AA-flavoured labels
  const toolLabels: Record<string, string> = {
    tavily_search:    "Researching case law",
    request_evidence: "Examining evidence",
    lookup_precedent: "Consulting court records",
    file_motion:      "Filing motion",
    cross_examine:    "Cross-examining",
    rest_case:        "Resting case",
  };
  const label = toolLabels[toolCall.tool] ?? toolCall.tool;

  return (
    <div className="ml-1 my-1.5 pl-3 border-l-2 border-slate-700/60">
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-slate-600">›</span>
        <span className={`font-semibold ${cfg.toolColor}`}>{label}</span>
        {toolCall.input && (
          <span className="text-slate-600 truncate max-w-[130px] italic">"{toolCall.input}"</span>
        )}
      </div>
      {toolCall.output && (
        <div className="mt-0.5 text-[10px] text-slate-600 line-clamp-2 pl-3">
          ↳ {toolCall.output.slice(0, 120)}{toolCall.output.length > 120 ? "…" : ""}
        </div>
      )}
    </div>
  );
}

// ── Single message item ─────────────────────────────────────────
function MessageItem({ msg, role, textSpeed = 0 }: { msg: Message; role: AgentRole; textSpeed?: number }) {
  const cfg = ROLE_CONFIG[role];

  if (msg.type === "tool_call" && msg.toolCall) {
    return <ToolCallBubble toolCall={msg.toolCall} role={role} />;
  }

  if (msg.type === "motion") {
    return (
      <div className="aa-stamp my-2 relative">
        <div className="px-3 py-2 rounded border border-orange-700/30 bg-orange-950/20">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-bold tracking-widest text-orange-400/70">📋 MOTION FILED</span>
          </div>
          <p className="text-[11px] text-orange-200/80 leading-relaxed">{msg.content}</p>
        </div>
        {/* Stamp mark */}
        <span
          className="absolute -top-1 -right-1 text-[10px] font-black text-red-500/50 border border-red-500/30 rounded px-1 rotate-12"
          style={{ fontFamily: "serif" }}
        >
          FILED
        </span>
      </div>
    );
  }

  if (msg.type === "evidence") {
    return (
      <div className="aa-evidence-flip my-2">
        <div className="flex items-start gap-2 px-3 py-2 rounded border border-slate-600/30 bg-slate-800/30">
          <span className="text-base mt-0.5">🗂</span>
          <div>
            <div className="text-[9px] font-bold tracking-widest text-slate-400/60 mb-0.5">EVIDENCE ADMITTED</div>
            <p className="text-[11px] text-slate-200/90 leading-relaxed">{msg.content}</p>
          </div>
        </div>
      </div>
    );
  }

  if (msg.type === "system") {
    return (
      <div className="my-1 text-[10px] text-slate-600 italic text-center">— {msg.content} —</div>
    );
  }

  // ── Argument: AA text-box style ──────────────────────────────
  return (
    <div className={`my-2 rounded ${cfg.textboxClass}`}>
      {/* Nameplate */}
      <div className={`px-3 pt-2 pb-0`}>
        <span className={`aa-nameplate ${cfg.nameplateColor} ${cfg.nameplateBorder}`}>
          {cfg.label}
        </span>
      </div>
      {/* Content */}
      <div className="px-3 py-2">
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--aa-parchment)" }}>
          <TypewriterText id={msg.id} text={msg.content} speed={textSpeed} />
        </p>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────
export default function AgentPanel({
  role,
  status = "idle",
  model = "—",
  messages = [],
  motionsCount = 0,
  evidenceCount = 0,
  showBenchmark = true,
  textSpeed = 15,
}: AgentPanelProps) {
  const cfg = ROLE_CONFIG[role];

  const badgeClass =
    status === "thinking" ? cfg.badgeThinking :
    status === "speaking" ? cfg.badgeSpeaking :
    status === "resting"  ? cfg.badgeResting  :
    status === "done"     ? cfg.badgeDone     :
    cfg.badgeIdle;

  return (
    <div
      className={`flex flex-col h-full bg-[#0e0e1a] border ${cfg.panelClass} rounded-lg overflow-hidden`}
    >
      {/* ── Panel header ── */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${cfg.headerBg} border-b ${cfg.headerBorder}`}>
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.icon}</span>
          <span className={`text-xs font-bold tracking-widest ${cfg.nameplateColor}`}>{cfg.label}</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider ${badgeClass}`}>
          {STATUS_LABELS[status]}
          {status === "thinking" && <span className="cursor-blink ml-0.5">_</span>}
        </span>
      </div>

      {/* ── Model badge ── */}
      <div className={`px-4 py-1.5 flex items-center justify-between border-b ${cfg.headerBorder} bg-[#0a0a12]`}>
        <span className="text-[9px] text-slate-600 font-mono uppercase tracking-wider">Model</span>
        <span className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]">{model}</span>
      </div>

      {/* ── Benchmark bar ── */}
      {showBenchmark && (
        <BenchmarkBar modelId={model} accentColor={cfg.accentColor} />
      )}

      {/* ── Stats row ── */}
      <div className={`px-4 py-1.5 flex items-center gap-4 border-b ${cfg.headerBorder} bg-[#0a0a12]`}>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-slate-600 uppercase tracking-wider">Motions</span>
          <span className="text-[10px] text-slate-300 font-semibold">{motionsCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-slate-600 uppercase tracking-wider">Evidence</span>
          <span className="text-[10px] text-slate-300 font-semibold">{evidenceCount}</span>
        </div>
      </div>

      {/* ── Message log ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center opacity-30">
            <span className="text-3xl">{cfg.icon}</span>
            <p className="text-[11px] text-slate-500 tracking-wider">Awaiting trial start...</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem key={msg.id} msg={msg} role={role} textSpeed={textSpeed} />
          ))
        )}
      </div>
    </div>
  );
}
