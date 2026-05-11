'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Users, Plus, Search, ChevronRight, Upload, Trash2, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { formatDate, getAmbassadorType } from '@/lib/utils'
import type { Member } from '@/lib/types'
import AddMemberModal from '@/components/AddMemberModal'
import ImportModal from '@/components/ImportModal'

interface MemberRow extends Member {
  full_name: string
  months_since_intro: number
  chapter_name?: string
  onboarding_ambassador?: string
  coach_ambassador?: string
  // XLS database-export fields
  mobile?: string
  city?: string
  department?: string
  bni_role?: string
  sponsor?: string
  renewal_date?: string
}

const PHASES = [
  { label: 'Onboarding',     min: 0,  max: 3  },
  { label: '3 mois',         min: 3,  max: 7  },
  { label: '7 mois',         min: 7,  max: 10 },
  { label: 'Renouvellement', min: 10, max: Infinity },
]

function getPhaseLabel(months: number) {
  return PHASES.find(p => months >= p.min && months < p.max)?.label ?? 'Renouvellement'
}

function Fc({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <th className="px-3 pb-2 pt-1">
      <div className={`flex items-center bg-white border rounded-md px-2 py-1 ${active ? 'border-red-300' : 'border-gray-200'}`}>
        {children}
      </div>
    </th>
  )
}

