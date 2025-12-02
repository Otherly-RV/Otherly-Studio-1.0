// app/lib/llm.ts
import type { ProviderId } from "./engines"

export type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

type CallChatModelArgs = {
  provider: ProviderId
  model: string
  messages: ChatMessage[]
}

/**
 * Normalized chat call for all providers.
 * Always returns a plain string with the assistant reply.
 */
export async function callChatModel({
  provider,
  model,
  messages,
}: CallChatModelArgs): Promise<string> {
  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set")
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    })

    const raw = await res.text()

    if (!res.ok) {
      console.error("OpenAI chat error:", res.status, raw)
      throw new Error(`OpenAI chat failed with status ${res.status}`)
    }

    let data: any
    try {
      data = JSON.parse(raw)
    } catch (err) {
      console.error("OpenAI chat: failed to parse JSON:", err, raw)
      throw new Error("OpenAI chat returned non-JSON response")
    }

    const content = data?.choices?.[0]?.message?.content
    if (!content || typeof content !== "string") {
      console.error("OpenAI chat: unexpected content shape:", data)
      throw new Error("OpenAI chat response was empty or malformed")
    }

    return content
  }

  if (provider === "gemini") {
    const apiKey =
      process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY

    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY or GEMINI_API_KEY is not set")
    }

    // Gemini expects "contents" with role + parts[]
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }))

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${apiKey}`

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents }),
    })

    const raw = await res.text()

    if (!res.ok) {
      console.error("Gemini chat error:", res.status, raw)
      throw new Error(`Gemini chat failed with status ${res.status}`)
    }

    let data: any
    try {
      data = JSON.parse(raw)
    } catch (err) {
      console.error("Gemini chat: failed to parse JSON:", err, raw)
      throw new Error("Gemini chat returned non-JSON response")
    }

    const parts: any[] =
      data?.candidates?.[0]?.content?.parts || []

    const text = parts
      .map((p) => (typeof p.text === "string" ? p.text : ""))
      .join("")

    if (!text) {
      console.error("Gemini chat: empty content:", data)
      throw new Error("Gemini chat response was empty")
    }

    return text
  }

  throw new Error(`Unknown provider: ${provider}`)
}
