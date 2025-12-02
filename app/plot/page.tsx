"use client"

import React, { useEffect, useState } from "react"
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

export default function PlotPage() {
  const [plotTitle, setPlotTitle] = useState(ipBibleSample.plot.title)
  const [logline, setLogline] = useState(ipBibleSample.plot.logline)
  const [synopsis, setSynopsis] = useState(ipBibleSample.plot.synopsis)

  useEffect(() => {
    const bible = loadIpBibleFromLocalStorage()
    setPlotTitle(bible.plot.title)
    setLogline(bible.plot.logline)
    setSynopsis(bible.plot.synopsis)
  }, [])

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

      <h1 style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>Plot</h1>

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
            Title
          </h2>
          <p
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              opacity: 0.95,
              margin: 0,
            }}
          >
            {plotTitle}
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>
            Logline
          </h2>
          <p
            style={{
              fontSize: "0.98rem",
              opacity: 0.95,
              margin: 0,
            }}
          >
            {logline}
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>
            Synopsis
          </h2>
          <p
            style={{
              fontSize: "0.96rem",
              opacity: 0.95,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {synopsis}
          </p>
        </div>
      </section>
    </main>
  )
}
