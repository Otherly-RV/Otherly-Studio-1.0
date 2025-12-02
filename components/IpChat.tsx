// components/IpChat.tsx
"use client"

import React, { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

type UiRole = "user" | "assistant"

type UiMessage = {
  role: UiRole
  content: string
}

type ApiChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

type ApiChatResponse = {
  projectId?: string
  mode?: "canon" | "copilot"
  engineId?: string
  reply?: string
  error?: string
}

type LlmOption = {
  id: string // must match EngineId in lib/engines to actually work
  label: string
}

const LLM_OPTIONS = [
  { id: "", label: "Project default" },
  { id: "gemini-3-preview", label: "Gemini 3 Pro Preview" },
  { id: "openai-gpt-5.1", label: "OpenAI GPT-5.1" },
  { id: "openai-gpt-5-mini", label: "OpenAI GPT-5 mini" },
]

function getSectionFromPath(path: string | null): string {
  if (!path) return "Home"
  if (path.startsWith("/characters")) return "Characters"
  if (path.startsWith("/locations")) return "Locations"
  if (path.startsWith("/art-style")) return "Art style"
  if (path.startsWith("/world-rules")) return "World rules"
  if (path.startsWith("/plot")) return "Plot"
  return "Home"
}

export function IpChat() {
  const pathname = usePathname()
  const sectionLabel = getSectionFromPath(pathname)

  const [messages, setMessages] = useState<UiMessage[]>([])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [projectId, setProjectId] = useState<string | null>(null)
  const [activeProjectName, setActiveProjectName] = useState<string | null>(
    null
  )

  const [llmEngineId, setLlmEngineId] = useState<string>("")

  // Load project & saved LLM override on mount
  useEffect(() => {
    if (typeof window === "undefined") return

    const id =
      window.localStorage.getItem("ipbible:currentProjectId") || null
    const name =
      window.localStorage.getItem("ipbible:currentProjectName") || null
    setProjectId(id)
    setActiveProjectName(name)

    const storedLlm =
      window.localStorage.getItem("ipbible:chatLLM") || ""
    setLlmEngineId(storedLlm)
  }, [])

  function handleLlmChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    setLlmEngineId(value)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ipbible:chatLLM", value)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = input.trim()
    if (!trimmed) return

    // Re-read project info to stay in sync with whatever the rest of the app set
    let currentId: string | null = projectId
    let currentName: string | null = activeProjectName
    if (typeof window !== "undefined") {
      currentId =
        window.localStorage.getItem("ipbible:currentProjectId") || null
      currentName =
        window.localStorage.getItem("ipbible:currentProjectName") || null
    }

    if (!currentId) {
      setError("No active project. Upload/select a project on the Home page first.")
      return
    }

    setProjectId(currentId)
    setActiveProjectName(currentName)

    const nextMessages: UiMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ]

    setMessages(nextMessages)
    setInput("")
    setIsSending(true)

    try {
      const apiMessages: ApiChatMessage[] = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const body: any = {
        projectId: currentId,
        messages: apiMessages,
        mode: "copilot",
      }

      // Only send override if not "Project default"
      if (llmEngineId) {
        body.engineIdOverride = llmEngineId
      }

      const res = await fetch("/api/ip-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data: ApiChatResponse = await res
        .json()
        .catch(() => ({} as any))

      if (!res.ok) {
        setError(
          data.error ||
            `Chat request failed with status ${res.status}.`
        )
        return
      }

      const reply =
        data.reply ||
        "(Model returned an empty reply. Check engine configuration for this project.)"

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ])
    } catch (err: any) {
      setError(err?.message || "Chat failed.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      style={{
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        padding: "1.5rem 1.25rem 1.75rem",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* header */}
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}
      >
        <span
          style={{
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            opacity: 0.7,
          }}
        >
          Otherly Exec · {sectionLabel}
        </span>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.2rem",
          }}
        >
          <span
            style={{
              fontSize: "1.1rem",
              fontWeight: 500,
            }}
          >
            IP co-pilot
          </span>
          <span
            style={{
              fontSize: "0.8rem",
              opacity: 0.75,
            }}
          >
            Ask structural, character, and world questions. The script is primary
            canon; the Bible is the structured view.
          </span>
        </div>
        <div
          style={{
            marginTop: "0.4rem",
            fontSize: "0.78rem",
            opacity: 0.7,
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <span>Project:</span>
            {activeProjectName ? (
              <span>{activeProjectName}</span>
            ) : projectId ? (
              <code>{projectId}</code>
            ) : (
              <span style={{ color: "#ffb4b4" }}>none</span>
            )}
          </div>

          {/* LLM selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <span style={{ fontSize: "0.78rem", opacity: 0.8 }}>
              LLM:
            </span>
            <select
              value={llmEngineId}
              onChange={handleLlmChange}
              style={{
                fontSize: "0.78rem",
                padding: "0.2rem 0.4rem",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.3)",
                backgroundColor: "rgba(5,6,14,0.95)",
                color: "#f5f5f5",
                outline: "none",
              }}
            >
              {LLM_OPTIONS.map((opt) => (
                <option key={opt.id || "default"} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* chat box */}
      <div
        style={{
          flex: "1 1 auto",
          borderRadius: "1rem",
          border: "1px solid rgba(255,255,255,0.12)",
          backgroundColor: "rgba(5,6,14,0.98)",
          padding: "0.9rem 0.9rem 0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxHeight: "calc(100vh - 220px)",
        }}
      >
        <div
          style={{
            flex: "1 1 auto",
            overflowY: "auto",
            paddingRight: "0.4rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.55rem",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                fontSize: "0.85rem",
                opacity: 0.75,
              }}
            >
              Start with something like:{" "}
              <span style={{ opacity: 0.95 }}>
                “Check if the protagonist&apos;s arc is consistent between Act 1 and Act
                3.”
              </span>
            </div>
          )}

          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "82%",
                padding: "0.55rem 0.8rem",
                borderRadius:
                  m.role === "user"
                    ? "14px 14px 2px 14px"
                    : "14px 14px 14px 2px",
                backgroundColor:
                  m.role === "user"
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.85)",
                fontSize: "0.86rem",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content}
            </div>
          ))}
        </div>

        {error && (
          <div
            style={{
              fontSize: "0.78rem",
              color: "#ff9b9b",
            }}
          >
            {error}
          </div>
        )}

        {/* input */}
        <form
          onSubmit={handleSend}
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "0.5rem",
            paddingTop: "0.4rem",
            borderTop: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              projectId
                ? "Ask the script / IP Bible…"
                : "No active project selected."
            }
            rows={2}
            style={{
              flex: 1,
              resize: "none",
              borderRadius: "0.8rem",
              padding: "0.5rem 0.65rem",
              border: "1px solid rgba(255,255,255,0.2)",
              backgroundColor: "rgba(3,4,10,0.9)",
              color: "#f5f5f5",
              fontSize: "0.85rem",
              outline: "none",
            }}
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            style={{
              alignSelf: "stretch",
              padding: "0.45rem 0.9rem",
              borderRadius: "999px",
              border: "none",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: isSending || !input.trim() ? "default" : "pointer",
              backgroundColor: "#ffffff",
              color: "#050509",
              opacity: isSending || !input.trim() ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {isSending ? "Thinking…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  )
}
