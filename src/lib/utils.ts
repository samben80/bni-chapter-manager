import { type ClassValue, clsx } from 'clsx'
import { differenceInMonths, differenceInDays, addMonths, format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { InterviewType } from './types'

export function cn(...inputs: ClassValue[]) {
  // Simple class merger without clsx dependency issue
  return inputs.filter(Boolean).join(' ')
}

export function monthsSinceIntro(introDate: string): number {
  return differenceInMonths(new Date(), parseISO(introDate))
}

export function getScheduledInterviewDate(introDate: string, type: InterviewType): Date {
  const intro = parseISO(introDate)
  const offsets: Record<InterviewType, number> = {
    preboarding: 0,
    '3months': 3,
    '7months': 7,
    '10months': 10,
  }
  return addMonths(intro, offsets[type])
}

export function getDaysUntil(targetDate: Date): number {
  return differenceInDays(targetDate, new Date())
}

export function formatDate(date: string | Date | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy', { locale: fr })
}

export function formatDateLong(date: string | Date | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "d MMMM yyyy", { locale: fr })
}

export function getInterviewLabel(type: InterviewType): string {
  const labels: Record<InterviewType, string> = {
    preboarding: 'Pré-boarding',
    '3months': 'Entretien 3 mois',
    '7months': 'RDV Accompagnement 7 mois',
    '10months': 'RDV Renouvellement 10 mois',
  }
  return labels[type]
}

export function getInterviewStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800'
    case 'scheduled': return 'bg-blue-100 text-blue-800'
    case 'overdue': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-600'
  }
}

export function getInterviewStatusLabel(status: string): string {
  switch (status) {
    case 'completed': return 'Réalisé'
    case 'scheduled': return 'Planifié'
    case 'overdue': return 'En retard'
    default: return 'À planifier'
  }
}

export function getMemberPhase(monthsSince: number): string {
  if (monthsSince < 3) return 'Intégration (M0-M3)'
  if (monthsSince < 7) return 'Consolidation (M3-M6)'
  if (monthsSince < 10) return 'Développement (M7-M9)'
  return 'Renouvellement (M10+)'
}

export function getAmbassadorType(monthsSince: number): 'onboarding' | 'coach_business' {
  return monthsSince <= 6 ? 'onboarding' : 'coach_business'
}
