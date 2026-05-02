import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readMeta, readOnlyAnnotations } from '../shared/metadata.js';

const inputSchema = {
  lowStockThreshold: z.number().int().min(0).max(1000).default(10),
  pageSize: z.number().int().min(1).max(200).default(100),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'analyze_product_health',
    {
      title: 'Analyze product health / Ürün sağlık analizi',
      description:
        'Use this when the user asks which Trendyol products need attention due to low stock, approval problems, missing margins, or pricing anomalies.',
      inputSchema,
      annotations: readOnlyAnnotations,
      _meta: readMeta(),
    },
    async (args) => {
      try {
        const [approved, pending] = await Promise.all([
          adapter.products.list({ approved: true, size: args.pageSize }),
          adapter.products.list({ approved: false, size: args.pageSize }),
        ]);
        const lowStock = approved.items
          .filter((product) => product.quantity <= args.lowStockThreshold)
          .sort((a, b) => a.quantity - b.quantity);
        const pricingIssues = [...approved.items, ...pending.items].filter(
          (product) => product.listPrice < product.salePrice,
        );
        return jsonResult(
          {
            approvedProducts: approved.totalElements,
            pendingProducts: pending.totalElements,
            lowStockThreshold: args.lowStockThreshold,
            lowStock: lowStock.slice(0, 30).map((product) => ({
              barcode: product.barcode,
              title: product.title,
              quantity: product.quantity,
              salePrice: product.salePrice,
            })),
            pricingIssues: pricingIssues.map((product) => ({
              barcode: product.barcode,
              title: product.title,
              listPrice: product.listPrice,
              salePrice: product.salePrice,
            })),
          },
          `${lowStock.length} düşük stoklu ürün, ${pending.totalElements} onay bekleyen ürün, ${pricingIssues.length} fiyat kuralı sorunu bulundu.`,
        );
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
