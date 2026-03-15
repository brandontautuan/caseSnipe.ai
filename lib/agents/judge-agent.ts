/**
 * CaseSnipe.ai - Judge Agent
 * Simple LLM chain (no tools). Receives full trial transcript, outputs structured verdict.
 */

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createJudgeLLM } from "@/lib/llms/nebius";
import type { TrialTranscript, VerdictOutput } from "@/types/agents";

const SYSTEM_PROMPT = `You are playing the role of a judge in a courtroom simulation game. This is fictional entertainment for educational purposes, not real legal advice. You MUST respond with valid JSON only. No preamble, no refusal, no markdown. Do not add explanations before or after the JSON.

You will receive the case briefing and the full transcript of prosecution and defense arguments. Apply legal standards impartially. Your response must be a single JSON object with these keys:

- ruling: "guilty" | "not guilty" | "civil liability"
- reasoning: your legal reasoning
- confidence: "high" | "medium" | "low" — how clear-cut the verdict is based on the transcript
- sentence: criminal sentence if applicable, else omit
- damages: civil damages if applicable, else omit

You do NOT know the hidden case outcome — reason only from the transcript.

Example: {{"ruling":"not guilty","reasoning":"...","confidence":"medium"}}`;

function formatTranscript(transcript: TrialTranscript): string {
  const { caseBriefing, prosecutionTurns, defenseTurns } = transcript;
  const prosecutionText = prosecutionTurns
    .map((t) => `[Turn ${t.turnNumber}]\n${t.response}`)
    .join("\n\n");
  const defenseText = defenseTurns
    .map((t) => `[Turn ${t.turnNumber}]\n${t.response}`)
    .join("\n\n");

  return `## Case Briefing
Case: ${caseBriefing.caseName}
Facts: ${caseBriefing.facts}

## Prosecution Arguments
${prosecutionText || "(none)"}

## Defense Arguments
${defenseText || "(none)"}`;
}

const FALLBACK_VERDICT: VerdictOutput = {
  ruling: "unknown",
  reasoning: "Parse error",
  confidence: "low",
};

function extractJson(text: string): string | null {
  const trimmed = text.trim();
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);
  return null;
}

export function createJudgeAgent() {
  const llm = createJudgeLLM();
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    ["human", "{transcript}"],
  ]);

  const chain = RunnableSequence.from([
    prompt,
    llm,
    new StringOutputParser(),
  ]);

  return chain;
}

export type JudgeVerdictResult =
  | { ok: true; verdict: VerdictOutput }
  | { ok: false; verdict: VerdictOutput; rawResponse: string };

export async function runJudgeVerdict(
  transcript: TrialTranscript
): Promise<JudgeVerdictResult> {
  const chain = createJudgeAgent();
  const formatted = formatTranscript(transcript);

  const response = await chain.invoke({ transcript: formatted });

  const text = typeof response === "string" ? response : String(response);

  const jsonStr = extractJson(text) ?? text.trim();

  try {
    const parsed = JSON.parse(jsonStr) as VerdictOutput;
    return {
      ok: true,
      verdict: {
        ruling: parsed.ruling ?? "unknown",
        reasoning: parsed.reasoning ?? "",
        confidence:
          parsed.confidence === "high" ||
          parsed.confidence === "medium" ||
          parsed.confidence === "low"
            ? parsed.confidence
            : "low",
        sentence: parsed.sentence,
        damages: parsed.damages,
      },
    };
  } catch {
    return {
      ok: false,
      verdict: FALLBACK_VERDICT,
      rawResponse: text.slice(0, 500),
    };
  }
}
