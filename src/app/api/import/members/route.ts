import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, unauthorized } from '@/lib/auth'

interface ImportMember {
  first_name: string
  last_name: string
  intro_date: string
  chapter_name: string
  cumulative_duration?: string
  cumulative_start_date?: string
  current_duration?: string
  company?: string
  activity?: string
  bni_role?: string
  phone?: string
  mobile?: string
  email?: string
  website?: string
  address?: string
  city?: string
  department?: string
  postal_code?: string
  renewal_date?: string
  sponsor?: string
  status?: string
}

const VALID_STATUSES = ['Actif', 'Arrêté', 'Annulé', 'Renouvellement en cours', 'Postulation en cours']
const mapStatus = (s?: string) => {
  if (!s) return 'Actif'
  if (VALID_STATUSES.includes(s)) return s
  const l = s.toLowerCase()
  if (l.includes('arrêt') || l.includes('arret')) return 'Arrêté'
  if (l.includes('annul')) return 'Annulé'
  if (l.includes('renouvellement')) return 'Renouvellement en cours'
  if (l.includes('postulation')) return 'Postulation en cours'
  return 'Actif'
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()
  if (session.role === 'amb') return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await req.json()
  const { members }: { members: ImportMember[] } = body

  if (!members?.length) return NextResponse.json({ error: 'No members provided' }, { status: 400 })

  const results = {
    imported: 0,
    updated: 0,
    deactivated: 0,
    errors: [] as string[],
    updated_members: [] as { id: number; name: string; chapter_name: string; intro_date: string }[],
  }

  // Preload all chapters
  const existingChapters = await sql`SELECT id, name FROM chapters` as { id: number; name: string }[]
  const chapterCache = new Map<string, number>(existingChapters.map(c => [c.name, c.id]))

  const getOrCreateChapter = async (name: string): Promise<number> => {
    if (chapterCache.has(name)) return chapterCache.get(name)!
    const [row] = await sql`
      INSERT INTO chapters (name) VALUES (${name})
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `
    chapterCache.set(name, row.id)
    return row.id
  }

  for (const m of members) {
    try {
      const chapterId = await getOrCreateChapter(m.chapter_name || 'Sans chapitre')
      const mappedStatus = mapStatus(m.status)

      // Upsert member — COALESCE preserves richer data across re-imports
      const [row] = await sql`
        INSERT INTO members (
          chapter_id, first_name, last_name, company, activity,
          email, phone, mobile, website, address, city, department, postal_code,
          intro_date, renewal_date, sponsor, bni_role,
          cumulative_duration, cumulative_start_date, status
        ) VALUES (
          ${chapterId}, ${m.first_name}, ${m.last_name},
          ${m.company || ''}, ${m.activity || ''},
          ${m.email || null}, ${m.phone || null}, ${m.mobile || null},
          ${m.website || null}, ${m.address || null}, ${m.city || null},
          ${m.department || null}, ${m.postal_code || null},
          ${m.intro_date},
          ${m.renewal_date || null}, ${m.sponsor || null}, ${m.bni_role || null},
          ${m.cumulative_duration || null}, ${m.cumulative_start_date || null},
          ${mappedStatus}
        )
        ON CONFLICT (chapter_id, first_name, last_name, intro_date) DO UPDATE SET
          company              = COALESCE(NULLIF(EXCLUDED.company, ''), members.company),
          activity             = COALESCE(NULLIF(EXCLUDED.activity, ''), members.activity),
          email                = COALESCE(EXCLUDED.email, members.email),
          phone                = COALESCE(EXCLUDED.phone, members.phone),
          mobile               = COALESCE(EXCLUDED.mobile, members.mobile),
          website              = COALESCE(EXCLUDED.website, members.website),
          address              = COALESCE(EXCLUDED.address, members.address),
          city                 = COALESCE(EXCLUDED.city, members.city),
          department           = COALESCE(EXCLUDED.department, members.department),
          postal_code          = COALESCE(EXCLUDED.postal_code, members.postal_code),
          renewal_date         = COALESCE(EXCLUDED.renewal_date, members.renewal_date),
          sponsor              = COALESCE(EXCLUDED.sponsor, members.sponsor),
          bni_role             = COALESCE(EXCLUDED.bni_role, members.bni_role),
          cumulative_duration  = COALESCE(EXCLUDED.cumulative_duration, members.cumulative_duration),
          cumulative_start_date= COALESCE(EXCLUDED.cumulative_start_date, members.cumulative_start_date),
          status               = EXCLUDED.status
        RETURNING id, (xmax = 0) AS is_new
      ` as { id: number; is_new: boolean }[]

      const memberId = row.id
      const isNew = row.is_new

      if (isNew) {
        // Create interviews for new members only
        const offsets: [string, number][] = [
          ['preboarding', 0], ['3months', 3], ['7months', 7], ['10months', 10]
        ]
        for (const [type, offset] of offsets) {
          const interval = `${offset} months`
          await sql`
            INSERT INTO interviews (member_id, type, scheduled_date, status)
            SELECT
              ${memberId}, ${type},
              (${m.intro_date}::date + ${interval}::interval)::date,
              'scheduled'
            WHERE (${m.intro_date}::date + ${interval}::interval)::date >= CURRENT_DATE
            ON CONFLICT (member_id, type) DO NOTHING
          `
        }
        results.imported++
      } else {
        results.updated++
        results.updated_members.push({
          id: memberId,
          name: `${m.first_name} ${m.last_name}`,
          chapter_name: m.chapter_name || 'Sans chapitre',
          intro_date: m.intro_date,
        })
      }
    } catch (e) {
      results.errors.push(`${m.first_name} ${m.last_name}: ${e}`)
    }
  }

  // Enforce single-active rule across all chapters: keep only the latest intro_date active
  const deactivated = await sql`
    UPDATE members SET status = 'Arrêté'
    WHERE status IN ('Actif', 'Renouvellement en cours', 'Postulation en cours')
      AND EXISTS (
        SELECT 1 FROM members m2
        WHERE m2.first_name = members.first_name
          AND m2.last_name  = members.last_name
          AND m2.status     IN ('Actif', 'Renouvellement en cours', 'Postulation en cours')
          AND m2.intro_date > members.intro_date
          AND m2.id        != members.id
      )
    RETURNING id
  `
  results.deactivated = deactivated.length

  return NextResponse.json(results)
}
