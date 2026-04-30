import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function textResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }] };
}

export function jsonResult(value: unknown, summary?: string): CallToolResult {
  const text = summary
    ? `${summary}\n\n${JSON.stringify(value, null, 2)}`
    : JSON.stringify(value, null, 2);
  return {
    content: [{ type: 'text', text }],
    structuredContent: isObject(value) ? (value as Record<string, unknown>) : { value },
  };
}

export function errorResult(message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
