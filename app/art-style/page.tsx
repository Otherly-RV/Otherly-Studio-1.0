"use client"

import React, { useEffect, useState, useMemo } from "react"
import { ipBibleSample, type IpBible } from "../ip-bible"

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

export default function ArtStylePage() {
  const [aesthetic, setAesthetic] = useState(ipBibleSample.artStyle.aesthetic)
  const [palette, setPalette] = useState(ipBibleSample.artStyle.palette)

  useEffect(() => {
    const bible = loadIpBibleFromLocalStorage()
    setAesthetic(bible.artStyle.aesthetic)
    setPalette(bible.artStyle.palette)
  }, [])

  const hexColors = useMemo(() => {
    const matches =
      palette.match(/#(?:[0-9a-fA-F]{3}){1,2}\b/g) || []
    // dedupe
    return Array.from(new Set(matches)).slice(0, 8)
  }, [palette])

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem 1.5rem 3rem",
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "#050509",
        color: "#f5f5f5",
      }}
    >
      <a
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          marginBottom: "1rem",
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

      <h1 style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>Art Style</h1>

      <section
        style={{
          maxWidth: 800,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>
            Aesthetic
          </h2>
          <p
            style={{
              fontSize: "0.96rem",
              opacity: 0.95,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {aesthetic}
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>
            Mood / Color palette
          </h2>
          <p
            style={{
              fontSize: "0.96rem",
              opacity: 0.95,
              lineHeight: 1.6,
              marginBottom: "0.7rem",
            }}
          >
            {palette}
          </p>

          {hexColors.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.6rem",
                alignItems: "center",
              }}
            >
              {hexColors.map((c) => (
                <div
                  key={c}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "999px",
                    backgroundColor: c,
                    border: "1px solid rgba(255,255,255,0.6)",
                    boxShadow: "0 0 10px rgba(0,0,0,0.7)",
                  }}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
