import { getDb } from './schema'

export function saveBill(id: string, data: object): void {
  getDb()
    .prepare('INSERT INTO bills (id, created_at, data) VALUES (?, ?, ?)')
    .run(id, Date.now(), JSON.stringify(data))
}

export function getBill(id: string): object | null {
  const row = getDb()
    .prepare('SELECT data FROM bills WHERE id = ?')
    .get(id) as { data: string } | undefined
  return row ? JSON.parse(row.data) : null
}
