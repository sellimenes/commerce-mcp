import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readMeta, readOnlyAnnotations } from '../shared/metadata.js';

const inputSchema = {
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
    .optional()
    .describe('Filter by claim status.'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().min(0).default(0),
  size: z.number().int().min(1).max(200).default(20),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'claims_list',
    {
      title: 'List claims / İade taleplerini listele',
      description:
        'Use this when the user wants to inspect Trendyol return or claim requests with optional status and date filters. ' +
        'İade ve değişim taleplerini listele.',
      inputSchema,
      annotations: readOnlyAnnotations,
      _meta: readMeta(),
    },
    async (args) => {
      try {
        const result = await adapter.claims.list({
          status: args.status,
          startDate: args.startDate ? new Date(args.startDate) : undefined,
          endDate: args.endDate ? new Date(args.endDate) : undefined,
          page: args.page,
          size: args.size,
        });
        return jsonResult(result, `${result.totalElements} iade talebi bulundu.`);
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
