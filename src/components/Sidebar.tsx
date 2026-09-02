'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Users, CalendarCheck, LogOut, ShieldCheck, BarChart2, UserCheck
} from 'lucide-react'
import type { SessionPayload, UserRole } from '@/lib/auth'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  codir: 'CODIR',
  dc:    'Directeur Consultatif',
  dz:    'Directeur de Zone',
  dr:    'Directeur de Région',
  amb:   'Ambassadeur',
}

const NAV_ALL = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/membres', label: 'Membres', icon: Users },
  { href: '/entretiens', label: 'Entretiens', icon: CalendarCheck },
]


export default function Sidebar() {
  const path = usePathname()
  const router = useRouter()
  const [session, setSession] = useState<SessionPayload | null>(null)

  useEffect(() => {
    if (path === '/login') return
    fetch('/api/auth/me')
      .then(r => {
        if (r.status === 401) { window.location.href = '/login'; return null }
        return r.ok ? r.json() : null
      })
      .then(d => { if (d) setSession(d) })
      .catch(console.error)
  }, [path])

  if (path === '/login') return null

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const role = session?.role

  function isActive(href: string) {
    if (href === '/') return path === '/'
    return path.startsWith(href)
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full" style={{ backgroundColor: '#2C3E50' }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: '#C0392B' }}>
            BNI
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">BNI Morocco</p>
            <p className="text-gray-400 text-xs">Suivi Membres</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Navigation</p>
        {NAV_ALL.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              style={active ? { backgroundColor: '#C0392B' } : {}}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}

        {role === 'amb' && session?.ambassadorId && (
          <div className="pt-4">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Mon espace</p>
            <Link
              href={`/ambassadeurs/${session.ambassadorId}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                path.startsWith('/ambassadeurs') ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              style={path.startsWith('/ambassadeurs') ? { backgroundColor: '#C0392B' } : {}}
            >
              <UserCheck size={18} />
              Mon activité
            </Link>
          </div>
        )}

        {(role === 'codir' || role === 'dc' || role === 'dz' || role === 'dr') && (
          <div className="pt-4">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Suivi</p>
            <Link
              href="/ambassadeurs"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                path.startsWith('/ambassadeurs') ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              style={path.startsWith('/ambassadeurs') ? { backgroundColor: '#C0392B' } : {}}
            >
              <UserCheck size={18} />
              Ambassadeurs
            </Link>
          </div>
        )}

        {role === 'admin' && (
          <div className="pt-4">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Administration</p>
            {[
              { href: '/admin/users', label: 'Utilisateurs', icon: ShieldCheck },
              { href: '/admin/idp',   label: 'IDP',          icon: BarChart2  },
            ].map(({ href, label, icon: Icon }) => {
              const active = path.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  style={active ? { backgroundColor: '#C0392B' } : {}}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-white/10 space-y-2">
        <div className="bg-white/5 rounded-lg px-3 py-2.5">
          <p className="text-xs text-gray-500">Connecté en tant que</p>
          <p className="text-sm font-semibold text-white mt-0.5 truncate">{session?.name ?? '...'}</p>
          <p className="text-xs text-gray-400 mt-0.5">{role ? ROLE_LABELS[role] : ''}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <LogOut size={14} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
