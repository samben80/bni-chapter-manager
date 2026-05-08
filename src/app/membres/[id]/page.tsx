'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarCheck, FileText, CheckCircle, Clock, AlertTriangle, Trash2 } from 'lucide-react'
import { formatDate, getInterviewLabel, getInterviewStatusColor, getInterviewStatusLabel } from '@/lib/utils'
import type { Interview } from '@/lib/types'

interface MemberDetail {
  id: number; full_name: string; company: string; activity: string; bni_activity?: string
  email?: string; phone?: string; mobile?: string; website?: string
  address?: string; city?: string; department?: string; postal_code?: string
  intro_date: string; renewal_date?: string; months_since_intro: number; status: string
  sponsor?: string; bni_role?: string; chapter_name?: string
  cumulative_duration?: string
  interviews: Interview[]
  assignments: { role: string; ambassador_name: string }[]
}

const STATUS_OPTIONS = [
  { value: 'Actif',                  label: 'Actif',                  style: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'Arrêté',                 label: 'Arrêté',                 style: 'bg-red-50 text-red-600 border-red-200' },
  { value: 'Annulé',                 label: 'Annulé',                 style: 'bg-orange-50 text-orange-600 border-orange-200' },
  { value: 'Renouvellement en cours', label: 'Renouvellement en cours', style: 'bg-blue-50 text-blue-600 border-blue-200' },
  { value: 'Postulation en cours',   label: 'Postulation en cours',   style: 'bg-purple-50 text-purple-600 border-purple-200' },
]

export default function MembrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [member, setMember] = useState<MemberDetail | null>(null)
  const [status, setStatus] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = () => fetch(`/api/members/${id}`).then(r => r.json()).then((data: MemberDetail) => {
    setMember(data)
    setStatus(data.status)
  })

  useEffect(() => { load() }, [id])

  const changeStatus = async (newStatus: string) => {
    setStatus(newStatus)
    setSavingStatus(true)
    await fetch(`/api/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setSavingStatus(false)
  }

  const deleteMember = async () => {
    setDeleting(true)
    await fetch(`/api/members/${id}`, { method: 'DELETE' })
    router.push('/membres')
  }

  if (!member) return (
    <div className="flex items-center justify-center h-full text-gray-400">Chargement...</div>
  )

  const onboardingAmb = member.assignments?.find(a => a.role === 'onboarding')?.ambassador_name
  const coachAmb = member.assignments?.find(a => a.role === 'coach_business')?.ambassador_name
  const interviewOrder: Record<string, number> = { preboarding: 1, '3months': 2, '7months': 3, '10months': 4 }
  const interviews = [...(member.interviews || [])].sort((a, b) => interviewOrder[a.type] - interviewOrder[b.type])
  const currentStatusStyle = STATUS_OPTIONS.find(o => o.value === status)?.style ?? ''

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <a href="/membres" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={16} /> Retour aux membres
        </a>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={15} /> Supprimer
        </button>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{member.full_name}</h1>
            <p className="text-gray-500 mt-1">{member.company}</p>
            <p className="text-sm text-gray-400 mt-0.5">{member.bni_activity || member.activity}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <PhaseBadge months={member.months_since_intro} />
            {/* Status selector — saves immediately on change */}
            <div className="relative">
              <select
                value={status}
                onChange={e => changeStatus(e.target.value)}
                disabled={savingStatus}
                className={`text-xs font-semibold px-3 py-1.5 border rounded-full appearance-none cursor-pointer pr-7 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300 disabled:opacity-60 ${currentStatusStyle}`}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-current opacity-60">▾</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <Info label="Chapitre" value={member.chapter_name || '—'} />
          <Info label="Intronisation" value={formatDate(member.intro_date)} />
          <Info label="Ancienneté" value={`${member.months_since_intro} mois`} />
          {member.renewal_date && <Info label="Renouvellement" value={formatDate(member.renewal_date)} />}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          <Info label="Email" value={member.email || '—'} />
          <Info label="Téléphone" value={member.phone || '—'} />
          {member.mobile && <Info label="Mobile" value={member.mobile} />}
          {member.website && <Info label="Site web" value={member.website} />}
        </div>

        {(member.address || member.city || member.department || member.postal_code) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
            {member.address && <Info label="Adresse" value={member.address} />}
            {member.city && <Info label="Ville" value={member.city} />}
            {member.department && <Info label="Département" value={member.department} />}
            {member.postal_code && <Info label="Code postal" value={member.postal_code} />}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          {member.bni_role && <Info label="Rôle BNI" value={member.bni_role} />}
          {member.sponsor && <Info label="Parrain" value={member.sponsor} />}
          {member.cumulative_duration && <Info label="Durée cumulée" value={member.cumulative_duration} />}
          <Info label="Ambassadeur On Boarding" value={onboardingAmb || '—'} />
          <Info label="Ambassadeur Coach Business" value={coachAmb || '—'} />
        </div>
      </div>

      {/* Timeline entretiens */}
      <h2 className="font-semibold text-gray-900 mb-4">Parcours d&apos;entretiens</h2>
      <div className="space-y-3">
        {interviews.map(iv => (
          <InterviewCard key={iv.id} interview={iv} />
        ))}
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">Supprimer ce membre ?</h3>
            <p className="text-sm text-gray-500 text-center mb-1">
              <span className="font-semibold text-gray-700">{member.full_name}</span>
            </p>
            <p className="text-xs text-red-600 text-center mb-6">
              Tous ses entretiens seront également supprimés. Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 px-4 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={deleteMember} disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50"
                style={{ backgroundColor: '#C0392B' }}>
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
    </div>
  )
}

function PhaseBadge({ months }: { months: number }) {
  let label = 'Renouvellement'; let style = 'bg-green-50 text-green-700'
  if (months < 3) { label = 'Onboarding'; style = 'bg-blue-50 text-blue-700' }
  else if (months < 7) { label = '3 mois'; style = 'bg-amber-50 text-amber-700' }
  else if (months < 10) { label = '7 mois'; style = 'bg-purple-50 text-purple-700' }
  return <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${style}`}>{label}</span>
}

function InterviewCard({ interview }: { interview: Interview }) {
  const icons: Record<string, React.ReactNode> = {
    completed: <CheckCircle size={18} className="text-green-500" />,
    overdue: <AlertTriangle size={18} className="text-red-500" />,
    scheduled: <Clock size={18} className="text-blue-500" />,
    pending: <CalendarCheck size={18} className="text-gray-300" />,
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className="flex-shrink-0">{icons[interview.status]}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">{getInterviewLabel(interview.type)}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {interview.scheduled_date ? `Prévu le ${formatDate(interview.scheduled_date)}` : 'Non planifié'}
          {interview.completed_date ? ` · Réalisé le ${formatDate(interview.completed_date)}` : ''}
        </p>
      </div>
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getInterviewStatusColor(interview.status)}`}>
        {getInterviewStatusLabel(interview.status)}
      </span>
      <a href={`/entretiens/${interview.id}`}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex-shrink-0">
        <FileText size={13} />
        {interview.status === 'completed' ? 'Voir' : 'Saisir'}
      </a>
    </div>
  )
}
