import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  await sql`
    CREATE TABLE IF NOT EXISTS chapters (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      region TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      chapter_id INTEGER REFERENCES chapters(id),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      activity TEXT NOT NULL DEFAULT '',
      bni_activity TEXT,
      email TEXT,
      phone TEXT,
      mobile TEXT,
      website TEXT,
      address TEXT,
      city TEXT,
      department TEXT,
      postal_code TEXT,
      intro_date DATE NOT NULL,
      renewal_date DATE,
      sponsor TEXT,
      bni_role TEXT,
      cumulative_duration TEXT,
      cumulative_start_date TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(chapter_id, first_name, last_name, intro_date)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS ambassadors (
      id SERIAL PRIMARY KEY,
      chapter_id INTEGER REFERENCES chapters(id),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      company TEXT,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL CHECK(role IN ('onboarding', 'coach_business', 'both')),
      active INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS ambassador_assignments (
      id SERIAL PRIMARY KEY,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      ambassador_id INTEGER NOT NULL REFERENCES ambassadors(id),
      role TEXT NOT NULL CHECK(role IN ('onboarding', 'coach_business')),
      start_date DATE NOT NULL,
      end_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS interviews (
      id SERIAL PRIMARY KEY,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      ambassador_id INTEGER REFERENCES ambassadors(id),
      type TEXT NOT NULL CHECK(type IN ('preboarding', '3months', '7months', '10months')),
      scheduled_date DATE,
      completed_date DATE,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'scheduled', 'completed', 'overdue')),
      form_data TEXT,
      committee_member1 TEXT,
      committee_member1_opinion TEXT,
      committee_member2 TEXT,
      committee_member2_opinion TEXT,
      positive_points TEXT,
      concerns TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(member_id, type)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS ambassador_chapters (
      id SERIAL PRIMARY KEY,
      ambassador_id INTEGER NOT NULL REFERENCES ambassadors(id) ON DELETE CASCADE,
      chapter_id INTEGER NOT NULL REFERENCES chapters(id),
      UNIQUE(ambassador_id, chapter_id)
    )
  `

  await sql`
    INSERT INTO chapters (name, region) VALUES ('BNI Impulse', 'Casablanca')
    ON CONFLICT (name) DO NOTHING
  `

  return NextResponse.json({ ok: true, message: 'Schema initialized' })
}
