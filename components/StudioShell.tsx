'use client'

import { useState } from 'react'

type Project = {
  id: string
  title: string
  slug: string | null
  status: string
}

type Card = {
  id: string
  type: string
  title: string
  summary: string | null
  content: any
  order_index: number
}

type Mode = 'canon' | 'copilot'

type Props = {
  project: Project | null
  cards: Card[]
}

export function StudioShell({ project, cards }: Props) {
  const [mode, setMode] = useState<Mode>('canon')

  const [prompt, setPrompt] = useState('')

  // later this will call your ipchat route with project.id + messages
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    setMode('copilot')
    // TODO: send prompt to Co-Pilot API
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8f8f8',
      }}
    >
      {/* Top bar: active project */}
      <header
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: '#888' }}>ACTIVE PROJECT</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {project ? project.title : 'No project found'}
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#aaa' }}>
          {project ? `status: ${project.status}` : ''}
        </div>
      </header>

      {/* Main area */}
      <main
        style={{
          flex: 1,
          padding: '16px 24px 80px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Canon Carousel vs Co-Pilot */}
        {mode === 'canon' ? (
          <CanonCarousel cards={cards} />
        ) : (
          <CoPilotPanel project={project} />
        )}
      </main>

      {/* Bottom bar: Canon button + prompt bar + overlay buttons */}
      <footer
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 24px',
          background: '#ffffff',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Left: Canon Cards button */}
        <button
          type="button"
          onClick={() => setMode('canon')}
          style={{
            borderRadius: 999,
            border: '1px solid #ddd',
            padding: '8px 16px',
            fontSize: 12,
            background: mode === 'canon' ? '#f0f0f0' : '#ffffff',
          }}
        >
          CANON CARDS
        </button>

        {/* Center: prompt bar (click → switches to Co-Pilot) */}
        <form
          onSubmit={handleSubmit}
          style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
        >
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setMode('copilot')}
            placeholder="What are we creating today?"
            style={{
              width: '100%',
              maxWidth: 640,
              borderRadius: 999,
              border: '1px solid #ddd',
              padding: '8px 16px',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </form>

        {/* Right: three overlay buttons (not wired yet) */}
        <div style={{ display: 'flex', gap: 8 }}>
          <OverlayDot color="#c5b3ff" title="Exec Goals/Tasks" />
          <OverlayDot color="#ffc58a" title="Conversations / Recommendations" />
          <OverlayDot color="#ddd" title="Reserved" />
        </div>
      </footer>
    </div>
  )
}

function CanonCarousel({ cards }: { cards: Card[] }) {
  return (
    <section style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, color: '#666' }}>Canon Cards</div>
      <div
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 8,
        }}
      >
        {cards.length === 0 && (
          <div style={{ fontSize: 12, color: '#999' }}>No cards for this project yet.</div>
        )}

        {cards.map((card) => (
          <div
            key={card.id}
            style={{
              minWidth: 220,
              maxWidth: 260,
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #eee',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>
              {card.type}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{card.title}</div>
            {card.summary && (
              <div
                style={{
                  fontSize: 12,
                  color: '#666',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {card.summary}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function CoPilotPanel({ project }: { project: Project | null }) {
  return (
    <section
      style={{
        flex: 1,
        borderRadius: 24,
        border: '1px solid #e0e0e0',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        color: '#999',
      }}
    >
      {project ? `CO-PILOT for ${project.title}` : 'No active project'}
    </section>
  )
}

function OverlayDot({ color, title }: { color: string; title: string }) {
  return (
    <button
      type="button"
      title={title}
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        border: 'none',
        background: color,
        cursor: 'pointer',
      }}
    />
  )
}
