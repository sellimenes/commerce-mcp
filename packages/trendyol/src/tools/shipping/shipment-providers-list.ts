import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readMeta, readOnlyAnnotations } from '../shared/metadata.js';

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'shipment_providers_list',
    {
      title: 'List shipment providers / Kargo firmaları',
      description:
        'Use this when the user needs available Trendyol cargo providers and provider codes for a shipping preview. ' +
        'Kullanılabilir kargo firmalarını ve kodlarını listele (preview_order_ship içinde providerCode olarak kullanılır).',
      inputSchema: {},
      annotations: readOnlyAnnotations,
      _meta: readMeta(),
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
