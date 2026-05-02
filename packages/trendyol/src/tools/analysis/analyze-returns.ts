import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readMeta, readOnlyAnnotations } from '../shared/metadata.js';

const inputSchema = {
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z
    .enum([
      'Created',
      'WaitingInAction',
      'Accepted',
      'Rejected',
      'Cancelled',
      'InAnalysis',
      'Unresolved',
    ])
    .optional(),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'analyze_returns',
    {
      title: 'Analyze Trendyol returns / İade analizi',
      description:
        'Use this when the user asks why returns or claims are happening on Trendyol and wants grouped reasons, affected products, and follow-up recommendations.',
      inputSchema,
      annotations: readOnlyAnnotations,
      _meta: readMeta(),
    },
    async (args) => {
      try {
        const claims = await adapter.claims.list({
          status: args.status,
          startDate: args.startDate ? new Date(args.startDate) : undefined,
          endDate: args.endDate ? new Date(args.endDate) : undefined,
          size: 200,
        });
        const reasons = new Map<string, number>();
        const products = new Map<
          string,
          { productMainId: string; productName?: string; count: number }
        >();
        for (const claim of claims.items) {
          reasons.set(claim.reason, (reasons.get(claim.reason) ?? 0) + 1);
          const current = products.get(claim.productMainId) ?? {
            productMainId: claim.productMainId,
            productName: claim.productName,
            count: 0,
          };
          current.count += 1;
          products.set(claim.productMainId, current);
        }
        return jsonResult(
          {
            totalClaims: claims.totalElements,
            reasons: [...reasons.entries()]
              .map(([reason, count]) => ({ reason, count }))
              .sort((a, b) => b.count - a.count),
            affectedProducts: [...products.values()].sort((a, b) => b.count - a.count).slice(0, 20),
          },
          `${claims.totalElements} iade/claim analiz edildi.`,
        );
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
