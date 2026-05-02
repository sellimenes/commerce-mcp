import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { previewAnnotations, writeAnnotations, writeMeta } from '../shared/metadata.js';
import { createPreview, verifyPreviewOrError } from '../shared/preview.js';

const inputSchema = {
  packageId: z.number().int().positive().describe('Trendyol shipment package id (not order id).'),
  trackingNumber: z.string().min(4).describe('Cargo tracking number assigned by the provider.'),
  providerCode: z
    .string()
    .optional()
    .describe(
      'Optional shipment provider code (e.g. YK, ARAS, MNG, TEX). Use shipment_providers_list to discover codes.',
    ),
};

const executeInputSchema = {
  ...inputSchema,
  previewToken: z
    .string()
    .min(1)
    .describe(
      'Token returned by preview_order_ship for the exact same packageId, trackingNumber, and providerCode.',
    ),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'preview_order_ship',
    {
      title: 'Preview shipment update / Kargo güncelleme önizlemesi',
      description:
        'Use this when the user wants to mark a Trendyol shipment package as shipped and needs a safe preview before updating Trendyol. ' +
        'This tool does not change the package; it returns a previewToken for execute_order_ship after explicit confirmation.',
      inputSchema,
      annotations: previewAnnotations,
      _meta: writeMeta(),
    },
    async (args) => {
      try {
        const order = await adapter.orders.get(args.packageId);
        if (!order) return errorResult(`Shipment package ${args.packageId} not found.`);
        const preview = createPreview('execute_order_ship', {
          packageId: args.packageId,
          trackingNumber: args.trackingNumber,
          providerCode: args.providerCode,
        });
        return jsonResult(
          {
            action: 'execute_order_ship',
            packageId: args.packageId,
            currentStatus: order.status,
            trackingNumber: args.trackingNumber,
            providerCode: args.providerCode,
            previewToken: preview.previewToken,
            expiresAt: preview.expiresAt,
            requiresExplicitConfirmation: true,
          },
          `Paket ${args.packageId} için kargo güncelleme önizlemesi hazır. Kullanıcı açıkça onaylamadan execute_order_ship çağırma.`,
        );
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );

  server.registerTool(
    'execute_order_ship',
    {
      title: 'Ship order / Siparişi kargoya ver',
      description:
        'Use this when the user has explicitly confirmed a prior preview_order_ship result and wants to mark that exact Trendyol package as shipped. ' +
        'Allowed source statuses: Created, Picking, Invoiced.',
      inputSchema: executeInputSchema,
      annotations: writeAnnotations,
      _meta: writeMeta(),
    },
    async (args) => {
      try {
        const tokenError = verifyPreviewOrError(args.previewToken, 'execute_order_ship', {
          packageId: args.packageId,
          trackingNumber: args.trackingNumber,
          providerCode: args.providerCode,
        });
        if (tokenError) return tokenError;
        await adapter.orders.ship({
          packageId: args.packageId,
          trackingNumber: args.trackingNumber,
          providerCode: args.providerCode,
        });
        return jsonResult(
          { ok: true, packageId: args.packageId, trackingNumber: args.trackingNumber },
          `Paket ${args.packageId} kargoya verildi (takip no: ${args.trackingNumber}).`,
        );
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
