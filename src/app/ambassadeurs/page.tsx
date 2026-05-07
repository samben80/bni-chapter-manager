'use client'

import { useEffect, useState } from 'react'
import { UserCheck, Plus, X, ChevronRight } from 'lucide-react'
import type { Ambassador } from '@/lib/types'

interface Chapter { id: number; name: string }
interface AmbassadorRow extends Ambassador { chapters: { id: number; name: string }[] }

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

const EMPTY_FORM = { first_name: '', last_name: '', company: '', email: '', phone: '', role: 'both' }

export default function AmbassadeursPage() {
  const [ambassadors, setAmbassadors] = useState<AmbassadorRow[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)

  const load = () => fetch('/api/ambassadors').then(r => r.json()).then(setAmbassadors)

  useEffect(() => {
    load()
    fetch('/api/chapters').then(r => r.json()).then(setChapters)
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const toggleChapter = (id: number) =>
    setSelectedChapterIds(prev => {
      const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
    })

  const save = async () => {
    if (!form.first_name || !form.last_name) return
    setSaving(true)
    await fetch('/api/ambassadors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, chapter_ids: Array.from(selectedChapterIds) }),
    })
    setSaving(false)
    setShowAdd(false)
    setForm(EMPTY_FORM)
    setSelectedChapterIds(new Set())
    load()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ambassadeurs</h1>
          <p className="text-gray-500 text-sm mt-1">
            {ambassadors.length} ambassadeur{ambassadors.length > 1 ? 's' : ''} actif{ambassadors.length > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: '#C0392B' }}>
          <Plus size={16} /> Nouvel ambassadeur
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ambassadors.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">
            <UserCheck size={40} className="mx-auto mb-3 opacity-30" />
            <p>Aucun ambassadeur enregistré</p>
            <p className="text-sm mt-1">Ajoutez les ambassadeurs du chapitre</p>
          </div>
        )}
        {ambassadors.map(a => (
          <a key={a.id} href={`/ambassadeurs/${a.id}`}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group block">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: '#2C3E50' }}>
                {a.first_name[0]}{a.last_name[0]}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLOR[a.role]}`}>
                  {ROLE_LABEL[a.role]}
                </span>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </div>
            <p className="font-semibold text-gray-900">{a.first_name} {a.last_name}</p>
            {a.company && <p className="text-sm text-gray-500 mt-0.5">{a.company}</p>}
            {a.email && <p className="text-xs text-gray-400 mt-2">{a.email}</p>}
            {a.phone && <p className="text-xs text-gray-400">{a.phone}</p>}

            {/* Chapter badges */}
            {a.chapters?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
                {a.chapters.map(c => (
                  <span key={c.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full truncate max-w-[140px]" title={c.name}>
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </a>
        ))}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-semibold text-gray-900">Nouvel ambassadeur</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
                  <input type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
                  <input type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Entreprise</label>
                <input type="text" value={form.company} onChange={e => set('company', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
                  <input type="text" value={form.phone} onChange={e => set('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rôle *</label>
                <select value={form.role} onChange={e => set('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200">
                  <option value="both">On Boarding + Coach Business</option>
                  <option value="onboarding">On Boarding uniquement</option>
                  <option value="coach_business">Coach Business uniquement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Chapitres assignés</label>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {chapters.length === 0 && (
                    <p className="px-3 py-2 text-xs text-gray-400">Aucun chapitre disponible</p>
                  )}
                  {chapters.map(c => (
                    <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox"
                        checked={selectedChapterIds.has(c.id)}
                        onChange={() => toggleChapter(c.id)}
                        className="w-4 h-4 rounded accent-red-600" />
                      <span className="text-sm text-gray-700 truncate">{c.name}</span>
                    </label>
                  ))}
                </div>
                {selectedChapterIds.size > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{selectedChapterIds.size} chapitre{selectedChapterIds.size > 1 ? 's' : ''} sélectionné{selectedChapterIds.size > 1 ? 's' : ''}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600">Annuler</button>
              <button onClick={save} disabled={saving || !form.first_name || !form.last_name}
                className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#C0392B' }}>
                {saving ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
