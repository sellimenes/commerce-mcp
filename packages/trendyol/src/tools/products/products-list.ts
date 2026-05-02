import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readMeta, readOnlyAnnotations } from '../shared/metadata.js';

const inputSchema = {
  approved: z
    .boolean()
    .optional()
    .describe('Filter by approval state. true = onaylı (yayında), false = onay bekliyor.'),
  barcode: z.string().optional().describe('Filter by exact barcode.'),
  stockCode: z.string().optional().describe('Filter by stock code (SKU).'),
  page: z.number().int().min(0).default(0),
  size: z.number().int().min(1).max(200).default(20),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'products_list',
    {
      title: 'List products / Ürün listesi',
      description:
        'Use this when the user wants to inspect Trendyol products, stock, prices, approval state, barcodes, or SKUs with optional filters. ' +
        'Ürünleri filtreleyerek listele (onay durumu, barkod, stok kodu).',
      inputSchema,
      annotations: readOnlyAnnotations,
      _meta: readMeta(),
    },
    async (args) => {
      try {
        const result = await adapter.products.list({
          approved: args.approved,
          barcode: args.barcode,
          stockCode: args.stockCode,
          page: args.page,
          size: args.size,
        });
        const summary = `${result.totalElements} ürün bulundu (sayfa ${result.page + 1}/${result.totalPages}).`;
        return jsonResult(result, summary);
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
