// app/api/upload-script/route.ts
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import pdfParse from "pdf-parse"
import * as mammoth from "mammoth"
import { kv } from "@vercel/kv"
import { randomUUID } from "crypto"
import { put } from "@vercel/blob"
import { Buffer } from "buffer"

import { type IpBible } from "../../ip-bible"

import {
  type EngineId,
  type ProjectEngineConfig,
  DEFAULT_CANON_ENGINE_ID,
  DEFAULT_COPILOT_ENGINE_ID,
  DEFAULT_IMAGE_ENGINE_ID,
  getEngineOrThrow,
} from "../../../lib/engines"
import { callChatModel } from "../../../lib/llm"
import {
  generateImageWithEngine,
  type GeneratedImage,
  type ImageEngineId,
  DEFAULT_IMAGE_ENGINE_ID as DEFAULT_IMAGE_ENGINE_ID_IMAGE,
} from "../../../lib/image"

// ---------- TYPES ----------

type ProjectMeta = {
  id: string
  name: string
  createdAt: string
}

type Summary = {
  wordCount: number
  characters: number
  locations: number
}

type HeroRecord = {
  url: string
  source: "pdf" | "ai"
  engineId?: ImageEngineId
}

type ExtractResult = {
  text: string
  filename: string
  fileKind: "txt" | "pdf" | "docx" | "doc" | "other"
  buffer: Buffer
}

// ---------- HELPERS ----------

function stripJsonFence(raw: string): string {
  let s = raw.trim()

  if (s.startsWith("```")) {
    const firstNewline = s.indexOf("\n")
    const lastFence = s.lastIndexOf("```")
    if (firstNewline !== -1 && lastFence !== -1 && lastFence > firstNewline) {
      s = s.slice(firstNewline + 1, lastFence).trim()
    }
  }

  const firstBrace = s.indexOf("{")
  if (firstBrace > 0) {
    s = s.slice(firstBrace)
  }

  return s
}

async function extractScriptFromFormData(
  formData: FormData
): Promise<ExtractResult> {
  const file = formData.get("file")

  if (!file || !(file instanceof File)) {
    throw new Error("No file found in upload.")
  }

  const name = file.name || "Untitled Script"
  const lower = name.toLowerCase()
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (lower.endsWith(".txt")) {
    const text = buffer.toString("utf8").trim()
    if (!text) throw new Error("Uploaded .txt file is empty.")
    return { text, filename: name, fileKind: "txt", buffer }
  }

  if (lower.endsWith(".pdf")) {
    const pdfData = await pdfParse(buffer)
    const text = (pdfData.text || "").trim()
    if (!text) throw new Error("No text could be extracted from the PDF.")
    return { text, filename: name, fileKind: "pdf", buffer }
  }

  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer })
    const text = (result.value || "").trim()
    if (!text) throw new Error("No text could be extracted from the DOCX.")
    return { text, filename: name, fileKind: "docx", buffer }
  }

  if (lower.endsWith(".doc")) {
    throw new Error(
      "Legacy .doc is not supported. Please save the script as .docx, .pdf, or .txt and upload that."
    )
  }

  throw new Error("Unsupported file type. Use .txt, .pdf, or .docx for now.")
}

async function callModelForIpBible(
  script: string,
  engineId: EngineId
): Promise<IpBible> {
  const engine = getEngineOrThrow(engineId)

  if (!engine.text) {
    throw new Error(
      `Engine ${engineId} has no text model configured for IP Bible extraction.`
    )
  }

  const systemPrompt = `
You are the "Living Bible" engine for a piece of narrative IP.
You receive a script (film, TV, animation, etc.) and must output ONE JSON object in this exact shape:

{
  "plot": {
    "title": string,
    "logline": string,
    "synopsis": string
  },
  "characters": {
    "list": [
      {
        "id": string,
        "name": string,
        "occupation": string,
        "role": string,
        "bio": string
      }
    ],
    "byId": {
      [id: string]: {
        "id": string,
        "name": string,
        "occupation": string,
        "role": string,
        "shortBio": string,
        "longBio": string,
        "visualNotes": string,
        "goals": string,
        "flaws": string,
        "relationships": { "name": string, "relation": string, "note"?: string }[],
        "keyScenes": string[]
      }
    }
  },
  "locations": {
    "list": [
      {
        "id": string,
        "name": string,
        "world": string,
        "region": string,
        "placeType": string,
        "note": string
      }
    ],
    "byId": {
      [id: string]: {
        "id": string,
        "name": string,
        "world": string,
        "region": string,
        "placeType": string,
        "moodLine": string,
        "description": string,
        "functionInStory": string,
        "recurringTimeOrWeather": string,
        "keyScenes": string[]
      }
    }
  },
  "artStyle": {
    "aesthetic": string,
    "palette": string
  },
  "worldRules": {
    "physicsMagic": string,
    "technology": string,
    "society": string
  }
}

Rules:
- Output ONLY raw JSON. No backticks, no \`\`\`json fences, no commentary.
- Be concise but specific. No placeholder text like "demo" or "TBD".
- In artStyle.palette, if you mention colors, include real hex codes like "#0a1018", "#ffd16f".
- If something is not explicit in the script, infer the most reasonable option and state it as fact.
`.trim()

  const promptScript = script.slice(0, 80_000)

  const raw = await callChatModel({
    provider: engine.text.provider,
    model: engine.text.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: promptScript },
    ],
  })

  const cleaned = stripJsonFence(raw)

  try {
    const parsed = JSON.parse(cleaned)
    return parsed as IpBible
  } catch (err) {
    console.error("Failed to parse AI JSON for IP Bible:", err, cleaned)
    throw new Error("AI returned invalid JSON for IP Bible. Check logs.")
  }
}

