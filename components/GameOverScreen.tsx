"use client";

import { useMemo } from "react";
import { scoreTrialEvents, type TrialScore, type SideScore } from "@/lib/scoring";
import { MODEL_MAP } from "@/lib/agents/modelList";

interface GameOverScreenProps {
  verdict:              string;
  caseName:             string;
  prosecutionModel:     string;
  defenseModel:         string;
  judgeModel:           string;
  prosecutionMotions:   number;
  prosecutionEvidence:  number;
  defenseMotions:       number;
  defenseEvidence:      number;
  transcript: Array<{ type: string; side?: string; content?: string; toolName?: string }>;
  onReset: () => void;
}

const GRADE_STYLES: Record<SideScore["grade"], string> = {
  S: "text-yellow-300 border-yellow-400/60 bg-yellow-400/8  shadow-[0_0_12px_rgba(234,179,8,0.3)]",
  A: "text-green-300  border-green-400/60  bg-green-400/8   shadow-[0_0_12px_rgba(74,222,128,0.2)]",
  B: "text-blue-300   border-blue-400/60   bg-blue-400/8",
  C: "text-slate-300  border-slate-400/50  bg-slate-400/5",
  D: "text-red-300    border-red-400/50    bg-red-400/5",
};

// Decide GUILTY / NOT GUILTY verdict label from text
function parseVerdictLabel(verdict: string): { label: string; isGuilty: boolean } {
  const v = verdict.toLowerCase();
  if (v.includes("not guilty") || v.includes("not liable") || v.includes("acquit")) {
    return { label: "NOT GUILTY", isGuilty: false };
  }
  if (v.includes("guilty") || v.includes("liable") || v.includes("conviction")) {
    return { label: "GUILTY", isGuilty: true };
  }
  return { label: "VERDICT", isGuilty: false };
}

function ScoreBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-slate-600 uppercase tracking-wider w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
      <span className="text-[9px] text-slate-500 w-8 text-right">{value}/{max}</span>
    </div>
  );
}

