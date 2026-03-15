# SymptomSnipe.ai — CLAUDE.md

## Project Overview

A multi-agent medical diagnosis game where two LangChain-powered AI agents interact: a **Patient Agent** (Tavily-grounded, MiniMax-backed) presents real symptoms, and a **Nurse Agent** (Nebius open LLMs via Token Factory) autonomously plans, calls tools, and makes a diagnosis. The game also doubles as a **live LLM benchmark** — swap any Nebius model in and watch how reasoning quality changes in real time.

## Architecture

```
Nebius Open LLMs (via Token Factory)
           ↓
  LangChain AgentExecutor
   /                   \
Patient Agent          Nurse Agent
(MiniMax +             (Nebius LLM +
 Tavily search)         Reasoning loop)
           ↓
  Tool calls: search, test simulator, vitals
           ↓
  Hugging Face (fine-tuned triage model, optional)
```

### Game Flow
1. Pick/generate a medical condition
2. Tavily (as a LangChain tool) scrapes real symptom data for that condition
3. Patient presents symptoms to Nurse via a LangChain `RunnableSequence`
4. Nurse AgentExecutor autonomously decides next actions — ask questions, call tools, order tests
5. Patient answers using Tavily-grounded data; MiniMax maintains full patient history
6. Nurse diagnoses and proposes treatment
7. Score calculated: penalize unnecessary tests, reward speed and accuracy

### The Two Agents

**Patient Agent**
- Uses **Tavily as a LangChain tool** for structured, real-world symptom retrieval
- Backed by **MiniMax** for long-context patient history summarization
- System-prompted to roleplay as a patient describing symptoms naturally
- Search format: `"[condition] symptoms presentation"`

**Nurse Agent**
- Backed by **Nebius open LLMs** (routed via Token Factory / OpenRouter)
- Runs inside a **LangChain `AgentExecutor`** — fully agentic reasoning loop
- Autonomously decides its own next action at each step:
  - `tavily_search("CBC normal ranges")` — verify clinical knowledge
  - `run_test("chest_xray")` — order and receive test results
  - `lookup_drug("amoxicillin dosage")` — check treatment options
  - `diagnose("pneumonia")` — conclude with final diagnosis
- **LangChain conversation memory** keeps full patient history in context
- LangChain **callbacks** provide real-time observability of tool calls

## Tech Stack

| Tool | Role |
|------|------|
| **LangChain** | AgentExecutor, tool binding, memory, RunnableSequence orchestration |
| **Nebius Open LLMs** | Nurse agent backbone (via Token Factory / OpenRouter) |
| **MiniMax** | Long-context patient history — Patient agent summarization |
| **Tavily** | Patient agent's web search, registered as a LangChain tool |
| **OpenRouter** | Model routing layer for Nebius model access |
| **React** | Frontend UI |
| **Hugging Face** | Optional: fine-tuned medical triage model with Oumi |
| **Oumi** | Fine-tune Nurse agent on medical datasets |
| **Toloka HomER dataset** | Training data for the Nurse agent |

## Frontend

React app with a **two-panel "medical terminal" UI**:
- **Left panel**: Patient ↔ Nurse chat log with live LangChain tool call stream
- **Right panel**: Vitals, test results, and active model benchmark display

### Key UI Components
1. Two-panel layout with medical terminal aesthetic
2. **LangChain streaming connector** — shows tool calls live as the Nurse reasons
3. **Model switcher** — swap Nebius models mid-game; display Artificial Analysis-style benchmark stats (speed, accuracy, test efficiency)
4. Scoring display — shown at game end
5. API key config screen — input for OpenRouter + Tavily keys (for judges)
6. Game over / results screen — correct condition, Nurse's guess, tests ordered, final score

## Backend / Agent Logic

### LangChain Orchestration Layer
- **`AgentExecutor`** drives the Nurse's autonomous reasoning loop — no hardcoded turn-taking
- **`RunnableSequence`** handles the Patient → Nurse handoff cleanly
- **Callbacks** emit tool-call events to the frontend via streaming
- **ConversationBufferMemory** keeps the full dialogue in context for both agents

### Patient Agent
- Initialized with Tavily registered as a LangChain tool
- MiniMax handles long-context compression of symptom history
- Formats real web symptom data naturally as patient dialogue

