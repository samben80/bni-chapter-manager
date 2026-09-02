'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, Loader2, Check, AlertCircle, Trash2, BarChart2, FileSpreadsheet } from 'lucide-react'

interface IdpImport {
  report_date: string
  member_count: number
}

interface ImportState {
  loading: boolean
  result: { imported: number; notFound: number; notFoundList: string[]; total: number } | null
  error: string | null
}

export default function AdminIdpPage() {
  const [imports, setImports] = useState<IdpImport[]>([])
  const [loading, setLoading] = useState(true)
  const [importDate, setImportDate] = useState(new Date().toISOString().slice(0, 10))
  const [imp, setImp] = useState<ImportState>({ loading: false, result: null, error: null })
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/idp')
      .then(r => r.json())
      .then((rows: IdpImport[]) => { setImports(rows); setLoading(false) })
      .catch(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

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
      if (fileRef.current) fileRef.current.value = ''
      load()
    } catch (e) {
      setImp({ loading: false, result: null, error: String(e) })
    }
  }

  const doDelete = async (reportDate: string) => {
    if (!confirm(`Supprimer toutes les données IDP du rapport ${fmt(reportDate)} ?`)) return
    setDeleting(reportDate)
    try {
      await fetch('/api/admin/idp', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_date: reportDate }),
      })
      load()
    } finally {
      setDeleting(null)
    }
  }

  function fmt(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 size={22} className="text-red-600" />
          Gestion des IDP
        </h1>
        <p className="text-sm text-gray-500 mt-1">Importez les fichiers Excel région BNI pour alimenter les indicateurs de performance des membres.</p>
      </div>

      {/* Import card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900 text-sm">Importer un rapport XLS</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <p className="text-xs text-gray-500">
            Le fichier doit contenir les colonnes : <span className="font-mono bg-gray-100 px-1 rounded">Groupe</span>, <span className="font-mono bg-gray-100 px-1 rounded">Prénom</span>, <span className="font-mono bg-gray-100 px-1 rounded">Nom</span>, <span className="font-mono bg-gray-100 px-1 rounded">P</span>, <span className="font-mono bg-gray-100 px-1 rounded">A</span>, <span className="font-mono bg-gray-100 px-1 rounded">L</span>, <span className="font-mono bg-gray-100 px-1 rounded">RDI</span>, <span className="font-mono bg-gray-100 px-1 rounded">RDE</span>, <span className="font-mono bg-gray-100 px-1 rounded">RRI</span>, <span className="font-mono bg-gray-100 px-1 rounded">RRE</span>, <span className="font-mono bg-gray-100 px-1 rounded">MPB</span>…
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date du rapport</label>
              <input
                type="date"
                value={importDate}
                onChange={e => setImportDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fichier XLS / XLSX</label>
              <input ref={fileRef} type="file" accept=".xls,.xlsx" className="text-xs text-gray-600" />
            </div>
            <button
              onClick={doImport}
              disabled={imp.loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: '#C0392B' }}
            >
              {imp.loading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {imp.loading ? 'Import en cours…' : 'Lancer l\'import'}
            </button>
          </div>

          {imp.error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle size={15} className="flex-shrink-0" /> {imp.error}
            </div>
          )}

          {imp.result && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 space-y-1">
              <p className="flex items-center gap-2 text-sm text-green-700 font-semibold">
                <Check size={15} /> Import terminé avec succès
              </p>
              <p className="text-sm text-gray-700">{imp.result.imported} membre(s) mis à jour sur {imp.result.total} lignes traitées.</p>
              {imp.result.notFound > 0 && (
                <p className="text-sm text-amber-700">
                  {imp.result.notFound} membre(s) non trouvé(s) dans la base :{' '}
                  <span className="font-medium">{imp.result.notFoundList.join(', ')}{imp.result.notFoundList.length < imp.result.notFound ? '…' : ''}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Imports list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Rapports importés</h2>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : imports.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            <BarChart2 size={28} className="mx-auto mb-2 opacity-30" />
            <p>Aucun rapport IDP importé</p>
            <p className="text-xs mt-1">Importez votre premier fichier Excel ci-dessus</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-gray-500 font-semibold">Période</th>
                <th className="text-left px-5 py-3 text-gray-500 font-semibold">Date de rapport</th>
                <th className="text-center px-5 py-3 text-gray-500 font-semibold">Membres mis à jour</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {imports.map(row => (
                <tr key={row.report_date} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800 capitalize">{fmt(row.report_date)}</td>
                  <td className="px-5 py-3 text-gray-500">{new Date(row.report_date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {row.member_count} membre{row.member_count > 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => doDelete(row.report_date)}
                      disabled={deleting === row.report_date}
                      className="flex items-center gap-1.5 ml-auto text-xs text-red-600 hover:text-red-800 disabled:opacity-40 px-2 py-1 rounded hover:bg-red-50"
                    >
                      {deleting === row.report_date
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />}
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
