"use client";

import { useEffect, useState, useRef } from "react";
import { CASES } from "@/lib/cases";
import { NEBIUS_MODELS } from "@/lib/agents/modelList";

type TrialStatus = "waiting" | "in_progress" | "resting" | "verdict";

interface TopBarProps {
  caseName?:                string;
  trialStatus?:             TrialStatus;
  turn?:                    "prosecution" | "defense" | "judge" | null;
  round?:                   number;
  maxRounds?:               number;
  isRunning?:               boolean;
  isDone?:                  boolean;
  selectedCase?:            string;
  onCaseChange?:            (id: string) => void;
  prosecutionModel?:        string;
  defenseModel?:            string;
  judgeModel?:              string;
  onProsecutionModelChange?:(m: string) => void;
  onDefenseModelChange?:    (m: string) => void;
  onJudgeModelChange?:      (m: string) => void;
  ragMode?:                 boolean;
  onRagModeChange?:         (v: boolean) => void;
  onBeginTrial?:            () => void;
  onReset?:                 () => void;
  onOpenConfig?:            () => void;
  isPaused?:                boolean;
  onTogglePause?:           () => void;
}

function ModelSelect({ value, onChange, label, accentColor }: {
  value:       string;
  onChange:    (v: string) => void;
  label:       string;
  accentColor: "red" | "blue" | "yellow";
}) {
  const dotColor =
    accentColor === "red"    ? "bg-[#c0392b]" :
    accentColor === "blue"   ? "bg-[#1a6fa8]" : "bg-[#c9a227]";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-[10px] font-mono text-slate-300 bg-[#12122a] border border-[#2a2a4a] rounded px-1.5 py-0.5 max-w-[145px] truncate focus:outline-none focus:border-slate-500"
      >
        {NEBIUS_MODELS.map((m) => (
          <option key={m.modelId} value={m.modelId}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}

// Animated turn banner — slides in when turn changes
function TurnBanner({ turn }: { turn: "prosecution" | "defense" | "judge" | null }) {
  const [displayed, setDisplayed] = useState(turn);
  const [animKey, setAnimKey] = useState(0);
  const prevTurn = useRef(turn);

  useEffect(() => {
    if (turn && turn !== prevTurn.current) {
      setDisplayed(turn);
      setAnimKey((k) => k + 1);
      prevTurn.current = turn;
    }
  }, [turn]);

  if (!displayed) return null;

  const config = {
    prosecution: { label: "— PROSECUTION TURN —", color: "text-[#ff6b5b]", border: "border-[#c0392b]/40" },
    defense:     { label: "— DEFENSE TURN —",     color: "text-[#5baaff]", border: "border-[#1a6fa8]/40" },
    judge:       { label: "— JUDGE'S RULING —",   color: "text-[#f5c518]", border: "border-[#c9a227]/40" },
  };

  const cfg = config[displayed];

  return (
    <div
      key={animKey}
      className={`aa-banner-slide px-4 py-0.5 rounded border ${cfg.border} bg-[#0a0a18]`}
    >
      <span className={`text-[10px] font-bold tracking-[0.2em] ${cfg.color}`}>
        {cfg.label}
      </span>
    </div>
  );
}

export default function TopBar({
  caseName    = "Select a case",
  trialStatus = "waiting",
  turn        = null,
  round       = 0,
  maxRounds   = 2,
  isRunning   = false,
  isDone      = false,
  selectedCase    = "",
  onCaseChange,
  prosecutionModel    = "",
  defenseModel        = "",
  judgeModel          = "",
  onProsecutionModelChange,
  onDefenseModelChange,
  onJudgeModelChange,
  ragMode = false,
  onRagModeChange,
  onBeginTrial,
  onReset,
  onOpenConfig,
  isPaused   = false,
  onTogglePause,
}: TopBarProps) {
  const statusDot =
    trialStatus === "in_progress" ? "bg-yellow-400 animate-pulse" :
    trialStatus === "verdict"     ? "bg-green-400"  :
    "bg-slate-600";

  const statusLabel =
    trialStatus === "in_progress" ? "TRIAL IN SESSION" :
    trialStatus === "verdict"     ? "VERDICT REACHED"  :
    "AWAITING TRIAL";

  const statusColor =
    trialStatus === "in_progress" ? "text-yellow-300" :
    trialStatus === "verdict"     ? "text-green-300"  :
    "text-slate-500";

  return (
    <header className="aa-wood flex flex-col shrink-0">
      {/* ── Main row ── */}
      <div className="flex items-center justify-between px-4 py-2 gap-4 flex-wrap">

        {/* Left — branding + case */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[#c9a227] font-black text-xl" style={{ textShadow: "0 1px 6px rgba(201,162,39,0.6)" }}>⚖</span>
            <div className="flex flex-col leading-none">
              <span className="text-white font-black tracking-[0.15em] text-[11px]">CASESNIPE</span>
              <span className="text-[#c9a227]/70 text-[8px] tracking-[0.3em]">DISTRICT COURT</span>
            </div>
          </div>
          <span className="text-slate-600 text-sm">|</span>
          <select
            value={selectedCase}
            onChange={(e) => onCaseChange?.(e.target.value)}
            disabled={isRunning}
            className="text-[10px] font-mono text-slate-300 bg-[#12122a] border border-[#2a2a4a] rounded px-2 py-1 max-w-[210px] disabled:opacity-40 focus:outline-none"
          >
            {CASES.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.difficulty.toUpperCase()}] {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Center — status + turn banner */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusDot}`} />
            <span className={`text-[11px] font-mono font-semibold tracking-wider ${statusColor}`}>{statusLabel}</span>
          </div>
          {round > 0 && (
            <span className="text-[9px] text-slate-600 font-mono tracking-widest">
              DAY {round} · ROUND {round}/{maxRounds}
            </span>
          )}
          <TurnBanner turn={turn} />
        </div>

        {/* Right — model selectors + buttons */}
        <div className="flex items-end gap-3 shrink-0">
          <ModelSelect label="Prosecution" value={prosecutionModel} onChange={onProsecutionModelChange ?? (() => {})} accentColor="red" />
          <ModelSelect label="Judge"       value={judgeModel}       onChange={onJudgeModelChange       ?? (() => {})} accentColor="yellow" />
          <ModelSelect label="Defense"     value={defenseModel}     onChange={onDefenseModelChange     ?? (() => {})} accentColor="blue" />

          {/* RAG Mode toggle — semantic precedent search when on */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">RAG</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={ragMode}
                onChange={(e) => onRagModeChange?.(e.target.checked)}
                disabled={isRunning}
                className="w-3 h-3 rounded accent-[#c9a227] disabled:opacity-40"
              />
              <span className="text-[10px] font-mono text-slate-400">{ragMode ? "On" : "Off"}</span>
            </label>
          </div>

          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={onOpenConfig}
              className="p-1.5 text-slate-500 hover:text-[#c9a227] transition-colors rounded"
              aria-label="Configure API keys"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            {isRunning && (
              <button
                onClick={onTogglePause}
                className={`px-3 py-1.5 text-[11px] font-mono font-semibold rounded border transition-all ${
                  isPaused
                    ? "bg-green-500/15 border-green-500/40 text-green-400 hover:bg-green-500/25"
                    : "bg-slate-700/40 border-slate-600/40 text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                {isPaused ? "▶ RESUME" : "⏸ PAUSE"}
              </button>
            )}
            {isDone && (
              <button
                onClick={onReset}
                className="px-3 py-1.5 text-[11px] font-mono font-semibold bg-[#12122a] border border-[#2a2a4a] text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-all rounded"
              >
                RESET
              </button>
            )}
            <button
              onClick={isRunning ? undefined : onBeginTrial}
              disabled={isRunning}
              className={`px-4 py-1.5 text-[11px] font-mono font-bold tracking-wider rounded transition-all ${
                isRunning
                  ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-500/50 cursor-not-allowed"
                  : "bg-[#c9a227]/15 border border-[#c9a227]/50 text-[#f5c518] hover:bg-[#c9a227]/25 hover:border-[#c9a227]/70 shadow-[0_0_12px_rgba(201,162,39,0.15)]"
              }`}
              style={isRunning ? {} : { textShadow: "0 0 8px rgba(245,197,24,0.5)" }}
            >
              {isRunning ? "IN SESSION..." : "BEGIN TRIAL ▶"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
