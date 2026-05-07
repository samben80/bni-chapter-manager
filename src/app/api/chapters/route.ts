import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  const chapters = await sql`SELECT id, name, region FROM chapters ORDER BY name`
  return NextResponse.json(chapters)
}
