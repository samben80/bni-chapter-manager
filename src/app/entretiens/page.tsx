'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck, ChevronRight, Filter } from 'lucide-react'
import { formatDate, getInterviewLabel, getInterviewStatusColor, getInterviewStatusLabel } from '@/lib/utils'
import type { Interview, InterviewType } from '@/lib/types'

type FilterStatus = 'all' | 'pending' | 'overdue' | 'completed'
type FilterType = 'all' | InterviewType

interface InterviewRow extends Interview {
  member_name: string
  company: string
  intro_date: string
  chapter_id: number
  chapter_name: string
}

interface Chapter { id: number; name: string }

export default function EntretiensPage() {
  const [interviews, setInterviews] = useState<InterviewRow[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterChapter, setFilterChapter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/interviews').then(r => r.json()).then(setInterviews)
    fetch('/api/chapters').then(r => r.json()).then(setChapters)
  }, [])

  const filtered = interviews.filter(iv => {
    if (filterStatus !== 'all' && iv.status !== filterStatus) return false
    if (filterType !== 'all' && iv.type !== filterType) return false
    if (filterChapter !== 'all' && String(iv.chapter_id) !== filterChapter) return false
    return true
  })

  const overdueCount = interviews.filter(iv => iv.status === 'overdue').length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entretiens</h1>
          <p className="text-gray-500 text-sm mt-1">
            {interviews.length} entretien{interviews.length > 1 ? 's' : ''} au total
            {overdueCount > 0 && <span className="ml-2 text-red-600 font-medium">· {overdueCount} en retard</span>}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            className="text-sm text-gray-700 focus:outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">À planifier</option>
            <option value="scheduled">Planifiés</option>
            <option value="overdue">En retard</option>
            <option value="completed">Réalisés</option>
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as FilterType)}
            className="text-sm text-gray-700 focus:outline-none"
          >
            <option value="all">Tous les types</option>
            <option value="preboarding">Pré-boarding</option>
            <option value="3months">3 mois</option>
            <option value="7months">7 mois</option>
            <option value="10months">10 mois (Renouvellement)</option>
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <select
            value={filterChapter}
            onChange={e => setFilterChapter(e.target.value)}
            className="text-sm text-gray-700 focus:outline-none"
          >
            <option value="all">Tous les chapitres</option>
            {chapters.map(c => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Membre</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date prévue</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ambassadeur</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  <CalendarCheck size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Aucun entretien trouvé</p>
                </td>
              </tr>
            )}
            {filtered.map(iv => (
              <tr key={iv.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3.5">
                  <p className="font-medium text-gray-900">{iv.member_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{iv.company}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-gray-700">{getInterviewLabel(iv.type)}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className={`${iv.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                    {formatDate(iv.scheduled_date)}
                  </p>
                  {iv.completed_date && (
                    <p className="text-xs text-green-600 mt-0.5">Réalisé le {formatDate(iv.completed_date)}</p>
                  )}
                </td>
                <td className="px-4 py-3.5 text-gray-600">{iv.ambassador_name || '—'}</td>
                <td className="px-4 py-3.5">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getInterviewStatusColor(iv.status)}`}>
                    {getInterviewStatusLabel(iv.status)}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <a href={`/entretiens/${iv.id}`} className="text-gray-400 hover:text-gray-700">
                    <ChevronRight size={18} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
