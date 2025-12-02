"use client"

import React, { useEffect, useState } from "react"

type Summary = {
  wordCount: number
  characters: number
  locations: number
}

type ProjectMeta = {
  id: string
  name: string
  createdAt: string
}

type HeroRecord = {
  url: string
  source: "pdf" | "ai"
}

type EngineOption = {
  id: string
  label: string
}

// Global engines the user can pick in the UI
// IDs MUST match EngineId in lib/engines.ts
const ENGINE_OPTIONS: EngineOption[] = [
  { id: "gemini-3-preview", label: "Gemini · 3 Pro Preview" },
  { id: "openai-gpt-5.1", label: "OpenAI · GPT-5.1" },
  { id: "openai-gpt-5-mini", label: "OpenAI · GPT-5 Mini" },
]

// Default must be an EngineId, not a provider model name
const DEFAULT_ENGINE_ID = "gemini-3-preview"

export default function HomePage() {
  // --- upload state ---
  const [projectName, setProjectName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  // --- projects list state ---
  const [projects, setProjects] = useState<ProjectMeta[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

  // --- hero image for active project ---
  const [hero, setHero] = useState<HeroRecord | null>(null)

  // --- global engine selection ---
  const [engineId, setEngineId] = useState<string>(DEFAULT_ENGINE_ID)

  // ----------------- load projects + engine on mount -----------------

  useEffect(() => {
    async function loadProjects() {
      setIsLoadingProjects(true)
      setProjectsError(null)
      try {
        const res = await fetch("/api/projects")
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          throw new Error(data.error || "Failed to load projects.")
        }

        const list = (data.projects || []) as ProjectMeta[]
        setProjects(list)

        if (typeof window !== "undefined") {
          // restore active project
          const storedId =
            window.localStorage.getItem("ipbible:currentProjectId")
          if (storedId) {
            setActiveProjectId(storedId)
          }

          // restore global engine
          const storedEngine =
            window.localStorage.getItem("ipbible:globalEngineId")
          if (storedEngine) {
            setEngineId(storedEngine)
          }
        }
      } catch (err: any) {
        console.error("loadProjects error:", err)
        setProjectsError(err?.message || "Failed to load projects.")
      } finally {
        setIsLoadingProjects(false)
      }
    }

    loadProjects()
  }, [])

  // ----------------- load hero + canon + script when activeProjectId changes -----------------

  useEffect(() => {
    async function loadHeroAndCanon() {
      if (!activeProjectId) {
        setHero(null)
        return
      }
      try {
        const res = await fetch(
          `/api/project?id=${encodeURIComponent(activeProjectId)}`
        )
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          console.error("Failed to load project for hero:", data.error)
          setHero(null)
          return
        }

        const heroRecord = (data.hero || null) as HeroRecord | null
        setHero(heroRecord)

        if (typeof window !== "undefined") {
          if (data.ipBible) {
            window.localStorage.setItem(
              "ipBible",
              JSON.stringify(data.ipBible)
            )
          }
          if (data.script?.text) {
            window.localStorage.setItem(
              "ipbible:scriptText",
              data.script.text
            )
          }
          if (data.script?.filename) {
            window.localStorage.setItem(
              "ipbible:scriptFilename",
              data.script.filename
            )
          }
          window.localStorage.setItem(
            "ipbible:currentProjectId",
            activeProjectId
          )
          window.localStorage.setItem(
            "ipbible:currentProjectName",
            data.ipBible?.plot?.title || activeProjectId
          )
        }
      } catch (err) {
        console.error("loadHeroAndCanon error:", err)
        setHero(null)
      }
    }

    loadHeroAndCanon()
  }, [activeProjectId])

  // ----------------- upload + analyze -----------------

  async function handleSaveAnalyze(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSummary(null)

    if (!projectName.trim()) {
      setError("Please choose a project name.")
      return
    }
    if (!file) {
      setError("Choose a .txt, .pdf, .doc or .docx file first.")
      return
    }

    try {
      setIsUploading(true)

      const formData = new FormData()
      formData.append("projectName", projectName.trim())
      formData.append("file", file)

      // Send engine selection to backend for project config
      formData.append("globalEngineId", engineId)
      formData.append("canonEngineId", engineId)
      formData.append("copilotEngineId", engineId)
      formData.append("imageEngineId", engineId)

      const res = await fetch("/api/upload-script", {
        method: "POST",
        body: formData,
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || "Upload failed.")
      }

      const newSummary = data.summary as Summary
      const projectId = data.projectId as string
      const savedName = (data.projectName as string) || projectName.trim()
      const ipBible = data.ipBible
      const heroRecord = (data.hero || null) as HeroRecord | null

      setSummary(newSummary)

      // add new project to list (prepend so it appears on top)
      const meta: ProjectMeta = {
        id: projectId,
        name: savedName,
        createdAt: new Date().toISOString(),
      }
      setProjects((prev) => [meta, ...prev])

      // mark as active + push bible/hero/script + engine to localStorage
      if (typeof window !== "undefined") {
        if (ipBible) {
          window.localStorage.setItem("ipBible", JSON.stringify(ipBible))
        }
        if (data.script?.text) {
          window.localStorage.setItem(
            "ipbible:scriptText",
            data.script.text
          )
        }
        if (data.script?.filename) {
          window.localStorage.setItem(
            "ipbible:scriptFilename",
            data.script.filename
          )
        }
        window.localStorage.setItem("ipbible:currentProjectId", projectId)
        window.localStorage.setItem(
          "ipbible:currentProjectName",
          savedName
        )
        window.localStorage.setItem("ipbible:globalEngineId", engineId)
      }

      setActiveProjectId(projectId)
      setHero(heroRecord)
    } catch (err: any) {
      console.error("handleSaveAnalyze error:", err)
      setError(err?.message || "Something went wrong.")
    } finally {
      setIsUploading(false)
    }
  }

  // ----------------- use existing project -----------------

  async function handleUseProject(project: ProjectMeta) {
    setError(null)
    setSummary(null)

    try {
      const res = await fetch(
        `/api/project?id=${encodeURIComponent(project.id)}`
      )
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || "Failed to load project.")
      }

      const ipBible = data.ipBible
      const heroRecord = (data.hero || null) as HeroRecord | null

      if (typeof window !== "undefined") {
        if (ipBible) {
          window.localStorage.setItem("ipBible", JSON.stringify(ipBible))
        }
        if (data.script?.text) {
          window.localStorage.setItem(
            "ipbible:scriptText",
            data.script.text
          )
        }
        if (data.script?.filename) {
          window.localStorage.setItem(
            "ipbible:scriptFilename",
            data.script.filename
          )
        }
        window.localStorage.setItem("ipbible:currentProjectId", project.id)
        window.localStorage.setItem(
          "ipbible:currentProjectName",
          project.name
        )
        // keep current engineId as global; don't overwrite here
      }

      setActiveProjectId(project.id)
      setHero(heroRecord)
    } catch (err: any) {
      console.error("handleUseProject error:", err)
      setError(err?.message || "Could not activate this project.")
    }
  }

  // ----------------- delete project -----------------

  async function handleDeleteProject(id: string) {
    setError(null)
    try {
      const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete project.")
      }

      setProjects((prev) => prev.filter((p) => p.id !== id))

      if (typeof window !== "undefined") {
        const activeId =
          window.localStorage.getItem("ipbible:currentProjectId")
        if (activeId === id) {
          window.localStorage.removeItem("ipbible:currentProjectId")
          window.localStorage.removeItem("ipbible:currentProjectName")
          window.localStorage.removeItem("ipBible")
          window.localStorage.removeItem("ipbible:scriptText")
          window.localStorage.removeItem("ipbible:scriptFilename")
          setActiveProjectId(null)
          setHero(null)
        }
      }
    } catch (err: any) {
      console.error("handleDeleteProject error:", err)
      setError(err?.message || "Could not delete this project.")
    }
  }

  const showProjectsEmpty =
    !isLoadingProjects && projectsError == null && projects.length === 0

  // ----------------- UI -----------------

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem 1.5rem 3rem",
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "#050509",
        color: "#f5f5f5",
        display: "grid",
        gridTemplateColumns: "minmax(0, 3fr) minmax(260px, 2fr)",
        gap: "2rem",
      }}
    >
      {/* LEFT: Upload + hero + IP views */}
      <div>
        <header style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}>
            Otherly IP Bible · Test App v1.0
          </h1>
          <p
            style={{
              opacity: 0.8,
              maxWidth: 640,
              fontSize: "0.95rem",
            }}
          >
            Upload a script file, give it a name, and save it as an IP project.
            Then explore it as structured IP: characters, locations, plot, art
            style, and world rules.
          </p>
        </header>

        {/* Upload / analyze */}
        <section
          style={{
            borderRadius: "1.2rem",
            padding: "1.2rem 1.3rem 1.4rem",
            border: "1px solid rgba(255,255,255,0.2)",
            background:
              "radial-gradient(circle at top, rgba(255,255,255,0.12), rgba(0,0,0,1))",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.0rem", marginBottom: "0.8rem" }}>
            Save & analyze a new project
          </h2>

          <form
            onSubmit={handleSaveAnalyze}
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <label style={{ fontSize: "0.85rem", opacity: 0.85 }}>
              Project name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Monsterful: Spruce Mountain Arc"
              style={{
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.3)",
                padding: "0.5rem 0.7rem",
                backgroundColor: "transparent",
                color: "#f5f5f5",
                fontSize: "0.9rem",
              }}
            />

            <label style={{ fontSize: "0.85rem", opacity: 0.85 }}>
              Script file (this will be analyzed and saved as IP Canon)
            </label>
            <input
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                setFile(f)
                setSummary(null)
                setError(null)
              }}
              style={{ fontSize: "0.85rem" }}
            />

            {file && (
              <p
                style={{
                  fontSize: "0.8rem",
                  opacity: 0.8,
                  margin: 0,
                }}
              >
                Selected file: <strong>{file.name}</strong>
              </p>
            )}

            {/* 🔽 Engine selector */}
            <div
              style={{
                marginTop: "0.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
              }}
            >
              <label style={{ fontSize: "0.85rem", opacity: 0.85 }}>
                LLM engine (Canon / Co-Pilot / Images)
              </label>
              <select
                value={engineId}
                onChange={(e) => {
                  const next = e.target.value
                  setEngineId(next)
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("ipbible:globalEngineId", next)
                  }
                }}
                style={{
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.3)",
                  padding: "0.45rem 0.6rem",
                  backgroundColor: "rgba(0,0,0,0.7)",
                  color: "#f5f5f5",
                  fontSize: "0.85rem",
                }}
              >
                {ENGINE_OPTIONS.map((opt) => (
                  <option
                    key={opt.id}
                    value={opt.id}
                    style={{ color: "#000", backgroundColor: "#fff" }}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              style={{
                marginTop: "0.6rem",
                padding: "0.6rem 1.4rem",
                borderRadius: "999px",
                border: "none",
                fontSize: "0.9rem",
                fontWeight: 500,
                cursor: isUploading ? "default" : "pointer",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.75))",
                color: "#050509",
              }}
            >
              {isUploading ? "Analyzing file…" : "Save & Analyze (AI)"}
            </button>
          </form>

          <div style={{ marginTop: "1rem", minHeight: "2.5rem" }}>
            {error && (
              <p style={{ color: "#ff8585", fontSize: "0.85rem" }}>{error}</p>
            )}
            {summary && (
              <div
                style={{
                  padding: "0.7rem 0.9rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background:
                    "radial-gradient(circle at top, rgba(255,255,255,0.06), rgba(0,0,0,0.95))",
                  fontSize: "0.85rem",
                  opacity: 0.95,
                }}
              >
                <div style={{ marginBottom: "0.25rem", opacity: 0.85 }}>
                  AI analysis complete:
                </div>
                <div>• Approx words / tokens: {summary.wordCount}</div>
                <div>• Characters: {summary.characters}</div>
                <div>• Locations: {summary.locations}</div>
                <div
                  style={{
                    marginTop: "0.25rem",
                    fontSize: "0.8rem",
                    opacity: 0.75,
                  }}
                >
                  The canon has been saved for this project. Open Characters,
                  Locations, etc. to see the cards.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* HERO IMAGE for active project */}
        {hero && (
          <section
            style={{
              borderRadius: "1.2rem",
              padding: "1.2rem 1.3rem 1.4rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background:
                "radial-gradient(circle at top, rgba(255,255,255,0.10), rgba(0,0,0,1))",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                fontSize: "0.85rem",
                opacity: 0.8,
                marginBottom: "0.6rem",
              }}
            >
              Project key art{" "}
              <span
                style={{
                  fontSize: "0.75rem",
                  opacity: 0.7,
                  marginLeft: "0.4rem",
                }}
              >
                {hero.source === "pdf"
                  ? "extracted from uploaded PDF"
                  : "generated by AI"}
              </span>
            </div>
            <div
              style={{
                borderRadius: "1rem",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.15)",
                maxHeight: 420,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.url}
                alt="Project hero image"
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          </section>
        )}

        {/* IP views */}
        <section>
          <h2
            style={{
              fontSize: "1.0rem",
              marginBottom: "0.9rem",
            }}
          >
            IP Bible views
          </h2>

          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <a href="/plot" style={{ textDecoration: "none", color: "inherit" }}>
              <div
                style={{
                  borderRadius: "1rem",
                  padding: "0.9rem 1rem",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background:
                    "radial-gradient(circle at top, rgba(255,255,255,0.12), rgba(0,0,0,1))",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    opacity: 0.75,
                    marginBottom: "0.2rem",
                  }}
                >
                  PLOT
                </div>
                <div style={{ fontSize: "1.0rem", fontWeight: 500 }}>
                  Title, logline & synopsis
                </div>
                <p
                  style={{
                    fontSize: "0.85rem",
                    opacity: 0.8,
                    marginTop: "0.2rem",
                  }}
                >
                  Conventional overview of the story in one place.
                </p>
              </div>
            </a>

            <a
              href="/characters"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  borderRadius: "1rem",
                  padding: "0.9rem 1rem",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background:
                    "radial-gradient(circle at top, rgba(255,255,255,0.12), rgba(0,0,0,1))",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    opacity: 0.75,
                    marginBottom: "0.2rem",
                  }}
                >
                  CHARACTERS
                </div>
                <div style={{ fontSize: "1.0rem", fontWeight: 500 }}>
                  Trade cards for every character
                </div>
                <p
                  style={{
                    fontSize: "0.85rem",
                    opacity: 0.8,
                    marginTop: "0.2rem",
                  }}
                >
                  Name, occupation, role, short bio — plus a detail page.
                </p>
              </div>
            </a>

            <a
              href="/locations"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  borderRadius: "1rem",
                  padding: "0.9rem 1rem",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background:
                    "radial-gradient(circle at top, rgba(255,255,255,0.12), rgba(0,0,0,1))",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    opacity: 0.75,
                    marginBottom: "0.2rem",
                  }}
                >
                  LOCATIONS
                </div>
                <div style={{ fontSize: "1.0rem", fontWeight: 500 }}>
                  Trade cards for every place
                </div>
                <p
                  style={{
                    fontSize: "0.85rem",
                    opacity: 0.8,
                    marginTop: "0.2rem",
                  }}
                >
                  World, region, type, mood line, and a location sheet.
                </p>
              </div>
            </a>

            <a
              href="/art-style"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  borderRadius: "1rem",
                  padding: "0.9rem 1rem",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background:
                    "radial-gradient(circle at top, rgba(255,255,255,0.12), rgba(0,0,0,1))",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    opacity: 0.75,
                    marginBottom: "0.2rem",
                  }}
                >
                  ART STYLE
                </div>
                <div style={{ fontSize: "1.0rem", fontWeight: 500 }}>
                  Aesthetic & color system
                </div>
                <p
                  style={{
                    fontSize: "0.85rem",
                    opacity: 0.8,
                    marginTop: "0.2rem",
                  }}
                >
                  Text description of the visual language and palette.
                </p>
              </div>
            </a>

            <a
              href="/world-rules"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  borderRadius: "1rem",
                  padding: "0.9rem 1rem",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background:
                    "radial-gradient(circle at top, rgba(255,255,255,0.12), rgba(0,0,0,1))",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    opacity: 0.75,
                    marginBottom: "0.2rem",
                  }}
                >
                  WORLD RULES
                </div>
                <div style={{ fontSize: "1.0rem", fontWeight: 500 }}>
                  Physics / magic, tech, society
                </div>
                <p
                  style={{
                    fontSize: "0.85rem",
                    opacity: 0.8,
                    marginTop: "0.2rem",
                  }}
                >
                  Short, readable canon of how the world actually works.
                </p>
              </div>
            </a>
          </div>
        </section>
      </div>

      {/* RIGHT: Saved IP Projects */}
      <aside
        style={{
          borderRadius: "1.2rem",
          padding: "1.2rem 1.3rem 1.4rem",
          border: "1px solid rgba(255,255,255,0.2)",
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.10), rgba(0,0,0,1))",
          alignSelf: "flex-start",
          minHeight: 260,
        }}
      >
        <h2 style={{ fontSize: "1.0rem", marginBottom: "0.6rem" }}>
          Saved IP Projects
        </h2>

        <p
          style={{
            fontSize: "0.82rem",
            opacity: 0.8,
            marginBottom: "0.9rem",
          }}
        >
          Pick a project to make it active, or delete it if it&apos;s obsolete.
          The IP views and the Co-Pilot chat will switch to the active canon.
        </p>

        {isLoadingProjects && (
          <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>Loading projects…</p>
        )}

        {projectsError && (
          <p style={{ fontSize: "0.85rem", color: "#ff8585" }}>
            {projectsError}
          </p>
        )}

        {showProjectsEmpty && (
          <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>
            No projects yet. Upload a script to create your first IP.
          </p>
        )}

        {!showProjectsEmpty && !isLoadingProjects && !projectsError && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
              maxHeight: "420px",
              overflowY: "auto",
              paddingRight: "0.25rem",
            }}
          >
            {projects.map((p) => {
              const isActive = p.id === activeProjectId
              return (
                <div
                  key={p.id}
                  style={{
                    borderRadius: "0.9rem",
                    padding: "0.6rem 0.75rem 0.7rem",
                    border: isActive
                      ? "1px solid rgba(255,255,255,0.9)"
                      : "1px solid rgba(255,255,255,0.22)",
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.6)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                    fontSize: "0.85rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                      <div style={{ opacity: 0.6, fontSize: "0.78rem" }}>
                        {new Date(p.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.35rem",
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={() => handleUseProject(p)}
                        style={{
                          padding: "0.25rem 0.7rem",
                          borderRadius: "999px",
                          border: "none",
                          fontSize: "0.78rem",
                          fontWeight: 500,
                          cursor: "pointer",
                          backgroundColor: "#ffffff",
                          color: "#050509",
                        }}
                      >
                        {isActive ? "Active" : "Use"}
                      </button>
                      <button
                        onClick={() => handleDeleteProject(p.id)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "999px",
                          border: "1px solid rgba(255,255,255,0.4)",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          backgroundColor: "transparent",
                          color: "#ff9c9c",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </aside>
    </main>
  )
}
