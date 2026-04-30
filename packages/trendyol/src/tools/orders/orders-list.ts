import { ORDER_STATUSES, errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const inputSchema = {
  status: z
    .array(z.enum(ORDER_STATUSES))
    .optional()
    .describe('Filter by status. Common: Created (yeni sipariş), Picking (hazırlanıyor), Shipped (kargoda), Delivered.'),
  startDate: z
    .string()
    .datetime()
    .optional()
    .describe('ISO 8601 lower bound on createdAt. Default: no lower bound.'),
  endDate: z.string().datetime().optional().describe('ISO 8601 upper bound on createdAt.'),
  page: z.number().int().min(0).default(0),
  size: z.number().int().min(1).max(200).default(20),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'orders_list',
    {
      title: 'List orders / Sipariş listesi',
      description:
        'List shipment packages with optional status and date filters. ' +
        'Sipariş paketlerini status ve tarih filtreleriyle listele. ' +
        'Returns paginated UnifiedOrder objects with line items.',
      inputSchema,
    },
    async (args) => {
      try {
        const result = await adapter.orders.list({
          status: args.status,
          startDate: args.startDate ? new Date(args.startDate) : undefined,
          endDate: args.endDate ? new Date(args.endDate) : undefined,
          page: args.page,
          size: args.size,
        });
        const summary = `${result.totalElements} sipariş bulundu (sayfa ${result.page + 1}/${result.totalPages}, ${result.items.length} gösteriliyor).`;
        return jsonResult(result, summary);
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
