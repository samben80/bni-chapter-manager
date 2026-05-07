'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { ArrowLeft, Download, Save, CheckCircle } from 'lucide-react'
import { formatDate, getInterviewLabel } from '@/lib/utils'
import Form3Months from '@/components/forms/Form3Months'
import Form7Months from '@/components/forms/Form7Months'
import Form10Months from '@/components/forms/Form10Months'
import FormPreboarding from '@/components/forms/FormPreboarding'
import type { Interview } from '@/lib/types'

interface InterviewDetail extends Interview {
  member_name: string; company: string; activity: string; bni_activity?: string
  email?: string; phone?: string; intro_date: string; chapter_name?: string; ambassador_name?: string
}

export default function EntretienPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [interview, setInterview] = useState<InterviewDetail | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/interviews/${id}`).then(r => r.json()).then((iv: InterviewDetail) => {
      setInterview(iv)
      if (iv.form_data) {
        setFormData(typeof iv.form_data === 'string' ? JSON.parse(iv.form_data) : iv.form_data)
      }
    })
  }, [id])

  const save = async (markComplete = false) => {
    setSaving(true)
    await fetch(`/api/interviews/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...interview,
        form_data: formData,
        status: markComplete ? 'completed' : interview?.status,
        completed_date: markComplete ? new Date().toISOString().slice(0, 10) : interview?.completed_date,
      })
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    if (markComplete) {
      const updated = await fetch(`/api/interviews/${id}`).then(r => r.json())
      setInterview(updated)
    }
  }

  const download = () => { window.open(`/api/interviews/${id}/generate`, '_blank') }

  if (!interview) return (
    <div className="flex items-center justify-center h-full text-gray-400">Chargement...</div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <a href={`/membres/${interview.member_id}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft size={16} /> {interview.member_name}
      </a>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{getInterviewLabel(interview.type)}</h1>
            <p className="text-gray-500 text-sm mt-1">{interview.member_name} · {interview.company}</p>
            <p className="text-gray-400 text-xs mt-1">
              Intronisation : {formatDate(interview.intro_date)}
              {interview.ambassador_name && ` · Ambassadeur : ${interview.ambassador_name}`}
            </p>
          </div>
          <StatusBadge status={interview.status} />
        </div>

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Date de l&apos;entretien</label>
            <input
              type="date"
              value={interview.scheduled_date || ''}
              onChange={e => setInterview(iv => iv ? { ...iv, scheduled_date: e.target.value } : iv)}
              className="block mt-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-200"
            />
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        {interview.type === 'preboarding' && (
          <FormPreboarding data={formData} onChange={setFormData} />
        )}
        {interview.type === '3months' && (
          <Form3Months data={formData} onChange={setFormData} />
        )}
        {interview.type === '7months' && (
          <Form7Months data={formData} onChange={setFormData} />
        )}
        {interview.type === '10months' && (
          <Form10Months data={formData} onChange={setFormData} />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 sticky bottom-4">
        <div className="bg-white rounded-xl border border-gray-200 flex items-center gap-3 px-4 py-3 shadow-lg">
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 font-medium disabled:opacity-40"
          >
            <Save size={15} />
            {saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button
            onClick={download}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Download size={15} />
            Générer DOCX
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button
            onClick={() => save(true)}
            disabled={interview.status === 'completed' || saving}
            className="flex items-center gap-2 text-sm text-green-700 hover:text-green-900 font-medium disabled:opacity-40"
          >
            <CheckCircle size={15} />
            Marquer réalisé
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'À planifier', cls: 'bg-gray-100 text-gray-600' },
    scheduled: { label: 'Planifié', cls: 'bg-blue-100 text-blue-700' },
    overdue: { label: 'En retard', cls: 'bg-red-100 text-red-700' },
    completed: { label: 'Réalisé', cls: 'bg-green-100 text-green-700' },
  }
  const s = map[status] || map.pending
  return <span className={`text-xs px-3 py-1 rounded-full font-semibold ${s.cls}`}>{s.label}</span>
}
