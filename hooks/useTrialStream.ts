"use client";

import { useState, useCallback, useRef } from "react";
import type { Message, AgentStatus } from "@/components/AgentPanel";
import type { TrialEvent as UITrialEvent } from "@/components/JudgePanel";

// Matches the TrialEvent shape from the orchestrator
interface StreamEvent {
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
    | "error"
    | "done";
  side?: "prosecution" | "defense" | "judge";
  round?: number;
  content?: string;
  toolName?: string;
  toolInput?: string;
  timestamp?: string;
}

export type TrialStatus = "idle" | "in_progress" | "verdict" | "done" | "error";
export type Turn = "prosecution" | "defense" | "judge" | null;

export interface TrialState {
  status: TrialStatus;
  turn: Turn;
  round: number;
  maxRounds: number;
  caseName: string;

  prosecutionMessages: Message[];
  prosecutionStatus: AgentStatus;
  prosecutionMotions: number;
  prosecutionEvidence: number;

  defenseMessages: Message[];
  defenseStatus: AgentStatus;
  defenseMotions: number;
  defenseEvidence: number;

  judgeMessages: Message[];
  judgeStatus: AgentStatus;

  trialEvents: UITrialEvent[];
  verdict: string;
}

export interface TrialConfig {
  caseId: string;
  prosecutionModel: string;
  defenseModel: string;
  judgeModel: string;
  maxRounds?: number;
}

const INITIAL_STATE: TrialState = {
  status: "idle",
  turn: null,
  round: 0,
  maxRounds: 2,
  caseName: "Select a case",
  prosecutionMessages: [],
  prosecutionStatus: "idle",
  prosecutionMotions: 0,
  prosecutionEvidence: 0,
  defenseMessages: [],
  defenseStatus: "idle",
  defenseMotions: 0,
  defenseEvidence: 0,
  judgeMessages: [],
  judgeStatus: "idle",
  trialEvents: [],
  verdict: "",
};

let msgCounter = 0;
function uid() {
  return `msg-${++msgCounter}-${Date.now()}`;
}

function evtId() {
  return `evt-${++msgCounter}-${Date.now()}`;
}

function fmtTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function useTrialStream() {
  const [state, setState] = useState<TrialState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  // Pending tool call waiting for its result — keyed by side
  const pendingToolCall = useRef<Record<string, { msgId: string; tool: string; input: string }>>({});

  const updateState = useCallback((updater: (prev: TrialState) => TrialState) => {
    setState(updater);
  }, []);

  const handleEvent = useCallback((evt: StreamEvent) => {
    updateState((prev) => {
      const next = { ...prev };

      switch (evt.type) {
        case "briefing": {
          next.status = "in_progress";
          next.judgeMessages = [
            ...prev.judgeMessages,
            { id: uid(), type: "system", content: "Case briefing received", timestamp: fmtTime(evt.timestamp) },
          ];
          next.trialEvents = [
            ...prev.trialEvents,
            { id: evtId(), type: "turn_change", description: "Trial commenced — case briefing distributed", timestamp: fmtTime(evt.timestamp) },
          ];
          break;
        }

        case "turn_start": {
          const side = evt.side;
          next.round = evt.round ?? prev.round;
          if (side === "prosecution") {
            next.turn = "prosecution";
            next.prosecutionStatus = "thinking";
            next.defenseStatus = "idle";
          } else if (side === "defense") {
            next.turn = "defense";
            next.defenseStatus = "thinking";
            next.prosecutionStatus = "resting";
          } else if (side === "judge") {
            next.turn = "judge";
            next.judgeStatus = "thinking";
            next.prosecutionStatus = "resting";
            next.defenseStatus = "resting";
          }
          next.trialEvents = [
            ...prev.trialEvents,
            { id: evtId(), type: "turn_change", description: evt.content ?? `${side} begins round ${evt.round}`, side: side as "prosecution" | "defense" | undefined, timestamp: fmtTime(evt.timestamp) },
          ];
          break;
        }

        case "turn_end": {
          const side = evt.side;
          if (side === "prosecution") next.prosecutionStatus = "resting";
          else if (side === "defense") next.defenseStatus = "resting";
          else if (side === "judge") next.judgeStatus = "done";
          break;
        }

        case "tool_call": {
          const side = evt.side;
          const msgId = uid();
          const toolMsg: Message = {
            id: msgId,
            type: "tool_call",
            content: "",
            toolCall: {
              id: msgId,
              tool: evt.toolName ?? "tool",
              input: evt.toolInput ?? "",
              timestamp: fmtTime(evt.timestamp),
            },
            timestamp: fmtTime(evt.timestamp),
          };

          if (side === "prosecution") {
            pendingToolCall.current["prosecution"] = { msgId, tool: evt.toolName ?? "", input: evt.toolInput ?? "" };
            next.prosecutionMessages = [...prev.prosecutionMessages, toolMsg];
            next.prosecutionStatus = "thinking";
          } else if (side === "defense") {
            pendingToolCall.current["defense"] = { msgId, tool: evt.toolName ?? "", input: evt.toolInput ?? "" };
            next.defenseMessages = [...prev.defenseMessages, toolMsg];
            next.defenseStatus = "thinking";
          }
          break;
        }

        case "tool_result": {
          const side = evt.side;
          const pending = side ? pendingToolCall.current[side] : null;
          if (pending && evt.content) {
            // Patch the output into the existing tool_call message
            const patchMessages = (msgs: Message[]): Message[] =>
              msgs.map((m) =>
                m.id === pending.msgId && m.toolCall
                  ? { ...m, toolCall: { ...m.toolCall, output: evt.content?.slice(0, 200) } }
                  : m
              );
            if (side === "prosecution") next.prosecutionMessages = patchMessages(prev.prosecutionMessages);
            else if (side === "defense") next.defenseMessages = patchMessages(prev.defenseMessages);
            if (side) delete pendingToolCall.current[side];
          }
          break;
        }

        case "argument": {
          const side = evt.side;
          const msg: Message = {
            id: uid(),
            type: "argument",
            content: evt.content ?? "",
            timestamp: fmtTime(evt.timestamp),
          };
          if (side === "prosecution") {
            next.prosecutionMessages = [...prev.prosecutionMessages, msg];
            next.prosecutionStatus = "speaking";
          } else if (side === "defense") {
            next.defenseMessages = [...prev.defenseMessages, msg];
            next.defenseStatus = "speaking";
          } else if (side === "judge") {
            next.judgeMessages = [...prev.judgeMessages, msg];
            next.judgeStatus = "speaking";
          }
          break;
        }

        case "motion": {
          const side = evt.side;
          const msg: Message = {
            id: uid(),
            type: "motion",
            content: evt.content ?? "",
            timestamp: fmtTime(evt.timestamp),
          };
          if (side === "prosecution") {
            next.prosecutionMessages = [...prev.prosecutionMessages, msg];
            next.prosecutionMotions = prev.prosecutionMotions + 1;
          } else if (side === "defense") {
            next.defenseMessages = [...prev.defenseMessages, msg];
            next.defenseMotions = prev.defenseMotions + 1;
          }
          next.trialEvents = [
            ...prev.trialEvents,
            { id: evtId(), type: "motion_filed", description: evt.content ?? "Motion filed", side: side as "prosecution" | "defense" | undefined, timestamp: fmtTime(evt.timestamp) },
          ];
          break;
        }

        case "evidence": {
          const side = evt.side;
          const msg: Message = {
            id: uid(),
            type: "evidence",
            content: evt.content ?? "",
            timestamp: fmtTime(evt.timestamp),
          };
          if (side === "prosecution") {
            next.prosecutionMessages = [...prev.prosecutionMessages, msg];
            next.prosecutionEvidence = prev.prosecutionEvidence + 1;
          } else if (side === "defense") {
            next.defenseMessages = [...prev.defenseMessages, msg];
            next.defenseEvidence = prev.defenseEvidence + 1;
          }
          next.trialEvents = [
            ...prev.trialEvents,
            { id: evtId(), type: "evidence_admitted", description: evt.content ?? "Evidence admitted", side: side as "prosecution" | "defense" | undefined, timestamp: fmtTime(evt.timestamp) },
          ];
          break;
        }

        case "verdict": {
          next.verdict = evt.content ?? "";
          next.status = "verdict";
          next.turn = null;
          next.judgeStatus = "done";
          next.prosecutionStatus = "done";
          next.defenseStatus = "done";
          next.judgeMessages = [
            ...prev.judgeMessages,
            { id: uid(), type: "argument", content: evt.content ?? "", timestamp: fmtTime(evt.timestamp) },
          ];
          next.trialEvents = [
            ...prev.trialEvents,
            { id: evtId(), type: "ruling", description: "Judge delivered verdict", timestamp: fmtTime(evt.timestamp) },
          ];
          break;
        }

        case "error": {
          next.status = "error";
          break;
        }

        case "done": {
          if (next.status !== "verdict") next.status = "done";
          break;
        }
      }

      return next;
    });
  }, [updateState]);

  const startTrial = useCallback(async (config: TrialConfig, caseName: string) => {
    // Abort any running trial
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setState({
      ...INITIAL_STATE,
      status: "in_progress",
      maxRounds: config.maxRounds ?? 2,
      caseName,
    });

    try {
      const res = await fetch("/api/trial/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.text();
        setState((prev) => ({ ...prev, status: "error" }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const evt = JSON.parse(line.slice(6)) as StreamEvent;
              handleEvent(evt);
            } catch {
              // malformed JSON — skip
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setState((prev) => ({ ...prev, status: "error" }));
      }
    }
  }, [handleEvent]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  return { state, startTrial, reset };
}
