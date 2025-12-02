// app/api/project/route.ts
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { kv } from "@vercel/kv"
import type { IpBible } from "../../ip-bible"
import type { ProjectEngineConfig } from "../../../lib/engines"

type HeroRecord = {
  url: string
  source: "pdf" | "ai"
}

type ScriptRecord = {
  text?: string
  filename?: string
  createdAt?: string
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const id = (url.searchParams.get("id") || "").trim()

    if (!id) {
      return NextResponse.json(
        { error: "Missing project id." },
        { status: 400 }
      )
    }

    // Load canon
    const ipBible = (await kv.get<IpBible>(
      `ipbible:project:${id}`
    )) as IpBible | null

    if (!ipBible) {
      return NextResponse.json(
        { error: `No IP Bible found for project ${id}.` },
        { status: 404 }
      )
    }

    // Load hero image (may be null)
    const hero = (await kv.get<HeroRecord>(
      `ipbible:images:${id}:hero`
    )) as HeroRecord | null

    // Load script (may be null)
    const script = (await kv.get<ScriptRecord>(
      `ipbible:script:${id}`
    )) as ScriptRecord | null

    // Load engines (optional, don’t break if missing)
    const engines = (await kv.get<ProjectEngineConfig>(
      `ipbible:engines:${id}`
    )) as ProjectEngineConfig | null

    return NextResponse.json(
      {
        ipBible,
        hero,
        script,
        engines,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error("project route error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to load project." },
      { status: 500 }
    )
  }
}
