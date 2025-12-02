// app/characters/[id]/page.tsx
"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  ipBibleSample,
  type IpBible,
  type CharacterCardData,
} from "../../ip-bible"

type CharacterFull = CharacterCardData & {
  longBio?: string
  shortBio?: string
  visualNotes?: string
  goals?: string
  flaws?: string
  relationships?: { name: string; relation: string; note?: string }[]
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

export default function CharacterDetailPage() {
  const params = useParams() as { id?: string }
  const rawId = params?.id ?? ""
  const characterId = decodeURIComponent(rawId)

  const [bible, setBible] = useState<IpBible | null>(null)
  const [character, setCharacter] = useState<CharacterFull | null>(null)
  const [characterIndex, setCharacterIndex] = useState<number | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)

  // Load bible & character by id
  useEffect(() => {
    const b = loadIpBibleFromLocalStorage()
    setBible(b)

    const list = (b.characters && b.characters.list) || []
    let idx = list.findIndex((c) => c.id === characterId)

    if (idx === -1) {
      // fallback: if id is numeric and within range, use it as index
      const maybeIndex = Number(characterId)
      if (
        Number.isInteger(maybeIndex) &&
        maybeIndex >= 0 &&
        maybeIndex < list.length
      ) {
        idx = maybeIndex
      }
    }

    if (idx >= 0 && idx < list.length) {
      const base = list[idx] as CharacterCardData

      // try enriched data from byId
      const byId = b.characters?.byId || {}
      const rich = (byId[base.id] as CharacterFull | undefined) || (base as any)

      setCharacter(rich)
      setCharacterIndex(idx)
    } else {
      setCharacter(null)
      setCharacterIndex(null)
    }

    const pid = getActiveProjectId()
    setProjectId(pid)
  }, [characterId])

  // Load image for this character (by id or index) from /api/project-images
  useEffect(() => {
    if (!projectId) return
    if (!character && characterIndex === null) return

    setImageLoading(true)

    ;(async () => {
      try {
        const res = await fetch(
          `/api/project-images?projectId=${encodeURIComponent(
            projectId
          )}&kind=characters`
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Failed to load images.")

        const rawImages = (data.images || {}) as Record<string, string>

        // first try by id
        if (characterId && rawImages[characterId]) {
          setImageUrl(rawImages[characterId])
          return
        }

        // then try by index
        if (
          characterIndex !== null &&
          rawImages[String(characterIndex)] &&
          rawImages[String(characterIndex)].length > 0
        ) {
          setImageUrl(rawImages[String(characterIndex)])
          return
        }

        setImageUrl(null)
      } catch (err) {
        console.error("character detail image load error:", err)
        setImageUrl(null)
      } finally {
        setImageLoading(false)
      }
    })()
  }, [projectId, characterId, characterIndex, character])

  const notFound = !character

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
            href="/characters"
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
            <span>Back to characters</span>
          </a>

          {character && (
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
                Character sheet
              </span>
              <h1
                style={{
                  fontSize: "2.1rem",
                  margin: 0,
                }}
              >
                {character.name || "Untitled character"}
              </h1>
              <p
                style={{
                  fontSize: "0.95rem",
                  opacity: 0.82,
                  margin: 0,
                }}
              >
                {[character.occupation, character.role]
                  .filter(Boolean)
                  .join(" · ") || "Role not set"}
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
            This character was not found in the current IP Bible. Go back to the
            Characters grid and make sure the project is loaded.
          </p>
        )}

        {!notFound && (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)",
              gap: "2.5rem",
              alignItems: "flex-start",
            }}
          >
            {/* Left: portrait + basic info */}
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
                  aspectRatio: "3 / 4",
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

              <div
                style={{
                  borderRadius: "0.9rem",
                  border: "1px solid rgba(255,255,255,0.18)",
                  padding: "0.7rem 0.9rem",
                  backgroundColor: "rgba(5,6,12,0.9)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <span
                    style={{
                      opacity: 0.6,
                      marginRight: "0.4rem",
                    }}
                  >
                    Occupation:
                  </span>
                  <span>{character.occupation || "—"}</span>
                </div>
                <div>
                  <span
                    style={{
                      opacity: 0.6,
                      marginRight: "0.4rem",
                    }}
                  >
                    Role:
                  </span>
                  <span>{character.role || "—"}</span>
                </div>
              </div>
            </div>

            {/* Right: bios, goals, relationships, key scenes */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.6rem",
              }}
            >
              {/* Bio */}
              {(character.longBio || character.bio || character.shortBio) && (
                <section>
                  <h2
                    style={{
                      fontSize: "1rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Biography
                  </h2>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      lineHeight: 1.6,
                      opacity: 0.86,
                    }}
                  >
                    {character.longBio ||
                      character.bio ||
                      character.shortBio}
                  </p>
                </section>
              )}

              {/* Visual notes */}
              {character.visualNotes && (
                <section>
                  <h2
                    style={{
                      fontSize: "1rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Visual notes
                  </h2>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      lineHeight: 1.5,
                      opacity: 0.84,
                    }}
                  >
                    {character.visualNotes}
                  </p>
                </section>
              )}

              {/* Goals & flaws */}
              {(character.goals || character.flaws) && (
                <section
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "1.3rem",
                  }}
                >
                  {character.goals && (
                    <div>
                      <h2
                        style={{
                          fontSize: "1rem",
                          marginBottom: "0.4rem",
                        }}
                      >
                        Goals
                      </h2>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          opacity: 0.86,
                          lineHeight: 1.5,
                        }}
                      >
                        {character.goals}
                      </p>
                    </div>
                  )}
                  {character.flaws && (
                    <div>
                      <h2
                        style={{
                          fontSize: "1rem",
                          marginBottom: "0.4rem",
                        }}
                      >
                        Flaws
                      </h2>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          opacity: 0.86,
                          lineHeight: 1.5,
                        }}
                      >
                        {character.flaws}
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* Relationships */}
              {character.relationships && character.relationships.length > 0 && (
                <section>
                  <h2
                    style={{
                      fontSize: "1rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Relationships
                  </h2>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "grid",
                      gap: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    {character.relationships.map((rel, i) => (
                      <li
                        key={`${rel.name}-${rel.relation}-${i}`}
                        style={{
                          padding: "0.4rem 0.5rem",
                          borderRadius: "0.6rem",
                          backgroundColor: "rgba(255,255,255,0.03)",
                        }}
                      >
                        <strong>{rel.name}</strong>{" "}
                        <span
                          style={{
                            opacity: 0.7,
                          }}
                        >
                          — {rel.relation}
                        </span>
                        {rel.note && (
                          <span
                            style={{
                              opacity: 0.8,
                              display: "block",
                              marginTop: "0.15rem",
                            }}
                          >
                            {rel.note}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Key scenes */}
              {character.keyScenes && character.keyScenes.length > 0 && (
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
                    {character.keyScenes.map((scene, i) => (
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
