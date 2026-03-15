/**
 * CaseSnipe.ai - Defendant Agent API
 * POST /api/agents/defendant
 * Body: { caseBriefing: CaseBriefing; prosecutionArgument?: string; message?: string; turnNumber?: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { runDefendantTurn } from "@/lib/agents/defendant-agent";
import { getConfig } from "@/lib/config";
import { withNebiusFallback } from "@/lib/llms/fallback";
import type { CaseBriefing } from "@/types/agents";

export async function POST(request: NextRequest) {
  try {
    getConfig();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Missing API keys";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    const body = await request.json();
    const caseBriefing = body.caseBriefing as CaseBriefing | undefined;
    const prosecutionArgument = body.prosecutionArgument as string | undefined;
    const message = body.message as string | undefined;
    const turnNumber = (body.turnNumber as number | undefined) ?? 1;

    if (!caseBriefing || typeof caseBriefing !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid caseBriefing in request body" },
        { status: 400 }
      );
    }

    const { caseName, facts } = caseBriefing;
    if (!caseName || typeof caseName !== "string" || !facts || typeof facts !== "string") {
      return NextResponse.json(
        { error: "caseBriefing must have caseName and facts (strings)" },
        { status: 400 }
      );
    }

    const output = await withNebiusFallback(() =>
      runDefendantTurn(
        { caseName, facts, timestamp: caseBriefing.timestamp ?? new Date().toISOString() },
        prosecutionArgument,
        message,
        turnNumber
      )
    );

    return NextResponse.json({ output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
