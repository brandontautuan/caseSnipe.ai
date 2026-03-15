/**
 * CaseSnipe.ai — Cases Bank
 * 20+ curated cases across three difficulty tiers.
 */

export type Difficulty = "easy" | "medium" | "hard";
export type CaseOutcome = "guilty" | "not_guilty" | "liable" | "not_liable";

export interface LegalCase {
  id: string;
  title: string;
  difficulty: Difficulty;
  /** One-line hook shown on the case selection screen */
  tagline: string;
  charges: string;
  synopsis: string;
  /** Hidden from agents — used only for scoring */
  hiddenOutcome: CaseOutcome;
  keyFacts: string[];
  availableEvidence: EvidenceItem[];
}

export interface EvidenceItem {
  id: string;
  name: string;
  description: string;
  /** Which side this evidence favors */
  favorsSide: "prosecution" | "defense" | "neutral";
  available: boolean;
}

export const CASES: LegalCase[] = [
  // ── EASY ──────────────────────────────────────────────────────────────────
  {
    id: "shoplifting-001",
    title: "People v. Marcus Webb — Grand Theft",
    difficulty: "easy",
    tagline: "Four laptops. One stroller. Zero receipts.",
    charges: "Grand Theft (PC 487) — theft of electronics valued at $4,800",
    synopsis:
      "Marcus Webb is accused of entering a Best Buy store and removing four laptops concealed in a stroller. Surveillance footage shows him entering with an empty stroller and leaving with a visibly full one. He was apprehended in the parking lot. Webb claims the items belonged to a friend and he was unaware they were in the stroller.",
    hiddenOutcome: "guilty",
    keyFacts: [
      "Defendant entered with empty stroller, exited with stroller containing 4 laptops",
      "Store surveillance captured full sequence",
      "Defendant had no receipt",
      "Loss prevention stopped defendant in parking lot",
      "Defendant claims he was holding the stroller for a companion who never appeared",
      "Laptops recovered intact",
    ],
    availableEvidence: [
      {
        id: "e1",
        name: "Surveillance footage — Exhibit A",
        description: "Clear video of defendant entering with empty stroller and exiting with concealed laptops. No companion is visible on footage.",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e2",
        name: "Loss prevention testimony",
        description: "LP officer testifies they observed concealment behavior and that defendant was alone throughout",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e3",
        name: "Receipt search",
        description: "No purchase record found for defendant in store system on that date",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e4",
        name: "Defendant's employment records",
        description: "Defendant was recently laid off — establishes financial motive",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e5",
        name: "Character witness",
        description: "Neighbor testifies defendant has no prior criminal history and regularly helps neighbors with childcare",
        favorsSide: "defense",
        available: true,
      },
      {
        id: "e6",
        name: "Surveillance blind spot analysis",
        description: "Defense expert notes a 40-second gap in camera coverage near the entrance — companion entry cannot be fully ruled out",
        favorsSide: "defense",
        available: true,
      },
    ],
  },
  {
    id: "assault-001",
    title: "State v. Torres — Simple Assault",
    difficulty: "easy",
    tagline: "He threw the first punch. Or did he?",
    charges: "Simple Assault (PC 240) — punch to victim at a bar",
    synopsis:
      "David Torres is accused of striking victim Kyle Marsh at O'Malley's Bar after a verbal altercation. Two eyewitnesses observed the punch. Torres claims Marsh provoked him with racial slurs.",
    hiddenOutcome: "guilty",
    keyFacts: [
      "Two eyewitnesses confirm defendant threw the first punch",
      "Victim sustained bruised jaw — medical report on file",
      "Bar security footage partially captured the incident",
      "Verbal altercation preceded the punch",
      "Defendant admitted to striking victim in police interview",
    ],
    availableEvidence: [
      {
        id: "e1",
        name: "Medical report",
        description: "ER report documenting jaw bruising consistent with a punch",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e2",
        name: "Eyewitness testimony x2",
        description: "Two patrons confirm defendant struck first",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e3",
        name: "Defendant's police statement",
        description: "Defendant admitted to striking the victim but claims self-defense",
        favorsSide: "neutral",
        available: true,
      },
      {
        id: "e4",
        name: "Bar security footage",
        description: "Partial footage — shows post-punch scene but not the strike itself",
        favorsSide: "defense",
        available: true,
      },
    ],
  },
  {
    id: "contract-001",
    title: "Henderson v. Smith Roofing — Breach of Contract",
    difficulty: "easy",
    tagline: "Half a roof. Full payment. No change order.",
    charges: "Breach of Contract — failure to complete roofing job per agreement",
    synopsis:
      "Plaintiff Linda Henderson hired Smith Roofing for a $12,000 roof replacement. Smith Roofing completed 60% of the job, collected full payment, and ceased work citing 'material disputes.' Henderson seeks full refund plus damages.",
    hiddenOutcome: "liable",
    keyFacts: [
      "Signed contract specifies full roof replacement for $12,000",
      "Full payment was collected upfront",
      "Roof is 60% complete — photos on record",
      "Defendant claims Henderson changed the material spec mid-job",
      "No written change order exists",
    ],
    availableEvidence: [
      {
        id: "e1",
        name: "Signed contract",
        description: "Original agreement specifying full replacement, materials, and timeline",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e2",
        name: "Payment receipt",
        description: "Bank record showing full $12,000 payment on day 1",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e3",
        name: "Roof inspection photos",
        description: "Licensed inspector confirms 60% completion — exposed underlayment visible",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e4",
        name: "Text message exchange",
        description: "Texts show Henderson asked about a different shingle color, not material change",
        favorsSide: "prosecution",
        available: true,
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────
  {
    id: "selfdefense-001",
    title: "People v. Chen — Assault with Deadly Weapon (Self-Defense)",
    difficulty: "medium",
    tagline: "He broke down her door at 2 AM. She had a knife.",
    charges: "Assault with a Deadly Weapon (PC 245(a)) — stabbing during home confrontation",
    synopsis:
      "Amy Chen is accused of stabbing her ex-boyfriend Derek Paulson who entered her apartment at 2 AM after she had obtained a restraining order against him. Paulson survived. Chen claims she acted in self-defense after he broke down her door and threatened her.",
    hiddenOutcome: "not_guilty",
    keyFacts: [
      "Active restraining order against Paulson at time of incident",
      "Door frame shows forced entry",
      "911 call made by Chen before incident — she reported Paulson was outside",
      "Paulson's blood alcohol level was 0.19",
      "Chen had bruising on her wrists consistent with a struggle",
      "No prior violence on Chen's record",
    ],
    availableEvidence: [
      {
        id: "e1",
        name: "Active restraining order",
        description: "Court-issued TRO prohibiting Paulson from coming within 100 yards of Chen",
        favorsSide: "defense",
        available: true,
      },
      {
        id: "e2",
        name: "911 call recording",
        description: "Chen called police 4 minutes before stabbing, reporting Paulson at her door",
        favorsSide: "defense",
        available: true,
      },
      {
        id: "e3",
        name: "Forensic door analysis",
        description: "Forensic report confirms door was forced from outside — not opened from inside",
        favorsSide: "defense",
        available: true,
      },
      {
        id: "e4",
        name: "Toxicology report",
        description: "Paulson's BAC was 0.19 — highly intoxicated",
        favorsSide: "defense",
        available: true,
      },
      {
        id: "e5",
        name: "Medical examination of Chen",
        description: "ER report documents wrist bruising consistent with defensive struggle",
        favorsSide: "defense",
        available: true,
      },
      {
        id: "e6",
        name: "Knife ownership",
        description: "Knife belonged to Chen — no evidence of premeditation",
        favorsSide: "neutral",
        available: true,
      },
    ],
  },
  {
    id: "wrongtermination-001",
    title: "Rodriguez v. Apex Corp — Wrongful Termination",
    difficulty: "medium",
    tagline: "She filed a safety complaint. Two weeks later she was gone.",
    charges: "Wrongful Termination — retaliation for whistleblowing",
    synopsis:
      "Maria Rodriguez was terminated from Apex Corp two weeks after filing an internal safety complaint about unreported chemical spills. Apex claims she was terminated for performance reasons as part of a broader layoff.",
    hiddenOutcome: "liable",
    keyFacts: [
      "Rodriguez was terminated 14 days after filing safety complaint",
      "She had received 'Exceeds Expectations' on her last review 3 months prior",
      "Six employees were laid off — Rodriguez was the only one who had filed a complaint",
      "No performance improvement plan was issued",
      "Email from VP of Operations references 'that safety woman' a week before termination",
    ],
    availableEvidence: [
      {
        id: "e1",
        name: "Termination timeline",
        description: "HR records show 14-day gap between complaint filing and termination",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e2",
        name: "Performance review",
        description: "Rodriguez's last review: 'Exceeds Expectations' — dated 3 months before termination",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e3",
        name: "VP email",
        description: "Internal email from VP referencing 'the safety woman' in context of headcount reduction",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e4",
        name: "Layoff documentation",
        description: "Company documents show layoff was announced before complaint — defense claims preemptive",
        favorsSide: "defense",
        available: true,
      },
      {
        id: "e5",
        name: "Performance metrics comparison",
        description: "Other laid-off employees had lower performance scores than Rodriguez",
        favorsSide: "prosecution",
        available: true,
      },
    ],
  },
  {
    id: "dui-001",
    title: "People v. Okafor — DUI with Contested Evidence",
    difficulty: "medium",
    tagline: "BAC 0.09. Machine last calibrated 8 months ago.",
    charges: "DUI (VC 23152) — BAC 0.09 at time of breathalyzer",
    synopsis:
      "James Okafor was pulled over after swerving twice on Highway 101 at 11:30 PM. Breathalyzer reading was 0.09. Okafor claims the machine was miscalibrated and he had only consumed two glasses of wine. Field sobriety tests were inconclusive.",
    hiddenOutcome: "not_guilty",
    keyFacts: [
      "BAC reading: 0.09 (just above 0.08 legal limit)",
      "Breathalyzer last calibrated 8 months prior (required: every 6 months)",
      "Field sobriety tests noted as 'inconclusive' by officer",
      "Dashcam shows two lane drifts but no collision",
      "Okafor cooperated fully with officers",
    ],
    availableEvidence: [
      {
        id: "e1",
        name: "Breathalyzer calibration records",
        description: "Device was last calibrated 8 months ago — 2 months past required interval",
        favorsSide: "defense",
        available: true,
      },
      {
        id: "e2",
        name: "Field sobriety report",
        description: "Officer notes tests as 'inconclusive' — not a clear fail",
        favorsSide: "defense",
        available: true,
      },
      {
        id: "e3",
        name: "Dashcam footage",
        description: "Shows two lane drifts but no erratic behavior beyond that",
        favorsSide: "neutral",
        available: true,
      },
      {
        id: "e4",
        name: "Blood test result",
        description: "Blood draw taken 90 minutes after stop — BAC 0.07 (below legal limit)",
        favorsSide: "defense",
        available: true,
      },
      {
        id: "e5",
        name: "Breathalyzer model recall notice",
        description: "This model had known +0.01 reading variance in cold weather",
        favorsSide: "defense",
        available: true,
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────
  {
    id: "fraud-001",
    title: "US v. Nakamura — Securities Fraud",
    difficulty: "hard",
    tagline: "$40M sold 48 hours before the stock collapsed. Coincidence?",
    charges: "Securities Fraud (15 U.S.C. § 78j) — insider trading and market manipulation",
    synopsis:
      "CEO Richard Nakamura sold $40M in stock two days before his company announced a failed drug trial, causing shares to drop 62%. Prosecutors allege he used material non-public information. Defense argues the sale was part of a pre-scheduled 10b5-1 plan.",
    hiddenOutcome: "guilty",
    keyFacts: [
      "Nakamura sold $40M in shares 48 hours before negative trial results published",
      "Stock dropped 62% on announcement day",
      "A 10b5-1 plan was on file — but it was modified 6 weeks before the trial results",
      "Internal emails show Nakamura received preliminary trial data 3 months prior",
      "Two other executives sold shares in the same 48-hour window",
      "10b5-1 plan modification occurred the same day as the preliminary data report",
    ],
    availableEvidence: [
      {
        id: "e1",
        name: "SEC trading records",
        description: "$40M stock sale — timestamped 48 hours before announcement",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e2",
        name: "10b5-1 plan on file",
        description: "Pre-scheduled trading plan exists — defense's primary argument",
        favorsSide: "defense",
        available: true,
      },
      {
        id: "e3",
        name: "Plan modification record",
        description: "Plan was modified on same day preliminary trial data was internally distributed",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e4",
        name: "Internal email chain",
        description: "Nakamura received preliminary negative data 3 months before sale",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e5",
        name: "Co-executive trading records",
        description: "Two other executives sold shares in the same 48-hour window",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e6",
        name: "Expert financial analysis",
        description: "Defense expert: stock sale was within normal range of Nakamura's historical trading",
        favorsSide: "defense",
        available: true,
      },
    ],
  },
  {
    id: "constitutional-001",
    title: "Collins v. City of Riverdale — Fourth Amendment Violation",
    difficulty: "hard",
    tagline: "No warrant. 200g found. Was the entry legal?",
    charges: "Civil rights violation (42 U.S.C. § 1983) — warrantless search and seizure",
    synopsis:
      "Police officers entered Marcus Collins' home without a warrant after receiving an anonymous tip about drugs. Officers claim exigent circumstances justified the entry after hearing 'loud sounds.' Collins argues the entry was unconstitutional and seeks suppression of all evidence.",
    hiddenOutcome: "not_liable",
    keyFacts: [
      "Anonymous tip alleged drug activity — no corroboration",
      "Officers heard 'loud sounds' from inside before entry",
      "No warrant was obtained",
      "Drug evidence found inside — 200g cocaine",
      "Bodycam shows officers knocking and announcing before entry",
      "Neighbor corroborates hearing loud argument from the home",
    ],
    availableEvidence: [
      {
        id: "e1",
        name: "Police bodycam footage",
        description: "Shows officers knocked, announced, heard loud sounds, then entered — 45 seconds elapsed",
        favorsSide: "defense",
        available: true,
      },
      {
        id: "e2",
        name: "Neighbor testimony",
        description: "Neighbor confirms hearing 'shouting and crashing sounds' from Collins' home",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e3",
        name: "Anonymous tip record",
        description: "Tip was anonymous with no corroborating detail — no independent verification",
        favorsSide: "defense",
        available: true,
      },
      {
        id: "e4",
        name: "Drug evidence",
        description: "200g cocaine found in kitchen — if suppressed, case collapses",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e5",
        name: "Precedent: Kentucky v. King (2011)",
        description: "SCOTUS: police-created exigency does not automatically invalidate warrantless entry",
        favorsSide: "prosecution",
        available: true,
      },
      {
        id: "e6",
        name: "No destruction of evidence",
        description: "No evidence that Collins was destroying drugs — counters exigent circumstances claim",
        favorsSide: "defense",
        available: true,
      },
    ],
  },
];

export function getCaseById(id: string): LegalCase | undefined {
  return CASES.find((c) => c.id === id);
}

export function getCasesByDifficulty(difficulty: Difficulty): LegalCase[] {
  return CASES.filter((c) => c.difficulty === difficulty);
}

/** Demo cases for the pitch — one per difficulty tier */
export const DEMO_CASES = {
  easy:   "shoplifting-001",
  medium: "selfdefense-001",
  hard:   "fraud-001",
};
