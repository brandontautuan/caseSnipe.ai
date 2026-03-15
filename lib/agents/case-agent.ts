/**
 * CaseSnipe.ai - Case Agent
 * RunnableSequence: Tavily search → Nebius LLM format. Stateless, no memory.
 * If Tavily returns empty, LLM reasons from training knowledge.
 */

import { RunnableLambda } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createTavilyLegalTool } from "@/lib/tools/tavily-legal";
import { createCaseAgentLLM } from "@/lib/llms/nebius";
import type { CaseBriefing, CaseAgentInput } from "@/types/agents";

const SYSTEM_PROMPT = `You are a neutral court clerk presenting case facts. You do NOT favor prosecution or defense.
Given a case name or scenario, you will receive search results (or none) about the case.
Format your output as a concise court briefing: facts, key evidence, relevant law. Be factual and impartial.
If the search returns no results, reason from your training knowledge to produce a plausible neutral briefing — never return an empty briefing.`;

export function createCaseAgent() {
  const tavilyTool = createTavilyLegalTool();
  const llm = createCaseAgentLLM();

  const run = async (input: CaseAgentInput): Promise<CaseBriefing> => {
    const caseName = input.caseName ?? input.scenario ?? "unknown case";
    const query = `${caseName} facts ruling legal background`;

    // Step 1: Tavily search
    const searchResult = await tavilyTool.invoke({ query });
    const hasResults =
      searchResult &&
      typeof searchResult === "object" &&
      "results" in searchResult &&
      Array.isArray((searchResult as { results?: unknown[] }).results) &&
      (searchResult as { results: unknown[] }).results.length > 0;

    const searchContent = hasResults
      ? JSON.stringify(
          (searchResult as { results: Array<{ content?: string; title?: string }> })
            .results?.map((r) => ({ title: r.title, content: r.content })) ?? []
        )
      : "No search results found. Reason from your training knowledge to produce a plausible neutral briefing.";

    // Step 2: LLM format
    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(
        `Case: ${caseName}\n\nSearch results:\n${searchContent}\n\nProduce a neutral court briefing.`
      ),
    ];

    const response = await llm.invoke(messages);
    const facts =
      typeof response.content === "string"
        ? response.content
        : Array.isArray(response.content)
          ? response.content.map((c) => (typeof c === "string" ? c : "")).join("")
          : "";

    return {
      caseName,
      facts: facts.trim() || "No briefing generated.",
      timestamp: new Date().toISOString(),
    };
  };

  return RunnableLambda.from(run);
}
