import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readMeta, readOnlyAnnotations } from '../shared/metadata.js';

const inputSchema = {
  barcode: z.string().optional().describe('Barcode (use this OR productMainId, not both).'),
  productMainId: z
    .string()
    .optional()
    .describe('Trendyol productMainId (use this OR barcode, not both).'),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'product_get',
    {
      title: 'Get product detail / Ürün detayı',
      description:
        'Use this when the user wants full Trendyol product detail by barcode or productMainId. ' +
        'Barkod veya productMainId ile ürün detayını getir.',
      inputSchema,
      annotations: readOnlyAnnotations,
      _meta: readMeta(),
    },
    async (args) => {
      try {
        const product = await adapter.products.get({
          barcode: args.barcode,
          productMainId: args.productMainId,
        });
        if (!product) {
          return errorResult(
            `Ürün bulunamadı (${args.barcode ? `barcode=${args.barcode}` : `productMainId=${args.productMainId}`}).`,
          );
        }
        return jsonResult(
          product,
          `Ürün: ${product.title} (stok: ${product.quantity}, fiyat: ${product.salePrice} ${'TRY'}).`,
        );
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
