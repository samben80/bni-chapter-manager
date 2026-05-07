import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import {
  generatePreboardingDoc,
  generate3MonthsDoc,
  generate7MonthsDoc,
  generate10MonthsDoc
} from '@/lib/document-generator'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [interview] = await sql`
    SELECT i.*,
      m.first_name || ' ' || m.last_name AS full_name,
      m.company, m.activity, m.intro_date,
      c.name AS chapter_name,
      a.first_name || ' ' || a.last_name AS ambassador_name
    FROM interviews i
    JOIN members m ON m.id = i.member_id
    LEFT JOIN chapters c ON c.id = m.chapter_id
    LEFT JOIN ambassadors a ON a.id = i.ambassador_id
    WHERE i.id = ${id}
  ` as Record<string, unknown>[]

  if (!interview) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = {
    full_name: interview.full_name as string,
    company: interview.company as string,
    activity: interview.activity as string,
    intro_date: interview.intro_date as string,
    chapter_name: interview.chapter_name as string,
  }
  const ambassador = (interview.ambassador_name as string) || ''
  const interviewDate = (interview.completed_date as string) || (interview.scheduled_date as string) || new Date().toISOString().slice(0, 10)
  const formData = interview.form_data ? JSON.parse(interview.form_data as string) : {}

  let buffer: Buffer
  let filename: string

  switch (interview.type) {
    case 'preboarding':
      buffer = await generatePreboardingDoc(member, ambassador, interviewDate, formData)
      filename = `PreBoarding_${member.full_name.replace(/ /g, '_')}.docx`
      break
    case '3months':
      buffer = await generate3MonthsDoc(member, ambassador, interviewDate, formData)
      filename = `Entretien_3Mois_${member.full_name.replace(/ /g, '_')}.docx`
      break
    case '7months':
      buffer = await generate7MonthsDoc(member, ambassador, interviewDate, formData)
      filename = `RDV_7Mois_${member.full_name.replace(/ /g, '_')}.docx`
      break
    case '10months':
      buffer = await generate10MonthsDoc(member, ambassador, interviewDate, formData)
      filename = `RDV_Renouvellement_${member.full_name.replace(/ /g, '_')}.docx`
      break
    default:
      return NextResponse.json({ error: 'Unknown interview type' }, { status: 400 })
  }

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    }
  })
}
