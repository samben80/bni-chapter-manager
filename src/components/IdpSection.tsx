'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, Loader2, BarChart2, Check, AlertCircle } from 'lucide-react'

interface IdpRow {
  id: number
  report_date: string
  presences: number; absences: number; retards: number; m_col: number; substituts: number
  rdi: number; rde: number; rri: number; rre: number
  invites: number; tet: number; mpb: number; ueg: number
}

const COLS: { key: keyof IdpRow; label: string; unit?: string; title?: string }[] = [
  { key: 'presences',  label: 'P',    title: 'Présences' },
  { key: 'absences',   label: 'A',    title: 'Absences' },
  { key: 'retards',    label: 'L',    title: 'Retards' },
  { key: 'm_col',      label: 'M',    title: 'Membre en colère' },
  { key: 'substituts', label: 'S',    title: 'Substituts' },
  { key: 'rdi',        label: 'RDI',  title: 'Recommandations Données Internes' },
  { key: 'rde',        label: 'RDE',  title: 'Recommandations Données Externes' },
  { key: 'rri',        label: 'RRI',  title: 'Recommandations Reçues Internes' },
  { key: 'rre',        label: 'RRE',  title: 'Recommandations Reçues Externes' },
  { key: 'invites',    label: 'Inv.', title: 'Invités' },
  { key: 'tet',        label: 'TêT',  title: 'Tête-à-Tête' },
  { key: 'mpb',        label: 'MPB',  unit: 'MAD', title: 'Merci Pour Business' },
  { key: 'ueg',        label: 'UEG',  title: 'Unités Équivalentes Groupe' },
]

function fmt(v: number, unit?: string) {
  if (unit === 'MAD') return Number(v).toLocaleString('fr-MA', { maximumFractionDigits: 0 })
  return Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

interface ImportState { loading: boolean; result: { imported: number; notFound: number; notFoundList: string[]; total: number } | null; error: string | null }

export default function IdpSection({ memberId, isAdmin }: { memberId: number; isAdmin: boolean }) {
  const [data, setData] = useState<IdpRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [importDate, setImportDate] = useState(new Date().toISOString().slice(0, 10))
  const [imp, setImp] = useState<ImportState>({ loading: false, result: null, error: null })
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    fetch(`/api/members/${memberId}/idp`)
      .then(r => r.json())
      .then((rows: IdpRow[]) => { setData(rows); setLoading(false) })
      .catch(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [memberId]) // eslint-disable-line react-hooks/exhaustive-deps

  const doImport = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { setImp(s => ({ ...s, error: 'Sélectionnez un fichier' })); return }
    setImp({ loading: true, result: null, error: null })
    const fd = new FormData()
    fd.append('file', file)
    fd.append('report_date', importDate)
    try {
      const res = await fetch('/api/admin/idp', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setImp({ loading: false, result: null, error: json.error ?? 'Erreur' }); return }
      setImp({ loading: false, result: json, error: null })
      load()
    } catch (e) {
      setImp({ loading: false, result: null, error: String(e) })
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900 text-sm">Indicateurs de Performance (6 derniers mois)</h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowImport(v => !v); setImp({ loading: false, result: null, error: null }) }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <Upload size={13} />
            Importer XLS
          </button>
        )}
      </div>

      {/* Import panel (admin only) */}
      {showImport && isAdmin && (
        <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 space-y-3">
          <p className="text-xs text-blue-700 font-medium">Import du fichier région BNI (tous les membres du rapport seront mis à jour)</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date du rapport</label>
              <input
                type="date"
                value={importDate}
                onChange={e => setImportDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fichier XLS / XLSX</label>
              <input ref={fileRef} type="file" accept=".xls,.xlsx" className="text-xs text-gray-600" />
            </div>
            <button
              onClick={doImport}
              disabled={imp.loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: '#C0392B' }}
            >
              {imp.loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {imp.loading ? 'Import...' : 'Lancer'}
            </button>
          </div>

          {imp.error && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> {imp.error}
            </div>
          )}

          {imp.result && (
            <div className="text-xs bg-white border border-green-200 rounded-lg px-3 py-2 space-y-1">
              <p className="flex items-center gap-1 text-green-700 font-medium">
                <Check size={13} /> Import terminé
              </p>
              <p className="text-gray-600">{imp.result.imported} membre(s) importé(s) sur {imp.result.total}</p>
              {imp.result.notFound > 0 && (
                <p className="text-amber-600">{imp.result.notFound} non trouvé(s) : {imp.result.notFoundList.join(', ')}{imp.result.notFoundList.length < imp.result.notFound ? '...' : ''}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="px-5 py-8 text-center text-gray-400 text-sm">Chargement...</div>
      ) : data.length === 0 ? (
        <div className="px-5 py-8 text-center text-gray-400 text-sm">
          <BarChart2 size={24} className="mx-auto mb-2 opacity-30" />
          <p>Aucune donnée IDP disponible pour les 6 derniers mois</p>
          {isAdmin && <p className="text-xs mt-1">Importez un fichier XLS région BNI pour alimenter les données</p>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">Rapport</th>
                {COLS.map(c => (
                  <th key={c.key} title={c.title} className="text-center px-3 py-2.5 text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap cursor-help">
                    {c.label}{c.unit ? <span className="text-gray-400 normal-case font-normal"> ({c.unit})</span> : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-gray-700 whitespace-nowrap">
                    {new Date(row.report_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                  </td>
                  {COLS.map(c => {
                    const v = Number(row[c.key])
                    return (
                      <td key={c.key} className="px-3 py-2.5 text-center text-gray-700 whitespace-nowrap">
                        {v === 0
                          ? <span className="text-gray-300">—</span>
                          : <span className={c.key === 'absences' && v > 2 ? 'text-red-600 font-semibold' : c.key === 'mpb' ? 'font-semibold text-green-700' : ''}>
                              {fmt(v, c.unit)}
                            </span>
                        }
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            {data.length > 1 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Total 6 mois</td>
                  {COLS.map(c => {
                    const total = data.reduce((s, r) => s + Number(r[c.key]), 0)
                    return (
                      <td key={c.key} className="px-3 py-2.5 text-center font-semibold text-gray-800 whitespace-nowrap">
                        {fmt(total, c.unit)}
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
