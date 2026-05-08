import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

export const SESSION_COOKIE = 'bni-session'

export type UserRole = 'admin' | 'dc' | 'amb'

export interface SessionPayload {
  userId: number
  name: string
  email: string
  role: UserRole
  chapterIds: number[]  // empty = all chapters (admin only)
  ambassadorId?: number
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
