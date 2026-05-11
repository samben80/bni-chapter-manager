'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Edit2, Check, X, Trash2, Users, UserCheck, CalendarCheck, ChevronRight, AlertTriangle, Clock } from 'lucide-react'
import { formatDate, getInterviewLabel, getInterviewStatusColor, getInterviewStatusLabel } from '@/lib/utils'

interface Chapter { id: number; name: string }

interface Assignment {
  id: number; role: string; start_date: string
  member_id: number; member_name: string; company: string
  intro_date: string; months_since_intro: number; chapter_name: string
}

interface ChapterMember {
  id: number; full_name: string; company: string; activity: string; bni_role?: string
  intro_date: string; months_since_intro: number; status: string
  chapter_id: number; chapter_name: string
}

interface ChapterInterview {
  id: number; type: string; scheduled_date?: string; status: string
  member_id: number; member_name: string; company: string
  chapter_id: number; chapter_name: string; ambassador_name?: string
}

interface AmbassadorDetail {
  id: number; first_name: string; last_name: string; full_name: string
  company?: string; email?: string; phone?: string; role: string; active: number
  chapters: { id: number; name: string }[]
  assignments: Assignment[]
  stats: { total_members: number; onboarding_count: number; coach_count: number }
  chapter_members: ChapterMember[]
  chapter_interviews: ChapterInterview[]
}

type Tab = 'profil' | 'membres' | 'entretiens'

const ROLE_LABEL: Record<string, string> = {
  onboarding: 'On Boarding',
  coach_business: 'Coach Business',
  both: 'On Boarding + Coach Business',
}
const ROLE_COLOR: Record<string, string> = {
  onboarding: 'bg-blue-50 text-blue-700',
  coach_business: 'bg-purple-50 text-purple-700',
  both: 'bg-green-50 text-green-700',
}
const PHASE_COLOR = (m: number) => {
  if (m < 3) return 'bg-blue-50 text-blue-700'
  if (m < 7) return 'bg-amber-50 text-amber-700'
  if (m < 10) return 'bg-purple-50 text-purple-700'
  return 'bg-green-50 text-green-700'
}
const PHASE_LABEL = (m: number) => {
  if (m < 3) return 'Onboarding'
  if (m < 7) return '3 mois'
  if (m < 10) return '7 mois'
  return 'Renouvellement'
}