function SideCard({
  side, score, modelId, motions, evidence,
  accentColor, borderStyle, glowStyle, icon, isWinner,
}: {
  side:         string;
  score:        SideScore;
  modelId:      string;
  motions:      number;
  evidence:     number;
  accentColor:  string;
  borderStyle:  string;
  glowStyle:    string;
  icon:         string;
  isWinner:     boolean;
}) {
  const model    = MODEL_MAP[modelId];
  const barColor = side === "PROSECUTION" ? "bg-[#c0392b]" : "bg-[#1a6fa8]";

  return (
    <div
      className={`relative flex flex-col gap-3 p-4 rounded-lg ${borderStyle} ${glowStyle}`}
      style={{ background: "#0f0f1e" }}
    >
      {isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-black tracking-[0.2em] bg-[#c9a227] text-black shadow-[0_0_12px_rgba(201,162,39,0.5)]">
          ★ WINNER ★
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className={`text-sm font-black tracking-[0.15em] ${accentColor}`}>{side}</span>
        </div>
        <div className={`w-11 h-11 rounded-lg border-2 text-lg font-black flex items-center justify-center ${GRADE_STYLES[score.grade]}`}>
          {score.grade}
        </div>
      </div>

      {/* Score */}
      <div className="flex items-end gap-1">
        <span className={`text-4xl font-black font-mono ${accentColor}`}>{score.total}</span>
        <span className="text-slate-600 text-sm mb-1">/100</span>
      </div>

      {/* Breakdown */}
      <div className="flex flex-col gap-2">
        <ScoreBar label="Arguments"  value={score.breakdown.arguments}  max={30} color={barColor} />
        <ScoreBar label="Evidence"   value={score.breakdown.evidence}   max={20} color={barColor} />
        <ScoreBar label="Precedents" value={score.breakdown.precedents} max={20} color={barColor} />
        <ScoreBar label="Motions"    value={score.breakdown.motions}    max={15} color={barColor} />
        <ScoreBar label="Efficiency" value={score.breakdown.efficiency} max={15} color={barColor} />
      </div>

      {/* Summary */}
      <p className="text-[10px] text-slate-500 leading-relaxed">{score.summary}</p>

      {/* Stats */}
      <div className="flex gap-4 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-slate-600 uppercase tracking-wider">Motions</span>
          <span className="text-[10px] text-slate-300 font-bold">{motions}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-slate-600 uppercase tracking-wider">Evidence</span>
          <span className="text-[10px] text-slate-300 font-bold">{evidence}</span>
        </div>
        {model && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[9px] text-slate-600 uppercase tracking-wider">Q-IDX</span>
            <span className="text-[10px] text-slate-300 font-bold">{model.bench.quality}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GameOverScreen({
  verdict, caseName,
  prosecutionModel, defenseModel, judgeModel,
  prosecutionMotions, prosecutionEvidence,
  defenseMotions, defenseEvidence,
  transcript, onReset,
}: GameOverScreenProps) {
  const scores: TrialScore = useMemo(
    () => scoreTrialEvents(transcript, verdict),
    [transcript, verdict]
  );

  const judgeModelInfo = MODEL_MAP[judgeModel];
  const { label: verdictLabel, isGuilty } = parseVerdictLabel(verdict);

  const winnerLabel =
    scores.winner === "prosecution" ? "PROSECUTION WINS" :
    scores.winner === "defense"     ? "DEFENSE WINS"     : "DRAW";

  const winnerColor =
    scores.winner === "prosecution" ? "text-[#ff6b5b]" :
    scores.winner === "defense"     ? "text-[#5baaff]"  : "text-[#f5c518]";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, #1a0a22 0%, #080810 60%)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div className="flex flex-col max-w-3xl mx-auto w-full px-6 py-8 gap-6">

        {/* ── Dramatic verdict stamp ── */}
        <div className="aa-verdict-slam text-center flex flex-col items-center gap-2">
          <div
            className={`text-6xl font-black tracking-tight leading-none ${
              isGuilty ? "text-[#ff3b2f]" : "text-[#3bff6e]"
            }`}
            style={{
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              WebkitTextStroke: "2px rgba(0,0,0,0.5)",
              textShadow: `
                0 0 60px currentColor,
                0 0 20px currentColor,
                4px 4px 0 rgba(0,0,0,0.8)
              `,
            }}
          >
            {verdictLabel}
          </div>
          {/* Gavel */}
          <span className="aa-gavel inline-block text-3xl mt-1">🔨</span>
          <p className="text-[10px] text-slate-500 tracking-[0.3em] uppercase mt-1">— Court Adjourned —</p>
        </div>

        {/* ── Case + winner line ── */}
        <div className="text-center flex flex-col gap-1">
          <div className={`text-lg font-black tracking-widest ${winnerColor}`}>{winnerLabel}</div>
          <div className="text-slate-500 text-xs tracking-wider">{caseName}</div>
        </div>

        {/* ── Judge verdict box ── */}
        <div
          className="p-4 rounded-lg"
          style={{
            background: "rgba(201,162,39,0.05)",
            border: "1px solid rgba(201,162,39,0.2)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#c9a227]">⚖</span>
            <span className="text-[9px] font-bold tracking-[0.2em] text-[#c9a227]/60">JUDGE'S VERDICT</span>
            {judgeModelInfo && (
              <span className="text-[9px] text-slate-600 ml-auto">{judgeModelInfo.label}</span>
            )}
          </div>
          {/* Nameplate style */}
          <div className="aa-nameplate text-[#f5c518] border-[#c9a227] mb-2">THE HONORABLE JUDGE</div>
          <p className="text-[11px] text-[#f0e6c8]/80 leading-relaxed mt-2">
            {verdict.slice(0, 200)}{verdict.length > 200 ? "…" : ""}
          </p>
          {verdict.length > 200 && (
            <details className="mt-2">
              <summary className="text-[9px] text-[#c9a227]/40 cursor-pointer hover:text-[#c9a227]/70 tracking-wider">
                ▶ Read full verdict
              </summary>
              <p className="mt-2 text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap">{verdict}</p>
            </details>
          )}
        </div>

        {/* ── Score cards ── */}
        <div className="grid grid-cols-2 gap-4">
          <SideCard
            side="PROSECUTION"
            score={scores.prosecution}
            modelId={prosecutionModel}
            motions={prosecutionMotions}
            evidence={prosecutionEvidence}
            accentColor="text-[#ff6b5b]"
            borderStyle="border border-[#c0392b]/25"
            glowStyle="shadow-[0_0_24px_rgba(192,57,43,0.08)]"
            icon="⚔"
            isWinner={scores.winner === "prosecution"}
          />
          <SideCard
            side="DEFENSE"
            score={scores.defense}
            modelId={defenseModel}
            motions={defenseMotions}
            evidence={defenseEvidence}
            accentColor="text-[#5baaff]"
            borderStyle="border border-[#1a6fa8]/25"
            glowStyle="shadow-[0_0_24px_rgba(26,111,168,0.08)]"
            icon="🛡"
            isWinner={scores.winner === "defense"}
          />
        </div>

        {/* ── Verdict alignment note ── */}
        {scores.verdictFavors !== "unclear" && (
          <p className="text-center text-[10px] text-slate-600">
            Verdict favored{" "}
            <span className={scores.verdictFavors === "prosecution" ? "text-[#ff6b5b]" : "text-[#5baaff]"}>
              {scores.verdictFavors}
            </span>
            {scores.verdictFavors !== scores.winner && scores.winner !== "draw" && (
              <span className="text-slate-700"> — {scores.winner} argued more effectively</span>
            )}
          </p>
        )}

        {/* ── New trial button ── */}
        <div className="flex justify-center">
          <button
            onClick={onReset}
            className="px-8 py-2.5 font-black font-mono text-sm tracking-[0.2em] rounded transition-all"
            style={{
              background: "rgba(201,162,39,0.12)",
              border: "1px solid rgba(201,162,39,0.4)",
              color: "#f5c518",
              textShadow: "0 0 8px rgba(245,197,24,0.4)",
              boxShadow: "0 0 16px rgba(201,162,39,0.1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(201,162,39,0.22)";
              e.currentTarget.style.boxShadow = "0 0 24px rgba(201,162,39,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(201,162,39,0.12)";
              e.currentTarget.style.boxShadow = "0 0 16px rgba(201,162,39,0.1)";
            }}
          >
            NEW TRIAL ▶
          </button>
        </div>
      </div>
    </div>
  );
}
