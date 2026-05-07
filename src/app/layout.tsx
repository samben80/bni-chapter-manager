import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'BNI Chapter Manager',
  description: 'Gestion du chapitre BNI — Ambassadeurs, membres, entretiens',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="h-full flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  )
}