// ---------- 3. image helpers (Blob + PDF.co + Image engines) ----------

async function storeRemoteImageInBlob(
  remoteUrl: string,
  blobKey: string
): Promise<string> {
  const imgRes = await fetch(remoteUrl)
  if (!imgRes.ok) {
    const text = await imgRes.text().catch(() => "")
    console.error("Failed to fetch remote image:", remoteUrl, text)
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

// PDF.co: convert first page to PNG → we store that PNG in Blob
// Updated to use "url" instead of deprecated "file" param.
async function extractHeroImageFromPdfToBlob(
  pdfBuffer: Buffer,
  projectId: string
): Promise<HeroRecord | null> {
  const pdfCoKey = process.env.PDFCO_API_KEY
  if (!pdfCoKey) {
    console.warn("Missing PDFCO_API_KEY, skipping PDF hero extraction.")
    return null
  }

  try {
    // 1) Upload the original PDF to Vercel Blob to get a public URL
    const sourceKey = `projects/${projectId}/source/pdf-${Date.now()}.pdf`
    const { url: pdfUrl } = await put(sourceKey, pdfBuffer, {
      access: "public",
      contentType: "application/pdf",
    })

    // 2) Ask PDF.co to convert page 1 of that URL to PNG
    const pdfRes = await fetch("https://api.pdf.co/v1/pdf/convert/to/png", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": pdfCoKey,
      },
      body: JSON.stringify({
        url: pdfUrl, // IMPORTANT: use url, not file
        pages: "1",
        async: false,
      }),
    })

    if (!pdfRes.ok) {
      const text = await pdfRes.text().catch(() => "")
      console.error("PDF.co error:", pdfRes.status, text)
      return null
    }

    const pdfData: any = await pdfRes.json().catch((err) => {
      console.error("PDF.co JSON parse error:", err)
      return null
    })

    const remoteUrl: string | undefined =
      pdfData?.url ||
      (Array.isArray(pdfData?.urls) ? pdfData.urls[0] : undefined)

    if (!remoteUrl) {
      console.error("PDF.co: no URL/urls in response:", pdfData)
      return null
    }

    // 3) Store resulting PNG in Blob as hero image
    const blobKey = `projects/${projectId}/hero/pdf-hero-${Date.now()}.png`
    const blobUrl = await storeRemoteImageInBlob(remoteUrl, blobKey)

    return { url: blobUrl, source: "pdf" }
  } catch (err) {
    console.error("extractHeroImageFromPdfToBlob error:", err)
    return null
  }
}

function normalizeHeroEngineId(raw: string | undefined): ImageEngineId {
  const fallback = DEFAULT_IMAGE_ENGINE_ID_IMAGE
  if (!raw) return fallback

  const t = raw.trim()
  if (t === "openai-image-1" || t === "gemini-3-pro-image-preview") {
    return t
  }

  console.warn(
    "generate-hero-image: unknown image engine id, falling back to default",
    raw
  )
  return fallback
}

async function generateHeroFromCanonToBlob(
  ipBible: IpBible,
  projectId: string,
  imageEngineId: EngineId | undefined
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

  // Narrow engine id to the image engines we support
  const heroEngineId: ImageEngineId = normalizeHeroEngineId(
    imageEngineId as string | undefined
  )

  const img: GeneratedImage = await generateImageWithEngine({
    engineId: heroEngineId,
    prompt,
    size: "1024x1024",
  })

  const buffer = Buffer.from(img.base64, "base64")
  const blobKey = `projects/${projectId}/hero/ai-hero-${Date.now()}.png`

  const { url } = await put(blobKey, buffer, {
    access: "public",
    contentType: img.mimeType,
  })

  return { url, source: "ai", engineId: heroEngineId }
}

