// app/api/generate-location-image/route.ts
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { kv } from "@vercel/kv"
import { put } from "@vercel/blob"
import { Buffer } from "buffer"
import {
  generateImageWithEngine,
  type GeneratedImage,
  DEFAULT_IMAGE_ENGINE_ID,
} from "../../../lib/image"

type RequestBody = {
  projectId?: string
  locationId?: string
  name?: string
  description?: string
  engineId?: string
}

type LocationImageRecord = {
  url: string
  engineId: string
  projectId: string
  locationId: string
  createdAt: string
  source: "ai"
}

function buildPrompt(name?: string, description?: string): string {
  const safeName = name?.trim() || "a key story location"
  const safeDesc = description?.trim() || ""

  return [
    `Cinematic establishing shot of ${safeName}.`,
    safeDesc && `Mood / details: ${safeDesc}.`,
    `Wide shot, strong sense of place, no text or logos, no UI.`,
  ]
    .filter(Boolean)
    .join(" ")
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody

    const projectId = body.projectId?.trim()
    const locationId = body.locationId?.trim()
    const name = body.name?.trim()
    const description = body.description?.trim()
    const engineId = body.engineId?.trim() || DEFAULT_IMAGE_ENGINE_ID

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId in request body." },
        { status: 400 }
      )
    }

    if (!locationId) {
      return NextResponse.json(
        { error: "Missing locationId in request body." },
        { status: 400 }
      )
    }

    const prompt = buildPrompt(name, description)

    const img: GeneratedImage = await generateImageWithEngine({
      engineId,
      prompt,
      size: "1024x1024",
    })

    const buffer = Buffer.from(img.base64, "base64")
    const blobKey = `projects/${projectId}/locations/${locationId}-${Date.now()}.png`

    const { url } = await put(blobKey, buffer, {
      access: "public",
      contentType: img.mimeType,
    })

    const record: LocationImageRecord = {
      url,
      engineId,
      projectId,
      locationId,
      createdAt: new Date().toISOString(),
      source: "ai",
    }

    await kv.set(
      `ipbible:images:${projectId}:location:${locationId}`,
      record
    )

    await kv.hset(`ipbible:images:${projectId}:locations`, {
      [locationId]: url,
    })

    console.log("generate-location-image OK", {
      projectId,
      locationId,
      engineId,
      url,
    })

    return NextResponse.json(record, { status: 200 })
  } catch (err: any) {
    console.error("generate-location-image error:", err)
    return NextResponse.json(
      { error: err?.message || "Location image generation failed." },
      { status: 500 }
    )
  }
}
