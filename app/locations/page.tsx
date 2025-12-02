// app/locations/page.tsx
"use client"

import React, { useEffect, useRef, useState } from "react"
import {
  ipBibleSample,
  type IpBible,
  type LocationCardData,
} from "../ip-bible"

type ImageMap = Record<number, string>

function loadIpBibleFromLocalStorage(): IpBible {
  if (typeof window === "undefined") return ipBibleSample
  const raw = window.localStorage.getItem("ipBible")
  if (!raw) return ipBibleSample
  try {
    return JSON.parse(raw) as IpBible
  } catch {
    return ipBibleSample
  }
}

function getActiveProjectId(): string | null {
  if (typeof window === "undefined") return null
  return (
    window.localStorage.getItem("ipbible:activeProjectId") ||
    window.localStorage.getItem("ipbible:currentProjectId") ||
    null
  )
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationCardData[]>([])
  const [imageUrls, setImageUrls] = useState<ImageMap>({})
  const [generating, setGenerating] = useState<Record<number, boolean>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [projectId, setProjectId] = useState<string | null>(null)
  const [imageEngine, setImageEngine] = useState<
    "openai-image-1" | "gemini-3-pro-image-preview"
  >("gemini-3-pro-image-preview")

  const uploadInputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const bible = loadIpBibleFromLocalStorage()
    const list = (bible.locations && bible.locations.list) || []
    setLocations(list as LocationCardData[])

    const pid = getActiveProjectId()
    setProjectId(pid)
  }, [])

  // Load image map from KV (Blob URLs) for this project
  // Supports keys as numeric indexes OR location IDs
  useEffect(() => {
    if (!projectId) return
    if (locations.length === 0) return

    ;(async () => {
      try {
        const res = await fetch(
          `/api/project-images?projectId=${encodeURIComponent(
            projectId
          )}&kind=locations`
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Failed to load images.")

        const raw = (data.images || {}) as Record<string, string>
        const map: ImageMap = {}

        Object.entries(raw).forEach(([k, v]) => {
          let idx = Number(k)
          if (Number.isNaN(idx)) {
            const foundIndex = locations.findIndex((loc) => loc.id === k)
            if (foundIndex !== -1) {
              idx = foundIndex
            }
          }
          if (!Number.isNaN(idx) && idx >= 0) {
            map[idx] = v
          }
        })

        setImageUrls(map)
      } catch (err) {
        console.error("load location images error:", err)
      }
    })()
  }, [projectId, locations])

  const showTemplate = locations.length === 0

  async function handleGenerateLocationImage(
    index: number,
    loc: LocationCardData
  ) {
    setErrors((prev) => ({ ...prev, [index]: "" }))

    if (!projectId) {
      setErrors((prev) => ({
        ...prev,
        [index]:
          "No active project. Go to the Home page and select or create a project first.",
      }))
      return
    }

    setGenerating((prev) => ({ ...prev, [index]: true }))

    try {
      const res = await fetch("/api/generate-location-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          locationId: loc.id,
          name: loc.name,
          description:
            loc.note ||
            [loc.world, loc.region, loc.placeType]
              .filter(Boolean)
              .join(" · ") ||
            "",
          engineId: imageEngine,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || "Location image generation failed.")
      }

      if (!data.url) throw new Error("Location image API did not return a URL.")

      setImageUrls((prev) => ({ ...prev, [index]: data.url }))
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        [index]: err?.message || "Location image generation failed.",
      }))
    } finally {
      setGenerating((prev) => ({ ...prev, [index]: false }))
    }
  }

  async function handleUploadImage(index: number, file: File) {
    if (!projectId) {
      setErrors((prev) => ({
        ...prev,
        [index]:
          "No active project. Go to the Home page and select or create a project first.",
      }))
      return
    }
    setErrors((prev) => ({ ...prev, [index]: "" }))

    try {
      const formData = new FormData()
      formData.append("projectId", projectId)
      formData.append("kind", "locations")
      formData.append("index", String(index))
      formData.append("file", file)

      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || "Upload failed.")
      }
      if (!data.url) throw new Error("Upload: no URL returned.")

      setImageUrls((prev) => ({ ...prev, [index]: data.url }))
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        [index]: err?.message || "Upload failed.",
      }))
    }
  }

  function handleUploadClick(index: number) {
    const input = uploadInputRefs.current[index]
    if (input) input.click()
  }

  function handleFileChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    void handleUploadImage(index, file)
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2.5rem 2rem 4rem",
        background:
          "radial-gradient(circle at top, #151822 0, #05060a 45%, #020308 100%)",
        color: "#f5f5f5",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, system-ui, -system-ui, "SF Pro Text", sans-serif',
      }}
    >
      <header
        style={{
          maxWidth: 980,
          margin: "0 auto 2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.35rem 0.9rem",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.16)",
            fontSize: "0.85rem",
            textDecoration: "none",
            color: "#f5f5f5",
            opacity: 0.85,
          }}
        >
          <span>←</span>
          <span>Back to categories</span>
        </a>

        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Locations</h1>

        <p
          style={{
            opacity: 0.7,
            marginBottom: "1.5rem",
            maxWidth: 620,
            fontSize: "0.95rem",
          }}
        >
          Trade cards for every location. Generate or upload an establishing
          shot, then click a card to see the full location sheet (and map if
          real).
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            marginBottom: "1.5rem",
            fontSize: "0.85rem",
            opacity: 0.85,
          }}
        >
          <span style={{ opacity: 0.7 }}>Image engine:</span>
          <select
            value={imageEngine}
            onChange={(e) =>
              setImageEngine(
                e.target.value as
                  | "openai-image-1"
                  | "gemini-3-pro-image-preview"
              )
            }
            style={{
              backgroundColor: "rgba(10,10,15,0.9)",
              color: "#f5f5f5",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.25)",
              padding: "0.25rem 0.75rem",
              fontSize: "0.85rem",
            }}
          >
            <option value="gemini-3-pro-image-preview">
              Gemini 3 Pro (image)
            </option>
            <option value="openai-image-1">OpenAI Image 1</option>
          </select>
        </div>
      </header>

      <section
        style={{
          maxWidth: 980,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {showTemplate && (
          <div
            style={{
              borderRadius: "1rem",
              border: "1px solid rgba(255,255,255,0.15)",
              padding: "0.9rem",
              background:
                "radial-gradient(circle at top left, #272c3a 0, #10121a 55%, #05060b 100%)",
              display: "flex",
              flexDirection: "column",
              gap: "0.8rem",
            }}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "16 / 9",
                borderRadius: "0.8rem",
                background:
                  "linear-gradient(145deg, rgba(255,255,255,0.16), rgba(10,10,14,0.9))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                opacity: 0.75,
              }}
            >
              Establishing shot placeholder
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  opacity: 0.75,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Location
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 500 }}>
                Location name
              </div>
              <p
                style={{
                  fontSize: "0.85rem",
                  opacity: 0.8,
                  marginBottom: "0.4rem",
                }}
              >
                World · region · type
              </p>
              <p
                style={{
                  fontSize: "0.83rem",
                  opacity: 0.78,
                }}
              >
                Mood line: how it feels to arrive here.
              </p>
            </div>
          </div>
        )}

        {locations.map((loc, index) => {
          const url = imageUrls[index]
          const isGenerating = !!generating[index]
          const error = errors[index]

          return (
            <div key={loc.id || index} style={{ position: "relative" }}>
              <input
                type="file"
                accept="image/*"
                ref={(el) => {
  uploadInputRefs.current[index] = el
}}
                style={{ display: "none" }}
                onChange={(e) => handleFileChange(index, e)}
              />

              <a
                href={`/locations/${encodeURIComponent(loc.id)}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.8rem",
                  borderRadius: "1rem",
                  border: "1px solid rgba(255,255,255,0.15)",
                  padding: "0.9rem",
                  textDecoration: "none",
                  color: "#f5f5f5",
                  background:
                    "radial-gradient(circle at top left, #202434 0, #0c0f18 55%, #05060b 100%)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16 / 9",
                    borderRadius: "0.8rem",
                    backgroundColor: "#090b10",
                    backgroundImage: url
                      ? `url(${url})`
                      : "linear-gradient(145deg, rgba(255,255,255,0.12), rgba(10,10,14,0.9))",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {isGenerating && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        fontSize: "0.8rem",
                      }}
                    >
                      Generating…
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.8rem",
                      opacity: 0.75,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    Location
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 500 }}>
                    {loc.name || "Untitled location"}
                  </div>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      opacity: 0.8,
                      marginBottom: "0.25rem",
                    }}
                  >
                    {[loc.world, loc.region, loc.placeType]
                      .filter(Boolean)
                      .join(" · ") || "Type not set"}
                  </p>
                  {loc.note && (
                    <p
                      style={{
                        fontSize: "0.83rem",
                        opacity: 0.78,
                      }}
                    >
                      {loc.note}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginTop: "0.25rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      void handleGenerateLocationImage(index, loc)
                    }}
                    disabled={isGenerating}
                    style={{
                      flex: 1,
                      borderRadius: "999px",
                      border: "1px solid rgba(255,255,255,0.3)",
                      backgroundColor: "transparent",
                      color: "#f5f5f5",
                      fontSize: "0.8rem",
                      padding: "0.35rem 0.75rem",
                      cursor: isGenerating ? "default" : "pointer",
                    }}
                  >
                    {isGenerating ? "Generating…" : "Generate image"}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      handleUploadClick(index)
                    }}
                    style={{
                      borderRadius: "999px",
                      border: "1px solid rgba(255,255,255,0.18)",
                      backgroundColor: "rgba(255,255,255,0.05)",
                      color: "#f5f5f5",
                      fontSize: "0.8rem",
                      padding: "0.35rem 0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    Upload
                  </button>
                </div>

                {error && (
                  <p
                    style={{
                      marginTop: "0.25rem",
                      color: "#ff9b9b",
                      fontSize: "0.8rem",
                    }}
                  >
                    {error}
                  </p>
                )}
              </a>
            </div>
          )
        })}
      </section>
    </main>
  )
}
