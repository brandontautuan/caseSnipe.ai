/**
 * POST /api/trial/stream
 * Runs a trial and streams TrialEvents as SSE.
 * Each event is: data: {JSON}\n\n
 */

import { NextRequest } from "next/server";
import { runTrial } from "@/lib/agents/orchestrator";
import { DEFAULT_PROSECUTION_MODEL, DEFAULT_DEFENSE_MODEL, DEFAULT_JUDGE_MODEL } from "@/lib/agents/models";
import { CASES } from "@/lib/cases";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min max for a full trial

export async function POST(req: NextRequest) {
  let body: {
    caseId?: string;
    prosecutionModel?: string;
    defenseModel?: string;
    judgeModel?: string;
    maxRounds?: number;
    ragMode?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const {
    caseId = CASES[0].id,
    prosecutionModel = DEFAULT_PROSECUTION_MODEL,
    defenseModel = DEFAULT_DEFENSE_MODEL,
    judgeModel = DEFAULT_JUDGE_MODEL,
    maxRounds = 2,
    ragMode = false,
  } = body;

  if (!process.env.OPENROUTER_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENROUTER_API_KEY not configured. Add it to .env.local." }),
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected
        }
      };

      try {
        await runTrial({
          caseId,
          prosecutionModel,
          defenseModel,
          judgeModel,
          maxRounds,
          ragMode,
          onEvent: send,
        });

        // Signal completion
        send({ type: "done" });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({ type: "error", content: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
