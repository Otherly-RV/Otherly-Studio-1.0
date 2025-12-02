// app/api/upload-location-image/route.ts
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { kv } from "@vercel/kv"
import { put } from "@vercel/blob"
import { Buffer } from "buffer"

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Use multipart/form-data with file + projectId + index." },
        { status: 400 }
      )
    }

    const formData = await req.formData()

    const projectId = (formData.get("projectId") as string | null) || ""
    const indexStr = (formData.get("index") as string | null) || ""
    const file = formData.get("file")

    if (!projectId.trim()) {
      return NextResponse.json(
        { error: "Missing projectId." },
        { status: 400 }
      )
    }

    if (!indexStr) {
      return NextResponse.json(
        { error: "Missing index." },
        { status: 400 }
      )
    }

    const index = Number(indexStr)
    if (Number.isNaN(index)) {
      return NextResponse.json(
        { error: "index must be a number." },
        { status: 400 }
      )
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded." },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const extension = file.type.includes("jpeg")
      ? "jpg"
      : file.type.includes("png")
      ? "png"
      : "png"

    const blobKey = `projects/${projectId}/locations/${index}-${Date.now()}.${extension}`

    const { url: blobUrl } = await put(blobKey, buffer, {
      access: "public",
      contentType: file.type || "image/png",
    })

    const kvKey = `ipbible:images:${projectId}:locations`
    await kv.hset(kvKey, { [String(index)]: blobUrl })

    return NextResponse.json({ url: blobUrl }, { status: 200 })
  } catch (err: any) {
    console.error("upload-location-image error:", err)
    return NextResponse.json(
      { error: err?.message || "Location image upload failed." },
      { status: 500 }
    )
  }
}
