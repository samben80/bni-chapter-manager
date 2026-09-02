'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { ArrowLeft, FileDown, Save, CheckCircle, BarChart2, RotateCcw } from 'lucide-react'
import { formatDate, getInterviewLabel } from '@/lib/utils'
import Form3Months from '@/components/forms/Form3Months'
import Form7Months from '@/components/forms/Form7Months'
import Form10Months from '@/components/forms/Form10Months'
import FormPreboarding from '@/components/forms/FormPreboarding'
import IdpSection from '@/components/IdpSection'
import type { Interview } from '@/lib/types'

interface InterviewDetail extends Interview {
  member_name: string; company: string; activity: string; bni_activity?: string
  email?: string; phone?: string; intro_date: string; chapter_name?: string; ambassador_name?: string
}

interface IdpRow {
  id: number; report_date: string
  presences: number; absences: number; retards: number; m_col: number; substituts: number
  rdi: number; rde: number; rri: number; rre: number
  invites: number; tet: number; mpb: number; ueg: number
}

/** Calcule les agrégats IDP sur 6 mois et retourne les valeurs à injecter dans le formulaire */
function computeIdpDefaults(rows: IdpRow[]): Record<string, unknown> {
  if (rows.length === 0) return {}
  const sum = (key: keyof IdpRow) => rows.reduce((s, r) => s + Number(r[key]), 0)
  const totalP = sum('presences')
  const totalA = sum('absences')
  const sorted = [...rows].sort((a, b) => a.report_date.localeCompare(b.report_date))

  return {
    // Recommandations
    reco_given:            sum('rdi') + sum('rde'),
    reco_received:         sum('rri') + sum('rre'),
    reco_received_internal: sum('rri'),
    reco_received_external: sum('rre'),
    // Présence
    meetings_count:   totalP + totalA,
    absences_count:   totalA,
    attendance_rate:  totalP + totalA > 0
      ? Math.round(totalP / (totalP + totalA) * 1000) / 10
      : 0,
    // Activité
    visitors_invited: sum('invites'),
    visitors:         sum('invites'),
    tat_done:         Math.round(sum('tet')),
    // Business (MPB = Merci Pour Business = CA apporté / donné au groupe)
    ca_given:         Math.round(sum('mpb')),
    // Période analysée
    period_from: sorted[0].report_date,
    period_to:   sorted[sorted.length - 1].report_date,
  }
}

