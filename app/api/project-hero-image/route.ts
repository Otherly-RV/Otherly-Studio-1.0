export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { kv } from "@vercel/kv"

type HeroRecord = {
  url: string
  source: "pdf" | "ai"
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId in query string." },
        { status: 400 }
      )
    }

    const hero = (await kv.get(
      `ipbible:images:${projectId}:hero`
    )) as HeroRecord | null

    if (!hero || !hero.url) {
      return NextResponse.json(
        { error: "No hero image found for this project." },
        { status: 404 }
      )
    }

    return NextResponse.json({ hero }, { status: 200 })
  } catch (err: any) {
    console.error("project-hero-image error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to load hero image." },
      { status: 500 }
    )
  }
}
