// app/locations/[id]/page.tsx
"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  ipBibleSample,
  type IpBible,
  type LocationCardData,
} from "../../ip-bible"

type LocationFull = LocationCardData & {
  moodLine?: string
  description?: string
  functionInStory?: string
  recurringTimeOrWeather?: string
  keyScenes?: string[]
}

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

export default function LocationDetailPage() {
  const params = useParams() as { id?: string }
  const rawId = params?.id ?? ""
  const locationId = decodeURIComponent(rawId)

  const [bible, setBible] = useState<IpBible | null>(null)
  const [location, setLocation] = useState<LocationFull | null>(null)
  const [locationIndex, setLocationIndex] = useState<number | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)

  // Load bible & location by id
  useEffect(() => {
    const b = loadIpBibleFromLocalStorage()
    setBible(b)

    const list = (b.locations && b.locations.list) || []
    let idx = list.findIndex((loc) => loc.id === locationId)

    if (idx === -1) {
      const maybeIndex = Number(locationId)
      if (
        Number.isInteger(maybeIndex) &&
        maybeIndex >= 0 &&
        maybeIndex < list.length
      ) {
        idx = maybeIndex
      }
    }

    if (idx >= 0 && idx < list.length) {
      const base = list[idx] as LocationCardData

      const byId = b.locations?.byId || {}
      const rich = (byId[base.id] as LocationFull | undefined) || (base as any)

      setLocation(rich)
      setLocationIndex(idx)
    } else {
      setLocation(null)
      setLocationIndex(null)
    }

    const pid = getActiveProjectId()
    setProjectId(pid)
  }, [locationId])

  // Load image from /api/project-images (by id or index)
  useEffect(() => {
    if (!projectId) return
    if (!location && locationIndex === null) return

    setImageLoading(true)

    ;(async () => {
      try {
        const res = await fetch(
          `/api/project-images?projectId=${encodeURIComponent(
            projectId
          )}&kind=locations`
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Failed to load images.")

        const rawImages = (data.images || {}) as Record<string, string>

        if (locationId && rawImages[locationId]) {
          setImageUrl(rawImages[locationId])
          return
        }

        if (
          locationIndex !== null &&
          rawImages[String(locationIndex)] &&
          rawImages[String(locationIndex)].length > 0
        ) {
          setImageUrl(rawImages[String(locationIndex)])
          return
        }

        setImageUrl(null)
      } catch (err) {
        console.error("location detail image load error:", err)
        setImageUrl(null)
      } finally {
        setImageLoading(false)
      }
    })()
  }, [projectId, locationId, locationIndex, location])

  const notFound = !location

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
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            marginBottom: "2rem",
          }}
        >
          <a
            href="/locations"
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
            <span>Back to locations</span>
          </a>

          {location && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.8rem",
                  opacity: 0.75,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Location sheet
              </span>
              <h1
                style={{
                  fontSize: "2.1rem",
                  margin: 0,
                }}
              >
                {location.name || "Untitled location"}
              </h1>
              <p
                style={{
                  fontSize: "0.95rem",
                  opacity: 0.82,
                  margin: 0,
                }}
              >
                {[location.world, location.region, location.placeType]
                  .filter(Boolean)
                  .join(" · ") || "Type not set"}
              </p>
            </div>
          )}

          {projectId && (
            <p
              style={{
                fontSize: "0.78rem",
                opacity: 0.5,
                margin: 0,
              }}
            >
              Active project: <code>{projectId}</code>
            </p>
          )}
        </header>

        {notFound && (
          <p
            style={{
              opacity: 0.8,
              fontSize: "0.95rem",
            }}
          >
            This location was not found in the current IP Bible. Go back to the
            Locations grid and make sure the project is loaded.
          </p>
        )}

        {!notFound && (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)",
              gap: "2.5rem",
              alignItems: "flex-start",
            }}
          >
            {/* Left: image / establishing shot */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  borderRadius: "1rem",
                  backgroundColor: "#090b10",
                  backgroundImage: imageUrl
                    ? `url(${imageUrl})`
                    : "linear-gradient(145deg, rgba(255,255,255,0.12), rgba(10,10,14,0.9))",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {imageLoading && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0,0,0,0.4)",
                      fontSize: "0.85rem",
                    }}
                  >
                    Loading image…
                  </div>
                )}
              </div>

              {location.moodLine && (
                <div
                  style={{
                    borderRadius: "0.9rem",
                    border: "1px solid rgba(255,255,255,0.18)",
                    padding: "0.7rem 0.9rem",
                    backgroundColor: "rgba(5,6,12,0.9)",
                    fontSize: "0.9rem",
                    opacity: 0.9,
                  }}
                >
                  “{location.moodLine}”
                </div>
              )}
            </div>

            {/* Right: description, function, time/weather, key scenes */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.6rem",
              }}
            >
              {(location.description || location.note) && (
                <section>
                  <h2
                    style={{
                      fontSize: "1rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Description
                  </h2>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      lineHeight: 1.6,
                      opacity: 0.86,
                    }}
                  >
                    {location.description || location.note}
                  </p>
                </section>
              )}

              {location.functionInStory && (
                <section>
                  <h2
                    style={{
                      fontSize: "1rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Function in story
                  </h2>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      lineHeight: 1.5,
                      opacity: 0.86,
                    }}
                  >
                    {location.functionInStory}
                  </p>
                </section>
              )}

              {location.recurringTimeOrWeather && (
                <section>
                  <h2
                    style={{
                      fontSize: "1rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Time / weather pattern
                  </h2>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      lineHeight: 1.5,
                      opacity: 0.86,
                    }}
                  >
                    {location.recurringTimeOrWeather}
                  </p>
                </section>
              )}

              {location.keyScenes && location.keyScenes.length > 0 && (
                <section>
                  <h2
                    style={{
                      fontSize: "1rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Key scenes
                  </h2>
                  <ol
                    style={{
                      paddingLeft: "1.2rem",
                      margin: 0,
                      display: "grid",
                      gap: "0.35rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    {location.keyScenes.map((scene, i) => (
                      <li
                        key={i}
                        style={{
                          opacity: 0.86,
                        }}
                      >
                        {scene}
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
