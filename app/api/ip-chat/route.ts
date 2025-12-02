// app/api/ip-chat/route.ts
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { kv } from "@vercel/kv"

import type { IpBible } from "../../ip-bible"
import {
  getEngineOrThrow,
  type ProjectEngineConfig,
  type EngineId,
} from "../../../lib/engines"
import { callChatModel } from "../../../lib/llm"

// ---------- TYPES ----------

type ChatRole = "system" | "user" | "assistant"

export interface ChatMessage {
  role: ChatRole
  content: string
}

interface IpChatRequestBody {
  projectId: string
  messages: ChatMessage[] // typically just the new user messages
  /**
   * mode:
   * - "canon"   → strict IP Bible answers
   * - "copilot" → looser assistant using canon + script as context
   */
  mode?: "canon" | "copilot"
}

// ---------- HELPERS ----------

async function loadProjectEngines(
  projectId: string
): Promise<ProjectEngineConfig | null> {
  const engines = (await kv.get<ProjectEngineConfig>(
    `ipbible:engines:${projectId}`
  )) as ProjectEngineConfig | null
  return engines
}

async function loadProjectBible(
  projectId: string
): Promise<IpBible | null> {
  const bible = (await kv.get<IpBible>(
    `ipbible:project:${projectId}`
  )) as IpBible | null
  return bible
}

interface ScriptRecord {
  filename: string
  text: string
  createdAt: string
}

async function loadProjectScript(
  projectId: string
): Promise<ScriptRecord | null> {
  const script = (await kv.get<ScriptRecord>(
    `ipbible:script:${projectId}`
  )) as ScriptRecord | null
  return script
}

function buildCanonSystemPrompt(ipBible: IpBible): string {
  return `
You are the "Otherly Exec", an expert narrative IP executive and AI showrunner.

You are used inside the Otherly Studio app, which can run on different underlying models
(OpenAI GPT-x, Gemini, etc.). You MUST NOT mention specific model names or versions
(GPT-4, GPT-5, Gemini 3, etc.) when describing yourself.

If the user asks what you are, answer in generic terms such as:
"I’m the Otherly Exec — an AI showrunner for this project, with the Hard Canon as my source of truth."

You have access to the HARD CANON (IP Bible) for a project. The canon includes:
- Plot (title, logline, synopsis)
- Characters (list + byId, with bios, goals, flaws, relationships, key scenes)
- Locations (list + byId, with descriptions, mood, function in story)
- ArtStyle (aesthetic, palette)
- WorldRules (physics/magic, technology, society)

The full canon JSON is below. Treat it as the SINGLE SOURCE OF TRUTH for this IP:

${JSON.stringify(ipBible, null, 2)}

Guidelines:
- Stay consistent with the canon. Never contradict what is specified.
- If the user asks for something outside the canon, extrapolate but keep the tone, style, and logic coherent.
- If something is truly unspecified, you may invent details, but they must feel aligned with the existing canon.
- Answer as a creative development executive: clear, concise, helpful, not overly verbose.
`.trim()
}

function buildScriptContextPrompt(script: ScriptRecord | null): string | null {
  if (!script?.text) return null

  const maxChars = 20000
  const excerpt =
    script.text.length > maxChars
      ? script.text.slice(0, maxChars) + "\n\n[... script truncated for length ...]"
      : script.text

  return `
You also have access to the SOFT CANON: the original script text the IP Bible was derived from.
Use it only as supporting context; the IP Bible is the final authority if there is a conflict.

Script filename: ${script.filename}
Created at: ${script.createdAt}

SCRIPT EXCERPT (for reference):
${excerpt}
`.trim()
}

// KV key for chat history (per project + mode)
function chatKey(projectId: string, mode: "canon" | "copilot"): string {
  return `ipbible:chat:${projectId}:${mode}`
}

