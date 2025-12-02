// lib/hero.ts

import { put } from "@vercel/blob"
import { Buffer } from "buffer"

import type { IpBible } from "../app/ip-bible"
import {
  generateImageWithEngine,
  type GeneratedImage,
  type ImageEngineId,
  DEFAULT_IMAGE_ENGINE_ID,
} from "./image"

export type HeroRecord = {
  url: string
  source: "pdf" | "ai"
  engineId?: ImageEngineId
}

/**
 * Store a remote image URL in Vercel Blob and return the Blob URL.
 */
async function storeRemoteImageInBlob(
  remoteUrl: string,
  blobKey: string
): Promise<string> {
  const imgRes = await fetch(remoteUrl)
  if (!imgRes.ok) {
    const text = await imgRes.text().catch(() => "")
    console.error("hero: failed to fetch remote image:", remoteUrl, text)
    throw new Error("Failed to fetch remote image for Blob storage.")
  }

  const arrayBuffer = await imgRes.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { url } = await put(blobKey, buffer, {
    access: "public",
    contentType: "image/png",
  })

  return url
}

/**
 * Try to extract a hero image from the first page of a PDF using PDF.co.
 * If anything fails, return null and let the caller fall back to AI hero.
 *
 * NOTE: Their API has changed; if it starts complaining about `file` param,
 * we just log and return null so the rest of the app still works.
 */
export async function extractHeroImageFromPdfToBlob(
  pdfBuffer: Buffer,
  projectId: string
): Promise<HeroRecord | null> {
  const pdfCoKey = process.env.PDFCO_API_KEY
  if (!pdfCoKey) return null

  const fileBase64 = pdfBuffer.toString("base64")

  const pdfRes = await fetch("https://api.pdf.co/v1/pdf/convert/to/png", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": pdfCoKey,
    },
    body: JSON.stringify({
      file: fileBase64,
      async: false,
      pages: "1",
    }),
  })

  if (!pdfRes.ok) {
    const text = await pdfRes.text().catch(() => "")
    console.error("hero: PDF.co error:", text)
    return null
  }

  const pdfData: any = await pdfRes.json().catch((err) => {
    console.error("hero: PDF.co JSON parse error:", err)
    return null
  })

  const remoteUrl: string | undefined =
    pdfData?.url || (Array.isArray(pdfData?.urls) ? pdfData.urls[0] : undefined)

  if (!remoteUrl) {
    console.error("hero: PDF.co no URL/urls in response:", pdfData)
    return null
  }

  const blobKey = `projects/${projectId}/hero/pdf-hero-${Date.now()}.png`
  const blobUrl = await storeRemoteImageInBlob(remoteUrl, blobKey)

  return { url: blobUrl, source: "pdf" }
}

/**
 * Normalize any raw engine id to a valid ImageEngineId, or fallback.
 */
function normalizeHeroEngineId(
  raw: string | ImageEngineId | undefined
): ImageEngineId {
  const fallback = DEFAULT_IMAGE_ENGINE_ID
  if (!raw) return fallback

  const t = String(raw).trim()
  if (t === "openai-image-1" || t === "gemini-3-pro-image-preview") {
    return t
  }

  console.warn(
    "hero: unknown image engine id for hero, falling back to default",
    raw
  )
  return fallback
}

/**
 * Generate a hero key art image from the IP Bible using our image engines.
 * This is the AI-based fallback when no PDF hero is available.
 */
export async function generateHeroFromCanonToBlob(
  ipBible: IpBible,
  projectId: string,
  imageEngineId?: string | ImageEngineId
): Promise<HeroRecord | null> {
  const title = ipBible.plot?.title || "Untitled Project"
  const aesthetic = ipBible.artStyle?.aesthetic || ""
  const palette = ipBible.artStyle?.palette || ""

  const prompt = `
Key art for a narrative IP called "${title}".
Style: ${aesthetic || "cinematic, illustrated, story-driven"}.
Mood / palette: ${palette || "cohesive, visually striking, no text"}.
Do NOT include any text, logos, or UI. Just the visual world / characters.
`.trim()

  const engineId: ImageEngineId = normalizeHeroEngineId(imageEngineId)

  let img: GeneratedImage
  try {
    img = await generateImageWithEngine({
      engineId,
      prompt,
      size: "1024x1024",
    })
  } catch (err) {
    console.error("hero: generateImageWithEngine failed:", err)
    throw err
  }

  const buffer = Buffer.from(img.base64, "base64")
  const blobKey = `projects/${projectId}/hero/ai-hero-${Date.now()}.png`

  const { url } = await put(blobKey, buffer, {
    access: "public",
    contentType: img.mimeType,
  })

  return { url, source: "ai", engineId }
}
