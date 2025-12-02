// lib/image.ts

// Just a label we route on. Don't over-type it.
export type ImageEngineId = string

// Logical default if UI/KV doesn't specify anything
export const DEFAULT_IMAGE_ENGINE_ID: ImageEngineId =
  "gemini-3-pro-image-preview"

export type GeneratedImage = {
  base64: string
  mimeType: string
}

type GenerateImageParams = {
  engineId: ImageEngineId
  prompt: string
  size?: "512x512" | "768x768" | "1024x1024"
}

/**
 * Main entrypoint used by:
 * - /api/generate-character-image
 * - /api/generate-location-image
 * - hero generation
 */
export async function generateImageWithEngine(
  params: GenerateImageParams
): Promise<GeneratedImage> {
  const { engineId } = params
  const id = (engineId || "").toLowerCase()

  // crude but robust routing
  if (id.includes("openai")) {
    return generateOpenAIImage(params)
  }

  if (id.includes("gemini") || id.includes("google")) {
    return generateGeminiImage(params)
  }

  // fallback: use default engine
  if (DEFAULT_IMAGE_ENGINE_ID.toLowerCase().includes("openai")) {
    return generateOpenAIImage({ ...params, engineId: DEFAULT_IMAGE_ENGINE_ID })
  }

  return generateGeminiImage({ ...params, engineId: DEFAULT_IMAGE_ENGINE_ID })
}

// ---------- OPENAI (any "openai*" → gpt-image-1) ----------

async function generateOpenAIImage(
  params: GenerateImageParams
): Promise<GeneratedImage> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY for OpenAI image generation.")
  }

  const { prompt, size = "1024x1024" } = params

  // IMPORTANT: do NOT send `response_format` – your API rejects it.
  const body = {
    model: "gpt-image-1",
    prompt,
    n: 1,
    size,
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let detail = ""
    try {
      const json = (await res.json()) as any
      detail =
        json?.error?.message ||
        json?.message ||
        JSON.stringify(json)
    } catch {
      detail = await res.text().catch(() => "")
    }

    console.error(
      "OpenAI image error:",
      res.status,
      detail || "[no detail]"
    )

    throw new Error(
      `OpenAI image error ${res.status}${
        detail ? `: ${detail}` : ""
      }`
    )
  }

  const data = (await res.json().catch((err) => {
    console.error("OpenAI image JSON parse error:", err)
    throw new Error("OpenAI image generation returned invalid JSON.")
  })) as any

  const b64 = data?.data?.[0]?.b64_json
  if (!b64 || typeof b64 !== "string") {
    console.error("OpenAI image: missing b64_json in response:", data)
    throw new Error("OpenAI image generation did not return image data.")
  }

  return {
    base64: b64,
    mimeType: "image/png",
  }
}

// ---------- GEMINI (any "gemini*" / "google*") ----------

async function generateGeminiImage(
  params: GenerateImageParams
): Promise<GeneratedImage> {
  const apiKey =
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GENERATIVE_LANGUAGE_API_KEY

  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key (GOOGLE_API_KEY / GEMINI_API_KEY / GENERATIVE_LANGUAGE_API_KEY)."
    )
  }

  const { prompt, engineId } = params

  // If you pass a specific image model id (e.g. gemini-2.5-flash-image-preview),
  // we'll use it. Otherwise we default to gemini-3-pro-image-preview label.
  const modelId =
    (engineId && engineId.trim()) || "gemini-3-pro-image-preview"

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error("Gemini image error:", res.status, text)
    throw new Error(
      `Gemini image generation failed with status ${res.status}.`
    )
  }

  const data = (await res.json().catch((err) => {
    console.error("Gemini image JSON parse error:", err)
    throw new Error("Gemini image generation returned invalid JSON.")
  })) as any

  // Look for an inlineData / inline_data image part
  const candidates = data?.candidates
  const parts = candidates?.[0]?.content?.parts || []

  const inline =
    parts.find((p: any) => p?.inlineData?.data)?.inlineData ||
    parts.find((p: any) => p?.inline_data?.data)?.inline_data

  const b64 = inline?.data
  const mimeType: string = inline?.mimeType || inline?.mime_type || "image/png"

  if (!b64 || typeof b64 !== "string") {
    console.error("Gemini image: no inlineData.data found:", data)
    throw new Error("Gemini image generation did not return image data.")
  }

  return {
    base64: b64,
    mimeType,
  }
}
