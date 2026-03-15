"use client";

import { useState, useEffect, useRef } from "react";
import TopBar from "@/components/TopBar";
import ApiKeyConfigModal from "@/components/ApiKeyConfigModal";
import AgentPanel from "@/components/AgentPanel";
import JudgePanel from "@/components/JudgePanel";
import GameOverScreen from "@/components/GameOverScreen";
import ObjectionBanner, { type BannerWord, type BannerSide } from "@/components/ObjectionBanner";
import { useTrialStream } from "@/hooks/useTrialStream";
import { resetQueue } from "@/lib/typingQueue";
import { CASES, DEMO_CASES } from "@/lib/cases";
import { DEFAULT_PROSECUTION_MODEL, DEFAULT_DEFENSE_MODEL, DEFAULT_JUDGE_MODEL } from "@/lib/agents/modelList";

interface BannerState {
  visible: boolean;
  word: BannerWord;
  side: BannerSide;
}

export default function Home() {
  const { state, startTrial, reset } = useTrialStream();

  const [selectedCase, setSelectedCase]           = useState(DEMO_CASES.easy);
  const [configModalOpen, setConfigModalOpen]     = useState(false);
  const [apiKeysOverride, setApiKeysOverride]     = useState<{
    openRouter?: string;
    tavily?: string;
    nebius?: string;
  }>({});
  const [prosecutionModel, setProsecutionModel]   = useState(DEFAULT_PROSECUTION_MODEL);
  const [defenseModel, setDefenseModel]           = useState(DEFAULT_DEFENSE_MODEL);
  const [judgeModel, setJudgeModel]               = useState(DEFAULT_JUDGE_MODEL);
  const maxRounds = 4;
  const [textSpeed, setTextSpeed] = useState(15); // ms per char

  // ── Banner state ──────────────────────────────────────────────
  const [banner, setBanner] = useState<BannerState>({
    visible: false,
    word:    "OBJECTION!",
    side:    "prosecution",
  });
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track last message counts so we only fire on NEW messages
  const prevProsCountRef = useRef(0);
  const prevDefCountRef  = useRef(0);

  function showBanner(word: BannerWord, side: BannerSide) {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setBanner({ visible: true, word, side });
    bannerTimerRef.current = setTimeout(() => {
      setBanner((b) => ({ ...b, visible: false }));
    }, 1800);
  }

  // Fire banner whenever a new argument or evidence message appears
  useEffect(() => {
    const newPros = state.prosecutionMessages.length;
    const newDef  = state.defenseMessages.length;

    if (newPros > prevProsCountRef.current) {
      // Check if newest prosecution message is an argument or evidence
      const newest = state.prosecutionMessages[state.prosecutionMessages.length - 1];
      if (newest) {
        if (newest.type === "evidence") {
          showBanner("TAKE THAT!", "evidence");
        } else if (newest.type === "argument") {
          showBanner("OBJECTION!", "prosecution");
        }
      }
      prevProsCountRef.current = newPros;
    }

    if (newDef > prevDefCountRef.current) {
      const newest = state.defenseMessages[state.defenseMessages.length - 1];
      if (newest) {
        if (newest.type === "evidence") {
          showBanner("TAKE THAT!", "evidence");
        } else if (newest.type === "argument") {
          showBanner("HOLD IT!", "defense");
        }
      }
      prevDefCountRef.current = newDef;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.prosecutionMessages.length, state.defenseMessages.length]);

  // Reset message counters and typing queue on trial reset
  useEffect(() => {
    if (state.status === "idle") {
      prevProsCountRef.current = 0;
      prevDefCountRef.current  = 0;
      resetQueue();
    }
  }, [state.status]);

  const isRunning  = state.status === "in_progress";
  const isVerdict  = state.status === "verdict";
  const isDone     = isVerdict || state.status === "done" || state.status === "error";

  const handleBeginTrial = () => {
    resetQueue();
    const legalCase = CASES.find((c) => c.id === selectedCase);
    startTrial(
      { caseId: selectedCase, prosecutionModel, defenseModel, judgeModel, maxRounds },
      legalCase?.title ?? selectedCase
    );
  };

  const trialStatus =
    state.status === "idle"        ? "waiting"     as const :
    state.status === "in_progress" ? "in_progress" as const :
    isVerdict                      ? "verdict"     as const :
    state.status === "done"        ? "verdict"     as const : "waiting" as const;

  // Flatten transcript for scoring
  const flatTranscript = [
    ...state.prosecutionMessages.map((m) => ({
      type: m.type, side: "prosecution", content: m.content, toolName: m.toolCall?.tool,
    })),
    ...state.defenseMessages.map((m) => ({
      type: m.type, side: "defense", content: m.content, toolName: m.toolCall?.tool,
    })),
    ...state.judgeMessages.map((m) => ({
      type: m.type, side: "judge", content: m.content,
    })),
  ];

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, #1a1030 0%, #0e0e1a 55%, #080810 100%)",
      }}
    >
      {/* OBJECTION / HOLD IT / TAKE THAT overlay */}
      <ObjectionBanner
        word={banner.word}
        side={banner.side}
        visible={banner.visible}
      />

      <TopBar
        caseName={state.caseName}
        trialStatus={trialStatus}
        onOpenConfig={() => setConfigModalOpen(true)}
        turn={state.turn}
        round={state.round}
        maxRounds={state.maxRounds}
        isRunning={isRunning}
        isDone={isDone}
        selectedCase={selectedCase}
        onCaseChange={setSelectedCase}
        prosecutionModel={prosecutionModel}
        defenseModel={defenseModel}
        judgeModel={judgeModel}
        onProsecutionModelChange={setProsecutionModel}
        onDefenseModelChange={setDefenseModel}
        onJudgeModelChange={setJudgeModel}
        onBeginTrial={handleBeginTrial}
        onReset={reset}
      />

      {/* ── Text speed control ── */}
      <div className="flex items-center gap-2 px-4 py-1 border-b border-[#1e1e2e] bg-[#0a0a12]">
        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest shrink-0">Text Speed</span>
        <input
          type="range" min={0} max={50} step={5} value={textSpeed}
          onChange={(e) => setTextSpeed(Number(e.target.value))}
          className="w-24 accent-[#f5c518] h-1"
        />
        <span className="text-[9px] font-mono text-slate-500 w-14">
          {textSpeed === 0 ? "Instant" : textSpeed <= 10 ? "Fast" : textSpeed <= 25 ? "Normal" : "Slow"}
        </span>
      </div>

      <div className="flex flex-1 gap-3 p-3 min-h-0">
        <div className="flex-1 min-w-0">
          <AgentPanel
            role="prosecution"
            status={state.prosecutionStatus}
            model={prosecutionModel}
            messages={state.prosecutionMessages}
            motionsCount={state.prosecutionMotions}
            evidenceCount={state.prosecutionEvidence}
            textSpeed={textSpeed}
          />
        </div>

        <div className="w-[340px] shrink-0">
          <JudgePanel
            status={state.judgeStatus}
            model={judgeModel}
            messages={state.judgeMessages}
            events={state.trialEvents}
            round={state.round}
            maxRounds={state.maxRounds}
            verdict={state.verdict}
          />
        </div>

        <div className="flex-1 min-w-0">
          <AgentPanel
            role="defense"
            status={state.defenseStatus}
            model={defenseModel}
            messages={state.defenseMessages}
            motionsCount={state.defenseMotions}
            evidenceCount={state.defenseEvidence}
            textSpeed={textSpeed}
          />
        </div>
      </div>

      <ApiKeyConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
      />

      {isVerdict && state.verdict && (
        <GameOverScreen
          verdict={state.verdict}
          caseName={state.caseName}
          prosecutionModel={prosecutionModel}
          defenseModel={defenseModel}
          judgeModel={judgeModel}
          prosecutionMotions={state.prosecutionMotions}
          prosecutionEvidence={state.prosecutionEvidence}
          defenseMotions={state.defenseMotions}
          defenseEvidence={state.defenseEvidence}
          transcript={flatTranscript}
          onReset={reset}
        />
      )}
    </div>
  );
}