### Nurse Agent
- Powered by a Nebius open LLM loaded via Token Factory / OpenRouter
- Tool suite registered in LangChain (see Tools below)
- Asks questions, orders tests, interprets results, and concludes with a diagnosis
- Must NOT receive the condition name — reasons purely from symptoms and tool results

### Nurse Tool Suite (LangChain Tools)
| Tool | Description |
|------|-------------|
| `tavily_search` | Look up clinical reference data (normal ranges, drug info, etc.) |
| `run_test` | Order a diagnostic test (CBC, X-ray, urinalysis…) → returns realistic results |
| `get_vitals` | Retrieve current patient vitals |
| `lookup_drug` | Check dosage, contraindications, and interactions |
| `diagnose` | Submit final diagnosis and treatment plan (ends the game loop) |

### Conditions Bank
- 20–30 curated conditions with difficulty tiers:
  - **Easy**: flu, strep throat, UTI
  - **Medium**: appendicitis, pneumonia, GERD
  - **Hard**: lupus, MS, Crohn's disease

### Test Results Simulator
- Called via the `run_test` LangChain tool
- Returns realistic lab/imaging results conditioned on the actual hidden condition

## Team Split

**Person 1 — Frontend & LangChain Orchestration**
| # | Task | Details |
|---|------|---------|
| 1 | Build the React UI | Two-panel layout: Patient chat left, Nurse + vitals/tests right. Medical terminal aesthetic. |
| 2 | Set up LangChain `AgentExecutor` | Tool loop, memory, RunnableSequence for Patient → Nurse handoff |
| 3 | Wire LangChain streaming to UI | Show tool calls and reasoning steps live as the Nurse works |
| 4 | Model switcher + benchmark UI | Swap Nebius models; display Artificial Analysis-style stats (speed, accuracy, test count) |
| 5 | Scoring + game over screen | Show correct condition, Nurse's guess, tests ordered, final score |

**Person 2 — Tools, Agents & Data Pipeline**
| # | Task | Details |
|---|------|---------|
| 1 | Patient agent | System prompt + Tavily as LangChain tool; MiniMax for history |
| 2 | Nurse tool suite | Implement `run_test`, `get_vitals`, `lookup_drug`, `diagnose` as LangChain tools |
| 3 | Nebius Token Factory integration | Wire Nebius open LLMs via OpenRouter into LangChain's LLM interface |
| 4 | MiniMax integration | Extended patient history summarization for long sessions |
| 5 | Conditions bank + test simulator | 20–30 conditions, realistic test results per condition |

**Shared**
- Wire Person 2's agent functions into Person 1's AgentExecutor / game loop
- Prompt tuning — iterate system prompts until the game feels natural and the Nurse reasons well
- Demo polish — pick 3 showcase conditions (one easy, one medium, one hard) for the pitch

## Hackathon Timeline

| Time | Milestone |
|------|-----------|
| Hour 1–2 | Person 1: UI skeleton · Person 2: Tavily LangChain tool + Patient agent working |
| Hour 3–4 | Person 1: AgentExecutor + streaming · Person 2: Nurse tools + test simulator |
| Hour 5 | Integration — wire agents into UI, validate full game loop |
| Hour 6 | Model switcher, scoring, benchmark display, demo condition polish |
| Final 30 min | Practice pitch, fix bugs |

## Pitch Angle

> *"SymptomSniped is a multi-agent medical reasoning game built on LangChain + Nebius open LLMs. The Nurse agent autonomously plans, calls tools, and diagnoses — while the Patient agent uses Tavily to ground symptoms in real web data. It's also a live benchmark: swap any Nebius model in and watch how reasoning quality changes in real time."*

Hits: **agentic pipelines · real-world utility · open LLMs · Artificial Analysis benchmarking**

## Development Notes

- Keep API keys out of source — use environment variables or the in-app config screen
- The Nurse agent must NOT receive the condition name — it reasons from symptoms and tool results only
- Score penalizes: unnecessary `run_test` calls, incorrect final diagnosis
- Score rewards: correct diagnosis, fewer tools used, faster turn resolution
- LangChain callbacks are the observability layer — log every tool call for scoring and the UI stream
- Aim for 3 polished demo conditions: one easy (flu), one medium (pneumonia), one hard (lupus)
