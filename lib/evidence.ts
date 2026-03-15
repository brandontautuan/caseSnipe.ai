/**
 * CaseSnipe.ai — Evidence Simulator
 * Called via the request_evidence LangChain tool.
 * Returns realistic evidence conditioned on the case — can favor either side.
 */

import { getCaseById, type LegalCase, type EvidenceItem } from "./cases";

export interface EvidenceResult {
  found: boolean;
  evidence?: EvidenceItem;
  message: string;
}

/**
 * Fuzzy-match an evidence request to available evidence for the case.
 * Returns the best match or a "not available" response.
 */
export function requestEvidence(caseId: string, request: string): EvidenceResult {
  const legalCase = getCaseById(caseId);
  if (!legalCase) {
    return { found: false, message: "Case not found." };
  }

  const query = request.toLowerCase();
  const available = legalCase.availableEvidence.filter((e) => e.available);

  // Score each evidence item against the query
  const scored = available.map((item) => {
    const text = `${item.name} ${item.description}`.toLowerCase();
    const words = query.split(/\s+/);
    const matches = words.filter((w) => w.length > 3 && text.includes(w)).length;
    return { item, score: matches };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  if (!best || best.score === 0) {
    return {
      found: false,
      message: `No evidence matching "${request}" found in this case. Consider requesting: ${available.map((e) => e.name).join(", ")}.`,
    };
  }

  return {
    found: true,
    evidence: best.item,
    message: `Evidence obtained: ${best.item.name}. ${best.item.description}`,
  };
}

/**
 * Format a case briefing for the Case Agent to deliver to both sides.
 */
export function formatCaseBriefing(legalCase: LegalCase): string {
  return `
CASE BRIEFING — COURT OF LAW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Case: ${legalCase.title}
Charges: ${legalCase.charges}
Difficulty: ${legalCase.difficulty.toUpperCase()}

SYNOPSIS:
${legalCase.synopsis}

KEY FACTS ON RECORD:
${legalCase.keyFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

AVAILABLE EVIDENCE (request via request_evidence tool):
${legalCase.availableEvidence.filter((e) => e.available).map((e) => `• ${e.name}`).join("\n")}

Both sides have access to the same evidence pool. Evidence may favor either party.
The outcome is not predetermined — argue from the facts.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}