export default function MembresPage() {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<'single' | 'bulk' | null>(null)
  const [singleTarget, setSingleTarget] = useState<MemberRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Sort
  const [sortField, setSortField] = useState('')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  // Filters
  const [fStatus,     setFStatus]     = useState('Actif')
  const [fSearch,     setFSearch]     = useState('')
  const [fActivity,   setFActivity]   = useState('')
  const [fPhase,      setFPhase]      = useState('')
  const [fCity,       setFCity]       = useState('')
  const [fChapter,    setFChapter]    = useState('')
  const [fRole,       setFRole]       = useState('')
  const [fAmbassador, setFAmbassador] = useState('')

  const load = () => {
    fetch('/api/members').then(r => r.json()).then((data: MemberRow[]) => {
      setMembers(data)
      setSelected(new Set())
    })
  }
  useEffect(() => { load() }, [])

  // Unique values for dropdowns
  const chapters = useMemo(() =>
    [...new Set(members.map(m => m.chapter_name).filter(Boolean))].sort() as string[]
  , [members])

  const cities = useMemo(() =>
    [...new Set(members.map(m => m.city).filter(Boolean))].sort() as string[]
  , [members])

  const roles = useMemo(() =>
    [...new Set(members.map(m => m.bni_role).filter(Boolean))].sort() as string[]
  , [members])

  const ambassadors = useMemo(() => {
    const names = new Set<string>()
    members.forEach(m => {
      if (m.onboarding_ambassador) names.add(m.onboarding_ambassador)
      if (m.coach_ambassador) names.add(m.coach_ambassador)
    })
    return [...names].sort()
  }, [members])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { '': members.length }
    for (const m of members) counts[m.status] = (counts[m.status] ?? 0) + 1
    return counts
  }, [members])

  const hasFilters = !!(fSearch || fActivity || fPhase || fCity || fChapter || fRole || fAmbassador)

  const clearFilters = () => {
    setFSearch(''); setFActivity(''); setFPhase('')
    setFCity(''); setFChapter(''); setFRole(''); setFAmbassador('')
  }

  const filtered = useMemo(() => members.filter(m => {
    if (fStatus && m.status !== fStatus) return false
    if (fSearch) {
      const q = fSearch.toLowerCase()
      if (!m.full_name.toLowerCase().includes(q)) return false
    }
    if (fActivity) {
      const q = fActivity.toLowerCase()
      if (!(m.company || '').toLowerCase().includes(q) && !(m.activity || '').toLowerCase().includes(q)) return false
    }
    if (fPhase && getPhaseLabel(m.months_since_intro) !== fPhase) return false
    if (fCity && (m.city || '') !== fCity) return false
    if (fChapter && (m.chapter_name || '') !== fChapter) return false
    if (fRole && (m.bni_role || '') !== fRole) return false
    if (fAmbassador) {
      const amb = getAmbassadorType(m.months_since_intro) === 'onboarding'
        ? m.onboarding_ambassador : m.coach_ambassador
      if (amb !== fAmbassador) return false
    }
    return true
  }), [members, fStatus, fSearch, fActivity, fPhase, fCity, fChapter, fRole, fAmbassador])

  const sorted = useMemo(() => {
    if (!sortField) return filtered
    return [...filtered].sort((a, b) => {
      let av = '', bv = ''
      if      (sortField === 'full_name')    { av = a.full_name;             bv = b.full_name }
      else if (sortField === 'company')      { av = a.company || '';          bv = b.company || '' }
      else if (sortField === 'activity')     { av = a.activity || '';         bv = b.activity || '' }
      else if (sortField === 'intro_date')   { av = a.intro_date;             bv = b.intro_date }
      else if (sortField === 'city')         { av = a.city || '';             bv = b.city || '' }
      else if (sortField === 'chapter_name') { av = a.chapter_name || '';     bv = b.chapter_name || '' }
      else if (sortField === 'bni_role')     { av = a.bni_role || '';         bv = b.bni_role || '' }
      else if (sortField === 'ambassador')   {
        const ta = getAmbassadorType(a.months_since_intro)
        const tb = getAmbassadorType(b.months_since_intro)
        av = (ta === 'onboarding' ? a.onboarding_ambassador : a.coach_ambassador) || ''
        bv = (tb === 'onboarding' ? b.onboarding_ambassador : b.coach_ambassador) || ''
      }
      const cmp = av.localeCompare(bv, 'fr', { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortDir])

  // Selection helpers
  const allFilteredSelected = filtered.length > 0 && filtered.every(m => selected.has(m.id))
  const someSelected = selected.size > 0

  const toggleOne = (id: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const toggleAll = () =>
    setSelected(allFilteredSelected ? new Set() : new Set(filtered.map(m => m.id)))

  const askSingleDelete = (m: MemberRow, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setSingleTarget(m); setConfirmDelete('single')
  }

  const doDelete = async () => {
    setDeleting(true)
    const ids = confirmDelete === 'bulk' ? Array.from(selected) : [singleTarget!.id]
    await fetch('/api/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    setDeleting(false); setConfirmDelete(null); setSingleTarget(null)
    load()
  }

  const deleteCount = confirmDelete === 'bulk' ? selected.size : 1
  const fs = 'w-full text-xs border-0 bg-transparent focus:outline-none text-gray-600 cursor-pointer'
  const fi = 'w-full text-xs border-0 bg-transparent focus:outline-none text-gray-600 placeholder-gray-400'

  const Th = ({ field, children, className = '' }: { field: string; children: React.ReactNode; className?: string }) => (
    <th onClick={() => handleSort(field)}
      className={`text-left px-3 pt-2.5 pb-0 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none ${className}`}>
      <span className="flex items-center gap-1">
        {children}
        {sortField !== field
          ? <ChevronsUpDown size={11} className="text-gray-300 flex-shrink-0" />
          : sortDir === 'asc'
            ? <ChevronUp size={11} className="text-gray-600 flex-shrink-0" />
            : <ChevronDown size={11} className="text-gray-600 flex-shrink-0" />}
      </span>
    </th>
  )

  return (
    <div className="p-6 max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Membres</h1>
          <p className="text-gray-500 text-sm mt-1">
            {hasFilters
              ? <>{filtered.length} résultat{filtered.length > 1 ? 's' : ''} sur {statusCounts[fStatus] ?? members.length}</>
              : <>{filtered.length} membre{filtered.length > 1 ? 's' : ''}{fStatus ? ` · ${fStatus}` : ''}</>}
            {someSelected && <span className="ml-2 font-medium text-gray-700">· {selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
              <X size={13} /> Effacer les filtres
            </button>
          )}
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
            <Upload size={15} /> Importer BNI Connect
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: '#C0392B' }}>
            <Plus size={16} /> Nouveau membre
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
        {[
          { value: '',                       label: 'Tous'                  },
          { value: 'Actif',                  label: 'Actif'                 },
          { value: 'Arrêté',                 label: 'Arrêté'                },
          { value: 'Annulé',                 label: 'Annulé'                },
          { value: 'Renouvellement en cours', label: 'Renouvellement'        },
          { value: 'Postulation en cours',   label: 'Postulation'           },
        ].map(opt => (
          <button key={opt.value} onClick={() => setFStatus(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
              fStatus === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {opt.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${fStatus === opt.value ? 'bg-gray-100 text-gray-600' : 'bg-transparent text-gray-400'}`}>
              {statusCounts[opt.value] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk delete toolbar */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setConfirmDelete('bulk')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#C0392B' }}>
            <Trash2 size={15} />
            Supprimer {selected.size} membre{selected.size > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead>
            {/* Labels row */}
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-2.5 w-10" rowSpan={2}>
                <input type="checkbox"
                  checked={allFilteredSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !allFilteredSelected }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded accent-red-600" />
              </th>
              <Th field="full_name">Membre</Th>
              <Th field="company">Société / Activité</Th>
              <Th field="intro_date">Intronisation</Th>
              <Th field="city">Ville</Th>
              <Th field="chapter_name">Chapitre</Th>
              <Th field="bni_role">Rôle BNI</Th>
              <th className="px-3 py-2.5 w-16" rowSpan={2} />
            </tr>
            {/* Filters row */}
            <tr className="border-b border-gray-200 bg-gray-50">
              {/* Membre */}
              <th className="px-3 pb-2 pt-1">
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-2 py-1">
                  <Search size={11} className="text-gray-300 flex-shrink-0" />
                  <input type="text" placeholder="Nom…" value={fSearch}
                    onChange={e => setFSearch(e.target.value)} className={fi} />
                  {fSearch && <button onClick={() => setFSearch('')}><X size={11} className="text-gray-300 hover:text-gray-500" /></button>}
                </div>
              </th>
              {/* Société / Activité */}
              <th className="px-3 pb-2 pt-1">
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-2 py-1">
                  <Search size={11} className="text-gray-300 flex-shrink-0" />
                  <input type="text" placeholder="Société, activité…" value={fActivity}
                    onChange={e => setFActivity(e.target.value)} className={fi} />
                  {fActivity && <button onClick={() => setFActivity('')}><X size={11} className="text-gray-300 hover:text-gray-500" /></button>}
                </div>
              </th>
              {/* Intronisation — phase */}
              <Fc active={!!fPhase}>
                <select value={fPhase} onChange={e => setFPhase(e.target.value)} className={fs}>
                  <option value="">Toutes les phases</option>
                  {PHASES.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                </select>
              </Fc>
              {/* Ville */}
              <Fc active={!!fCity}>
                <select value={fCity} onChange={e => setFCity(e.target.value)} className={fs}>
                  <option value="">Toutes les villes</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Fc>
              {/* Chapitre */}
              <Fc active={!!fChapter}>
                <select value={fChapter} onChange={e => setFChapter(e.target.value)} className={fs}>
                  <option value="">Tous les chapitres</option>
                  {chapters.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Fc>
              {/* Rôle BNI + Ambassadeur stacked */}
              <th className="px-3 pb-2 pt-1">
                <div className={`flex items-center bg-white border rounded-md px-2 py-1 mb-1 ${fRole ? 'border-red-300' : 'border-gray-200'}`}>
                  <select value={fRole} onChange={e => setFRole(e.target.value)} className={fs}>
                    <option value="">Tous les rôles</option>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className={`flex items-center bg-white border rounded-md px-2 py-1 ${fAmbassador ? 'border-red-300' : 'border-gray-200'}`}>
                  <select value={fAmbassador} onChange={e => setFAmbassador(e.target.value)} className={fs}>
                    <option value="">Tous les ambassadeurs</option>
                    {ambassadors.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Aucun membre trouvé</p>
                </td>
              </tr>
            )}
            {sorted.map(m => {
              const isSelected = selected.has(m.id)
              const ambType = getAmbassadorType(m.months_since_intro)
              return (
                <tr key={m.id}
                  onClick={() => toggleOne(m.id)}
                  className={`transition-colors cursor-pointer group ${isSelected ? 'bg-red-50/40' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleOne(m.id)}
                      className="w-4 h-4 rounded accent-red-600" />
                  </td>
                  {/* Membre */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{m.full_name}</p>
                      {m.status === 'Arrêté' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium flex-shrink-0">Arrêté</span>
                      )}
                      {m.status === 'Annulé' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-medium flex-shrink-0">Annulé</span>
                      )}
                      {m.status === 'Renouvellement en cours' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium flex-shrink-0">Renouvellement</span>
                      )}
                      {m.status === 'Postulation en cours' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-medium flex-shrink-0">Postulation</span>
                      )}
                    </div>
                    {m.sponsor && <p className="text-xs text-gray-400 mt-0.5">Parrain : {m.sponsor}</p>}
                  </td>
                  {/* Société / Activité */}
                  <td className="px-3 py-3 max-w-[200px]">
                    <p className="text-sm text-gray-800 truncate">{m.company || '—'}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{m.bni_activity || m.activity || ''}</p>
                  </td>
                  {/* Intronisation */}
                  <td className="px-3 py-3">
                    <p className="text-gray-700">{formatDate(m.intro_date)}</p>
                    <p className="text-xs text-gray-400">{m.months_since_intro} mois · {getPhaseLabel(m.months_since_intro)}</p>
                  </td>
                  {/* Ville */}
                  <td className="px-3 py-3">
                    <p className="text-sm text-gray-700">{m.city || '—'}</p>
                    {m.department && <p className="text-xs text-gray-400">{m.department}</p>}
                  </td>
                  {/* Chapitre */}
                  <td className="px-3 py-3">
                    <p className="text-sm text-gray-700">{m.chapter_name || '—'}</p>
                    <p className="text-xs text-gray-400">{ambType === 'onboarding' ? m.onboarding_ambassador : m.coach_ambassador || '—'}</p>
                  </td>
                  {/* Rôle BNI */}
                  <td className="px-3 py-3">
                    <p className="text-sm text-gray-700">{m.bni_role || '—'}</p>
                  </td>
                  {/* Actions */}
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={e => askSingleDelete(m, e)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                      <a href={`/membres/${m.id}`} onClick={e => e.stopPropagation()}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                        <ChevronRight size={16} />
                      </a>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">
              Supprimer {deleteCount > 1 ? `ces ${deleteCount} membres` : 'ce membre'} ?
            </h3>
            {confirmDelete === 'single' && singleTarget && (
              <p className="text-sm text-gray-500 text-center mb-1">
                <span className="font-semibold text-gray-700">{singleTarget.full_name}</span>
              </p>
            )}
            <p className="text-xs text-red-600 text-center mb-6 mt-2">
              Tous les entretiens associés seront également supprimés. Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setConfirmDelete(null); setSingleTarget(null) }}
                className="flex-1 px-4 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={doDelete} disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50"
                style={{ backgroundColor: '#C0392B' }}>
                {deleting ? 'Suppression...' : `Supprimer ${deleteCount > 1 ? deleteCount + ' membres' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={load} />}
    </div>
  )
}
