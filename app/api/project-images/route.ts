export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { kv } from "@vercel/kv"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")
    const kind = searchParams.get("kind") // "characters" | "locations"

    if (!projectId || !kind) {
      return NextResponse.json(
        { error: "Missing projectId or kind in query string." },
        { status: 400 }
      )
    }

    const key = `ipbible:images:${projectId}:${kind}`

    const raw = (await kv.hgetall(key)) || {}
    const hash = raw as Record<string, string>

    return NextResponse.json({ images: hash }, { status: 200 })
  } catch (err: any) {
    console.error("project-images error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to load project images." },
      { status: 500 }
    )
  }
}
