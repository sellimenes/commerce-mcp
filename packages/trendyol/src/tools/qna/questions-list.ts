import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readMeta, readOnlyAnnotations } from '../shared/metadata.js';

const inputSchema = {
  status: z
    .enum(['WAITING_FOR_ANSWER', 'ANSWERED', 'REJECTED'])
    .optional()
    .describe('Filter. WAITING_FOR_ANSWER = cevap bekleyen sorular.'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().min(0).default(0),
  size: z.number().int().min(1).max(200).default(20),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'questions_list',
    {
      title: 'List customer questions / Müşteri soruları',
      description:
        'Use this when the user wants to inspect Trendyol customer questions, unanswered questions, or Q&A history. Default status is none (returns all). ' +
        'Müşteri sorularını listele. Cevap bekleyenler için status=WAITING_FOR_ANSWER ver. ' +
        'Date range max 14 days (Trendyol API limit).',
      inputSchema,
      annotations: readOnlyAnnotations,
      _meta: readMeta(),
    },
    async (args) => {
      try {
        const result = await adapter.qna.list({
          status: args.status,
          startDate: args.startDate ? new Date(args.startDate) : undefined,
          endDate: args.endDate ? new Date(args.endDate) : undefined,
          page: args.page,
          size: args.size,
        });
        const summary = `${result.totalElements} soru (sayfa ${result.page + 1}/${result.totalPages}).`;
        return jsonResult(result, summary);
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
