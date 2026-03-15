/**
 * CaseSnipe.ai - Agent types
 */

export interface CaseBriefing {
  caseName: string;
  facts: string;
  timestamp: string;
}

export interface CaseAgentInput {
  caseName?: string;
  scenario?: string;
}

export interface ProsecutorInput {
  caseBriefing: CaseBriefing;
  message?: string;
}

export interface DefendantInput {
  caseBriefing: CaseBriefing;
  prosecutionArgument?: string;
  message?: string;
}

export interface AgentTurnOutput {
  turnNumber: number;
  response: string;
  toolCalls?: Array<{ name: string; args: unknown }>;
}

export interface TrialTranscript {
  caseBriefing: CaseBriefing;
  prosecutionTurns: AgentTurnOutput[];
  defenseTurns: AgentTurnOutput[];
}

export interface JudgeInput {
  transcript: TrialTranscript;
}

export interface VerdictOutput {
  ruling: string;
  reasoning: string;
  confidence: "high" | "medium" | "low";
  sentence?: string;
  damages?: string;
}
