'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CalendarCheck, UserCheck, Settings, HandshakeIcon
} from 'lucide-react'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/membres', label: 'Membres', icon: Users },
  { href: '/entretiens', label: 'Entretiens', icon: CalendarCheck },
  { href: '/ambassadeurs', label: 'Ambassadeurs', icon: UserCheck },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full" style={{ backgroundColor: '#2C3E50' }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: '#C0392B' }}>
            BNI
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Chapter Manager</p>
            <p className="text-gray-400 text-xs">BNI Maroc</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Navigation</p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== '/' && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              style={active ? { backgroundColor: '#C0392B' } : {}}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Role badge */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="bg-white/5 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-400">Rôle actif</p>
          <p className="text-sm font-medium text-white mt-0.5">Ambassadeur</p>
          <p className="text-xs text-gray-500 mt-0.5">On Boarding + Coach Business</p>
        </div>
      </div>
    </aside>
  )
}
