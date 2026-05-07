'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Ambassador } from '@/lib/types'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function AddMemberModal({ onClose, onSaved }: Props) {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([])
  const [form, setForm] = useState({
    first_name: '', last_name: '', company: '', activity: '', bni_activity: '',
    email: '', phone: '', intro_date: new Date().toISOString().slice(0, 10),
    onboarding_ambassador_id: '', coach_ambassador_id: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/ambassadors').then(r => r.json()).then(setAmbassadors)
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.first_name || !form.last_name || !form.company || !form.activity || !form.intro_date) return
    setSaving(true)
    await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        onboarding_ambassador_id: form.onboarding_ambassador_id || null,
        coach_ambassador_id: form.coach_ambassador_id || null,
      })
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Nouveau membre</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom *" value={form.first_name} onChange={v => set('first_name', v)} />
            <Field label="Nom *" value={form.last_name} onChange={v => set('last_name', v)} />
          </div>
          <Field label="Entreprise *" value={form.company} onChange={v => set('company', v)} />
          <Field label="Activité principale *" value={form.activity} onChange={v => set('activity', v)} />
          <Field label="Activité BNI retenue" value={form.bni_activity} onChange={v => set('bni_activity', v)} placeholder="Si différente de l'activité principale" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" value={form.email} onChange={v => set('email', v)} type="email" />
            <Field label="Téléphone" value={form.phone} onChange={v => set('phone', v)} />
          </div>
          <Field label="Date d'intronisation *" value={form.intro_date} onChange={v => set('intro_date', v)} type="date" />

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ambassadeur On Boarding</label>
            <select
              value={form.onboarding_ambassador_id}
              onChange={e => set('onboarding_ambassador_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              <option value="">— Sélectionner —</option>
              {ambassadors.filter(a => a.role === 'onboarding' || a.role === 'both').map(a => (
                <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ambassadeur Coach Business</label>
            <select
              value={form.coach_ambassador_id}
              onChange={e => set('coach_ambassador_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              <option value="">— Sélectionner —</option>
              {ambassadors.filter(a => a.role === 'coach_business' || a.role === 'both').map(a => (
                <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Annuler</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#C0392B' }}
          >
            {saving ? 'Enregistrement...' : 'Ajouter le membre'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
      />
    </div>
  )
}
