'use client'

import { useEffect, useState } from 'react'
import { Users, CalendarCheck, AlertTriangle, CheckCircle, Clock, LayoutGrid } from 'lucide-react'
import { formatDate, getInterviewLabel } from '@/lib/utils'
import type { Interview } from '@/lib/types'

const PHASES = ['Onboarding', '3 mois', '7 mois', 'Renouvellement'] as const
type Phase = typeof PHASES[number]

interface ChapterPhaseRow { chapter_name: string; phase: string; count: number }

interface DashboardData {
  stats: { totalMembers: number; pendingInterviews: number; completedThisMonth: number; overdueCount: number }
  upcoming: (Interview & { member_name: string; company: string; intro_date: string })[]
  recent: (Interview & { member_name: string; company: string })[]
  byChapterPhase: ChapterPhaseRow[]
}

// Pivot flat rows into { chapter_name, counts per phase }[]
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

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => {
        if (r.status === 401) { setAuthError(true); return null }
        if (!r.ok) return null
        return r.json()
      })
      .then(d => { if (d) setData(d) })
      .catch(console.error)
  }, [])

  if (authError) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    return null
  }

  if (!data) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-400">Chargement...</div>
    </div>
  )

  const { stats, upcoming, recent, byChapterPhase } = data
  const chapters = pivotChapterPhase(byChapterPhase)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Ambassadeur</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d&apos;ensemble du suivi des membres et des entretiens</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} />} label="Membres actifs" value={stats.totalMembers} color="blue" />
        <StatCard icon={<CalendarCheck size={20} />} label="Entretiens à faire" value={stats.pendingInterviews} color="amber" />
        <StatCard icon={<AlertTriangle size={20} />} label="En retard" value={stats.overdueCount} color="red" />
        <StatCard icon={<CheckCircle size={20} />} label="Réalisés ce mois" value={stats.completedThisMonth} color="green" />
      </div>

      {/* Entretiens + Récents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              <h2 className="font-semibold text-gray-900 text-sm">Entretiens à venir</h2>
            </div>
            <a href="/entretiens" className="text-xs text-blue-600 hover:underline">Voir tout</a>
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
              <div key={iv.id} className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900 truncate">{iv.member_name}</p>
                <p className="text-xs text-gray-500">{getInterviewLabel(iv.type)} · {formatDate(iv.completed_date)}</p>
              </div>
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
                    <th key={p} className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {p}
                    </th>
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

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600', green: 'bg-green-50 text-green-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
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