// ---------- 4. POST handler ----------

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Use multipart/form-data with file + projectName." },
        { status: 400 }
      )
    }

    const formData = await req.formData()

    const rawName = (formData.get("projectName") as string | null) || ""
    const projectName = rawName.trim()

    if (!projectName) {
      return NextResponse.json(
        { error: "Please provide a project name." },
        { status: 400 }
      )
    }

    // engine selection from UI (can be empty → fall back to defaults)
    const canonEngineIdRaw =
      (formData.get("canonEngineId") as string | null) || ""
    const copilotEngineIdRaw =
      (formData.get("copilotEngineId") as string | null) || ""
    const imageEngineIdRaw =
      (formData.get("imageEngineId") as string | null) || ""

    const canonEngineId: EngineId =
      (canonEngineIdRaw as EngineId) || DEFAULT_CANON_ENGINE_ID
    const copilotEngineId: EngineId =
      (copilotEngineIdRaw as EngineId) ||
      DEFAULT_COPILOT_ENGINE_ID ||
      canonEngineId
    const imageEngineId: EngineId =
      (imageEngineIdRaw as EngineId) ||
      (DEFAULT_IMAGE_ENGINE_ID as EngineId) ||
      canonEngineId

    const {
      text: script,
      filename,
      fileKind,
      buffer,
    } = await extractScriptFromFormData(formData)

    if (!script) {
      return NextResponse.json(
        { error: "No script content received." },
        { status: 400 }
      )
    }

    const projectId = randomUUID()
    const now = new Date().toISOString()

    const wordCount = script.split(/\s+/).length

    const ipBible = await callModelForIpBible(script, canonEngineId)

    // -------- hero (PDF → PNG → Blob, then AI fallback) --------

    let hero: HeroRecord | null = null

    if (fileKind === "pdf") {
      try {
        hero = await extractHeroImageFromPdfToBlob(buffer, projectId)
      } catch (err) {
        console.error("extractHeroImageFromPdfToBlob error:", err)
      }
    }

    if (!hero) {
      try {
        hero = await generateHeroFromCanonToBlob(
          ipBible,
          projectId,
          imageEngineId
        )
      } catch (err) {
        console.error("generateHeroFromCanonToBlob error:", err)
      }
    }

    // -------- KV: canon, script, engines, hero, projects list --------

    const meta: ProjectMeta = {
      id: projectId,
      name: projectName || filename || projectId,
      createdAt: now,
    }

    // HARD CANON
    await kv.set(`ipbible:project:${projectId}`, ipBible)

    // SOFT CANON (raw script)
    await kv.set(`ipbible:script:${projectId}`, {
      filename,
      text: script,
      createdAt: now,
    })

    // ENGINES
    const engines: ProjectEngineConfig = {
      globalEngineId: canonEngineId,
      canonEngineId,
      copilotEngineId,
      imageEngineId,
    }
    await kv.set(`ipbible:engines:${projectId}`, engines)

    // PROJECT LIST
    const existing =
      ((await kv.get<ProjectMeta[]>("ipbible:projects")) as ProjectMeta[] |
        null) ?? []
    const updated = [...existing, meta]
    await kv.set("ipbible:projects", updated)

    // HERO
    if (hero?.url) {
      await kv.set(`ipbible:images:${projectId}:hero`, hero)
    }

    const summary: Summary = {
      wordCount,
      characters: ipBible.characters.list.length,
      locations: ipBible.locations.list.length,
    }

    console.log("upload-script debug", {
      projectId,
      projectName: meta.name,
      bibleKey: `ipbible:project:${projectId}`,
      scriptKey: `ipbible:script:${projectId}`,
      enginesKey: `ipbible:engines:${projectId}`,
      scriptFilename: filename,
      scriptLength: script.length,
      hasHero: !!hero?.url,
      heroSource: hero?.source ?? null,
      engines,
    })

    return NextResponse.json(
      {
        summary,
        ipBible,
        projectId,
        projectName: meta.name,
        hero,
        engines,
        script: {
          filename,
          text: script,
          createdAt: now,
        },
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error("upload-script error:", err)
    return NextResponse.json(
      { error: err?.message || "AI parsing failed." },
      { status: 500 }
    )
  }
}
