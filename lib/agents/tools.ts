/**
 * CaseSnipe.ai — Shared LangChain Tool Suite
 * Available to both Prosecutor and Defendant AgentExecutors.
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { OpenAIEmbeddings } from "@langchain/openai";
import { requestEvidence } from "../evidence";
import { getPrecedentStore } from "../rag/precedent-store";

// Sentinel value returned by rest_case — orchestrator watches for this
export const REST_CASE_SIGNAL = "__REST_CASE__";

/**
 * Build the full tool suite bound to a specific case ID.
 * Call once per agent per trial.
 * @param ragMode When true, lookup_precedent uses RAG; when false, uses keyword stubs.
 */
export function buildTools(caseId: string, ragMode = false) {
  const tavilySearch = new DynamicStructuredTool({
    name: "tavily_search",
    description:
      "Search the web for legal background, statutes, case law, or relevant facts. Use for researching legal standards and definitions.",
    schema: z.object({
      query: z.string().describe("Search query — e.g. 'California PC 487 grand theft elements'"),
    }),
    func: async ({ query }) => {
      // Tavily is called via the backend. If TAVILY_API_KEY is set, use real search.
      // Falls back to a mock response so the agent loop works without keys.
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        return `[MOCK — no Tavily key] Search results for "${query}": This would return relevant legal statutes, case law, and background. Configure TAVILY_API_KEY for live results.`;
      }

      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: "basic",
            max_results: 3,
            include_answer: true,
          }),
        });
        const data = await res.json();
        const answer = data.answer || "";
        const snippets = (data.results || [])
          .slice(0, 3)
          .map((r: { title: string; content: string }) => `• ${r.title}: ${r.content?.slice(0, 200)}`)
          .join("\n");
        return `${answer}\n\nSources:\n${snippets}`.trim();
      } catch {
        return `Search failed for "${query}". Proceeding with general legal knowledge.`;
      }
    },
  });

  const requestEvidenceTool = new DynamicStructuredTool({
    name: "request_evidence",
    description:
      "Request a specific piece of evidence from the court record. Describe what you are looking for.",
    schema: z.object({
      description: z
        .string()
        .describe("Description of the evidence you want — e.g. 'surveillance footage' or 'toxicology report'"),
    }),
    func: async ({ description }) => {
      const result = requestEvidence(caseId, description);
      return result.message;
    },
  });

  const lookupPrecedent = new DynamicStructuredTool({
    name: "lookup_precedent",
    description:
      "Semantic search over thousands of real court case summaries. Use to find relevant precedents to support your argument.",
    schema: z.object({
      query: z
        .string()
        .describe("Legal concept or fact pattern to search — e.g. 'self-defense reasonable force'"),
    }),
    func: async ({ query }) => {
      if (!ragMode) {
        // Stub path when RAG mode off
        const stubs: Record<string, string> = {
          "self-defense":
            "People v. Humphrey (1996): jury must consider defendant's perspective given history of abuse. | State v. Norman (1989): subjective fear test — defendant's belief of imminent harm need not be objectively reasonable in all jurisdictions.",
          "reasonable doubt":
            "In re Winship (1970, SCOTUS): prosecution must prove every element beyond reasonable doubt. | Jackson v. Virginia (1979): rational trier of fact standard for reviewing sufficiency.",
          burglary:
            "People v. Davis (2014): intent may be inferred from circumstantial evidence including manner of entry. | People v. Gauze (1975): burglary requires entry of a structure not one's own.",
          fraud:
            "United States v. Skilling (2010): honest services fraud requires bribery or kickback scheme. | Matrixx Initiatives v. Siracusano (2011): materiality in securities fraud is fact-specific.",
          "wrongful termination":
            "Tameny v. Atlantic Richfield (1980): termination in violation of public policy is actionable. | Foley v. Interactive Data Corp (1988): implied covenant of good faith applies in employment.",
          "fourth amendment":
            "Kentucky v. King (2011): exigent circumstances exception valid unless police manufactured emergency. | Katz v. United States (1967): reasonable expectation of privacy standard.",
        };
        const q = query.toLowerCase();
        for (const [key, cases] of Object.entries(stubs)) {
          if (q.includes(key)) {
            return `Precedents found for "${query}":\n${cases}`;
          }
        }
        return `No direct precedents indexed for "${query}". Consider rephrasing or using tavily_search for case law research.`;
      }

      // RAG path: semantic search over precedent index
      const apiKey = process.env.OPENROUTER_API_KEY?.trim();
      if (!apiKey) {
        return "Precedent index requires OPENROUTER_API_KEY. Add it to .env.local.";
      }
      const embeddings = new OpenAIEmbeddings({
        model: "openai/text-embedding-3-small", // OpenRouter model path
        apiKey,
        configuration: { baseURL: "https://openrouter.ai/api/v1" },
      });
      const store = await getPrecedentStore(embeddings);
      if (!store) {
        return "Precedent index not built. Run `npm run build:precedent`.";
      }
      const docs = await store.similaritySearch(query, 3);
      if (docs.length === 0) {
        return `No precedents found for "${query}". Consider rephrasing or using tavily_search for case law research.`;
      }
      const lines = docs.map((d, i) => `${i + 1}. ${d.pageContent.slice(0, 500)}${d.pageContent.length > 500 ? "..." : ""}`);
      return `Precedents found for "${query}":\n\n${lines.join("\n\n")}`;
    },
  });

  const fileMotion = new DynamicStructuredTool({
    name: "file_motion",
    description:
      "File a formal legal motion with the court. Use for motions to suppress, dismiss, compel, or admit evidence.",
    schema: z.object({
      motionType: z
        .string()
        .describe("Type of motion — e.g. 'motion to suppress', 'motion to dismiss', 'motion to compel'"),
      grounds: z.string().describe("Legal grounds for the motion"),
    }),
    func: async ({ motionType, grounds }) => {
      return `Motion filed: ${motionType}. Grounds: ${grounds}. Motion entered into the court record. The Judge will rule on this motion during deliberation.`;
    },
  });

  const crossExamine = new DynamicStructuredTool({
    name: "cross_examine",
    description:
      "Challenge a specific piece of evidence or testimony. Use to question reliability, chain of custody, or relevance.",
    schema: z.object({
      target: z.string().describe("The evidence or testimony being challenged"),
      challenge: z.string().describe("The basis for your challenge"),
    }),
    func: async ({ target, challenge }) => {
      return `Cross-examination on record: "${target}" challenged on grounds of: ${challenge}. Court notes the challenge. Prosecution may respond in their next turn.`;
    },
  });

  const restCase = new DynamicStructuredTool({
    name: "rest_case",
    description:
      "Signal that you have concluded your argument for this turn. Call this when you are done presenting your case for the round.",
    schema: z.object({
      summary: z.string().describe("One-sentence summary of your argument this round"),
    }),
    func: async ({ summary }) => {
      return `${REST_CASE_SIGNAL}:${summary}`;
    },
  });

  return [tavilySearch, requestEvidenceTool, lookupPrecedent, fileMotion, crossExamine, restCase];
}
