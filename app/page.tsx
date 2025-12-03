// app/page.tsx
import { sql } from '../lib/db'
import { StudioShell } from '../components/StudioShell'

type ProjectRow = {
  id: string
  title: string
  slug: string | null
  status: string
}

type CardRow = {
  id: string
  type: string
  title: string
  summary: string | null
  content: any
  order_index: number
}

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // For now: just take the most recent project.
  // Later we add a proper project switcher.
  const projects = await sql<ProjectRow[]>`
    SELECT id, title, slug, status
    FROM projects
    ORDER BY created_at DESC
    LIMIT 1
  `

  const project = projects[0] || null

  let cards: CardRow[] = []

  if (project) {
    cards = await sql<CardRow[]>`
      SELECT id, type, title, summary, content, order_index
      FROM cards
      WHERE project_id = ${project.id}
      ORDER BY type, order_index
    `
  }

  return <StudioShell project={project} cards={cards} />
}
