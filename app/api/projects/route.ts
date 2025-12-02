// app/api/projects/route.ts
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { kv } from "@vercel/kv"

type ProjectMeta = {
  id: string
  name: string
  createdAt: string
}

export async function GET() {
  try {
    const projects =
      ((await kv.get<ProjectMeta[]>("ipbible:projects")) as ProjectMeta[] |
        null) ?? []

    return NextResponse.json({ projects }, { status: 200 })
  } catch (err: any) {
    console.error("projects GET error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to load projects." },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Missing project id." },
        { status: 400 }
      )
    }

    const metaList =
      ((await kv.get<ProjectMeta[]>("ipbible:projects")) as ProjectMeta[] |
        null) ?? []

    const filtered = metaList.filter((p) => p.id !== id)
    await kv.set("ipbible:projects", filtered)

    await kv.del(`ipbible:project:${id}`)
    await kv.del(`ipbible:script:${id}`)
    await kv.del(`ipbible:images:${id}:hero`)
    await kv.del(`ipbible:engines:${id}`) // if you store engines later

    console.log("projects DELETE", {
      id,
      deletedBibleKey: `ipbible:project:${id}`,
      deletedScriptKey: `ipbible:script:${id}`,
      deletedHeroKey: `ipbible:images:${id}:hero`,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: any) {
    console.error("projects DELETE error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to delete project." },
      { status: 500 }
    )
  }
}
