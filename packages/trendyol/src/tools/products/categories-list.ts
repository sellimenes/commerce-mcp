import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const inputSchema = {
  parentId: z
    .number()
    .int()
    .optional()
    .describe('When set, returns only direct children of this category. Omit to list all categories.'),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'categories_list',
    {
      title: 'List categories / Kategori listesi',
      description:
        'Browse the marketplace category tree. ' +
        'Kategori ağacını listele. Yeni ürün eklerken doğru categoryId seçmek için kullan.',
      inputSchema,
    },
    async (args) => {
      try {
        const cats = await adapter.products.listCategories({ parentId: args.parentId });
        return jsonResult({ items: cats }, `${cats.length} kategori bulundu.`);
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
