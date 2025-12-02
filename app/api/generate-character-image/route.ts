// app/api/generate-character-image/route.ts
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
  characterId?: string
  name?: string
  description?: string
  engineId?: string // whatever the UI sends
}

type CharacterImageRecord = {
  url: string
  engineId: string
  projectId: string
  characterId: string
  createdAt: string
  source: "ai"
}

function buildPrompt(name?: string, description?: string): string {
  const safeName = name?.trim() || "a character"
  const safeDesc = description?.trim() || ""

  return [
    `Cinematic character portrait of ${safeName}.`,
    safeDesc && `Details: ${safeDesc}.`,
    `Framed as a key art / trading card concept, no text or logos, no UI.`,
  ]
    .filter(Boolean)
    .join(" ")
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody

    const projectId = body.projectId?.trim()
    const characterId = body.characterId?.trim()
    const name = body.name?.trim()
    const description = body.description?.trim()
    const engineId = body.engineId?.trim() || DEFAULT_IMAGE_ENGINE_ID

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId in request body." },
        { status: 400 }
      )
    }

    if (!characterId) {
      return NextResponse.json(
        { error: "Missing characterId in request body." },
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
    const blobKey = `projects/${projectId}/characters/${characterId}-${Date.now()}.png`

    const { url } = await put(blobKey, buffer, {
      access: "public",
      contentType: img.mimeType,
    })

    const record: CharacterImageRecord = {
      url,
      engineId,
      projectId,
      characterId,
      createdAt: new Date().toISOString(),
      source: "ai",
    }

    await kv.set(
      `ipbible:images:${projectId}:character:${characterId}`,
      record
    )

    await kv.hset(`ipbible:images:${projectId}:characters`, {
      [characterId]: url,
    })

    console.log("generate-character-image OK", {
      projectId,
      characterId,
      engineId,
      url,
    })

    return NextResponse.json(record, { status: 200 })
  } catch (err: any) {
    console.error("generate-character-image error:", err)
    return NextResponse.json(
      { error: err?.message || "Character image generation failed." },
      { status: 500 }
    )
  }
}
