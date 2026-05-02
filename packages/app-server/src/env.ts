import { booleanFlag, loadEnvWith } from '@commerce-mcp/core';
import { z } from 'zod';

const optionalCsv = z
  .string()
  .optional()
  .transform((value) =>
    value
      ? value
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
      : [],
  );

const envSchema = {
  COMMERCE_MCP_HOST: z.string().default('127.0.0.1'),
  COMMERCE_MCP_PORT: z.coerce.number().int().positive().default(2091),
  COMMERCE_MCP_PUBLIC_ORIGIN: z.string().url().default('http://127.0.0.1:2091'),
  COMMERCE_MCP_ALLOWED_HOSTS: optionalCsv,
  COMMERCE_MCP_AUTH_REQUIRED: booleanFlag,
  COMMERCE_MCP_DEV_BEARER_TOKEN: z.string().optional(),
  COMMERCE_MCP_AUTH_ISSUER: z.string().url().optional(),
  COMMERCE_MCP_AUTH_SCOPES: z.string().default('trendyol.read,trendyol.write'),
  COMMERCE_MCP_RESOURCE_DOCS_URL: z.string().url().optional(),
};

export type AppServerEnv = ReturnType<typeof loadAppServerEnv>;

export function loadAppServerEnv() {
  const raw = loadEnvWith(envSchema);
  return {
    host: raw.COMMERCE_MCP_HOST,
    port: raw.COMMERCE_MCP_PORT,
    publicOrigin: raw.COMMERCE_MCP_PUBLIC_ORIGIN.replace(/\/$/, ''),
    allowedHosts: raw.COMMERCE_MCP_ALLOWED_HOSTS,
    authRequired: raw.COMMERCE_MCP_AUTH_REQUIRED,
    devBearerToken: raw.COMMERCE_MCP_DEV_BEARER_TOKEN,
    authIssuer: raw.COMMERCE_MCP_AUTH_ISSUER,
    scopes: raw.COMMERCE_MCP_AUTH_SCOPES.split(',')
      .map((scope) => scope.trim())
      .filter(Boolean),
    resourceDocsUrl: raw.COMMERCE_MCP_RESOURCE_DOCS_URL,
  };
}
