import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'shipment_providers_list',
    {
      title: 'List shipment providers / Kargo firmaları',
      description:
        'List available cargo providers and their codes (used as providerCode in order_ship). ' +
        'Kullanılabilir kargo firmalarını ve kodlarını listele (order_ship içinde providerCode olarak kullanılır).',
      inputSchema: {},
    },
    async () => {
      try {
        const items = await adapter.shipmentProviders.list();
        return jsonResult({ items }, `${items.length} kargo firması.`);
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
