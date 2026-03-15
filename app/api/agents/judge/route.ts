/**
 * CaseSnipe.ai - Judge Agent API
 * POST /api/agents/judge
 * Body: { transcript: TrialTranscript }
 */

import { NextRequest, NextResponse } from "next/server";
import { runJudgeVerdict } from "@/lib/agents/judge-agent";
import { getConfig } from "@/lib/config";
import { withNebiusFallback } from "@/lib/llms/fallback";
import type { TrialTranscript } from "@/types/agents";

export async function POST(request: NextRequest) {
  try {
    getConfig();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Missing API keys";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    const body = await request.json();
    const transcript = body.transcript as TrialTranscript | undefined;

    if (!transcript || typeof transcript !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid transcript in request body" },
        { status: 400 }
      );
    }

    const { caseBriefing, prosecutionTurns, defenseTurns } = transcript;
    if (!caseBriefing || typeof caseBriefing !== "object") {
      return NextResponse.json(
        { error: "transcript must have caseBriefing" },
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

    if (!Array.isArray(prosecutionTurns) || !Array.isArray(defenseTurns)) {
      return NextResponse.json(
        { error: "transcript must have prosecutionTurns and defenseTurns as arrays" },
        { status: 400 }
      );
    }

    const result = await withNebiusFallback(() =>
      runJudgeVerdict({
        caseBriefing: {
          caseName,
          facts,
          timestamp: caseBriefing.timestamp ?? new Date().toISOString(),
        },
        prosecutionTurns,
        defenseTurns,
      })
    );

    if (result.ok) {
      return NextResponse.json({ verdict: result.verdict });
    }
    return NextResponse.json({
      verdict: result.verdict,
      _debug: { rawResponse: result.rawResponse },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
