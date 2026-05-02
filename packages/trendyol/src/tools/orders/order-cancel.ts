import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { destructiveWriteAnnotations, previewAnnotations, writeMeta } from '../shared/metadata.js';
import { createPreview, verifyPreviewOrError } from '../shared/preview.js';

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
    .describe(
      'Items to cancel. If all items in the package are cancelled, the package moves to UnSupplied.',
    ),
};

const executeInputSchema = {
  ...inputSchema,
  previewToken: z
    .string()
    .min(1)
    .describe(
      'Token returned by preview_order_cancel for the exact same packageId and items after explicit user confirmation.',
    ),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'preview_order_cancel',
    {
      title: 'Preview item cancellation / Ürün iptal önizlemesi',
      description:
        'Use this when the user wants to cancel one or more Trendyol shipment package line items and needs a safe preview before cancellation. ' +
        'This tool does not cancel anything; it returns a previewToken that must be passed to execute_order_cancel after explicit confirmation.',
      inputSchema,
      annotations: previewAnnotations,
      _meta: writeMeta(),
    },
    async (args) => {
      try {
        const order = await adapter.orders.get(args.packageId);
        if (!order) return errorResult(`Shipment package ${args.packageId} not found.`);
        const targetIds = new Set(args.items.map((item) => item.orderLineItemId));
        const affectedItems = order.items.filter((item) => targetIds.has(item.orderLineItemId));
        const preview = createPreview('execute_order_cancel', {
          packageId: args.packageId,
          items: args.items,
        });
        return jsonResult(
          {
            action: 'execute_order_cancel',
            packageId: args.packageId,
            currentStatus: order.status,
            affectedItems,
            requestedItems: args.items,
            willMarkPackageUnsupplied: affectedItems.length === order.items.length,
            previewToken: preview.previewToken,
            expiresAt: preview.expiresAt,
            requiresExplicitConfirmation: true,
          },
          `Paket ${args.packageId} için ${affectedItems.length} ürün iptal önizlemesi hazır. Kullanıcı açıkça onaylamadan execute_order_cancel çağırma.`,
        );
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );

  server.registerTool(
    'execute_order_cancel',
    {
      title: 'Cancel items / Ürünleri iptal et',
      description:
        'Use this when the user has explicitly confirmed a prior preview_order_cancel result and wants to cancel those exact Trendyol line items. ' +
        'If all items get cancelled, the package status becomes UnSupplied.',
      inputSchema: executeInputSchema,
      annotations: destructiveWriteAnnotations,
      _meta: writeMeta(),
    },
    async (args) => {
      try {
        const tokenError = verifyPreviewOrError(args.previewToken, 'execute_order_cancel', {
          packageId: args.packageId,
          items: args.items,
        });
        if (tokenError) return tokenError;
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
