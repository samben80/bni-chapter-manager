import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'

export const SESSION_COOKIE = 'bni-session'

export type UserRole = 'admin' | 'codir' | 'amb' | 'dc' | 'dz' | 'dr'

export interface SessionPayload {
  userId: number
  name: string
  email: string
  role: UserRole
  chapterIds: number[]  // empty = all chapters (admin only)
  ambassadorId?: number
  ambassadorRole?: string  // kept for JWT backwards compat
  ambRole?: string         // 'onboarding' | 'coach_business' (from users.amb_role)
}

function secret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET ?? 'bni-fallback-secret-please-set-AUTH_SECRET!!'
  )
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret())
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export function unauthorized() {
  return Response.json({ error: 'Non autorisé' }, { status: 401 })
}

export function forbidden() {
  return Response.json({ error: 'Accès refusé' }, { status: 403 })
}

/**
 * Resolve the ambassador's sub-role for a session.
 * Reads ambRole (new tokens) → ambassadorRole (old JWT compat) → DB fallback.
 */
export async function resolveAmbassadorRole(session: SessionPayload): Promise<string | undefined> {
  if (session.role !== 'amb') return undefined
  if (session.ambRole) return session.ambRole
  if (session.ambassadorRole) return session.ambassadorRole
  if (!session.ambassadorId) return undefined
  const [r] = await sql`SELECT role FROM ambassadors WHERE id = ${session.ambassadorId}`
  return (r?.role as string) ?? undefined
}

/** Types visible to an onboarding ambassador */
export const ONBOARDING_INTERVIEW_TYPES = ['preboarding', '3months'] as const
