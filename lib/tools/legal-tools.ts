/**
 * CaseSnipe.ai - Shared legal tools for Prosecutor and Defendant agents
 * tavily_search + stubs for request_evidence, lookup_precedent, file_motion, cross_examine, rest_case
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TavilySearchAPIWrapper } from "@langchain/tavily";
import { getConfig } from "@/lib/config";
import type { StructuredToolInterface } from "@langchain/core/tools";

export function createLegalTools(): StructuredToolInterface[] {
  const { tavilyApiKey } = getConfig();

  const tavilyApi = new TavilySearchAPIWrapper({ tavilyApiKey });

  // Custom Tavily tool with query-only schema to avoid LLM passing invalid timeRange (e.g. "None")
  const tavilySearch = tool(
    async ({ query }) => {
      const result = await tavilyApi.rawResults({
        query,
        maxResults: 5,
        searchDepth: "basic",
        topic: "general",
      });
      const results = (result as { results?: Array<{ title?: string; content?: string }> }).results ?? [];
      return JSON.stringify(results.map((r) => ({ title: r.title, content: r.content })));
    },
    {
      name: "tavily_search",
      description:
        "Search for legal case facts, rulings, statutes, and background. Use query format: '[topic] facts ruling legal background'",
      schema: z.object({
        query: z.string().describe("Search query for legal facts, rulings, or background"),
      }),
    }
  );

  const requestEvidence = tool(
    async ({ evidenceType }) =>
      `Evidence not yet available (stub). Requested: ${evidenceType}`,
    {
      name: "request_evidence",
      description: "Request a specific piece of evidence (e.g. surveillance footage, witness testimony)",
      schema: z.object({ evidenceType: z.string() }),
    }
  );

  const lookupPrecedent = tool(
    async ({ query }) =>
      `Precedent search not yet available (stub). Query: ${query}`,
    {
      name: "lookup_precedent",
      description: "Semantic search over case precedents. Use for citing relevant prior cases.",
      schema: z.object({ query: z.string() }),
    }
  );

  const fileMotion = tool(
    async ({ motionType, rationale }) =>
      `Motion filed: ${motionType}${rationale ? ` (${rationale})` : ""}`,
    {
      name: "file_motion",
      description: "File a legal motion (e.g. motion to suppress, motion to dismiss)",
      schema: z.object({
        motionType: z.string(),
        rationale: z.string().optional(),
      }),
    }
  );

  const crossExamine = tool(
    async ({ evidenceOrTestimony }) =>
      `Cross-examination noted: ${evidenceOrTestimony}`,
    {
      name: "cross_examine",
      description: "Challenge a specific piece of evidence or testimony",
      schema: z.object({ evidenceOrTestimony: z.string() }),
    }
  );

  const restCase = tool(
    async () => "Case rested.",
    {
      name: "rest_case",
      description: "Signal that you have finished your argument and are resting your case",
      schema: z.object({}),
    }
  );

  return [
    tavilySearch,
    requestEvidence,
    lookupPrecedent,
    fileMotion,
    crossExamine,
    restCase,
  ];
}
