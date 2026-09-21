'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  IdCard, Search, Upload, Download, Image as ImageIcon, X, Check,
  AlertTriangle, Loader2, FileText,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import type { Member } from '@/lib/types'
import { SPHERE_NAMES, sphereColor } from '@/lib/spheres'

interface Row extends Member {
  full_name: string
}

// ── Utilitaires ───────────────────────────────────────────────────────────────
function norm(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Réduit une image (data URL) à une largeur max pour limiter le poids stocké. */
function downscaleImage(file: File, maxW = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new window.Image()
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ImpressionsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState<'badges' | 'chevalets' | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const logoForId = useRef<number | null>(null)

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/members')
      if (res.status === 401) { window.location.href = '/login'; return }
      const data: Row[] = await res.json()
      setRows(data)
    } catch {
      setError('Impossible de charger les membres.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = norm(search)
    const list = q
      ? rows.filter(r => norm(`${r.full_name} ${r.company ?? ''} ${r.activity ?? ''} ${r.sphere ?? ''}`).includes(q))
      : rows
    return [...list].sort((a, b) => a.full_name.localeCompare(b.full_name, 'fr'))
  }, [rows, search])

  const selectedIdsInOrder = useMemo(
    () => filtered.filter(r => selected.has(r.id)).map(r => r.id),
    [filtered, selected],
  )

  const allVisibleSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id))

  function toggle(id: number) {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  function toggleAll() {
    setSelected(prev => {
      if (allVisibleSelected) {
        const n = new Set(prev); filtered.forEach(r => n.delete(r.id)); return n
      }
      const n = new Set(prev); filtered.forEach(r => n.add(r.id)); return n
    })
  }

  // ── Sauvegarde inline d'un champ ────────────────────────────────────────────
  async function patchMember(id: number, patch: Partial<Member>) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
    setSavingIds(prev => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Enregistrement refusé.')
      }
    } catch {
      setError('Erreur réseau lors de l’enregistrement.')
    } finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  // ── Logo ────────────────────────────────────────────────────────────────────
  function pickLogo(id: number) {
    logoForId.current = id
    logoInputRef.current?.click()
  }
  async function onLogoChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const id = logoForId.current
    e.target.value = ''
    if (!file || id == null) return
    try {
      const dataUrl = await downscaleImage(file)
      await patchMember(id, { logo_path: dataUrl })
    } catch {
      setError('Impossible de lire l’image.')
    }
  }

  // ── Import Excel/CSV en masse ────────────────────────────────────────────────
  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportMsg(null); setError(null)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      if (json.length === 0) { setImportMsg('Fichier vide.'); return }

      // Index des membres par email et par nom normalisé
      const byEmail = new Map<string, Row>()
      const byName = new Map<string, Row>()
      for (const r of rows) {
        if (r.email) byEmail.set(norm(r.email), r)
        byName.set(norm(r.full_name), r)
        byName.set(norm(`${r.first_name} ${r.last_name}`), r)
      }

      const pick = (row: Record<string, unknown>, keys: string[]): string => {
        for (const k of Object.keys(row)) {
          const nk = norm(k)
          if (keys.some(want => nk.includes(want))) {
            const v = row[k]
            if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
          }
        }
        return ''
      }

      let updated = 0, unmatched = 0
      const patches: { id: number; patch: Partial<Member> }[] = []
      for (const row of json) {
        const email = pick(row, ['email', 'mail'])
        const fullName = pick(row, ['nom complet', 'nom et prenom'])
        const prenom = pick(row, ['prenom', 'first'])
        const nom = pick(row, ['nom', 'last'])
        const identity = email
          ? byEmail.get(norm(email))
          : (byName.get(norm(fullName)) || byName.get(norm(`${prenom} ${nom}`)))
        if (!identity) { unmatched++; continue }

        const patch: Partial<Member> = {}
        const sphere = pick(row, ['sphere'])
        const company = pick(row, ['societe', 'société', 'entreprise', 'company'])
        const activity = pick(row, ['metier', 'métier', 'activite', 'activité', 'profession'])
        const city = pick(row, ['ville', 'city'])
        if (sphere) patch.sphere = sphere
        if (company) patch.company = company
        if (activity) patch.activity = activity
        if (city) patch.city = city
        if (Object.keys(patch).length > 0) { patches.push({ id: identity.id, patch }); updated++ }
      }

      // Applique en base (séquentiel pour rester simple/robuste)
      for (const { id, patch } of patches) {
        // eslint-disable-next-line no-await-in-loop
        await patchMember(id, patch)
      }
      setImportMsg(`Import terminé : ${updated} membre(s) mis à jour${unmatched ? `, ${unmatched} ligne(s) non reconnues.` : '.'}`)
    } catch {
      setError('Fichier illisible. Formats acceptés : .xlsx, .xls, .csv')
    }
  }

  // ── Génération PDF ───────────────────────────────────────────────────────────
  async function generate(type: 'badges' | 'chevalets') {
    if (selectedIdsInOrder.length === 0) return
    setBusy(type); setError(null)
    try {
      const res = await fetch(`/api/documents/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIdsInOrder }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'La génération a échoué.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = type === 'badges' ? 'Badges_BNI.pdf' : 'Chevalets_BNI.pdf'
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    } catch {
      setError('Erreur réseau pendant la génération.')
    } finally {
      setBusy(null)
    }
  }

  const nSel = selectedIdsInOrder.length
  const badgePages = Math.ceil(nSel / 10)

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-1">
        <IdCard className="text-red-600" size={26} />
        <h1 className="text-2xl font-bold text-gray-800">Badges &amp; Chevalets</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Sélectionnez les membres, complétez leurs informations (sphère, société, métier, ville, logo),
        puis générez les PDF au format du chapitre. Badges : 10 par page A4. Chevalets : 1 par page A4 (à plier).
      </p>

      {/* Barre d'actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-2.5 top-2.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un membre…"
            className="pl-8 pr-3 py-2 border border-gray-200 rounded-md text-sm w-64 focus:outline-none focus:border-red-300"
          />
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50"
        >
          <Upload size={16} /> Importer (Excel)
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onImportFile} />
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoChosen} />

        <div className="flex-1" />

        <span className="text-sm text-gray-500">{nSel} sélectionné(s)</span>
        <button
          onClick={() => generate('badges')}
          disabled={nSel === 0 || busy !== null}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === 'badges' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Badges (PDF){nSel > 0 ? ` · ${badgePages} p.` : ''}
        </button>
        <button
          onClick={() => generate('chevalets')}
          disabled={nSel === 0 || busy !== null}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-[#1D3D7A] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === 'chevalets' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          Chevalets (PDF){nSel > 0 ? ` · ${nSel} p.` : ''}
        </button>
      </div>

      {/* Messages */}
      {importMsg && (
        <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 flex items-center gap-2">
          <Check size={16} /> {importMsg}
          <button className="ml-auto text-green-700/70 hover:text-green-900" onClick={() => setImportMsg(null)}><X size={14} /></button>
        </div>
      )}
      {error && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
          <button className="ml-auto text-red-700/70 hover:text-red-900" onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Aide import */}
      <details className="mb-3 text-xs text-gray-500">
        <summary className="cursor-pointer select-none">Colonnes reconnues à l’import Excel</summary>
        <div className="mt-1 pl-4">
          <b>Email</b> ou <b>Nom complet</b> (ou <b>Prénom</b> + <b>Nom</b>) pour identifier le membre, puis&nbsp;:
          <b> Sphère</b>, <b>Société</b>, <b>Métier</b> (ou Activité/Profession), <b>Ville</b>. Les logos s’ajoutent membre par membre.
        </div>
      </details>

      {/* Tableau */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
              <th className="px-3 py-2 w-10">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} />
              </th>
              <th className="px-3 py-2">Membre</th>
              <th className="px-3 py-2">Société</th>
              <th className="px-3 py-2">Métier</th>
              <th className="px-3 py-2 w-28">Ville</th>
              <th className="px-3 py-2 w-64">Sphère</th>
              <th className="px-3 py-2 w-24">Logo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-400">
                <Loader2 className="inline animate-spin mr-2" size={16} /> Chargement…
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-400">Aucun membre.</td></tr>
            ) : filtered.map(r => {
              const color = sphereColor(r.sphere)
              const isSel = selected.has(r.id)
              const saving = savingIds.has(r.id)
              return (
                <tr key={r.id} className={`border-b border-gray-100 ${isSel ? 'bg-red-50/40' : ''}`}>
                  <td className="px-3 py-2 align-middle">
                    <input type="checkbox" checked={isSel} onChange={() => toggle(r.id)} />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="font-medium text-gray-800 flex items-center gap-1.5">
                      {r.full_name}
                      {saving && <Loader2 size={12} className="animate-spin text-gray-400" />}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      defaultValue={r.company ?? ''}
                      onBlur={e => { const v = e.target.value; if (v !== (r.company ?? '')) patchMember(r.id, { company: v }) }}
                      className="w-full min-w-[140px] px-2 py-1 border border-transparent hover:border-gray-200 focus:border-red-300 rounded focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      defaultValue={r.activity ?? ''}
                      onBlur={e => { const v = e.target.value; if (v !== (r.activity ?? '')) patchMember(r.id, { activity: v }) }}
                      className="w-full min-w-[140px] px-2 py-1 border border-transparent hover:border-gray-200 focus:border-red-300 rounded focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      defaultValue={r.city ?? ''}
                      onBlur={e => { const v = e.target.value; if (v !== (r.city ?? '')) patchMember(r.id, { city: v }) }}
                      className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-red-300 rounded focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3.5 h-3.5 rounded-sm flex-shrink-0 border border-black/10"
                            style={{ backgroundColor: color || '#fff' }} />
                      <select
                        value={SPHERE_NAMES.includes(r.sphere ?? '') ? r.sphere : (r.sphere ? '__custom' : '')}
                        onChange={e => {
                          if (e.target.value === '__custom') return
                          patchMember(r.id, { sphere: e.target.value })
                        }}
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-red-300 bg-white"
                      >
                        <option value="">— aucune —</option>
                        {SPHERE_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
                        {r.sphere && !SPHERE_NAMES.includes(r.sphere) && (
                          <option value="__custom">{r.sphere} (personnalisé)</option>
                        )}
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    {r.logo_path ? (
                      <div className="flex items-center gap-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.logo_path} alt="logo" className="h-7 w-auto max-w-[52px] object-contain border border-gray-100 rounded" />
                        <button title="Retirer" onClick={() => patchMember(r.id, { logo_path: '' })}
                                className="text-gray-400 hover:text-red-600"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => pickLogo(r.id)}
                              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600">
                        <ImageIcon size={14} /> Ajouter
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
