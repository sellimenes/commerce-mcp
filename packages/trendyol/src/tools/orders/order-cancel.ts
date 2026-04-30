import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const inputSchema = {
  packageId: z.number().int().positive(),
  items: z
    .array(
      z.object({
        orderLineItemId: z.number().int().positive(),
        quantity: z.number().int().positive(),
        reasonCode: z.enum(['STOCK', 'OTHER']).default('STOCK'),
      }),
    )
    .min(1)
    .describe('Items to cancel. If all items in the package are cancelled, the package moves to UnSupplied.'),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'order_cancel',
    {
      title: 'Cancel items / Ürünleri iptal et',
      description:
        'Mark one or more line items in a shipment package as unsupplied (cancelled). ' +
        'Pakette bulunan bir veya birkaç ürünü "temin edilemiyor" olarak iptal et. ' +
        'If all items get cancelled, the package status becomes UnSupplied.',
      inputSchema,
    },
    async (args) => {
      try {
        await adapter.orders.cancelItems({
          packageId: args.packageId,
          items: args.items,
        });
        return jsonResult(
          { ok: true, packageId: args.packageId, cancelledCount: args.items.length },
          `${args.items.length} ürün iptal edildi (paket ${args.packageId}).`,
        );
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
