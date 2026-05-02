import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { previewAnnotations, writeAnnotations, writeMeta } from '../shared/metadata.js';
import { createPreview, verifyPreviewOrError } from '../shared/preview.js';

const inputSchema = {
  packageId: z.number().int().positive(),
  status: z
    .enum(['Picking', 'Invoiced'])
    .describe(
      'Picking: hazırlanıyor. Invoiced: faturalandırıldı. To mark as Shipped, use preview_order_ship instead.',
    ),
};

const executeInputSchema = {
  ...inputSchema,
  previewToken: z
    .string()
    .min(1)
    .describe(
      'Token returned by preview_order_status_update for the exact same packageId and status.',
    ),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'preview_order_status_update',
    {
      title: 'Preview order status update / Sipariş durum güncelleme önizlemesi',
      description:
        'Use this when the user wants to move a Trendyol shipment package to Picking or Invoiced and needs a safe preview before updating Trendyol. ' +
        'This tool does not change the package; it returns a previewToken for execute_order_status_update after explicit confirmation.',
      inputSchema,
      annotations: previewAnnotations,
      _meta: writeMeta(),
    },
    async (args) => {
      try {
        const order = await adapter.orders.get(args.packageId);
        if (!order) return errorResult(`Shipment package ${args.packageId} not found.`);
        const preview = createPreview('execute_order_status_update', {
          packageId: args.packageId,
          status: args.status,
        });
        return jsonResult(
          {
            action: 'execute_order_status_update',
            packageId: args.packageId,
            currentStatus: order.status,
            nextStatus: args.status,
            previewToken: preview.previewToken,
            expiresAt: preview.expiresAt,
            requiresExplicitConfirmation: true,
          },
          `Paket ${args.packageId} için durum güncelleme önizlemesi hazır. Kullanıcı açıkça onaylamadan execute_order_status_update çağırma.`,
        );
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );

  server.registerTool(
    'execute_order_status_update',
    {
      title: 'Update order status / Sipariş durumunu güncelle',
      description:
        'Use this when the user has explicitly confirmed a prior preview_order_status_update result and wants to apply that exact Trendyol package status change. ' +
        'For Shipped use preview_order_ship and execute_order_ship; for cancellation use preview_order_cancel and execute_order_cancel.',
      inputSchema: executeInputSchema,
      annotations: writeAnnotations,
      _meta: writeMeta(),
    },
    async (args) => {
      try {
        const tokenError = verifyPreviewOrError(args.previewToken, 'execute_order_status_update', {
          packageId: args.packageId,
          status: args.status,
        });
        if (tokenError) return tokenError;
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
