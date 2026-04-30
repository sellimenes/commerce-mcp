import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

export interface OpenDbOptions {
  /** Override the SQLite file path. Defaults to ~/.commerce-mcp/trendyol.db. */
  path?: string;
  /** Open in :memory: mode. */
  inMemory?: boolean;
}

export function defaultDbPath(): string {
  return process.env.TRENDYOL_DB_PATH || join(homedir(), '.commerce-mcp', 'trendyol.db');
}

export function openDb(opts: OpenDbOptions = {}): { db: DrizzleDb; raw: Database.Database } {
  const path = opts.inMemory ? ':memory:' : (opts.path ?? defaultDbPath());
  if (!opts.inMemory) {
    mkdirSync(dirname(path), { recursive: true });
  }
  const raw = new Database(path);
  raw.pragma('journal_mode = WAL');
  raw.pragma('foreign_keys = ON');
  const db = drizzle(raw, { schema });
  return { db, raw };
}

export { schema };
