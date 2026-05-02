import { errorResult, jsonResult, toLLMErrorMessage } from '@commerce-mcp/core';
import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { previewAnnotations, writeAnnotations, writeMeta } from '../shared/metadata.js';
import { createPreview, verifyPreviewOrError } from '../shared/preview.js';

const inputSchema = {
  questionId: z.number().int().positive(),
  text: z
    .string()
    .min(5)
    .max(500)
    .describe('Reply text in Turkish (5-500 characters). Polite, helpful, no marketing fluff.'),
};

const executeInputSchema = {
  ...inputSchema,
  previewToken: z
    .string()
    .min(1)
    .describe('Token returned by draft_question_reply for the exact same questionId and text.'),
};

export function register(server: McpServer, adapter: MarketplaceAdapter): void {
  server.registerTool(
    'draft_question_reply',
    {
      title: 'Draft question reply / Soru cevabı taslağı',
      description:
        'Use this when the user wants to prepare a Trendyol customer question reply and review it before sending. ' +
        'This tool does not send the reply; it returns a previewToken for send_question_reply after explicit confirmation.',
      inputSchema,
      annotations: previewAnnotations,
      _meta: writeMeta(),
    },
    async (args) => {
      try {
        const preview = createPreview('send_question_reply', {
          questionId: args.questionId,
          text: args.text,
        });
        return jsonResult(
          {
            action: 'send_question_reply',
            questionId: args.questionId,
            text: args.text,
            previewToken: preview.previewToken,
            expiresAt: preview.expiresAt,
            requiresExplicitConfirmation: true,
          },
          `Soru ${args.questionId} için cevap taslağı hazır. Kullanıcı açıkça onaylamadan send_question_reply çağırma.`,
        );
      } catch (err) {
        return errorResult(toLLMErrorMessage(err));
      }
    },
  );

  server.registerTool(
    'send_question_reply',
    {
      title: 'Send question reply / Soru cevabını gönder',
      description:
        'Use this when the user has explicitly confirmed a prior draft_question_reply result and wants to send that exact reply to Trendyol. ' +
        'The question must be in WAITING_FOR_ANSWER status.',
      inputSchema: executeInputSchema,
      annotations: writeAnnotations,
      _meta: writeMeta(),
    },
    async (args) => {
      try {
        const tokenError = verifyPreviewOrError(args.previewToken, 'send_question_reply', {
          questionId: args.questionId,
          text: args.text,
        });
        if (tokenError) return tokenError;
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
