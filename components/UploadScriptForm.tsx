"use client"

import React, { useState } from "react"

type EngineId =
  | "openai-4.1"
  | "openai-4.1-mini"
  | "gemini-2.5-flash-image"
  | "gemini-3-pro-image-preview"

type UploadResponse = {
  projectId: string
  projectName: string
  summary: {
    wordCount: number
    characters: number
    locations: number
  }
  ipBible: any
  hero?: {
    url: string
    source: "pdf" | "ai"
  } | null
  engines: {
    globalEngineId: EngineId
    canonEngineId: EngineId
    copilotEngineId?: EngineId
    imageEngineId?: EngineId
  }
}

const ENGINE_OPTIONS: { id: EngineId; label: string }[] = [
  { id: "openai-4.1", label: "OpenAI · GPT-4.1 + DALL·E 3" },
  { id: "openai-4.1-mini", label: "OpenAI · 4.1-mini + DALL·E 3" },
  { id: "gemini-2.5-flash-image", label: "Gemini · 2.5 Flash Image" },
  { id: "gemini-3-pro-image-preview", label: "Gemini · 3 Pro Image Preview" },
]

type Props = {
  // callback opzionale se vuoi aggiornare lo stato globale dopo l'upload
  onProjectCreated?: (payload: UploadResponse) => void
}

export function UploadScriptForm({ onProjectCreated }: Props) {
  const [projectName, setProjectName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [engineId, setEngineId] = useState<EngineId>("openai-4.1")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<UploadResponse | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLastResult(null)

    if (!file) {
      setError("Seleziona uno script.")
      return
    }

    if (!projectName.trim()) {
      setError("Inserisci un nome progetto.")
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("projectName", projectName.trim())

      // 🔴 Punto chiave: engineId va al backend
      formData.append("engineId", engineId)

      const res = await fetch("/api/upload-script", {
        method: "POST",
        body: formData,
      })

      const data = (await res.json()) as UploadResponse | { error?: string }

      if (!res.ok) {
        console.error("upload error:", data)
        setError((data as any)?.error || "Upload fallito.")
        return
      }

      const payload = data as UploadResponse
      setLastResult(payload)
      if (onProjectCreated) onProjectCreated(payload)

      // opzionale: reset parziale del form
      // setProjectName("")
      // setFile(null)
    } catch (err: any) {
      console.error("upload exception:", err)
      setError(err?.message || "Errore di rete.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 border rounded-lg p-4 bg-white">
        <div>
          <label className="block text-xs font-medium mb-1 uppercase tracking-wide">
            Project name
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="border border-neutral-300 px-3 py-2 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="Es. BAD INFLUENCE S01"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 uppercase tracking-wide">
            Script file
          </label>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          <p className="text-[11px] text-neutral-500 mt-1">
            Formati supportati: .pdf, .docx, .txt
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 uppercase tracking-wide">
            Engine (testo + immagini)
          </label>
          <select
            value={engineId}
            onChange={(e) => setEngineId(e.target.value as EngineId)}
            className="border border-neutral-300 px-3 py-2 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white"
          >
            {ENGINE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-neutral-500 mt-1">
            Questo modello verrà usato per la HARD CANON, il Co-Pilot e le immagini (con
            override avanzati più avanti).
          </p>
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}

        <button
          type="submit"
          disabled={isLoading}
          className="bg-black text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-60"
        >
          {isLoading ? "Uploading & parsing…" : "Upload & Generate IP Bible"}
        </button>
      </form>

      {lastResult && (
        <div className="mt-4 border rounded-lg p-3 text-xs bg-neutral-50">
          <div className="font-medium mb-1">
            Project created: {lastResult.projectName} ({lastResult.projectId})
          </div>
          <div className="mb-1">
            Words: {lastResult.summary.wordCount} · Characters:{" "}
            {lastResult.summary.characters} · Locations: {lastResult.summary.locations}
          </div>
          <div className="mb-1">
            Engine config: global = {lastResult.engines.globalEngineId}, canon ={" "}
            {lastResult.engines.canonEngineId},{" "}
            copilot = {lastResult.engines.copilotEngineId || "∅ (= global)"},{" "}
            images = {lastResult.engines.imageEngineId || "∅ (= global)"}
          </div>
          {lastResult.hero?.url && (
            <div className="mt-2">
              <div className="mb-1">Hero image ({lastResult.hero.source}):</div>
              <img
                src={lastResult.hero.url}
                alt="Hero"
                className="w-full max-w-md rounded border border-neutral-200"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
