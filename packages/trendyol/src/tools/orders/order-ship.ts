import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const inputSchema = {
  packageId: z.number().int().positive().describe('Trendyol shipment package id (not order id).'),
  trackingNumber: z
    .string()
    .min(4)
    .describe('Cargo tracking number assigned by the provider.'),
  providerCode: z
    .string()
    .optional()
    .describe('Optional shipment provider code (e.g. YK, ARAS, MNG, TEX). Use shipment_providers_list to discover codes.'),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'order_ship',
    {
      title: 'Ship order / Siparişi kargoya ver',
      description:
        'Mark a shipment package as Shipped and attach the cargo tracking number. ' +
        'Paketi kargoya verildi olarak işaretle ve kargo takip numarasını ekle. ' +
        'Allowed source statuses: Created, Picking, Invoiced.',
      inputSchema,
    },
    async (args) => {
      try {
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
