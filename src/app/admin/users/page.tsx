'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, X, Check, ShieldCheck, UserCheck, Users, Building2, MapPin, Globe } from 'lucide-react'

type UserRole = 'admin' | 'codir' | 'amb' | 'dc' | 'dz' | 'dr'
type AmbRole  = 'onboarding' | 'coach_business' | 'both'

interface UserRow {
  id: number
  name: string
  first_name: string | null
  last_name: string | null
  email: string
  role: UserRole
  amb_role: AmbRole | null
  company: string | null
  phone: string | null
  active: boolean
  chapter_ids: number[] | null
  ambassador_id: number | null
  created_at: string
}

interface Chapter { id: number; name: string }

const ROLE_META: Record<UserRole, { label: string; short: string; color: string; icon: React.ElementType }> = {
  admin: { label: 'Administrateur',        short: 'Admin',  color: 'bg-purple-100 text-purple-700', icon: ShieldCheck },
  codir: { label: 'CODIR',                 short: 'CODIR',  color: 'bg-indigo-100 text-indigo-700', icon: Building2 },
  dc:    { label: 'DC – Dir. Consultatif', short: 'DC',     color: 'bg-blue-100   text-blue-700',   icon: Users },
  dz:    { label: 'DZ – Dir. de Zone',     short: 'DZ',     color: 'bg-cyan-100   text-cyan-700',   icon: MapPin },
  dr:    { label: 'DR – Dir. de Région',   short: 'DR',     color: 'bg-teal-100   text-teal-700',   icon: Globe },
  amb:   { label: 'Ambassadeur',           short: 'Amb',    color: 'bg-green-100  text-green-700',  icon: UserCheck },
}

const AMB_ROLE_META: Record<AmbRole, { label: string; color: string }> = {
  onboarding:     { label: 'Coach Onboarding',               color: 'bg-orange-100 text-orange-700' },
  coach_business: { label: 'Business Coach',                 color: 'bg-rose-100   text-rose-700'   },
  both:           { label: 'Business Coach & Onboarding',    color: 'bg-purple-100 text-purple-700' },
}

const EMPTY_FORM = {
  id: 0,
  first_name: '', last_name: '', email: '', phone: '', company: '',
  password: '',
  role: 'dc' as UserRole,
  amb_role: 'onboarding' as AmbRole,
  chapter_ids: [] as number[],
  active: true,
}

