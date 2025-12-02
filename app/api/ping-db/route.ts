// app/api/ping-db/route.ts
import { NextResponse } from 'next/server'
import { sql } from '../../../lib/db'

export async function GET() {
  try {
    const rows = await sql`SELECT now()`
    return NextResponse.json({ ok: true, now: rows[0].now })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    )
  }
}
