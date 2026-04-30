import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const inputSchema = {
  packageId: z.number().int().positive(),
  status: z
    .enum(['Picking', 'Invoiced'])
    .describe('Picking: hazırlanıyor. Invoiced: faturalandırıldı. To mark as Shipped, use order_ship instead.'),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'order_status_update',
    {
      title: 'Update order status / Sipariş durumunu güncelle',
      description:
        'Move a shipment package to Picking or Invoiced. ' +
        'Paketi Picking (hazırlanıyor) veya Invoiced (faturalandırıldı) durumuna taşı. ' +
        'For Shipped use order_ship; for cancellation use order_cancel.',
      inputSchema,
    },
    async (args) => {
      try {
        await adapter.orders.updateStatus({
          packageId: args.packageId,
          status: args.status,
        });
        return jsonResult(
          { ok: true, packageId: args.packageId, status: args.status },
          `Paket ${args.packageId} durumu "${args.status}" olarak güncellendi.`,
        );
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
