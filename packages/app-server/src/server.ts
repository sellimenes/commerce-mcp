import { existsSync } from 'node:fs';
import type { Server } from 'node:http';
import { createServer } from '@commerce-mcp/core';
import {
  applyMigrations,
  createAdapter,
  defaultDbPath,
  loadTrendyolEnv,
  registerTools,
} from '@commerce-mcp/trendyol';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Express } from 'express';
import { registerAuthRoutes, requireBearerAuth } from './auth/oauth-resource.js';
import { type AppServerEnv, loadAppServerEnv } from './env.js';

export interface CommerceMcpApp {
  app: Express;
  env: AppServerEnv;
  listen: () => Server;
}

export function createCommerceMcpApp(env: AppServerEnv = loadAppServerEnv()): CommerceMcpApp {
  const app = createMcpExpressApp({
    host: env.host,
    allowedHosts: env.allowedHosts.length > 0 ? env.allowedHosts : undefined,
  });

  registerAuthRoutes(app, env);

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, name: 'commerce-mcp-app', version: '0.1.0' });
  });

  app.get('/privacy', (_req, res) => {
    res
      .type('text/plain')
      .send(
        'Commerce MCP connects ChatGPT to seller-authorized Trendyol data. Configure a public privacy policy URL before submission.',
      );
  });

  app.post('/mcp', async (req, res) => {
    if (!requireBearerAuth(env, req, res)) return;

    const server = createTrendyolServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal server error',
          },
          id: null,
        });
      }
    } finally {
      await transport.close();
      await server.close();
    }
  });

  app.get('/mcp', (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed. Use POST /mcp.' },
      id: null,
    });
  });

  app.delete('/mcp', (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed. Use POST /mcp.' },
      id: null,
    });
  });

  return {
    app,
    env,
    listen: () => app.listen(env.port, env.host),
  };
}

function createTrendyolServer() {
  const env = loadTrendyolEnv();

  if (env.useMock) {
    const dbPath = env.dbPath ?? defaultDbPath();
    if (!existsSync(dbPath)) applyMigrations(dbPath);
  }

  const adapter = createAdapter(env);
  return createServer({
    name: 'commerce-mcp-trendyol',
    version: '0.1.0',
    adapter,
    registerTools,
  });
}
