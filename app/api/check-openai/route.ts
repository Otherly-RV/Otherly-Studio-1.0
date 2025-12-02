import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, stage: "env", message: "OPENAI_API_KEY is NOT set on the server" },
      { status: 500 }
    )
  }

  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          stage: "openai",
          status: res.status,
          message: "OpenAI rejected the key (check key or billing)",
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { ok: true, stage: "openai", message: "API key is valid and OpenAI responded" },
      { status: 200 }
    )
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        stage: "network",
        message: "Network error talking to OpenAI",
        error: err?.message,
      },
      { status: 500 }
    )
  }
}
