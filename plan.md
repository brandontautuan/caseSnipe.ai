Patient picks/generates a condition → 
Tavily scrapes real symptom data → 
Patient presents symptoms to Nurse → 
Nurse asks clarifying questions / orders tests → 
Patient answers (from Tavily data) → 
Nurse diagnoses & treats → 
Score: speed, accuracy, unnecessary tests penalized

The Two Agents
	∙	Patient Agent → Uses Tavily for web search to pull accurate, real-world symptom info (Tavily is purpose-built for this — structured, accurate web retrieval)
	∙	Nurse Agent → Uses OpenRouter (with a strong model like Claude or GPT-4o) to reason over symptoms, decide on tests, interpret results, and respond with care plans


Frontend
A React artifact with a two-panel “medical terminal” UI — chat log on one side, vitals/test results panel on the other.

Tool Assignments




||**Tavily**              |Patient agent’s web search for real symptom data              |
|**OpenRouter**          |Both agents’ LLM backbone (cheap, flexible model routing)     |
|**Hugging Face**        |Optional: fine-tune a medical triage model with Oumi          |
|**Oumi**                |Fine-tune Nurse agent on medical datasets (HomER from Toloka!)|
|**Toloka HomER dataset**|Training data for the Nurse agent                             |


Here’s a clean split for a 2-person team:

👤 Person 1 — Frontend & Game Orchestration



|#|Task                          |Details                                                                                                  |
|-|------------------------------|---------------------------------------------------------------------------------------------------------|
|1|**Build the React UI**        |Two-panel layout: Patient chat on left, Nurse + vitals/test results on right. Medical terminal aesthetic.|
|2|**Game loop controller**      |Manage turn-taking between agents, track conversation history, detect when Nurse has made a diagnosis    |
|3|**Scoring system**            |Display score at end — penalize unnecessary tests, reward speed and accuracy of diagnosis                |
|4|**API key config screen**     |Input screen for OpenRouter + Tavily keys so judges can run it easily                                    |
|5|**Game over / results screen**|Show correct condition, what the Nurse guessed, tests ordered, final score                               |

👤 Person 2 — Agent Logic & Data Pipeline



|#|Task                      |Details                                                                                                                   |
|-|--------------------------|--------------------------------------------------------------------------------------------------------------------------|
|1|**Patient agent**         |System prompt + Tavily integration — searches web for real symptoms of a randomly chosen condition, formats them naturally|
|2|**Nurse agent**           |System prompt via OpenRouter — asks questions, orders tests, interprets results, makes a diagnosis                        |
|3|**Tavily search module**  |Fetch and clean symptom data for a given condition (e.g. “pneumonia symptoms presentation”)                               |
|4|**Conditions bank**       |Curated list of 20-30 conditions with difficulty tiers (easy: flu, hard: lupus)                                           |
|5|**Test results simulator**|When Nurse orders a test (e.g. “CBC”, “chest X-ray”), return realistic results based on the condition                     |

🤝 Shared / Integration Tasks
	∙	Wire agents to UI — Person 2’s agent functions plugged into Person 1’s game loop
	∙	Prompt tuning — Both iterate on system prompts together until the game feels natural
	∙	Demo polish — Pick 3 good conditions that showcase the game well for the pitch

Suggested Timeline (hackathon day)



|Time        |Milestone                                                       |
|------------|----------------------------------------------------------------|
|Hour 1-2    |Person 1: UI skeleton · Person 2: Tavily + Patient agent working|
|Hour 3-4    |Person 1: Game loop · Person 2: Nurse agent + test simulator    |
|Hour 5      |Integration — wire everything together                          |
|Hour 6      |Scoring, polish, pick demo conditions                           |
|Final 30 min|Practice pitch, fix bugs                                        |
