export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { kv } from "@vercel/kv"
import type { IpBible } from "../../ip-bible"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId") || ""

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId query param." },
        { status: 400 }
      )
    }

    const key = `ipbible:project:${projectId}`
    const ipBible = await kv.get<IpBible>(key)

    if (!ipBible) {
      return NextResponse.json(
        { error: "No IP Bible found for this project." },
        { status: 404 }
      )
    }

    return NextResponse.json({ ipBible }, { status: 200 })
  } catch (err: any) {
    console.error("/api/project-bible GET error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to load IP Bible." },
      { status: 500 }
    )
  }
}
