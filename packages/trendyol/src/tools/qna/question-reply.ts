import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const inputSchema = {
  questionId: z.number().int().positive(),
  text: z
    .string()
    .min(5)
    .max(500)
    .describe('Reply text in Turkish (5-500 characters). Polite, helpful, no marketing fluff.'),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'question_reply',
    {
      title: 'Reply to question / Soruyu cevapla',
      description:
        'Send a reply to a customer question. The question must be in WAITING_FOR_ANSWER status. ' +
        'Müşteri sorusuna cevap gönder. Soru cevap bekliyor olmalı (WAITING_FOR_ANSWER).',
      inputSchema,
    },
    async (args) => {
      try {
        await adapter.qna.reply({ questionId: args.questionId, text: args.text });
        return jsonResult(
          { ok: true, questionId: args.questionId },
          `Soru ${args.questionId} cevaplandı.`,
        );
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );
}
