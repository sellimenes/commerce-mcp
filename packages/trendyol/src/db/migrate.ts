import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the drizzle/ folder shipped with the package. Works for both:
 *   src/db/migrate.ts  → ../../drizzle
 *   dist/db/migrate.js → ../../drizzle
 */
function resolveMigrationsDir(): string {
  const candidates = [
    join(here, '..', '..', 'drizzle'),
    join(here, '..', 'drizzle'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0]!;
}

export function applyMigrations(dbPath: string): void {
  const dir = resolveMigrationsDir();
  if (!existsSync(dir)) {
    throw new Error(
      `Drizzle migrations folder not found at ${dir}. Run \`npm run db:generate -w @commerce-mcp/trendyol\` first.`,
    );
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    throw new Error(`No .sql migrations found in ${dir}.`);
  }
  const raw = new Database(dbPath);
  raw.pragma('foreign_keys = OFF');
  raw.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);
  const applied = new Set(
    (raw.prepare('SELECT id FROM __drizzle_migrations').all() as { id: string }[]).map((r) => r.id),
  );
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(dir, file), 'utf-8');
    const tx = raw.transaction(() => {
      // Drizzle splits statements with --> statement-breakpoint
      const stmts = sql
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const stmt of stmts) raw.exec(stmt);
      raw.prepare('INSERT INTO __drizzle_migrations (id, applied_at) VALUES (?, ?)').run(file, Date.now());
    });
    tx();
  }
  raw.pragma('foreign_keys = ON');
  raw.close();
}
