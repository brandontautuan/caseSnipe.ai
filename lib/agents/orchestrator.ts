/**
 * CaseSnipe.ai — Trial Orchestrator
 * Manages the full turn-taking loop: Case Briefing → Prosecution → Defense → Judge verdict.
 * Uses @langchain/langgraph createReactAgent (LangChain v1 compatible).
 */

import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";

import { buildTools, REST_CASE_SIGNAL } from "./tools";
import { PROSECUTOR_SYSTEM_PROMPT, DEFENDANT_SYSTEM_PROMPT, JUDGE_SYSTEM_PROMPT } from "./prompts";
import { createModel } from "./models";
import { formatCaseBriefing } from "../evidence";
import { getCaseById } from "../cases";

export interface TrialConfig {
  caseId: string;
  prosecutionModel: string;
  defenseModel: string;
  judgeModel: string;
  maxRounds?: number;
  ragMode?: boolean;
  onEvent?: (event: TrialEvent) => void;
}

export interface TrialEvent {
  type:
    | "briefing"
    | "turn_start"
    | "turn_end"
    | "tool_call"
    | "tool_result"
    | "argument"
    | "motion"
    | "evidence"
    | "verdict"
    | "error";
  side?: "prosecution" | "defense" | "judge";
  round?: number;
  content: string;
  toolName?: string;
  toolInput?: string;
  timestamp: string;
}

export interface TrialResult {
  caseId: string;
  transcript: TrialEvent[];
  verdict: string;
  rounds: number;
  prosecutionModel: string;
  defenseModel: string;
  judgeModel: string;
}

function now(): string {
  return new Date().toISOString();
}

/**
 * Extract events from a LangGraph agent response message stream.
 * Accumulates all AI text into ONE argument event per turn — no matter how many
 * internal tool-call reasoning iterations the agent runs.
 */
function parseAgentMessages(
  messages: BaseMessage[],
  side: "prosecution" | "defense",
  round: number
): { events: TrialEvent[]; summary: string } {
  const events: TrialEvent[] = [];
  let summary = "";
  let rested = false;

  // Accumulate all AI text across reasoning iterations into ONE argument.
  const argumentParts: string[] = [];

  const flushArgument = () => {
    if (argumentParts.length === 0) return;
    const combined = argumentParts.join(" ").trim();
    argumentParts.length = 0;
    if (combined) {
      events.push({ type: "argument", side, round, content: combined, timestamp: now() });
    }
  };

  for (const msg of messages) {
    if (msg._getType() === "ai") {
      const aiMsg = msg as AIMessage;

      // Tool calls — emit each as a tool_call event (useful for UI display)
      const toolCalls = aiMsg.tool_calls ?? [];
      for (const tc of toolCalls) {
        const inputStr = JSON.stringify(tc.args ?? {});
        events.push({
          type: "tool_call",
          side,
          round,
          content: `${tc.name}(${inputStr})`,
          toolName: tc.name,
          toolInput: inputStr,
          timestamp: now(),
        });
      }

      // Collect AI text — strip echoed role labels, then accumulate
      const rawText = typeof aiMsg.content === "string" ? aiMsg.content : "";
      const text = rawText
        .replace(/^\s*\[?(PROSECUTION|DEFENSE|JUDGE|CALLOWAY|VALE|OSEI)\]?\s*ROUND\s*\d+[:\]]\s*/i, "")
        .replace(/^\s*(PROSECUTION|DEFENSE|JUDGE|CALLOWAY|VALE|OSEI)\s*[:—]\s*/i, "")
        .trim();
      if (text) argumentParts.push(text);

    } else if (msg._getType() === "tool") {
      const output = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);

      if (output.startsWith(REST_CASE_SIGNAL)) {
        // Flush accumulated text as ONE argument before closing the turn
        flushArgument();
        rested = true;
        summary = output.replace(`${REST_CASE_SIGNAL}:`, "").trim();
        events.push({ type: "turn_end", side, round, content: summary, timestamp: now() });
      } else {
        const lower = output.toLowerCase();
        const type: TrialEvent["type"] = lower.includes("motion filed")
          ? "motion"
          : lower.includes("evidence obtained")
          ? "evidence"
          : "tool_result";
        events.push({ type, side, round, content: output, timestamp: now() });
      }
    }
  }

  // Flush any remaining text (agent didn't call rest_case)
  flushArgument();

  if (!rested && !summary) {
    const lastArg = [...events].reverse().find((e) => e.type === "argument");
    summary = lastArg?.content ?? `${side} rests`;
    events.push({ type: "turn_end", side, round, content: summary, timestamp: now() });
  }

  return { events, summary };
}

