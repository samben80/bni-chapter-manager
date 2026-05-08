'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const ERROR_MESSAGES: Record<string, string> = {
  invalid: 'Email ou mot de passe incorrect',
  missing_fields: 'Email et mot de passe requis',
  server: 'Erreur serveur, veuillez réessayer',
}

function LoginForm() {
  const searchParams = useSearchParams()
  const errorKey = searchParams.get('error')
  const error = errorKey ? (ERROR_MESSAGES[errorKey] ?? 'Erreur inconnue') : null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm"
            style={{ backgroundColor: '#C0392B' }}
          >
            BNI
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Chapter Manager</p>
            <p className="text-xs text-gray-400">BNI Maroc</p>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Connexion</h1>
        <p className="text-sm text-gray-500 mb-6">Accédez à votre espace</p>

        <form method="POST" action="/api/auth/login-form" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              placeholder="votre@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity cursor-pointer"
            style={{ backgroundColor: '#C0392B' }}
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
