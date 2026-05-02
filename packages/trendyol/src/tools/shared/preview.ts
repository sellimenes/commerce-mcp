import { createConfirmationToken, errorResult, verifyConfirmationToken } from '@commerce-mcp/core';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function createPreview(
  action: string,
  args: unknown,
): { previewToken: string; expiresAt: string } {
  const { token, expiresAt } = createConfirmationToken(action, args);
  return { previewToken: token, expiresAt };
}

export function verifyPreviewOrError(
  token: string,
  action: string,
  args: unknown,
): CallToolResult | null {
  const verified = verifyConfirmationToken(token, action, args);
  if (verified.ok) return null;
  return errorResult(
    `Cannot execute action: ${verified.reason} Run the matching preview tool again, then confirm.`,
  );
}
