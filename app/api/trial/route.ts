/**
 * POST /api/trial
 * Runs a full trial and returns the transcript + verdict as JSON.
 * Phase 2C will upgrade this to SSE streaming.
 */

import { NextRequest, NextResponse } from "next/server";
import { runTrial } from "@/lib/agents/orchestrator";
import { DEFAULT_PROSECUTION_MODEL, DEFAULT_DEFENSE_MODEL, DEFAULT_JUDGE_MODEL } from "@/lib/agents/models";
import { CASES } from "@/lib/cases";

export async function POST(req: NextRequest) {
  let body: {
    caseId?: string;
    prosecutionModel?: string;
    defenseModel?: string;
    judgeModel?: string;
    maxRounds?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    caseId = CASES[0].id,
    prosecutionModel = DEFAULT_PROSECUTION_MODEL,
    defenseModel = DEFAULT_DEFENSE_MODEL,
    judgeModel = DEFAULT_JUDGE_MODEL,
    maxRounds = 2,
  } = body;

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not configured. Add it to .env.local." },
      { status: 500 }
    );
  }

  try {
    const result = await runTrial({
      caseId,
      prosecutionModel,
      defenseModel,
      judgeModel,
      maxRounds,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    availableCases: CASES.map((c) => ({
      id: c.id,
      title: c.title,
      difficulty: c.difficulty,
      charges: c.charges,
    })),
    defaultModels: {
      prosecution: DEFAULT_PROSECUTION_MODEL,
      defense: DEFAULT_DEFENSE_MODEL,
      judge: DEFAULT_JUDGE_MODEL,
    },
  });
}