export default function AmbassadeurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [amb, setAmb] = useState<AmbassadorDetail | null>(null)
  const [allChapters, setAllChapters] = useState<Chapter[]>([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', company: '', email: '', phone: '', role: 'both' })
  const [editChapterIds, setEditChapterIds] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tab, setTab] = useState<Tab>('profil')
  const [chapterFilter, setChapterFilter] = useState<string>('all')

  const load = () => fetch(`/api/ambassadors/${id}`).then(r => r.json()).then((data: AmbassadorDetail) => {
    setAmb(data)
    setForm({ first_name: data.first_name, last_name: data.last_name, company: data.company || '', email: data.email || '', phone: data.phone || '', role: data.role })
    setEditChapterIds(new Set(data.chapters.map(c => c.id)))
  })

  useEffect(() => {
    load()
    fetch('/api/chapters').then(r => r.json()).then(setAllChapters)
  }, [id])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const toggleChapter = (cid: number) =>
    setEditChapterIds(prev => { const s = new Set(prev); s.has(cid) ? s.delete(cid) : s.add(cid); return s })

  const save = async () => {
    setSaving(true)
    await fetch(`/api/ambassadors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, chapter_ids: Array.from(editChapterIds) }),
    })
    setSaving(false)
    setEditing(false)
    load()
  }

  const doDelete = async () => {
    await fetch(`/api/ambassadors/${id}`, { method: 'DELETE' })
    router.push('/ambassadeurs')
  }

  const cancelEdit = () => {
    if (!amb) return
    setForm({ first_name: amb.first_name, last_name: amb.last_name, company: amb.company || '', email: amb.email || '', phone: amb.phone || '', role: amb.role })
    setEditChapterIds(new Set(amb.chapters.map(c => c.id)))
    setEditing(false)
  }

  if (!amb) return <div className="flex items-center justify-center h-full text-gray-400">Chargement...</div>

  const onboardingMembers = amb.assignments.filter(a => a.role === 'onboarding')
  const coachMembers = amb.assignments.filter(a => a.role === 'coach_business')

  const filteredMembers = chapterFilter === 'all'
    ? amb.chapter_members
    : amb.chapter_members.filter(m => String(m.chapter_id) === chapterFilter)

  const filteredInterviews = chapterFilter === 'all'
    ? amb.chapter_interviews
    : amb.chapter_interviews.filter(i => String(i.chapter_id) === chapterFilter)

  const overdueCount = amb.chapter_interviews.filter(i => i.status === 'overdue').length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Nav */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/ambassadeurs" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={16} /> Retour aux ambassadeurs
        </Link>
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                <Edit2 size={14} /> Modifier
              </button>
              <button onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 size={14} /> Supprimer
              </button>
            </>
          )}
          {editing && (
            <>
              <button onClick={cancelEdit}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                <X size={14} /> Annuler
              </button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: '#C0392B' }}>
                <Check size={14} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile header (always visible) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
            style={{ backgroundColor: '#2C3E50' }}>
            {(editing ? form.first_name : amb.first_name)[0]}
            {(editing ? form.last_name : amb.last_name)[0]}
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Prénom</label>
                  <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nom</label>
                  <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
                </div>
              </div>
            ) : (
              <h1 className="text-xl font-bold text-gray-900">{amb.full_name}</h1>
            )}
            {editing ? (
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Rôle</label>
                <select value={form.role} onChange={e => set('role', e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200">
                  <option value="both">On Boarding + Coach Business</option>
                  <option value="onboarding">On Boarding uniquement</option>
                  <option value="coach_business">Coach Business uniquement</option>
                </select>
              </div>
            ) : (
              <span className={`inline-flex mt-1 text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLOR[amb.role]}`}>
                {ROLE_LABEL[amb.role]}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          {editing ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Entreprise</label>
                <input value={form.company} onChange={e => set('company', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Téléphone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
              </div>
            </>
          ) : (
            <>
              <Info label="Entreprise" value={amb.company || '—'} />
              <Info label="Email" value={amb.email || '—'} />
              <Info label="Téléphone" value={amb.phone || '—'} />
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 p-1 bg-gray-100 rounded-lg w-fit">
        {([
          { value: 'profil',     label: 'Profil & Affectations' },
          { value: 'membres',    label: `Membres (${amb.chapter_members.length})` },
          { value: 'entretiens', label: `Entretiens (${amb.chapter_interviews.length})`, alert: overdueCount },
        ] as { value: Tab; label: string; alert?: number }[]).map(t => (
          <button key={t.value} onClick={() => { setTab(t.value); setChapterFilter('all') }}
            className={`px-4 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
              tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
            {t.alert ? (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">{t.alert}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ─── Tab: Profil ─────────────────────────────────────── */}
      {tab === 'profil' && (
        <>
          {/* Chapters */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Chapitres assignés</h2>
            {editing ? (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
                {allChapters.map(c => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox"
                      checked={editChapterIds.has(c.id)}
                      onChange={() => toggleChapter(c.id)}
                      className="w-4 h-4 rounded accent-red-600" />
                    <span className="text-sm text-gray-700">{c.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {amb.chapters.length === 0 && <p className="text-sm text-gray-400">Aucun chapitre assigné</p>}
                {amb.chapters.map(c => (
                  <span key={c.id} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">{c.name}</span>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatBadge label="Membres suivis" value={amb.stats?.total_members ?? 0} icon={<Users size={16} />} />
            <StatBadge label="On Boarding" value={amb.stats?.onboarding_count ?? 0} icon={<UserCheck size={16} />} color="blue" />
            <StatBadge label="Coach Business" value={amb.stats?.coach_count ?? 0} icon={<UserCheck size={16} />} color="purple" />
          </div>

          {/* Assigned members */}
          {onboardingMembers.length > 0 && (
            <MemberGroup title="Membres On Boarding" members={onboardingMembers} />
          )}
          {coachMembers.length > 0 && (
            <MemberGroup title="Membres Coach Business" members={coachMembers} />
          )}
          {amb.assignments.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p>Aucun membre assigné</p>
            </div>
          )}
        </>
      )}

      {/* ─── Tab: Membres ────────────────────────────────────── */}
      {tab === 'membres' && (
        <>
          {amb.chapters.length > 1 && (
            <div className="flex items-center gap-2 mb-4">
              <select value={chapterFilter} onChange={e => setChapterFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
                <option value="all">Tous les chapitres ({amb.chapter_members.length})</option>
                {amb.chapters.map(c => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name} ({amb.chapter_members.filter(m => m.chapter_id === c.id).length})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Users size={28} className="mx-auto mb-2 opacity-30" />
                <p>Aucun membre actif dans ces chapitres</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Membre</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Société</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Chapitre</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phase</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Intronisation</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredMembers.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{m.full_name}</p>
                        {m.bni_role && <p className="text-xs text-gray-400 mt-0.5">{m.bni_role}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{m.company || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{m.chapter_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${PHASE_COLOR(m.months_since_intro)}`}>
                          {PHASE_LABEL(m.months_since_intro)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{formatDate(m.intro_date)}</td>
                      <td className="px-4 py-3">
                        <a href={`/membres/${m.id}`} className="text-gray-400 hover:text-gray-700">
                          <ChevronRight size={16} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ─── Tab: Entretiens ─────────────────────────────────── */}
      {tab === 'entretiens' && (
        <>
          {amb.chapters.length > 1 && (
            <div className="flex items-center gap-2 mb-4">
              <select value={chapterFilter} onChange={e => setChapterFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
                <option value="all">Tous les chapitres ({amb.chapter_interviews.length})</option>
                {amb.chapters.map(c => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name} ({amb.chapter_interviews.filter(i => i.chapter_id === c.id).length})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filteredInterviews.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <CalendarCheck size={28} className="mx-auto mb-2 opacity-30" />
                <p>Aucun entretien à venir</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Membre</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Chapitre</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date prévue</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredInterviews.map(iv => (
                    <tr key={iv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-gray-900">{iv.member_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{iv.company}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">{getInterviewLabel(iv.type as never)}</td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs">{iv.chapter_name || '—'}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {iv.status === 'overdue'
                            ? <AlertTriangle size={13} className="text-red-500" />
                            : <Clock size={13} className="text-gray-400" />}
                          <span className={iv.status === 'overdue' ? 'text-red-600 font-medium text-sm' : 'text-gray-700 text-sm'}>
                            {formatDate(iv.scheduled_date)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getInterviewStatusColor(iv.status as never)}`}>
                          {getInterviewStatusLabel(iv.status as never)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <a href={`/entretiens/${iv.id}`} className="text-gray-400 hover:text-gray-700">
                          <ChevronRight size={16} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">Supprimer cet ambassadeur ?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              <span className="font-semibold text-gray-700">{amb.full_name}</span>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 px-4 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={doDelete}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl"
                style={{ backgroundColor: '#C0392B' }}>
                Supprimer
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
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  )
}

function StatBadge({ label, value, icon, color = 'gray' }: { label: string; value: number; icon: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = { gray: 'bg-gray-50 text-gray-600', blue: 'bg-blue-50 text-blue-700', purple: 'bg-purple-50 text-purple-700' }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function MemberGroup({ title, members }: { title: string; members: Assignment[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-800 text-sm">{title} <span className="text-gray-400 font-normal">({members.length})</span></h3>
      </div>
      <div className="divide-y divide-gray-50">
        {members.map(m => (
          <a key={m.id} href={`/membres/${m.member_id}`}
            className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{m.member_name}</p>
              <p className="text-xs text-gray-500 truncate">{m.company || m.chapter_name}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${PHASE_COLOR(m.months_since_intro)}`}>
                {PHASE_LABEL(m.months_since_intro)}
              </span>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(m.intro_date)}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
