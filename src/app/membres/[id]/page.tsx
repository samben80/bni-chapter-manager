'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, CalendarCheck, FileText, CheckCircle, Clock, AlertTriangle,
  Trash2, History, Plus, BarChart2, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import { formatDate, getInterviewLabel, getInterviewStatusColor, getInterviewStatusLabel } from '@/lib/utils'
import type { Interview } from '@/lib/types'

interface HistoryEntry {
  id: number
  chapter_name: string
  intro_date: string
  renewal_date?: string
  status: string
  bni_role?: string
  company: string
  activity: string
}

interface MemberDetail {
  id: number; full_name: string; company: string; activity: string; bni_activity?: string
  email?: string; phone?: string; mobile?: string; website?: string
  address?: string; city?: string; department?: string; postal_code?: string
  intro_date: string; renewal_date?: string; months_since_intro: number; status: string
  sponsor?: string; bni_role?: string; chapter_name?: string
  cumulative_duration?: string
  interviews: Interview[]
  assignments: { role: string; ambassador_name: string }[]
  history: HistoryEntry[]
}

interface IdpRow {
  id: number; report_date: string
  presences: number; absences: number; retards: number; m_col: number; substituts: number
  rdi: number; rde: number; rri: number; rre: number
  invites: number; tet: number; mpb: number; ueg: number
}

interface SessionInfo {
  role: string
  ambRole?: string
  ambassadorRole?: string  // backwards compat for old JWTs
  ambassadorId?: number
}

const STATUS_OPTIONS = [
  { value: 'Actif',                  label: 'Actif',                  style: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'Arrêté',                 label: 'Arrêté',                 style: 'bg-red-50 text-red-600 border-red-200' },
  { value: 'Annulé',                 label: 'Annulé',                 style: 'bg-orange-50 text-orange-600 border-orange-200' },
  { value: 'Renouvellement en cours', label: 'Renouvellement en cours', style: 'bg-blue-50 text-blue-600 border-blue-200' },
  { value: 'Postulation en cours',   label: 'Postulation en cours',   style: 'bg-purple-50 text-purple-600 border-purple-200' },
]

const STATUS_BADGE: Record<string, string> = {
  'Actif':                   'bg-green-50 text-green-700',
  'Arrêté':                  'bg-red-50 text-red-600',
  'Annulé':                  'bg-orange-50 text-orange-600',
  'Renouvellement en cours': 'bg-blue-50 text-blue-600',
  'Postulation en cours':    'bg-purple-50 text-purple-600',
}

type Tab = 'infos' | 'entretiens' | 'membership'

const INTERVIEW_ORDER: Record<string, number> = { preboarding: 1, '3months': 2, '7months': 3, '10months': 4, free: 5 }

