import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { previewAnnotations, writeAnnotations, writeMeta } from '../shared/metadata.js';
import { createPreview, verifyPreviewOrError } from '../shared/preview.js';

const inputSchema = {
  items: z
    .array(
      z.object({
        barcode: z.string().min(1),
        quantity: z
          .number()
          .int()
          .min(0)
          .max(20_000)
          .optional()
          .describe('New stock quantity (omit to leave unchanged).'),
        salePrice: z
          .number()
          .positive()
          .optional()
          .describe('Sale price in TRY (must be <= listPrice).'),
        listPrice: z
          .number()
          .positive()
          .optional()
          .describe('List price in TRY (must be >= salePrice).'),
      }),
    )
    .min(1)
    .max(1000)
    .describe(
      'Up to 1000 items per batch. Each item must specify barcode + at least one of quantity/salePrice/listPrice.',
    ),
};

const executeInputSchema = {
  ...inputSchema,
  previewToken: z
    .string()
    .min(1)
    .describe(
      'Token returned by preview_inventory_update for the exact same items after explicit user confirmation.',
    ),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'preview_inventory_update',
    {
      title: 'Preview stock & price update / Stok ve fiyat güncelleme önizlemesi',
      description:
        'Use this when the user wants to change Trendyol stock or prices and needs a safe preview before anything is updated. ' +
        'This tool does not modify inventory; it returns a previewToken that must be passed to execute_inventory_update after explicit confirmation. ' +
        'Trendyol kuralları: listPrice >= salePrice, quantity 0-20000.',
      inputSchema,
      annotations: previewAnnotations,
      _meta: writeMeta(),
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
        const preview = createPreview('execute_inventory_update', { items: args.items });
        return jsonResult(
          {
            action: 'execute_inventory_update',
            itemCount: args.items.length,
            items: args.items,
            previewToken: preview.previewToken,
            expiresAt: preview.expiresAt,
            requiresExplicitConfirmation: true,
          },
          `${args.items.length} ürün için stok/fiyat güncelleme önizlemesi hazır. Kullanıcı açıkça onaylamadan execute_inventory_update çağırma.`,
        );
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );

  server.registerTool(
    'execute_inventory_update',
    {
      title: 'Execute stock & price update / Stok ve fiyat güncelle',
      description:
        'Use this when the user has explicitly confirmed a prior preview_inventory_update result and wants to apply those exact Trendyol stock or price changes. ' +
        'Returns a batchId; use batch_status to poll completion.',
      inputSchema: executeInputSchema,
      annotations: writeAnnotations,
      _meta: writeMeta(),
    },
    async (args) => {
      try {
        const tokenError = verifyPreviewOrError(args.previewToken, 'execute_inventory_update', {
          items: args.items,
        });
        if (tokenError) return tokenError;
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