/**
 * Main trial runner.
 */
export async function runTrial(config: TrialConfig): Promise<TrialResult> {
  const {
    caseId,
    prosecutionModel,
    defenseModel,
    judgeModel,
    maxRounds = 3,
    ragMode = false,
    onEvent = () => {},
  } = config;

  const legalCase = getCaseById(caseId);
  if (!legalCase) throw new Error(`Unknown case ID: ${caseId}`);

  const transcript: TrialEvent[] = [];

  const emit = (e: Omit<TrialEvent, "timestamp">) => {
    const event = { ...e, timestamp: now() };
    transcript.push(event);
    onEvent(event);
  };

  // ── Build tools & models ─────────────────────────────────────────────────
  const tools = buildTools(caseId, ragMode);
  const prosecutionLLM = createModel(prosecutionModel, { temperature: 0.7 });
  const defenseLLM     = createModel(defenseModel,     { temperature: 0.7 });

  // ── Create LangGraph agents ──────────────────────────────────────────────
  const prosecutionAgent = createReactAgent({
    llm: prosecutionLLM,
    tools,
    messageModifier: PROSECUTOR_SYSTEM_PROMPT,
  });

  const defenseAgent = createReactAgent({
    llm: defenseLLM,
    tools,
    messageModifier: DEFENDANT_SYSTEM_PROMPT,
  });

  // ── Case briefing ────────────────────────────────────────────────────────
  const briefing = formatCaseBriefing(legalCase);
  emit({ type: "briefing", content: briefing });

  // ── Judge opens the trial ─────────────────────────────────────────────────
  emit({ type: "turn_start", side: "judge", round: 0, content: "Judge opening the trial" });
  const judgeOpenLLM = createModel(judgeModel, { temperature: 0.3 });
  let judgeOpening = `COURT WILL COME TO ORDER. The matter before this court is ${legalCase.title}. Prosecution will proceed first.`;
  try {
    const openingResponse = await judgeOpenLLM.invoke([
      new SystemMessage(JUDGE_SYSTEM_PROMPT),
      new HumanMessage(
        `Open this trial in exactly 3 sentences:\n` +
        `1. "COURT WILL COME TO ORDER." — state the case name and the charges against the defendant.\n` +
        `2. State the central legal question this court must decide.\n` +
        `3. Instruct prosecution to proceed.\n\n` +
        `Case record:\n${briefing}`
      ),
    ]);
    judgeOpening = typeof openingResponse.content === "string"
      ? openingResponse.content.trim()
      : judgeOpening;
  } catch { /* use default */ }
  emit({ type: "argument", side: "judge", round: 0, content: judgeOpening });

  // Shared conversation history (both agents see the same transcript)
  const sharedHistory: BaseMessage[] = [
    new SystemMessage(`CASE BRIEFING:\n${briefing}`),
  ];

  const prosecutionFullArgs: string[] = []; // full argument text passed to defense each round
  const defenseFullArgs: string[] = [];      // full argument text passed to prosecution each round

  // ── Turn-taking loop ─────────────────────────────────────────────────────
  for (let round = 1; round <= maxRounds; round++) {
    // ── Prosecution turn ──
    emit({ type: "turn_start", side: "prosecution", round, content: `Prosecution begins round ${round}` });

    const lastDefenseArg = defenseFullArgs[defenseFullArgs.length - 1] ?? "";
    const pInput =
      round === 1
        ? `Round ${round} of ${maxRounds}. The judge has opened the trial. Prosecution — present your first argument. Reference specific evidence from the case record.`
        : `Round ${round} of ${maxRounds}. Defense just argued:\n\n"${lastDefenseArg}"\n\nProsecution — counter that argument directly, then press your case.`;

    let prosecutionResult;
    try {
      prosecutionResult = await prosecutionAgent.invoke(
        { messages: [...sharedHistory, new HumanMessage(pInput)] },
        { recursionLimit: 10 }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emit({ type: "error", side: "prosecution", round, content: msg });
      prosecutionResult = { messages: [] };
    }

    const pNewMessages: BaseMessage[] = (prosecutionResult.messages ?? []).slice(sharedHistory.length + 1);
    const { events: pEvents, summary: pSummary } = parseAgentMessages(pNewMessages, "prosecution", round);

    for (const e of pEvents) { transcript.push(e); onEvent(e); }
    const pFullArg = pEvents.filter(e => e.type === "argument").map(e => e.content).join(" ").trim() || pSummary;
    prosecutionFullArgs.push(pFullArg);
    sharedHistory.push(new AIMessage(pFullArg));

    // ── Defense turn ──
    emit({ type: "turn_start", side: "defense", round, content: `Defense begins round ${round}` });

    const dInput = `Round ${round} of ${maxRounds}. Prosecution just argued:\n\n"${pFullArg}"\n\nDefense — respond directly to that argument. Challenge it specifically, then make your own point.`;

    let defenseResult;
    try {
      defenseResult = await defenseAgent.invoke(
        { messages: [...sharedHistory, new HumanMessage(dInput)] },
        { recursionLimit: 10 }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emit({ type: "error", side: "defense", round, content: msg });
      defenseResult = { messages: [] };
    }

    const dNewMessages: BaseMessage[] = (defenseResult.messages ?? []).slice(sharedHistory.length + 1);
    const { events: dEvents, summary: dSummary } = parseAgentMessages(dNewMessages, "defense", round);

    for (const e of dEvents) { transcript.push(e); onEvent(e); }
    const dFullArg = dEvents.filter(e => e.type === "argument").map(e => e.content).join(" ").trim() || dSummary;
    defenseFullArgs.push(dFullArg);
    sharedHistory.push(new AIMessage(dFullArg));
  }

  // ── Judge verdict ────────────────────────────────────────────────────────
  emit({ type: "turn_start", side: "judge", round: 0, content: "Judge reviewing trial transcript..." });

  const judgeLLM = createModel(judgeModel, { temperature: 0.3 });

  const transcriptText = transcript
    .filter((e) => ["briefing", "argument", "motion", "evidence", "turn_end"].includes(e.type))
    .map((e) => `[${(e.side ?? "COURT").toUpperCase()} ${e.type.toUpperCase()}]: ${e.content}`)
    .join("\n\n");

  let verdict = "Unable to reach verdict.";
  try {
    const judgeResponse = await judgeLLM.invoke([
      new SystemMessage(JUDGE_SYSTEM_PROMPT),
      new HumanMessage(`Complete trial transcript:\n\n${transcriptText}\n\nBoth sides have rested. The court will now render its verdict.`),
    ]);
    verdict =
      typeof judgeResponse.content === "string"
        ? judgeResponse.content
        : JSON.stringify(judgeResponse.content);
  } catch (err) {
    verdict = `Judge error: ${err instanceof Error ? err.message : String(err)}`;
  }

  emit({ type: "verdict", side: "judge", round: 0, content: verdict });

  return { caseId, transcript, verdict, rounds: maxRounds, prosecutionModel, defenseModel, judgeModel };
}
