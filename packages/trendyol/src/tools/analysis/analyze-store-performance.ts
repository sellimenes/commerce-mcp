import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter, OrderStatus } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readMeta, readOnlyAnnotations } from '../shared/metadata.js';

const inputSchema = {
  startDate: z
    .string()
    .datetime()
    .optional()
    .describe('ISO 8601 lower bound for orders and claims.'),
  endDate: z.string().datetime().optional().describe('ISO 8601 upper bound for orders and claims.'),
  lowStockThreshold: z.number().int().min(0).max(1000).default(10),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'analyze_store_performance',
    {
      title: 'Analyze Trendyol store performance / Mağaza performans analizi',
      description:
        'Use this when the user asks for a Trendyol store performance snapshot across orders, revenue, returns, unanswered questions, and low-stock products. ' +
        'This is read-only and returns aggregate metrics plus action recommendations.',
      inputSchema,
      annotations: readOnlyAnnotations,
      _meta: readMeta(),
    },
    async (args) => {
      try {
        const [orders, claims, products, waitingQuestions] = await Promise.all([
          adapter.orders.list({
            startDate: args.startDate ? new Date(args.startDate) : undefined,
            endDate: args.endDate ? new Date(args.endDate) : undefined,
            size: 200,
          }),
          adapter.claims.list({
            startDate: args.startDate ? new Date(args.startDate) : undefined,
            endDate: args.endDate ? new Date(args.endDate) : undefined,
            size: 200,
          }),
          adapter.products.list({ approved: true, size: 200 }),
          adapter.qna.list({ status: 'WAITING_FOR_ANSWER', size: 200 }),
        ]);

        const statusCounts: Partial<Record<OrderStatus, number>> = {};
        let grossRevenue = 0;
        for (const order of orders.items) {
          statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;
          if (!['Cancelled', 'UnSupplied', 'Returned'].includes(order.status)) {
            grossRevenue += order.totalPrice;
          }
        }

        const lowStock = products.items
          .filter((product) => product.quantity <= args.lowStockThreshold)
          .sort((a, b) => a.quantity - b.quantity)
          .slice(0, 20)
          .map((product) => ({
            barcode: product.barcode,
            title: product.title,
            quantity: product.quantity,
            salePrice: product.salePrice,
          }));

        const returnRate =
          orders.totalElements > 0 ? claims.totalElements / orders.totalElements : 0;
        const recommendations = [
          lowStock.length > 0
            ? `${lowStock.length} onaylı üründe stok eşiğin altında; stok güncelleme taslağı hazırlanabilir.`
            : null,
          waitingQuestions.totalElements > 0
            ? `${waitingQuestions.totalElements} cevap bekleyen soru var; draft_question_reply ile cevap taslakları hazırlanabilir.`
            : null,
          returnRate > 0.08
            ? `İade oranı yüksek görünüyor (${(returnRate * 100).toFixed(1)}%). İade nedenleri ayrı incelenmeli.`
            : null,
        ].filter(Boolean);

        return jsonResult(
          {
            period: { startDate: args.startDate ?? null, endDate: args.endDate ?? null },
            orders: {
              total: orders.totalElements,
              grossRevenue: Math.round(grossRevenue * 100) / 100,
              currency: orders.items[0]?.currency ?? 'TRY',
              statusCounts,
            },
            claims: { total: claims.totalElements, returnRate },
            questions: { waitingForAnswer: waitingQuestions.totalElements },
            inventory: { lowStockThreshold: args.lowStockThreshold, lowStock },
            recommendations,
          },
          `Trendyol performans özeti: ${orders.totalElements} sipariş, yaklaşık ${Math.round(grossRevenue * 100) / 100} TRY gelir, ${claims.totalElements} iade/claim, ${waitingQuestions.totalElements} cevap bekleyen soru.`,
        );
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
