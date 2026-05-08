'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck, ChevronRight, Filter, Trash2, X } from 'lucide-react'
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

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<'single' | 'bulk' | null>(null)
  const [singleTarget, setSingleTarget] = useState<InterviewRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    fetch('/api/interviews').then(r => r.json()).then((data: InterviewRow[]) => {
      setInterviews(data)
      setSelected(new Set())
    })
    fetch('/api/chapters').then(r => r.json()).then(setChapters)
  }

  useEffect(() => { load() }, [])

  const filtered = interviews.filter(iv => {
    if (filterStatus !== 'all' && iv.status !== filterStatus) return false
    if (filterType !== 'all' && iv.type !== filterType) return false
    if (filterChapter !== 'all' && String(iv.chapter_id) !== filterChapter) return false
    return true
  })

  const overdueCount = interviews.filter(iv => iv.status === 'overdue').length

  const allFilteredSelected = filtered.length > 0 && filtered.every(iv => selected.has(iv.id))
  const someSelected = selected.size > 0

  const toggleOne = (id: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const toggleAll = () =>
    setSelected(allFilteredSelected ? new Set() : new Set(filtered.map(iv => iv.id)))

  const askSingleDelete = (iv: InterviewRow, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setSingleTarget(iv); setConfirmDelete('single')
  }

  const doDelete = async () => {
    setDeleting(true)
    const ids = confirmDelete === 'bulk' ? Array.from(selected) : [singleTarget!.id]
    await fetch('/api/interviews', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    setDeleting(false); setConfirmDelete(null); setSingleTarget(null)
    load()
  }

  const deleteCount = confirmDelete === 'bulk' ? selected.size : 1

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entretiens</h1>
          <p className="text-gray-500 text-sm mt-1">
            {interviews.length} entretien{interviews.length > 1 ? 's' : ''} au total
            {overdueCount > 0 && <span className="ml-2 text-red-600 font-medium">· {overdueCount} en retard</span>}
            {someSelected && <span className="ml-2 font-medium text-gray-700">· {selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
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

      {/* Bulk delete toolbar */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setConfirmDelete('bulk')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#C0392B' }}>
            <Trash2 size={15} />
            Supprimer {selected.size} entretien{selected.size > 1 ? 's' : ''}
          </button>
          <button onClick={() => setSelected(new Set())}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            <X size={13} /> Désélectionner
          </button>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 w-10">
                <input type="checkbox"
                  checked={allFilteredSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !allFilteredSelected }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded accent-red-600" />
              </th>
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
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  <CalendarCheck size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Aucun entretien trouvé</p>
                </td>
              </tr>
            )}
            {filtered.map(iv => {
              const isSelected = selected.has(iv.id)
              return (
                <tr key={iv.id}
                  onClick={() => toggleOne(iv.id)}
                  className={`transition-colors cursor-pointer group ${isSelected ? 'bg-red-50/40' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleOne(iv.id)}
                      className="w-4 h-4 rounded accent-red-600" />
                  </td>
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
                  <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={e => askSingleDelete(iv, e)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                      <a href={`/entretiens/${iv.id}`} onClick={e => e.stopPropagation()}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                        <ChevronRight size={18} />
                      </a>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">
              Supprimer {deleteCount > 1 ? `ces ${deleteCount} entretiens` : 'cet entretien'} ?
            </h3>
            {confirmDelete === 'single' && singleTarget && (
              <p className="text-sm text-gray-500 text-center mb-1">
                <span className="font-semibold text-gray-700">{singleTarget.member_name}</span>
                {' — '}{getInterviewLabel(singleTarget.type)}
              </p>
            )}
            <p className="text-xs text-red-600 text-center mb-6 mt-2">
              Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setConfirmDelete(null); setSingleTarget(null) }}
                className="flex-1 px-4 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={doDelete} disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50"
                style={{ backgroundColor: '#C0392B' }}>
                {deleting ? 'Suppression...' : `Supprimer${deleteCount > 1 ? ` (${deleteCount})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
