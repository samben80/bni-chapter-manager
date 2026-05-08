import { neon } from '@neondatabase/serverless'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlFn = (strings: TemplateStringsArray | string, ...values: any[]) => Promise<any[]>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlWithQuery = SqlFn & { query: (q: string, vals?: unknown[]) => Promise<{ rows: any[] }> }

let _sql: ReturnType<typeof neon> | undefined

// Lazy — neon() is called on first query, not at import time.
// This prevents build failures when DATABASE_URL is absent during Next.js static analysis.
const getInstance = () => {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!)
  return _sql
}

const fn: SqlFn = (strings, ...values) =>
  getInstance()(strings as TemplateStringsArray, ...values) as Promise<unknown[]>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(fn as SqlWithQuery).query = (q: string, vals?: unknown[]) =>
  (getInstance() as any).query(q, vals)

export const sql = fn as SqlWithQuery
