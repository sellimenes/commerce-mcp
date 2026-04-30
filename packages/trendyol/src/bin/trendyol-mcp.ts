#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { createServer, logger } from '@commerce-mcp/core';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createAdapter } from '../adapter/index.js';
import { defaultDbPath } from '../db/client.js';
import { applyMigrations } from '../db/migrate.js';
import { loadTrendyolEnv } from '../env.js';
import { registerTools } from '../tools/index.js';

async function main(): Promise<void> {
  const env = loadTrendyolEnv();

  if (env.useMock) {
    const dbPath = env.dbPath ?? defaultDbPath();
    if (!existsSync(dbPath)) {
      logger.warn(
        { dbPath },
        'Mock SQLite DB not found. Run `npm run seed:trendyol` to create it. Continuing with empty schema.',
      );
    }
    applyMigrations(dbPath);
  }

  const adapter = createAdapter(env);
  const server = createServer({
    name: 'trendyol-mcp',
    version: '0.1.0',
    adapter,
    registerTools,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info({ tools: 13, mode: env.useMock ? 'mock' : 'http' }, 'trendyol-mcp ready on stdio');
}

main().catch((err) => {
  // Stderr is safe; stdout would corrupt MCP framing.
  process.stderr.write(`[trendyol-mcp] fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  if (err instanceof Error && err.stack) {
    process.stderr.write(`${err.stack}\n`);
  }
  process.exit(1);
});
