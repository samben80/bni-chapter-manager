'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Users, CalendarCheck, AlertTriangle, CheckCircle, Clock, LayoutGrid, X, ArrowRight } from 'lucide-react'
import { formatDate, getInterviewLabel } from '@/lib/utils'
import type { Interview } from '@/lib/types'

const PHASES = ['Onboarding', '3 mois', '7 mois', 'Renouvellement'] as const
type Phase = typeof PHASES[number]
type FilterKey = 'pending' | 'overdue' | 'completed_this_month'

interface ChapterPhaseRow { chapter_name: string; phase: string; count: number }

interface PhaseTotalRow { phase: string; count: number }

interface DashboardData {
  stats: { totalMembers: number; pendingInterviews: number; completedThisMonth: number; overdueCount: number }
  upcoming: (Interview & { member_name: string; company: string; intro_date: string })[]
  recent: (Interview & { member_name: string; company: string })[]
  byChapterPhase: ChapterPhaseRow[]
  phaseTotals: PhaseTotalRow[]
}

interface DrillRow {
  id: number; type: string; status: string
  scheduled_date?: string; completed_date?: string
  member_name: string; member_id: number; company: string; chapter_name?: string
}

function pivotChapterPhase(rows: ChapterPhaseRow[]) {
  const map = new Map<string, Record<Phase, number>>()
  for (const row of rows) {
    if (!map.has(row.chapter_name)) {
      map.set(row.chapter_name, { Onboarding: 0, '3 mois': 0, '7 mois': 0, Renouvellement: 0 })
    }
    const entry = map.get(row.chapter_name)!
    if (PHASES.includes(row.phase as Phase)) {
      entry[row.phase as Phase] = row.count
    }
  }
  return Array.from(map.entries())
    .map(([chapter_name, counts]) => ({
      chapter_name,
      counts,
      total: PHASES.reduce((s, p) => s + counts[p], 0),
    }))
    .sort((a, b) => a.chapter_name.localeCompare(b.chapter_name))
}

const PHASE_COLORS: Record<Phase, string> = {
  'Onboarding':    'bg-blue-100 text-blue-700',
  '3 mois':        'bg-amber-100 text-amber-700',
  '7 mois':        'bg-purple-100 text-purple-700',
  'Renouvellement':'bg-green-100 text-green-700',
}

