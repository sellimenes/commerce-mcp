import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MarketplaceAdapter } from '../adapter/base-adapter.js';

export interface CreateServerOptions {
  name: string;
  version: string;
  adapter: MarketplaceAdapter;
  registerTools: (server: McpServer, adapter: MarketplaceAdapter) => void;
}

export function createServer(opts: CreateServerOptions): McpServer {
  const server = new McpServer(
    { name: opts.name, version: opts.version },
    { capabilities: { tools: {}, logging: {} } },
  );
  opts.registerTools(server, opts.adapter);
  return server;
}
