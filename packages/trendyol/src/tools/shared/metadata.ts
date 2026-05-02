import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

export const TRENDYOL_READ_SCOPE = 'trendyol.read';
export const TRENDYOL_WRITE_SCOPE = 'trendyol.write';

export const readOnlyAnnotations: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
};

export const previewAnnotations: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
};

export const writeAnnotations: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: false,
};

export const destructiveWriteAnnotations: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  openWorldHint: false,
  idempotentHint: false,
};

export function authMeta(scopes: string[]): Record<string, unknown> {
  const schemes = [{ type: 'oauth2', scopes }];
  return {
    securitySchemes: schemes,
    'openai/toolInvocation/invoking': 'Checking store...',
    'openai/toolInvocation/invoked': 'Store checked.',
  };
}

export function readMeta(): Record<string, unknown> {
  return authMeta([TRENDYOL_READ_SCOPE]);
}

export function writeMeta(): Record<string, unknown> {
  return authMeta([TRENDYOL_READ_SCOPE, TRENDYOL_WRITE_SCOPE]);
}
