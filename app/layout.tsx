import type { Metadata } from "next"
import "./globals.css"
import { IpChat } from "../components/IpChat"   // 👈 named import, not default

export const metadata: Metadata = {
  title: "Otherly IP Bible · Test App",
  description: "Prototype for Living Bible / IP Brain",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          backgroundColor: "#050509",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)", // 2/3 + 1/3
          }}
        >
          {/* LEFT: whatever page you are on (home, characters, locations, etc.) */}
          <div style={{ minWidth: 0 }}>{children}</div>

          {/* RIGHT: IP co-pilot chat, always present */}
          <IpChat />
        </div>
      </body>
    </html>
  )
}