export default function AdminUsersPage() {
  const [users, setUsers]       = useState<UserRow[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]         = useState({ ...EMPTY_FORM })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function load() {
    const [u, c] = await Promise.all([
      fetch('/api/auth/users').then(r => r.json()),
      fetch('/api/chapters').then(r => r.json()),
    ])
    setUsers(Array.isArray(u) ? u : [])
    setChapters(Array.isArray(c) ? c : [])
  }

  useEffect(() => { void load() }, [])

  function openCreate() {
    setForm({ ...EMPTY_FORM })
    setError('')
    setShowModal(true)
  }

  function openEdit(u: UserRow) {
    setForm({
      id: u.id,
      first_name: u.first_name ?? '',
      last_name:  u.last_name  ?? '',
      email:      u.email,
      phone:      u.phone    ?? '',
      company:    u.company  ?? '',
      password:   '',
      role:       u.role,
      amb_role:   u.amb_role ?? 'onboarding',
      chapter_ids: u.chapter_ids ?? [],
      active:     u.active,
    })
    setError('')
    setShowModal(true)
  }

  async function save() {
    setError('')
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('Prénom et nom requis'); return
    }
    if (!form.email.trim()) { setError('Email requis'); return }
    if (form.id === 0 && !form.password) { setError('Mot de passe requis'); return }

    setSaving(true)
    try {
      const body = {
        ...form,
        chapter_ids: form.role !== 'admin' ? form.chapter_ids : [],
        amb_role:    form.role === 'amb' ? form.amb_role : undefined,
      }
      const res = await fetch('/api/auth/users', {
        method: form.id === 0 ? 'POST' : 'PUT',
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

  function set<K extends keyof typeof EMPTY_FORM>(key: K, val: (typeof EMPTY_FORM)[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  const chapterMap = Object.fromEntries(chapters.map(c => [c.id, c.name]))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs & Ambassadeurs</h1>
          <p className="text-sm text-gray-500 mt-1">Gestion unifiée des accès et des rôles</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
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
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Chapitres</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actif</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Aucun utilisateur</td></tr>
            )}
            {users.map(u => {
              const meta = ROLE_META[u.role]
              const Icon = meta.icon
              return (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">
                      {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.name}
                    </p>
                    {u.company && <p className="text-xs text-gray-400 mt-0.5">{u.company}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium w-fit ${meta.color}`}>
                        <Icon size={11} />
                        {meta.short}
                      </span>
                      {u.role === 'amb' && u.amb_role && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${AMB_ROLE_META[u.amb_role].color}`}>
                          {AMB_ROLE_META[u.amb_role].label}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs">
                    {u.role === 'admin' ? (
                      <span className="text-purple-600 font-medium">Accès total</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(u.chapter_ids ?? []).length === 0
                          ? <span className="text-gray-400">Aucun chapitre</span>
                          : (u.chapter_ids ?? []).map(cid => (
                              <span key={cid} className="bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                                {chapterMap[cid] ?? cid}
                              </span>
                            ))
                        }
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {u.active
                      ? <Check size={16} className="text-green-500 mx-auto" />
                      : <X    size={16} className="text-gray-300 mx-auto" />
                    }
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {form.id === 0 ? 'Nouvel utilisateur' : 'Modifier l\'utilisateur'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Prénom / Nom */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prénom *">
                  <input type="text" value={form.first_name}
                    onChange={e => set('first_name', e.target.value)}
                    className="input-field" placeholder="Prénom" />
                </Field>
                <Field label="Nom *">
                  <input type="text" value={form.last_name}
                    onChange={e => set('last_name', e.target.value)}
                    className="input-field" placeholder="Nom" />
                </Field>
              </div>

              {/* Société / Téléphone */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Société">
                  <input type="text" value={form.company}
                    onChange={e => set('company', e.target.value)}
                    className="input-field" placeholder="Entreprise" />
                </Field>
                <Field label="Téléphone">
                  <input type="tel" value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    className="input-field" placeholder="+212 6 00 00 00 00" />
                </Field>
              </div>

              {/* Email */}
              <Field label="Email *">
                <input type="email" value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className="input-field" placeholder="email@exemple.com" />
              </Field>

              {/* Mot de passe */}
              <Field label={form.id === 0 ? 'Mot de passe *' : 'Nouveau mot de passe (vide = inchangé)'}>
                <input type="password" value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className="input-field" placeholder="••••••••" />
              </Field>

              {/* Rôle */}
              <Field label="Rôle *">
                <select value={form.role}
                  onChange={e => set('role', e.target.value as UserRole)}
                  className="input-field">
                  <option value="admin">Administrateur</option>
                  <option value="codir">CODIR (Comité de Direction)</option>
                  <option value="dc">DC – Directeur Consultatif</option>
                  <option value="dz">DZ – Directeur de Zone</option>
                  <option value="dr">DR – Directeur de Région</option>
                  <option value="amb">Ambassadeur</option>
                </select>
              </Field>

              {/* Type ambassadeur (si role = amb) */}
              {form.role === 'amb' && (
                <Field label="Type d'ambassadeur *">
                  <div className="flex gap-3 mt-1">
                    {(['onboarding', 'coach_business', 'both'] as AmbRole[]).map(r => (
                      <label key={r} className={`flex-1 flex items-center justify-center gap-2 border-2 rounded-lg px-3 py-2.5 cursor-pointer text-sm font-medium transition-colors ${
                        form.amb_role === r
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                        <input type="radio" name="amb_role" value={r}
                          checked={form.amb_role === r}
                          onChange={() => set('amb_role', r)}
                          className="sr-only" />
                        {AMB_ROLE_META[r].label}
                      </label>
                    ))}
                  </div>
                </Field>
              )}

              {/* Chapitres (tous sauf admin) */}
              {form.role !== 'admin' && chapters.length > 0 && (
                <Field label="Chapitres accessibles">
                  <div className="space-y-1.5 mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {chapters.map(c => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                        <input type="checkbox"
                          checked={form.chapter_ids.includes(c.id)}
                          onChange={() => toggleChapter(c.id)}
                          className="rounded accent-red-600" />
                        <span className="text-sm text-gray-700">{c.name}</span>
                      </label>
                    ))}
                  </div>
                  {form.chapter_ids.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Aucun chapitre sélectionné — l&apos;utilisateur ne verra rien</p>
                  )}
                </Field>
              )}

              {/* Actif (si édition) */}
              {form.id !== 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.active}
                    onChange={e => set('active', e.target.checked)}
                    className="rounded accent-red-600" />
                  <span className="text-sm text-gray-700">Compte actif</span>
                </label>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Annuler
              </button>
              <button onClick={save} disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60"
                style={{ backgroundColor: '#C0392B' }}>
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
