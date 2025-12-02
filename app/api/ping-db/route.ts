import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic' // avoid caching while we debug

export async function GET() {
  try {
    const rows = await sql/*sql*/`
      SELECT id, title, status, created_at
      FROM projects
      ORDER BY created_at DESC
      LIMIT 20
    `

    return NextResponse.json({ projects: rows })
  } catch (err: any) {
    console.error('Error fetching projects:', err)
    return new NextResponse(
      JSON.stringify({
        error: 'DB error',
        detail: err?.message || String(err),
      }),
      { status: 500 }
    )
  }
}
