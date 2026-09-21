import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, unauthorized } from '@/lib/auth'
import { generateBadgesPdf, generateChevaletsPdf, type DocPerson } from '@/lib/documents'

/**
 * Génère les PDF de réunion (badges ou chevalets) pour une liste de membres.
 * POST /api/documents/badges   { ids: number[] }
 * POST /api/documents/chevalets{ ids: number[] }
 * Réponse : fichier PDF en pièce jointe (téléchargement direct).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const session = await getSession(req)
  if (!session) return unauthorized()

  const { type } = await params
  if (type !== 'badges' && type !== 'chevalets') {
    return NextResponse.json({ error: 'Type inconnu' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const ids: number[] = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Boolean) : []
  if (ids.length === 0) {
    return NextResponse.json({ error: 'Aucun membre sélectionné' }, { status: 400 })
  }

  // Scoping chapitre pour les non-admins.
  const isAdmin = session.role === 'admin'
  const rows = isAdmin
    ? await sql`
        SELECT id, first_name, last_name, company, activity, sphere, city, logo_path
        FROM members WHERE id = ANY(${ids})
        ORDER BY last_name, first_name`
    : await sql`
        SELECT id, first_name, last_name, company, activity, sphere, city, logo_path
        FROM members WHERE id = ANY(${ids}) AND chapter_id = ANY(${session.chapterIds})
        ORDER BY last_name, first_name`

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Aucun membre trouvé' }, { status: 404 })
  }

  // Conserve l'ordre demandé par l'utilisateur.
  const byId = new Map(rows.map((r) => [Number(r.id), r]))
  const people: DocPerson[] = ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((r) => ({
      first_name: r!.first_name as string,
      last_name: r!.last_name as string,
      company: r!.company as string,
      activity: r!.activity as string,
      sphere: r!.sphere as string,
      city: r!.city as string,
      logo: (r!.logo_path as string) || null,
    }))

  const buffer = type === 'badges'
    ? await generateBadgesPdf(people)
    : await generateChevaletsPdf(people)

  const filename = type === 'badges' ? 'Badges_BNI.pdf' : 'Chevalets_BNI.pdf'
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