// ---------- GET: return stored chat history for a project/mode ----------

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")
    const modeParam = searchParams.get("mode") as "canon" | "copilot" | null
    const mode: "canon" | "copilot" = modeParam === "canon" ? "canon" : "copilot"

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId" },
        { status: 400 }
      )
    }

    const key = chatKey(projectId, mode)
    const messages =
      ((await kv.get<ChatMessage[]>(key)) as ChatMessage[] | null) ?? []

    return NextResponse.json({
      projectId,
      mode,
      messages,
    })
  } catch (err: any) {
    console.error("ip-chat GET error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to load chat history." },
      { status: 500 }
    )
  }
}

// ---------- POST: chat + use + persist history ----------

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as IpChatRequestBody

    const { projectId, messages: newMessages, mode = "copilot" } = body

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId" },
        { status: 400 }
      )
    }

    if (!Array.isArray(newMessages) || newMessages.length === 0) {
      return NextResponse.json(
        { error: "messages must be a non-empty array" },
        { status: 400 }
      )
    }

    const [engines, ipBible, script] = await Promise.all([
      loadProjectEngines(projectId),
      loadProjectBible(projectId),
      loadProjectScript(projectId),
    ])

    if (!engines) {
      return NextResponse.json(
        {
          error: `No engine configuration found for project ${projectId}`,
        },
        { status: 404 }
      )
    }

    if (!ipBible) {
      return NextResponse.json(
        {
          error: `No IP Bible found for project ${projectId}`,
        },
        { status: 404 }
      )
    }

    // ---------- SELECT ENGINE BASED ON MODE ----------

    let engineId: EngineId
    if (mode === "canon") {
      engineId = engines.canonEngineId ?? engines.globalEngineId
    } else {
      engineId = engines.copilotEngineId ?? engines.globalEngineId
    }

    const engine = getEngineOrThrow(engineId)

    if (!engine.text) {
      console.error(
        `Engine ${engineId} does not have a text model configured (mode: ${mode}).`
      )
      return NextResponse.json(
        {
          error: `Engine ${engineId} is not configured for chat (no text model).`,
        },
        { status: 500 }
      )
    }

    // ---------- LOAD EXISTING HISTORY ----------

    const key = chatKey(projectId, mode)
    const existingHistory =
      ((await kv.get<ChatMessage[]>(key)) as ChatMessage[] | null) ?? []

    // Optional: limit how much history we send to the LLM (to avoid huge prompts)
    const MAX_HISTORY_MESSAGES = 40
    const trimmedHistory =
      existingHistory.length > MAX_HISTORY_MESSAGES
        ? existingHistory.slice(-MAX_HISTORY_MESSAGES)
        : existingHistory

    // ---------- BUILD MESSAGES FOR LLM CALL ----------

    const systemCanon = buildCanonSystemPrompt(ipBible)
    const systemScript = buildScriptContextPrompt(script)

    const llmMessages: ChatMessage[] = [
      { role: "system", content: systemCanon },
    ]

    if (systemScript) {
      llmMessages.push({
        role: "system",
        content: systemScript,
      })
    }

    // previous conversation
    for (const m of trimmedHistory) {
      if (!m?.role || !m?.content) continue
      if (m.role !== "user" && m.role !== "assistant") continue
      llmMessages.push(m)
    }

    // new user messages from client
    for (const m of newMessages) {
      if (!m?.role || !m?.content) continue
      if (m.role !== "user" && m.role !== "assistant" && m.role !== "system") {
        continue
      }
      llmMessages.push(m)
    }

    // ---------- CALL MODEL ----------

    const result = await callChatModel({
      provider: engine.text.provider,
      model: engine.text.model,
      messages: llmMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const reply = typeof result === "string" ? result : String(result ?? "")

    // ---------- APPEND & PERSIST CHAT HISTORY ----------

    const updatedHistory: ChatMessage[] = [
      ...existingHistory,
      ...newMessages,
      { role: "assistant", content: reply },
    ]

    await kv.set(key, updatedHistory)

    return NextResponse.json({
      projectId,
      mode,
      engineId,
      reply,
      // optional: return history so UI can sync without extra GET
      history: updatedHistory,
    })
  } catch (err: any) {
    console.error("ip-chat POST error:", err)
    return NextResponse.json(
      {
        error: err?.message || "ip-chat failed.",
      },
      { status: 500 }
    )
  }
}
