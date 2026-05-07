'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle, AlertTriangle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type FileFormat = 'database-export' | 'membership-length'

interface ParsedMember {
  // common
  first_name: string
  last_name: string
  chapter_name: string
  intro_date: string
  selected: boolean
  // database-export
  company?: string
  activity?: string
  bni_role?: string
  phone?: string
  mobile?: string
  email?: string
  website?: string
  address?: string
  city?: string
  department?: string
  postal_code?: string
  renewal_date?: string
  sponsor?: string
  status?: string
  // membership-length
  cumulative_duration?: string
  cumulative_start_date?: string
  current_duration?: string
}

interface Props { onClose: () => void; onImported: () => void }
type Step = 'upload' | 'preview' | 'result'
interface ImportResult { imported: number; updated: number; deactivated: number; errors: string[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

// DD/MM/YYYY → YYYY-MM-DD
function parseFrDate(s: string): string {
  if (!s) return ''
  if (s.includes('T')) return s.split('T')[0]  // ISO datetime
  const parts = s.split('/')
  if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  return s
}


// ─── Parsers ──────────────────────────────────────────────────────────────────

function parseXLS(text: string): { members: ParsedMember[]; format: FileFormat } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')
  const SS = 'urn:schemas-microsoft-com:office:spreadsheet'
  const rows = Array.from(doc.getElementsByTagNameNS(SS, 'Row'))
  if (rows.length === 0) return { members: [], format: 'membership-length' }

  // Detect format from first header cell
  const firstCell = rows[0].getElementsByTagNameNS(SS, 'Cell')[0]
  const firstHeader = firstCell?.getElementsByTagNameNS(SS, 'Data')[0]?.textContent?.trim() ?? ''
  const format: FileFormat = firstHeader === 'Prénom' ? 'database-export' : 'membership-length'

  const getText = (row: Element, idx: number) => {
    const cells = Array.from(row.getElementsByTagNameNS(SS, 'Cell'))
    return cells[idx]?.getElementsByTagNameNS(SS, 'Data')[0]?.textContent?.trim() || ''
  }

  const members: ParsedMember[] = []

  for (let i = 1; i < rows.length; i++) {
    const g = (idx: number) => getText(rows[i], idx)

    if (format === 'database-export') {
      const firstName = g(0); const lastName = g(1)
      const introRaw = g(18)
      if (!firstName || !lastName || !introRaw) continue
      const status = g(17)
      members.push({
        first_name: firstName,
        last_name: lastName,
        company: g(2),
        activity: g(3),
        chapter_name: g(4),
        bni_role: g(5),
        phone: g(6),
        mobile: g(9),
        email: g(10),
        website: g(11),
        address: g(12),
        city: g(13),
        department: g(14),
        postal_code: g(15),
        status,
        intro_date: parseFrDate(introRaw),
        renewal_date: parseFrDate(g(19)),
        sponsor: g(20),
        selected: true,
      })
    } else {
      // membership-length-report
      const firstName = g(1); const lastName = g(2)
      const introRaw = g(6)
      if (!firstName || !lastName || !introRaw) continue
      members.push({
        chapter_name: g(0),
        first_name: firstName,
        last_name: lastName,
        cumulative_duration: g(3),
        cumulative_start_date: parseFrDate(g(4)),
        current_duration: g(5),
        intro_date: parseFrDate(introRaw),
        selected: true,
      })
    }
  }

  return { members, format }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportModal({ onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [allMembers, setAllMembers] = useState<ParsedMember[]>([])
  const [format, setFormat] = useState<FileFormat>('database-export')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        if (!text.includes('schemas-microsoft-com:office:spreadsheet')) {
          setError('Format non reconnu. Veuillez utiliser un rapport BNI Connect (.xls).')
          return
        }
        const { members, format } = parseXLS(text)
        if (members.length === 0) {
          setError('Aucun membre trouvé dans le fichier.')
          return
        }
        setAllMembers(members)
        setFormat(format)
        setStep('preview')
      } catch {
        setError('Erreur lors de la lecture du fichier. Vérifiez le format.')
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]; if (file) handleFile(file)
  }

  const selectedCount = allMembers.filter(m => m.selected).length

  const toggleMember = (idx: number) =>
    setAllMembers(prev => prev.map((m, i) => i === idx ? { ...m, selected: !m.selected } : m))

  const toggleAll = () => {
    const allSelected = allMembers.every(m => m.selected)
    setAllMembers(prev => prev.map(m => ({ ...m, selected: !allSelected })))
  }

  const doImport = async () => {
    const toImport = allMembers.filter(m => m.selected)
    if (!toImport.length) return
    setImporting(true)
    const res = await fetch('/api/import/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members: toImport }),
    })
    setResult(await res.json())
    setStep('result')
    setImporting(false)
  }

