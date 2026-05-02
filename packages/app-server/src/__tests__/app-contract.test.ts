import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '@commerce-mcp/core';
import { TrendyolMockAdapter, openDb, registerTools, seed } from '@commerce-mcp/trendyol';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';
import { protectedResourceMetadata, wwwAuthenticateHeader } from '../auth/oauth-resource.js';
import type { AppServerEnv } from '../env.js';

const env: AppServerEnv = {
  host: '127.0.0.1',
  port: 0,
  publicOrigin: 'https://commerce.example.com',
  allowedHosts: [],
  authRequired: true,
  devBearerToken: 'dev-token',
  authIssuer: 'https://auth.example.com',
  scopes: ['trendyol.read', 'trendyol.write'],
  resourceDocsUrl: 'https://commerce.example.com/docs',
};

let client: Client | undefined;
let server: { close: () => Promise<void> } | undefined;

afterEach(async () => {
  await client?.close();
  await server?.close();
  client = undefined;
  server = undefined;
});

describe('Commerce MCP app contract', () => {
  it('publishes OAuth protected-resource metadata and challenge values', () => {
    expect(protectedResourceMetadata(env)).toMatchObject({
      resource: 'https://commerce.example.com',
      authorization_servers: ['https://auth.example.com'],
      scopes_supported: ['trendyol.read', 'trendyol.write'],
      resource_documentation: 'https://commerce.example.com/docs',
    });
    expect(wwwAuthenticateHeader(env)).toContain(
      'https://commerce.example.com/.well-known/oauth-protected-resource',
    );
  });

  it('exposes Trendyol tools with preview/execute split', async () => {
    ({ client, server } = await createMcpClient());

    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name);
    expect(names).toContain('preview_inventory_update');
    expect(names).toContain('execute_inventory_update');
    expect(names).toContain('analyze_store_performance');
    expect(names).not.toContain('inventory_update');

    const previewTool = listed.tools.find((tool) => tool.name === 'preview_inventory_update');
    const executeTool = listed.tools.find((tool) => tool.name === 'execute_inventory_update');
    expect(previewTool?.annotations?.readOnlyHint).toBe(true);
    expect(executeTool?.annotations?.readOnlyHint).toBe(false);
    expect(executeTool?._meta?.securitySchemes).toEqual([
      { type: 'oauth2', scopes: ['trendyol.read', 'trendyol.write'] },
    ]);
  });

  it('requires a matching preview token before executing inventory updates', async () => {
    ({ client, server } = await createMcpClient());

    const denied = await client.callTool({
      name: 'execute_inventory_update',
      arguments: {
        items: [{ barcode: '8690000000001', quantity: 42 }],
        previewToken: 'bad-token',
      },
    });
    expect(denied.isError).toBe(true);

    const preview = await client.callTool({
      name: 'preview_inventory_update',
      arguments: { items: [{ barcode: '8690000000001', quantity: 42 }] },
    });
    const previewToken = (preview.structuredContent as Record<string, unknown> | undefined)
      ?.previewToken;
    expect(typeof previewToken).toBe('string');
  });
});

async function createMcpClient() {
  const dbPath = join(mkdtempSync(join(tmpdir(), 'commerce-mcp-test-')), 'trendyol.db');
  seed({ fresh: true, path: dbPath });
  const { db, raw } = openDb({ path: dbPath });
  const adapter = new TrendyolMockAdapter(db);
  const mcpServer = createServer({
    name: 'commerce-mcp-trendyol',
    version: '0.1.0',
    adapter,
    registerTools,
  });
  const mcpClient = new Client({ name: 'vitest', version: '0.1.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([mcpServer.connect(serverTransport), mcpClient.connect(clientTransport)]);
  return {
    client: mcpClient,
    server: {
      close: async () => {
        raw.close();
        await mcpServer.close();
      },
    },
  };
}
