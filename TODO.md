# CaseSnipe.ai — Big Picture TODO

Based on [CLAUDE.md](./CLAUDE.md). Check off items as they're completed.

---

## Backend — Agents & Tools

- [x] **Case Agent** — Tavily search + LLM, neutral court briefing
- [x] **Prosecutor Agent** — AgentExecutor (createReactAgent), shared tools, argues for conviction
- [x] **Defendant Agent** — AgentExecutor (createReactAgent), shared tools, argues for acquittal
- [x] **Judge Agent** — LLMChain, full transcript → structured verdict (ruling, reasoning, confidence)
- [x] **tavily_search** — Real web search for legal research
- [x] **lookup_precedent** — RAG over 8k case summaries (MemoryVectorStore; toggle in TopBar)
- [x] **request_evidence** — Evidence simulator (real — uses cases bank)
- [x] **file_motion, cross_examine, rest_case** — Legal action tools

---

## Backend — Data & Orchestration

- [x] **RAG precedent engine** — HuggingFace dataset, MemoryVectorStore index, wire to `lookup_precedent`
- [x] **Cases bank** — 20+ curated cases (easy / medium / hard tiers)
- [x] **Evidence simulator** — Realistic evidence per case for `request_evidence`
- [x] **Turn-taking orchestration** — Orchestrator: Case → Prosecution → Defense → (repeat) → Judge
- [x] **Trial transcript in context** — Full transcript passed to agents via orchestrator

---

## Frontend

- [x] **Three-panel courtroom UI** — Prosecution left, Judge center, Defense right
- [x] **LangChain streaming connector** — SSE stream, tool calls live as each agent reasons
- [x] **Model switcher** — Swap Nebius models per role (TopBar)
- [x] **Benchmark UI** — BenchmarkBar with Artificial Analysis-style stats per role
- [x] **Evidence & motions log** — Updated live in JudgePanel and AgentPanel
- [x] **API key config screen** — Gear icon modal: status display, Test Connection per key, instructions & links (OpenRouter, Tavily, Nebius)
- [x] **Game over / results screen** — Verdict, both arguments, motions, final score (GameOverScreen)

---

## Integration & Polish

- [x] **Wire backend into frontend** — Full trial loop via `/api/trial/stream`, useTrialStream hook
- [x] **Scoring logic** — Penalize weak arguments, reward reasoning (lib/scoring.ts)
- [x] **Prompt tuning** — Character identity anchoring, forbidden LLM phrases, in-scene turn inputs, in-character uncertainty handling
- [x] **Demo polish** — 3 showcase cases with taglines: shoplifting-001 (easy), selfdefense-001 (medium), fraud-001 (hard); balanced evidence on easy case

---

## Notes

- **LLM**: Uses OpenRouter (orchestrator) / Nebius fallback
- **RAG**: Optional; `lookup_precedent` has keyword stubs; FAISS adds real precedent citations
- **API keys**: Stored in .env.local; in-app config screen (gear icon) shows status and Test Connection per key
