"use client"

import React, { useState } from "react"

export default function PdfTestPage() {
  const [images, setImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setImages([])
    setIsLoading(true)

    const form = new FormData(e.currentTarget)
    const file = form.get("file") as File | null
    if (!file) {
      setError("Choose a PDF first.")
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch("/api/pdf-images", {
        method: "POST",
        body: form,
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data?.error || "Request failed.")
      }

      if (!data.images || !Array.isArray(data.images)) {
        throw new Error("No images returned from API.")
      }

      setImages(data.images as string[])
    } catch (err: any) {
      setError(err?.message || "Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

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
        <span>Back home</span>
      </a>

      <h1 style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>
        PDF → Image test
      </h1>
      <p
        style={{
          opacity: 0.75,
          marginBottom: "1.25rem",
          maxWidth: 640,
          fontSize: "0.95rem",
        }}
      >
        Upload a PDF. This page calls <code>/api/pdf-images</code> and shows
        the pages as PNGs (data URLs) if it works.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          maxWidth: 480,
        }}
      >
        <input
          type="file"
          name="file"
          accept=".pdf"
          onChange={(e) => {
            const f = e.target.files?.[0]
            setFileName(f ? f.name : null)
          }}
        />

        {fileName && (
          <p
            style={{
              fontSize: "0.8rem",
              opacity: 0.8,
              margin: 0,
            }}
          >
            Selected: <strong>{fileName}</strong>
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            alignSelf: "flex-start",
            padding: "0.45rem 1.2rem",
            borderRadius: "999px",
            border: "none",
            backgroundColor: "#ffffff",
            color: "#050509",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: isLoading ? "default" : "pointer",
          }}
        >
          {isLoading ? "Converting…" : "Convert PDF to images"}
        </button>
      </form>

      {error && (
        <p
          style={{
            color: "#ff8585",
            fontSize: "0.9rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </p>
      )}

      {images.length > 0 && (
        <section>
          <h2
            style={{
              fontSize: "1.1rem",
              marginBottom: "0.75rem",
            }}
          >
            Page previews ({images.length})
          </h2>
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {images.map((src, i) => (
              <div
                key={i}
                style={{
                  borderRadius: "0.75rem",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.16)",
                  backgroundColor: "#111",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`PDF page ${i + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