  const STATUS_COLOR: Record<string, string> = {
    Actif: 'bg-green-100 text-green-700',
    'Arrêté': 'bg-red-100 text-red-700',
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <FileSpreadsheet size={16} className="text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Importer depuis BNI Connect</h2>
              <p className="text-xs text-gray-400">
                {step === 'preview'
                  ? format === 'database-export'
                    ? 'ot-region-database-export-report (.xls)'
                    : 'ot-region-membership-length-report (.xls)'
                  : 'database-export-report ou membership-length-report (.xls)'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Steps */}
        <div className="px-6 py-3 border-b border-gray-50 flex items-center gap-2 flex-shrink-0">
          {(['upload', 'preview', 'result'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-gray-200" />}
              <div className={`flex items-center gap-1.5 text-xs font-medium ${step === s ? 'text-gray-900' : 'text-gray-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === s ? 'text-white' : 'bg-gray-100 text-gray-400'}`}
                  style={step === s ? { backgroundColor: '#C0392B' } : {}}>
                  {i + 1}
                </div>
                {{ upload: 'Fichier', preview: 'Sélection', result: 'Résultat' }[s]}
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="p-8 flex flex-col items-center justify-center min-h-64">
              <div
                className={`w-full max-w-lg border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${dragOver ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet size={28} className="text-green-600" />
                </div>
                <p className="font-semibold text-gray-800 mb-1">Glisser le fichier ici</p>
                <p className="text-sm text-gray-500 mb-4">ou cliquer pour sélectionner</p>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 bg-gray-100 rounded-lg px-3 py-1.5 inline-block">ot-region-database-export-report_*.xls</p>
                  <p className="text-xs text-gray-400">ou</p>
                  <p className="text-xs text-gray-400 bg-gray-100 rounded-lg px-3 py-1.5 inline-block">ot-region-membership-length-report_*.xls</p>
                </div>
                <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
              </div>
              {error && (
                <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">
                  <AlertTriangle size={15} /> {error}
                </div>
              )}
              <div className="mt-6 text-xs text-gray-400 space-y-1 text-center">
                <p>Dans BNI Connect → Rapports → Exportation de la base de données <strong>ou</strong> Longueur d&apos;appartenance</p>
                <p>Exporter en format <strong>Excel</strong></p>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="flex flex-col h-full">
              <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">{allMembers.length}</span> membres détectés ·{' '}
                  <span className="font-semibold text-gray-900">{selectedCount}</span> sélectionnés
                </div>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                  {format === 'database-export' ? 'Exportation base de données' : 'Longueur d\'appartenance'}
                </span>
              </div>

              <div className="overflow-auto flex-1">
                <table className="w-full text-sm min-w-max">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 w-10 sticky left-0 bg-gray-50">
                        <input type="checkbox"
                          checked={allMembers.length > 0 && allMembers.every(m => m.selected)}
                          onChange={toggleAll}
                          className="w-4 h-4 rounded accent-red-600" />
                      </th>
                      {format === 'database-export' ? (
                        <>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Prénom</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Nom de Famille</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Société</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Profession</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Nom du Groupe</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Rôle</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Téléphone</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Portable</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Email</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Site Web</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Adresse</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Ville</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Département</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Code Postal</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Statut</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date d&apos;Inscription</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date de Renouvellement</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Parrain</th>
                        </>
                      ) : (
                        <>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Nom du Groupe</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Prénom</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Nom</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Durée Cumulée</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Départ Cumulé</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Durée Actuelle</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Départ Actuel</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allMembers.map((m, i) => (
                      <tr key={i}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${!m.selected ? 'opacity-40' : ''}`}
                        onClick={() => toggleMember(i)}>
                        <td className="px-4 py-2.5 sticky left-0 bg-white">
                          <input type="checkbox" checked={m.selected}
                            onChange={() => toggleMember(i)}
                            onClick={e => e.stopPropagation()}
                            className="w-4 h-4 rounded accent-red-600" />
                        </td>
                        {format === 'database-export' ? (
                          <>
                            <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{m.first_name}</td>
                            <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{m.last_name}</td>
                            <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap max-w-[160px] truncate">{m.company || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap max-w-[160px] truncate">{m.activity || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{m.chapter_name || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{m.bni_role || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{m.phone || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{m.mobile || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{m.email || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{m.website || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap max-w-[160px] truncate">{m.address || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{m.city || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{m.department || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{m.postal_code || '—'}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[m.status ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                                {m.status || '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">{m.intro_date ? new Date(m.intro_date).toLocaleDateString('fr-FR') : '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{m.renewal_date ? new Date(m.renewal_date).toLocaleDateString('fr-FR') : '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{m.sponsor || '—'}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2.5 text-gray-500 text-xs">{m.chapter_name}</td>
                            <td className="px-3 py-2.5 font-medium text-gray-900">{m.first_name}</td>
                            <td className="px-3 py-2.5 font-medium text-gray-900">{m.last_name}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs">{m.cumulative_duration || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs">{m.cumulative_start_date ? new Date(m.cumulative_start_date).toLocaleDateString('fr-FR') : '—'}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs">{m.current_duration || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-600 text-xs">{m.intro_date ? new Date(m.intro_date).toLocaleDateString('fr-FR') : '—'}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-3 border-t border-gray-100 bg-amber-50 flex-shrink-0">
                <p className="text-xs text-amber-700">
                  {format === 'database-export'
                    ? <><strong>Note :</strong> les membres avec le statut <strong>Arrêté</strong> sont décochés par défaut. Cochez-les si vous souhaitez les importer.</>
                    : <><strong>Note :</strong> ce fichier ne contient pas l&apos;entreprise ni l&apos;activité — ces champs pourront être complétés après l&apos;import.</>
                  }
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 'result' && result && (
            <div className="p-8 flex flex-col items-center justify-center min-h-64">
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-6">Import terminé</h3>
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-3">
                <div className="text-center bg-green-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                  <p className="text-xs text-green-600 mt-1">Nouveaux</p>
                </div>
                <div className="text-center bg-blue-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                  <p className="text-xs text-blue-600 mt-1">Mis à jour</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6">
                {result.deactivated > 0 && (
                  <div className="text-center bg-amber-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-amber-700">{result.deactivated}</p>
                    <p className="text-xs text-amber-600 mt-1">Doublons résiliés</p>
                  </div>
                )}
                <div className={`text-center bg-red-50 rounded-xl p-4 ${result.deactivated === 0 ? 'col-span-2' : ''}`}>
                  <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
                  <p className="text-xs text-red-600 mt-1">Erreurs</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="w-full max-w-sm bg-red-50 rounded-lg p-3 mb-4">
                  <p className="text-xs font-medium text-red-700 mb-2">Erreurs :</p>
                  {result.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                </div>
              )}
              {result.imported > 0 && (
                <p className="text-sm text-gray-500 text-center">
                  {result.imported} entretiens planifiés automatiquement (pré-boarding, 3 mois, 7 mois, 10 mois)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            {step === 'result' ? 'Fermer' : 'Annuler'}
          </button>
          <div className="flex items-center gap-3">
            {step === 'preview' && (
              <button onClick={() => setStep('upload')}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                Changer de fichier
              </button>
            )}
            {step === 'preview' && (
              <button onClick={doImport} disabled={selectedCount === 0 || importing}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#C0392B' }}>
                <Upload size={14} />
                {importing ? 'Import en cours...' : `Importer ${selectedCount} membre${selectedCount > 1 ? 's' : ''}`}
              </button>
            )}
            {step === 'result' && result && (result.imported > 0 || result.updated > 0) && (
              <button onClick={() => { onImported(); onClose() }}
                className="px-5 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: '#C0392B' }}>
                Voir les membres
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
