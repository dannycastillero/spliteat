import { DatabaseSync } from 'node:sqlite'

let db: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(process.env.DATABASE_PATH || './spliteat.db')
  }
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function initDb(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL
    )
  `)
}
