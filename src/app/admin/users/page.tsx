'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, X, Check, ShieldCheck, UserCheck, Users } from 'lucide-react'

interface UserRow {
  id: number
  name: string
  email: string
  role: 'admin' | 'dc' | 'amb'
  active: boolean
  chapter_ids: number[] | null
  ambassador_id: number | null
  ambassador_name: string | null
  created_at: string
}

interface Chapter { id: number; name: string }
interface Ambassador { id: number; first_name: string; last_name: string; full_name: string }

const ROLE_LABELS = { admin: 'Administrateur', dc: 'Directeur Consultatif', amb: 'Ambassadeur' }
const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700',
  dc: 'bg-blue-100 text-blue-700',
  amb: 'bg-green-100 text-green-700',
}
const ROLE_ICONS = { admin: ShieldCheck, dc: Users, amb: UserCheck }

const EMPTY_FORM = {
  id: 0, name: '', email: '', password: '', role: 'dc' as UserRow['role'],
  chapter_ids: [] as number[], ambassador_id: null as number | null, active: true,
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [u, c, a] = await Promise.all([
      fetch('/api/auth/users').then(r => r.json()),
      fetch('/api/chapters').then(r => r.json()),
      fetch('/api/ambassadors').then(r => r.json()),
    ])
    setUsers(Array.isArray(u) ? u : [])
    setChapters(Array.isArray(c) ? c : [])
    setAmbassadors(Array.isArray(a) ? a : [])
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [])

  function openCreate() {
    setForm({ ...EMPTY_FORM })
    setError('')
    setShowModal(true)
  }

  function openEdit(u: UserRow) {
    setForm({
      id: u.id, name: u.name, email: u.email, password: '',
      role: u.role, chapter_ids: u.chapter_ids ?? [], ambassador_id: u.ambassador_id,
      active: u.active,
    })
    setError('')
    setShowModal(true)
  }

  async function save() {
    setError('')
    setSaving(true)
    try {
      const isNew = form.id === 0
      const body = {
        ...form,
        chapter_ids: form.role === 'dc' ? form.chapter_ids : [],
        ambassador_id: form.role === 'amb' ? form.ambassador_id : null,
      }
      const res = await fetch('/api/auth/users', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      setShowModal(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  function toggleChapter(id: number) {
    setForm(f => ({
      ...f,
      chapter_ids: f.chapter_ids.includes(id)
        ? f.chapter_ids.filter(c => c !== id)
        : [...f.chapter_ids, id],
    }))
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les accès et les rôles</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer"
          style={{ backgroundColor: '#C0392B' }}
        >
          <Plus size={16} />
          Nouvel utilisateur
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rôle</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Accès</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actif</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Aucun utilisateur</td></tr>
            )}
            {users.map(u => {
              const Icon = ROLE_ICONS[u.role]
              return (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3.5 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                      <Icon size={11} />
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs">
                    {u.role === 'amb' && u.ambassador_name && (
                      <span className="font-medium text-gray-700">{u.ambassador_name}</span>
                    )}
                    {u.role === 'dc' && (
                      <span>{(u.chapter_ids?.length ?? 0)} chapitre(s)</span>
                    )}
                    {u.role === 'admin' && <span className="text-purple-600">Accès total</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {u.active
                      ? <Check size={16} className="text-green-500 mx-auto" />
                      : <X size={16} className="text-gray-300 mx-auto" />
                    }
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {form.id === 0 ? 'Nouvel utilisateur' : 'Modifier l\'utilisateur'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <Field label="Nom complet">
                <input
                  type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field" placeholder="Prénom Nom"
                />
              </Field>

              <Field label="Email">
                <input
                  type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input-field" placeholder="email@exemple.com"
                />
              </Field>

              <Field label={form.id === 0 ? 'Mot de passe' : 'Nouveau mot de passe (laisser vide = inchangé)'}>
                <input
                  type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input-field" placeholder="••••••••"
                />
              </Field>

              <Field label="Rôle">
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRow['role'] }))}
                  className="input-field"
                >
                  <option value="admin">Administrateur</option>
                  <option value="dc">Directeur Consultatif</option>
                  <option value="amb">Ambassadeur</option>
                </select>
              </Field>

              {form.role === 'dc' && chapters.length > 0 && (
                <Field label="Chapitres autorisés">
                  <div className="space-y-1.5 mt-1">
                    {chapters.map(c => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.chapter_ids.includes(c.id)}
                          onChange={() => toggleChapter(c.id)}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </Field>
              )}

              {form.role === 'amb' && (
                <Field label="Ambassadeur lié">
                  <select
                    value={form.ambassador_id ?? ''}
                    onChange={e => setForm(f => ({ ...f, ambassador_id: e.target.value ? Number(e.target.value) : null }))}
                    className="input-field"
                  >
                    <option value="">— Sélectionner —</option>
                    {ambassadors.map(a => (
                      <option key={a.id} value={a.id}>{a.full_name}</option>
                    ))}
                  </select>
                </Field>
              )}

              {form.id !== 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox" checked={form.active}
                    onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Compte actif</span>
                </label>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: '#C0392B' }}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input-field:focus {
          border-color: #C0392B;
          box-shadow: 0 0 0 2px rgba(192,57,43,0.15);
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
