import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
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
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'dc', 'amb')),
      ambassador_id INTEGER REFERENCES ambassadors(id),
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS user_chapters (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      chapter_id INTEGER NOT NULL REFERENCES chapters(id),
      PRIMARY KEY(user_id, chapter_id)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS member_idp (
      id SERIAL PRIMARY KEY,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      report_date DATE NOT NULL,
      presences   INTEGER DEFAULT 0,
      absences    INTEGER DEFAULT 0,
      retards     INTEGER DEFAULT 0,
      m_col       INTEGER DEFAULT 0,
      substituts  INTEGER DEFAULT 0,
      rdi         INTEGER DEFAULT 0,
      rde         INTEGER DEFAULT 0,
      rri         INTEGER DEFAULT 0,
      rre         INTEGER DEFAULT 0,
      invites     INTEGER DEFAULT 0,
      tet         NUMERIC(8,1) DEFAULT 0,
      mpb         NUMERIC(15,2) DEFAULT 0,
      ueg         INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(member_id, report_date)
    )
  `

  await sql`
    INSERT INTO chapters (name, region) VALUES ('BNI Impulse', 'Casablanca')
    ON CONFLICT (name) DO NOTHING
  `

  // ── Migrations members : champs badges & chevalets ───────────────────────
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS sphere    TEXT`
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS logo_path TEXT`

  // ── Migrations users table ───────────────────────────────────────────────
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name  TEXT`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS company    TEXT`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone      TEXT`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS amb_role   TEXT`
  // Extend role constraint to include new roles
  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`
  await sql`ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin','codir','amb','dc','dz','dr'))`

  // Create default admin account if none exists
  const existing = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`
  if (existing.length === 0) {
    const hash = await bcrypt.hash('Admin@BNI2025', 12)
    await sql`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Administrateur', 'admin@bni.ma', ${hash}, 'admin')
      ON CONFLICT (email) DO NOTHING
    `
  }

  return NextResponse.json({ ok: true, message: 'Schema initialized' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