export default function EntretienPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [interview, setInterview] = useState<InterviewDetail | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [idpDefaults, setIdpDefaults] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [idpMonths, setIdpMonths] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch(`/api/interviews/${id}`).then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
    ]).then(([iv, session]: [InterviewDetail, { role?: string }]) => {
      // Default scheduled_date to creation date if not set
      const defaultDate = iv.scheduled_date
        || (iv.created_at ? (iv.created_at as string).slice(0, 10) : new Date().toISOString().slice(0, 10))
      setInterview({ ...iv, scheduled_date: defaultDate })
      if (session?.role === 'admin') setIsAdmin(true)

      const savedData: Record<string, unknown> = iv.form_data
        ? (typeof iv.form_data === 'string' ? JSON.parse(iv.form_data as string) : iv.form_data as Record<string, unknown>)
        : {}

      // Fetch IDP and merge defaults under saved values
      fetch(`/api/members/${iv.member_id}/idp`)
        .then(r => r.json())
        .then((idpRows: IdpRow[]) => {
          setIdpMonths(idpRows.length)
          const defaults = computeIdpDefaults(idpRows)
          setIdpDefaults(defaults)
          // IDP defaults are the base; saved user data takes precedence
          setFormData({ ...defaults, ...savedData })
        })
        .catch(() => setFormData(savedData))
    })
  }, [id])  // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (markComplete = false, forceStatus?: string) => {
    if (!interview?.scheduled_date) {
      alert('Veuillez renseigner la date de l\'entretien avant de sauvegarder.')
      return
    }
    setSaving(true)
    const newStatus = forceStatus ?? (markComplete ? 'completed' : interview?.status)
    const newCompletedDate = markComplete
      ? new Date().toISOString().slice(0, 10)
      : (forceStatus ? null : interview?.completed_date)
    await fetch(`/api/interviews/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...interview,
        form_data: formData,
        status: newStatus,
        completed_date: newCompletedDate,
      })
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    if (markComplete || forceStatus) {
      const updated = await fetch(`/api/interviews/${id}`).then(r => r.json())
      setInterview(updated)
    }
  }

  const resetForm = async () => {
    const confirmed = window.confirm(
      'Réinitialiser le formulaire ?\n\nTout le contenu saisi sera effacé et les champs reviendront à leur état initial (données IDP uniquement).\nCette action est irréversible.'
    )
    if (!confirmed) return
    const fresh = { ...idpDefaults }
    setFormData(fresh)
    // Persist the reset to DB
    await fetch(`/api/interviews/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...interview, form_data: fresh }),
    })
  }

  const download = async () => {
    if (interview?.status !== 'completed') {
      alert('Le PDF ne peut être généré que lorsque l\'entretien est marqué comme réalisé.')
      return
    }
    window.open(`/api/interviews/${id}/generate`, '_blank')
  }

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
            <label className="text-xs font-medium text-gray-600">
              Date de l&apos;entretien <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={interview.scheduled_date || ''}
              onChange={e => setInterview(iv => iv ? { ...iv, scheduled_date: e.target.value } : iv)}
              className={`block mt-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-200 ${
                !interview.scheduled_date ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            />
            {!interview.scheduled_date && (
              <p className="text-xs text-red-500 mt-1">Champ obligatoire</p>
            )}
          </div>
        </div>
      </div>

      {/* IDP Section + auto-fill notice */}
      {interview.type !== 'preboarding' && (
        <div className="mb-6">
          <IdpSection memberId={interview.member_id} isAdmin={isAdmin} />
          {idpMonths > 0 && (
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mt-3">
              <BarChart2 size={14} className="flex-shrink-0" />
              <span>
                Les champs métriques ont été <strong>pré-remplis automatiquement</strong> à partir des données IDP ({idpMonths} mois analysés).
                Vous pouvez les modifier manuellement si nécessaire.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        {interview.type === 'preboarding' && (
          <FormPreboarding data={formData} onChange={setFormData} />
        )}
        {interview.type === '3months' && (
          <Form3Months data={formData} onChange={setFormData} />
        )}
        {(interview.type === '7months' || interview.type === 'free') && (
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
            onClick={resetForm}
            disabled={saving}
            title="Réinitialiser le formulaire"
            className="flex items-center gap-2 text-sm text-orange-500 hover:text-orange-700 font-medium disabled:opacity-40"
          >
            <RotateCcw size={15} />
            Réinitialiser
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button
            onClick={download}
            disabled={interview.status !== 'completed'}
            title={interview.status !== 'completed' ? 'Marquez l\'entretien comme réalisé pour générer le PDF' : ''}
            className="flex items-center gap-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed text-blue-600 hover:text-blue-800"
          >
            <FileDown size={15} />
            Générer PDF
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button
            onClick={e => {
              if (e.ctrlKey && interview.status === 'completed') {
                // Ctrl+click: reset to pending (brouillon)
                save(false, 'pending')
              } else if (interview.status !== 'completed') {
                save(true)
              }
            }}
            disabled={saving}
            title={interview.status === 'completed' ? 'Ctrl+clic pour remettre en brouillon' : 'Marquer comme réalisé'}
            className={`flex items-center gap-2 text-sm font-medium ${
              interview.status === 'completed'
                ? 'text-gray-400 cursor-default'
                : 'text-green-700 hover:text-green-900'
            }`}
          >
            <CheckCircle size={15} />
            {interview.status === 'completed' ? 'Réalisé ✓' : 'Marquer réalisé'}
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
