import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readMeta, readOnlyAnnotations } from '../shared/metadata.js';

const inputSchema = {
  batchId: z.string().min(1).describe('Batch id returned by execute_inventory_update.'),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'batch_status',
    {
      title: 'Batch status / Toplu işlem durumu',
      description:
        'Use this when the user wants to check the result of an asynchronous Trendyol batch operation. ' +
        'Asenkron toplu işlemin durumunu sorgula. ' +
        'Returns status (created/processing/completed/failed) and per-item results when completed.',
      inputSchema,
      annotations: readOnlyAnnotations,
      _meta: readMeta(),
    },
    async (args) => {
      try {
        const result = await adapter.inventory.batchStatus({ batchId: args.batchId });
        if (!result) {
          return errorResult(`Batch ${args.batchId} bulunamadı.`);
        }
        const summary =
          result.status === 'completed'
            ? `Batch tamamlandı (${result.itemCount} ürün; başarılı: ${result.results?.filter((r) => r.success).length ?? 0}, başarısız: ${result.results?.filter((r) => !r.success).length ?? 0}).`
            : `Batch durumu: ${result.status} (${result.itemCount} ürün).`;
        return jsonResult(result, summary);
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
