// app/api/hero-image/route.ts
import { NextResponse } from "next/server"
import { kv } from "@vercel/kv"
import type { HeroRecord } from "@/lib/hero"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing projectId" },
      { status: 400 }
    )
  }

  const hero = (await kv.get(
    `ipbible:images:${projectId}:hero`
  )) as HeroRecord | null

  if (!hero) {
    return NextResponse.json(
      { error: "No hero image for this project" },
      { status: 404 }
    )
  }

  return NextResponse.json(hero)
}
