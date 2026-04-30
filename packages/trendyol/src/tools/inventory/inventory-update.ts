import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const inputSchema = {
  items: z
    .array(
      z.object({
        barcode: z.string().min(1),
        quantity: z.number().int().min(0).max(20_000).optional().describe('New stock quantity (omit to leave unchanged).'),
        salePrice: z.number().positive().optional().describe('Sale price in TRY (must be <= listPrice).'),
        listPrice: z.number().positive().optional().describe('List price in TRY (must be >= salePrice).'),
      }),
    )
    .min(1)
    .max(1000)
    .describe('Up to 1000 items per batch. Each item must specify barcode + at least one of quantity/salePrice/listPrice.'),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'inventory_update',
    {
      title: 'Update stock & price / Stok ve fiyat güncelle',
      description:
        'Bulk update stock quantity and/or price for one or many SKUs. Returns a batchId immediately; ' +
        'use batch_status to poll completion (typically ~3 seconds in mock mode). ' +
        'Stok ve/veya fiyatı toplu güncelle. Asenkron çalışır — batchId döner, sonucu batch_status ile sorgula. ' +
        'Trendyol kuralları: listPrice >= salePrice, quantity 0-20000.',
      inputSchema,
    },
    async (args) => {
      try {
        const invalid = args.items.find(
          (i) => i.quantity === undefined && i.salePrice === undefined && i.listPrice === undefined,
        );
        if (invalid) {
          return errorResult(
            `Item ${invalid.barcode} has no fields to update. Provide at least one of quantity, salePrice, listPrice.`,
          );
        }
        const result = await adapter.inventory.update({ items: args.items });
        return jsonResult(
          { batchId: result.batchId, itemCount: args.items.length },
          `Batch oluşturuldu (id: ${result.batchId}). ${args.items.length} ürün işleniyor. Sonucu batch_status ile kontrol et.`,
        );
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