const FILTER_META: Record<FilterKey, { label: string; color: string; dateLabel: string }> = {
  pending:             { label: 'Entretiens à faire',   color: 'amber', dateLabel: 'Planifié le' },
  overdue:             { label: 'Entretiens en retard', color: 'red',   dateLabel: 'Prévu le' },
  completed_this_month:{ label: 'Réalisés ce mois',     color: 'green', dateLabel: 'Réalisé le' },
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null)
  const [drillRows, setDrillRows] = useState<DrillRow[]>([])
  const [drillLoading, setDrillLoading] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(async r => {
        if (r.redirected || r.status === 401) { window.location.href = '/login'; return null }
        if (!r.ok) { setApiError(`HTTP ${r.status}`); return null }
        return r.json()
      })
      .then(d => { if (d) setData(d) })
      .catch(e => setApiError(String(e)))
  }, [])

  const openFilter = useCallback(async (filter: FilterKey) => {
    if (activeFilter === filter) { setActiveFilter(null); return }
    setActiveFilter(filter)
    setDrillLoading(true)
    setDrillRows([])
    try {
      const rows = await fetch(`/api/dashboard/interviews?filter=${filter}`).then(r => r.json())
      setDrillRows(rows)
    } finally {
      setDrillLoading(false)
    }
  }, [activeFilter])

  if (apiError) return (
    <div className="p-8 font-mono text-sm">
      <h2 className="text-red-700 font-bold text-base mb-2">Erreur tableau de bord</h2>
      <pre className="bg-red-50 border border-red-200 rounded p-4 text-red-800 whitespace-pre-wrap">{apiError}</pre>
      <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-gray-200 rounded text-xs">Réessayer</button>
    </div>
  )

  if (!data) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-400">Chargement...</div>
    </div>
  )

  const { stats, upcoming, recent, byChapterPhase, phaseTotals: phaseTotalsRaw } = data
  const chapters = pivotChapterPhase(byChapterPhase)
  const meta = activeFilter ? FILTER_META[activeFilter] : null

  // Phase totals from dedicated API query (reliable)
  const phaseTotals = PHASES.reduce((acc, p) => {
    const row = (phaseTotalsRaw ?? []).find((r: PhaseTotalRow) => r.phase === p)
    acc[p] = row ? Number(row.count) : 0
    return acc
  }, {} as Record<Phase, number>)
  const grandTotal = PHASES.reduce((s, p) => s + phaseTotals[p], 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Ambassadeur</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d&apos;ensemble du suivi des membres et des entretiens</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={20} />} label="Membres actifs"
          value={stats.totalMembers} color="blue"
        />
        <StatCard
          icon={<CalendarCheck size={20} />} label="Entretiens à faire"
          value={stats.pendingInterviews} color="amber"
        />
        <StatCard
          icon={<AlertTriangle size={20} />} label="En retard"
          value={stats.overdueCount} color="red"
          active={activeFilter === 'overdue'}
          onClick={() => openFilter('overdue')}
        />
        <StatCard
          icon={<CheckCircle size={20} />} label="Réalisés ce mois"
          value={stats.completedThisMonth} color="green"
          active={activeFilter === 'completed_this_month'}
          onClick={() => openFilter('completed_this_month')}
        />
      </div>

      {/* Timeline des jalons */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-6">Parcours membres — répartition par jalon</h2>
        <MilestoneTimeline totals={phaseTotals} grandTotal={grandTotal} />
      </div>

      {/* Drill-down panel */}
      {activeFilter && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                meta?.color === 'amber' ? 'bg-amber-400' :
                meta?.color === 'red'   ? 'bg-red-500' : 'bg-green-500'
              }`} />
              <h2 className="font-semibold text-gray-900 text-sm">{meta?.label}</h2>
              {!drillLoading && (
                <span className="text-xs text-gray-400 ml-1">— {drillRows.length} entretien{drillRows.length > 1 ? 's' : ''}</span>
              )}
            </div>
            <button onClick={() => setActiveFilter(null)} className="text-gray-400 hover:text-gray-700">
              <X size={16} />
            </button>
          </div>

          {drillLoading ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">Chargement…</div>
          ) : drillRows.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">Aucun entretien</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {drillRows.map(row => (
                <a
                  key={row.id}
                  href={`/entretiens/${row.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{row.member_name}</p>
                      {row.chapter_name && (
                        <span className="text-xs text-gray-400 hidden md:block truncate">· {row.chapter_name}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{row.company}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gray-700">{getInterviewLabel(row.type as import('@/lib/types').InterviewType)}</p>
                    <p className={`text-xs mt-0.5 ${
                      activeFilter === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-400'
                    }`}>
                      {meta?.dateLabel} {formatDate(row.scheduled_date ?? row.completed_date)}
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Entretiens + Récents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              <h2 className="font-semibold text-gray-900 text-sm">Entretiens à venir</h2>
            </div>
            <Link href="/entretiens" className="text-xs text-blue-600 hover:underline">Voir tout</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {upcoming.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">Aucun entretien à planifier</div>
            )}
            {upcoming.map(iv => <InterviewRow key={iv.id} interview={iv} />)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <CheckCircle size={16} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">Derniers entretiens réalisés</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recent.length === 0 && (
              <div className="px-5 py-6 text-center text-gray-400 text-sm">Aucun entretien réalisé</div>
            )}
            {recent.map(iv => (
              <a key={iv.id} href={`/entretiens/${iv.id}`} className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                <p className="text-sm font-medium text-gray-900 truncate">{iv.member_name}</p>
                <p className="text-xs text-gray-500">{getInterviewLabel(iv.type)} · {formatDate(iv.completed_date)}</p>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Membres par chapitre × phase */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <LayoutGrid size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900 text-sm">Membres par chapitre et phase</h2>
        </div>

        {chapters.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">Aucun membre</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Chapitre</th>
                  {PHASES.map(p => (
                    <th key={p} className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{p}</th>
                  ))}
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {chapters.map(ch => (
                  <tr key={ch.chapter_name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900 max-w-xs">
                      <span className="truncate block" title={ch.chapter_name}>{ch.chapter_name}</span>
                    </td>
                    {PHASES.map(p => (
                      <td key={p} className="px-4 py-3 text-center">
                        {ch.counts[p] > 0 ? (
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold ${PHASE_COLORS[p]}`}>
                            {ch.counts[p]}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-gray-700">{ch.total}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {chapters.length > 1 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Total</td>
                    {PHASES.map(p => {
                      const total = chapters.reduce((s, ch) => s + ch.counts[p], 0)
                      return (
                        <td key={p} className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold ${PHASE_COLORS[p]}`}>
                            {total}
                          </span>
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold text-gray-900">{stats.totalMembers}</span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon, label, value, color, active, onClick,
}: {
  icon: React.ReactNode; label: string; value: number; color: string
  active?: boolean; onClick?: () => void
}) {
  const colors: Record<string, { bg: string; icon: string; ring: string }> = {
    blue:  { bg: 'bg-blue-50',  icon: 'text-blue-600',  ring: 'ring-blue-200' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-200' },
    red:   { bg: 'bg-red-50',   icon: 'text-red-600',   ring: 'ring-red-200' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', ring: 'ring-green-200' },
  }
  const c = colors[color]
  const isClickable = !!onClick

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-5 transition-all ${
        isClickable ? 'cursor-pointer hover:shadow-md' : ''
      } ${active ? `ring-2 ${c.ring} border-transparent shadow-md` : 'border-gray-200'}`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${c.bg} ${c.icon}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <div className="flex items-center justify-between mt-0.5">
        <p className="text-xs text-gray-500">{label}</p>
        {isClickable && (
          <span className={`text-xs font-medium ${active ? c.icon : 'text-gray-300'}`}>
            {active ? 'Fermer ✕' : 'Voir →'}
          </span>
        )}
      </div>
    </div>
  )
}

const MILESTONE_CONFIG: {
  phase: Phase; label: string; sublabel: string
  dot: string; bar: string; text: string; badge: string
}[] = [
  {
    phase: 'Onboarding',
    label: 'Onboarding',
    sublabel: '0 – 3 mois',
    dot: 'bg-blue-500',
    bar: 'bg-blue-200',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    phase: '3 mois',
    label: 'Entretien 3 mois',
    sublabel: '3 – 6 mois',
    dot: 'bg-amber-500',
    bar: 'bg-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    phase: '7 mois',
    label: 'RDV 7 mois',
    sublabel: '6 – 10 mois',
    dot: 'bg-purple-500',
    bar: 'bg-purple-200',
    text: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-700',
  },
  {
    phase: 'Renouvellement',
    label: 'Renouvellement',
    sublabel: '10 mois +',
    dot: 'bg-green-500',
    bar: 'bg-green-200',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-700',
  },
]

function MilestoneTimeline({ totals, grandTotal }: { totals: Record<Phase, number>; grandTotal: number }) {
  return (
    <div className="relative">
      {/* Member count bubbles */}
      <div className="grid grid-cols-4 mb-4">
        {MILESTONE_CONFIG.map(({ phase, badge, text }) => {
          const count = totals[phase]
          const pct = grandTotal > 0 ? Math.round(count / grandTotal * 100) : 0
          return (
            <div key={phase} className="flex flex-col items-center gap-1">
              <span className={`text-3xl font-bold ${text}`}>{count}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>
                {pct}%
              </span>
            </div>
          )
        })}
      </div>

      {/* Timeline bar */}
      <div className="grid grid-cols-4 items-center mb-3">
        {MILESTONE_CONFIG.map(({ phase, dot, bar }, i) => (
          <div key={phase} className="flex items-center">
            {/* Connector line before dot (except first) */}
            {i > 0 && <div className={`flex-1 h-1 ${bar}`} />}
            {/* Dot */}
            <div className={`w-4 h-4 rounded-full border-4 border-white shadow-md flex-shrink-0 ${dot}`} />
            {/* Connector line after dot (except last) */}
            {i < MILESTONE_CONFIG.length - 1 && <div className={`flex-1 h-1 ${MILESTONE_CONFIG[i + 1].bar}`} />}
          </div>
        ))}
      </div>

      {/* Labels */}
      <div className="grid grid-cols-4">
        {MILESTONE_CONFIG.map(({ phase, label, sublabel, text }) => (
          <div key={phase} className="flex flex-col items-center text-center px-1">
            <span className={`text-xs font-semibold ${text}`}>{label}</span>
            <span className="text-xs text-gray-400 mt-0.5">{sublabel}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {grandTotal > 0 && (
        <div className="mt-5 flex rounded-full overflow-hidden h-2">
          {MILESTONE_CONFIG.map(({ phase, dot }) => {
            const w = Math.round(totals[phase] / grandTotal * 100)
            return w > 0 ? (
              <div
                key={phase}
                className={`${dot} transition-all`}
                style={{ width: `${w}%` }}
                title={`${phase} : ${totals[phase]} membres (${w}%)`}
              />
            ) : null
          })}
        </div>
      )}
    </div>
  )
}

function InterviewRow({ interview }: { interview: Interview & { member_name: string; company: string } }) {
  const isOverdue = interview.status === 'overdue'
  return (
    <a href={`/entretiens/${interview.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-500' : 'bg-amber-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{interview.member_name}</p>
        <p className="text-xs text-gray-500 truncate">{interview.company}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-medium text-gray-700">{getInterviewLabel(interview.type)}</p>
        <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
          {isOverdue ? 'En retard' : formatDate(interview.scheduled_date)}
        </p>
      </div>
    </a>
  )
}