export default function MembrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [member, setMember] = useState<MemberDetail | null>(null)
  const [status, setStatus] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [tab, setTab] = useState<Tab>('infos')
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [idpData, setIdpData] = useState<IdpRow[]>([])
  const [creatingFree, setCreatingFree] = useState(false)

  const load = () =>
    Promise.all([
      fetch(`/api/members/${id}`).then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
      fetch(`/api/members/${id}/idp`).then(r => r.json()).catch(() => []),
    ]).then(([data, sess, idp]: [MemberDetail, SessionInfo, IdpRow[]]) => {
      setMember(data)
      setStatus(data.status)
      setSession(sess)
      setIdpData(Array.isArray(idp) ? idp : [])
    })

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const createFreeInterview = async () => {
    if (creatingFree) return
    setCreatingFree(true)
    const res = await fetch('/api/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: Number(id) }),
    })
    const data = await res.json()
    setCreatingFree(false)
    if (data.id) router.push(`/entretiens/${data.id}`)
    else alert(data.error ?? 'Erreur lors de la création')
  }

  if (!member) return (
    <div className="flex items-center justify-center h-full text-gray-400">Chargement...</div>
  )

  const onboardingAmb = member.assignments?.find(a => a.role === 'onboarding')?.ambassador_name
  const coachAmb = member.assignments?.find(a => a.role === 'coach_business')?.ambassador_name
  const interviews = [...(member.interviews || [])].sort((a, b) => {
    const oa = INTERVIEW_ORDER[a.type] ?? 9
    const ob = INTERVIEW_ORDER[b.type] ?? 9
    if (oa !== ob) return oa - ob
    return (a.created_at || '').localeCompare(b.created_at || '')
  })
  const currentStatusStyle = STATUS_OPTIONS.find(o => o.value === status)?.style ?? ''

  const effectiveAmbRole = session?.ambRole || session?.ambassadorRole
  // Show for admin + any amb UNLESS we know for certain it's onboarding-only
  const canCreateFree = session?.role === 'admin' ||
    (session?.role === 'amb' && effectiveAmbRole !== 'onboarding')

  const membershipInterviews = [...interviews].sort((a, b) => {
    const da = a.scheduled_date || a.created_at || ''
    const db = b.scheduled_date || b.created_at || ''
    return db.localeCompare(da)
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/membres" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={16} /> Retour aux membres
        </Link>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={15} /> Supprimer
        </button>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{member.full_name}</h1>
            <p className="text-gray-500 mt-1">{member.company}</p>
            <p className="text-sm text-gray-400 mt-0.5">{member.bni_activity || member.activity}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <PhaseBadge months={member.months_since_intro} />
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

      {/* IDP KPI block */}
      {idpData.length > 0 && <IdpKpiBlock data={idpData} />}

      {/* Tabs + Entretien libre button */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
          {([
            { value: 'infos',      label: 'Informations' },
            { value: 'entretiens', label: `Entretiens (${interviews.length})` },
            { value: 'membership', label: 'Membership', icon: <History size={12} />, badge: member.history?.length },
          ] as { value: Tab; label: string; icon?: React.ReactNode; badge?: number }[]).map(t => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.icon}
              {t.label}
              {t.badge ? (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.value ? 'bg-amber-100 text-amber-700' : 'bg-transparent text-gray-400'}`}>
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {canCreateFree && (
          <button
            onClick={createFreeInterview}
            disabled={creatingFree}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-60 transition-colors"
            style={{ backgroundColor: '#C0392B' }}
          >
            {creatingFree ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Entretien libre
          </button>
        )}
      </div>

      {/* Tab: Informations */}
      {tab === 'infos' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
          <p>Les informations détaillées du membre sont affichées dans la carte ci-dessus.</p>
        </div>
      )}

      {/* Tab: Entretiens */}
      {tab === 'entretiens' && (
        <div className="space-y-3">
          {interviews.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <CalendarCheck size={28} className="mx-auto mb-2 opacity-30" />
              <p>Aucun entretien planifié</p>
            </div>
          )}
          {interviews.map(iv => (
            <InterviewCard key={iv.id} interview={iv} />
          ))}
        </div>
      )}

      {/* Tab: Membership */}
      {tab === 'membership' && (
        <div className="space-y-4">
          {/* Interview history with form data */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Historique des entretiens</p>
            {membershipInterviews.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                <CalendarCheck size={28} className="mx-auto mb-2 opacity-30" />
                <p>Aucun entretien enregistré</p>
              </div>
            ) : (
              membershipInterviews.map(iv => (
                <MembershipInterviewCard key={iv.id} interview={iv} />
              ))
            )}
          </div>

          {/* Chapter history */}
          {member.history?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">Historique des chapitres</p>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Chapitre</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Intronisation</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Renouvellement</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rôle BNI</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {member.history.map(h => (
                      <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{h.chapter_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(h.intro_date)}</td>
                        <td className="px-4 py-3 text-gray-500">{h.renewal_date ? formatDate(h.renewal_date) : '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{h.bni_role || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[h.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {h.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <a href={`/membres/${h.id}`}
                            className="text-xs text-blue-500 hover:text-blue-700 hover:underline whitespace-nowrap">
                            Voir fiche →
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

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

function MembershipInterviewCard({ interview }: { interview: Interview }) {
  const [expanded, setExpanded] = useState(false)

  const formData: Record<string, unknown> = interview.form_data
    ? (typeof interview.form_data === 'string'
        ? (() => { try { return JSON.parse(interview.form_data as string) } catch { return {} } })()
        : interview.form_data as Record<string, unknown>)
    : {}

  const hasFormData = Object.keys(formData).length > 0

  const typeColors: Record<string, string> = {
    preboarding: 'bg-sky-100 text-sky-700',
    '3months': 'bg-amber-100 text-amber-700',
    '7months': 'bg-purple-100 text-purple-700',
    '10months': 'bg-green-100 text-green-700',
    free: 'bg-rose-100 text-rose-700',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${typeColors[interview.type] ?? 'bg-gray-100 text-gray-600'}`}>
          {getInterviewLabel(interview.type)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">
            {interview.scheduled_date ? formatDate(interview.scheduled_date) : '—'}
            {interview.ambassador_name ? ` · ${interview.ambassador_name}` : ''}
          </p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${getInterviewStatusColor(interview.status)}`}>
          {getInterviewStatusLabel(interview.status)}
        </span>
        <a href={`/entretiens/${interview.id}`}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex-shrink-0">
          <FileText size={12} />
          {interview.status === 'completed' ? 'Voir' : 'Saisir'}
        </a>
        {hasFormData && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 ml-1"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {expanded && hasFormData && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50">
          <FormDataSummary type={interview.type} data={formData} />
        </div>
      )}
    </div>
  )
}

function FormDataSummary({ type, data }: { type: string; data: Record<string, unknown> }) {
  const n = (k: string) => Number(data[k] ?? 0)
  const s = (k: string) => String(data[k] ?? '')
  const b = (k: string) => data[k] === true || data[k] === 'true'

  const rows: { label: string; value: string | number; highlight?: boolean }[] = []

  if (type === 'preboarding') {
    rows.push(
      { label: 'Étapes intégration expliquées', value: b('integration_steps_explained') ? '✓ Oui' : '✗ Non' },
      { label: 'Documents remis', value: b('welcome_docs_handed') ? '✓ Oui' : '✗ Non' },
      { label: 'Mentor assigné', value: b('mentor_assigned') ? `✓ ${s('mentor_name') || 'Oui'}` : '✗ Non' },
    )
    if (s('notes')) rows.push({ label: 'Notes', value: s('notes') })
  }

  if (type === '3months') {
    if (n('attendance_rate')) rows.push({ label: 'Présence', value: `${n('attendance_rate')}%`, highlight: n('attendance_rate') < 80 })
    rows.push(
      { label: 'Recos données', value: n('reco_given') },
      { label: 'Recos reçues', value: n('reco_received') },
      { label: 'TêT', value: n('tat_done') },
      { label: 'Invités', value: n('visitors_invited') },
    )
    if (n('general_feeling')) rows.push({ label: 'Ressenti général', value: `${n('general_feeling')}/10`, highlight: n('general_feeling') < 6 })
    if (s('wants_to_improve')) rows.push({ label: 'Axes d\'amélioration', value: s('wants_to_improve') })
  }

  if (type === '7months' || type === 'free') {
    rows.push(
      { label: 'Réunions', value: n('meetings_count') },
      { label: 'Absences', value: n('absences_count'), highlight: n('absences_count') > 3 },
      { label: 'Recos données', value: n('reco_given') },
      { label: 'Recos reçues', value: n('reco_received') },
      { label: 'TêT', value: n('tat_done') },
      { label: 'Invités', value: n('visitors_invited') },
      { label: 'CA apporté', value: n('ca_given') ? `${Number(n('ca_given')).toLocaleString('fr-MA')} MAD` : '—' },
    )
    if (n('general_feeling')) rows.push({ label: 'Ressenti général', value: `${n('general_feeling')}/10`, highlight: n('general_feeling') < 6 })
    if (s('wants_to_improve')) rows.push({ label: 'Axes d\'amélioration', value: s('wants_to_improve') })
  }

  if (type === '10months') {
    if (n('attendance_rate')) rows.push({ label: 'Présence', value: `${n('attendance_rate')}%`, highlight: n('attendance_rate') < 80 })
    rows.push(
      { label: 'Recos données', value: n('reco_given') },
      { label: 'Recos reçues', value: n('reco_received') },
      { label: 'TêT', value: n('tat_done') },
      { label: 'CA apporté', value: n('ca_given') ? `${Number(n('ca_given')).toLocaleString('fr-MA')} MAD` : '—' },
    )
    if (n('general_feeling')) rows.push({ label: 'Ressenti général', value: `${n('general_feeling')}/10`, highlight: n('general_feeling') < 6 })
    if (s('renewal_motivation')) rows.push({ label: 'Motivation renouvellement', value: s('renewal_motivation') })
  }

  if (rows.length === 0) return <p className="text-xs text-gray-400 italic">Formulaire vide</p>

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
      {rows.map((r, i) => (
        <div key={i}>
          <p className="text-xs text-gray-400">{r.label}</p>
          <p className={`text-xs font-semibold mt-0.5 ${r.highlight ? 'text-red-600' : 'text-gray-800'}`}>
            {typeof r.value === 'number' ? r.value.toLocaleString('fr-FR') : r.value || '—'}
          </p>
        </div>
      ))}
    </div>
  )
}

function IdpKpiBlock({ data }: { data: IdpRow[] }) {
  const sum = (key: keyof IdpRow) => data.reduce((s, r) => s + Number(r[key]), 0)

  const recoGiven = sum('rdi') + sum('rde')
  const recoRecv  = sum('rri') + sum('rre')
  const absences  = sum('absences')
  const mpb       = sum('mpb')

  const kpis = [
    { label: 'Présences',     value: sum('presences'), cls: 'text-green-700 bg-green-50' },
    { label: 'Absences',      value: absences, cls: absences > 3 ? 'text-red-700 bg-red-50' : 'text-amber-700 bg-amber-50' },
    { label: 'Recos données', value: recoGiven, cls: 'text-blue-700 bg-blue-50' },
    { label: 'Recos reçues',  value: recoRecv, cls: 'text-purple-700 bg-purple-50' },
    { label: 'TêT',           value: sum('tet'), cls: 'text-indigo-700 bg-indigo-50' },
    { label: 'Invités',       value: sum('invites'), cls: 'text-teal-700 bg-teal-50' },
    { label: 'MPB (MAD)',     value: mpb, cls: 'text-emerald-700 bg-emerald-50', fmt: 'mad' },
  ]

  const sorted = [...data].sort((a, b) => a.report_date.localeCompare(b.report_date))
  const trend = sorted.map(r => ({
    label: new Date(r.report_date).toLocaleDateString('fr-FR', { month: 'short' }),
    given: Number(r.rdi) + Number(r.rde),
    recv:  Number(r.rri) + Number(r.rre),
  }))
  const maxVal = Math.max(1, ...trend.flatMap(r => [r.given, r.recv]))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={15} className="text-gray-400" />
        <h2 className="font-semibold text-gray-900 text-sm">Indicateurs de Performance · 6 derniers mois</h2>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mb-5">
        {kpis.map(k => (
          <div key={k.label} className={`rounded-lg p-3 text-center ${k.cls}`}>
            <p className="text-lg font-bold leading-tight">
              {k.fmt === 'mad'
                ? Number(k.value).toLocaleString('fr-MA', { maximumFractionDigits: 0 })
                : k.value}
            </p>
            <p className="text-xs mt-0.5 opacity-75 leading-tight">{k.label}</p>
          </div>
        ))}
      </div>

      {trend.length >= 2 && (
        <div>
          <p className="text-xs text-gray-400 font-medium mb-2">Tendance Recommandations (mensuelles)</p>
          <div className="flex items-end gap-1.5" style={{ height: 64 }}>
            {trend.map((r, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex gap-0.5 items-end" style={{ height: 48 }}>
                  <div
                    className="flex-1 rounded-t bg-blue-400 min-h-[3px] transition-all"
                    style={{ height: `${(r.given / maxVal) * 48}px` }}
                    title={`Données: ${r.given}`}
                  />
                  <div
                    className="flex-1 rounded-t bg-purple-400 min-h-[3px] transition-all"
                    style={{ height: `${(r.recv / maxVal) * 48}px` }}
                    title={`Reçues: ${r.recv}`}
                  />
                </div>
                <p className="text-[10px] text-gray-400 leading-none">{r.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-blue-400" />
              <span className="text-xs text-gray-500">Données</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-purple-400" />
              <span className="text-xs text-gray-500">Reçues</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
