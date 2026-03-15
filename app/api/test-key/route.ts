import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENROUTER_API_KEY not set" });

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct",
        messages: [{ role: "user", content: "Say hi" }],
        max_tokens: 5,
      }),
    });

    const data = await res.json();
    return NextResponse.json({ status: res.status, keyPrefix: apiKey.slice(0, 12) + "...", data });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
