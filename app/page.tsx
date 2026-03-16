"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import TopBar from "@/components/TopBar";
import ApiKeyConfigModal from "@/components/ApiKeyConfigModal";
import AgentPanel from "@/components/AgentPanel";
import JudgePanel from "@/components/JudgePanel";
import GameOverScreen from "@/components/GameOverScreen";
import ObjectionBanner, { type BannerWord, type BannerSide } from "@/components/ObjectionBanner";
import { useTrialStream } from "@/hooks/useTrialStream";
import * as TypingQueue from "@/lib/typingQueue";
import { CASES, DEMO_CASES, type EvidenceItem } from "@/lib/cases";
import { DEFAULT_PROSECUTION_MODEL, DEFAULT_DEFENSE_MODEL, DEFAULT_JUDGE_MODEL } from "@/lib/agents/modelList";

/** Extract search terms from evidence for highlighting references in arguments */
function getEvidenceSearchTerms(evidence: EvidenceItem[]): string[] {
  const terms = new Set<string>();
  for (const e of evidence) {
    terms.add(e.name);
    const parts = e.name.split(/\s*[—–-]\s*/);
    if (parts[0]?.trim()) terms.add(parts[0].trim());
    const exhibitMatch = e.name.match(/Exhibit\s+[A-Za-z0-9]+/i);
    if (exhibitMatch) terms.add(exhibitMatch[0]);
  }
  return Array.from(terms).filter((t) => t.length > 2);
}

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
  const [ragMode, setRagMode]                     = useState(true); // RAG precedent search — default on
  const maxRounds = 4;
  const [textSpeed, setTextSpeed] = useState(15); // ms per char
  const currentCase = CASES.find((c) => c.id === selectedCase);

  // ── Banner state ──────────────────────────────────────────────
  const [banner, setBanner] = useState<BannerState>({
    visible: false,
    word:    "OBJECTION!",
    side:    "prosecution",
  });
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pending banner: detected keyword waiting for its message to start typing
  const pendingBannerRef = useRef<{ msgId: string; word: BannerWord; side: BannerSide } | null>(null);

  // Track last message counts so we only fire on NEW messages
  const prevProsCountRef = useRef(0);
  const prevDefCountRef  = useRef(0);

  function fireBanner(word: BannerWord, side: BannerSide) {
    if (TypingQueue.getPaused()) return;
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setBanner({ visible: true, word, side });
    bannerTimerRef.current = setTimeout(() => {
      setBanner((b) => ({ ...b, visible: false }));
    }, 1800);
  }

  // Detect OBJECTION / HOLD IT / TAKE THAT in new message text
  function detectKeyword(text: string): BannerWord | null {
    if (/^OBJECTION[:\s!]/i.test(text)) return "OBJECTION!";
    if (/^HOLD IT[:\s!]/i.test(text))   return "HOLD IT!";
    if (/^TAKE THAT[:\s!]/i.test(text)) return "TAKE THAT!";
    return null;
  }

  // When a new message arrives: queue it for prioritization but hold the banner
  // until that message actually starts typing (so it fires after the prior claim finishes)
  useEffect(() => {
    const newPros = state.prosecutionMessages.length;
    const newDef  = state.defenseMessages.length;

    if (newPros > prevProsCountRef.current) {
      const newest = state.prosecutionMessages[state.prosecutionMessages.length - 1];
      if (newest?.type === "evidence") {
        // TAKE THAT fires immediately — it's new evidence, not an objection to prior speech
        fireBanner("TAKE THAT!", "evidence");
      } else if (newest?.type === "argument") {
        const kw = detectKeyword(newest.content);
        if (kw) {
          TypingQueue.prioritize(newest.id);
          pendingBannerRef.current = { msgId: newest.id, word: kw, side: "prosecution" };
        }
      }
      prevProsCountRef.current = newPros;
    }

    if (newDef > prevDefCountRef.current) {
      const newest = state.defenseMessages[state.defenseMessages.length - 1];
      if (newest?.type === "evidence") {
        fireBanner("TAKE THAT!", "evidence");
      } else if (newest?.type === "argument") {
        const kw = detectKeyword(newest.content);
        if (kw) {
          TypingQueue.prioritize(newest.id);
          pendingBannerRef.current = { msgId: newest.id, word: kw, side: "defense" };
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
      pendingBannerRef.current = null;
      TypingQueue.resetQueue();
    }
  }, [state.status]);

  const isRunning  = state.status === "in_progress";
  const isVerdict  = state.status === "verdict";
  const isDone     = isVerdict || state.status === "done" || state.status === "error";

  // ── Wait for verdict text to finish typing before showing game over ──────
  const activeTypingId = useSyncExternalStore(TypingQueue.subscribe, TypingQueue.getActiveId, () => null);

  // Fire pending banner the moment its message becomes the active typewriter
  useEffect(() => {
    const pb = pendingBannerRef.current;
    if (pb && activeTypingId === pb.msgId) {
      fireBanner(pb.word, pb.side);
      pendingBannerRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTypingId]);
  const verdictTypingStartedRef = useRef(false);
  const [verdictTypingDone, setVerdictTypingDone] = useState(false);

  useEffect(() => {
    if (!isVerdict) {
      verdictTypingStartedRef.current = false;
      setVerdictTypingDone(false);
      return;
    }
    if (activeTypingId !== null) {
      // Queue became active after verdict — track that typing has started
      verdictTypingStartedRef.current = true;
    } else if (verdictTypingStartedRef.current) {
      // Queue went idle after having been active — typing is done
      setVerdictTypingDone(true);
    } else if (textSpeed === 0) {
      // Instant mode: no typing animation, show immediately
      setVerdictTypingDone(true);
    }
  }, [isVerdict, activeTypingId, textSpeed]);

  const showGameOver = isVerdict && !!state.verdict && verdictTypingDone;

  const handleBeginTrial = () => {
    TypingQueue.resetQueue();
    const legalCase = CASES.find((c) => c.id === selectedCase);
    startTrial(
      { caseId: selectedCase, prosecutionModel, defenseModel, judgeModel, maxRounds, ragMode },
      legalCase?.title ?? selectedCase
    );
  };

  const trialStatus =
    state.status === "idle"        ? "waiting"     as const :
    state.status === "in_progress" ? "in_progress" as const :
    isVerdict                      ? "verdict"     as const :
    state.status === "done"        ? "verdict"     as const : "waiting" as const;

  // ── Effective turn: delay turn banner until previous side finishes typing ──
  // Handles common case only (prosecution→defense, defense→judge). Nested typing overlap
  // (e.g. judge turn but both prosecution and defense still typing) is out of scope for this capsule.
  const prosecutionLastArg = state.prosecutionMessages.filter((m) => m.type === "argument").pop();
  const defenseLastArg = state.defenseMessages.filter((m) => m.type === "argument").pop();
  const _typingSnapshot = useSyncExternalStore(
    TypingQueue.subscribe,
    () =>
      (state.turn === "defense" && prosecutionLastArg && !TypingQueue.isDone(prosecutionLastArg.id)) ||
      (state.turn === "judge" && defenseLastArg && !TypingQueue.isDone(defenseLastArg.id)),
    () =>
      (state.turn === "defense" && prosecutionLastArg && !TypingQueue.isDone(prosecutionLastArg.id)) ||
      (state.turn === "judge" && defenseLastArg && !TypingQueue.isDone(defenseLastArg.id))
  );
  const effectiveTurn: "prosecution" | "defense" | "judge" | null =
    state.turn === "defense" && prosecutionLastArg && !TypingQueue.isDone(prosecutionLastArg.id)
      ? "prosecution"
      : state.turn === "judge" && defenseLastArg && !TypingQueue.isDone(defenseLastArg.id)
        ? "defense"
        : state.turn;

  // ── Pause / resume ───────────────────────────────────────────────────────
  const isPaused = useSyncExternalStore(TypingQueue.subscribe, TypingQueue.getPaused, () => false);
  const handleTogglePause = () => {
    if (isPaused) {
      TypingQueue.resume();
    } else {
      TypingQueue.pause();
      // Dismiss any active or pending banner immediately
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      setBanner((b) => ({ ...b, visible: false }));
      pendingBannerRef.current = null;
    }
  };

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
        turn={effectiveTurn}
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
        ragMode={ragMode}
        onRagModeChange={setRagMode}
        onBeginTrial={handleBeginTrial}
        onReset={reset}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
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
            evidenceNames={getEvidenceSearchTerms(currentCase?.availableEvidence ?? [])}
          />
        </div>

        <div className="w-[340px] shrink-0">
          <JudgePanel
            status={state.judgeStatus}
            model={judgeModel}
            messages={state.judgeMessages}
            events={state.trialEvents}
            caseEvidence={currentCase?.availableEvidence ?? []}
            round={state.round}
            maxRounds={state.maxRounds}
            verdict={state.verdict}
            currentAngle={state.currentAngle}
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
            evidenceNames={getEvidenceSearchTerms(currentCase?.availableEvidence ?? [])}
          />
        </div>
      </div>

      <ApiKeyConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
      />

      {showGameOver && (
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
