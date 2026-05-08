import { neon } from '@neondatabase/serverless'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlFn = (strings: TemplateStringsArray | string, ...values: any[]) => Promise<any[]>

let _sql: SqlFn | undefined

// Lazy — neon() is called on first query, not at import time.
// This prevents build failures when DATABASE_URL is absent during Next.js static analysis.
export const sql: SqlFn = (strings, ...values) => {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!) as unknown as SqlFn
  return (_sql as SqlFn)(strings as TemplateStringsArray, ...values)
}
