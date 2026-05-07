'use client'

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#C0392B' }}>{title}</h3>
        <div className="flex-1 h-px bg-red-100" />
      </div>
      <div className="space-y-3 pl-1">
        {children}
      </div>
    </div>
  )
}

export function Field({ label, value, onChange, type = 'text', placeholder, suffix }: {
  label: string; value: string | number | undefined; onChange: (v: string) => void
  type?: string; placeholder?: string; suffix?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-600 w-64 flex-shrink-0">{label}</label>
      <div className="flex items-center gap-2 flex-1">
        <input
          type={type}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
        />
        {suffix && <span className="text-sm text-gray-400 flex-shrink-0">{suffix}</span>}
      </div>
    </div>
  )
}

export function NumberField({ label, value, onChange, suffix }: {
  label: string; value: number | undefined; onChange: (v: number) => void; suffix?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-600 w-64 flex-shrink-0">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value ?? ''}
          onChange={e => onChange(Number(e.target.value))}
          className="w-32 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
          min={0}
        />
        {suffix && <span className="text-sm text-gray-400">{suffix}</span>}
      </div>
    </div>
  )
}

export function CheckField({ label, checked, onChange, hint }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 rounded accent-red-600"
        />
      </div>
      <div>
        <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
    </label>
  )
}

export function TextArea({ label, value, onChange, placeholder, rows = 3 }: {
  label?: string; value: string | undefined; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <div>
      {label && <label className="block text-sm text-gray-600 mb-1.5">{label}</label>}
      <textarea
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100 resize-none"
      />
    </div>
  )
}

export function RatingField({ label, value, onChange, max = 10 }: {
  label: string; value: number | undefined; onChange: (v: number) => void; max?: number
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-600 w-64 flex-shrink-0">{label}</label>
      <div className="flex items-center gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
              value === n
                ? 'text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            style={value === n ? { backgroundColor: '#C0392B' } : {}}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export function MetricGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
      {children}
    </div>
  )
}

export function GridCol({ title, children, color }: { title: string; children: React.ReactNode; color: 'red' | 'dark' }) {
  const bg = color === 'red' ? '#C0392B' : '#2C3E50'
  return (
    <div>
      <div className="text-xs font-bold text-white uppercase tracking-wide px-3 py-2 rounded-t-lg mb-2" style={{ backgroundColor: bg }}>
        {title}
      </div>
      <div className="space-y-2 px-1">
        {children}
      </div>
    </div>
  )
}

export function SubstituantFields({ prefix, data, onChange }: {
  prefix: string; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void
}) {
  const set = (k: string, v: string) => onChange({ ...data, [k]: v })
  return (
    <div className="grid grid-cols-3 gap-3">
      <input type="text" placeholder="Prénom Nom" value={(data[`${prefix}_name`] as string) ?? ''} onChange={e => set(`${prefix}_name`, e.target.value)}
        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100" />
      <input type="text" placeholder="Entreprise" value={(data[`${prefix}_company`] as string) ?? ''} onChange={e => set(`${prefix}_company`, e.target.value)}
        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100" />
      <input type="text" placeholder="Téléphone" value={(data[`${prefix}_phone`] as string) ?? ''} onChange={e => set(`${prefix}_phone`, e.target.value)}
        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100" />
    </div>
  )
}
